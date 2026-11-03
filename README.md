# companion-module-allenheath-sq (grid-4 branch)

This `grid-4` branch is the official module's **4.0.0-rc1** with Nige's additions, versioned `4.0.0-rc1-grid.N`:
**Fader channel level to mix (from value/variable)** (a 0–127 fader position along the SQ's own fader taper, or
dB; optional catch → latch → release pickup), a **Grid fader pickup LED** feedback, a **Level at target LED**
feedback, and **Connection: set settings** with a "Can be set by the action" tick for each connection field. Upgrade
scripts bring buttons and triggers over from `3.1.1-grid.7`. The **Package (grid)** workflow builds the `.tgz` on
every push to this branch.

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE)

## Getting started

Executing a `yarn` command should perform all necessary steps to develop the module, if it does not then follow the steps below.

The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.

While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.
