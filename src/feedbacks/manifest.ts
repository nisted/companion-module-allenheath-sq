import type { GridFeedbacks } from './schemas/grid.js'
import type { InputChannelLevelInMixFeedbacks } from './schemas/inputchannel-level-in-mix.js'
import type { MuteFeedbacks } from './schemas/mute.js'
import type { RebelFeedbacks } from './schemas/rebel.js'

/** All mixer feedbacks. */
export type SQFeedbacks = GridFeedbacks & InputChannelLevelInMixFeedbacks & MuteFeedbacks & RebelFeedbacks
