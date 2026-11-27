import type { CompanionActionDefinitions, CompanionInputFieldTextInput } from '@companion-module/base'
import { ConnectionFieldLabels, type ConnectionFieldId, connectionFieldIds, connectionSettingHint } from '../config.js'
import type { sqInstance } from '../instance.js'
import { optionText } from './grid-level.js'
import { ConnectionActionId, type ConnectionActions } from './schemas/connection.js'

/** An option for one connection field */
function settingOption(field: ConnectionFieldId): CompanionInputFieldTextInput<ConnectionFieldId> {
	return {
		type: 'textinput',
		id: field,
		label: ConnectionFieldLabels[field],
		default: '',
		useVariables: true,
		tooltip: `${connectionSettingHint(field)} Blank = leave as is. Values that don't fit are skipped and logged.`,
	}
}

/** The 'Set connection settings' action: it can change any connection field. */
export function connectionActions(instance: sqInstance): CompanionActionDefinitions<ConnectionActions> {
	return {
		[ConnectionActionId.SetSettings]: {
			name: 'Set connection settings',
			description:
				'Changes this connection\'s settings. Fill in only what you want to change; blank = leave as is. Anything set here shows on the connection page with a Change back tick. Put it in a trigger on "variable changed" to drive the connection from a variable.',
			options: connectionFieldIds().map(settingOption),
			callback: async ({ options }) => {
				const values: Partial<Record<ConnectionFieldId, string>> = {}
				for (const field of connectionFieldIds()) {
					values[field] = optionText(options[field])
				}
				await instance.setConnectionSettings(values)
			},
		},
	}
}
