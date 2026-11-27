/**
 * Input channel processing over the A&H remote port, from
 * allen-heath-sq-tools (MIT, Hannes Rüger): registers captured from SQ MixPad
 * talking to an SQ-5.  A message is `F7 source recipient parameter strip
 * modifier value-LE16`.
 */

/** A processing parameter on every input channel */
export interface AHParam {
	/** Used in action, feedback and variable ids */
	id: AHParamId
	/** As shown */
	label: string
	/** The source byte MixPad sends it with */
	source: number
	recipient: number
	parameter: number
	modifier: number
	/** On/off, or a number in `unit` */
	kind: 'switch' | 'number'
	unit: string
	min: number
	max: number
	/** Default step for up/down actions */
	step: number
	toWire: (value: number) => number
	fromWire: (wire: number) => number
	/**
	 * Where the value sits in the desk's state: relative to the strip's
	 * record, or (`absolute`) from the start of the state (only for states of
	 * the known length).  `bit` reads one bit of a byte.
	 */
	state?: { offset: number; bytes: 1 | 2; bit?: number; absolute?: true }
}

export const AHParamIds = [
	'gain',
	'phantom',
	'pad',
	'trim',
	'polarity',
	'hpf',
	'hpfFreq',
	'gate',
	'comp',
	'peq',
	'delay',
	'delayTime',
	'insert',
	'pafl',
] as const

export type AHParamId = (typeof AHParamIds)[number]

const onOff = { toWire: (v: number) => (v ? 1 : 0), fromWire: (w: number) => (w !== 0 ? 1 : 0) }
const switchRange = { kind: 'switch', unit: '', min: 0, max: 1, step: 1 } as const

const round1 = (n: number) => Math.round(n * 10) / 10

export const AHParams: Record<AHParamId, AHParam> = {
	gain: {
		id: 'gain',
		label: 'Preamp gain',
		source: 0x08,
		recipient: 0x0c,
		parameter: 0x0c,
		modifier: 0x01,
		kind: 'number',
		unit: 'dB',
		min: 0,
		max: 60,
		step: 1,
		toWire: (db) => Math.round(0x8000 + db * 256),
		fromWire: (w) => round1((w - 0x8000) / 256),
		state: { offset: 80028, bytes: 2, absolute: true },
	},
	phantom: {
		id: 'phantom',
		label: '48V phantom power',
		source: 0x38,
		recipient: 0x0c,
		parameter: 0x0d,
		modifier: 0x01,
		...switchRange,
		...onOff,
	},
	pad: {
		id: 'pad',
		label: 'Pad',
		source: 0x38,
		recipient: 0x0c,
		parameter: 0x0e,
		modifier: 0x01,
		...switchRange,
		...onOff,
	},
	trim: {
		id: 'trim',
		label: 'Trim',
		source: 0x38,
		recipient: 0x0c,
		parameter: 0x0f,
		modifier: 0x00,
		kind: 'number',
		unit: 'dB',
		min: -24,
		max: 24,
		step: 1,
		toWire: (db) => Math.round(31724 + db * 212.5),
		fromWire: (w) => round1((w - 31724) / 212.5),
		state: { offset: 324, bytes: 2 },
	},
	polarity: {
		id: 'polarity',
		label: 'Polarity invert',
		source: 0x38,
		recipient: 0x0c,
		parameter: 0x10,
		modifier: 0x00,
		...switchRange,
		...onOff,
		state: { offset: 332, bytes: 1, bit: 0 },
	},
	hpf: {
		id: 'hpf',
		label: 'HPF',
		source: 0x08,
		recipient: 0x0e,
		parameter: 0x0c,
		modifier: 0x00,
		...switchRange,
		...onOff,
		state: { offset: 87, bytes: 1 },
	},
	hpfFreq: {
		id: 'hpfFreq',
		label: 'HPF frequency',
		source: 0x08,
		recipient: 0x0e,
		parameter: 0x0d,
		modifier: 0x00,
		kind: 'number',
		unit: 'Hz',
		min: 20,
		max: 2000,
		step: 10,
		toWire: (hz) => Math.round(-9206 + 15308 * Math.log10(Math.max(20, Math.min(2000, hz)))),
		fromWire: (w) => Math.round(Math.pow(10, (w + 9206) / 15308)),
		state: { offset: 84, bytes: 2 },
	},
	gate: {
		id: 'gate',
		label: 'Gate',
		source: 0x08,
		recipient: 0x0f,
		parameter: 0x0c,
		modifier: 0x00,
		...switchRange,
		...onOff,
		state: { offset: 121, bytes: 1 },
	},
	comp: {
		id: 'comp',
		label: 'Compressor',
		source: 0x08,
		recipient: 0x13,
		parameter: 0x0c,
		modifier: 0x00,
		...switchRange,
		...onOff,
		state: { offset: 302, bytes: 1 },
	},
	peq: {
		id: 'peq',
		label: 'PEQ',
		source: 0x38,
		recipient: 0x11,
		parameter: 0x1a,
		modifier: 0x00,
		...switchRange,
		...onOff,
		state: { offset: 173, bytes: 1 },
	},
	delay: {
		id: 'delay',
		label: 'Delay',
		source: 0x38,
		recipient: 0x14,
		parameter: 0x0c,
		modifier: 0x00,
		...switchRange,
		...onOff,
		state: { offset: 306, bytes: 1 },
	},
	delayTime: {
		id: 'delayTime',
		label: 'Delay time',
		source: 0x38,
		recipient: 0x14,
		parameter: 0x0d,
		modifier: 0x00,
		kind: 'number',
		unit: 'ms',
		min: 0,
		max: 341,
		step: 1,
		toWire: (ms) => Math.round(Math.max(0, Math.min(341, ms)) * 96),
		fromWire: (w) => round1(w / 96),
		state: { offset: 304, bytes: 2 },
	},
	insert: {
		id: 'insert',
		label: 'Insert',
		source: 0x38,
		recipient: 0x10,
		parameter: 0x0c,
		modifier: 0x00,
		...switchRange,
		...onOff,
	},
	pafl: {
		id: 'pafl',
		label: 'PAFL',
		source: 0x08,
		recipient: 0x15,
		parameter: 0x0c,
		modifier: 0x00,
		...switchRange,
		...onOff,
	},
}

/** The parameter a live message is about, by recipient and parameter */
const byMessage = new Map<string, AHParam>(
	Object.values(AHParams).map((p) => [`${p.recipient}.${p.parameter}`, p] as const),
)

export function paramForMessage(recipient: number, parameter: number): AHParam | undefined {
	return byMessage.get(`${recipient}.${parameter}`)
}

/** The message that sets a parameter on a strip */
export function setMessage(param: AHParam, strip: number, value: number): Buffer {
	const wire = Math.max(0, Math.min(0xffff, param.toWire(value)))
	return Buffer.from([
		0xf7,
		param.source,
		param.recipient,
		param.parameter,
		strip,
		param.modifier,
		wire & 0xff,
		wire >> 8,
	])
}

/** Keep a value inside a parameter's range */
export function clampParam(param: AHParam, value: number): number {
	return Math.max(param.min, Math.min(param.max, value))
}
