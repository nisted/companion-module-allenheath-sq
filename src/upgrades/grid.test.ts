import type {
	CompanionMigrationAction,
	CompanionMigrationFeedback,
	CompanionMigrationOptionValues,
	JsonValue,
} from '@companion-module/base'
import { describe, expect, test } from 'vitest'
import {
	tryMoveGridActionChannelMixToText,
	tryMoveGridFeedbackChannelMixToText,
	tryUpgradeGridActionTo4,
	tryUpgradeGridFeedbackTo4,
} from './grid.js'
import type { OldCompanionMigrationAction, OldCompanionMigrationFeedback } from './types.js'

function values(options: Record<string, JsonValue>): CompanionMigrationOptionValues {
	const out: CompanionMigrationOptionValues = {}
	for (const [k, v] of Object.entries(options)) out[k] = { isExpression: false, value: v }
	return out
}

function grid7Action(options: Record<string, JsonValue>): CompanionMigrationAction {
	return { id: 'a', controlId: '1/0/0', actionId: 'chlev_to_mix_value', options: values(options) }
}

function grid7Feedback(feedbackId: string, options: Record<string, JsonValue>): CompanionMigrationFeedback {
	return {
		id: 'f',
		controlId: '1/0/0',
		feedbackId,
		options: values(options),
		isInverted: { isExpression: false, value: false },
	}
}

describe('grid.7 action -> 4.0', () => {
	test('literal channel and mix, pickup numbers', () => {
		const action = grid7Action({
			channel: '16',
			mix: 'LR',
			value: '$(custom:grid_fader_1_midi_value)',
			valueType: 'position',
			pickup: true,
			pickupBand: '3',
			pickupDwell: '1000',
			pickupReleaseBand: '127',
			pickupReleaseTime: '',
		})
		expect(tryUpgradeGridActionTo4(action)).toBe(true)
		expect(action.options).toEqual({
			source: { isExpression: false, value: 16 },
			sink: { isExpression: false, value: 'LR' },
			value: { isExpression: false, value: '$(custom:grid_fader_1_midi_value)' },
			valueType: { isExpression: false, value: 'position' },
			pickup: { isExpression: false, value: true },
			pickupBand: { isExpression: false, value: 3 },
			pickupDwell: { isExpression: false, value: 1000 },
			pickupReleaseBand: { isExpression: false, value: 127 },
			pickupReleaseTime: { isExpression: false, value: 0 },
		})

		// Already upgraded: left alone
		expect(tryUpgradeGridActionTo4(action)).toBe(false)
	})

	test('prefixes, variables and junk', () => {
		const action = grid7Action({
			channel: 'CH 7',
			mix: 'Aux 3',
			pickupBand: '$(custom:band)',
			pickupDwell: 'soon',
			pickupReleaseBand: 'x$(custom:rb)',
		})
		expect(tryUpgradeGridActionTo4(action)).toBe(true)
		expect(action.options.source).toEqual({ isExpression: false, value: 7 })
		expect(action.options.sink).toEqual({ isExpression: false, value: 3 })
		expect(action.options.pickupBand).toEqual({ isExpression: true, value: '$(custom:band)' })
		expect(action.options.pickupDwell).toEqual({ isExpression: false, value: 1000 })
		expect(action.options.pickupReleaseBand).toEqual({
			isExpression: true,
			value: 'parseVariables("x$(custom:rb)")',
		})
		expect(action.options.pickupReleaseTime).toBeUndefined()
	})

	test('variable channel and mix become expressions', () => {
		const action = grid7Action({ channel: '$(custom:grid_ch)', mix: 'Mix $(custom:grid_mix)' })
		expect(tryUpgradeGridActionTo4(action)).toBe(true)
		expect(action.options.source).toEqual({ isExpression: true, value: '$(custom:grid_ch)' })
		expect(action.options.sink).toEqual({ isExpression: true, value: 'parseVariables("Mix $(custom:grid_mix)")' })
		expect(action.options.channel).toBeUndefined()
		expect(action.options.mix).toBeUndefined()
	})

	test('other actions untouched', () => {
		const action: CompanionMigrationAction = { ...grid7Action({ channel: '1' }), actionId: 'chlev_to_mix' }
		expect(tryUpgradeGridActionTo4(action)).toBe(false)
		expect(action.options).toEqual(values({ channel: '1' }))
	})
})

describe('grid.7 feedbacks -> 4.0', () => {
	test('pickup LED', () => {
		const feedback = grid7Feedback('fader_pickup_led', {
			channel: '2',
			mix: '4',
			value: '$(custom:v)',
			belowColour: '#ff0000',
			flashMs: '250',
		})
		expect(tryUpgradeGridFeedbackTo4(feedback)).toBe(true)
		expect(feedback.options).toEqual({
			inputChannel: { isExpression: false, value: 2 },
			mix: { isExpression: false, value: 4 },
			value: { isExpression: false, value: '$(custom:v)' },
			belowColour: { isExpression: false, value: '#ff0000' },
			flashMs: { isExpression: false, value: 250 },
		})
		expect(tryUpgradeGridFeedbackTo4(feedback)).toBe(false)
	})

	test('level at target LED', () => {
		const feedback = grid7Feedback('level_threshold_led', {
			channel: '1',
			mix: 'lr',
			target: '-inf',
			targetBand: '',
			flashMs: '100',
		})
		expect(tryUpgradeGridFeedbackTo4(feedback)).toBe(true)
		expect(feedback.options.mix).toEqual({ isExpression: false, value: 'LR' })
		expect(feedback.options.target).toEqual({ isExpression: false, value: '-inf' })
		expect(feedback.options.targetBand).toEqual({ isExpression: false, value: 0.5 })
		expect(feedback.options.flashMs).toEqual({ isExpression: false, value: 100 })
	})
})

describe('earlier Grid dropdowns -> grid.7 text boxes', () => {
	test('zero-based dropdowns', () => {
		const action: OldCompanionMigrationAction = {
			id: 'a',
			controlId: '1/0/0',
			actionId: 'chlev_to_mix_value',
			options: { input: 15, assign: 'lr', value: '64' },
		}
		expect(tryMoveGridActionChannelMixToText(action)).toBe(true)
		expect(action.options).toEqual({ channel: '16', mix: 'LR', value: '64' })
		expect(tryMoveGridActionChannelMixToText(action)).toBe(false)
	})

	test('variables tick box', () => {
		const feedback: OldCompanionMigrationFeedback = {
			id: 'f',
			controlId: '1/0/0',
			feedbackId: 'fader_pickup_led',
			options: { useVars: true, inputVar: '$(custom:ch)', mixVar: '2', input: 0, assign: 1 },
			isInverted: false,
		}
		expect(tryMoveGridFeedbackChannelMixToText(feedback)).toBe(true)
		expect(feedback.options).toEqual({ channel: '$(custom:ch)', mix: '2' })
	})
})
