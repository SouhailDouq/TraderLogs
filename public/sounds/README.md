# Alert Sound Setup

## Overview
The portfolio monitor plays an alert sound when a stock crosses the -10% critical threshold for the first time.

## Sound File
Place an MP3 file named `alert.mp3` in this directory (`/public/sounds/alert.mp3`).

## Fallback
If no custom sound file is found, the system will automatically generate a beep sound using the Web Audio API.

## Recommended Alert Sound
You can use any alert sound you prefer. Here are some free options:
- Download from: https://freesound.org/
- Search for: "alert", "alarm", "warning"
- Format: MP3
- Duration: 1-3 seconds recommended

## Testing
To test the alert sound:
1. Open the Portfolio Monitor page
2. Wait for a stock to cross -10% threshold
3. You should hear the alert sound and see a prominent red notification

## Note
The browser may block autoplay on first visit. If you don't hear the sound, interact with the page first (click anywhere) to enable audio playback.
