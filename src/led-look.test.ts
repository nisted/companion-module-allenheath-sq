import { afterEach, describe, expect, test, vi } from 'vitest'
import { drawLook, type LookDefaults, parseColour, readLook } from './led-look.js'

const defaults: LookDefaults = {
	effect: 'flash',
	colours: [0xff0000, 0x000000, 0x00ff00, 0x0000ff],
	rateMs: 250,
	underneath: false,
}

afterEach(() => {
	vi.useRealTimers()
})

describe('LED looks', () => {
	test('customise off gives the default look', () => {
		expect(readLook({}, 'below', defaults)).toMatchObject({
			effect: 'flash',
			colours: [0xff0000, 0x000000],
			rateMs: 250,
		})
	})

	test('customised: effect, colours and rate from the options', () => {
		const look = readLook(
			{
				belowCustom: true,
				belowEffect: 'alternate',
				belowColours: 3,
				belowColour1: 1,
				belowColour2: '#000002',
				belowColour3: '0,0,3',
				belowRate: 100,
			},
			'below',
			defaults,
		)
		expect(look).toMatchObject({ effect: 'alternate', colours: [1, 2, 3], rateMs: 100 })
	})

	test('flash and alternate step with time', () => {
		vi.useFakeTimers()
		vi.setSystemTime(0)
		const flash = readLook({}, 'below', defaults)
		expect(drawLook(flash, 'a')).toBe(0xff0000)
		vi.setSystemTime(260)
		expect(drawLook(flash, 'a')).toBe(0x000000)
	})

	test('flash can show what is underneath', () => {
		vi.useFakeTimers()
		vi.setSystemTime(300)
		const look = readLook({ xCustom: true, xEffect: 'flash', xUnderneath: true }, 'x', defaults)
		expect(drawLook(look, 'b')).toBeUndefined()
	})

	test('colours in every form', () => {
		expect(parseColour(0x123456, 0)).toBe(0x123456)
		expect(parseColour('#abc', 0)).toBe(0xaabbcc)
		expect(parseColour('rgb(255, 0, 0)', 0)).toBe(0xff0000)
		expect(parseColour('nonsense', 7)).toBe(7)
	})
})
