#!/usr/bin/env python3
"""
Jarvis - a calm, British voice assistant for your computer.

  * Wakes when you say "Hi Jarvis" (offline wake word via Vosk)
  * Greets you with the local weather (Open-Meteo, no API key)
  * Speaks in a calm British voice (Microsoft Edge neural TTS, offline fallback)
  * Opens your apps ("open Spotify", "launch the calculator")
  * Thinks with Claude through your Claude Code login (`claude -p`)

Run:  python jarvis.py            (voice mode)
      python jarvis.py --text     (type instead of talk - handy for testing)
      python jarvis.py --help
"""
from __future__ import annotations

import argparse
import asyncio
import difflib
import glob
import json
import os
import platform
import queue
import random
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
HOME_DIR = Path.home() / ".jarvis"
OS = platform.system()  # "Darwin", "Windows", "Linux"
SAMPLE_RATE = 16000

DEFAULT_CONFIG = {
    "name": "",                    # what Jarvis calls you, e.g. "Leonard". Blank = no name.
    "city": "",                    # weather location, e.g. "London". Blank = guess from your IP.
    "units": "celsius",            # "celsius" or "fahrenheit"
    "voice": "en-GB-RyanNeural",   # calm British male. Try en-GB-ThomasNeural or en-GB-SoniaNeural
    "speech_rate": "-5%",          # slightly slower = calmer
    "claude_model": "sonnet",      # any `claude --model` alias: haiku (fastest), sonnet, opus
    "claude_tools": "WebSearch",   # tools Jarvis's brain may use. "" = none (fastest)
    "memory_minutes": 30,          # forget the conversation after this long idle
    "wake_word": "jarvis",
    "require_greeting": True,      # need "hi/hey" before "jarvis" (fewer false wakes)
    "greet_cooldown_minutes": 60,  # weather greeting at most this often; otherwise "Yes?"
    "follow_up_seconds": 8,        # keep listening this long for a follow-up question
    "whisper_model": "base.en",    # speech-to-text for commands: tiny.en / base.en / small.en
    "mic_device": None,            # None = system default. See: python jarvis.py --list-mics
    "app_aliases": {               # spoken name -> real app name
        "browser": "Google Chrome",
        "music": "Spotify",
        "notes": "Notes",
    },
}


def log(*a):
    print(*a, flush=True)


def load_config() -> dict:
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))
    path = HERE / "config.json"
    if path.exists():
        try:
            user = json.loads(path.read_text(encoding="utf-8"))
            cfg.update({k: v for k, v in user.items() if not k.startswith("_")})
        except Exception as e:
            log(f"[config] couldn't read config.json ({e}); using defaults")
    return cfg


def http_json(url: str, timeout: float = 6.0):
    req = urllib.request.Request(url, headers={"User-Agent": "jarvis-voice-assistant"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


# --------------------------------------------------------------------------- weather
WMO = {
    0: "clear skies", 1: "mostly clear skies", 2: "partly cloudy skies", 3: "overcast skies",
    45: "fog", 48: "freezing fog", 51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
    56: "freezing drizzle", 57: "heavy freezing drizzle", 61: "light rain", 63: "rain",
    65: "heavy rain", 66: "freezing rain", 67: "heavy freezing rain", 71: "light snow",
    73: "snow", 75: "heavy snow", 77: "snow grains", 80: "light showers", 81: "showers",
    82: "violent showers", 85: "snow showers", 86: "heavy snow showers",
    95: "thunderstorms", 96: "thunderstorms with hail", 99: "severe thunderstorms with hail",
}


class Weather:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.place = None  # (lat, lon, name)

    def locate(self):
        if self.place:
            return self.place
        city = (self.cfg.get("city") or "").strip()
        if city:
            q = urllib.parse.quote(city)
            d = http_json(f"https://geocoding-api.open-meteo.com/v1/search?name={q}&count=1")
            r = d["results"][0]
            self.place = (r["latitude"], r["longitude"], r["name"])
        else:
            try:
                d = http_json("https://ipinfo.io/json")
                lat, lon = d["loc"].split(",")
                self.place = (float(lat), float(lon), d.get("city") or "your area")
            except Exception:
                d = http_json("https://ipapi.co/json/")
                self.place = (d["latitude"], d["longitude"], d.get("city") or "your area")
        return self.place

    def fetch(self) -> dict:
        lat, lon, _ = self.locate()
        unit = "fahrenheit" if str(self.cfg.get("units", "")).lower().startswith("f") else "celsius"
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m"
            "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max"
            f"&timezone=auto&forecast_days=1&temperature_unit={unit}&wind_speed_unit=mph"
        )
        return http_json(url)

    def sentence(self, data: dict | None = None) -> str:
        data = data or self.fetch()
        place = self.place[2] if self.place else "your area"
        c, d = data["current"], data["daily"]
        t = round(c["temperature_2m"])
        feels = round(c["apparent_temperature"])
        sky = WMO.get(int(c["weather_code"]), "changeable weather")
        hi, lo = round(d["temperature_2m_max"][0]), round(d["temperature_2m_min"][0])
        rain = d.get("precipitation_probability_max", [None])[0]
        s = f"It's currently {t} degrees in {place}, with {sky}"
        if abs(feels - t) >= 3:
            s += f", though it feels more like {feels}"
        s += f". Expect a high of {hi} and a low of {lo}"
        if rain is not None and rain >= 30:
            s += f", with a {round(rain)} percent chance of rain, so perhaps take an umbrella"
        wind = c.get("wind_speed_10m") or 0
        if wind >= 20:
            s += f". It's rather windy, around {round(wind)} miles an hour"
        return s + "."


def part_of_day(now: datetime | None = None) -> str:
    h = (now or datetime.now()).hour
    return "morning" if 5 <= h < 12 else "afternoon" if 12 <= h < 18 else "evening"


# --------------------------------------------------------------------------- apps
class Apps:
    """Finds and opens installed applications on macOS, Windows and Linux."""

    def __init__(self, cfg: dict):
        self.aliases = {k.lower(): v for k, v in (cfg.get("app_aliases") or {}).items()}
        self.apps: dict[str, object] = {}  # display name -> launcher info
        try:
            self.apps = self._index()
        except Exception as e:
            log(f"[apps] couldn't list apps: {e}")

    # ---- indexing
    def _index(self):
        if OS == "Darwin":
            return self._index_mac()
        if OS == "Windows":
            return self._index_windows()
        return self._index_linux()

    @staticmethod
    def _index_mac():
        apps = {}
        roots = ["/Applications", "/System/Applications", str(Path.home() / "Applications"),
                 "/System/Applications/Utilities", "/Applications/Utilities"]
        for root in roots:
            for p in glob.glob(os.path.join(root, "*.app")) + glob.glob(os.path.join(root, "*", "*.app")):
                apps.setdefault(Path(p).stem, p)
        return apps

    @staticmethod
    def _index_windows():
        apps = {}
        try:
            out = subprocess.run(
                ["powershell", "-NoProfile", "-Command", "Get-StartApps | ConvertTo-Json -Compress"],
                capture_output=True, text=True, timeout=30,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            ).stdout
            items = json.loads(out or "[]")
            if isinstance(items, dict):
                items = [items]
            for it in items:
                apps.setdefault(it["Name"], ("appid", it["AppID"]))
        except Exception as e:
            log(f"[apps] Get-StartApps failed ({e}); scanning Start Menu shortcuts")
        for base in filter(None, (os.environ.get("ProgramData"), os.environ.get("APPDATA"))):
            pattern = os.path.join(base, "Microsoft", "Windows", "Start Menu", "Programs", "**", "*.lnk")
            for p in glob.glob(pattern, recursive=True):
                apps.setdefault(Path(p).stem, ("file", p))
        return apps

    @staticmethod
    def _index_linux():
        apps = {}
        dirs = [Path.home() / ".local/share/applications", Path("/usr/share/applications"),
                Path("/usr/local/share/applications"), Path("/var/lib/flatpak/exports/share/applications"),
                Path.home() / ".local/share/flatpak/exports/share/applications",
                Path("/var/lib/snapd/desktop/applications")]
        for d in dirs:
            for f in d.glob("*.desktop"):
                try:
                    name, exe, hidden, typ, in_entry = None, None, False, "Application", False
                    for line in f.read_text(encoding="utf-8", errors="ignore").splitlines():
                        line = line.strip()
                        if line.startswith("["):
                            in_entry = line == "[Desktop Entry]"
                            continue
                        if not in_entry or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        if k == "Name" and name is None:
                            name = v
                        elif k == "Exec" and exe is None:
                            exe = v
                        elif k in ("NoDisplay", "Hidden") and v.lower() == "true":
                            hidden = True
                        elif k == "Type":
                            typ = v
                    if name and exe and not hidden and typ == "Application":
                        apps.setdefault(name, (str(f), exe))
                except Exception:
                    pass
        return apps

    # ---- matching
    @staticmethod
    def _norm(s: str) -> str:
        s = s.lower().replace("&", "and")
        s = re.sub(r"[^a-z0-9 ]+", " ", s)
        s = re.sub(r"\b(the|my|app|application|program)\b", " ", s)
        return re.sub(r"\s+", " ", s).strip()

    def find(self, query: str) -> str | None:
        if not self.apps or not query:
            return None
        q = self._norm(query)
        if not q:
            return None
        if q in self.aliases:
            target = self.aliases[q]
            if target in self.apps:
                return target
            q = self._norm(target)
        norm = {self._norm(n): n for n in self.apps}
        if q in norm:
            return norm[q]
        starts = [n for k, n in norm.items() if k.startswith(q + " ") or k.startswith(q)]
        if starts:
            return min(starts, key=len)
        # every spoken word appears in the app name ("code" -> "Visual Studio Code")
        words = q.split()
        contains = [n for k, n in norm.items() if all(re.search(rf"\b{re.escape(w)}", k) for w in words)]
        if contains:
            return min(contains, key=len)
        close = difflib.get_close_matches(q, list(norm), n=1, cutoff=0.72)
        return norm[close[0]] if close else None

    # ---- launching
    def open(self, name: str) -> bool:
        info = self.apps.get(name)
        if info is None:
            return False
        try:
            if OS == "Darwin":
                subprocess.Popen(["open", info])
            elif OS == "Windows":
                kind, val = info
                if kind == "appid":
                    subprocess.Popen(["explorer.exe", f"shell:AppsFolder\\{val}"])
                else:
                    os.startfile(val)  # type: ignore[attr-defined]
            else:
                path, exe = info
                desktop_id = Path(path).stem
                if shutil.which("gtk-launch"):
                    subprocess.Popen(["gtk-launch", desktop_id], start_new_session=True,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                elif shutil.which("gio"):
                    subprocess.Popen(["gio", "launch", path], start_new_session=True,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    cmd = [a for a in shlex.split(exe) if not re.fullmatch(r"%[a-zA-Z]", a)]
                    subprocess.Popen(cmd, start_new_session=True,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except Exception as e:
            log(f"[apps] failed to open {name}: {e}")
            return False


OPEN_RE = re.compile(
    r"^(?:(?:please|jarvis|could you|can you|would you)[ ,]+)*"
    r"(?:open|launch|start|run|fire up|bring up|load)\s+(?:up\s+)?(.+?)"
    r"(?:\s+(?:for me|please|now))*[.!?]*$",
    re.I,
)


# --------------------------------------------------------------------------- brain
SYSTEM_PROMPT = """You are Jarvis, a calm, courteous, quietly witty British voice assistant \
running on the user's {os} computer. {name_line}
Everything you write is read aloud by a text-to-speech voice, so:
- Reply in natural spoken English. No markdown, bullet points, headings, emoji, code blocks or raw URLs.
- Be brief: one to three sentences unless the user asks for detail.
- Use British spelling and phrasing. Say numbers the way a person would say them.
- Each user message starts with the current local time in square brackets.
- The user's approximate location is: {place}.

You can open things on this computer. To do so, put each action on its own line at the very END \
of your reply, after the spoken text:
OPEN_APP: <app name copied exactly from the installed apps list>
OPEN_URL: <full https:// URL>
Use OPEN_URL for websites or searches (e.g. a YouTube or Google search URL). Keep the spoken \
part short when you take an action, e.g. "Opening Spotify." If an app isn't in the list, say so \
politely and offer the website instead if there is one.

Installed apps: {apps}"""

ACTION_RE = re.compile(r"^\s*(OPEN_APP|OPEN_URL)\s*:\s*(.+?)\s*$", re.M)


class Brain:
    """Talks to Claude through the Claude Code CLI, so it uses your Claude Code login."""

    def __init__(self, cfg: dict, apps: Apps, place_fn):
        self.cfg = cfg
        self.apps = apps
        self.place_fn = place_fn
        self.session_id: str | None = None
        self.last_used = 0.0
        self.claude = shutil.which("claude")
        HOME_DIR.mkdir(exist_ok=True)

    def _system_prompt(self) -> str:
        names = sorted(self.apps.apps, key=str.lower)
        name = (self.cfg.get("name") or "").strip()
        try:
            place = self.place_fn()
        except Exception:
            place = "unknown"
        return SYSTEM_PROMPT.format(
            os={"Darwin": "Mac", "Windows": "Windows", "Linux": "Linux"}.get(OS, OS),
            name_line=f"The user's name is {name}; use it occasionally, not every time." if name else "",
            place=place,
            apps=", ".join(names[:400]) or "(unknown)",
        )

    def ask(self, text: str) -> tuple[str, list[tuple[str, str]]]:
        if not self.claude:
            return ("I can't find the Claude Code command line tool. Please install it and log in, "
                    "then restart me.", [])
        if time.time() - self.last_used > float(self.cfg.get("memory_minutes", 30)) * 60:
            self.session_id = None
        stamp = datetime.now().strftime("%A %d %B %Y, %H:%M")
        cmd = [self.claude, "-p", f"[{stamp}] {text}", "--output-format", "json",
               "--system-prompt", self._system_prompt(),
               "--tools", self.cfg.get("claude_tools") or ""]
        if self.cfg.get("claude_tools"):
            cmd += ["--allowedTools", self.cfg["claude_tools"]]
        if self.cfg.get("claude_model"):
            cmd += ["--model", self.cfg["claude_model"]]
        if self.session_id:
            cmd += ["--resume", self.session_id]
        env = os.environ.copy()
        env.pop("ANTHROPIC_API_KEY", None)  # use your Claude Code login, not an API key
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                               timeout=180, cwd=str(HOME_DIR), env=env,
                               creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        except subprocess.TimeoutExpired:
            return ("I'm terribly sorry, that took far too long. Shall we try again?", [])
        out = (p.stdout or "").strip()
        try:
            data = json.loads(out.splitlines()[-1] if out else "{}")
        except json.JSONDecodeError:
            data = {}
        if p.returncode != 0 or data.get("is_error") or "result" not in data:
            detail = (data.get("result") or p.stderr or out or "").strip()
            log(f"[brain] claude error (exit {p.returncode}): {detail[:500]}")
            if re.search(r"log ?in|auth|credential|401", detail, re.I):
                return ("I'm not signed in to Claude. Please run claude in a terminal and log in.", [])
            if self.session_id:  # a stale session can fail; retry fresh once
                self.session_id = None
                return self.ask(text)
            return ("I'm afraid my connection to Claude hiccupped. Do try again.", [])
        self.session_id = data.get("session_id") or self.session_id
        self.last_used = time.time()
        return parse_reply(data["result"])


def parse_reply(raw: str) -> tuple[str, list[tuple[str, str]]]:
    actions = [(m.group(1), m.group(2)) for m in ACTION_RE.finditer(raw)]
    speech = ACTION_RE.sub("", raw)
    return clean_for_speech(speech), actions


def clean_for_speech(s: str) -> str:
    s = re.sub(r"```.*?```", " ", s, flags=re.S)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)      # [text](link) -> text
    s = re.sub(r"https?://\S+", "", s)
    s = re.sub(r"^\s*(#+|[-*•]|\d+\.)\s+", "", s, flags=re.M)
    s = re.sub(r"[*_`#>]+", "", s)
    return re.sub(r"\s+", " ", s).strip()


# --------------------------------------------------------------------------- voice out
class Voice:
    def __init__(self, cfg: dict, mic: "Mic | None" = None, mute: bool = False):
        self.cfg = cfg
        self.mic = mic
        self.mute = mute
        self._mixer = False
        self._tts = None

    def say(self, text: str):
        if not text:
            return
        log(f"Jarvis: {text}")
        if self.mute:
            return
        if self.mic:
            self.mic.muted = True  # don't let Jarvis hear itself
        try:
            try:
                self._say_edge(text)
            except Exception as e:
                log(f"[voice] online voice unavailable ({e.__class__.__name__}); using offline voice")
                self._say_offline(text)
        finally:
            if self.mic:
                time.sleep(0.3)
                self.mic.flush()
                self.mic.muted = False

    def _say_edge(self, text: str):
        import edge_tts
        os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")
        import pygame

        fd, path = tempfile.mkstemp(suffix=".mp3", prefix="jarvis_")
        os.close(fd)
        try:
            comm = edge_tts.Communicate(text, self.cfg["voice"], rate=self.cfg.get("speech_rate", "+0%"))
            asyncio.run(comm.save(path))
            if not self._mixer:
                pygame.mixer.init()
                self._mixer = True
            pygame.mixer.music.load(path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.05)
            pygame.mixer.music.unload()
        finally:
            try:
                os.remove(path)
            except OSError:
                pass

    def _say_offline(self, text: str):
        import pyttsx3

        if self._tts is None:
            self._tts = pyttsx3.init()
            british = ("en_gb", "en-gb", "daniel", "george", "arthur", "oliver", "hazel", "en-scottish")
            for v in self._tts.getProperty("voices"):
                blob = f"{v.id} {v.name} {getattr(v, 'languages', '')}".lower()
                if any(b in blob for b in british):
                    self._tts.setProperty("voice", v.id)
                    break
            self._tts.setProperty("rate", 165)
        self._tts.say(text)
        self._tts.runAndWait()

    def chime(self, up: bool = True):
        if self.mute:
            return
        try:
            import numpy as np
            import sounddevice as sd

            sr = 22050
            notes = (660, 880) if up else (880, 520)
            parts = []
            for f in notes:
                t = np.linspace(0, 0.09, int(sr * 0.09), False)
                parts.append(np.sin(2 * np.pi * f * t) * np.hanning(t.size) * 0.25)
            sd.play(np.concatenate(parts).astype("float32"), sr)
            sd.wait()
        except Exception:
            pass


# --------------------------------------------------------------------------- voice in
class Mic:
    """Microphone stream, resampled to 16 kHz mono 16-bit, chunked into 100 ms blocks."""

    def __init__(self, device=None):
        import numpy as np
        import sounddevice as sd

        self.np = np
        self.q: queue.Queue[bytes] = queue.Queue()
        self.muted = False
        info = sd.query_devices(device, "input")
        self.native = int(info["default_samplerate"])
        log(f"[mic] using '{info['name']}' at {self.native} Hz")
        self.stream = sd.InputStream(samplerate=self.native, channels=1, dtype="float32",
                                     blocksize=int(self.native * 0.1), device=device,
                                     callback=self._cb)
        self.stream.start()

    def _cb(self, indata, frames, t, status):
        if self.muted:
            return
        np = self.np
        x = indata[:, 0]
        if self.native != SAMPLE_RATE:
            n = int(len(x) * SAMPLE_RATE / self.native)
            x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
        self.q.put((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())

    def read(self, timeout=None) -> bytes:
        return self.q.get(timeout=timeout)

    def flush(self):
        while not self.q.empty():
            try:
                self.q.get_nowait()
            except queue.Empty:
                break


def rms(block: bytes) -> float:
    import numpy as np

    a = np.frombuffer(block, dtype=np.int16).astype(np.float32)
    return float(np.sqrt(np.mean(a * a))) if a.size else 0.0


GREETINGS = {"hi", "hey", "hay", "high", "hai", "hiya", "hello", "ok", "okay", "yo", "a", "uh", "oh"}
WAKE_NEAR_MISSES = {"jarvis", "jervis", "jarvas", "jarves", "javis", "jarvie", "jarvi", "charvis", "garvis"}


def match_wake(text: str, word: str = "jarvis", require_greeting: bool = True) -> str | None:
    """Return the words after the wake phrase ('' if none), or None if not woken."""
    toks = re.sub(r"[^a-z' ]", " ", text.lower()).split()
    for i, tok in enumerate(toks):
        is_wake = tok == word or (word == "jarvis" and tok in WAKE_NEAR_MISSES) \
            or difflib.SequenceMatcher(None, tok, word).ratio() >= 0.83
        if not is_wake:
            continue
        if require_greeting and not (i > 0 and toks[i - 1] in GREETINGS):
            continue
        return " ".join(toks[i + 1:])
    return None


class Ears:
    """Wake-word spotting (Vosk, offline) + command transcription (Whisper, offline)."""

    def __init__(self, cfg: dict, mic: Mic):
        from vosk import Model, SetLogLevel

        SetLogLevel(-1)
        self.cfg = cfg
        self.mic = mic
        log("[ears] loading wake-word model (first run downloads ~40 MB)...")
        self.vosk = Model(model_name="vosk-model-small-en-us-0.15")
        self.whisper = None
        threading.Thread(target=self._load_whisper, daemon=True).start()
        self.noise = 200.0

    def _load_whisper(self):
        try:
            from faster_whisper import WhisperModel

            log(f"[ears] loading Whisper '{self.cfg['whisper_model']}' (first run downloads it)...")
            self.whisper = WhisperModel(self.cfg["whisper_model"], device="cpu", compute_type="int8")
            log("[ears] Whisper ready")
        except Exception as e:
            log(f"[ears] Whisper unavailable ({e}); using Vosk for commands")

    def wait_for_wake(self) -> str:
        from vosk import KaldiRecognizer

        rec = KaldiRecognizer(self.vosk, SAMPLE_RATE)
        word = self.cfg.get("wake_word", "jarvis").lower()
        need = bool(self.cfg.get("require_greeting", True))
        heard_at = None
        while True:
            block = self.mic.read()
            self.noise = 0.95 * self.noise + 0.05 * min(rms(block), 3000)
            if rec.AcceptWaveform(block):
                text = json.loads(rec.Result()).get("text", "")
                hit = match_wake(text, word, need)
                if hit is not None:
                    return self._clean_tail(hit)
                heard_at = None
            else:
                partial = json.loads(rec.PartialResult()).get("partial", "")
                if heard_at is None and match_wake(partial, word, need) is not None:
                    heard_at = time.time()
                if heard_at and time.time() - heard_at > 1.2:  # don't wait for a long sentence
                    rec.Reset()
                    return ""

    @staticmethod
    def _clean_tail(tail: str) -> str:
        return "" if len(tail.split()) < 2 else tail  # ignore stray single words like "the"

    def listen(self, start_timeout: float) -> str | None:
        """Record one utterance (stops after ~1s of silence) and transcribe it."""
        self.mic.flush()
        thresh = max(self.noise * 2.5, 350.0)
        pre: list[bytes] = []
        frames: list[bytes] = []
        started, loud, quiet = False, 0, 0
        t0 = time.time()
        while True:
            try:
                block = self.mic.read(timeout=1.0)
            except queue.Empty:
                if not started and time.time() - t0 > start_timeout:
                    return None
                continue
            level = rms(block)
            if not started:
                pre = (pre + [block])[-4:]
                loud = loud + 1 if level > thresh else 0
                if loud >= 2:
                    started, frames = True, list(pre)
                elif time.time() - t0 > start_timeout:
                    return None
                continue
            frames.append(block)
            quiet = quiet + 1 if level < thresh * 0.8 else 0
            if quiet >= 10 or len(frames) > 250:  # 1s silence, or 25s max
                break
        return self._transcribe(b"".join(frames))

    def _transcribe(self, audio: bytes) -> str | None:
        import numpy as np

        text = ""
        if self.whisper is not None:
            x = np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0
            segs, _ = self.whisper.transcribe(x, language="en", beam_size=1, vad_filter=True)
            text = " ".join(s.text for s in segs).strip()
        else:
            from vosk import KaldiRecognizer

            rec = KaldiRecognizer(self.vosk, SAMPLE_RATE)
            rec.AcceptWaveform(audio)
            text = json.loads(rec.FinalResult()).get("text", "")
        junk = {"", "you", "thank you.", "thanks for watching!", ".", "bye."}
        return None if text.lower() in junk else text


# --------------------------------------------------------------------------- assistant
SLEEP_RE = re.compile(r"^(?:ok(?:ay)?|right|no|thanks?|thank you|cheers|[, ])*\s*"
                      r"(?:that'?s all|that is all|that'?s it|goodbye|good bye|bye|go to sleep|"
                      r"never ?mind|nothing|no thanks|stop listening|i'?m done|dismissed)\b", re.I)
THANKS_RE = re.compile(r"^(?:thanks|thank you|cheers|brilliant|perfect|great)(?: jarvis)?[.!]*$", re.I)


class Jarvis:
    def __init__(self, cfg: dict, text_mode: bool, mute: bool):
        self.cfg = cfg
        self.text_mode = text_mode
        self.weather = Weather(cfg)
        self.apps = Apps(cfg)
        log(f"[apps] found {len(self.apps.apps)} apps")
        self.brain = Brain(cfg, self.apps, lambda: self.weather.locate()[2])
        self.mic = None if text_mode else Mic(cfg.get("mic_device"))
        self.ears = None if text_mode else Ears(cfg, self.mic)
        self.voice = Voice(cfg, self.mic, mute)
        self.last_greet = 0.0

    # ---- pieces
    def greeting(self) -> str:
        name = (self.cfg.get("name") or "").strip()
        hello = f"Good {part_of_day()}{', ' + name if name else ''}."
        try:
            weather = self.weather.sentence()
        except Exception as e:
            log(f"[weather] {e}")
            weather = "I'm afraid I couldn't reach the weather service just now."
        return f"{hello} {weather} How may I help?"

    def try_open(self, text: str) -> bool:
        m = OPEN_RE.match(text.strip())
        if not m:
            return False
        name = self.apps.find(m.group(1))
        if not name:
            return False  # let Claude handle it (may be a website)
        if self.apps.open(name):
            self.voice.say(random.choice([f"Opening {name}.", f"Right away. Opening {name}.",
                                          f"{name}, coming up."]))
            return True
        return False

    def run_actions(self, actions):
        for kind, val in actions:
            if kind == "OPEN_APP":
                name = self.apps.find(val) or val
                ok = self.apps.open(name)
                log(f"[action] open app {name!r}: {'ok' if ok else 'not found'}")
            elif kind == "OPEN_URL" and re.match(r"https?://", val):
                webbrowser.open(val)
                log(f"[action] open url {val}")

    def handle(self, text: str) -> bool:
        """Handle one request. Returns False when the user is done talking."""
        log(f"You: {text}")
        t = text.strip()
        if THANKS_RE.match(t):
            self.voice.say(random.choice(["You're most welcome.", "My pleasure.", "Any time."]))
            return False
        if len(t.split()) <= 6 and SLEEP_RE.match(t):
            self.voice.say(random.choice(["Very good. Just say hi Jarvis if you need me.",
                                          "As you wish. I'll be here."]))
            return False
        if self.try_open(t):
            return True
        speech, actions = self.brain.ask(t)
        self.run_actions(actions)
        self.voice.say(speech or "Done.")
        return True

    # ---- loops
    def run_text(self):
        log("Text mode. Type 'hi jarvis' to get a greeting, anything else to chat, Ctrl+C to quit.")
        while True:
            try:
                text = input("> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                return
            if not text:
                continue
            tail = match_wake(text, self.cfg.get("wake_word", "jarvis"), False)
            if tail is not None:
                self.voice.say(self.greeting())
                text = tail
                if not text:
                    continue
            self.handle(text)

    def run_voice(self):
        log('\nJarvis is listening. Say "Hi Jarvis". (Ctrl+C to quit)\n')
        while True:
            tail = self.ears.wait_for_wake()
            log("[wake] heard you")
            self.voice.chime(True)
            if time.time() - self.last_greet > float(self.cfg.get("greet_cooldown_minutes", 60)) * 60:
                self.voice.say(self.greeting())
                self.last_greet = time.time()
            elif not tail:
                self.voice.say(random.choice(["Yes?", "At your service.", "I'm listening."]))
            pending = tail or None
            while True:
                text = pending or self.ears.listen(float(self.cfg.get("follow_up_seconds", 8)))
                pending = None
                if not text:
                    self.voice.chime(False)
                    log("[sleep] waiting for wake word")
                    break
                if not self.handle(text):
                    break


# --------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Jarvis voice assistant")
    ap.add_argument("--text", action="store_true", help="type instead of speaking (no microphone)")
    ap.add_argument("--mute", action="store_true", help="print replies instead of speaking them")
    ap.add_argument("--list-mics", action="store_true", help="list microphones and exit")
    ap.add_argument("--list-apps", action="store_true", help="list apps Jarvis can open and exit")
    ap.add_argument("--weather", action="store_true", help="print the weather greeting and exit")
    ap.add_argument("--say", metavar="TEXT", help="speak TEXT in Jarvis's voice and exit")
    args = ap.parse_args()
    cfg = load_config()

    if args.list_mics:
        import sounddevice as sd
        print(sd.query_devices())
        return
    if args.list_apps:
        for n in sorted(Apps(cfg).apps, key=str.lower):
            print(n)
        return
    if args.weather:
        print(Weather(cfg).sentence())
        return
    if args.say:
        Voice(cfg).say(args.say)
        return

    j = Jarvis(cfg, text_mode=args.text, mute=args.mute)
    try:
        j.run_text() if args.text else j.run_voice()
    except KeyboardInterrupt:
        log("\nGoodbye.")


if __name__ == "__main__":
    main()
