import { type DropdownChoice, type JsonValue, Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { type FaderLaw, RetrieveStatusAtStartup } from './mixer/mixer.js'
import { DefaultModel, getCommonCount, type ModelId } from './mixer/models.js'
import type { Branded } from './utils/brand.js'
import { type OneIndexed, oneIndexedNumber, type ZeroIndexed, zeroIndexedNumber } from './utils/indexed.js'

const FaderLawOptionId = 'faderLaw'
const TalkbackChannelOptionId = 'talkbackChannel'
const MidiChannelOptionId = 'midiChannel'
const RetrieveStatusOptionId = 'retrieveStatusAtStartup'
/** Whether to connect to the desk's A&H remote port (51326) too */
const AHLinkOptionId = 'ahLink'
/** Whether actions may change things over the A&H remote port */
const AHControlOptionId = 'ahControl'
/** How many Grid slots (channel + mix pairs) there are */
const GridSlotsOptionId = 'gridSlots'

/** The default and limits for the number of Grid slots */
const DefaultGridSlots = 8
export const MaxGridSlots = 32

/**
 * The connection fields the 'Set connection settings' action can change.
 * Each has a hidden `<field>_set` flag (the action has set it) and a
 * `<field>_changeBack` tick (hand it back to the connection page).
 */
const ConnectionFieldIds = [
	'host',
	'model',
	FaderLawOptionId,
	TalkbackChannelOptionId,
	MidiChannelOptionId,
	RetrieveStatusOptionId,
	'verbose',
	AHLinkOptionId,
	AHControlOptionId,
	GridSlotsOptionId,
] as const

/** A connection field the 'Set connection settings' action can change */
export type ConnectionFieldId = (typeof ConnectionFieldIds)[number]

/** Every connection field the 'Set connection settings' action can change */
export function connectionFieldIds(): readonly ConnectionFieldId[] {
	return ConnectionFieldIds
}

type SetId<F extends ConnectionFieldId> = `${F}_set`
type ChangeBackId<F extends ConnectionFieldId> = `${F}_changeBack`

/** The id of a field's hidden "set by an action" flag */
function setId<F extends ConnectionFieldId>(field: F): SetId<F> {
	return `${field}_set`
}

/** The id of a field's "Change back" tick */
function changeBackId<F extends ConnectionFieldId>(field: F): ChangeBackId<F> {
	return `${field}_changeBack`
}

/** The "set by an action" flags and "Change back" ticks */
type ActionFlags = { [F in ConnectionFieldId as SetId<F>]: boolean } & {
	[F in ConnectionFieldId as ChangeBackId<F>]: boolean
}

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

	/** Connect to the A&H remote port (51326) for names, selection and processing */
	[AHLinkOptionId]: boolean

	/** Let actions change processing over the A&H remote port */
	[AHControlOptionId]: boolean

	/** How many Grid slots there are */
	[GridSlotsOptionId]: number

	/**
	 * Values typed on the connection page, put aside while the 'Set
	 * connection settings' action has those fields (JSON, field id -> value),
	 * to put back on Change back.  Absent if there are none.
	 */
	[ActionSavedId]?: string

	/** The Grid slots (JSON), kept by the module, not shown on the connection page */
	gridSlotState?: string
} & ActionFlags

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

/** Whether to connect to the A&H remote port (51326) too. */
export function getAHLink(config: SQConfig): boolean {
	return config[AHLinkOptionId]
}

/** Whether actions may change things over the A&H remote port. */
export function getAHControl(config: SQConfig): boolean {
	return config[AHControlOptionId]
}

/** How many Grid slots there are (1 to 32). */
export function getGridSlots(config: SQConfig): number {
	const n = config[GridSlotsOptionId]
	return Number.isInteger(n) && 1 <= n && n <= MaxGridSlots ? n : DefaultGridSlots
}

/** A switch that defaults to on: anything but `false` is on */
const toDefaultOn = (v: unknown): boolean => v !== false

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
	config[AHLinkOptionId] = toDefaultOn(config[AHLinkOptionId])
	config[AHControlOptionId] = toDefaultOn(config[AHControlOptionId])
	config[GridSlotsOptionId] =
		config[GridSlotsOptionId] === undefined ? DefaultGridSlots : Number(config[GridSlotsOptionId])
	for (const field of ConnectionFieldIds) {
		config[setId(field)] = config[setId(field)] === true
		config[changeBackId(field)] = config[changeBackId(field)] === true
	}
	if (typeof config[ActionSavedId] !== 'string') {
		delete config[ActionSavedId]
	}
	if (typeof config.gridSlotState !== 'string') {
		delete config.gridSlotState
	}
}

/**
 * Connections saved before the new 'Set connection settings' pattern had a
 * "Can be set by the action" tick per field (`<field>_byAction`).  A ticked
 * field becomes one the action has set (so it keeps its value, and what was
 * typed before is still put aside for Change back); the ticks go.
 */
export function tryMoveByActionTicksToSetFlags(config: RawConfig): boolean {
	let changed = false
	for (const key of Object.keys(config)) {
		const match = /^(.+)_byAction$/.exec(key)
		if (match === null) continue
		if (config[key] === true) config[`${match[1]}_set`] = true
		delete config[key]
		changed = true
	}
	return changed
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

/** Labels for the connection fields, as on the connection page (upstream's, where upstream has the field) */
export const ConnectionFieldLabels: Record<ConnectionFieldId, string> = {
	host: 'Target IP',
	model: 'Console Type',
	[FaderLawOptionId]: 'NRPN Fader Law',
	[TalkbackChannelOptionId]: 'Default talkback input channel',
	[MidiChannelOptionId]: 'MIDI channel',
	[RetrieveStatusOptionId]: 'Retrieve console status',
	verbose: 'Enable Verbose Logging',
	[AHLinkOptionId]: 'A&H remote link (port 51326)',
	[AHControlOptionId]: 'Allow changes over the A&H remote link',
	[GridSlotsOptionId]: 'Grid slots',
}

const ChangeBackTip =
	"Set by a 'Set connection settings' action. Tick it and Save to go back to the value typed here before."

/** Whether the 'Set connection settings' action has set a connection field */
function isSetByAction(config: SQConfig, field: ConnectionFieldId): boolean {
	return config[setId(field)]
}

function choiceLabel<T extends string | number>(choices: DropdownChoice<T>[], id: unknown): string {
	return choices.find((choice) => choice.id === id)?.label ?? String(id)
}

/** A connection field's current value, as shown while an action has set it */
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
		case AHLinkOptionId:
			return getAHLink(config) ? 'on' : 'off'
		case AHControlOptionId:
			return getAHControl(config) ? 'on' : 'off'
		case GridSlotsOptionId:
			return String(getGridSlots(config))
	}
}

/**
 * A connection field.  Once a 'Set connection settings' action has set it,
 * the field is hidden and a line shows its value instead, with a Change back
 * tick beside it.  The hidden `<field>_set` flag remembers which fields the
 * action has set.
 */
function lockable(
	config: SQConfig,
	field: SomeCompanionConfigField & { id: ConnectionFieldId },
): SomeCompanionConfigField[] {
	const set = setId(field.id)
	return [
		{
			...field,
			isVisibleExpression:
				field.isVisibleExpression === undefined
					? `!$(options:${set})`
					: `(${field.isVisibleExpression}) && !$(options:${set})`,
		},
		{
			type: 'static-text',
			id: `${field.id}_locked`,
			label: field.label,
			width: 9,
			value: `${shownValue(config, field.id)} <i>(set by an action)</i>`,
			isVisibleExpression: `$(options:${set})`,
		},
		{
			type: 'checkbox',
			id: changeBackId(field.id),
			label: 'Change back',
			width: 3,
			default: false,
			disableAutoExpression: true,
			tooltip: ChangeBackTip,
			isVisibleExpression: `$(options:${set})`,
		},
		{
			type: 'checkbox',
			id: set,
			label: 'Set by an action',
			width: 3,
			default: false,
			disableAutoExpression: true,
			isVisibleExpression: 'false',
		},
	]
}

/**
 * Get SQ module configuration fields.
 *
 * @param config
 *   The connection's current config, for showing the values of fields set by
 *   the 'Set connection settings' action.
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
				'<br>Want a button, a trigger or a variable to change a setting? Use the <b>Set connection settings</b> action. Anything it sets shows up here with a <b>Change back</b> tick.',
		},
		{
			type: 'static-text',
			id: 'ports',
			width: 12,
			label: 'Ports',
			value:
				'TCP 51325 (MIDI over TCP/IP, fixed by the desk). With the A&H remote link on, TCP 51326 as well (the port SQ MixPad uses).',
		},
		...lockable(config, {
			type: 'textinput',
			id: 'host',
			label: ConnectionFieldLabels.host,
			width: 9,
			tooltip: "The desk's IP address. Companion needs to be on the same network.",
			default: '192.168.0.5',
			regex: Regex.IP,
		}),
		...lockable(config, {
			type: 'dropdown',
			id: 'model',
			label: ConnectionFieldLabels.model,
			width: 9,
			tooltip: 'The SQ model, so the lists show the right channels and mixes.',
			default: DefaultModel,
			choices: ModelChoices,
		}),
		...lockable(config, {
			type: 'dropdown',
			id: FaderLawOptionId,
			label: ConnectionFieldLabels[FaderLawOptionId],
			width: 9,
			tooltip: "Must match the NRPN fader law in the desk's MIDI settings, or every level will be wrong.",
			default: 'LinearTaper',
			choices: FaderLawChoices,
		}),
		...lockable(config, {
			...createDefaultTalkbackChannelOption(),
			id: TalkbackChannelOptionId,
			width: 9,
		}),
		...lockable(config, {
			type: 'number',
			id: MidiChannelOptionId,
			label: ConnectionFieldLabels[MidiChannelOptionId],
			width: 9,
			tooltip: 'Must match the MIDI channel set on the desk (1 to 16).',
			min: 1,
			max: 16,
			default: 1,
		}),
		...lockable(config, {
			type: 'dropdown',
			id: RetrieveStatusOptionId,
			label: ConnectionFieldLabels[RetrieveStatusOptionId],
			width: 9,
			tooltip:
				'When to ask the desk for its mutes, levels and so on. Fully: all of it on connecting. Delayed: after a short wait, spread over a few seconds. Not at startup: each one as it is needed.',
			default: 'full',
			choices: RetrieveStatusChoices,
		}),
		...lockable(config, {
			type: 'checkbox',
			id: 'verbose',
			label: ConnectionFieldLabels.verbose,
			width: 9,
			tooltip: 'Writes extra detail to the log.',
			default: false,
		}),
		...lockable(config, {
			type: 'checkbox',
			id: AHLinkOptionId,
			label: ConnectionFieldLabels[AHLinkOptionId],
			width: 9,
			tooltip:
				"Also connects to TCP port 51326, the port SQ MixPad uses, for channel names, the selected channel and channel processing (preamp, HPF, gate, compressor, EQ, delay, insert, PAFL). Allen & Heath don't document this port. Everything on MIDI keeps working without it.",
			default: true,
			disableAutoExpression: true,
		}),
		...lockable(config, {
			type: 'checkbox',
			id: AHControlOptionId,
			label: ConnectionFieldLabels[AHControlOptionId],
			width: 9,
			tooltip:
				'Lets actions change preamp, HPF, gate, compressor, EQ, delay, insert and PAFL over the A&H remote link. Off = names, selection and values are read only.',
			default: true,
			isVisibleExpression: `$(options:${AHLinkOptionId})`,
		}),
		...lockable(config, {
			type: 'number',
			id: GridSlotsOptionId,
			label: ConnectionFieldLabels[GridSlotsOptionId],
			width: 9,
			tooltip: `How many Grid slots (a channel and a mix each, set by the Grid presets) to provide, 1 to ${MaxGridSlots}.`,
			min: 1,
			max: MaxGridSlots,
			default: DefaultGridSlots,
		}),
		{
			type: 'static-text',
			id: 'crew',
			width: 12,
			label: "Psst. This one's got mates. 🍹",
			value:
				'SQ Rebel is part of a little crew of Companion modules: some brand new, some old favourites given a good tweak. Want to know who else is in the crew, or grab the freshest version of each one? It\'s all here: <a href="https://github.com/nisted/companion-modules" target="_blank">https://github.com/nisted/companion-modules</a>',
		},
	]
}

/** The values put aside while the action has fields */
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

function storeSaved(config: SQConfig, saved: Partial<Record<ConnectionFieldId, JsonValue>>): void {
	if (Object.keys(saved).length > 0) {
		config[ActionSavedId] = JSON.stringify(saved)
	} else {
		delete config[ActionSavedId]
	}
}

/**
 * Apply a config just saved from the connection page, given the config in
 * use until now.  Rewrites `newConfig`:
 *
 *   * a field the action has set, with Change back ticked: the value typed
 *     before the action took it comes back, and the field is the page's again
 *   * a field the action has set, without Change back: the page can't change
 *     it (it keeps the action's value)
 *   * any other field: as typed
 *
 * Change back ticks are always cleared.
 *
 * @returns whether `newConfig` now differs from what came in (so it must be saved back)
 */
export function applyConnectionPage(oldConfig: SQConfig, newConfig: SQConfig): boolean {
	const before = JSON.stringify(newConfig)
	const saved = savedValues(oldConfig)
	const config = newConfig as RawConfig

	// Kept by the module, not typed on the page: carry it over
	if (oldConfig.gridSlotState !== undefined) {
		config.gridSlotState = oldConfig.gridSlotState
	}

	for (const field of ConnectionFieldIds) {
		const owned = isSetByAction(oldConfig, field)
		if (owned && newConfig[changeBackId(field)]) {
			if (field in saved) {
				config[field] = saved[field]
			}
			delete saved[field]
			config[setId(field)] = false
		} else if (owned) {
			config[field] = oldConfig[field]
			config[setId(field)] = true
		} else {
			config[setId(field)] = false
		}
		config[changeBackId(field)] = false
	}

	storeSaved(newConfig, saved)
	validateConfig(config)
	return JSON.stringify(newConfig) !== before
}

/**
 * Apply values from the 'Set connection settings' action to a copy of
 * `config`.  Blank values leave a field alone; a value that doesn't fit the
 * field is skipped and reported through `warn`.  The first time the action
 * sets a field, what was typed on the page is put aside for Change back.
 *
 * @returns the new config, or null if nothing changed
 */
export function applyActionSettings(
	config: SQConfig,
	values: Partial<Record<ConnectionFieldId, string>>,
	warn: (message: string) => void,
): SQConfig | null {
	const next: RawConfig = { ...config }
	const saved = savedValues(config)
	let changed = false

	for (const field of ConnectionFieldIds) {
		const text = (values[field] ?? '').trim()
		if (text === '') continue

		const parsed = parseConnectionSetting(field, text)
		if (!parsed.ok) {
			warn(
				`Set connection settings: "${ConnectionFieldLabels[field]}" ${parsed.why}, and "${text}" isn't. Left it as it was.`,
			)
			continue
		}

		if (next[setId(field)] !== true) {
			saved[field] = config[field]
			next[setId(field)] = true
			changed = true
		}
		if (JSON.stringify(next[field]) !== JSON.stringify(parsed.value)) {
			next[field] = parsed.value
			changed = true
		}
	}

	if (!changed) return null
	validateConfig(next)
	storeSaved(next, saved)
	return next
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
		case 'verbose':
		case AHLinkOptionId:
		case AHControlOptionId: {
			const lower = text.toLowerCase()
			if (['true', 'on', 'yes', '1'].includes(lower)) return { ok: true, value: true }
			if (['false', 'off', 'no', '0'].includes(lower)) return { ok: true, value: false }
			return { ok: false, why: 'needs on or off (true/false, yes/no and 1/0 work too)' }
		}
		case GridSlotsOptionId: {
			const n = Number(text)
			return Number.isInteger(n) && 1 <= n && n <= MaxGridSlots
				? { ok: true, value: n }
				: { ok: false, why: `needs a whole number from 1 to ${MaxGridSlots}` }
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
		case AHLinkOptionId:
		case AHControlOptionId:
			return 'on or off.'
		case GridSlotsOptionId:
			return `1 to ${MaxGridSlots}.`
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
	const config: RawConfig = {
		host: '',
		model: DefaultModel,
		faderLaw: 'LinearTaper',
		talkbackChannel: 0,
		midiChannel: oneIndexedNumber(1),
		retrieveStatusAtStartup: RetrieveStatusAtStartup.Fully,
		verbose: false,
		[AHLinkOptionId]: true,
		[AHControlOptionId]: true,
		[GridSlotsOptionId]: DefaultGridSlots,
	}
	validateConfig(config)
	return config
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

	// The A&H remote link is started with the mixer connection, and the number
	// of Grid slots changes the variable, action and preset definitions.
	if (oldConfig[AHLinkOptionId] !== newConfig[AHLinkOptionId]) {
		return false
	}
	if (oldConfig[GridSlotsOptionId] !== newConfig[GridSlotsOptionId]) {
		return false
	}

	// Allowing changes over the A&H remote link is checked as each action
	// runs, so it needs no restart.

	// Otherwise we can update options without restarting.
	return true
}
