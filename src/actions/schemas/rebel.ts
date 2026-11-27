import type { Equal, Expect } from 'type-testing'

/**
 * SQ Rebel's own actions: channel processing over the A&H remote link, and
 * the Grid slots.
 */
export const RebelActionId = {
	ProcessingSwitch: 'ah_switch',
	ProcessingValue: 'ah_value',
	GridSlotSet: 'grid_slot_set',
	GridSlotStep: 'grid_slot_step',
	GridSlotFollow: 'grid_slot_follow',
} as const

export type RebelActionId = (typeof RebelActionId)[keyof typeof RebelActionId]

/** The channel option: a channel number, or 'sel' for the desk's selected channel */
export const AHChannelOptionId = 'channel'
export const AHParamOptionId = 'what'
export const AHSwitchOptionId = 'set'
export const AHOperationOptionId = 'operation'
export const AHAmountOptionId = 'amount'

export const GridSlotOptionId = 'slot'
export const GridSlotChannelOptionId = 'channel'
export const GridSlotMixOptionId = 'mix'
export const GridSlotStepWhatOptionId = 'what'
export const GridSlotStepByOptionId = 'by'
export const GridSlotFollowOptionId = 'follow'

/** The value meaning "the desk's selected channel" */
export const SelectedChannel = 'sel'

type ChannelOption = number | string

/** SQ Rebel's own actions. */
export type RebelActions = {
	[RebelActionId.ProcessingSwitch]: {
		options: {
			[AHChannelOptionId]: ChannelOption
			[AHParamOptionId]: string
			[AHSwitchOptionId]: 'on' | 'off' | 'toggle'
		}
	}
	[RebelActionId.ProcessingValue]: {
		options: {
			[AHChannelOptionId]: ChannelOption
			[AHParamOptionId]: string
			[AHOperationOptionId]: 'set' | 'up' | 'down'
			[AHAmountOptionId]: number | string
		}
	}
	[RebelActionId.GridSlotSet]: {
		options: {
			[GridSlotOptionId]: number | string
			[GridSlotChannelOptionId]: ChannelOption
			[GridSlotMixOptionId]: number | string
		}
	}
	[RebelActionId.GridSlotStep]: {
		options: {
			[GridSlotOptionId]: number | string
			[GridSlotStepWhatOptionId]: 'channel' | 'mix'
			[GridSlotStepByOptionId]: number | string
		}
	}
	[RebelActionId.GridSlotFollow]: {
		options: {
			[GridSlotOptionId]: number | string
			[GridSlotFollowOptionId]: 'on' | 'off' | 'toggle'
		}
	}
}

type assert_AllRebelActionsAccountedFor = Expect<Equal<keyof RebelActions, RebelActionId>>
