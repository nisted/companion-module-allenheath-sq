import { describe, expect, test } from 'vitest'
import { applyByActionTicks, noConnectionConfig, parseConnectionSetting, type SQConfig } from './config.js'

function config(changes: Partial<SQConfig>): SQConfig {
	return { ...noConnectionConfig(), host: '192.168.0.5', ...changes }
}

describe('"Can be set by the action" ticks', () => {
	test('nothing ticked: the connection page wins, nothing put aside', () => {
		const running = config({})
		const fromPage = config({ host: '10.0.0.9' })
		expect(applyByActionTicks(running, fromPage)).toEqual({ ticksChanged: false, changed: false })
		expect(fromPage.host).toBe('10.0.0.9')
		expect(fromPage.actionSaved).toBeUndefined()
	})

	test('just ticked: the value is put aside', () => {
		const running = config({})
		const fromPage = config({ host_byAction: true })
		expect(applyByActionTicks(running, fromPage)).toEqual({ ticksChanged: true, changed: true })
		expect(fromPage.host).toBe('192.168.0.5')
		expect(fromPage.actionSaved).toBe(JSON.stringify({ host: '192.168.0.5' }))
	})

	test('still ticked: the connection page is ignored', () => {
		const running = config({
			host: '10.0.0.1',
			host_byAction: true,
			actionSaved: JSON.stringify({ host: '192.168.0.5' }),
		})
		const fromPage = config({ host: '172.16.0.1', host_byAction: true })
		expect(applyByActionTicks(running, fromPage)).toEqual({ ticksChanged: false, changed: true })
		expect(fromPage.host).toBe('10.0.0.1')
		expect(fromPage.actionSaved).toBe(JSON.stringify({ host: '192.168.0.5' }))
	})

	test('unticked: the put-aside value comes back and is removed', () => {
		const running = config({
			host: '10.0.0.1',
			host_byAction: true,
			midiChannel: 5,
			midiChannel_byAction: true,
			actionSaved: JSON.stringify({ host: '192.168.0.5', midiChannel: 1 }),
		})
		const fromPage = config({ host: '10.0.0.1', midiChannel: 5, midiChannel_byAction: true })
		expect(applyByActionTicks(running, fromPage)).toEqual({ ticksChanged: true, changed: true })
		expect(fromPage.host).toBe('192.168.0.5')
		expect(fromPage.midiChannel).toBe(5)
		expect(fromPage.actionSaved).toBe(JSON.stringify({ midiChannel: 1 }))

		const later = config({ midiChannel: 5 })
		expect(applyByActionTicks(fromPage, later)).toEqual({ ticksChanged: true, changed: true })
		expect(later.midiChannel).toBe(1)
		expect(later.actionSaved).toBeUndefined()
	})

	test('a broken put-aside store is treated as empty', () => {
		const running = config({ verbose: true, verbose_byAction: true, actionSaved: 'not json' })
		const fromPage = config({ verbose: true })
		applyByActionTicks(running, fromPage)
		expect(fromPage.verbose).toBe(true)
		expect(fromPage.actionSaved).toBeUndefined()
	})
})

describe("'Connection: set settings' values", () => {
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
		expect(parseConnectionSetting('faderLaw', 'log').ok).toBe(false)
		expect(parseConnectionSetting('retrieveStatusAtStartup', 'nosts')).toEqual({ ok: true, value: 'nosts' })
		expect(parseConnectionSetting('retrieveStatusAtStartup', 'Delayed at startup')).toEqual({
			ok: true,
			value: 'delay',
		})
	})

	test('numbers in range', () => {
		expect(parseConnectionSetting('talkbackChannel', 'CH 48')).toEqual({ ok: true, value: 47 })
		expect(parseConnectionSetting('talkbackChannel', '1')).toEqual({ ok: true, value: 0 })
		expect(parseConnectionSetting('talkbackChannel', '0').ok).toBe(false)
		expect(parseConnectionSetting('talkbackChannel', '49').ok).toBe(false)
		expect(parseConnectionSetting('midiChannel', '16')).toEqual({ ok: true, value: 16 })
		expect(parseConnectionSetting('midiChannel', '17').ok).toBe(false)
		expect(parseConnectionSetting('midiChannel', '2.5').ok).toBe(false)
	})

	test('on and off', () => {
		expect(parseConnectionSetting('verbose', 'On')).toEqual({ ok: true, value: true })
		expect(parseConnectionSetting('verbose', '0')).toEqual({ ok: true, value: false })
		expect(parseConnectionSetting('verbose', 'maybe').ok).toBe(false)
	})
})
