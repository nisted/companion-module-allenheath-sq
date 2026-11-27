import type {
	CompanionAdvancedFeedbackResult,
	CompanionFeedbackDefinitions,
	DropdownChoice,
	JsonValue,
} from '@companion-module/base'
import { gridInputChannelOption, gridLevelNRPN, gridMixOption, optionText } from '../actions/grid-level.js'
import type { sqInstance } from '../instance.js'
import {
	drawLook,
	forgetLook,
	isMoving,
	type Look,
	lookOptions,
	parseNumber,
	readLook,
	scaleColour,
} from '../led-look.js'
import type { Mixer } from '../mixer/mixer.js'
import { levelKey, type PickupLed, pickupFor } from '../pickup.js'
import { PickupLooks, TargetLook } from './grid-looks.js'
import {
	GridFeedbackId,
	GridFeedbackInputChannelOptionId,
	GridFeedbackMixOptionId,
	type GridFeedbacks,
	GridFeedbackTargetBandOptionId,
	GridFeedbackTargetOptionId,
	GridFeedbackTrackingBrightnessOptionId,
	GridFeedbackValueOptionId,
	PickupLookPrefixes,
	TargetLookPrefix,
} from './schemas/grid.js'

type Options = Record<string, JsonValue | undefined>

/** The pickup LED's look for a state, falling back to below/above for the released states while theirs are off */
function pickupLook(options: Options, led: PickupLed): Look {
	const own = PickupLooks[led]
	if ((led === 'releasedBelow' || led === 'releasedAbove') && options[`${led}Custom`] !== true) {
		const usual = led === 'releasedBelow' ? 'below' : 'above'
		return readLook(options, usual, PickupLooks[usual].defaults, PickupLooks[usual].extras)
	}
	return readLook(options, led, own.defaults, own.extras)
}

/**
 * The Grid additions' LED feedbacks: where a pickup fader is up to, and
 * whether a level is at its mark.
 */
export function gridFeedbacks(
	instance: sqInstance,
	mixer: Mixer,
	mixesAndLR: DropdownChoice[],
): CompanionFeedbackDefinitions<GridFeedbacks> {
	const model = mixer.model

	const channelOption = gridInputChannelOption(GridFeedbackInputChannelOptionId, instance, model)
	const mixOption = gridMixOption(GridFeedbackMixOptionId, instance, mixesAndLR)

	return {
		[GridFeedbackId.PickupLed]: {
			type: 'advanced',
			name: 'Grid fader pickup LED',
			description:
				"Background colour for a fader using pickup mode, showing where it's up to. Each state has a default look; turn on Customise to choose its effect, colours and rate.",
			affectedProperties: ['bgcolor'],
			options: [
				channelOption,
				mixOption,
				{
					type: 'textinput',
					label: 'Fader value',
					id: GridFeedbackValueOptionId,
					default: '',
					useVariables: true,
					tooltip: "The fader's value: the same as the action's Value.",
				},
				...PickupLookPrefixes.flatMap((prefix) => {
					const { label, defaults, extras } = PickupLooks[prefix]
					const options = lookOptions(prefix, label, defaults, extras)
					if (prefix === 'releasedBelow' || prefix === 'releasedAbove') {
						// Off = the below/above look, not a default of its own
						options[0] = {
							...options[0],
							label: `${label}: own look`,
							tooltip: `Off: shown with the ${prefix === 'releasedBelow' ? 'below' : 'above'} desk level look. On: a look of its own, for when the desk fader has been moved away and the Grid fader is no longer latched.`,
						}
					}
					return options
				}),
				{
					type: 'checkbox',
					label: 'Tracking: brightness follows the fader',
					id: GridFeedbackTrackingBrightnessOptionId,
					default: true,
					tooltip: 'Off at 0, full brightness at 127.',
				},
			],
			callback: (feedback): CompanionAdvancedFeedbackResult => {
				const { options } = feedback
				const nrpn = gridLevelNRPN(
					instance,
					model,
					options[GridFeedbackInputChannelOptionId],
					options[GridFeedbackMixOptionId],
				)
				if (nrpn === null) {
					return {}
				}

				const raw = optionText(options[GridFeedbackValueOptionId])
				const n = Number(raw)
				const incoming = raw === '' || Number.isNaN(n) ? undefined : n
				const pickup = pickupFor(instance)
				const { led, position, distance } = pickup.ledState(levelKey(nrpn), incoming)
				const look = pickupLook(options, led)
				if (isMoving(look)) pickup.noteAnimating()

				const colour = drawLook(look, feedback.id, distance)
				if (colour === undefined) return {}
				if (led === 'tracking' && options[GridFeedbackTrackingBrightnessOptionId] !== false) {
					return { bgcolor: scaleColour(colour, position / 127) }
				}
				return { bgcolor: colour }
			},
			unsubscribe: (feedback) => {
				forgetLook(feedback.id)
			},
		},
		[GridFeedbackId.LevelAtTargetLed]: {
			type: 'advanced',
			name: 'Level at target LED',
			description:
				"Background colour while a channel's level is within a band either side of a target dB. One target each: add it a few times for a few targets (Companion's feedback order decides which wins).",
			affectedProperties: ['bgcolor'],
			options: [
				channelOption,
				mixOption,
				{
					type: 'textinput',
					label: 'Target (dB, or -inf)',
					id: GridFeedbackTargetOptionId,
					default: '0',
					useVariables: true,
					tooltip: '-90 to +10, or -inf (which counts as -90). Can be a variable.',
				},
				{
					type: 'number',
					label: 'Band (± dB either side of the target)',
					id: GridFeedbackTargetBandOptionId,
					default: 0.5,
					min: 0,
					max: 100,
					expressionDescription: 'A number from 0 to 100. Anything else uses the default (0.5).',
					allowInvalidValues: true,
				},
				...lookOptions(TargetLookPrefix, TargetLook.label, TargetLook.defaults, TargetLook.extras),
			],
			callback: (feedback): CompanionAdvancedFeedbackResult => {
				const { options } = feedback
				const nrpn = gridLevelNRPN(
					instance,
					model,
					options[GridFeedbackInputChannelOptionId],
					options[GridFeedbackMixOptionId],
				)
				if (nrpn === null) {
					return {}
				}

				const pickup = pickupFor(instance)
				const level = pickup.deskLevel(levelKey(nrpn))
				if (level === undefined) {
					return {}
				}

				const numeric = level === '-inf' ? -90 : level
				const targetText = optionText(options[GridFeedbackTargetOptionId]).toLowerCase()
				const target = targetText === '-inf' ? -90 : parseNumber(targetText, 0, -90, 10)
				const band = parseNumber(options[GridFeedbackTargetBandOptionId], 0.5, 0, 100)
				if (Math.abs(numeric - target) > band) {
					return {}
				}

				const look = readLook(options, TargetLookPrefix, TargetLook.defaults, TargetLook.extras)
				if (isMoving(look)) pickup.noteAnimating()
				const colour = drawLook(look, feedback.id)
				return colour === undefined ? {} : { bgcolor: colour }
			},
			unsubscribe: (feedback) => {
				forgetLook(feedback.id)
			},
		},
	}
}
