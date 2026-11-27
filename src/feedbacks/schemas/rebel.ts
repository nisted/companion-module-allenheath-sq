import type { Equal, Expect } from 'type-testing'

/** SQ Rebel's own feedbacks: channel processing, names and selection, and the Grid slots. */
export const RebelFeedbackId = {
	ProcessingOn: 'ah_switch_on',
	ProcessingValue: 'ah_value',
	ChannelName: 'ah_name',
	Selected: 'ah_selected',
	GridSlotFollowing: 'grid_slot_following',
} as const

export type RebelFeedbackId = (typeof RebelFeedbackId)[keyof typeof RebelFeedbackId]

type ChannelOption = number | string

/** SQ Rebel's own feedbacks. */
export type RebelFeedbacks = {
	[RebelFeedbackId.ProcessingOn]: {
		type: 'boolean'
		options: { channel: ChannelOption; what: string }
	}
	[RebelFeedbackId.ProcessingValue]: {
		type: 'value'
		options: { channel: ChannelOption; what: string }
	}
	[RebelFeedbackId.ChannelName]: {
		type: 'value'
		options: { channel: ChannelOption }
	}
	[RebelFeedbackId.Selected]: {
		type: 'boolean'
		options: { channel: ChannelOption }
	}
	[RebelFeedbackId.GridSlotFollowing]: {
		type: 'boolean'
		options: { slot: number | string }
	}
}

type assert_AllRebelFeedbacksAccountedFor = Expect<Equal<keyof RebelFeedbacks, RebelFeedbackId>>
