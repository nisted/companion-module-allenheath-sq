import type {
	CompanionInputFieldCheckbox,
	CompanionInputFieldColor,
	CompanionInputFieldDropdown,
	CompanionInputFieldNumber,
	JsonValue,
} from '@companion-module/base'

/**
 * LED looks for the Grid LED feedbacks: one standard set of options for every
 * LED state.  Each state has a "Customise" switch; while it's off the state
 * shows its default look, and turning it on shows the options:
 *
 *   effect   solid, flash (on/off), alternate (step through 2-4 colours),
 *            pulse (smooth swell between two colours) or fade (smooth
 *            crossfade through 2-4 colours)
 *   colours  colour pickers (expressions work too)
 *   rate     ms per flash half, colour step or fade
 *
 * Flash can show whatever is underneath for its off half.  Waiting states can
 * also speed up as the Grid fader gets close to the desk fader.
 */

/** How a look moves */
type LookEffect = 'solid' | 'flash' | 'alternate' | 'pulse' | 'fade'

/** A look, ready to draw */
export interface Look {
	effect: LookEffect
	colours: number[]
	rateMs: number
	/** Flash only: show what's underneath for the off half */
	underneath: boolean
	/** Speed up as the fader gets closer (waiting states only) */
	approach: { fastestMs: number; fromSteps: number } | null
}

/** A state's default look, used while Customise is off and as the option defaults */
export interface LookDefaults {
	effect: LookEffect
	colours: [number, number, number, number]
	rateMs: number
	underneath: boolean
}

const MinRateMs = 40
const MaxRateMs = 10000
const DefaultApproachFastestMs = 60
const DefaultApproachFromSteps = 40

const EffectChoices: { id: LookEffect; label: string }[] = [
	{ id: 'solid', label: 'Solid' },
	{ id: 'flash', label: 'Flash (on/off)' },
	{ id: 'alternate', label: 'Alternate colours' },
	{ id: 'pulse', label: 'Pulse' },
	{ id: 'fade', label: 'Fade through colours' },
]

const ColourCountChoices = [
	{ id: 2, label: '2' },
	{ id: 3, label: '3' },
	{ id: 4, label: '4' },
]

/** What a look's option set includes beyond the standard ones */
export interface LookExtras {
	/** Offer "Speed up as it gets closer" */
	approach?: boolean
}

/** The option ids of one LED state's look */
export function lookIds(prefix: string) {
	return {
		custom: `${prefix}Custom`,
		effect: `${prefix}Effect`,
		count: `${prefix}Colours`,
		colour1: `${prefix}Colour1`,
		colour2: `${prefix}Colour2`,
		colour3: `${prefix}Colour3`,
		colour4: `${prefix}Colour4`,
		rate: `${prefix}Rate`,
		underneath: `${prefix}Underneath`,
		approach: `${prefix}Approach`,
		approachFastest: `${prefix}ApproachFastest`,
		approachFrom: `${prefix}ApproachFrom`,
	} as const
}

type LookOption =
	| CompanionInputFieldCheckbox
	| CompanionInputFieldDropdown<string, string>
	| CompanionInputFieldDropdown<string, number>
	| CompanionInputFieldColor
	| CompanionInputFieldNumber

/**
 * The standard option set for one LED state.
 *
 * @param prefix  option id prefix, e.g. 'below'
 * @param label   the state as shown, e.g. 'Below desk level'
 * @param defaults the state's default look
 */
export function lookOptions(
	prefix: string,
	label: string,
	defaults: LookDefaults,
	extras: LookExtras = {},
): LookOption[] {
	const id = lookIds(prefix)
	const on = `$(options:${id.custom})`
	const moving = `${on} && $(options:${id.effect}) != 'solid'`
	const several = `${on} && ($(options:${id.effect}) == 'alternate' || $(options:${id.effect}) == 'fade')`

	const colour = (optionId: string, n: number, visible: string): CompanionInputFieldColor => ({
		type: 'colorpicker',
		id: optionId,
		label: `${label}: colour ${n}`,
		default: defaults.colours[n - 1],
		returnType: 'number',
		isVisibleExpression: visible,
	})

	const options: LookOption[] = [
		{
			type: 'checkbox',
			id: id.custom,
			label: `${label}: customise`,
			default: false,
			disableAutoExpression: true,
			tooltip: `Off: the default look (${describe(defaults)}). On: choose the effect, colours and rate.`,
		},
		{
			type: 'dropdown',
			id: id.effect,
			label: `${label}: effect`,
			default: defaults.effect,
			choices: EffectChoices,
			disableAutoExpression: true,
			isVisibleExpression: on,
			tooltip:
				'Solid: colour 1. Flash: colour 1 and colour 2 in turn. Alternate: steps through the colours. Pulse: swells smoothly between colour 1 and colour 2. Fade: crossfades through the colours.',
		},
		{
			type: 'dropdown',
			id: id.count,
			label: `${label}: number of colours`,
			default: 2,
			choices: ColourCountChoices,
			disableAutoExpression: true,
			isVisibleExpression: several,
		},
		colour(id.colour1, 1, on),
		colour(id.colour2, 2, moving),
		colour(id.colour3, 3, `${several} && $(options:${id.count}) >= 3`),
		colour(id.colour4, 4, `${several} && $(options:${id.count}) >= 4`),
		{
			type: 'number',
			id: id.rate,
			label: `${label}: rate (ms)`,
			default: defaults.rateMs,
			min: MinRateMs,
			max: MaxRateMs,
			isVisibleExpression: moving,
			allowInvalidValues: true,
			tooltip: `Flash: ms per on or off half. Alternate: ms per colour. Pulse: ms per swell up or down. Fade: ms per crossfade. ${MinRateMs} to ${MaxRateMs}.`,
			expressionDescription: `A number from ${MinRateMs} to ${MaxRateMs}. Anything else uses the default (${defaults.rateMs}).`,
		},
		{
			type: 'checkbox',
			id: id.underneath,
			label: `${label}: off half shows the button underneath`,
			default: defaults.underneath,
			isVisibleExpression: `${on} && $(options:${id.effect}) == 'flash'`,
			tooltip:
				'Flash only. On: the off half shows whatever the button shows without this feedback, instead of colour 2.',
		},
	]

	if (extras.approach) {
		options.push(
			{
				type: 'checkbox',
				id: id.approach,
				label: `${label}: speed up as the Grid fader gets closer`,
				default: false,
				disableAutoExpression: true,
				isVisibleExpression: moving,
				tooltip: 'The effect runs faster the closer the Grid fader gets to the desk fader.',
			},
			{
				type: 'number',
				id: id.approachFastest,
				label: `${label}: fastest rate (ms), right next to the desk fader`,
				default: DefaultApproachFastestMs,
				min: MinRateMs,
				max: MaxRateMs,
				isVisibleExpression: `${moving} && $(options:${id.approach})`,
				allowInvalidValues: true,
				expressionDescription: `A number from ${MinRateMs} to ${MaxRateMs}. Anything else uses the default (${DefaultApproachFastestMs}).`,
			},
			{
				type: 'number',
				id: id.approachFrom,
				label: `${label}: start speeding up within (fader steps, of 127)`,
				default: DefaultApproachFromSteps,
				min: 1,
				max: 127,
				isVisibleExpression: `${moving} && $(options:${id.approach})`,
				allowInvalidValues: true,
				tooltip: 'Further away than this, the effect runs at the normal rate.',
				expressionDescription: `A number from 1 to 127. Anything else uses the default (${DefaultApproachFromSteps}).`,
			},
		)
	}

	return options
}

/** Every option value a look needs in a preset or upgrade, at its defaults */
export function lookDefaultValues(
	prefix: string,
	defaults: LookDefaults,
	extras: LookExtras = {},
): Record<string, JsonValue> {
	const id = lookIds(prefix)
	const values: Record<string, JsonValue> = {
		[id.custom]: false,
		[id.effect]: defaults.effect,
		[id.count]: 2,
		[id.colour1]: defaults.colours[0],
		[id.colour2]: defaults.colours[1],
		[id.colour3]: defaults.colours[2],
		[id.colour4]: defaults.colours[3],
		[id.rate]: defaults.rateMs,
		[id.underneath]: defaults.underneath,
	}
	if (extras.approach) {
		values[id.approach] = false
		values[id.approachFastest] = DefaultApproachFastestMs
		values[id.approachFrom] = DefaultApproachFromSteps
	}
	return values
}

function describe(defaults: LookDefaults): string {
	const name = (c: number) => `#${c.toString(16).padStart(6, '0')}`
	switch (defaults.effect) {
		case 'solid':
			return `solid ${name(defaults.colours[0])}`
		case 'flash':
			return `${name(defaults.colours[0])} flashing every ${defaults.rateMs} ms`
		default:
			return `${defaults.effect}, ${name(defaults.colours[0])} and ${name(defaults.colours[1])}, ${defaults.rateMs} ms`
	}
}

/** A number from typed text, a variable's value or an expression's result, falling back to `fallback` */
export function parseNumber(raw: unknown, fallback: number, min: number, max: number): number {
	const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
	const n = Number(text)
	if (text === '' || Number.isNaN(n)) return fallback
	return Math.max(min, Math.min(max, n))
}

function rgb(r: number, g: number, b: number): number {
	return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

/**
 * A colour from a colour picker, typed text or a variable's value: a Companion
 * colour number, '#ff0000', 'ff0000', '255,0,0' or 'rgb(255,0,0)'.  Falls back
 * to `fallback`.
 */
export function parseColour(raw: unknown, fallback: number): number {
	if (typeof raw === 'number') return Number.isFinite(raw) ? Math.max(0, Math.min(0xffffff, Math.round(raw))) : fallback
	if (typeof raw !== 'string') return fallback
	const text = raw.trim()
	const hex = /^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(text)
	if (hex) return parseInt(hex[1], 16)
	const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text)
	if (short) return parseInt(short[1] + short[1] + short[2] + short[2] + short[3] + short[3], 16)
	const triple = /^(?:rgba?\()?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)?$/i.exec(text)
	if (triple) {
		const c = (s: string) => Math.min(255, Number(s))
		return rgb(c(triple[1]), c(triple[2]), c(triple[3]))
	}
	if (/^\d+$/.test(text)) return Math.min(0xffffff, Number(text))
	return fallback
}

/** Scale a colour's brightness by `fraction` (0-1) */
export function scaleColour(colour: number, fraction: number): number {
	const f = Math.max(0, Math.min(1, fraction))
	return rgb(
		Math.round(((colour >> 16) & 0xff) * f),
		Math.round(((colour >> 8) & 0xff) * f),
		Math.round((colour & 0xff) * f),
	)
}

/** Mix two colours: 0 = all `a`, 1 = all `b` */
function blend(a: number, b: number, t: number): number {
	const f = Math.max(0, Math.min(1, t))
	const mix = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - f) + ((b >> shift) & 0xff) * f)
	return rgb(mix(16), mix(8), mix(0))
}

function isEffect(value: JsonValue | undefined): value is LookEffect {
	return EffectChoices.some((choice) => choice.id === value)
}

/** Read one LED state's look from a feedback's options */
export function readLook(
	options: Record<string, JsonValue | undefined>,
	prefix: string,
	defaults: LookDefaults,
	extras: LookExtras = {},
): Look {
	const id = lookIds(prefix)
	if (options[id.custom] !== true) {
		return {
			effect: defaults.effect,
			colours: defaults.effect === 'solid' ? [defaults.colours[0]] : defaults.colours.slice(0, 2),
			rateMs: defaults.rateMs,
			underneath: defaults.underneath,
			approach: null,
		}
	}

	const effectOption = options[id.effect]
	const effect = isEffect(effectOption) ? effectOption : defaults.effect
	const count = effect === 'alternate' || effect === 'fade' ? parseNumber(options[id.count], 2, 2, 4) : 2
	const colourIds = [id.colour1, id.colour2, id.colour3, id.colour4]
	const colours = colourIds
		.slice(0, effect === 'solid' ? 1 : Math.round(count))
		.map((colourId, i) => parseColour(options[colourId], defaults.colours[i]))
	const rateMs = parseNumber(options[id.rate], defaults.rateMs, MinRateMs, MaxRateMs)
	const approach =
		extras.approach && effect !== 'solid' && options[id.approach] === true
			? {
					fastestMs: parseNumber(options[id.approachFastest], DefaultApproachFastestMs, MinRateMs, MaxRateMs),
					fromSteps: parseNumber(options[id.approachFrom], DefaultApproachFromSteps, 1, 127),
				}
			: null

	return { effect, colours, rateMs, underneath: effect === 'flash' && options[id.underneath] === true, approach }
}

/** Whether a look changes over time */
export function isMoving(look: Look): boolean {
	return look.effect !== 'solid'
}

/**
 * Where each feedback is up to in its effect.  Kept per feedback, so a rate
 * that changes as the fader moves (speed-up on approach) carries on smoothly
 * instead of jumping.
 */
const phases = new Map<string, { phase: number; at: number }>()

/**
 * The colour to show for a look now, or `undefined` for "show what's
 * underneath".
 *
 * @param feedbackId  the feedback's id, to keep its own place in the effect
 * @param distance    for speed-up on approach: how far (fader steps) the Grid
 *                    fader is from the desk fader
 */
export function drawLook(look: Look, feedbackId: string, distance?: number): number | undefined {
	const [first] = look.colours
	if (look.effect === 'solid') return first

	let rate = look.rateMs
	if (look.approach !== null && distance !== undefined) {
		const t = Math.max(0, Math.min(1, distance / look.approach.fromSteps))
		rate = look.approach.fastestMs + (look.rateMs - look.approach.fastestMs) * t
	}

	// One phase unit = one rate period
	const now = Date.now()
	const last = phases.get(feedbackId)
	const phase = last === undefined || now - last.at > 1000 ? now / rate : last.phase + (now - last.at) / rate
	phases.set(feedbackId, { phase, at: now })

	const colours = look.colours.length >= 2 ? look.colours : [first, 0]
	switch (look.effect) {
		case 'flash': {
			const on = Math.floor(phase) % 2 === 0
			if (on) return colours[0]
			return look.underneath ? undefined : colours[1]
		}
		case 'alternate':
			return colours[Math.floor(phase) % colours.length]
		case 'pulse': {
			// Up in one period, down in the next
			const t = (1 - Math.cos(Math.PI * phase)) / 2
			return blend(colours[1], colours[0], t)
		}
		case 'fade': {
			const step = Math.floor(phase)
			const from = colours[step % colours.length]
			const to = colours[(step + 1) % colours.length]
			return blend(from, to, phase - step)
		}
	}
}

/** Forget a feedback's place in its effect (when it's removed) */
export function forgetLook(feedbackId: string): void {
	phases.delete(feedbackId)
}
