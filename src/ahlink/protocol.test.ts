import { describe, expect, test } from 'vitest'
import { AHParser, channelRecordsStart, MessageFilter, namesFromState, renamed, selectedStrip } from './protocol.js'
import { AHParams, paramForMessage, setMessage } from './params.js'

/** A state laid out like an SQ-5's: 880 bytes, the channel section, then section 03 */
function fakeState(names: Record<number, string>): Buffer {
	const state = Buffer.alloc(880 + 4 + 122 * 336 + 4 + 100)
	Buffer.from([0x02, 0xa5, 0xa5, 0xa5]).copy(state, 880)
	for (const [strip, name] of Object.entries(names)) Buffer.from(name, 'ascii').copy(state, 884 + Number(strip) * 336)
	Buffer.from([0x03, 0xa5, 0xa5, 0xa5]).copy(state, 884 + 122 * 336)
	return state
}

describe('A&H remote protocol', () => {
	test('the message filter lets through 41 recipients', () => {
		expect(MessageFilter.length).toBe(6 + 0x2000)
		expect(MessageFilter.subarray(6).filter((b) => b === 0xff).length).toBe(41 * 32)
	})

	test('frames and short messages, split anywhere, with junk between', () => {
		const parser = new AHParser()
		const bytes = Buffer.concat([
			Buffer.from([0x7f, 0x02, 0x02, 0x00, 0x00, 0x00, 0xaa, 0xbb]),
			Buffer.from([0x00]),
			Buffer.from([0xf7, 0x08, 0x09, 0x0c, 0x00, 0x00, 0x01, 0x07]),
		])
		const out = [...parser.feed(bytes.subarray(0, 5)), ...parser.feed(bytes.subarray(5))]
		expect(out).toHaveLength(2)
		expect(out[0]).toMatchObject({ kind: 'frame', type: 0x02 })
		expect(selectedStrip(out[1])).toBe(7)
	})

	test('a rename from the desk (captured: Input 8 renamed "test")', () => {
		const parser = new AHParser()
		const [m] = parser.feed(
			Buffer.from([
				0x7f, 0x08, 0x0e, 0x00, 0x00, 0x00, 0x18, 0x18, 0x07, 0x00, 0x07, 0x00, 0x00, 0x74, 0x65, 0x73, 0x74, 0x00,
				0x00, 0x00,
			]),
		)
		expect(renamed(m)).toEqual({ strip: 7, name: 'test' })
	})

	test('names from the state', () => {
		const state = fakeState({ 0: 'Kick', 7: 'Vox 1', 104: 'Main' })
		expect(channelRecordsStart(state)).toBe(884)
		expect(namesFromState(state)).toEqual(
			new Map([
				[0, 'Kick'],
				[7, 'Vox 1'],
				[104, 'Main'],
			]),
		)
		expect(namesFromState(Buffer.alloc(2000))).toBeNull()
	})

	test('processing messages both ways', () => {
		const msg = setMessage(AHParams.gain, 3, 30)
		expect([...msg]).toEqual([0xf7, 0x08, 0x0c, 0x0c, 0x03, 0x01, 0x00, 0x9e])
		const [m] = new AHParser().feed(msg)
		expect(m.kind).toBe('message')
		if (m.kind !== 'message') return
		const param = paramForMessage(m.recipient, m.parameter)
		expect(param?.id).toBe('gain')
		expect(param?.fromWire(m.data.readUInt16LE(2))).toBe(30)
		expect(AHParams.hpfFreq.fromWire(AHParams.hpfFreq.toWire(100))).toBe(100)
		expect(AHParams.trim.fromWire(AHParams.trim.toWire(-24))).toBe(-24)
		expect(AHParams.delayTime.fromWire(AHParams.delayTime.toWire(12.5))).toBe(12.5)
	})
})
