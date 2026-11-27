import { describe, expect, test } from 'vitest'
import {
	applyActionSettings,
	applyConnectionPage,
	noConnectionConfig,
	parseConnectionSetting,
	type SQConfig,
	tryMoveByActionTicksToSetFlags,
} from './config.js'

function config(changes: Partial<SQConfig>): SQConfig {
	return { ...noConnectionConfig(), host: '192.168.0.5', ...changes }
}

const noWarnings = (message: string) => {
	throw new Error(`unexpected warning: ${message}`)
}

describe("'Set connection settings' action", () => {
	test('sets any field, puts aside what was typed, and marks it set by an action', () => {
		const next = applyActionSettings(config({}), { host: '10.0.0.9' }, noWarnings)
		expect(next).not.toBeNull()
		expect(next?.host).toBe('10.0.0.9')
		expect(next?.host_set).toBe(true)
		expect(next?.actionSaved).toBe(JSON.stringify({ host: '192.168.0.5' }))
	})

	test('blank leaves a field alone, and nothing changed gives null', () => {
		expect(applyActionSettings(config({}), { host: '', midiChannel: '  ' }, noWarnings)).toBeNull()
		expect(applyActionSettings(config({}), { host: '192.168.0.5' }, noWarnings)?.host_set).toBe(true)
	})

	test('impossible values are skipped and logged, the rest still set', () => {
		const warnings: string[] = []
		const next = applyActionSettings(config({}), { midiChannel: '99999', verbose: 'on', gridSlots: '33' }, (m) =>
			warnings.push(m),
		)
		expect(warnings).toHaveLength(2)
		expect(next?.midiChannel).toBe(1)
		expect(next?.midiChannel_set).toBe(false)
		expect(next?.verbose).toBe(true)
		expect(next?.gridSlots).toBe(8)
	})

	test('a second action change keeps the first put-aside value', () => {
		const first = applyActionSettings(config({}), { host: '10.0.0.1' }, noWarnings)
		expect(first).not.toBeNull()
		const second = applyActionSettings(first as SQConfig, { host: '10.0.0.2' }, noWarnings)
		expect(second?.host).toBe('10.0.0.2')
		expect(second?.actionSaved).toBe(JSON.stringify({ host: '192.168.0.5' }))
	})
})

describe('connection page with fields set by an action', () => {
	test('nothing set by an action: the page wins', () => {
		const fromPage = config({ host: '10.0.0.9' })
		expect(applyConnectionPage(config({}), fromPage)).toBe(false)
		expect(fromPage.host).toBe('10.0.0.9')
	})

	test("a field set by an action can't be changed from the page", () => {
		const running = applyActionSettings(config({}), { host: '10.0.0.1' }, noWarnings) as SQConfig
		const fromPage = config({ host: '172.16.0.1' })
		expect(applyConnectionPage(running, fromPage)).toBe(true)
		expect(fromPage.host).toBe('10.0.0.1')
		expect(fromPage.host_set).toBe(true)
		expect(fromPage.actionSaved).toBe(JSON.stringify({ host: '192.168.0.5' }))
	})

	test('Change back restores what was typed before, and clears itself', () => {
		const running = applyActionSettings(config({}), { host: '10.0.0.1', midiChannel: '5' }, noWarnings) as SQConfig
		const fromPage = config({ host: '10.0.0.1', midiChannel: 5, host_changeBack: true })
		applyConnectionPage(running, fromPage)
		expect(fromPage.host).toBe('192.168.0.5')
		expect(fromPage.host_set).toBe(false)
		expect(fromPage.host_changeBack).toBe(false)
		expect(fromPage.midiChannel).toBe(5)
		expect(fromPage.midiChannel_set).toBe(true)
		expect(fromPage.actionSaved).toBe(JSON.stringify({ midiChannel: 1 }))
	})

	test('the Grid slots kept by the module are carried over', () => {
		const running = config({ gridSlotState: '[{"channel":3,"mix":"LR","follow":false}]' })
		const fromPage = config({})
		applyConnectionPage(running, fromPage)
		expect(fromPage.gridSlotState).toBe(running.gridSlotState)
	})
})

describe('upgrade from "Can be set by the action" ticks', () => {
	test('a ticked field becomes set by an action; the ticks go', () => {
		const old: Record<string, unknown> = { host: '10.0.0.1', host_byAction: true, verbose_byAction: false }
		expect(tryMoveByActionTicksToSetFlags(old)).toBe(true)
		expect(old).toEqual({ host: '10.0.0.1', host_set: true })
		expect(tryMoveByActionTicksToSetFlags(old)).toBe(false)
	})
})

describe('values for each field', () => {
	test('IP address', () => {
		expect(parseConnectionSetting('host', '192.168.1.20')).toEqual({ ok: true, value: '192.168.1.20' })
		expect(parseConnectionSetting('host', '192.168.1').ok).toBe(false)
		expect(parseConnectionSetting('host', '300.1.1.1').ok).toBe(false)
	})

	test('choices, by id or label, ignoring case and spaces', () => {
		expect(parseConnectionSetting('model', 'SQ7')).toEqual({ ok: true, value: 'SQ7' })
		expect(parseConnectionSetting('model', 'sq 6')).toEqual({ ok: true, value: 'SQ6' })
		expect(parseConnectionSetting('model', 'SQ8').ok).toBe(false)
		expect(parseConnectionSetting('faderLaw', 'audio taper')).toEqual({ ok: true, value: 'AudioTaper' })
		expect(parseConnectionSetting('retrieveStatusAtStartup', 'Delayed at startup')).toEqual({
			ok: true,
			value: 'delay',
		})
	})

	test('numbers in range', () => {
		expect(parseConnectionSetting('talkbackChannel', 'CH 48')).toEqual({ ok: true, value: 47 })
		expect(parseConnectionSetting('talkbackChannel', '49').ok).toBe(false)
		expect(parseConnectionSetting('midiChannel', '16')).toEqual({ ok: true, value: 16 })
		expect(parseConnectionSetting('midiChannel', '2.5').ok).toBe(false)
		expect(parseConnectionSetting('gridSlots', '32')).toEqual({ ok: true, value: 32 })
		expect(parseConnectionSetting('gridSlots', '0').ok).toBe(false)
	})

	test('on and off', () => {
		expect(parseConnectionSetting('verbose', 'On')).toEqual({ ok: true, value: true })
		expect(parseConnectionSetting('ahLink', '0')).toEqual({ ok: true, value: false })
		expect(parseConnectionSetting('ahControl', 'maybe').ok).toBe(false)
	})
})
