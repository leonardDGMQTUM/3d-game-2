# Jarvis 🎩

A calm, British voice assistant for your computer (Mac, Windows or Linux).

- Say **"Hi Jarvis"** and it wakes up
- Greets you with **the time of day and your local weather**
- Answers out loud in a **calm British voice**
- **Opens your apps** ("open Spotify") and websites ("play lofi on YouTube")
- Uses **your Claude Code login** as its brain, so you don't need an API key

## Setup (one time, about 5 minutes)

1. **Install Python 3.10 or newer** from python.org. On Windows, tick *"Add Python to PATH"*.
2. **Install Claude Code and log in**: open a terminal, run `claude`, and sign in. Then quit it.
   This login is what Jarvis thinks with.
3. **Linux only:** `sudo apt install libportaudio2 libsdl2-mixer-2.0-0`
4. **Start Jarvis:**
   - **Mac / Linux:** `./start.sh`
   - **Windows:** double-click `start.bat`

   The first start installs everything and downloads two small speech models (about 200 MB).
5. **Mac only:** when macOS asks, allow **Microphone** access for your terminal.

## Using it

| Say | What happens |
|---|---|
| "Hi Jarvis" | Chime, then the greeting and weather (the weather greeting plays at most once an hour; otherwise Jarvis just says "Yes?") |
| "Hi Jarvis, open Spotify" | Wakes and opens it straight away |
| "What's a good dinner with chickpeas?" | Claude answers out loud |
| "And something quicker?" | Jarvis remembers the conversation for 30 minutes |
| "Play rain sounds on YouTube" | Opens the website |
| *(say nothing for 8 seconds)* | Low chime, then back to sleep |
| "That's all" / "Thanks" | Goes back to sleep |

## Personalise: edit `config.json`

(It's created on first start.)

- `"name"`: what Jarvis calls you
- `"city"`: e.g. `"Manchester"`. If you leave it blank, Jarvis guesses your town from your internet connection.
- `"voice"`: `en-GB-RyanNeural` (default, calm male), `en-GB-ThomasNeural`, `en-GB-SoniaNeural` (female), `en-GB-LibbyNeural` (female)
- `"claude_model"`: `haiku` answers fastest, `sonnet` is the default, `opus` is the smartest
- `"app_aliases"`: nicknames, e.g. `"browser": "Firefox"`

## Handy commands

```
./start.sh --text          # type instead of talking (good for testing)
./start.sh --say "Hello"   # hear the voice
./start.sh --weather       # check the weather line
./start.sh --list-apps     # apps Jarvis can open
./start.sh --list-mics     # pick a mic, then set "mic_device" to its number
```
(On Windows, use `start.bat` in place of `./start.sh`.)

## How it works

```
mic ─► Vosk (offline) listens for "hi jarvis"
     ─► Whisper (offline) turns your request into text
     ─► "open X"? ──yes──► opens the app directly (instant)
             └─no──► `claude -p` (your login) ─► reply + optional OPEN_APP / OPEN_URL
     ─► Edge neural voice (en-GB) speaks it   (offline voice if no internet)
```

- Your voice is processed **on your computer**. Only the text of your request goes to Claude.
- Jarvis runs Claude in `~/.jarvis` with web search only. It cannot run commands or edit files.

## Troubleshooting

- **It doesn't wake up:** run `--list-mics` and set `mic_device`. Speak "hi Jarvis" clearly with a short pause after it. If it wakes when you didn't call it, that usually means `"require_greeting"` was set to `false`; set it back to `true`.
- **"I'm not signed in to Claude":** run `claude` in a terminal and log in.
- **The voice sounds robotic:** the online voice couldn't connect, so Jarvis used the offline backup voice. Check your internet.
- **It hears itself:** use headphones, or lower the speaker volume.
