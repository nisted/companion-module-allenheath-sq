import { describe, expect, test } from 'vitest'
import { parseChannel, parseMix, readSlots, stepChannel, stepMix } from './grid-slots.js'

describe('Grid slots', () => {
	test('stepping wraps round', () => {
		expect(stepChannel(48, 1, 48)).toBe(1)
		expect(stepChannel(1, -1, 48)).toBe(48)
		expect(stepMix('LR', 1, 12)).toBe(1)
		expect(stepMix(12, 1, 12)).toBe('LR')
		expect(stepMix('LR', -1, 12)).toBe(12)
	})

	test('typed values', () => {
		expect(parseChannel('CH 16', 48)).toBe(16)
		expect(parseChannel('49', 48)).toBeNull()
		expect(parseMix('lr', 12)).toBe('LR')
		expect(parseMix('Aux 3', 12)).toBe(3)
		expect(parseMix('13', 12)).toBeNull()
	})

	test('stored slots, with defaults for anything missing or broken', () => {
		expect(readSlots('[{"channel":5,"mix":2,"follow":true},{"channel":99}]', 3, 48, 12)).toEqual([
			{ channel: 5, mix: 2, follow: true },
			{ channel: 2, mix: 'LR', follow: false },
			{ channel: 3, mix: 'LR', follow: false },
		])
		expect(readSlots('not json', 1, 48, 12)).toEqual([{ channel: 1, mix: 'LR', follow: false }])
	})
})
