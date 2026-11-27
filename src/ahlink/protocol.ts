/**
 * The SQ's A&H remote protocol: what SQ MixPad speaks to the desk over TCP
 * port 51326.  Allen & Heath don't document it.
 *
 * Sources (both MIT licensed):
 *   - Remora (Stoatworks Labs), docs/PROTOCOL.md and SQRemote.swift: the
 *     opening, framing, names, renames and selection, run on a real SQ-5 at a
 *     show on 21 Nov 2026.
 *   - allen-heath-sq-tools (Hannes Rüger), packages/sq-api: the processing
 *     registers and value encodings, and where their values sit in the state
 *     the desk sends (captured on an SQ-5, firmware 1.6).
 *
 * Frames are `7F type len32-LE payload`, or `F7` and seven bytes (a short
 * message).  A message (frame type 08, or a short one) is
 * `source, recipient, parameter, data...`.
 */

export const AHRemotePort = 51326

function frame(type: number, payload: readonly number[] = []): Buffer {
	const n = payload.length
	return Buffer.from([0x7f, type, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff, ...payload])
}

/** Hello, announcing UDP port 0: the desk keeps the link and sends no meters. */
export const Hello = frame(0x00, [0x00, 0x00])
/** DiscoveryRequest: the desk answers with box info (frame 02). */
export const DiscoveryRequest = frame(0x01)
/** FeatureSetRequest 2, as MixPad asks: without it the desk sends no live messages. */
export const FeatureSetRequest = frame(0x0b, [0x02, 0x00])
/** SceneSyncRequest: the desk answers with its whole state (frame 04). */
export const SceneSyncRequest = frame(0x03)
/** Keepalive: the desk drops a client it hasn't heard from for about six seconds. */
export const KeepAlive = frame(0x05)
/** Asks which channel is selected; the desk answers with a selection message. */
export const SelectionRequest = Buffer.from([0xf7, 0x09, 0x09, 0x2f, 0x00, 0x00, 0x00, 0x00])

/** The recipients MixPad's MessageFilter lets through (09 selection, 18 names and colours, the rest processing) */
const FilterRecipients = [
	0x00, 0x01, 0x02, 0x03, 0x04, 0x07, 0x09, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
	0x17, 0x18, 0x19, 0x1a, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2b, 0x2d, 0x2f,
	0x30, 0x34, 0x36,
]

/**
 * MessageFilter (frame 0A): 32 bytes for each of 0x100 recipients, a bit per
 * message.  It chooses what the desk tells us, and changes nothing on it.
 */
export const MessageFilter = ((): Buffer => {
	const f = new Array<number>(0x2000).fill(0)
	for (const r of FilterRecipients) for (let i = 0; i < 32; i++) f[r * 32 + i] = 0xff
	return frame(0x0a, f)
})()

/** What the parser gives back */
export type AHMessage =
	| { kind: 'frame'; type: number; payload: Buffer }
	| { kind: 'message'; source: number; recipient: number; parameter: number; data: Buffer }

/** A frame longer than this means the stream is out of step (an SQ-5's whole state is 97 KB) */
const Longest = 1 << 22

/** The desk's byte stream into frames and messages */
export class AHParser {
	#buffer: Buffer = Buffer.alloc(0)

	feed(bytes: Buffer): AHMessage[] {
		this.#buffer = this.#buffer.length === 0 ? bytes : Buffer.concat([this.#buffer, bytes])
		const out: AHMessage[] = []
		const b = this.#buffer
		let i = 0
		scan: while (i < b.length) {
			switch (b[i]) {
				case 0x7f: {
					if (b.length - i < 6) break scan
					const n = b.readUInt32LE(i + 2)
					if (n > Longest) {
						i += 1
						continue
					}
					if (b.length - i < 6 + n) break scan
					const type = b[i + 1]
					const payload = b.subarray(i + 6, i + 6 + n)
					i += 6 + n
					if (type === 0x08 && payload.length >= 3) {
						out.push({
							kind: 'message',
							source: payload[0],
							recipient: payload[1],
							parameter: payload[2],
							data: Buffer.from(payload.subarray(3)),
						})
					} else {
						out.push({ kind: 'frame', type, payload: Buffer.from(payload) })
					}
					break
				}
				case 0xf7: {
					if (b.length - i < 8) break scan
					out.push({
						kind: 'message',
						source: b[i + 1],
						recipient: b[i + 2],
						parameter: b[i + 3],
						data: Buffer.from(b.subarray(i + 4, i + 8)),
					})
					i += 8
					break
				}
				default:
					// Nothing belongs between frames: skip it
					i += 1
			}
		}
		this.#buffer = Buffer.from(b.subarray(i))
		return out
	}
}

/** Printable text from name bytes: up to the first NUL, printable ASCII only, trimmed */
function text(bytes: Buffer): string {
	const end = bytes.indexOf(0)
	const raw = end < 0 ? bytes : bytes.subarray(0, end)
	let s = ''
	for (const c of raw) if (c >= 0x20 && c < 0x7f) s += String.fromCharCode(c)
	return s.trim()
}

/**
 * The strip a selection message names: recipient 09, parameter 0C, data
 * `[surface position] 00 [strip type] [strip]`.  Only strip type 1 (a
 * channel) is taken; 2 is a DCA and 3 a MIDI strip.
 */
export function selectedStrip(m: AHMessage): number | null {
	if (m.kind !== 'message' || m.recipient !== 0x09 || m.parameter !== 0x0c || m.data.length !== 4) return null
	return m.data[2] === 0x01 ? m.data[3] : null
}

/**
 * A name change: recipient 18, parameter 07, data `[type] [index] 00 00 name...`.
 * Type 0 is a channel (1 and 2 are DCAs and mute groups).
 */
export function renamed(m: AHMessage): { strip: number; name: string } | null {
	if (m.kind !== 'message' || m.recipient !== 0x18 || m.parameter !== 0x07 || m.data.length < 4) return null
	if (m.data[0] !== 0x00) return null
	return { strip: m.data[1], name: text(m.data.subarray(4)) }
}

/** The state's channel section: 122 records of 336 bytes, after `02 A5 A5 A5`, followed by `03 A5 A5 A5` */
const Records = 122
const RecordSize = 336
/** The name's bytes in a record (byte 13 on is other data) */
const NameField = 13

/** Where the channel records start in the state, or -1 if it isn't laid out so */
export function channelRecordsStart(state: Buffer): number {
	const at = state.indexOf(Buffer.from([0x02, 0xa5, 0xa5, 0xa5]))
	if (at < 0) return -1
	const first = at + 4
	const end = first + Records * RecordSize
	if (end + 4 > state.length || !state.subarray(end, end + 4).equals(Buffer.from([0x03, 0xa5, 0xa5, 0xa5]))) return -1
	return first
}

/** Channel names by strip from the state the desk sends for SceneSyncRequest (frame 04) */
export function namesFromState(state: Buffer): Map<number, string> | null {
	const first = channelRecordsStart(state)
	if (first < 0) return null
	const names = new Map<number, string>()
	for (let r = 0; r < Records; r++) {
		const o = first + r * RecordSize
		const name = text(state.subarray(o, o + NameField))
		if (name !== '') names.set(r, name)
	}
	return names
}

/** Strip numbers (MixPad's ranges, confirmed on an SQ-5 where noted) */
export const Strip = {
	/** Inputs 1-64 are strips 0-63 (confirmed; an SQ has 48) */
	input: (channel: number): number => channel - 1,
	/** LR is strip 104 (confirmed) */
	lr: 104,
	/** The input channel a strip is, if it's one */
	toInput: (strip: number): number | null => (strip >= 0 && strip <= 63 ? strip + 1 : null),
} as const

/** The record offset of a strip's block in the state */
export function stripRecordOffset(first: number, strip: number): number {
	return first + strip * RecordSize
}

/** The whole-state length the gain offsets below were captured from (SQ-5, firmware 1.6) */
export const KnownStateLength = 97376
