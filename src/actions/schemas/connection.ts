import type { Equal, Expect } from 'type-testing'
import type { ConnectionFieldId } from '../../config.js'

/**
 * Action IDs for changing the connection's own settings (SQ Rebel).  The id
 * is the one 4.0.0-rc1-grid.1 used, so existing buttons and triggers keep
 * working.
 */
export const ConnectionActionId = {
	SetSettings: 'connection_set',
} as const

export type ConnectionActionId = (typeof ConnectionActionId)[keyof typeof ConnectionActionId]

/** One text option per connection field (usually from a variable; blank = leave as is) */
type ConnectionSetOptions = { [F in ConnectionFieldId]: string }

/** Actions that change the connection's own settings. */
export type ConnectionActions = {
	[ConnectionActionId.SetSettings]: {
		options: ConnectionSetOptions
	}
}

type assert_AllConnectionActionsAccountedFor = Expect<Equal<keyof ConnectionActions, ConnectionActionId>>
