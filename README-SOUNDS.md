# Sound Controls for Clutch Extension

## How the Sound System Works

1. The extension intercepts audio played by the Clutch website
2. It identifies whether the sound is for a match found or party invite notification
3. Depending on user settings, it either:
   - Adjusts the volume of the sound based on user preference
   - Mutes it completely if the sound is disabled

## Controlling Sounds

Users can control notification sounds through the Sound Settings tab in the extension popup. They can:

1. Enable or disable specific notification sounds
2. Adjust the volume of each sound type

## Developer Notes

The sound system works by intercepting the native `Audio` constructor and monitoring for DOM changes that indicate what type of notification is being displayed. This approach avoids having to patch the website's code directly.

If the Clutch website changes how it plays sounds or structures its DOM, the detection logic in `soundControl.ts` may need to be updated.
