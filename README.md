# companion-module-allenheath-sq (grid branch)

This `grid` branch is the official module's **v3.1.0** with Nige's additions, versioned `3.1.1-grid.N`:
**Fader channel level to mix (from value/variable)** (a 0–127 fader position along the SQ's own fader taper, or
dB; optional catch → latch → release pickup), a **Grid fader pickup LED** feedback and a **Level at target LED**
feedback. Channel and mix are text boxes that take a number or a variable. The **Package (grid)** workflow builds
the `.tgz` on every push to this branch. These additions are being offered to the official module; once they're
in an official release, this branch can go.


See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE)

## Getting started

Executing a `yarn` command should perform all necessary steps to develop the module, if it does not then follow the steps below.

The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.

While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.
