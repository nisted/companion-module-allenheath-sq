# companion-module-allenheath-sq (grid-4 branch)

This `grid-4` branch is SQ Rebel: the official module's **4.0.0-rc1** with Nige's additions, versioned
`4.0.0-rc1-grid.N`:

- **Fader channel level to mix (from value/variable)**: a 0-127 fader position along the SQ's own fader taper, or dB,
  with optional catch, latch and release pickup.
- **Grid fader pickup LED** and **Level at target LED** feedbacks, with a standard set of look options per LED state.
- **Grid slots** and **Intech Grid presets** (channel/mix rotary, fader with pickup, follow the selected channel).
- The **A&H remote link** (TCP 51326) alongside MIDI: channel names, the selected channel, and input channel
  processing. Protocol details from [Remora](https://github.com/stoatworks-labs/remora) and
  [allen-heath-sq-tools](https://github.com/hrueger/allen-heath-sq-tools) (both MIT).
- **Action recorder** support, and **Set connection settings** (any field, with Change back on the connection page).

Upgrade scripts bring buttons and triggers over from `3.1.1-grid.7` and `4.0.0-rc1-grid.1`. The **Package (grid)**
workflow builds the `.tgz` on every push to this branch, and publishes a pre-release when `package.json` has a version
that hasn't been released yet (notes from `.github/RELEASE_NOTES.md`).

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE)

## Getting started

Executing a `yarn` command should perform all necessary steps to develop the module, if it does not then follow the steps below.

The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.

While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.
