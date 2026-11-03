import type { Equal, Expect } from 'type-testing'
import type { LR } from '../../types.js'

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

/** Numbers that also take expressions, and fall back to the default if they aren't numbers */
type LenientNumber = number | string

type GridFeedbackChannelMixOptions = {
	[GridFeedbackInputChannelOptionId]: number
	[GridFeedbackMixOptionId]: number | typeof LR
}

type PickupLedOptions = GridFeedbackChannelMixOptions & {
	value: string
	belowColour: string
	belowFlash: boolean
	aboveColour: string
	aboveFlash: boolean
	catchColour: string
	trackingColour: string
	flashMs: LenientNumber
}

type LevelAtTargetLedOptions = GridFeedbackChannelMixOptions & {
	target: string
	targetBand: LenientNumber
	colour: string
	flash: boolean
	flashMs: LenientNumber
	offColour: string
}

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
