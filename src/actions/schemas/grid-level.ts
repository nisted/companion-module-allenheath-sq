import type { Equal, Expect } from 'type-testing'
import type { LevelSetSinkOptionId, LevelSetSourceOptionId } from './level.js'
import type { LR } from '../../types.js'

/**
 * Action IDs for the Grid additions: setting a level from a fader value (an
 * Intech Grid fader, say), with optional pickup.
 *
 * The id is the one 3.1.1-grid.N used, so existing buttons and triggers keep
 * working.
 */
export const GridLevelActionId = {
	InputChannelLevelInMixOrLRFromValue: 'chlev_to_mix_value',
} as const

export type GridLevelActionId = (typeof GridLevelActionId)[keyof typeof GridLevelActionId]

export const GridValueOptionId = 'value'
export const GridValueTypeOptionId = 'valueType'
export const GridPickupOptionId = 'pickup'
export const GridPickupBandOptionId = 'pickupBand'
export const GridPickupDwellOptionId = 'pickupDwell'
export const GridPickupReleaseBandOptionId = 'pickupReleaseBand'
export const GridPickupReleaseTimeOptionId = 'pickupReleaseTime'

/** How the value is read: a 0-127 fader position, or a level in dB */
type GridValueType = 'position' | 'db'

/**
 * Number options that also take expressions.  They allow invalid values (an
 * empty variable, say), which fall back to the default rather than skipping
 * the action, so they can arrive as strings too.
 */
type LenientNumber = number | string

type GridLevelFromValueOptions = {
	[LevelSetSourceOptionId]: number
	[LevelSetSinkOptionId]: number | typeof LR
	[GridValueOptionId]: string
	[GridValueTypeOptionId]: GridValueType
	[GridPickupOptionId]: boolean
	[GridPickupBandOptionId]: LenientNumber
	[GridPickupDwellOptionId]: LenientNumber
	[GridPickupReleaseBandOptionId]: LenientNumber
	[GridPickupReleaseTimeOptionId]: LenientNumber
}

/** The Grid level action. */
export type GridLevelActions = {
	[GridLevelActionId.InputChannelLevelInMixOrLRFromValue]: {
		options: GridLevelFromValueOptions
	}
}

type assert_AllGridLevelActionsAccountedFor = Expect<Equal<keyof GridLevelActions, GridLevelActionId>>
