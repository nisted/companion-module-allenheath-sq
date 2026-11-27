import type { CompanionVariableDefinitions, CompanionVariableValue } from '@companion-module/base'
import { AHLink, type AHLinkStatus } from './ahlink/link.js'
import { type AHParamId, AHParamIds, AHParams } from './ahlink/params.js'
import { getAHControl, getAHLink, getGridSlots, type Host } from './config.js'
import { type GridSlot, readSlots, type SlotMix, stepChannel, stepMix } from './grid-slots.js'
import type { sqInstance } from './instance.js'
import type { Model } from './mixer/model.js'
import { LR } from './types.js'
import type { SQVariables } from './variables/manifest.js'

/** How long after the last Grid slot change the slots are saved */
const SaveSlotsMs = 2000
/** How long after names change the action and feedback lists are rebuilt */
const RedefineMs = 1000

/** A processing variable id: `ch16_gain` */
function paramVariableId(channel: number, id: AHParamId): `ch${number}_${string}` {
	return `ch${channel}_${id}`
}

/** A processing value as a variable: switches as on/off */
function paramVariableValue(id: AHParamId, value: number | undefined): CompanionVariableValue {
	if (value === undefined) return ''
	return AHParams[id].kind === 'switch' ? (value ? 'on' : 'off') : value
}

/**
 * SQ Rebel's additions alongside the MIDI connection: the A&H remote link
 * (names, selection, channel processing) and the Grid slots.
 */
export class Rebel {
	readonly #instance: sqInstance
	readonly #model: Model
	#link: AHLink | null = null
	#slots: GridSlot[]
	#published = new Map<string, CompanionVariableValue>()
	#saveTimer: NodeJS.Timeout | undefined
	#redefineTimer: NodeJS.Timeout | undefined
	#recording = false

	/** Called when names change, to rebuild the action and feedback lists */
	onNamesChanged: () => void = () => {
		// set by the instance
	}

	constructor(instance: sqInstance, model: Model) {
		this.#instance = instance
		this.#model = model
		this.#slots = readSlots(
			instance.config.gridSlotState,
			getGridSlots(instance.config),
			model.inputOutputCounts.inputChannel,
			model.inputOutputCounts.mix,
		)
	}

	get channels(): number {
		return this.#model.inputOutputCounts.inputChannel
	}

	get mixes(): number {
		return this.#model.inputOutputCounts.mix
	}

	start(host: Host | ''): void {
		if (host === '' || !getAHLink(this.#instance.config)) {
			this.#publish()
			return
		}
		const link = new AHLink(host, (level, message) => {
			this.#instance.log(level, message)
		})
		this.#link = link
		link.on('status', (status: AHLinkStatus, why: string) => {
			if (status === 'live') this.#instance.log('info', `A&H remote link connected to ${host}:51326`)
			else if (status === 'down') this.#instance.log('info', `A&H remote link down (${why}); retrying`)
			this.#publish()
			this.#instance.checkFeedbacks('ah_switch_on', 'ah_value', 'ah_name', 'ah_selected')
		})
		link.on('changed', (what) => {
			if (what.selection) this.#followSelection()
			if (what.names) this.#redefineSoon()
			if (this.#recording) {
				for (const id of what.params) this.#recordParam(id)
			}
			this.#publish()
			this.#instance.checkFeedbacks('ah_switch_on', 'ah_value', 'ah_name', 'ah_selected')
		})
		link.start()
		this.#publish()
	}

	stop(): void {
		this.#link?.stop()
		this.#link = null
		clearTimeout(this.#redefineTimer)
		if (this.#saveTimer !== undefined) {
			clearTimeout(this.#saveTimer)
			this.#saveSlots()
		}
	}

	setRecording(recording: boolean): void {
		this.#recording = recording
		this.#lastRecorded.clear()
	}

	// ---- names and selection ----

	inputChannelName(channel: number): string | undefined {
		return this.#link?.inputName(channel)
	}

	lrName(): string | undefined {
		return this.#link?.lrName()
	}

	/**
	 * A mix's name.  Not read yet: the desk numbers mix strips by type (aux or
	 * group) and how its mixes are set up isn't known, so which record is
	 * which mix isn't settled.
	 */
	mixName(_mix: number): string | undefined {
		return undefined
	}

	/** The desk's selected input channel, if a channel is selected */
	selectedChannel(): number | null {
		return this.#link?.selectedInput() ?? null
	}

	/** A channel option's value: a number, 'CH 16', or 'sel' for the selected channel */
	resolveChannel(text: string): number | null {
		const t = text.trim()
		if (t.toLowerCase() === 'sel') return this.selectedChannel()
		const n = Number(t.replace(/^ch\s*/i, ''))
		return Number.isInteger(n) && n >= 1 && n <= this.channels ? n : null
	}

	// ---- processing ----

	value(id: AHParamId, channel: number): number | undefined {
		return this.#link?.value(id, channel)
	}

	/** Set a processing value, if changes over the link are allowed */
	setValue(id: AHParamId, channel: number, value: number): void {
		const param = AHParams[id]
		if (!getAHControl(this.#instance.config)) {
			this.#instance.log(
				'warn',
				`${param.label} on CH ${channel} wasn't changed: "Allow changes over the A&H remote link" is off`,
			)
			return
		}
		if (this.#link === null) {
			this.#instance.log('warn', `${param.label} on CH ${channel} wasn't changed: the A&H remote link is off`)
			return
		}
		if (this.#link.set(id, channel, value)) {
			this.#publish()
			this.#instance.checkFeedbacks('ah_switch_on', 'ah_value')
		}
	}

	// ---- Grid slots ----

	slotCount(): number {
		return this.#slots.length
	}

	slot(n: number): GridSlot | undefined {
		return this.#slots[n - 1]
	}

	/** A slot number as typed or from a variable, or null */
	resolveSlot(text: string): number | null {
		const n = Number(text.trim())
		return Number.isInteger(n) && n >= 1 && n <= this.#slots.length ? n : null
	}

	setSlot(n: number, channel: number | null, mix: SlotMix | null): void {
		const slot = this.slot(n)
		if (slot === undefined) return
		if (channel !== null) slot.channel = channel
		if (mix !== null) slot.mix = mix
		this.#slotChanged()
	}

	stepSlot(n: number, what: 'channel' | 'mix', by: number): void {
		const slot = this.slot(n)
		if (slot === undefined) return
		if (what === 'channel') slot.channel = stepChannel(slot.channel, by, this.channels)
		else slot.mix = stepMix(slot.mix, by, this.mixes)
		this.#slotChanged()
	}

	followSlot(n: number, follow: 'on' | 'off' | 'toggle'): void {
		const slot = this.slot(n)
		if (slot === undefined) return
		slot.follow = follow === 'toggle' ? !slot.follow : follow === 'on'
		if (slot.follow) {
			const selected = this.selectedChannel()
			if (selected !== null) slot.channel = selected
		}
		this.#slotChanged()
		this.#instance.checkFeedbacks('grid_slot_following')
	}

	#followSelection(): void {
		const selected = this.selectedChannel()
		if (selected === null) return
		let changed = false
		for (const slot of this.#slots) {
			if (slot.follow && slot.channel !== selected) {
				slot.channel = selected
				changed = true
			}
		}
		if (changed) this.#slotChanged()
	}

	#slotChanged(): void {
		this.#publish()
		clearTimeout(this.#saveTimer)
		this.#saveTimer = setTimeout(() => {
			this.#saveTimer = undefined
			this.#saveSlots()
		}, SaveSlotsMs)
	}

	#saveSlots(): void {
		const state = JSON.stringify(this.#slots)
		if (state === this.#instance.config.gridSlotState) return
		this.#instance.config.gridSlotState = state
		this.#instance.saveConfig(this.#instance.config)
	}

	#redefineSoon(): void {
		clearTimeout(this.#redefineTimer)
		this.#redefineTimer = setTimeout(() => {
			this.onNamesChanged()
		}, RedefineMs)
	}

	// ---- action recorder ----

	readonly #lastRecorded = new Map<string, string>()

	/** Record desk-side processing changes as actions (only while recording) */
	#recordParam(id: AHParamId): void {
		if (this.#link === null) return
		const param = AHParams[id]
		for (let channel = 1; channel <= this.channels; channel++) {
			const value = this.#link.value(id, channel)
			if (value === undefined) continue
			const key = `${id}.${channel}`
			const seen = this.#lastRecorded.get(key)
			const text = String(value)
			this.#lastRecorded.set(key, text)
			if (seen === undefined || seen === text) continue
			this.#instance.recordAction(
				param.kind === 'switch'
					? { actionId: 'ah_switch', options: { channel, what: id, set: value ? 'on' : 'off' } }
					: { actionId: 'ah_value', options: { channel, what: id, operation: 'set', amount: value } },
				`ah:${key}`,
			)
		}
	}

	/** Note every processing value as it is now, so recording only picks up changes from here */
	primeRecorder(): void {
		this.#lastRecorded.clear()
		if (this.#link === null) return
		for (const id of AHParamIds) {
			for (let channel = 1; channel <= this.channels; channel++) {
				const value = this.#link.value(id, channel)
				if (value !== undefined) this.#lastRecorded.set(`${id}.${channel}`, String(value))
			}
		}
	}

	// ---- variables ----

	variableDefinitions(): CompanionVariableDefinitions<SQVariables> {
		const defs: Record<string, { name: string }> = {
			ah_link: { name: 'A&H remote link: status' },
			selected_channel: { name: 'Selected channel on the desk (number)' },
			selected_name: { name: 'Selected channel on the desk: name' },
			lr_name: { name: 'LR: name' },
		}
		for (let channel = 1; channel <= this.channels; channel++) {
			defs[`ch_name_${channel}`] = { name: `CH ${channel}: name` }
			for (const id of AHParamIds) {
				const param = AHParams[id]
				defs[paramVariableId(channel, id)] = {
					name: `CH ${channel}: ${param.label}${param.unit === '' ? '' : ` (${param.unit})`}`,
				}
			}
		}
		for (const id of AHParamIds) {
			const param = AHParams[id]
			defs[`sel_${id}`] = { name: `Selected channel: ${param.label}${param.unit === '' ? '' : ` (${param.unit})`}` }
		}
		for (let n = 1; n <= this.#slots.length; n++) {
			defs[`grid${n}_channel`] = { name: `Grid slot ${n}: channel` }
			defs[`grid${n}_channel_name`] = { name: `Grid slot ${n}: channel name` }
			defs[`grid${n}_channel_label`] = { name: `Grid slot ${n}: channel, e.g. CH 3 Kick` }
			defs[`grid${n}_mix`] = { name: `Grid slot ${n}: mix (LR or a number)` }
			defs[`grid${n}_mix_label`] = { name: `Grid slot ${n}: mix, e.g. Mix 3` }
			defs[`grid${n}_follow`] = { name: `Grid slot ${n}: follows the desk's selected channel` }
		}
		return defs as unknown as CompanionVariableDefinitions<SQVariables>
	}

	/** Send the variables that changed since last time */
	#publish(): void {
		const values = new Map<string, CompanionVariableValue>()
		const link = this.#link
		values.set('ah_link', link === null ? 'off' : link.status)
		const selected = this.selectedChannel()
		values.set('selected_channel', selected ?? '')
		values.set('selected_name', selected === null ? '' : (this.inputChannelName(selected) ?? `CH ${selected}`))
		values.set('lr_name', this.lrName() ?? 'LR')
		for (let channel = 1; channel <= this.channels; channel++) {
			values.set(`ch_name_${channel}`, this.inputChannelName(channel) ?? `CH ${channel}`)
			for (const id of AHParamIds) {
				values.set(paramVariableId(channel, id), paramVariableValue(id, link?.value(id, channel)))
			}
		}
		for (const id of AHParamIds) {
			values.set(`sel_${id}`, selected === null ? '' : paramVariableValue(id, link?.value(id, selected)))
		}
		this.#slots.forEach((slot, i) => {
			const n = i + 1
			const name = this.inputChannelName(slot.channel)
			values.set(`grid${n}_channel`, slot.channel)
			values.set(`grid${n}_channel_name`, name ?? '')
			values.set(`grid${n}_channel_label`, name === undefined ? `CH ${slot.channel}` : `CH ${slot.channel} ${name}`)
			values.set(`grid${n}_mix`, slot.mix)
			values.set(`grid${n}_mix_label`, slot.mix === LR ? (this.lrName() ?? 'LR') : `Mix ${slot.mix}`)
			values.set(`grid${n}_follow`, slot.follow)
		})

		const changed: Record<string, CompanionVariableValue> = {}
		let any = false
		for (const [id, value] of values) {
			if (this.#published.get(id) === value) continue
			this.#published.set(id, value)
			changed[id] = value
			any = true
		}
		if (any) this.#instance.setVariableValues(changed as unknown as Partial<SQVariables>)
	}

	/** Send every variable again (after the definitions are set) */
	publishAll(): void {
		this.#published.clear()
		this.#publish()
	}
}
