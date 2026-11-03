import type {
	CompanionActionDefinitions,
	CompanionInputFieldStaticText,
	CompanionInputFieldTextInput,
} from '@companion-module/base'
import {
	ConnectionFieldLabels,
	type ConnectionFieldId,
	connectionSettingHint,
	tickedConnectionFields,
} from '../config.js'
import type { sqInstance } from '../instance.js'
import { ConnectionActionId, type ConnectionActions, ConnectionNothingTickedOptionId } from './schemas/connection.js'

/** An option for a connection field ticked "Can be set by the action" */
function settingOption(field: ConnectionFieldId): CompanionInputFieldTextInput<ConnectionFieldId> {
	return {
		type: 'textinput',
		id: field,
		label: ConnectionFieldLabels[field],
		default: '',
		useVariables: true,
		tooltip: `${connectionSettingHint(field)} Blank = leave as is.`,
	}
}

const NothingTicked: CompanionInputFieldStaticText<typeof ConnectionNothingTickedOptionId> = {
	type: 'static-text',
	id: ConnectionNothingTickedOptionId,
	label: 'Nothing to set yet',
	value:
		'Tick "Can be set by the action" next to a field on this connection\'s settings page first. Then it turns up here, ready to set.',
}

/**
 * The 'Connection: set settings' action.  Its options are the connection
 * fields currently ticked "Can be set by the action", so these definitions
 * must be set again whenever the ticks change.
 */
export function connectionActions(instance: sqInstance): CompanionActionDefinitions<ConnectionActions> {
	const ticked = tickedConnectionFields(instance.config)

	return {
		[ConnectionActionId.SetSettings]: {
			name: 'Connection: set settings',
			description:
				'Changes this connection\'s settings, for the fields ticked "Can be set by the action" on the connection page. Blank = leave as is. Put it in a trigger on "variable changed" to drive the connection from a variable.',
			options: ticked.length > 0 ? ticked.map(settingOption) : [NothingTicked],
			callback: async ({ options }) => {
				await instance.setConnectionSettings(options)
			},
		},
	}
}
