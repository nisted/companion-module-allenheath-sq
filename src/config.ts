import { type DropdownChoice, type JsonValue, Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { type FaderLaw, RetrieveStatusAtStartup } from './mixer/mixer.js'
import { DefaultModel, getCommonCount, type ModelId } from './mixer/models.js'
import type { Branded } from './utils/brand.js'
import { type OneIndexed, oneIndexedNumber, type ZeroIndexed, zeroIndexedNumber } from './utils/indexed.js'

const FaderLawOptionId = 'faderLaw'
const TalkbackChannelOptionId = 'talkbackChannel'
const MidiChannelOptionId = 'midiChannel'
const RetrieveStatusOptionId = 'retrieveStatusAtStartup'

/**
 * The connection fields that can be handed over to the 'Connection: set
 * settings' action, with a "Can be set by the action" tick each.
 */
const ConnectionFieldIds = [
	'host',
	'model',
	FaderLawOptionId,
	TalkbackChannelOptionId,
	MidiChannelOptionId,
	RetrieveStatusOptionId,
	'verbose',
] as const

/** A connection field that can be handed over to the 'Connection: set settings' action */
export type ConnectionFieldId = (typeof ConnectionFieldIds)[number]

type ByActionId<F extends ConnectionFieldId> = `${F}_byAction`

/** The id of a field's "Can be set by the action" tick */
function byActionId<F extends ConnectionFieldId>(field: F): ByActionId<F> {
	return `${field}_byAction`
}

/** The "Can be set by the action" ticks: true while the action has the field */
type ByActionTicks = { [F in ConnectionFieldId as ByActionId<F>]: boolean }

const ActionSavedId = 'actionSaved'

/**
 * A less-typed config type suitable for use where a representation less
 * constrained than the actual config type is being worked with -- for example
 * in upgrade scripts and similar contexts.
 */
export type RawConfig = Record<string, unknown>

/** All mixer config options. */
export type SQConfig = {
	// Before the 2.0 module API, nothing ensures that Companion config objects
	// conform to the module `TConfig` type.  Therefore we code accesses
	// extra-defensively in order to deal with wrongly-typed values sneaking in:
	//
	//  * We pass a `SQConfig` received from Companion through `validateConfig`,
	//   which will field-by-field massage an `SQConfig` whose actual value is
	//   potentially not consistent with the `SQConfig` type into true
	//   type-correctness.
	//  * We use accessor `get*` functions, operating on `SQConfig`, to return
	//   well-typed//and validated* values for each configuration option.
	//
	// To illustrate, consider the `host` field.  The user should specify a
	// valid hostname (presently only an IPv4 address), but Companion doesn't
	// enforce this.  At the `validateConfig` step we pass that field through
	// the `toHost` function, which rewrites it only into a `string`, consistent
	// with what Companion's `"textinput"` config field will pass us.  Then when
	// the module wants to know the user's specified host -- and its actual
	// validity as a hostname -- we use `getHost` passing the full `SQConfig`,
	// which will take the now guaranteed `string` field, test whether it's a
	// valid hostname, and return a branded `Host` value for it -- or the empty
	// string if the field doesn't contain a valid hostname.

	/**
	 * The TCP/IP hostname of the mixer, or the empty string if no hostname was
	 * validly specified.
	 */
	host: string

	/** The model of the mixer. */
	model: string

	/** The fader law specified in the mixer. */
	[FaderLawOptionId]: string

	/**
	 * The channel used for talkback (zero-indexed rather than 1-indexed as it
	 * appears in UI).
	 */
	[TalkbackChannelOptionId]: number

	/** The MIDI channel (1-16) used to communicate with the mixer. */
	[MidiChannelOptionId]: number

	/**
	 * How the mixer status (signal levels, etc.) should be retrieved at
	 * startup.
	 */
	[RetrieveStatusOptionId]: string

	/**
	 * Log a whole bunch of extra information about ongoing operation if verbose
	 * logging is enabled.
	 */
	verbose: boolean

	/**
	 * Values typed on the connection page, put aside while their fields are
	 * handed over to the 'Connection: set settings' action (JSON, field id ->
	 * value), to put back when they're handed back.  Absent if there are none.
	 */
	[ActionSavedId]?: string
} & ByActionTicks

/** All mixer secrets. */
export type SQSecrets = undefined

const ipRegExp = new RegExp(Regex.IP.slice(1, -1))

/** A valid hostname as well-formed IP address. */
export type Host = Branded<string, 'config-host-valid-ip'>

function isValidHost(str: string): str is Host {
	return ipRegExp.test(str)
}

// eslint-disable-next-line @typescript-eslint/no-base-to-string
const toHost = (v: unknown) => (v === undefined ? '' : String(v))

/**
 * Get either a valid hostname from configuration, or the empty string if a
 * valid hostname wasn't configured.
 */
export function getHost(config: SQConfig): Host | '' {
	const str = config.host
	if (isValidHost(str)) {
		return str
	}
	return ''
}

const toModelId = String

/** Get the configured model ID. */
export function getModelId(config: SQConfig): ModelId {
	const modelStr = String(config.model)
	switch (modelStr) {
		case 'SQ5':
		case 'SQ6':
		case 'SQ7':
			return modelStr
		default:
			return DefaultModel
	}
}

const toFaderLaw = (v: unknown): FaderLaw => String(v) as FaderLaw

/** Get the configured fader law. */
export function getFaderLaw(config: SQConfig): FaderLaw {
	const law = config[FaderLawOptionId]
	switch (law) {
		case 'LinearTaper':
		case 'AudioTaper':
			return law
		default:
			return 'LinearTaper'
	}
}

// This is encoded in zero-indexed form, i.e. input channel 1 is encoded as 0.
// If the option is missing, interpreting as 0 entails interpreting as input
// channel 1.
const toTalkbackChannel = toNumberDefaultZero

/** Get the talkback channel specified by the user as config option. */
export function getTalkbackChannel(config: SQConfig): ZeroIndexed {
	return zeroIndexedNumber(config[TalkbackChannelOptionId])
}

// It's intentional, to comport with past behavior (and with the default MIDI
// channel on SQ mixers), that MIDI Channel 1 is the default for values not
// 1-16, including if the option is absent.
const toMidiChannel = toNumberDefaultZero

/**
 * Get the (one-indexed, i.e. 1 through 16 inclusive) MIDI channel used to
 * communicate with the mixer.
 */
export function getMidiChannel(config: SQConfig): OneIndexed {
	const n = config[MidiChannelOptionId]
	return oneIndexedNumber(1 <= n && n <= 16 && (n | 0) === n ? n : 1)
}

const toRetrieveStatusAtStartup = String

/**
 * Get the status-retrieval value used to determine how to retrieve mixer state
 * at module startup.
 */
export function getRetrieveStatusAtStartup(config: SQConfig): RetrieveStatusAtStartup {
	const retrieveStatus = String(config[RetrieveStatusOptionId])
	switch (retrieveStatus) {
		case 'delay':
		case 'nosts':
		case 'full':
			return retrieveStatus
		default:
			return RetrieveStatusAtStartup.Fully
	}
}

const toVerbose = Boolean

/** Get whether verbose logging is enabled. */
export const getVerbose = Boolean

/**
 * Force `config` into type-conformance (but not necessarily semantic validity)
 * with `SQConfig`.  (The individual accessor functions must be used to get
 * semantic validity.)
 */
export function validateConfig(config: RawConfig): asserts config is SQConfig {
	config.host = toHost(config.host)
	config.model = toModelId(config.model)
	config.faderLaw = toFaderLaw(config.faderLaw)
	config.talkbackChannel = toTalkbackChannel(config.talkbackChannel)
	config.midiChannel = toMidiChannel(config.midiChannel)
	config.retrieveStatusAtStartup = toRetrieveStatusAtStartup(config.retrieveStatusAtStartup)
	config.verbose = toVerbose(config.verbose)
	for (const field of ConnectionFieldIds) {
		const tick = byActionId(field)
		config[tick] = config[tick] === true
	}
	if (typeof config[ActionSavedId] !== 'string') {
		delete config[ActionSavedId]
	}
}

/** Ensure a 'model' property is present in configs that lack it. */
export function tryEnsureModelOptionInConfig(oldConfig: RawConfig): boolean {
	if (!('model' in oldConfig)) {
		oldConfig.model = DefaultModel
		return true
	}
	return false
}

/** The default label for a connection from `companion/manifest.json`. */
const DefaultConnectionLabel = 'SQ'

/**
 * Ensure a 'label' property containing a connection label is present in configs
 * that lack it.
 */
export function tryEnsureLabelInConfig(oldConfig: RawConfig): boolean {
	if (!('label' in oldConfig)) {
		oldConfig.label = DefaultConnectionLabel
		return true
	}
	return false
}

/**
 * This module used to have a `'label'` option (regrettably see the function
 * above), in which the user was expected to (re-)specify the instance label.
 * This label was then used in the "Learn" operation for various actions, as
 * well as in various preset definitions.
 *
 * But it turns out the instance label is accessible as `InstanceBase.label`
 * which is always up-to-date, so there's no point in having the config option.
 *
 * This function detects and, if present, removes the `'label'` option from
 * configs that have it.
 */
export function tryRemoveUnnecessaryLabelInConfig(oldConfig: RawConfig): boolean {
	if ('label' in oldConfig) {
		delete oldConfig.label
		return true
	}
	return false
}

// `newId` could be `keyof SQConfig`, but then this couldn't be used for a
// very-old upgrade script that upgraded to a new option, that itself was
// subsequently moved or deleted.  So `string` is the best we can do.
function moveId(config: RawConfig, oldId: string, newId: string): void {
	const value = config[oldId]
	delete config[oldId]
	config[newId] = value
}

/** Choices for the talkback channel: `CH n`, encoded zero-indexed. */
function talkbackChannelChoices(): DropdownChoice<number>[] {
	// The number of input channels depends on how many input channels the
	// user's chosen SQ model has.  Currently all SQs have the same number of
	// input channels, so use that count.
	const inputChannelCount = getCommonCount('chCount')

	const DefaultTalkbackInputChannelChoices: DropdownChoice<number>[] = []
	for (let i = 0; i < inputChannelCount; i++) {
		DefaultTalkbackInputChannelChoices.push({ label: `CH ${i + 1}`, id: i })
	}
	return DefaultTalkbackInputChannelChoices
}

const ModelChoices: DropdownChoice<ModelId>[] = [
	{ id: 'SQ5', label: 'SQ 5' },
	{ id: 'SQ6', label: 'SQ 6' },
	{ id: 'SQ7', label: 'SQ 7' },
]

const FaderLawChoices: DropdownChoice<FaderLaw>[] = [
	{ id: 'LinearTaper', label: 'Linear Taper' },
	{ id: 'AudioTaper', label: 'Audio Taper' },
]

const RetrieveStatusChoices: DropdownChoice<RetrieveStatusAtStartup>[] = [
	{ id: 'full', label: 'Fully at startup' },
	{ id: 'delay', label: 'Delayed at startup' },
	{ id: 'nosts', label: 'Not at startup' },
]

function createDefaultTalkbackChannelOption(): SomeCompanionConfigField {
	return {
		type: 'dropdown',
		label: 'Default talkback input channel',
		id: TalkbackChannelOptionId,
		width: 6,
		tooltip: 'The input your talkback mic is plugged into. The talkback presets use this one.',
		default: 0,
		choices: talkbackChannelChoices(),
		minChoicesForSearch: 0,
	}
}

export function tryRenameVariousConfigIds(config: RawConfig): boolean {
	if ('level' in config) {
		moveId(config, 'level', FaderLawOptionId)
		moveId(config, 'talkback', TalkbackChannelOptionId)
		moveId(config, 'midich', MidiChannelOptionId)
		moveId(config, 'status', RetrieveStatusOptionId)
		return true
	}
	return false
}

/** Labels for the connection fields, as on the connection page */
export const ConnectionFieldLabels: Record<ConnectionFieldId, string> = {
	host: 'Target IP',
	model: 'Console type',
	[FaderLawOptionId]: 'NRPN fader law',
	[TalkbackChannelOptionId]: 'Default talkback input channel',
	[MidiChannelOptionId]: 'MIDI channel',
	[RetrieveStatusOptionId]: 'Retrieve console status',
	verbose: 'Verbose logging',
}

const ByActionTip =
	"Hands this field over to the 'Connection: set settings' action, so a button or a trigger can change it (from a variable, say). " +
	"While it's ticked the field's locked here and shows what the action last set. Untick it and you get back what you'd typed before."

/** Whether a connection field is ticked "Can be set by the action" */
function isTicked(config: SQConfig, field: ConnectionFieldId): boolean {
	return config[byActionId(field)]
}

/** The connection fields ticked "Can be set by the action" */
export function tickedConnectionFields(config: SQConfig): ConnectionFieldId[] {
	return ConnectionFieldIds.filter((field) => isTicked(config, field))
}

function choiceLabel<T extends string | number>(choices: DropdownChoice<T>[], id: unknown): string {
	return choices.find((choice) => choice.id === id)?.label ?? String(id)
}

/** A connection field's current value, as shown while it's locked */
function shownValue(config: SQConfig, field: ConnectionFieldId): string {
	switch (field) {
		case 'host':
			return config.host === '' ? 'blank' : config.host
		case 'model':
			return choiceLabel(ModelChoices, getModelId(config))
		case FaderLawOptionId:
			return choiceLabel(FaderLawChoices, getFaderLaw(config))
		case TalkbackChannelOptionId:
			return `CH ${getTalkbackChannel(config) + 1}`
		case MidiChannelOptionId:
			return String(getMidiChannel(config))
		case RetrieveStatusOptionId:
			return choiceLabel(RetrieveStatusChoices, getRetrieveStatusAtStartup(config))
		case 'verbose':
			return config.verbose ? 'on' : 'off'
	}
}

/**
 * A connection field, plus its "Can be set by the action" tick and the line
 * that shows its value while it's ticked (and the field is hidden).
 */
function lockable(
	config: SQConfig,
	field: SomeCompanionConfigField & { id: ConnectionFieldId },
): SomeCompanionConfigField[] {
	const tick = byActionId(field.id)
	return [
		{ ...field, width: 8, isVisibleExpression: `!$(options:${tick})` },
		{
			type: 'static-text',
			id: `${field.id}_locked`,
			label: field.label,
			width: 8,
			value: `Set by the 'Connection: set settings' action: ${shownValue(config, field.id)}`,
			isVisibleExpression: `$(options:${tick})`,
		},
		{
			type: 'checkbox',
			id: tick,
			label: 'Can be set by the action',
			width: 4,
			default: false,
			disableAutoExpression: true,
			tooltip: ByActionTip,
		},
	]
}

/**
 * Get SQ module configuration fields.
 *
 * @param config
 *   The connection's current config, for showing the values of fields handed
 *   over to the 'Connection: set settings' action.
 */
export function GetConfigFields(config: SQConfig): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Hello there',
			value:
				"This one talks to Allen & Heath SQ series mixing desks (SQ5, SQ6 and SQ7). Fill in the bits below and we're off." +
				'<br>Want a button, a trigger or a variable to change one of these settings? Tick <b>Can be set by the action</b> next to it, then use the <b>Connection: set settings</b> action.',
		},
		...lockable(config, {
			type: 'textinput',
			id: 'host',
			label: ConnectionFieldLabels.host,
			width: 6,
			tooltip:
				'Where the desk lives on the network. Its IP address, basically. It needs to be on the same network as Companion.',
			default: '192.168.0.5',
			regex: Regex.IP,
		}),
		...lockable(config, {
			type: 'dropdown',
			id: 'model',
			label: ConnectionFieldLabels.model,
			width: 6,
			tooltip: "Which SQ you've got, so the lists show the right channels, mixes and so on.",
			default: DefaultModel,
			choices: ModelChoices,
		}),
		...lockable(config, {
			type: 'dropdown',
			id: FaderLawOptionId,
			label: ConnectionFieldLabels[FaderLawOptionId],
			width: 6,
			tooltip:
				"Must match the fader law in the desk's MIDI settings. Important: get it wrong and every level will be off.",
			default: 'LinearTaper',
			choices: FaderLawChoices,
		}),
		...lockable(config, {
			...createDefaultTalkbackChannelOption(),
			id: TalkbackChannelOptionId,
		}),
		...lockable(config, {
			type: 'number',
			id: MidiChannelOptionId,
			label: ConnectionFieldLabels[MidiChannelOptionId],
			width: 6,
			tooltip:
				"Must match the MIDI channel set on the desk (1 to 16). Important: if they don't agree, nothing gets through.",
			min: 1,
			max: 16,
			default: 1,
		}),
		...lockable(config, {
			type: 'dropdown',
			id: RetrieveStatusOptionId,
			label: ConnectionFieldLabels[RetrieveStatusOptionId],
			width: 6,
			tooltip:
				'When I ask the desk for its mutes, levels and so on. Fully: the lot, straight away (keeps the desk busy longest). Delayed: a short wait, then spread over a few seconds. Not at startup: only as each thing is needed.',
			default: 'full',
			choices: RetrieveStatusChoices,
		}),
		...lockable(config, {
			type: 'checkbox',
			id: 'verbose',
			label: ConnectionFieldLabels.verbose,
			width: 12,
			tooltip: "Writes everything to the log. Chatty, but handy when something's being odd.",
			default: false,
		}),
		{
			type: 'static-text',
			id: 'crew',
			width: 12,
			label: "Psst. This one's got mates. 🍹",
			value:
				'This tweaked SQ module is part of a little crew of Companion modules: some brand new, some old favourites given a good tweak. Want to know who else is in the crew, or grab the freshest version of each one? It\'s all here: <a href="https://github.com/nisted/companion-modules" target="_blank">github.com/nisted/companion-modules</a>',
		},
	]
}

/** The values put aside while fields are handed over to the action */
function savedValues(config: SQConfig): Partial<Record<ConnectionFieldId, JsonValue>> {
	try {
		const parsed: unknown = JSON.parse(config[ActionSavedId] ?? '{}')
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {}
		}
		const saved: Partial<Record<ConnectionFieldId, JsonValue>> = {}
		for (const field of ConnectionFieldIds) {
			const value = (parsed as Record<string, JsonValue | undefined>)[field]
			if (value !== undefined) {
				saved[field] = value
			}
		}
		return saved
	} catch (_e) {
		return {}
	}
}

/**
 * Apply the "Can be set by the action" ticks to a config just saved from the
 * connection page, given the config in use until now.  Rewrites `newConfig`:
 *
 *   * a field just ticked: its value is put aside, to come back when unticked
 *   * a field still ticked: the connection page's value is ignored (only the
 *     action sets it now)
 *   * a field just unticked: the put-aside value comes back
 *
 * @returns
 *   `ticksChanged`: whether any tick changed (so the action's options must be
 *   redefined); `changed`: whether `newConfig` now differs from what came in
 *   (so it must be saved back).
 */
export function applyByActionTicks(
	oldConfig: SQConfig,
	newConfig: SQConfig,
): { ticksChanged: boolean; changed: boolean } {
	const before = JSON.stringify(newConfig)
	const saved = savedValues(oldConfig)
	const config = newConfig as RawConfig
	let ticksChanged = false

	for (const field of ConnectionFieldIds) {
		const was = isTicked(oldConfig, field)
		const now = isTicked(newConfig, field)
		if (!was && now) {
			saved[field] = newConfig[field]
			ticksChanged = true
		} else if (was && now) {
			config[field] = oldConfig[field]
		} else if (was && !now) {
			if (field in saved) {
				config[field] = saved[field]
			}
			delete saved[field]
			ticksChanged = true
		}
	}

	if (Object.keys(saved).length > 0) {
		newConfig[ActionSavedId] = JSON.stringify(saved)
	} else {
		delete newConfig[ActionSavedId]
	}

	validateConfig(config)
	return { ticksChanged, changed: JSON.stringify(newConfig) !== before }
}

type ParsedSetting = { ok: true; value: JsonValue } | { ok: false; why: string }

/** Match text against a list of choices by id or label, ignoring case and spaces */
function matchChoice<T extends string>(choices: DropdownChoice<T>[], text: string): T | undefined {
	const squash = (s: string) => s.replace(/\s+/g, '').toLowerCase()
	const wanted = squash(text)
	return choices.find((choice) => squash(choice.id) === wanted || squash(choice.label) === wanted)?.id
}

function choiceList<T extends string>(choices: DropdownChoice<T>[]): string {
	return choices.map((choice) => choice.id).join(', ')
}

/**
 * Check a value for a connection field given to the 'Connection: set
 * settings' action, and turn it into what the config holds.
 */
export function parseConnectionSetting(field: ConnectionFieldId, text: string): ParsedSetting {
	switch (field) {
		case 'host':
			return isValidHost(text) ? { ok: true, value: text } : { ok: false, why: 'needs an IP address, e.g. 192.168.0.5' }
		case 'model': {
			const model = matchChoice(ModelChoices, text)
			return model !== undefined
				? { ok: true, value: model }
				: { ok: false, why: `needs one of ${choiceList(ModelChoices)}` }
		}
		case FaderLawOptionId: {
			const law = matchChoice(FaderLawChoices, text)
			return law !== undefined
				? { ok: true, value: law }
				: { ok: false, why: `needs one of ${choiceList(FaderLawChoices)}` }
		}
		case TalkbackChannelOptionId: {
			const count = getCommonCount('chCount')
			const n = Number(text.replace(/^ch\s*/i, ''))
			return Number.isInteger(n) && 1 <= n && n <= count
				? { ok: true, value: n - 1 }
				: { ok: false, why: `needs an input channel from 1 to ${count}` }
		}
		case MidiChannelOptionId: {
			const n = Number(text)
			return Number.isInteger(n) && 1 <= n && n <= 16
				? { ok: true, value: n }
				: { ok: false, why: 'needs a MIDI channel from 1 to 16' }
		}
		case RetrieveStatusOptionId: {
			const retrieve = matchChoice(RetrieveStatusChoices, text)
			return retrieve !== undefined
				? { ok: true, value: retrieve }
				: { ok: false, why: `needs one of ${choiceList(RetrieveStatusChoices)}` }
		}
		case 'verbose': {
			const lower = text.toLowerCase()
			if (['true', 'on', 'yes', '1'].includes(lower)) return { ok: true, value: true }
			if (['false', 'off', 'no', '0'].includes(lower)) return { ok: true, value: false }
			return { ok: false, why: 'needs on or off (true/false, yes/no and 1/0 work too)' }
		}
	}
}

/** What each field takes, for the action's tooltips */
export function connectionSettingHint(field: ConnectionFieldId): string {
	switch (field) {
		case 'host':
			return 'An IP address, e.g. 192.168.0.5.'
		case 'model':
			return `${choiceList(ModelChoices)}.`
		case FaderLawOptionId:
			return `${choiceList(FaderLawChoices)}.`
		case TalkbackChannelOptionId:
			return `An input channel number, 1 to ${getCommonCount('chCount')}.`
		case MidiChannelOptionId:
			return '1 to 16.'
		case RetrieveStatusOptionId:
			return `${choiceList(RetrieveStatusChoices)}.`
		case 'verbose':
			return 'on or off.'
	}
}

function toNumberDefaultZero(v: unknown): number {
	if (v === undefined) {
		return 0
	}

	return Number(v)
}

/**
 * Instance config suitable for use at instance creation before initialization
 * with an actual config.
 */
export function noConnectionConfig(): SQConfig {
	return {
		host: '',
		model: DefaultModel,
		faderLaw: 'LinearTaper',
		talkbackChannel: 0,
		midiChannel: oneIndexedNumber(1),
		retrieveStatusAtStartup: RetrieveStatusAtStartup.Fully,
		verbose: false,
		host_byAction: false,
		model_byAction: false,
		faderLaw_byAction: false,
		talkbackChannel_byAction: false,
		midiChannel_byAction: false,
		retrieveStatusAtStartup_byAction: false,
		verbose_byAction: false,
	}
}

/**
 * For an already-started instance/connection using the given old config,
 * determine whether applying the new config to it requires restarting the
 * connection.
 */
export function canUpdateConfigWithoutRestarting(oldConfig: SQConfig, newConfig: SQConfig): boolean {
	// A different host straightforwardly requires a connection restart.
	if (oldConfig.host !== newConfig.host) {
		return false
	}

	// Changing mixer model alters choices used in options.  Choice generation
	// presently is tied to mixer connection restarting, so force a restart if
	// the model changes.
	if (oldConfig.model !== newConfig.model) {
		return false
	}

	// A different fader law changes the meaning of all level messages and can't
	// really be synced up with any messages presently in flight, so forces a
	// restart.
	if (oldConfig.faderLaw !== newConfig.faderLaw) {
		return false
	}

	// Talkback channel is only used in the talkback-controlling presets, which
	// will always reflect the latest talkback channel when added as Companion
	// buttons, so we don't need to restart for a change.

	// Changing MIDI channel could result in messages on old/new MIDI channel
	// being missed, so force a restart.
	if (oldConfig.midiChannel !== newConfig.midiChannel) {
		return false
	}

	// Once the mixer connection is started up, a change in status retrieval
	// option is irrelevant, so don't restart for such change.

	// Verbose logging can be flipped on and off live without restart -- and
	// you really want it to, because verbose logging of 26KB of startup status
	// retrieval is extremely slow (particularly if the instance debug log is
	// open.)

	// Otherwise we can update options without restarting.
	return true
}
