import { LR } from './types.js'

/**
 * Grid slots: channel + mix pairs owned by the module, so the Grid presets can
 * share them between buttons (a rotary that picks the channel and mix, and the
 * fader that drives that level).  Presets can't set custom variables, so the
 * module keeps these itself and publishes them as variables.
 *
 * A slot can follow the desk's selected channel (SEL) over the A&H remote
 * link.  Slots are kept in the connection's config, so they survive restarts.
 */

export interface GridSlot {
	channel: number
	mix: number | typeof LR
	follow: boolean
}

/** A slot's mix as a variable value: 'LR' or the mix number */
export type SlotMix = GridSlot['mix']

function defaultSlot(slot: number): GridSlot {
	return { channel: slot, mix: LR, follow: false }
}

/** Read stored slots, falling back to defaults for anything missing or broken */
export function readSlots(stored: string | undefined, count: number, channels: number, mixes: number): GridSlot[] {
	let parsed: unknown
	try {
		parsed = JSON.parse(stored ?? '[]')
	} catch (_e) {
		parsed = []
	}
	const list = Array.isArray(parsed) ? (parsed as unknown[]) : []
	const slots: GridSlot[] = []
	for (let i = 0; i < count; i++) {
		const fallback = defaultSlot(Math.min(i + 1, channels))
		const raw = list[i]
		if (raw === null || typeof raw !== 'object') {
			slots.push(fallback)
			continue
		}
		const { channel, mix, follow } = raw as Record<string, unknown>
		slots.push({
			channel:
				typeof channel === 'number' && Number.isInteger(channel) && channel >= 1 && channel <= channels
					? channel
					: fallback.channel,
			mix: mix === LR || (typeof mix === 'number' && Number.isInteger(mix) && mix >= 1 && mix <= mixes) ? mix : LR,
			follow: follow === true,
		})
	}
	return slots
}

/** Step a channel up or down, wrapping round */
export function stepChannel(channel: number, by: number, channels: number): number {
	return ((((channel - 1 + by) % channels) + channels) % channels) + 1
}

/** Step a mix through LR, Mix 1 ... Mix n, wrapping round */
export function stepMix(mix: SlotMix, by: number, mixes: number): SlotMix {
	const index = mix === LR ? 0 : mix
	const next = (((index + by) % (mixes + 1)) + mixes + 1) % (mixes + 1)
	return next === 0 ? LR : next
}

/** A channel as typed or from a variable ('16', 'CH 16'), or null */
export function parseChannel(text: string, channels: number): number | null {
	const n = Number(text.trim().replace(/^ch\s*/i, ''))
	return Number.isInteger(n) && n >= 1 && n <= channels ? n : null
}

/** A mix as typed or from a variable ('LR', '3', 'Mix 3', 'Aux 3'), or null */
export function parseMix(text: string, mixes: number): SlotMix | null {
	const t = text.trim()
	if (t.toUpperCase() === LR) return LR
	const n = Number(t.replace(/^(mix|aux)\s*/i, ''))
	return Number.isInteger(n) && n >= 1 && n <= mixes ? n : null
}
