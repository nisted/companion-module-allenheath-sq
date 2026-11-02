# Allen & Heath SQ module

Hello. This one runs your Allen & Heath SQ desk from Companion.

## What it can do:

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

## And a few extra tricks:

- Current scene display variable
- Scene recall variable (usable in triggers to respond to scene recalls)
- Current dB Fader Level display variables
- Current Pan level display variables
- Talkback macro
- Scene step increment
- Intech Grid fader control with pickup, plus two LED feedbacks (see "Grid additions" below)

## What's changed, version by version

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

Built from the "SQ Midi Protocol Issue 3 - Firmware v. 1.5.0 or later" manual, every control in it.

Current version: 3.1.1-grid.7

## Setting it up:

### New instance

Once you've added an SQ connection, fill these in:

- Name: whatever you like
- Target IP: where the desk lives on the network. It needs to be on the same network as Companion.
- Model: which SQ you've got
- NRPN Fader Law: must match the MIDI settings on the desk. **Important.**
- Default talkback...: the input channel your talkback mic is plugged into
- MIDI channel: the MIDI channel the desk uses to talk to Companion. **Also important.**
- Retrieve console...: how (and when) I fetch the desk's current status

### Soft keys 9 - 16 on SQ5

Soft keys 9 to 16 on an SQ5 have to be set up in the MixPad app. Once they're done, the desk remembers them until you set them up again or reset the console. Changing scenes can wipe them, so set "block" in the Scenes Global Filter to keep them safe.

## How to:

### Scene step and current scene display

"Scene step" takes a value between -50 and 50, so you can step forwards or backwards through scenes.

"Current scene" puts the desk's current scene into a Companion variable (from version 1.3.0), and you can use it in any button's text. It updates on the first scene change, whether that's made on the SQ or from Companion. If your desk starts on a scene other than 1, put that number in the button's option, then press the button once to set your starting scene.

To show it on a button, type <b>$(</b> in the button text and Companion will list the SQ variables. Pick "Scene - Current" (or just type <b>$(SQ:currentScene)</b>).

### Fader step increment

When you set up a fader level, the two step choices sit right at the top of the level drop-down.

### Displaying fader level (dB Level)

Since version 1.3.0 each fader's dB level is a variable. Like the current scene, you can use it in any button's text, and it updates every time the level changes on the desk (or from Companion). Start typing <b>$(</b> in the button text, Companion lists the SQ variables, and you pick the level you want. For more than one line of text, use <b>\n</b> for a new line.

Example: showing the dB level (-2) of channel 1 (Mic) to LR

Mic\n$(SQ:level_64_0) dB

and the button shows:

     Mic
    -2 dB

You can put a Mute for channel 1 on the same button too, if you fancy.

### Last dB value

Put this on the release action of a Fader Level and the fader goes back to whatever it was before.

Example: the fader's at +2 dB and you want to dip it to -20 dB just while the button's held. Set the Press / On fader level to "-20 dB" and the Release / Off fader level to "Last dB value". Press: down to -20 dB. Let go: back to +2 dB.

### Fading

Any fader level can fade to its target instead of jumping. Pick a fade time between 1 and 3 seconds.

### Pan display level

When you set up a button with one of the Pan actions, you'll see a read-only option showing the variable name to use in the button text for the Pan/Balance value. Once you've picked the input and destination, press the button once to refresh the value before you use it.

## Grid additions

This version has a few extras on top of the official module, so a hardware fader (an Intech Grid fader, say) can drive SQ levels without any nasty jumps. Three things: one action, two feedbacks.

### Fader channel level to mix (from value/variable)

Sets an input channel's level in a mix (or LR) from a number or a variable, rather than from a list. Point it at a Grid fader's value and the desk follows the fader.

Options:

- **Input channel**: the channel number as on the desk, e.g. `16` (`CH 16` works too). Default `1`. Can be a variable, e.g. `$(custom:grid_ch)`.
- **Mix**: `LR` for the main mix, or an aux/mix number, e.g. `3` (`Mix 3` or `Aux 3` work too). Default `LR`. Can be a variable, e.g. `$(custom:grid_mix)`.
- **Value**: the number to set. Usually a variable. Blank by default. If it isn't a number, I ignore it and say so in the log.
- **Value is**: how to read the value. Default **Fader position 0-127 (e.g. Grid fader)**.
  - *Fader position 0-127*: follows the SQ's own fader taper, so the hardware fader and the desk fader line up. 0 is -inf, 127 is the top. Anything outside 0 to 127 gets clamped, and fractions are rounded.
  - *Level in dB (-inf, or -90 to +10)*: a level in dB. `-inf`, or anything at -90 or below, is -inf; anything over +10 is +10.
- **Pickup mode**: tick box, off by default. Fader positions only (it's hidden when "Value is" is set to dB). With it on, the fader doesn't touch the desk until it's caught up with the desk's current level. More on that below.

With pickup mode on, four more options appear. Each takes a number or a variable; leave one blank (or put in something that isn't a number) and it uses the default.

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
4. Put the same variable in **Value**, e.g. `$(custom:grid_fader_1_midi_value)`, and leave **Value is** on *Fader position 0-127*.
5. Tick **Pickup mode** and tweak the bands and times if the defaults don't suit.
6. For the LED, add the **Grid fader pickup LED** feedback (below) with the same channel, mix and fader value variable.

Screenshots of example triggers coming soon.

### Grid fader pickup LED

A background colour that shows where a pickup fader is up to. It reads the bands the action last used for that channel and mix, so the two always agree.

- **Input channel**, **Mix**: same as the action. Defaults `1` and `LR`.
- **Fader value**: the fader's value, same as the action's Value. Blank by default.
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
- **Target (dB, or -inf)**: default `0`. -90 to +10. `-inf` counts as -90.
- **Band (± dB either side of the target)**: default `0.5`.
- **Colour**: default `#0000ff` (blue). `#0000ff`, `0,0,255`, or a variable.
- **Flash**: default off.
- **Flash speed (ms per on/off)**: default `250`. 50 to 5000.
- **Flash off colour (blank = show what is underneath)**: blank by default, so the flash shows whatever the button would show without it.

It only lights once the desk has reported that level.

### Upgrading from an earlier Grid version

Earlier Grid versions picked the channel and mix from drop-downs. Those are moved into the new text boxes for you when you update, so your buttons and triggers keep working.

## Presets:

### Talkback

This preset copies the SQ's own talkback, but does it with "channel assign to mix" on the desk's routing screen. Press a button and you're talking to one particular aux. It uses the talkback input channel you set on the connection page. One thing first: take that talkback channel out of the mix assigns on the desk.

### Psst. This one's got mates. 🍹

This tweaked SQ module is part of a little crew of Companion modules: some brand new, some old favourites given a good tweak. Want to know who else is in the crew, or grab the freshest version of each one? It's all here: [github.com/nisted/companion-modules](https://github.com/nisted/companion-modules)
