import type {
	CompanionActionDefinitions,
	CompanionInputFieldDropdown,
	CompanionInputFieldNumber,
	DropdownChoice,
} from '@companion-module/base'
import { type AHParamId, AHParamIds, AHParams } from '../ahlink/params.js'
import { MaxGridSlots } from '../config.js'
import { parseMix } from '../grid-slots.js'
import type { sqInstance } from '../instance.js'
import { parseNumber } from '../led-look.js'
import type { Rebel } from '../rebel.js'
import { LR } from '../types.js'
import { channelChoiceLabel, optionText } from './grid-level.js'
import {
	AHAmountOptionId,
	AHChannelOptionId,
	AHOperationOptionId,
	AHParamOptionId,
	AHSwitchOptionId,
	GridSlotChannelOptionId,
	GridSlotFollowOptionId,
	GridSlotMixOptionId,
	GridSlotOptionId,
	GridSlotStepByOptionId,
	GridSlotStepWhatOptionId,
	RebelActionId,
	type RebelActions,
	SelectedChannel,
} from './schemas/rebel.js'

const SwitchParams = AHParamIds.filter((id) => AHParams[id].kind === 'switch')
const NumberParams = AHParamIds.filter((id) => AHParams[id].kind === 'number')

function paramChoices(ids: readonly AHParamId[]): DropdownChoice[] {
	return ids.map((id) => {
		const p = AHParams[id]
		return { id, label: p.unit === '' ? p.label : `${p.label} (${p.unit})` }
	})
}

export const SwitchParamChoices = paramChoices(SwitchParams)
export const NumberParamChoices = paramChoices(NumberParams)

/**
 * A channel picker for the A&H remote link: the desk's selected channel, or
 * an input channel (with its name when the link has it).  Typed numbers and
 * expressions work too.
 */
export function ahChannelOption<Id extends string>(
	id: Id,
	instance: sqInstance,
	extra: DropdownChoice[] = [],
): CompanionInputFieldDropdown<Id> {
	const choices: DropdownChoice[] = [...extra, { id: SelectedChannel, label: 'Selected on the desk' }]
	const channels = instance.mixer?.model.inputOutputCounts.inputChannel ?? 48
	for (let channel = 1; channel <= channels; channel++) {
		choices.push({ id: channel, label: channelChoiceLabel(instance, channel) })
	}
	return {
		type: 'dropdown',
		label: 'Channel',
		id,
		default: SelectedChannel,
		choices,
		minChoicesForSearch: 0,
		allowCustom: true,
		allowInvalidValues: true,
		tooltip:
			"Pick from the list, type a channel number, or flip the field to an expression. 'sel' = the channel selected on the desk.",
		expressionDescription: `An input channel number, 1 to ${channels}, or sel for the channel selected on the desk.`,
	}
}

function paramOption<Id extends string>(id: Id, choices: DropdownChoice[]): CompanionInputFieldDropdown<Id> {
	return {
		type: 'dropdown',
		label: 'What',
		id,
		default: String(choices[0].id),
		choices,
		minChoicesForSearch: 0,
	}
}

function slotOption<Id extends string>(id: Id, rebel: Rebel | null): CompanionInputFieldNumber<Id> {
	const max = rebel?.slotCount() ?? MaxGridSlots
	return {
		type: 'number',
		label: 'Grid slot',
		id,
		default: 1,
		min: 1,
		max,
		asInteger: true,
		allowInvalidValues: true,
		expressionDescription: `A Grid slot number, 1 to ${max}.`,
	}
}

const reported = new Set<string>()

function warnOnce(instance: sqInstance, message: string): void {
	if (reported.has(message)) return
	reported.add(message)
	instance.log('warn', message)
}

function isParam(value: string, ids: readonly AHParamId[]): value is AHParamId {
	return (ids as readonly string[]).includes(value)
}

/** SQ Rebel's actions: channel processing over the A&H remote link, and the Grid slots. */
export function rebelActions(instance: sqInstance): CompanionActionDefinitions<RebelActions> {
	const rebel = instance.rebel
	const channel = (text: string, what: string): number | null => {
		const n = rebel?.resolveChannel(text) ?? null
		if (n === null) {
			warnOnce(
				instance,
				text.trim().toLowerCase() === SelectedChannel
					? `${what}: no channel is selected on the desk (or the A&H remote link isn't connected), so nothing was changed`
					: `${what}: "${text}" isn't an input channel, so nothing was changed`,
			)
		}
		return n
	}
	const slot = (text: string): number | null => {
		const n = rebel?.resolveSlot(text) ?? null
		if (n === null)
			warnOnce(instance, `Grid slot "${text}" isn't one of 1 to ${rebel?.slotCount() ?? 0}, so nothing was changed`)
		return n
	}

	return {
		[RebelActionId.ProcessingSwitch]: {
			name: 'Channel processing: switch',
			description:
				'Turns preamp 48V, pad, polarity, HPF, gate, compressor, PEQ, delay, insert or PAFL on or off on an input channel, over the A&H remote link (TCP 51326).',
			options: [
				ahChannelOption(AHChannelOptionId, instance),
				paramOption(AHParamOptionId, SwitchParamChoices),
				{
					type: 'dropdown',
					label: 'Set',
					id: AHSwitchOptionId,
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: ({ options }) => {
				const what = optionText(options[AHParamOptionId])
				if (!isParam(what, SwitchParams)) {
					warnOnce(instance, `Channel processing: "${what}" isn't something that switches on and off`)
					return
				}
				const ch = channel(optionText(options[AHChannelOptionId]), AHParams[what].label)
				if (ch === null || rebel === null) return
				const set = optionText(options[AHSwitchOptionId])
				const now = rebel.value(what, ch) ?? 0
				const next = set === 'on' ? 1 : set === 'off' ? 0 : now ? 0 : 1
				rebel.setValue(what, ch, next)
			},
		},
		[RebelActionId.ProcessingValue]: {
			name: 'Channel processing: value',
			description:
				'Sets, or steps up or down, preamp gain, trim, HPF frequency or delay time on an input channel, over the A&H remote link (TCP 51326). Use up/down on a rotary.',
			options: [
				ahChannelOption(AHChannelOptionId, instance),
				paramOption(AHParamOptionId, NumberParamChoices),
				{
					type: 'dropdown',
					label: 'Operation',
					id: AHOperationOptionId,
					default: 'up',
					choices: [
						{ id: 'set', label: 'Set to' },
						{ id: 'up', label: 'Up by' },
						{ id: 'down', label: 'Down by' },
					],
				},
				{
					type: 'number',
					label: 'Amount',
					id: AHAmountOptionId,
					default: 1,
					min: -10000,
					max: 10000,
					step: 0.1,
					allowInvalidValues: true,
					tooltip: 'Preamp gain and trim in dB, HPF frequency in Hz, delay time in ms.',
					expressionDescription: 'A number. Anything else is ignored and logged.',
				},
			],
			callback: ({ options }) => {
				const what = optionText(options[AHParamOptionId])
				if (!isParam(what, NumberParams)) {
					warnOnce(instance, `Channel processing: "${what}" isn't a value that can be set`)
					return
				}
				const param = AHParams[what]
				const ch = channel(optionText(options[AHChannelOptionId]), param.label)
				if (ch === null || rebel === null) return
				const amount = parseNumber(options[AHAmountOptionId], NaN, -10000, 10000)
				if (Number.isNaN(amount)) {
					warnOnce(instance, `${param.label}: amount "${optionText(options[AHAmountOptionId])}" isn't a number`)
					return
				}
				const operation = optionText(options[AHOperationOptionId])
				if (operation === 'set') {
					rebel.setValue(what, ch, amount)
					return
				}
				const now = rebel.value(what, ch)
				if (now === undefined) {
					warnOnce(instance, `${param.label} on CH ${ch} isn't known yet, so it can't be stepped`)
					return
				}
				rebel.setValue(what, ch, now + (operation === 'down' ? -amount : amount))
			},
		},
		[RebelActionId.GridSlotSet]: {
			name: 'Grid slot: set channel and mix',
			description:
				'Sets which channel and mix a Grid slot controls. Leave either as "Leave as is" to change only the other.',
			options: [
				slotOption(GridSlotOptionId, rebel),
				ahChannelOption(GridSlotChannelOptionId, instance, [{ id: 'keep', label: 'Leave as is' }]),
				{
					type: 'dropdown',
					label: 'Mix',
					id: GridSlotMixOptionId,
					default: 'keep',
					choices: [
						{ id: 'keep', label: 'Leave as is' },
						{ id: LR, label: 'LR' },
						...Array.from({ length: rebel?.mixes ?? 12 }, (_, i) => ({ id: i + 1, label: `Mix ${i + 1}` })),
					],
					minChoicesForSearch: 0,
					allowCustom: true,
					allowInvalidValues: true,
					expressionDescription: 'LR, a mix number, or keep.',
				},
			],
			callback: ({ options }) => {
				if (rebel === null) return
				const n = slot(optionText(options[GridSlotOptionId]))
				if (n === null) return
				const channelText = optionText(options[GridSlotChannelOptionId])
				const mixText = optionText(options[GridSlotMixOptionId])
				const ch = channelText === 'keep' ? null : channel(channelText, `Grid slot ${n}`)
				const mix = mixText === 'keep' ? null : parseMix(mixText, rebel.mixes)
				if (mixText !== 'keep' && mix === null)
					warnOnce(instance, `Grid slot ${n}: mix "${mixText}" isn't LR or a mix number`)
				rebel.setSlot(n, ch, mix)
			},
		},
		[RebelActionId.GridSlotStep]: {
			name: 'Grid slot: step channel or mix',
			description:
				'Steps a Grid slot to the next or previous channel (or mix), wrapping round. For rotaries: +1 on rotate right, -1 on rotate left.',
			options: [
				slotOption(GridSlotOptionId, rebel),
				{
					type: 'dropdown',
					label: 'Step',
					id: GridSlotStepWhatOptionId,
					default: 'channel',
					choices: [
						{ id: 'channel', label: 'Channel' },
						{ id: 'mix', label: 'Mix (LR, Mix 1 ...)' },
					],
				},
				{
					type: 'number',
					label: 'By',
					id: GridSlotStepByOptionId,
					default: 1,
					min: -64,
					max: 64,
					asInteger: true,
					allowInvalidValues: true,
					tooltip: '+1 for the next, -1 for the previous.',
					expressionDescription: 'A whole number, e.g. 1 or -1.',
				},
			],
			callback: ({ options }) => {
				if (rebel === null) return
				const n = slot(optionText(options[GridSlotOptionId]))
				if (n === null) return
				const by = Math.round(parseNumber(options[GridSlotStepByOptionId], 1, -64, 64))
				rebel.stepSlot(n, optionText(options[GridSlotStepWhatOptionId]) === 'mix' ? 'mix' : 'channel', by)
			},
		},
		[RebelActionId.GridSlotFollow]: {
			name: 'Grid slot: follow the selected channel',
			description:
				"While on, the Grid slot's channel follows the channel selected (SEL) on the desk, over the A&H remote link.",
			options: [
				slotOption(GridSlotOptionId, rebel),
				{
					type: 'dropdown',
					label: 'Follow',
					id: GridSlotFollowOptionId,
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: ({ options }) => {
				if (rebel === null) return
				const n = slot(optionText(options[GridSlotOptionId]))
				if (n === null) return
				const follow = optionText(options[GridSlotFollowOptionId])
				rebel.followSlot(n, follow === 'on' || follow === 'off' ? follow : 'toggle')
			},
		},
	}
}
