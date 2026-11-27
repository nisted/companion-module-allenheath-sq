SQ Rebel: the official Allen & Heath SQ module 4.0.0-rc1, plus the Rebel additions. Pre-release.

**Don't switch a connection on the official 4.0 module over to this one** (upgrade script order). Connections on 3.1.0, 3.1.1-grid.7 or 4.0.0-rc1-grid.1 are fine.

New in 4.0.0-rc1-grid.2

- **Intech Grid presets**, per Grid slot: a rotary that picks a channel (turn) and a mix (press, then turn), a fader with pickup and its LED, and a follow-the-selected-channel button. Grid slots are channel + mix pairs kept by the module, with variables and actions of their own.
- **Channel and mix lists** on the Grid action and LED feedbacks, with the desk's channel names. Typed values and expressions still work.
- **LED looks**: every LED state has the same options (effect: solid, flash, alternate, pulse or fade; colour pickers; rate), a switch that shows them, speed-up as the Grid fader gets close to the desk fader, and an own look for "released" (the desk moved the fader away), above and below.
- **A&H remote link** (TCP 51326, the port SQ MixPad uses) alongside MIDI: channel names, the selected channel, and preamp gain, 48V, pad, trim, polarity, HPF, gate, compressor, PEQ, delay, insert and PAFL on every input channel, as actions, feedbacks, variables and presets. Can be set to read only, or off.
- **Action recorder**: mutes and channel levels changed on the desk, and processing changes over the A&H remote link.
- **Set connection settings**: the new pattern. No ticks; anything the action sets shows on the connection page with a Change back tick.
- Connection field labels back to the official module's, plain tooltips, ports shown on the connection page.
- Upgrade scripts carry over old LED colours and flashes, ticked settings, and Set connection settings buttons.

The A&H remote port is undocumented. Its details come from Remora (Stoatworks Labs) and allen-heath-sq-tools (Hannes Rüger), both MIT licensed.
