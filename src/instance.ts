import type { Equal, Expect } from 'type-testing'
import { type CompanionOptionValues, InstanceBase, type SomeCompanionConfigField } from '@companion-module/base'
import { getActions } from './actions/actions.js'
import { optionText } from './actions/grid-level.js'
import { Choices } from './choices.js'
import {
	applyByActionTicks,
	canUpdateConfigWithoutRestarting,
	ConnectionFieldLabels,
	GetConfigFields,
	getHost,
	noConnectionConfig,
	parseConnectionSetting,
	type RawConfig,
	type SQConfig,
	tickedConnectionFields,
	validateConfig,
} from './config.js'
import { getFeedbacks } from './feedbacks/feedbacks.js'
import type { SQManifest } from './manifest.js'
import { Mixer } from './mixer/mixer.js'
import type { Model } from './mixer/model.js'
import { destroyPickup } from './pickup.js'
import { getPresetDefinitions } from './presets/definitions.js'
import { getPresetsStructure } from './presets/structure.js'
import { CurrentSceneId, SceneRecalledTriggerId, type SQVariables } from './variables/manifest.js'
import { getVariables } from './variables/variables.js'

/** An SQ mixer connection instance. */
export class sqInstance extends InstanceBase<SQManifest> {
	/** Configuration dictating the behavior of this instance. */
	config = noConnectionConfig()

	/**
	 * The mixer being manipulated by this instance if one has been identified.
	 */
	mixer: Mixer | null = null

	/**
	 * The last label specified for this instance, or `null` if there wasn't a
	 * last label.
	 */
	#lastLabel: string | null = null

	override async destroy(): Promise<void> {
		destroyPickup(this)
		if (this.mixer !== null) {
			this.mixer.stop('Module connection destroyed')
			this.mixer = null
		}
	}

	override async init(config: SQConfig, _isFirstInit: boolean): Promise<void> {
		// The "Can be set by the action" ticks are taken as saved: nothing is
		// being handed over to the action or back at startup.
		validateConfig(config)
		void this.#useConfig(config, false)
	}

	override getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields(this.config)
	}

	/**
	 * Set the value of a variable that doesn't exist when this instance is
	 * initialized, but only is brought into existence if/when it is needed.
	 *
	 * @param variableId
	 *   The id of the variable, i.e. the part that appears to right of the
	 *   colon in `$(SQ:ident)`.
	 * @param _name
	 *   A user-exposed description of the variable.
	 * @param variableValue
	 *   The value of the variable.
	 */
	setExtraVariable<Variable extends keyof SQVariables>(
		variableId: Variable,
		_name: string,
		variableValue: NoInfer<SQVariables[Variable]>,
	): void {
		// The name of this potentially newly-defined variable is currently not
		// used.  If we wanted to, we could redefine the entire variable set
		// (with this new variable included), to expose this new variable in
		// UI (for example, in variable autocomplete in text fields that support
		// variables).  But that's a large amount of churn for just a single
		// variable, with quadratically increasing cost (define N variables,
		// define N + 1 variables, define N + 2 variables...).  So for now we
		// use `disableVariableValidation` to add the variable without all that
		// extra support.  Perhaps Companion itself will grow an API to define
		// individual extra variables, and then we can use the name in that API.

		const { instanceOptions } = this
		const { disableVariableValidation: oldValue } = instanceOptions
		try {
			instanceOptions.disableVariableValidation = true

			type assert_VariableAndValueAreCorrectlyTyped = Expect<Equal<SQVariables[Variable], typeof variableValue>>

			this.setVariableValues(
				// @ts-expect-error TypeScript currently misunderstands multiple
				// non-overlapping index signatures, despite the above assertion
				// passing, so the error here must be ignored.
				{
					[variableId]: variableValue,
				},
			)
		} finally {
			instanceOptions.disableVariableValidation = oldValue
		}
	}

	/** Set variable definitions for this instance. */
	initVariableDefinitions(mixer: Mixer): void {
		this.setVariableDefinitions(getVariables(mixer.model))

		this.setVariableValues({
			[SceneRecalledTriggerId]: mixer.sceneRecalledTrigger,

			// This value may very well be wrong, but there's no defined way to
			// query what the current scene is, nor to be updated if it changes
			// and this module didn't do it.
			[CurrentSceneId]: 1,
		})
	}

	#updatePresetDefinitions(model: Model): void {
		this.setPresetDefinitions(getPresetsStructure(model), getPresetDefinitions(this, model))
	}

	/**
	 * A config saved from the connection page.  The "Can be set by the action"
	 * ticks decide what of it is used: see `applyByActionTicks`.
	 */
	override async configUpdated(newConfig: SQConfig): Promise<void> {
		validateConfig(newConfig)
		const { ticksChanged, changed } = applyByActionTicks(this.config, newConfig)
		if (changed) {
			this.saveConfig(newConfig)
		}
		await this.#useConfig(newConfig, ticksChanged)
	}

	/**
	 * Run 'Connection: set settings': put the values given into the connection
	 * fields ticked "Can be set by the action", then use them.  Blank values
	 * are left as they are, and values that don't make sense are skipped with
	 * a warning in the log.  Nothing is saved, and the connection isn't
	 * touched, unless something actually changed.
	 */
	async setConnectionSettings(options: CompanionOptionValues): Promise<void> {
		const what = 'Connection: set settings'
		const ticked = tickedConnectionFields(this.config)
		if (ticked.length === 0) {
			this.log(
				'info',
				`${what}: nothing's ticked "Can be set by the action" on the connection page yet, so there's nothing for me to set.`,
			)
			return
		}

		const next: RawConfig = { ...this.config }
		let changed = false
		for (const field of ticked) {
			const text = optionText(options[field])
			if (text === '') {
				continue
			}

			const parsed = parseConnectionSetting(field, text)
			if (!parsed.ok) {
				this.log(
					'warn',
					`${what}: "${ConnectionFieldLabels[field]}" ${parsed.why}, and "${text}" isn't that. I've left it as it was.`,
				)
				continue
			}

			if (next[field] !== parsed.value) {
				next[field] = parsed.value
				changed = true
			}
		}

		if (!changed) {
			return
		}

		validateConfig(next)
		this.saveConfig(next)
		await this.#useConfig(next, false)
	}

	/**
	 * Start using a config, restarting the mixer connection only if it has to.
	 *
	 * @param redefineActions
	 *   Whether the action definitions must be set again even if the mixer
	 *   connection isn't restarted (because the "Can be set by the action"
	 *   ticks changed the 'Connection: set settings' action's options).
	 */
	async #useConfig(newConfig: SQConfig, redefineActions: boolean): Promise<void> {
		const oldConfig = this.config
		this.config = newConfig

		if (this.mixer !== null) {
			if (canUpdateConfigWithoutRestarting(oldConfig, newConfig)) {
				if (redefineActions) {
					this.setActionDefinitions(getActions(this, this.mixer, new Choices(this.mixer.model)))
				}

				const label = this.label
				if (label !== this.#lastLabel) {
					// The instance label might be altered just before
					// `configUpdated` is called.  The instance label is used in the
					// "Learn" operation for some actions -- and it'll always be
					// up-to-date in these uses.  But it's also hardcoded in some
					// presets, so if the label changes, we must redefine presets
					// even if we don't have to restart the connection.
					this.#lastLabel = label
					this.#updatePresetDefinitions(this.mixer.model)
				}
				return
			}

			this.mixer.stop('Mixer connection restarting for configuration update...')
		}

		const mixer = new Mixer(this)
		this.mixer = mixer

		const choices = new Choices(mixer.model)

		this.initVariableDefinitions(mixer)
		this.setActionDefinitions(getActions(this, mixer, choices))
		this.setFeedbackDefinitions(getFeedbacks(this, mixer, choices))

		this.#lastLabel = this.label
		this.#updatePresetDefinitions(mixer.model)

		//this.checkVariables();
		this.checkAllFeedbacks() // XXX optimize?

		mixer.start(getHost(newConfig))
	}
}
