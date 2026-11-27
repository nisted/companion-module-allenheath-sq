import { Socket } from 'node:net'
import { EventEmitter } from 'eventemitter3'
import {
	AHParser,
	type AHMessage,
	AHRemotePort,
	channelRecordsStart,
	DiscoveryRequest,
	FeatureSetRequest,
	Hello,
	KeepAlive,
	KnownStateLength,
	MessageFilter,
	namesFromState,
	renamed,
	SceneSyncRequest,
	selectedStrip,
	SelectionRequest,
	Strip,
	stripRecordOffset,
} from './protocol.js'
import { type AHParam, type AHParamId, AHParams, clampParam, paramForMessage, setMessage } from './params.js'

/** Where the link is up to */
export type AHLinkStatus = 'off' | 'connecting' | 'live' | 'down'

type AHLinkEvents = {
	/** Something changed: names, the selection or processing values (batched) */
	changed: (what: { names: boolean; selection: boolean; params: Set<AHParamId> }) => void
	/** The link went up or down */
	status: (status: AHLinkStatus, why: string) => void
}

const KeepAliveMs = 1000
/** The desk sends a status frame a few times a second, so this long without anything means it's gone */
const SilenceMs = 5000
const RetryMs = 3000
/** Changes are batched for this long, then only what changed is reported */
const BatchMs = 50

/** The key of a processing value: parameter and input channel */
type ValueKey = `${AHParamId}.${number}`

/**
 * The A&H remote link (TCP 51326), alongside the MIDI connection: channel
 * names, the desk's selected channel, and input channel processing.  If it
 * can't connect, or the desk's firmware lays things out differently, only what
 * it adds stops working; MIDI carries on.
 */
export class AHLink extends EventEmitter<AHLinkEvents> {
	readonly #host: string
	readonly #log: (level: 'info' | 'warn' | 'debug', message: string) => void
	#socket: Socket | null = null
	#parser = new AHParser()
	#keepAlive: NodeJS.Timeout | undefined
	#retry: NodeJS.Timeout | undefined
	#batch: NodeJS.Timeout | undefined
	#lastData = 0
	#greeted = false
	#stopped = true
	#status: AHLinkStatus = 'off'

	/** Channel names by strip */
	readonly names = new Map<number, string>()
	/** The selected strip (a channel), if the desk has said */
	selected: number | null = null
	readonly #values = new Map<ValueKey, number>()

	#pending = { names: false, selection: false, params: new Set<AHParamId>() }

	constructor(host: string, log: (level: 'info' | 'warn' | 'debug', message: string) => void) {
		super()
		this.#host = host
		this.#log = log
	}

	get status(): AHLinkStatus {
		return this.#status
	}

	start(): void {
		this.#stopped = false
		this.#connect()
	}

	stop(): void {
		this.#stopped = true
		this.#teardown()
		clearTimeout(this.#retry)
		clearTimeout(this.#batch)
		this.#setStatus('off', 'stopped')
		this.removeAllListeners()
	}

	/** An input channel's name, if the desk has given it one */
	inputName(channel: number): string | undefined {
		return this.names.get(Strip.input(channel))
	}

	/** LR's name, if the desk has given it one */
	lrName(): string | undefined {
		return this.names.get(Strip.lr)
	}

	/** The selected input channel, if a channel is selected */
	selectedInput(): number | null {
		return this.selected === null ? null : Strip.toInput(this.selected)
	}

	/** A processing value on an input channel, if known */
	value(id: AHParamId, channel: number): number | undefined {
		return this.#values.get(`${id}.${channel}`)
	}

	/**
	 * Set a processing value on an input channel.  Returns false (and logs)
	 * if the link isn't up.
	 */
	set(id: AHParamId, channel: number, value: number): boolean {
		const param = AHParams[id]
		const v = clampParam(param, value)
		if (this.#socket === null || this.#status !== 'live') {
			this.#log('warn', `A&H remote link isn't connected, so ${param.label} on CH ${channel} wasn't changed`)
			return false
		}
		this.#socket.write(setMessage(param, Strip.input(channel), v))
		this.#store(param, channel, param.kind === 'switch' ? (v ? 1 : 0) : v)
		return true
	}

	#setStatus(status: AHLinkStatus, why: string): void {
		if (status === this.#status) return
		this.#status = status
		this.emit('status', status, why)
	}

	#connect(): void {
		if (this.#stopped) return
		this.#teardown()
		this.#setStatus('connecting', `connecting to ${this.#host}:${AHRemotePort}`)

		const socket = new Socket()
		this.#socket = socket
		this.#parser = new AHParser()
		this.#greeted = false
		this.#lastData = Date.now()
		socket.setNoDelay(true)

		socket.on('connect', () => {
			this.#lastData = Date.now()
			socket.write(Hello)
		})
		socket.on('data', (chunk: Buffer) => {
			this.#lastData = Date.now()
			for (const m of this.#parser.feed(chunk)) this.#handle(m)
		})
		socket.on('error', (err: Error) => {
			this.#log('debug', `A&H remote link: ${err.message}`)
		})
		socket.on('close', () => {
			if (this.#socket !== socket) return
			this.#socket = null
			this.#down('connection closed')
		})

		this.#keepAlive = setInterval(() => {
			if (this.#socket !== socket) return
			if (Date.now() - this.#lastData > SilenceMs) {
				this.#down('nothing from the desk for five seconds')
				return
			}
			if (this.#greeted) socket.write(KeepAlive)
		}, KeepAliveMs)

		socket.connect(AHRemotePort, this.#host)
	}

	#teardown(): void {
		clearInterval(this.#keepAlive)
		this.#keepAlive = undefined
		const socket = this.#socket
		this.#socket = null
		socket?.removeAllListeners()
		socket?.on('error', () => {
			// closing anyway
		})
		socket?.destroy()
	}

	#down(why: string): void {
		this.#teardown()
		this.#setStatus('down', why)
		if (this.#stopped) return
		clearTimeout(this.#retry)
		this.#retry = setTimeout(() => {
			this.#connect()
		}, RetryMs)
	}

	#handle(m: AHMessage): void {
		const socket = this.#socket
		if (socket === null) return

		if (m.kind === 'frame') {
			switch (m.type) {
				case 0x00:
					// The desk's hello (its own UDP port, not needed)
					this.#greeted = true
					socket.write(DiscoveryRequest)
					return
				case 0x02:
					// Box info
					socket.write(FeatureSetRequest)
					return
				case 0x0c:
					socket.write(MessageFilter)
					socket.write(SceneSyncRequest)
					return
				case 0x04:
					this.#readState(m.payload)
					socket.write(SelectionRequest)
					this.#setStatus('live', 'connected')
					return
				default:
					return
			}
		}

		const strip = selectedStrip(m)
		if (strip !== null) {
			if (strip !== this.selected) {
				this.selected = strip
				this.#pending.selection = true
				this.#flushSoon()
			}
			return
		}

		const rename = renamed(m)
		if (rename !== null) {
			const old = this.names.get(rename.strip)
			if (rename.name === '') this.names.delete(rename.strip)
			else this.names.set(rename.strip, rename.name)
			if (old !== this.names.get(rename.strip)) {
				this.#pending.names = true
				this.#flushSoon()
			}
			return
		}

		const param = paramForMessage(m.recipient, m.parameter)
		if (param !== undefined && m.data.length === 4) {
			const channel = Strip.toInput(m.data[0])
			if (channel !== null) this.#store(param, channel, param.fromWire(m.data.readUInt16LE(2)))
		}
	}

	/** The desk's whole state: names, and processing values where their place is known */
	#readState(state: Buffer): void {
		const names = namesFromState(state)
		if (names === null) {
			this.#log('warn', "A&H remote link: the desk's state isn't laid out as expected, so channel names can't be read")
		} else {
			this.names.clear()
			for (const [strip, name] of names) this.names.set(strip, name)
			this.#pending.names = true
		}

		const first = channelRecordsStart(state)
		if (first >= 0) {
			for (const param of Object.values(AHParams)) {
				if (param.state === undefined) continue
				if (param.state.absolute === true && state.length !== KnownStateLength) continue
				for (let channel = 1; channel <= 48; channel++) {
					const wire = readStateValue(state, param, first, Strip.input(channel))
					if (wire === undefined) continue
					const value = param.fromWire(wire)
					// Outside the range means the state isn't laid out as captured (other firmware): leave it unknown
					if (value < param.min || value > param.max) continue
					this.#store(param, channel, value)
				}
			}
		}
		this.#flushSoon()
	}

	#store(param: AHParam, channel: number, value: number): void {
		const key: ValueKey = `${param.id}.${channel}`
		if (this.#values.get(key) === value) return
		this.#values.set(key, value)
		this.#pending.params.add(param.id)
		this.#flushSoon()
	}

	#flushSoon(): void {
		if (this.#batch !== undefined) return
		this.#batch = setTimeout(() => {
			this.#batch = undefined
			const what = this.#pending
			this.#pending = { names: false, selection: false, params: new Set() }
			if (what.names || what.selection || what.params.size > 0) this.emit('changed', what)
		}, BatchMs)
	}
}

/** A parameter's raw value for a strip from the desk's state, if it's there */
function readStateValue(state: Buffer, param: AHParam, first: number, strip: number): number | undefined {
	const place = param.state
	if (place === undefined) return undefined
	const at = place.absolute === true ? place.offset + strip * 336 : stripRecordOffset(first, strip) + place.offset
	if (at < 0 || at + place.bytes > state.length) return undefined
	const raw = place.bytes === 2 ? state.readUInt16LE(at) : state[at]
	return place.bit === undefined ? raw : (raw >> place.bit) & 1
}
