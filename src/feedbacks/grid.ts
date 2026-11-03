import type {
	CompanionAdvancedFeedbackResult,
	CompanionFeedbackDefinitions,
	CompanionInputFieldNumber,
	CompanionInputFieldTextInput,
	DropdownChoice,
} from '@companion-module/base'
import { gridInputChannelOption, gridLevelNRPN, gridMixOption, optionText } from '../actions/grid-level.js'
import type { sqInstance } from '../instance.js'
import type { Mixer } from '../mixer/mixer.js'
import { DEFAULT_FLASH_MS, levelKey, parseColour, parseNumber, pickupFor, scaleColour } from '../pickup.js'
import {
	GridFeedbackId,
	GridFeedbackInputChannelOptionId,
	GridFeedbackMixOptionId,
	type GridFeedbacks,
} from './schemas/grid.js'
import { Black } from '../utils/colors.js'

const Red = 0xff0000
const Green = 0x00ff00
const Blue = 0x0000ff
const WhiteLed = 0xffffff

const ColourTip = 'Type it as #ff0000, ff0000 or 255,0,0, or use a variable.'

function colourOption<Id extends string>(
	id: Id,
	label: string,
	defaultColour: string,
	tooltip: string,
): CompanionInputFieldTextInput<Id> {
	return {
		type: 'textinput',
		label,
		id,
		default: defaultColour,
		useVariables: true,
		tooltip: `${tooltip} ${ColourTip}`,
	}
}

function flashSpeedOption<Id extends string>(id: Id): CompanionInputFieldNumber<Id> {
	return {
		type: 'number',
		label: 'Flash speed (ms per on/off)',
		id,
		default: DEFAULT_FLASH_MS,
		min: 50,
		max: 5000,
		expressionDescription: `A number from 50 to 5000. Anything else uses the default (${DEFAULT_FLASH_MS}).`,
		allowInvalidValues: true,
	}
}

/** Whether a flash is in its "off" half right now */
function flashOff(flashMsOption: unknown): boolean {
	const flashMs = parseNumber(flashMsOption, DEFAULT_FLASH_MS, 50, 5000)
	return Math.floor(Date.now() / flashMs) % 2 === 1
}

/**
 * The Grid additions' LED feedbacks: where a pickup fader is up to, and
 * whether a level is at its mark.
 */
export function gridFeedbacks(
	instance: sqInstance,
	mixer: Mixer,
	mixesAndLR: DropdownChoice[],
): CompanionFeedbackDefinitions<GridFeedbacks> {
	const model = mixer.model

	const channelOption = gridInputChannelOption(GridFeedbackInputChannelOptionId, model)
	const mixOption = gridMixOption(GridFeedbackMixOptionId, mixesAndLR)

	return {
		[GridFeedbackId.PickupLed]: {
			type: 'advanced',
			name: 'Grid fader pickup LED',
			description:
				'Background colour for a fader using pickup mode, showing where it is up to. Colours can be typed (#ff0000 or 255,0,0) or come from a variable.',
			affectedProperties: ['bgcolor'],
			options: [
				channelOption,
				mixOption,
				{
					type: 'textinput',
					label: 'Fader value',
					id: 'value',
					default: '',
					useVariables: true,
					tooltip: "The fader's value: the same as the action's Value.",
				},
				colourOption('belowColour', 'Below desk level: colour', '#ff0000', 'While the fader is below the desk level.'),
				{
					type: 'checkbox',
					label: 'Below desk level: flash',
					id: 'belowFlash',
					default: true,
				},
				colourOption('aboveColour', 'Above desk level: colour', '#ff0000', 'While the fader is above the desk level.'),
				{
					type: 'checkbox',
					label: 'Above desk level: flash',
					id: 'aboveFlash',
					default: false,
				},
				colourOption(
					'catchColour',
					'Catching: colour',
					'#00ff00',
					'While the fader is in the catch band, before it latches.',
				),
				colourOption(
					'trackingColour',
					'Tracking: colour',
					'#ffffff',
					'Once latched. Brightness follows the fader: off at 0, full at 127.',
				),
				flashSpeedOption('flashMs'),
			],
			callback: ({ options }): CompanionAdvancedFeedbackResult => {
				const nrpn = gridLevelNRPN(
					instance,
					model,
					options[GridFeedbackInputChannelOptionId],
					options[GridFeedbackMixOptionId],
				)
				if (nrpn === null) {
					return {}
				}

				const raw = optionText(options.value)
				const n = Number(raw)
				const incoming = raw === '' || Number.isNaN(n) ? undefined : n
				const { led, position } = pickupFor(instance).ledState(levelKey(nrpn), incoming)
				const off = flashOff(options.flashMs)

				switch (led) {
					case 'below':
						return {
							bgcolor: options.belowFlash && off ? Black : parseColour(optionText(options.belowColour), Red),
						}
					case 'above':
						return {
							bgcolor: options.aboveFlash && off ? Black : parseColour(optionText(options.aboveColour), Red),
						}
					case 'catch':
						return { bgcolor: parseColour(optionText(options.catchColour), Green) }
					case 'tracking':
						return {
							bgcolor: scaleColour(parseColour(optionText(options.trackingColour), WhiteLed), position / 127),
						}
				}
			},
		},
		[GridFeedbackId.LevelAtTargetLed]: {
			type: 'advanced',
			name: 'Level at target LED',
			description:
				"Background colour while a channel's level is within a band either side of a target dB. One target each: add it a few times for a few targets (Companion's feedback order decides which wins).",
			affectedProperties: ['bgcolor'],
			options: [
				channelOption,
				mixOption,
				{
					type: 'textinput',
					label: 'Target (dB, or -inf)',
					id: 'target',
					default: '0',
					useVariables: true,
					tooltip: '-90 to +10, or -inf (which counts as -90). Can be a variable.',
				},
				{
					type: 'number',
					label: 'Band (± dB either side of the target)',
					id: 'targetBand',
					default: 0.5,
					min: 0,
					max: 100,
					expressionDescription: 'A number from 0 to 100. Anything else uses the default (0.5).',
					allowInvalidValues: true,
				},
				colourOption('colour', 'Colour', '#0000ff', 'While the level is at the target.'),
				{
					type: 'checkbox',
					label: 'Flash',
					id: 'flash',
					default: false,
				},
				flashSpeedOption('flashMs'),
				{
					type: 'textinput',
					label: 'Flash off colour (blank = show what is underneath)',
					id: 'offColour',
					default: '',
					useVariables: true,
					tooltip: `The colour for the "off" half of the flash. Leave it blank to show whatever the button would show without this feedback. ${ColourTip}`,
				},
			],
			callback: ({ options }): CompanionAdvancedFeedbackResult => {
				const nrpn = gridLevelNRPN(
					instance,
					model,
					options[GridFeedbackInputChannelOptionId],
					options[GridFeedbackMixOptionId],
				)
				if (nrpn === null) {
					return {}
				}

				const level = pickupFor(instance).deskLevel(levelKey(nrpn))
				if (level === undefined) {
					return {}
				}

				const numeric = level === '-inf' ? -90 : level
				const targetText = optionText(options.target).toLowerCase()
				const target = targetText === '-inf' ? -90 : parseNumber(targetText, 0, -90, 10)
				const band = parseNumber(options.targetBand, 0.5, 0, 100)
				if (Math.abs(numeric - target) > band) {
					return {}
				}

				if (options.flash && flashOff(options.flashMs)) {
					const offColour = optionText(options.offColour)
					return offColour === '' ? {} : { bgcolor: parseColour(offColour, Black) }
				}
				return { bgcolor: parseColour(optionText(options.colour), Blue) }
			},
		},
	}
}
