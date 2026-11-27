import type { JsonValue } from '@companion-module/base'
import type { Equal, Expect } from 'type-testing'

/**
 * Feedback IDs for the Grid additions' LED feedbacks.  The ids are the ones
 * 3.1.1-grid.N used, so existing buttons keep working.
 */
export const GridFeedbackId = {
	PickupLed: 'fader_pickup_led',
	LevelAtTargetLed: 'level_threshold_led',
} as const

export type GridFeedbackId = (typeof GridFeedbackId)[keyof typeof GridFeedbackId]

export const GridFeedbackInputChannelOptionId = 'inputChannel'
export const GridFeedbackMixOptionId = 'mix'

/** The Grid fader's value option on the pickup LED */
export const GridFeedbackValueOptionId = 'value'
/** Tracking: brightness follows the fader */
export const GridFeedbackTrackingBrightnessOptionId = 'trackingBrightness'

/** The level-at-target options */
export const GridFeedbackTargetOptionId = 'target'
export const GridFeedbackTargetBandOptionId = 'targetBand'

/** The LED states of the pickup LED, as option id prefixes for their looks */
export const PickupLookPrefixes = ['below', 'above', 'releasedBelow', 'releasedAbove', 'catch', 'tracking'] as const

/** The look option id prefix of the level-at-target LED */
export const TargetLookPrefix = 'atTarget'

type GridFeedbackChannelMixOptions = {
	[GridFeedbackInputChannelOptionId]: number | string
	/** LR, a mix number, or typed / from an expression */
	[GridFeedbackMixOptionId]: number | string
}

/** The looks' options (see led-look.ts) */
type LookOptions = { [key: string]: JsonValue | undefined }

type PickupLedOptions = GridFeedbackChannelMixOptions & {
	[GridFeedbackValueOptionId]: string
	[GridFeedbackTrackingBrightnessOptionId]: boolean
} & LookOptions

type LevelAtTargetLedOptions = GridFeedbackChannelMixOptions & {
	[GridFeedbackTargetOptionId]: string
	[GridFeedbackTargetBandOptionId]: number | string
} & LookOptions

/** The Grid LED feedbacks. */
export type GridFeedbacks = {
	[GridFeedbackId.PickupLed]: {
		type: 'advanced'
		options: PickupLedOptions
	}
	[GridFeedbackId.LevelAtTargetLed]: {
		type: 'advanced'
		options: LevelAtTargetLedOptions
	}
}

type assert_AllGridFeedbacksAccountedFor = Expect<Equal<keyof GridFeedbacks, GridFeedbackId>>
