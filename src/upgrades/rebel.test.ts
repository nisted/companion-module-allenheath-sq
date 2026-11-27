import type { CompanionMigrationAction, CompanionMigrationFeedback } from '@companion-module/base'
import { describe, expect, test } from 'vitest'
import { tryFillConnectionSetOptions, tryUpgradeGridLedLooks } from './rebel.js'

const v = (value: unknown) => ({ isExpression: false, value }) as never

describe('SQ Rebel grid.2 upgrades', () => {
	test("'Set connection settings' gets every field and loses the old note", () => {
		const action = {
			id: 'a',
			controlId: 'c',
			actionId: 'connection_set',
			options: { host: v('$(custom:ip)'), none: v('') },
		} as unknown as CompanionMigrationAction
		expect(tryFillConnectionSetOptions(action)).toBe(true)
		expect(action.options.none).toBeUndefined()
		expect(action.options.host).toEqual(v('$(custom:ip)'))
		expect(action.options.gridSlots).toEqual(v(''))
		expect(tryFillConnectionSetOptions(action)).toBe(false)
	})

	test('pickup LED at its old defaults keeps the default looks', () => {
		const feedback = {
			id: 'f',
			controlId: 'c',
			feedbackId: 'fader_pickup_led',
			options: {
				belowColour: v('#ff0000'),
				belowFlash: v(true),
				aboveColour: v('#ff0000'),
				aboveFlash: v(false),
				catchColour: v('#00ff00'),
				trackingColour: v('#ffffff'),
				flashMs: v(250),
			},
		} as unknown as CompanionMigrationFeedback
		expect(tryUpgradeGridLedLooks(feedback)).toBe(true)
		expect(feedback.options.belowCustom).toEqual(v(false))
		expect(feedback.options.belowColour).toBeUndefined()
		expect(feedback.options.releasedAboveEffect).toEqual(v('alternate'))
		expect(feedback.options.trackingBrightness).toEqual(v(true))
	})

	test('changed colours and flashes become customised looks', () => {
		const feedback = {
			id: 'f',
			controlId: 'c',
			feedbackId: 'fader_pickup_led',
			options: {
				belowColour: v('$(custom:c)'),
				belowFlash: v(true),
				aboveColour: v('0,0,255'),
				aboveFlash: v(true),
				flashMs: v(100),
			},
		} as unknown as CompanionMigrationFeedback
		tryUpgradeGridLedLooks(feedback)
		expect(feedback.options.belowCustom).toEqual(v(true))
		expect(feedback.options.belowColour1).toEqual({ isExpression: true, value: 'parseVariables("$(custom:c)")' })
		expect(feedback.options.aboveEffect).toEqual(v('flash'))
		expect(feedback.options.aboveColour1).toEqual(v(0x0000ff))
		expect(feedback.options.aboveRate).toEqual(v(100))
	})

	test('level at target: a blank flash-off colour shows what is underneath', () => {
		const feedback = {
			id: 'f',
			controlId: 'c',
			feedbackId: 'level_threshold_led',
			options: { colour: v('#0000ff'), flash: v(true), offColour: v(''), flashMs: v(250) },
		} as unknown as CompanionMigrationFeedback
		tryUpgradeGridLedLooks(feedback)
		expect(feedback.options.atTargetCustom).toEqual(v(true))
		expect(feedback.options.atTargetEffect).toEqual(v('flash'))
		expect(feedback.options.atTargetUnderneath).toEqual(v(true))
		expect(feedback.options.offColour).toBeUndefined()
	})
})
