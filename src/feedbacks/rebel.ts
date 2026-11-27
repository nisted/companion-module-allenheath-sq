import type { CompanionFeedbackDefinitions, JsonValue } from '@companion-module/base'
import { ahChannelOption, NumberParamChoices, SwitchParamChoices } from '../actions/rebel.js'
import { optionText } from '../actions/grid-level.js'
import { type AHParamId, AHParamIds, AHParams } from '../ahlink/params.js'
import type { sqInstance } from '../instance.js'
import { RebelFeedbackId, type RebelFeedbacks } from './schemas/rebel.js'

const Black = 0x000000
const Green = 0x00cc00
const Yellow = 0xffcc00
const White = 0xffffff

function asParam(value: string): AHParamId | null {
	return (AHParamIds as readonly string[]).includes(value) ? (value as AHParamId) : null
}

/** SQ Rebel's feedbacks: channel processing, names and selection over the A&H remote link, and the Grid slots. */
export function rebelFeedbacks(instance: sqInstance): CompanionFeedbackDefinitions<RebelFeedbacks> {
	const rebel = instance.rebel
	const channel = (value: JsonValue | undefined): number | null => rebel?.resolveChannel(optionText(value)) ?? null

	return {
		[RebelFeedbackId.ProcessingOn]: {
			type: 'boolean',
			name: 'Channel processing: is on',
			description:
				'True while 48V, pad, polarity, HPF, gate, compressor, PEQ, delay, insert or PAFL is on for the channel.',
			defaultStyle: { bgcolor: Green, color: Black },
			options: [
				ahChannelOption('channel', instance),
				{
					type: 'dropdown',
					label: 'What',
					id: 'what',
					default: String(SwitchParamChoices[0].id),
					choices: SwitchParamChoices,
					minChoicesForSearch: 0,
				},
			],
			callback: ({ options }) => {
				const id = asParam(optionText(options.what))
				const ch = channel(options.channel)
				if (id === null || ch === null || rebel === null) return false
				return (rebel.value(id, ch) ?? 0) !== 0
			},
		},
		[RebelFeedbackId.ProcessingValue]: {
			type: 'value',
			name: 'Channel processing: value',
			description:
				'The value of a channel setting (gain, trim, HPF frequency, delay time, or on/off), for button text through a local variable.',
			options: [
				ahChannelOption('channel', instance),
				{
					type: 'dropdown',
					label: 'What',
					id: 'what',
					default: String(NumberParamChoices[0].id),
					choices: [...NumberParamChoices, ...SwitchParamChoices],
					minChoicesForSearch: 0,
				},
			],
			callback: ({ options }) => {
				const id = asParam(optionText(options.what))
				const ch = channel(options.channel)
				if (id === null || ch === null || rebel === null) return ''
				const value = rebel.value(id, ch)
				if (value === undefined) return ''
				return AHParams[id].kind === 'switch' ? (value ? 'on' : 'off') : value
			},
		},
		[RebelFeedbackId.ChannelName]: {
			type: 'value',
			name: 'Channel name',
			description: "A channel's name from the desk (or CH n if it has none), for button text through a local variable.",
			options: [ahChannelOption('channel', instance)],
			callback: ({ options }) => {
				const ch = channel(options.channel)
				if (ch === null) return ''
				return rebel?.inputChannelName(ch) ?? `CH ${ch}`
			},
		},
		[RebelFeedbackId.Selected]: {
			type: 'boolean',
			name: 'Channel is selected on the desk',
			description: 'True while the channel is selected (SEL) on the desk.',
			defaultStyle: { bgcolor: Yellow, color: Black },
			options: [ahChannelOption('channel', instance)],
			callback: ({ options }) => {
				const ch = channel(options.channel)
				const selected = rebel?.selectedChannel() ?? null
				return ch !== null && ch === selected
			},
		},
		[RebelFeedbackId.GridSlotFollowing]: {
			type: 'boolean',
			name: 'Grid slot: follows the selected channel',
			description: "True while the Grid slot's channel follows the channel selected on the desk.",
			defaultStyle: { bgcolor: White, color: Black },
			options: [
				{
					type: 'number',
					label: 'Grid slot',
					id: 'slot',
					default: 1,
					min: 1,
					max: rebel?.slotCount() ?? 32,
					asInteger: true,
					allowInvalidValues: true,
				},
			],
			callback: ({ options }) => {
				const n = rebel?.resolveSlot(optionText(options.slot)) ?? null
				return n !== null && rebel?.slot(n)?.follow === true
			},
		},
	}
}
