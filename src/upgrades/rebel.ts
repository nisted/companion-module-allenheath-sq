import type {
	CompanionMigrationAction,
	CompanionMigrationFeedback,
	CompanionMigrationOptionValues,
	ExpressionOrValue,
	JsonValue,
} from '@companion-module/base'
import { optionText } from '../actions/grid-level.js'
import { connectionFieldIds } from '../config.js'
import { pickupLookDefaultValues, PickupLooks, targetLookDefaultValues, TargetLook } from '../feedbacks/grid-looks.js'
import { GridFeedbackId, GridFeedbackTrackingBrightnessOptionId, TargetLookPrefix } from '../feedbacks/schemas/grid.js'
import { type LookDefaults, lookIds, parseColour } from '../led-look.js'
import { DEFAULT_FLASH_MS } from '../pickup.js'

/*
 * Upgrades for SQ Rebel 4.0.0-rc1-grid.2: the new 'Set connection settings'
 * action options, and the Grid LED feedbacks' new look options.
 */

const value = (v: JsonValue): ExpressionOrValue<JsonValue | undefined> => ({ isExpression: false, value: v })

/** 'Set connection settings' now offers every field: fill the ones a button doesn't have, and drop the old note */
export function tryFillConnectionSetOptions(action: CompanionMigrationAction): boolean {
	if (action.actionId !== 'connection_set') return false
	let changed = false
	if (action.options.none !== undefined) {
		delete action.options.none
		changed = true
	}
	for (const field of connectionFieldIds()) {
		if (action.options[field] === undefined) {
			action.options[field] = value('')
			changed = true
		}
	}
	return changed
}

/** An old text colour option as a colour picker value: a literal colour, or an expression giving the same text */
function colourFrom(
	option: ExpressionOrValue<JsonValue | undefined> | undefined,
	fallback: number,
): ExpressionOrValue<JsonValue | undefined> {
	if (option === undefined) return value(fallback)
	if (option.isExpression) return option
	const text = optionText(option.value)
	if (text.includes('$(')) return { isExpression: true, value: `parseVariables(${JSON.stringify(text)})` }
	return value(parseColour(text, fallback))
}

function plain(option: ExpressionOrValue<JsonValue | undefined> | undefined): JsonValue | undefined {
	return option === undefined || option.isExpression ? undefined : option.value
}

/** Whether an old option still holds its default (an expression never counts as the default) */
function isDefaultColour(option: ExpressionOrValue<JsonValue | undefined> | undefined, colour: number): boolean {
	if (option === undefined) return true
	if (option.isExpression) return false
	const text = optionText(option.value)
	return !text.includes('$(') && parseColour(text, colour) === colour
}

/** Fill a look's options that a feedback doesn't have yet */
function fillDefaults(options: CompanionMigrationOptionValues, defaults: Record<string, JsonValue>): void {
	for (const [id, v] of Object.entries(defaults)) {
		if (options[id] === undefined) options[id] = value(v)
	}
}

/**
 * Move an old state's colour (and flash) into the new look: if it differs
 * from the state's old default, the look is customised to match it.
 */
function moveState(
	options: CompanionMigrationOptionValues,
	prefix: string,
	oldColourId: string,
	oldFlashId: string | null,
	defaults: LookDefaults,
	oldDefaultFlash: boolean,
): void {
	const id = lookIds(prefix)
	const colour = options[oldColourId]
	const flash = oldFlashId === null ? undefined : options[oldFlashId]
	const flashing = flash === undefined ? oldDefaultFlash : plain(flash) === true
	const flashMs = options.flashMs
	const rateIsDefault = flashMs === undefined || (!flashMs.isExpression && Number(flashMs.value) === DEFAULT_FLASH_MS)

	const same =
		isDefaultColour(colour, defaults.colours[0]) && flashing === oldDefaultFlash && (!flashing || rateIsDefault)
	if (!same) {
		options[id.custom] = value(true)
		options[id.effect] = value(flashing ? 'flash' : 'solid')
		options[id.colour1] = colourFrom(colour, defaults.colours[0])
		options[id.colour2] = value(0x000000)
		if (flashMs !== undefined) options[id.rate] = flashMs
	}
	delete options[oldColourId]
	if (oldFlashId !== null) delete options[oldFlashId]
}

/** The Grid LED feedbacks: old colour/flash options become the new looks */
export function tryUpgradeGridLedLooks(feedback: CompanionMigrationFeedback): boolean {
	const options = feedback.options
	if (feedback.feedbackId === GridFeedbackId.PickupLed) {
		if (options.belowCustom !== undefined) return false
		moveState(options, 'below', 'belowColour', 'belowFlash', PickupLooks.below.defaults, true)
		moveState(options, 'above', 'aboveColour', 'aboveFlash', PickupLooks.above.defaults, false)
		moveState(options, 'catch', 'catchColour', null, PickupLooks.catch.defaults, false)
		moveState(options, 'tracking', 'trackingColour', null, PickupLooks.tracking.defaults, false)
		delete options.flashMs
		if (options[GridFeedbackTrackingBrightnessOptionId] === undefined) {
			options[GridFeedbackTrackingBrightnessOptionId] = value(true)
		}
		fillDefaults(options, pickupLookDefaultValues())
		return true
	}

	if (feedback.feedbackId === GridFeedbackId.LevelAtTargetLed) {
		if (options[`${TargetLookPrefix}Custom`] !== undefined) return false
		const id = lookIds(TargetLookPrefix)
		const colour = options.colour
		const flashing = plain(options.flash) === true
		const offText = optionText(plain(options.offColour))
		const offIsExpression = options.offColour?.isExpression === true || offText.includes('$(')
		if (!isDefaultColour(colour, TargetLook.defaults.colours[0]) || flashing) {
			options[id.custom] = value(true)
			options[id.effect] = value(flashing ? 'flash' : 'solid')
			options[id.colour1] = colourFrom(colour, TargetLook.defaults.colours[0])
			if (offText === '' && !offIsExpression) {
				options[id.underneath] = value(true)
			} else {
				options[id.underneath] = value(false)
				options[id.colour2] = colourFrom(options.offColour, 0x000000)
			}
			if (options.flashMs !== undefined) options[id.rate] = options.flashMs
		}
		for (const old of ['colour', 'flash', 'offColour', 'flashMs']) delete options[old]
		fillDefaults(options, targetLookDefaultValues())
		return true
	}

	return false
}
