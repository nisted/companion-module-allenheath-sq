import type {
	CompanionMigrationAction,
	CompanionMigrationFeedback,
	CompanionMigrationOptionValues,
	ExpressionOrValue,
	JsonValue,
} from '@companion-module/base'
import {
	GridLevelActionId,
	GridPickupBandOptionId,
	GridPickupDwellOptionId,
	GridPickupReleaseBandOptionId,
	GridPickupReleaseTimeOptionId,
} from '../actions/schemas/grid-level.js'
import { LevelSetSinkOptionId, LevelSetSourceOptionId } from '../actions/schemas/level.js'
import { GridFeedbackId, GridFeedbackInputChannelOptionId, GridFeedbackMixOptionId } from '../feedbacks/schemas/grid.js'
import {
	DEFAULT_BAND,
	DEFAULT_DWELL_MS,
	DEFAULT_FLASH_MS,
	DEFAULT_RELEASE_BAND,
	DEFAULT_RELEASE_MS,
} from '../pickup.js'
import { LR } from '../types.js'
import type { OldCompanionMigrationAction, OldCompanionMigrationFeedback } from './types.js'

/*
 * Upgrades for the Grid additions (Nige's fork, 3.1.1-grid.N -> 4.0.0-rc1-grid.N).
 *
 * 3.1.1-grid.7 appended one upgrade script to v3.1.0's ten, so connections
 * that ran it are at upgrade index 10.  That's why the first script here sits
 * at index 10 in the list, ahead of 4.0's own one-indexing scripts (which then
 * still run for those connections), and why it is the same as grid.7's.
 */

/** The text-box option ids grid.7 used for the input channel and the mix */
const Grid7ChannelOptionId = 'channel'
const Grid7MixOptionId = 'mix'

const GridLevelActionIds: readonly string[] = Object.values(GridLevelActionId)
const GridFeedbackIds: readonly string[] = Object.values(GridFeedbackId)

/**
 * grid.7's upgrade, unchanged in effect: earlier Grid versions picked the
 * channel/mix from zero-based dropdowns ('input'/'assign', LR as 'lr'),
 * briefly with a "from text/variables" tick box.  Move them into grid.7's
 * 'channel'/'mix' text boxes.
 */
function tryMoveGridChannelMixToText(options: OldCompanionMigrationAction['options']): boolean {
	if (options[Grid7ChannelOptionId] !== undefined) return false
	if (options.useVars === true && options.inputVar !== undefined) {
		options[Grid7ChannelOptionId] = String(options.inputVar)
		options[Grid7MixOptionId] = String(options.mixVar ?? 'LR')
	} else {
		const input = Number(options.input ?? 0)
		const assign = options.assign
		options[Grid7ChannelOptionId] = String((Number.isInteger(input) ? input : 0) + 1)
		options[Grid7MixOptionId] = assign === 'lr' || assign === undefined ? 'LR' : String(Number(assign) + 1)
	}
	for (const k of ['useVars', 'inputVar', 'mixVar', 'input', 'assign']) delete options[k]
	return true
}

export function tryMoveGridActionChannelMixToText(action: OldCompanionMigrationAction): boolean {
	return GridLevelActionIds.includes(action.actionId) && tryMoveGridChannelMixToText(action.options)
}

export function tryMoveGridFeedbackChannelMixToText(feedback: OldCompanionMigrationFeedback): boolean {
	return GridFeedbackIds.includes(feedback.feedbackId) && tryMoveGridChannelMixToText(feedback.options)
}

/** A single variable reference, e.g. `$(custom:grid_ch)` */
const LoneVariable = /^\$\([^()]+\)$/

/**
 * Turn text that grid.7 read with variables parsed into an option value for a
 * 4.0 number or dropdown field: a literal stays a value; anything with a
 * variable in it becomes an expression that gives the same text.
 */
function textToValueOrExpression(
	text: string,
	literal: (text: string) => JsonValue,
): ExpressionOrValue<JsonValue | undefined> {
	if (text.includes('$(')) {
		if (LoneVariable.test(text)) {
			return { isExpression: true, value: text }
		}
		// Text and variables mixed: let Companion parse the variables, as
		// grid.7 did, and the module reads what comes out.
		return { isExpression: true, value: `parseVariables(${JSON.stringify(text)})` }
	}
	return { isExpression: false, value: literal(text) }
}

function optionAsText(options: CompanionMigrationOptionValues, id: string): string | undefined {
	const option = options[id]
	if (option === undefined) return undefined
	const { value } = option
	if (value === undefined || value === null) return ''
	return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** grid.7's channel text ("16", "CH 16", "$(custom:grid_ch)") as a one-indexed channel */
function channelFromText(text: string | undefined): ExpressionOrValue<JsonValue | undefined> {
	const trimmed = (text ?? '1').trim()
	return textToValueOrExpression(trimmed, (t) => {
		const n = Number(t.replace(/^ch\s*/i, ''))
		// Something that was never a channel stays as it was: it did nothing in
		// grid.7 and still does nothing (with a warning in the log).
		return t !== '' && Number.isInteger(n) ? n : t
	})
}

/** grid.7's mix text ("LR", "3", "Mix 3", "$(custom:grid_mix)") as `'LR'` or a one-indexed mix */
function mixFromText(text: string | undefined): ExpressionOrValue<JsonValue | undefined> {
	const trimmed = (text ?? LR).trim()
	return textToValueOrExpression(trimmed, (t) => {
		if (t.toUpperCase() === LR) return LR
		const n = Number(t.replace(/^(mix|aux)\s*/i, ''))
		return t !== '' && Number.isInteger(n) ? n : t
	})
}

/**
 * grid.7's number text boxes become number fields.  Blank or not a number
 * used the default in grid.7, so it gets the default now.
 */
function numberFromText(options: CompanionMigrationOptionValues, id: string, defaultValue: number): boolean {
	const text = optionAsText(options, id)
	if (text === undefined || options[id]?.isExpression === true) return false
	const trimmed = text.trim()
	options[id] = textToValueOrExpression(trimmed, (t) => {
		const n = Number(t)
		return t === '' || Number.isNaN(n) ? defaultValue : n
	})
	return true
}

/** Move grid.7's 'channel'/'mix' text boxes to the 4.0 number field and mix dropdown */
function moveChannelMix(options: CompanionMigrationOptionValues, channelId: string, mixId: string): void {
	const channel = channelFromText(optionAsText(options, Grid7ChannelOptionId))
	const mix = mixFromText(optionAsText(options, Grid7MixOptionId))
	delete options[Grid7ChannelOptionId]
	delete options[Grid7MixOptionId]
	options[channelId] = channel
	options[mixId] = mix
}

/**
 * Upgrade a grid.7 'Fader channel level to mix (from value/variable)' action
 * to 4.0's option shapes.
 */
export function tryUpgradeGridActionTo4(action: CompanionMigrationAction): boolean {
	if (!GridLevelActionIds.includes(action.actionId)) return false
	const options = action.options
	if (options[LevelSetSourceOptionId] !== undefined) return false

	moveChannelMix(options, LevelSetSourceOptionId, LevelSetSinkOptionId)
	numberFromText(options, GridPickupBandOptionId, DEFAULT_BAND)
	numberFromText(options, GridPickupDwellOptionId, DEFAULT_DWELL_MS)
	numberFromText(options, GridPickupReleaseBandOptionId, DEFAULT_RELEASE_BAND)
	numberFromText(options, GridPickupReleaseTimeOptionId, DEFAULT_RELEASE_MS)
	return true
}

/**
 * Upgrade grid.7's 'Grid fader pickup LED' and 'Level at target LED' feedbacks
 * to 4.0's option shapes.
 */
export function tryUpgradeGridFeedbackTo4(feedback: CompanionMigrationFeedback): boolean {
	if (!GridFeedbackIds.includes(feedback.feedbackId)) return false
	const options = feedback.options
	if (options[GridFeedbackInputChannelOptionId] !== undefined) return false

	moveChannelMix(options, GridFeedbackInputChannelOptionId, GridFeedbackMixOptionId)
	numberFromText(options, 'flashMs', DEFAULT_FLASH_MS)
	if (feedback.feedbackId === GridFeedbackId.LevelAtTargetLed) {
		numberFromText(options, 'targetBand', 0.5)
	}
	return true
}
