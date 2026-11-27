import type { CompanionPresetDefinitions } from '@companion-module/base'
import { getGridSlots, getTalkbackChannel } from '../config.js'
import { mutePresets } from './definitions/mutes.js'
import { muteWithLevelPresets } from './definitions/mute-with-level.js'
import { rebelPresets } from './definitions/rebel.js'
import { talkbackPresets } from './definitions/talkback.js'
import type { sqInstance } from '../instance.js'
import type { SQManifest } from '../manifest.js'
import type { Model } from '../mixer/model.js'

export function getPresetDefinitions(instance: sqInstance, model: Model): CompanionPresetDefinitions<SQManifest> {
	return {
		...mutePresets(),
		...muteWithLevelPresets(model),
		...talkbackPresets(getTalkbackChannel(instance.config)),
		...rebelPresets(instance.label, getGridSlots(instance.config)),
	}
}
