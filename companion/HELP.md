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
- Intech Grid fader control with pickup, plus two LED feedbacks (see "Grid additions" below)
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

Current version: 4.0.0-rc1-grid.1 (the official 4.0.0-rc1, plus the Grid additions below)

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
- Can be set by the action: hands that setting over to the **Connection: set settings** action (see "Changing the connection settings from an action" below)

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

This version has a few extras on top of the official module, so a hardware fader (an Intech Grid fader, say) can drive SQ levels without any nasty jumps. Three things: one action, two feedbacks.

### Fader channel level to mix (from value/variable)

Sets an input channel's level in a mix (or LR) from a number or a variable, rather than from a list. Point it at a Grid fader's value and the desk follows the fader.

Options:

- **Input channel**: the channel number as on the desk, e.g. `16`. Default `1`. Want a variable to pick it? Flip the field to an expression, e.g. `$(custom:grid_ch)` (a variable that gives `CH 16` works too).
- **Mix**: `LR` for the main mix, or a mix from the list. Default `LR`. Flip it to an expression to use a variable, e.g. `$(custom:grid_mix)`: it needs to give `LR` or a mix number (`Mix 3` or `Aux 3` work too).
- **Value**: the number to set. Usually a variable, e.g. `$(custom:grid_fader_1_midi_value)`. Blank by default. If it isn't a number, I ignore it and say so in the log.
- **Value is**: how to read the value. Default **Fader position 0-127 (e.g. Grid fader)**.
  - _Fader position 0-127_: follows the SQ's own fader taper, so the hardware fader and the desk fader line up. 0 is -inf, 127 is the top. Anything outside 0 to 127 gets clamped, and fractions are rounded.
  - _Level in dB (-inf, or -90 to +10)_: a level in dB. `-inf`, or anything at -90 or below, is -inf; anything over +10 is +10.
- **Pickup mode**: tick box, off by default. Fader positions only (it's hidden when "Value is" is set to dB). With it on, the fader doesn't touch the desk until it's caught up with the desk's current level. More on that below.

With pickup mode on, four more options appear. Each is a number, or an expression (a variable, say); if an expression gives something that isn't a number, it uses the default.

- **Catch band (± fader steps, of 127)**: how close to the desk level counts as caught. Default `3`. 0 to 64.
- **Dwell time (ms)**: how long the fader has to stay in the catch band before it takes over. Default `1000`. 0 to 10000.
- **Release band (± fader steps, of 127)**: once latched, only a desk-side move bigger than this lets go (the fader itself never does). Default `6`. 0 to 127, and `127` means never let go.
- **Release time (ms)**: how long the desk has to stay outside the release band before it lets go. Default `0` (straight away). 0 to 60000.

A bad channel or mix (say, a variable that's empty) does nothing, and I put a warning in the log, once per bad combination.

### How pickup works

Three stages, a bit like catching a bus:

1. **Waiting**: the fader isn't near the desk level. Nothing is sent to the desk.
2. **Catching**: the fader is inside the catch band around the desk level. Still nothing sent. Stay there for the dwell time and it latches. Leave the band before then (a quick sweep straight through, for instance) and it goes back to waiting.
3. **Tracking**: latched. The level follows the fader from where it is, and stays latched whatever the fader does.

It only lets go when the desk is moved from somewhere else: the desk surface, another controller, a scene recall. That's when the desk level ends up further than the release band from what the fader sent in the last second and a half (so the SQ's own replies to the fader don't count), and stays there for the release time. Then it's back to waiting.

If the desk hasn't reported that level yet, there's nothing to compare against, so the fader just tracks.

### Setting it up with an Intech Grid fader

1. Make a trigger that fires when the Grid fader's value variable changes (for example `custom:grid_fader_1_midi_value`).
2. Give it the **Fader channel level to mix (from value/variable)** action.
3. Set **Input channel** and **Mix** to the channel and mix you want the fader on.
4. Put the same variable in **Value**, e.g. `$(custom:grid_fader_1_midi_value)`, and leave **Value is** on _Fader position 0-127_.
5. Tick **Pickup mode** and tweak the bands and times if the defaults don't suit.
6. For the LED, add the **Grid fader pickup LED** feedback (below) with the same channel, mix and fader value variable.

Screenshots of example triggers coming soon.

### Grid fader pickup LED

A background colour that shows where a pickup fader is up to. It reads the bands the action last used for that channel and mix, so the two always agree.

- **Input channel**, **Mix**: same as the action (and they take expressions the same way). Defaults `1` and `LR`.
- **Fader value**: the fader's value, same as the action's Value, e.g. `$(custom:grid_fader_1_midi_value)`. Blank by default.
- **Below desk level: colour**: while the fader is below the desk level. Default `#ff0000` (red).
- **Below desk level: flash**: default on.
- **Above desk level: colour**: while the fader is above the desk level. Default `#ff0000` (red).
- **Above desk level: flash**: default off.
- **Catching: colour**: while the fader is in the catch band, before it latches. Default `#00ff00` (green).
- **Tracking: colour**: once latched. Brightness follows the fader: off at 0, full at 127. Default `#ffffff` (white).
- **Flash speed (ms per on/off)**: default `250`. 50 to 5000. When it flashes, the "off" half is black.

So, out of the box: flashing red means push the fader up, steady red means pull it down, green means you've nearly got it (hold still), and white means it's yours, getting dimmer as you pull it down.

Colours can be typed as `#ff0000`, `ff0000` or `255,0,0`, or come from a variable.

### Level at target LED

A background colour while a channel's level on the desk is within a band either side of a target dB. Handy for "it's at its mark" lights. One target per feedback: add it a few times for a few targets, and Companion's feedback order decides which one wins.

- **Input channel**, **Mix**: same as the action. Defaults `1` and `LR`.
- **Target (dB, or -inf)**: default `0`. -90 to +10. `-inf` counts as -90. Can be a variable.
- **Band (± dB either side of the target)**: default `0.5`. 0 to 100.
- **Colour**: default `#0000ff` (blue). `#0000ff`, `0,0,255`, or a variable.
- **Flash**: default off.
- **Flash speed (ms per on/off)**: default `250`. 50 to 5000.
- **Flash off colour (blank = show what is underneath)**: blank by default, so the flash shows whatever the button would show without it.

It only lights once the desk has reported that level.

### Upgrading from an earlier Grid version

Coming from 3.1.1-grid.7 (or earlier)? Your buttons and triggers are moved over for you when you update:

- The channel and mix text boxes become the **Input channel** number and the **Mix** list. A plain number or `LR` stays just that; a variable becomes an expression that reads the same variable.
- The pickup bands and times, the LED flash speed and the target band become number fields. A blank one gets its default, as before.
- Earlier Grid versions that used drop-downs are brought along too.

## Changing the connection settings from an action

Every setting on the connection page has a **Can be set by the action** tick next to it. Tick one, save, and that setting is handed over to the **Connection: set settings** action. The field on the connection page is hidden, and in its place it says what the action last set it to. Untick it and you get back whatever you'd typed before you ticked it.

The **Connection: set settings** action only shows the settings that are ticked (nothing ticked: it just says so). Leave a setting blank and it's left as it is. Anything that doesn't make sense is skipped with a warning in the log, and the rest still go through. What each one takes:

- **Target IP**: an IP address, e.g. `192.168.0.5`.
- **Console type**: `SQ5`, `SQ6` or `SQ7`.
- **NRPN fader law**: `LinearTaper` or `AudioTaper` (`Linear Taper` and `Audio Taper` work too).
- **Default talkback input channel**: an input channel number, 1 to 48 (`CH 12` works too).
- **MIDI channel**: 1 to 16.
- **Retrieve console status**: `full`, `delay` or `nosts` (or the names on the connection page, e.g. `Delayed at startup`).
- **Verbose logging**: `on` or `off` (`true`/`false`, `yes`/`no` and `1`/`0` work too).

If nothing actually changes, nothing happens: no saving, no reconnecting. A new IP, model, fader law or MIDI channel reconnects to the desk; the talkback channel, status retrieval and verbose logging just change quietly. So maybe don't swap the IP mid-speech.

### Driving the connection from a variable

1. Tick **Can be set by the action** next to the setting on the connection page (say, **Target IP**) and save.
2. Make a trigger on **variable changed** for your variable, e.g. `custom:sq_ip`.
3. Give it the **Connection: set settings** action, with the variable in the setting, e.g. `$(custom:sq_ip)` in **Target IP**.

Now whatever sets that variable (a button, another trigger, another module) moves the connection with it. Handy for flipping between a main and a spare desk from one button.

## Presets:

### Talkback

This macro preset simulates the native function talkback of SQ, but it works with "channel assign to mix" function in console routing screen. With this preset you'll be able to talk to one specific Mix channel by pressing a button. This preset works with the talkback input channel you set up on instance configuration. Initially, you have to remove the talkback input channel from mix assign on the console.

### Psst. This one's got mates. 🍹

This tweaked SQ module is part of a little crew of Companion modules: some brand new, some old favourites given a good tweak. Want to know who else is in the crew, or grab the freshest version of each one? It's all here: [github.com/nisted/companion-modules](https://github.com/nisted/companion-modules)
