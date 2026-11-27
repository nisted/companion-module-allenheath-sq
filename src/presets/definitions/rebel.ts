import type {
	CompanionPresetDefinitions,
	CompanionSimplePresetDefinition,
	ExpressionOrValue,
	JsonValue,
} from '@companion-module/base'
import { type AHParamId, AHParamIds, AHParams } from '../../ahlink/params.js'
import { pickupLookDefaultValues } from '../../feedbacks/grid-looks.js'
import type { SQManifest } from '../../manifest.js'
import { DEFAULT_BAND, DEFAULT_DWELL_MS, DEFAULT_RELEASE_BAND, DEFAULT_RELEASE_MS } from '../../pickup.js'
import { Black, White } from '../../utils/colors.js'

/** The local variable the channel processing templates fill: 'sel' or a channel number */
export const ProcessingChannelLocalVariableId = 'ch'

const v = (value: JsonValue): ExpressionOrValue<JsonValue> => ({ isExpression: false, value })
const expr = (value: string): ExpressionOrValue<JsonValue> => ({ isExpression: true, value })

const DarkRed = 0x600000
const DarkBlue = 0x000060
const Green = 0x00cc00
const Yellow = 0xffcc00

/** Preset ids */
export const GridSlotSelectPresetId = (slot: number): string => `grid-slot-${slot}-select`
export const GridSlotFaderPresetId = (slot: number): string => `grid-slot-${slot}-fader`
export const GridSlotFollowPresetId = (slot: number): string => `grid-slot-${slot}-follow`
export const ProcessingSwitchPresetId = (id: AHParamId): string => `processing-switch-${id}`
export const ProcessingRotaryPresetId = (id: AHParamId): string => `processing-rotary-${id}`
export const SelectedChannelPresetId = 'processing-selected'

/** The custom variable the Grid fader for a slot is linked to (on the Grid surface's settings page) */
function gridFaderVariable(slot: number): string {
	return `custom:grid_fader_${slot}_midi_value`
}

/** Short names for button text */
const ShortName: Record<AHParamId, string> = {
	gain: 'GAIN',
	phantom: '48V',
	pad: 'PAD',
	trim: 'TRIM',
	polarity: 'Ø',
	hpf: 'HPF',
	hpfFreq: 'HPF',
	gate: 'GATE',
	comp: 'COMP',
	peq: 'PEQ',
	delay: 'DELAY',
	delayTime: 'DELAY',
	insert: 'INS',
	pafl: 'PAFL',
}

type Simple = CompanionSimplePresetDefinition<SQManifest>

/** A rotary that picks a Grid slot's channel (step 1) and mix (step 2): press to switch */
function slotSelectPreset(label: string, slot: number): Simple {
	const step = (what: 'channel' | 'mix', by: number) => ({
		actionId: 'grid_slot_step' as const,
		options: { slot: v(slot), what: v(what), by: v(by) },
	})
	const text = `$(${label}:grid${slot}_channel_label)\\n> $(${label}:grid${slot}_mix_label)`
	return {
		type: 'simple',
		name: `Grid slot ${slot}: pick channel and mix`,
		style: { text, size: 'auto', color: White, bgcolor: Black },
		options: { stepAutoProgress: true },
		steps: [
			{ name: 'Channel', down: [], up: [], rotate_left: [step('channel', -1)], rotate_right: [step('channel', 1)] },
			{ name: 'Mix', down: [], up: [], rotate_left: [step('mix', -1)], rotate_right: [step('mix', 1)] },
		],
		feedbacks: [
			{ feedbackId: 'internal:buttonCurrentStep', options: { step: v(1) }, style: { bgcolor: DarkRed } },
			{ feedbackId: 'internal:buttonCurrentStep', options: { step: v(2) }, style: { bgcolor: DarkBlue } },
			{ feedbackId: 'grid_slot_following', options: { slot: v(slot) }, style: { color: Yellow } },
		],
	} as Simple
}

/** A Grid fader driving a slot's channel in its mix, with pickup and the pickup LED */
function slotFaderPreset(label: string, slot: number): Simple {
	const channel = expr(`$(${label}:grid${slot}_channel)`)
	const mix = expr(`$(${label}:grid${slot}_mix)`)
	const fader = expr(`$(${gridFaderVariable(slot)})`)
	const level = {
		actionId: 'chlev_to_mix_value' as const,
		options: {
			source: channel,
			sink: mix,
			value: fader,
			valueType: v('position'),
			pickup: v(true),
			pickupBand: v(DEFAULT_BAND),
			pickupDwell: v(DEFAULT_DWELL_MS),
			pickupReleaseBand: v(DEFAULT_RELEASE_BAND),
			pickupReleaseTime: v(DEFAULT_RELEASE_MS),
		},
	}
	const looks = Object.fromEntries(Object.entries(pickupLookDefaultValues()).map(([id, value]) => [id, v(value)]))
	const text = `$(${label}:grid${slot}_channel_label)\\n$(${label}:grid${slot}_mix_label)\\n$(local:level) dB`
	return {
		type: 'simple',
		name: `Grid slot ${slot}: fader`,
		style: { text, size: 'auto', color: White, bgcolor: Black },
		steps: [{ down: [], up: [], rotate_left: [level], rotate_right: [level] }],
		feedbacks: [
			{
				feedbackId: 'fader_pickup_led',
				options: { inputChannel: channel, mix, value: fader, trackingBrightness: v(true), ...looks },
			},
		],
		localVariables: [
			{
				variableName: 'level',
				variableType: 'feedback',
				feedbackId: 'input_level_in_mix',
				options: { inputChannel: channel, mix },
			},
		],
	} as Simple
}

/** Toggles whether a Grid slot follows the channel selected on the desk */
function slotFollowPreset(label: string, slot: number): Simple {
	return {
		type: 'simple',
		name: `Grid slot ${slot}: follow the selected channel`,
		style: {
			text: `SLOT ${slot}\\nFOLLOW SEL\\n$(${label}:grid${slot}_channel_label)`,
			size: 'auto',
			color: White,
			bgcolor: Black,
		},
		steps: [{ down: [{ actionId: 'grid_slot_follow', options: { slot: v(slot), follow: v('toggle') } }], up: [] }],
		feedbacks: [
			{ feedbackId: 'grid_slot_following', options: { slot: v(slot) }, style: { bgcolor: Yellow, color: Black } },
		],
	} as Simple
}

const channelExpr = expr(`$(local:${ProcessingChannelLocalVariableId})`)

const nameVariable = {
	variableName: 'name',
	variableType: 'feedback',
	feedbackId: 'ah_name',
	options: { channel: channelExpr },
} as const

const channelVariable = {
	variableName: ProcessingChannelLocalVariableId,
	variableType: 'simple',
	startupValue: 'sel',
} as const

/** A button that turns a channel setting on and off, lit while it's on */
function processingSwitchPreset(id: AHParamId): Simple {
	return {
		type: 'simple',
		name: AHParams[id].label,
		style: { text: `$(local:name)\\n${ShortName[id]}`, size: 'auto', color: White, bgcolor: Black },
		steps: [
			{
				down: [{ actionId: 'ah_switch', options: { channel: channelExpr, what: v(id), set: v('toggle') } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'ah_switch_on',
				options: { channel: channelExpr, what: v(id) },
				style: { bgcolor: Green, color: Black },
			},
		],
		localVariables: [channelVariable, nameVariable],
	} as Simple
}

/** A rotary (Grid pot or encoder, Stream Deck dial) that steps a channel value */
function processingRotaryPreset(id: AHParamId): Simple {
	const param = AHParams[id]
	const step = (operation: 'up' | 'down') => ({
		actionId: 'ah_value' as const,
		options: { channel: channelExpr, what: v(id), operation: v(operation), amount: v(param.step) },
	})
	return {
		type: 'simple',
		name: `${param.label} (rotary)`,
		style: {
			text: `$(local:name)\\n${ShortName[id]}\\n$(local:value) ${param.unit}`,
			size: 'auto',
			color: White,
			bgcolor: Black,
		},
		steps: [{ down: [], up: [], rotate_left: [step('down')], rotate_right: [step('up')] }],
		feedbacks: [],
		localVariables: [
			channelVariable,
			nameVariable,
			{
				variableName: 'value',
				variableType: 'feedback',
				feedbackId: 'ah_value',
				options: { channel: channelExpr, what: v(id) },
			},
		],
	} as Simple
}

/** Shows a channel's name, lit while it's selected on the desk */
function selectedChannelPreset(): Simple {
	return {
		type: 'simple',
		name: 'Channel name, lit while selected',
		style: { text: '$(local:name)', size: 'auto', color: White, bgcolor: Black },
		steps: [{ down: [], up: [] }],
		feedbacks: [
			{ feedbackId: 'ah_selected', options: { channel: channelExpr }, style: { bgcolor: Yellow, color: Black } },
		],
		localVariables: [channelVariable, nameVariable],
	} as Simple
}

/** SQ Rebel's presets: the Grid slots and channel processing */
export function rebelPresets(label: string, slots: number): CompanionPresetDefinitions<SQManifest> {
	const presets: CompanionPresetDefinitions<SQManifest> = {}
	for (let slot = 1; slot <= slots; slot++) {
		presets[GridSlotSelectPresetId(slot)] = slotSelectPreset(label, slot)
		presets[GridSlotFaderPresetId(slot)] = slotFaderPreset(label, slot)
		presets[GridSlotFollowPresetId(slot)] = slotFollowPreset(label, slot)
	}
	for (const id of AHParamIds) {
		presets[AHParams[id].kind === 'switch' ? ProcessingSwitchPresetId(id) : ProcessingRotaryPresetId(id)] =
			AHParams[id].kind === 'switch' ? processingSwitchPreset(id) : processingRotaryPreset(id)
	}
	presets[SelectedChannelPresetId] = selectedChannelPreset()
	return presets
}
