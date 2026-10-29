---
description: Audition one line in several Sarvam voices
argument-hint: "<line>" [--speakers varun,shubh,...] [--pace 0.95] [--lang en-IN]
---

Run `pnpm -s pc voices --line <the line> <flags>` for: $ARGUMENTS

It writes one normalised WAV per speaker to `data/voice-tests/sarvam-<lang>/`. Default speakers, deepest first: varun, shubh, aditya, rahul, kabir, priya, simran.

List the files with each speaker's length. Note that `varun` (deep, calm) is the true-crime narrator and `shubh` (warm storyteller) the horror-classics one. To change a series voice, edit `series/<name>.json` (`voice.speaker`, `pace`, `temperature`; keep temperature at 0.35–0.45 so lines stay consistent).
