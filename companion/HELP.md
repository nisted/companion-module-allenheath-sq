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

Last update (d/m/y): 05/10/2021

Current version: 1.3.9

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

## Presets:

### Talkback

This preset copies the SQ's own talkback, but does it with "channel assign to mix" on the desk's routing screen. Press a button and you're talking to one particular aux. It uses the talkback input channel you set on the connection page. One thing first: take that talkback channel out of the mix assigns on the desk.

### Psst. This one's got mates. 🍹

This tweaked SQ module is part of a little crew of Companion modules: some brand new, some old favourites given a good tweak. Want to know who else is in the crew, or grab the freshest version of each one? It's all here: [github.com/nisted/companion-modules](https://github.com/nisted/companion-modules)
