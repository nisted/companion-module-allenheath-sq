# Allen & Heath SQ module

Controls the Allen & Heath SQ.

## Functions:

- Mute Channel, Group, Mix, FX, MuteGroup, DCA, Matrix
- Fader Level
- Panning, Balance Level
- Soft Keys
- Soft Rotary (SQ6/SQ7 - no referring in this version)
- Recall Scene
- Assign channel to Mix, Group, FX send
- Assign group to Mix, FX send, Matrix
- Assign FX return to Mix, Group, FX send
- Assign Mix to Matrix

## Special Functions:

- Current scene display variable
- Scene recall variable (usable in triggers to respond to scene recalls)
- Current dB Fader Level display variables
- Current Pan level display variables
- Talkback macro
- Scene step increment
- Intech Grid fader control with pickup, LED feedbacks and ready-made presets (see "Grid additions" below)
- Channel names, the selected channel and channel processing (preamp, HPF, gate, compressor, PEQ, delay, insert, PAFL) over the A&H remote link (see "A&H remote link" below)
- Action recorder support for changes made on the desk
- Connection settings changed from a button, a trigger or a variable (see "Changing the connection settings from an action" below)

New in v.3.0.0

- Fix scene recalling if the mixer MIDI channel isn't 1
- Add Step +/-0.1dB choices for setting signal levels
- Permit setting signal levels between -85dB and -40dB
- Make setting signal level to +10dB work
- Make assigning the LR mix to matrixes work correctly
- Allow setting the pan/balance of matrix 3 used as an output
- Make setting the pan/balance of LR in a matrix work
- Add an action to make active/inactive an FX return in LR/mixes
- Define pan/balance variables on-demand as pan/balance change messages are sent by the mixer
- Restart module instances in response to configuration changes only if absolutely required
- Add a `sceneRecalledTrigger` variable whose value changes every time a scene is recalled, suitable for use in triggers
- Ensure output pan/balance variables are appropriately changed when an output pan/balance is changed in the mixer

New in v.2.0.0 (not released)

- Convert to Companion v3 format

New in v.1.1.0

- Add listener for MIDI inbound data
- Add function to auto-set button status from status of the mute button on SQ
  (first MIDI data from console send all mute status to Companion)

New in v.1.2.0

- Add feedback for all "mute" actions

New in v.1.2.3

- Add presets for "mute" actions and "talkback"

New in v.1.2.5

- Add scene step and current scene display

New in v.1.2.6

- Improved code
- Add fader step increment
- Add fader level dB get

New in v.1.2.7

- Improved TCP connection
- Fix dB value display

New in v.1.3.0

- Change Mute logics
- Change dB Fader Level logics
- Add Current Scene variable
- Add all dB Fader Level variables
- New presets
- Improved receiving data function
- Cleaning the code

New in v.1.3.1

- Beautify code
- Fix level variables

New in v.1.3.2

- Fix DCA level output

New in v.1.3.3

- Add "Last dB value"
- Add fading option

New in v.1.3.4

- Improve fader level
- Improve pan level
- Improve fading
- Add Pan step increment
- Add Pan level variables

New in v.1.3.5

- Improve dB level
- Add MIDI channel configuration
- Add Retrieve status configuration

New in v.1.3.6

- Converted code to new upgrade script

New in v.1.3.7

- Corrected sqconfig.json
- Corrected status request
- Add missing upgrade script for 1.3.5

New in v.1.3.8

- Fix issue #25

New in v.1.3.9

- Fix issue #28
- Fix issue #31
- Corrected some stuff

Created by referring to all controls in the "SQ Midi Protocol Issue 3 - Firmware v. 1.5.0 or later" manual.

Current version: 4.0.0-rc1-grid.2 (the official 4.0.0-rc1, plus the SQ Rebel additions below)

New in 4.0.0-rc1-grid.2

- Grid presets: a rotary that picks a channel and a mix, a fader with pickup and its LED, and a follow-the-selected-channel button, for each Grid slot
- Channel and mix are lists on the Grid action and LED feedbacks, showing the desk's channel names; you can still type a value or use an expression
- LED looks: every LED state has the same set of options (effect, colours by colour picker, rate), plus speed-up as the fader gets close and a look of its own for "released"
- The A&H remote link (TCP 51326): channel names, the selected channel, and channel processing actions, feedbacks, variables and presets
- Action recorder: mutes and channel levels changed on the desk, and processing changes over the A&H remote link
- The new **Set connection settings** pattern: no ticks on the connection page; anything the action sets shows there with a **Change back** tick
- Connection field labels back to the official module's; the port numbers are shown on the connection page

## Configuring:

### New instance

First step after adding SQ instance is to setting it up:

- Name: the name you want
- Target IP: IP to reach your SQ (needs on the same net)
- Model: your SQ model
- NRPN Fader Law: same as your MIDI configuration on console !! IMPORTANT !!
- Default talkback...: channel number where is connected your talkback microphone
- MIDI channel: MIDI channel used to communicate with SQ !! IMPORTANT !!
- Retrieve console...: Modality to retrieve console status
- A&H remote link (port 51326): channel names, the selected channel and channel processing (see "A&H remote link" below). On by default
- Allow changes over the A&H remote link: lets actions change processing. Off = read only. On by default
- Grid slots: how many Grid slots there are (see "Grid slots" below). Default 8

Ports: TCP 51325 (MIDI over TCP/IP, fixed by the desk), and TCP 51326 when the A&H remote link is on.

### Soft keys 9 - 16 on SQ5

To configure soft keys 9 - 16 on SQ5 you have to use MixPad application. After initially configuration, all settings will be stored in SQ memory until next configuration or console reset. To avoid deleting the soft key configuration when change scene, set "block" in Scenes Global Filter.

## How to:

### Scene step and current scene display

"Scene step" admits a value between -50 and 50 in order to create forward and rewind scene call.
"Current scene" set the current scene of your console to Companion into a variable (from version 1.3.0) then you'll be able to use it on any button text field. The value of the variable will be updating on first scene change performed by SQ or Companion. If your console starts with a scene other than 1, set the number in the option of the button, the press that button to setting up your starts current scene. To recall the variable on a button, type on button text field <b>$(</b> and Companion show you a list of SQ variables, then select "Scene - Current" (or digit <b>$(SQ:currentScene)</b>).

### Fader step increment

There are two specific values on level drop-down menu (at the top) when you configuring fader level.

### Displaying fader level (dB Level)

From version 1.3.0 fader dB level being a variable. Like the current scene variable, you you'll be able to use it on any button text field and the value will be updating on every level change on the console (or via Companion). To use the variable, start typing <b>$(</b> on button text field and Companion show you a list of SQ variables, then select a level dB you want. If you want to use multi-line text, using <b>\n</b> for a new line.

Example: Showing up a dB fader level (-2) from channel 1 (Mic) to LR

Mic\n$(SQ:level_64_0) dB

the button show on display:

     Mic
    -2 dB

On same button, if you want, you can attach a Mute function for channel 1.

### Last dB value

This option set at the release action of a Fader Level allows you to return to the last dB value level of that fader.
Example: If the fader level was +2 dB and you want to momentarily set it to -20 dB, set the Press / On action fader level option to "-20 dB", then the Release / Off action of the fader level option to "Last dB value". When the button is pressed the level drops to -20 dB and when the button is released the level returns to +2 dB.

### Fading

This option available on any fader level allow you to reach set dB fader level using fading in/out mode. The speed of the fader route is selectable between 1 and 3 seconds.

### Pan display level

When configuring a button with one of the Pan functions appear an only read option that shows name of variable to use on button text to show up value of Pan/Balance. After select option for input and destination you need to press configuring button once to refresh variable value before use it.

## Grid additions

This version has a few extras on top of the official module, so a hardware fader (an Intech Grid fader, say) can drive SQ levels without any nasty jumps: one action, two LED feedbacks, the Grid slots, and presets that put it all together.

### The quick way: Grid presets

Look in **Presets > Intech Grid: slots**. Each Grid slot (see below) has three:

- **Pick channel and mix (rotary)**: turn it to pick the channel. Press it, and turning picks the mix (LR, Mix 1 and so on). Press again to go back to channels. Red background = picking the channel, blue = picking the mix, yellow text = the slot is following the desk's selected channel.
- **Fader with pickup**: drop it on a Grid fader. It drives the slot's channel in the slot's mix, with pickup, and the LED shows where it's up to. The button shows the channel, the mix and the level.
- **Follow the selected channel**: press to make the slot follow whatever's selected (SEL) on the desk, and again to stop. Lit while it's following. Needs the A&H remote link.

Two things to set up on the Grid surface's settings page, once:

1. Link each Grid fader's value variable to a custom variable called `grid_fader_N_midi_value`, where N is the slot number (so fader 1 is `custom:grid_fader_1_midi_value`). The fader preset reads that.
2. Set **Fader value update interval (ms)** to `0`, and **Fader/pot movement per rotate step** to `1`. The fader preset runs on every rotate step, and reads the value as it does, so the value has to be there first.

Prefer a trigger instead? That still works: see "Setting it up with a trigger" below.

### Grid slots

A Grid slot is a channel and a mix, kept by the module so the rotary and the fader can share them (presets can't make custom variables, so the module keeps its own). The number of slots is set on the connection page. Slots are remembered through restarts.

Variables for each slot, e.g. for slot 1:

- `$(SQ:grid1_channel)`: the channel number. `$(SQ:grid1_channel_name)`: its name from the desk. `$(SQ:grid1_channel_label)`: both, e.g. `CH 3 Kick`.
- `$(SQ:grid1_mix)`: `LR` or the mix number. `$(SQ:grid1_mix_label)`: e.g. `Mix 3`.
- `$(SQ:grid1_follow)`: true while it follows the selected channel.

Actions:

- **Grid slot: set channel and mix**: either can be "Leave as is". The channel can be "Selected on the desk".
- **Grid slot: step channel or mix**: `+1` for the next, `-1` for the previous, wrapping round.
- **Grid slot: follow the selected channel**: on, off or toggle.

Feedback: **Grid slot: follows the selected channel**.

### Fader channel level to mix (from value/variable)

Sets an input channel's level in a mix (or LR) from a number or a variable, rather than from a list. Point it at a Grid fader's value and the desk follows the fader.

Options:

- **Input channel**: a list of the desk's channels, with their names when the A&H remote link has them. Default `CH 1`. You can type a number instead (`16`, or `CH 16`), or flip the field to an expression, e.g. `$(custom:grid_ch)` or `$(SQ:grid1_channel)`.
- **Mix**: a list (LR, Mix 1 and so on). Default `LR`. You can type `LR` or a mix number (`Mix 3` and `Aux 3` work too), or flip it to an expression, e.g. `$(SQ:grid1_mix)`.
- **Value**: the number to set. Usually a variable, e.g. `$(custom:grid_fader_1_midi_value)`. Blank by default. If it isn't a number, it's ignored and logged.
- **Value is**: how to read the value. Default **Fader position 0-127 (e.g. Grid fader)**.
  - _Fader position 0-127_: follows the SQ's own fader taper, so the hardware fader and the desk fader line up. 0 is -inf, 127 is the top. Anything outside 0 to 127 gets clamped, and fractions are rounded.
  - _Level in dB (-inf, or -90 to +10)_: a level in dB. `-inf`, or anything at -90 or below, is -inf; anything over +10 is +10.
- **Pickup mode**: off by default. Fader positions only (it's hidden when "Value is" is set to dB). With it on, the fader doesn't touch the desk until it's caught up with the desk's current level. More on that below.

With pickup mode on, four more options appear. Each is a number, or an expression (a variable, say); if an expression gives something that isn't a number, it uses the default.

- **Catch band (± fader steps, of 127)**: how close to the desk level counts as caught. Default `3`. 0 to 64.
- **Dwell time (ms)**: how long the fader has to stay in the catch band before it takes over. Default `1000`. 0 to 10000.
- **Release band (± fader steps, of 127)**: once latched, only a desk-side move bigger than this lets go (the fader itself never does). Default `6`. 0 to 127, and `127` means never let go.
- **Release time (ms)**: how long the desk has to stay outside the release band before it lets go. Default `0` (straight away). 0 to 60000.

A bad channel or mix (say, a variable that's empty) does nothing, with a warning in the log, once per bad combination.

### How pickup works

Three stages, a bit like catching a bus:

1. **Waiting**: the fader isn't near the desk level. Nothing is sent to the desk.
2. **Catching**: the fader is inside the catch band around the desk level. Still nothing sent. Stay there for the dwell time and it latches. Leave the band before then (a quick sweep straight through, for instance) and it goes back to waiting.
3. **Tracking**: latched. The level follows the fader from where it is, and stays latched whatever the fader does.

It only lets go when the desk is moved from somewhere else: the desk surface, another controller, a scene recall. That's when the desk level ends up further than the release band from what the fader sent in the last second and a half (so the SQ's own replies to the fader don't count), and stays there for the release time. Then it's back to waiting, but **released**: the LED can show that differently from "never caught", so you know someone moved it.

If the desk hasn't reported that level yet, there's nothing to compare against, so the fader just tracks.

### Setting it up with a trigger

1. Make a trigger that fires when the Grid fader's value variable changes (for example `custom:grid_fader_1_midi_value`).
2. Give it the **Fader channel level to mix (from value/variable)** action.
3. Pick the **Input channel** and **Mix** (or use a Grid slot's variables, `$(SQ:grid1_channel)` and `$(SQ:grid1_mix)`).
4. Put the same variable in **Value**, e.g. `$(custom:grid_fader_1_midi_value)`, and leave **Value is** on _Fader position 0-127_.
5. Turn on **Pickup mode** and tweak the bands and times if the defaults don't suit.
6. For the LED, add the **Grid fader pickup LED** feedback (below) to the fader's button with the same channel, mix and fader value variable.

### LED looks

Both LED feedbacks use the same set of options for every LED state. Each state has a **customise** switch:

- **Off**: the state's default look (below).
- **On**: the options appear:
  - **effect**: _Solid_ (colour 1), _Flash_ (colour 1 and colour 2 in turn), _Alternate colours_ (steps through 2 to 4 colours), _Pulse_ (swells smoothly between colour 1 and colour 2) or _Fade through colours_ (crossfades smoothly through 2 to 4 colours).
  - **number of colours**: 2, 3 or 4 (alternate and fade).
  - **colour 1 to 4**: colour pickers. Flip one to an expression to use a variable: `#ff0000`, `ff0000`, `255,0,0`, `rgb(255,0,0)` or a Companion colour number all work.
  - **rate (ms)**: per flash half, per colour step, per swell or per crossfade. 40 to 10000.
  - **off half shows the button underneath** (flash only): the off half shows whatever the button would show without this feedback, instead of colour 2.
  - **speed up as the Grid fader gets closer** (waiting states only): the effect runs faster the closer the Grid fader gets to the desk fader. Set the **fastest rate** (right next to the desk fader) and how close it has to be to **start speeding up** (fader steps, of 127).

The switches that show and hide options can't take an expression: Companion's show/hide rules only read fields without one.

### Grid fader pickup LED

A background colour that shows where a pickup fader is up to. It reads the bands the action last used for that channel and mix, so the two always agree.

- **Input channel**, **Mix**: same as the action (lists, typed values or expressions). Defaults `CH 1` and `LR`.
- **Fader value**: the fader's value, same as the action's Value, e.g. `$(custom:grid_fader_1_midi_value)`. Blank by default.
- The LED states, each with the standard look options:
  - **Below desk level**: default red, flashing every 250 ms.
  - **Above desk level**: default solid red.
  - **Released, below desk level** and **Released, above desk level**: the desk fader was moved away and the Grid fader is no longer latched. Their switch is **own look**: off shows them with the below / above look; on gives them their own (alternating red and blue to start with).
  - **Catching**: default solid green.
  - **Tracking**: default solid white.
- **Tracking: brightness follows the fader**: on by default. Off at 0, full at 127.

So, out of the box: flashing red means push the fader up, steady red means pull it down, green means you've nearly got it (hold still), and white means it's yours, getting dimmer as you pull it down.

### Level at target LED

A background colour while a channel's level on the desk is within a band either side of a target dB. Handy for "it's at its mark" lights. One target per feedback: add it a few times for a few targets, and Companion's feedback order decides which one wins.

- **Input channel**, **Mix**: same as the action. Defaults `CH 1` and `LR`.
- **Target (dB, or -inf)**: default `0`. -90 to +10. `-inf` counts as -90. Can be a variable.
- **Band (± dB either side of the target)**: default `0.5`. 0 to 100.
- **At target**: the standard look options. Default solid blue.

It only lights once the desk has reported that level.

### Upgrading from an earlier Grid version

Your buttons and triggers are moved over for you when you update:

- From grid.1: the LED colours and flashes become the new looks. Anything still at its old default stays on the default look; anything you'd changed becomes a customised look that matches it (colours from variables become expressions that read the same variables). A blank "flash off colour" on the level-at-target LED becomes "off half shows the button underneath".
- From 3.1.1-grid.7 (or earlier): the channel and mix text boxes become the **Input channel** and **Mix** lists. A plain number or `LR` stays just that; a variable becomes an expression that reads the same variable. The pickup bands and times, the LED flash speed and the target band become number fields; a blank one gets its default, as before. Earlier Grid versions that used drop-downs are brought along too.

## A&H remote link

Alongside the MIDI connection (TCP 51325), the module also connects to TCP **51326**: the port SQ MixPad uses. Allen & Heath don't document it, so this is built from other people's careful listening (Remora and allen-heath-sq-tools, both MIT licensed). The details were captured from SQ-5s; other models and firmware should work the same, but if the desk lays things out differently, the bits that can't be read stay blank and say so in the log. Either way, everything on MIDI keeps working.

The desk takes several apps at once (SQ MixPad, Mixing Station and so on), so it should sit alongside them.

What it adds:

- **Channel names**: `$(SQ:ch_name_1)` to `$(SQ:ch_name_48)`, `$(SQ:lr_name)`, and in the channel lists everywhere in the Grid and processing actions. They follow renames on the desk.
- **The selected channel**: `$(SQ:selected_channel)` and `$(SQ:selected_name)`, the **Channel is selected on the desk** feedback, and "Selected on the desk" in every channel list.
- **Channel processing** on every input channel: preamp gain, 48V, pad, trim, polarity, HPF on and frequency, gate, compressor, PEQ, delay on and time, insert and PAFL.
  - Actions: **Channel processing: switch** (on, off or toggle) and **Channel processing: value** (set, up by or down by; up and down are made for rotaries).
  - Feedbacks: **Channel processing: is on**, plus **Channel processing: value** and **Channel name** for button text through local variables.
  - Variables: `$(SQ:ch16_gain)`, `$(SQ:ch16_hpfFreq)`, `$(SQ:ch16_phantom)` (on/off) and so on, and the same for whatever's selected: `$(SQ:sel_gain)`.
  - Presets in **Channel processing (A&H remote link)**: a switch button or a rotary for each, for the selected channel or any input channel. The rotaries work on Grid pots and encoders, and Stream Deck dials.
- `$(SQ:ah_link)`: `live`, `connecting`, `down` or `off`.

Mix names aren't read yet: the desk numbers its mixes by type (aux or group) and which mix is which depends on how it's set up, so the lists show `Mix 1` and so on.

Switch **Allow changes over the A&H remote link** off on the connection page and it only reads: names, selection and values still come through, and processing actions just log that they're not allowed.

## Action recorder

Start Companion's action recorder and change things on the desk:

- Mutes become the matching mute action (on or off).
- Input channel levels in LR or a mix become **Fader channel level to mix (from value/variable)** in dB. A fader move records where it stopped.
- Processing changed on the desk (over the A&H remote link) becomes **Channel processing: switch** or **Channel processing: value**.

Button presses from Companion itself come back from the desk too, so they get recorded as well.

## Changing the connection settings from an action

The **Set connection settings** action can change any setting on the connection page. Leave a setting blank and it's left as it is. Anything that doesn't make sense is skipped with a warning in the log, and the rest still go through.

Once the action has set something, the connection page shows its value (marked _set by an action_) in place of the field, with a **Change back** tick beside it. Tick **Change back** and save to go back to whatever was typed there before. Until then, saving the connection page doesn't change it.

What each one takes:

- **Target IP**: an IP address, e.g. `192.168.0.5`.
- **Console Type**: `SQ5`, `SQ6` or `SQ7`.
- **NRPN Fader Law**: `LinearTaper` or `AudioTaper` (`Linear Taper` and `Audio Taper` work too).
- **Default talkback input channel**: an input channel number, 1 to 48 (`CH 12` works too).
- **MIDI channel**: 1 to 16.
- **Retrieve console status**: `full`, `delay` or `nosts` (or the names on the connection page, e.g. `Delayed at startup`).
- **Enable Verbose Logging**, **A&H remote link**, **Allow changes over the A&H remote link**: `on` or `off` (`true`/`false`, `yes`/`no` and `1`/`0` work too).
- **Grid slots**: 1 to 32.

If nothing actually changes, nothing happens: no saving, no reconnecting. A new IP, model, fader law, MIDI channel, A&H remote link setting or number of Grid slots reconnects to the desk; the rest just change quietly. So maybe don't swap the IP mid-speech.

Coming from grid.1? Settings that were ticked "Can be set by the action" become ones the action has set, and old **Set connection settings** buttons get every setting (blank, so left alone).

### Driving the connection from a variable

1. Make a trigger on **variable changed** for your variable, e.g. `custom:sq_ip`.
2. Give it the **Set connection settings** action, with the variable in the setting, e.g. `$(custom:sq_ip)` in **Target IP**.

Now whatever sets that variable (a button, another trigger, another module) moves the connection with it. Handy for flipping between a main and a spare desk from one button.

## Presets:

### Talkback

This macro preset simulates the native function talkback of SQ, but it works with "channel assign to mix" function in console routing screen. With this preset you'll be able to talk to one specific Mix channel by pressing a button. This preset works with the talkback input channel you set up on instance configuration. Initially, you have to remove the talkback input channel from mix assign on the console.

### Psst. This one's got mates. 🍹

SQ Rebel is part of a little crew of Companion modules: some brand new, some old favourites given a good tweak. Want to know who else is in the crew, or grab the freshest version of each one? It's all here: https://github.com/nisted/companion-modules
