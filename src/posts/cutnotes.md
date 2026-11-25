---
title: CutNotes
date: 2026-08-28
img: /img/software/cutnotes.png
imgAlt: CutNotes app icon with a white downward arrow crossing an editing timeline on black
imgDisplay: compact
og_image_width: 1024
og_image_height: 1024
summary: Talk through a rough cut and give your editor a set of timecoded notes
tags:
  - open-source
  - transcription
---

Say "three twenty-four, hold on her face a little longer" while you're watching a cut. Keep watching. When you're done, CutNotes gives you a transcript and can put that note at **03:24** in a Markdown file for your editor. The things you said about the film as a whole go at the top.

You can record in the Mac app, pause to watch a scene again, or bring in audio from a review you've already done. A video or a plain-text transcript works too. Wear headphones if you're recording. It helps keep the dialogue in the movie out of the notes about the dialogue.

### From the recording to the edit

Parakeet transcribes on your Mac. If all you want is the transcript, you can stop there. For a set of notes, Gemma 4 reads the transcript locally, sorts the comments by timecode, and flags times that could mean more than one thing. Give the notes a read before you send them. CutNotes keeps the recording, the transcript and earlier drafts, so you can go back and hear exactly what you said.

The same tools work from the terminal. If you already use MacWhisper for transcription or Codex for formatting, you can select either for that part of the job.

### What you need

An Apple Silicon Mac running macOS 15 or later. Local transcription needs a one-time Parakeet download. Gemma 4 12B is a separate 9.76 GB download. If you want it to format your notes, allow 11 GB of free disk space for setup. You'll need at least 16 GB of unified memory (24 GB recommended). After setup, both steps work offline. English transcription is fully supported. The other 24 languages are experimental.

### Download and source

* [Download CutNotes for Mac](https://github.com/aindaco1/cutnotes/releases/latest)
* [Source code and instructions on GitHub](https://github.com/aindaco1/cutnotes) · MIT License

### Primary developer

[Alonso Indacochea](https://www.instagram.com/alonso_inda/)
