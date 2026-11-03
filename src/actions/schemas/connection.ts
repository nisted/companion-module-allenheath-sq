import type { JsonValue } from '@companion-module/base'
import type { Equal, Expect } from 'type-testing'
import type { ConnectionFieldId } from '../../config.js'

/**
 * Action IDs for changing the connection's own settings (the Grid additions,
 * Nige's fork).
 */
export const ConnectionActionId = {
	SetSettings: 'connection_set',
} as const

export type ConnectionActionId = (typeof ConnectionActionId)[keyof typeof ConnectionActionId]

/**
 * The static-text option shown instead when no connection field is ticked
 * "Can be set by the action".
 */
export const ConnectionNothingTickedOptionId = 'none'

/**
 * One option per connection field ticked "Can be set by the action" (text,
 * usually from a variable; blank = leave as is), or the static-text note when
 * there are none.
 */
type ConnectionSetOptions = { [F in ConnectionFieldId]?: JsonValue } & {
	[ConnectionNothingTickedOptionId]?: string
}

/** Actions that change the connection's own settings. */
export type ConnectionActions = {
	[ConnectionActionId.SetSettings]: {
		options: ConnectionSetOptions
	}
}

type assert_AllConnectionActionsAccountedFor = Expect<Equal<keyof ConnectionActions, ConnectionActionId>>
