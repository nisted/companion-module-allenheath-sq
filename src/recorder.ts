import type { sqInstance } from './instance.js'
import type { Level } from './mixer/level.js'
import type { InputOutputType, Model } from './mixer/model.js'
import { calculateMuteNRPN } from './mixer/nrpn/mute.js'
import type { NRPN } from './mixer/nrpn/nrpn.js'
import { LevelNRPNCalculator } from './mixer/nrpn/source-to-sink.js'
import { LR, LRStrip, MuteOperation } from './types.js'
import { zeroIndexedNumber } from './utils/indexed.js'

/** Which mute action each kind of strip uses */
const MuteActionByType: Partial<Record<InputOutputType, string>> = {
	inputChannel: 'mute_input',
	lr: 'mute_lr',
	mix: 'mute_aux',
	group: 'mute_group',
	matrix: 'mute_matrix',
	fxSend: 'mute_fx_send',
	fxReturn: 'mute_fx_return',
	dca: 'mute_dca',
	muteGroup: 'mute_mutegroup',
}

/**
 * Companion's action recorder for changes made on the desk, over MIDI: mutes
 * become the matching mute action (on or off), and input channel levels in LR
 * or a mix become "Fader channel level to mix (from value/variable)" in dB.
 * Repeated changes to the same thing replace each other, so a fader move
 * records where it stopped.
 */
export class DeskRecorder {
	readonly #instance: sqInstance
	readonly #mutes = new Map<number, { actionId: string; n: number | null }>()
	readonly #levels = new Map<number, { source: number; sink: number | typeof LR }>()

	constructor(instance: sqInstance, model: Model) {
		this.#instance = instance
		for (const [type, actionId] of Object.entries(MuteActionByType) as [InputOutputType, string][]) {
			for (let n = 0; n < model.inputOutputCounts[type]; n++) {
				const nrpn = calculateMuteNRPN(model, type, zeroIndexedNumber(n))
				this.#mutes.set(nrpn, { actionId, n: type === 'lr' ? null : n + 1 })
			}
		}
		const toLR = LevelNRPNCalculator.get(model, ['inputChannel', 'lr'])
		const toMix = LevelNRPNCalculator.get(model, ['inputChannel', 'mix'])
		for (let ch = 0; ch < model.inputOutputCounts.inputChannel; ch++) {
			this.#levels.set(toLR.calculate(zeroIndexedNumber(ch), LRStrip), { source: ch + 1, sink: LR })
			for (let mix = 0; mix < model.inputOutputCounts.mix; mix++) {
				this.#levels.set(toMix.calculate(zeroIndexedNumber(ch), zeroIndexedNumber(mix)), {
					source: ch + 1,
					sink: mix + 1,
				})
			}
		}
	}

	mute(nrpn: NRPN<'mute'>, muted: boolean): void {
		if (!this.#instance.isRecording) return
		const target = this.#mutes.get(nrpn)
		if (target === undefined) return
		const status = muted ? MuteOperation.On : MuteOperation.Off
		this.#instance.recordAction(
			{ actionId: target.actionId, options: target.n === null ? { status } : { n: target.n, status } },
			`mute:${nrpn}`,
		)
	}

	level(nrpn: NRPN<'level'>, level: Level): void {
		if (!this.#instance.isRecording) return
		const target = this.#levels.get(nrpn)
		if (target === undefined) return
		this.#instance.recordAction(
			{
				actionId: 'chlev_to_mix_value',
				options: {
					source: target.source,
					sink: target.sink,
					value: level === '-inf' ? '-inf' : String(Math.round(level * 10) / 10),
					valueType: 'db',
					pickup: false,
					pickupBand: 3,
					pickupDwell: 1000,
					pickupReleaseBand: 6,
					pickupReleaseTime: 0,
				},
			},
			`level:${nrpn}`,
		)
	}
}
