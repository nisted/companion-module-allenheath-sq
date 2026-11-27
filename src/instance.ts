import type { Equal, Expect } from 'type-testing'
import { InstanceBase, type SomeCompanionConfigField } from '@companion-module/base'
import { getActions } from './actions/actions.js'
import { Choices } from './choices.js'
import {
	applyActionSettings,
	applyConnectionPage,
	canUpdateConfigWithoutRestarting,
	type ConnectionFieldId,
	GetConfigFields,
	getGridSlots,
	getHost,
	noConnectionConfig,
	type SQConfig,
	validateConfig,
} from './config.js'
import { getFeedbacks } from './feedbacks/feedbacks.js'
import type { SQManifest } from './manifest.js'
import { Mixer } from './mixer/mixer.js'
import type { Model } from './mixer/model.js'
import { destroyPickup } from './pickup.js'
import { getPresetDefinitions } from './presets/definitions.js'
import { getPresetsStructure } from './presets/structure.js'
import { Rebel } from './rebel.js'
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

	/** SQ Rebel's additions: the A&H remote link and the Grid slots */
	rebel: Rebel | null = null

	#recording = false

	/**
	 * The last label specified for this instance, or `null` if there wasn't a
	 * last label.
	 */
	#lastLabel: string | null = null

	override async destroy(): Promise<void> {
		destroyPickup(this)
		this.rebel?.stop()
		this.rebel = null
		if (this.mixer !== null) {
			this.mixer.stop('Module connection destroyed')
			this.mixer = null
		}
	}

	override async init(config: SQConfig, _isFirstInit: boolean): Promise<void> {
		validateConfig(config)
		void this.#useConfig(config)
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

	/** An input channel's name from the desk, if the A&H remote link has it */
	inputChannelName(channel: number): string | undefined {
		return this.rebel?.inputChannelName(channel)
	}

	/** LR's name from the desk, if the A&H remote link has it */
	lrName(): string | undefined {
		return this.rebel?.lrName()
	}

	/** A mix's name from the desk, if known */
	mixName(mix: number): string | undefined {
		return this.rebel?.mixName(mix)
	}

	/** Whether Companion's action recorder is running */
	get isRecording(): boolean {
		return this.#recording
	}

	override handleStartStopRecordActions(isRecording: boolean): void {
		this.#recording = isRecording
		this.rebel?.setRecording(isRecording)
		if (isRecording) {
			this.rebel?.primeRecorder()
		}
	}

	/** Set variable definitions for this instance. */
	initVariableDefinitions(mixer: Mixer): void {
		this.setVariableDefinitions({ ...getVariables(mixer.model), ...this.rebel?.variableDefinitions() })
		this.rebel?.publishAll()

		this.setVariableValues({
			[SceneRecalledTriggerId]: mixer.sceneRecalledTrigger,

			// This value may very well be wrong, but there's no defined way to
			// query what the current scene is, nor to be updated if it changes
			// and this module didn't do it.
			[CurrentSceneId]: 1,
		})
	}

	#updatePresetDefinitions(model: Model): void {
		this.setPresetDefinitions(getPresetsStructure(model, getGridSlots(this.config)), getPresetDefinitions(this, model))
	}

	/**
	 * A config saved from the connection page.  Fields the 'Set connection
	 * settings' action has set keep the action's value unless Change back is
	 * ticked: see `applyConnectionPage`.
	 */
	override async configUpdated(newConfig: SQConfig): Promise<void> {
		validateConfig(newConfig)
		if (applyConnectionPage(this.config, newConfig)) {
			this.saveConfig(newConfig)
		}
		await this.#useConfig(newConfig)
	}

	/**
	 * Run 'Set connection settings': any field, blank = leave alone, values
	 * that don't fit are skipped with a warning in the log.  Nothing is saved,
	 * and the connection isn't touched, unless something actually changed.
	 */
	async setConnectionSettings(values: Partial<Record<ConnectionFieldId, string>>): Promise<void> {
		const next = applyActionSettings(this.config, values, (message) => {
			this.log('warn', message)
		})
		if (next === null) {
			return
		}
		this.saveConfig(next)
		await this.#useConfig(next)
	}

	/**
	 * Start using a config, restarting the mixer connection only if it has to.
	 */
	async #useConfig(newConfig: SQConfig): Promise<void> {
		const oldConfig = this.config
		this.config = newConfig

		if (this.mixer !== null) {
			if (canUpdateConfigWithoutRestarting(oldConfig, newConfig)) {
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
			this.rebel?.stop()
			this.rebel = null
		}

		const mixer = new Mixer(this)
		this.mixer = mixer

		const rebel = new Rebel(this, mixer.model)
		this.rebel = rebel
		rebel.onNamesChanged = () => {
			if (this.mixer !== mixer) return
			const current = new Choices(mixer.model)
			this.setActionDefinitions(getActions(this, mixer, current))
			this.setFeedbackDefinitions(getFeedbacks(this, mixer, current))
		}

		const choices = new Choices(mixer.model)

		this.initVariableDefinitions(mixer)
		this.setActionDefinitions(getActions(this, mixer, choices))
		this.setFeedbackDefinitions(getFeedbacks(this, mixer, choices))

		this.#lastLabel = this.label
		this.#updatePresetDefinitions(mixer.model)

		//this.checkVariables();
		this.checkAllFeedbacks() // XXX optimize?

		mixer.start(getHost(newConfig))
		rebel.start(getHost(newConfig))
		rebel.setRecording(this.#recording)
	}
}
