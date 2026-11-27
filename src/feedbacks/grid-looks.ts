import type { JsonValue } from '@companion-module/base'
import { type LookDefaults, type LookExtras, lookDefaultValues } from '../led-look.js'
import { DEFAULT_FLASH_MS } from '../pickup.js'
import { PickupLookPrefixes, TargetLookPrefix } from './schemas/grid.js'

const Red = 0xff0000
const Green = 0x00ff00
const Blue = 0x0000ff
const White = 0xffffff
const Black = 0x000000
const Orange = 0xff8000
const Yellow = 0xffff00

type PickupLookPrefix = (typeof PickupLookPrefixes)[number]

/** Each pickup LED state: how it's shown, and its default look */
export const PickupLooks: Record<PickupLookPrefix, { label: string; defaults: LookDefaults; extras: LookExtras }> = {
	below: {
		label: 'Below desk level',
		defaults: { effect: 'flash', colours: [Red, Black, Orange, Yellow], rateMs: DEFAULT_FLASH_MS, underneath: false },
		extras: { approach: true },
	},
	above: {
		label: 'Above desk level',
		defaults: { effect: 'solid', colours: [Red, Black, Orange, Yellow], rateMs: DEFAULT_FLASH_MS, underneath: false },
		extras: { approach: true },
	},
	releasedBelow: {
		label: 'Released, below desk level',
		defaults: {
			effect: 'alternate',
			colours: [Red, Blue, Orange, Yellow],
			rateMs: DEFAULT_FLASH_MS,
			underneath: false,
		},
		extras: { approach: true },
	},
	releasedAbove: {
		label: 'Released, above desk level',
		defaults: {
			effect: 'alternate',
			colours: [Red, Blue, Orange, Yellow],
			rateMs: DEFAULT_FLASH_MS,
			underneath: false,
		},
		extras: { approach: true },
	},
	catch: {
		label: 'Catching',
		defaults: { effect: 'solid', colours: [Green, Black, Yellow, White], rateMs: DEFAULT_FLASH_MS, underneath: false },
		extras: {},
	},
	tracking: {
		label: 'Tracking',
		defaults: { effect: 'solid', colours: [White, Black, Blue, Green], rateMs: DEFAULT_FLASH_MS, underneath: false },
		extras: {},
	},
}

/** The level-at-target LED's default look */
export const TargetLook: { label: string; defaults: LookDefaults; extras: LookExtras } = {
	label: 'At target',
	defaults: { effect: 'solid', colours: [Blue, Black, Green, White], rateMs: DEFAULT_FLASH_MS, underneath: true },
	extras: {},
}

/** Every look option of the pickup LED, at its defaults */
export function pickupLookDefaultValues(): Record<string, JsonValue> {
	let values: Record<string, JsonValue> = {}
	for (const prefix of PickupLookPrefixes) {
		const { defaults, extras } = PickupLooks[prefix]
		values = { ...values, ...lookDefaultValues(prefix, defaults, extras) }
	}
	return values
}

/** Every look option of the level-at-target LED, at its defaults */
export function targetLookDefaultValues(): Record<string, JsonValue> {
	return lookDefaultValues(TargetLookPrefix, TargetLook.defaults, TargetLook.extras)
}
