import type { CompanionPresetSection } from '@companion-module/base'
import { AHParamIds, AHParams } from '../../ahlink/params.js'
import type { SQManifest } from '../../manifest.js'
import type { Model } from '../../mixer/model.js'
import {
	GridSlotFaderPresetId,
	GridSlotFollowPresetId,
	GridSlotSelectPresetId,
	ProcessingChannelLocalVariableId,
	ProcessingRotaryPresetId,
	ProcessingSwitchPresetId,
	SelectedChannelPresetId,
} from '../definitions/rebel.js'
import type { TemplateValue } from './types.js'

/** SQ Rebel's preset sections: the Grid slots and channel processing */
export function rebelPresetSections(model: Model, slots: number): CompanionPresetSection<SQManifest>[] {
	const numbers = Array.from({ length: slots }, (_, i) => i + 1)

	const channels: TemplateValue[] = [{ name: 'Selected on the desk', value: 'sel' }]
	for (let ch = 1; ch <= model.inputOutputCounts.inputChannel; ch++) channels.push({ name: `CH ${ch}`, value: ch })

	const template = (id: string, name: string, presetId: string) => ({
		id,
		name,
		presetId,
		type: 'template' as const,
		templateVariableName: ProcessingChannelLocalVariableId,
		templateValues: channels,
	})

	return [
		{
			id: 'grid-slots',
			name: 'Intech Grid: slots',
			description:
				'Rotary: turn to pick the channel, press, turn to pick the mix (LR, Mix 1 ...). Fader: link the Grid fader to custom:grid_fader_N_midi_value on the Grid surface settings, and set its value update interval to 0.',
			definitions: [
				{
					id: 'grid-slot-select',
					name: 'Pick channel and mix (rotary)',
					type: 'simple',
					presets: numbers.map(GridSlotSelectPresetId),
				},
				{
					id: 'grid-slot-fader',
					name: 'Fader with pickup',
					type: 'simple',
					presets: numbers.map(GridSlotFaderPresetId),
				},
				{
					id: 'grid-slot-follow',
					name: 'Follow the selected channel',
					type: 'simple',
					presets: numbers.map(GridSlotFollowPresetId),
				},
			],
			keywords: ['grid', 'intech', 'fader', 'pickup', 'rotary', 'slot'],
		},
		{
			id: 'channel-processing',
			name: 'Channel processing (A&H remote link)',
			description:
				'Over TCP 51326. Each preset comes for the channel selected on the desk and for every input channel.',
			definitions: [
				template('processing-selected-group', 'Channel name, lit while selected', SelectedChannelPresetId),
				...AHParamIds.map((id) =>
					AHParams[id].kind === 'switch'
						? template(`processing-switch-${id}-group`, AHParams[id].label, ProcessingSwitchPresetId(id))
						: template(`processing-rotary-${id}-group`, `${AHParams[id].label} (rotary)`, ProcessingRotaryPresetId(id)),
				),
			],
			keywords: [
				'gain',
				'preamp',
				'48v',
				'phantom',
				'hpf',
				'gate',
				'compressor',
				'eq',
				'delay',
				'insert',
				'pafl',
				'selected',
			],
		},
	]
}
