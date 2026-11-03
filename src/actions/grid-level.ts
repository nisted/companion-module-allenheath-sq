import type {
	CompanionActionDefinitions,
	CompanionInputFieldDropdown,
	CompanionInputFieldNumber,
	DropdownChoice,
} from '@companion-module/base'
import { mixOrLROption } from '../choices.js'
import { faderNumber } from '../fader-number.js'
import type { sqInstance } from '../instance.js'
import type { Level } from '../mixer/level.js'
import type { Mixer } from '../mixer/mixer.js'
import type { Model } from '../mixer/model.js'
import type { NRPN } from '../mixer/nrpn/nrpn.js'
import { LevelNRPNCalculator } from '../mixer/nrpn/source-to-sink.js'
import {
	DEFAULT_BAND,
	DEFAULT_DWELL_MS,
	DEFAULT_RELEASE_BAND,
	DEFAULT_RELEASE_MS,
	levelKey,
	NEVER_RELEASE_BAND,
	parseNumber,
	pickupFor,
	positionToLevel,
} from '../pickup.js'
import {
	GridLevelActionId,
	type GridLevelActions,
	GridPickupBandOptionId,
	GridPickupDwellOptionId,
	GridPickupOptionId,
	GridPickupReleaseBandOptionId,
	GridPickupReleaseTimeOptionId,
	GridValueOptionId,
	GridValueTypeOptionId,
} from './schemas/grid-level.js'
import { LevelSetSinkOptionId, LevelSetSourceOptionId } from './schemas/level.js'
import { LR, LRStrip } from '../types.js'
import { zeroIndexedNumber } from '../utils/indexed.js'

/**
 * The input channel option for the Grid action and feedbacks: a number that
 * can also be an expression (a variable, say).
 */
export function gridInputChannelOption<Id extends string>(id: Id, model: Model): CompanionInputFieldNumber<Id> {
	return {
		...faderNumber('Input channel', id, model.inputOutputCounts, 'inputChannel'),
		// A bad channel does nothing and says so in the log (once), rather than
		// Companion skipping it quietly.  "CH 16" from a variable works too.
		allowInvalidValues: true,
		tooltip:
			'The input channel number, as on the desk. Want a variable to pick it? Flip the field to an expression, e.g. $(custom:grid_ch).',
	}
}

/**
 * The mix option for the Grid action and feedbacks: LR or a mix, from the list
 * or from an expression.  Defaults to LR, as the Grid additions always have.
 */
export function gridMixOption<Id extends string>(id: Id, mixesAndLR: DropdownChoice[]): CompanionInputFieldDropdown<Id> {
	return {
		...mixOrLROption('Mix', id, mixesAndLR),
		default: LR,
		// As for the channel: "lr", "Mix 3" and "Aux 3" from a variable work too.
		allowInvalidValues: true,
		tooltip:
			'LR for the main mix, or a mix number. Want a variable to pick it? Flip the field to an expression, e.g. $(custom:grid_mix) (it needs to give LR or a number; Mix 3 works too).',
	}
}

const reportedBad = new Set<string>()

/**
 * The level NRPN of an input channel in a mix or LR, from one-indexed option
 * values.  A bad channel or mix logs a warning once per bad combination (the
 * feedbacks run this many times a second) and gives null.
 */
export function gridLevelNRPN(
	instance: sqInstance,
	model: Model,
	channelOption: unknown,
	mixOption: unknown,
): NRPN<'level'> | null {
	const channelText = optionText(channelOption).replace(/^ch\s*/i, '')
	const channel = channelText === '' ? NaN : Number(channelText)
	const counts = model.inputOutputCounts
	const channelOk = Number.isInteger(channel) && 1 <= channel && channel <= counts.inputChannel

	const mixText = optionText(mixOption).replace(/^(mix|aux)\s*/i, '')
	const isLR = mixText.toUpperCase() === LR
	const mix = mixText === '' ? NaN : Number(mixText)
	const mixOk = isLR || (Number.isInteger(mix) && 1 <= mix && mix <= counts.mix)

	if (!channelOk || !mixOk) {
		const msg = `Input channel "${optionText(channelOption)}" / mix "${optionText(mixOption)}" doesn't add up (channel: 1 to ${counts.inputChannel}; mix: LR or 1 to ${counts.mix}), so I've left it alone`
		if (!reportedBad.has(msg)) {
			reportedBad.add(msg)
			instance.log('warn', msg)
		}
		return null
	}

	const source = zeroIndexedNumber(channel - 1)
	if (isLR) {
		return LevelNRPNCalculator.get(model, ['inputChannel', 'lr']).calculate(source, LRStrip)
	}
	return LevelNRPNCalculator.get(model, ['inputChannel', 'mix']).calculate(source, zeroIndexedNumber(mix - 1))
}

/**
 * Turn a value typed in (or produced by a variable) into a level.
 *
 * 'position' takes a fader position 0-127 (such as an Intech Grid fader value)
 * and gives the level at that position on the SQ's own fader, using the SQ's
 * audio taper, so a hardware fader and the SQ fader line up.
 */
function valueToLevel(raw: string, valueType: unknown): Level | null {
	const text = raw.trim().toLowerCase()
	if (valueType === 'db') {
		if (text === '-inf') return '-inf'
		const db = Number(text)
		if (text === '' || Number.isNaN(db)) return null
		return db <= -90 ? '-inf' : db > 10 ? 10 : db
	}

	const n = Number(text)
	if (text === '' || Number.isNaN(n)) return null
	return positionToLevel(n)
}

/** A text option's value as trimmed text, whatever came in */
export function optionText(value: unknown): string {
	if (value === undefined || value === null) return ''
	return (typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean)).trim()
}

const PickupVisible = `$(options:${GridValueTypeOptionId}) != 'db' && $(options:${GridPickupOptionId})`

/**
 * A pickup setting: a number, or an expression (a variable, say).  Anything
 * that isn't a number falls back to the default rather than stopping the
 * action, so the fader keeps working.
 */
function pickupNumber<Id extends string>(
	id: Id,
	label: string,
	defaultValue: number,
	min: number,
	max: number,
	tooltip: string,
): CompanionInputFieldNumber<Id> {
	return {
		type: 'number',
		label,
		id,
		default: defaultValue,
		min,
		max,
		tooltip,
		expressionDescription: `A number from ${min} to ${max}. Anything else uses the default (${defaultValue}).`,
		allowInvalidValues: true,
		isVisibleExpression: PickupVisible,
	}
}

/**
 * The Grid additions' level action: set an input channel's level in a mix (or
 * LR) from a number or variable, e.g. an Intech Grid fader value, with optional
 * pickup.
 */
export function gridLevelActions(
	instance: sqInstance,
	mixer: Mixer,
	mixesAndLR: DropdownChoice[],
): CompanionActionDefinitions<GridLevelActions> {
	const model = mixer.model

	return {
		[GridLevelActionId.InputChannelLevelInMixOrLRFromValue]: {
			name: 'Fader channel level to mix (from value/variable)',
			description: 'Sets the level from a number or a variable, e.g. an Intech Grid fader value',
			options: [
				gridInputChannelOption(LevelSetSourceOptionId, model),
				gridMixOption(LevelSetSinkOptionId, mixesAndLR),
				{
					type: 'textinput',
					label: 'Value',
					id: GridValueOptionId,
					default: '',
					useVariables: true,
					tooltip: "The number to set. Usually a variable, e.g. $(custom:grid_fader_1_midi_value). If it isn't a number, I ignore it and say so in the log.",
				},
				{
					type: 'dropdown',
					label: 'Value is',
					id: GridValueTypeOptionId,
					default: 'position',
					choices: [
						{ id: 'position', label: 'Fader position 0-127 (e.g. Grid fader)' },
						{ id: 'db', label: 'Level in dB (-inf, or -90 to +10)' },
					],
					disableAutoExpression: true,
				},
				{
					type: 'checkbox',
					label: 'Pickup mode',
					id: GridPickupOptionId,
					default: false,
					tooltip:
						"Don't touch the level until the fader sits within the catch band of the desk's current level for the dwell time, then stay latched until the desk is moved from somewhere else. A quick sweep through doesn't latch. Show what it's up to with the 'Grid fader pickup LED' feedback. Fader positions only.",
					disableAutoExpression: true,
					isVisibleExpression: `$(options:${GridValueTypeOptionId}) != 'db'`,
				},
				pickupNumber(
					GridPickupBandOptionId,
					'Catch band (± fader steps, of 127)',
					DEFAULT_BAND,
					0,
					64,
					'How close to the desk level counts as caught.',
				),
				pickupNumber(
					GridPickupDwellOptionId,
					'Dwell time (ms)',
					DEFAULT_DWELL_MS,
					0,
					10000,
					'How long the fader has to stay in the catch band before it takes over.',
				),
				pickupNumber(
					GridPickupReleaseBandOptionId,
					'Release band (± fader steps, of 127)',
					DEFAULT_RELEASE_BAND,
					0,
					NEVER_RELEASE_BAND,
					`Once latched, only a desk-side move bigger than this lets go (the fader itself never does). ${NEVER_RELEASE_BAND} = never let go.`,
				),
				pickupNumber(
					GridPickupReleaseTimeOptionId,
					'Release time (ms)',
					DEFAULT_RELEASE_MS,
					0,
					60000,
					'How long the desk has to stay outside the release band before it lets go. 0 = straight away.',
				),
			],
			callback: async ({ options }) => {
				const nrpn = gridLevelNRPN(instance, model, options[LevelSetSourceOptionId], options[LevelSetSinkOptionId])
				if (nrpn === null) {
					return
				}

				const raw = optionText(options[GridValueOptionId])
				const valueType = options[GridValueTypeOptionId]
				const level = valueToLevel(raw, valueType)
				if (level === null) {
					instance.log('warn', `Fader value "${raw}" isn't a number, so I've ignored it`)
					return
				}

				const send = (to: Level) => {
					mixer.absoluteFade(nrpn, 0, to)
				}

				if (options[GridPickupOptionId] && valueType !== 'db') {
					const incoming = Math.max(0, Math.min(127, Number(raw)))
					const sendPosition = (position: number) => {
						send(positionToLevel(position))
					}
					const settings = {
						band: parseNumber(options[GridPickupBandOptionId], DEFAULT_BAND, 0, 64),
						dwellMs: parseNumber(options[GridPickupDwellOptionId], DEFAULT_DWELL_MS, 0, 10000),
						releaseBand: parseNumber(
							options[GridPickupReleaseBandOptionId],
							DEFAULT_RELEASE_BAND,
							0,
							NEVER_RELEASE_BAND,
						),
						releaseMs: parseNumber(options[GridPickupReleaseTimeOptionId], DEFAULT_RELEASE_MS, 0, 60000),
					}
					if (!pickupFor(instance).handle(levelKey(nrpn), incoming, settings, sendPosition)) {
						return
					}
				}

				send(level)
			},
		},
	}
}
