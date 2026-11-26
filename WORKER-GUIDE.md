# Showcase worker guide — pull-model queue (standing, from 27 Nov 2026 ~02:35 IST)

When you finish a skill, IMMEDIATELY pick up the next skill from the queue.
No idle gap, no waiting for a new assignment. Keep 10 workers busy until
all 86 are done.

## The queue

All 86 skills, alphabetical (the canonical list lives in
`scripts/build-page.py`'s enumeration — same sources). A skill is
available when it is NOT done and NOT claimed by a live worker.

## Claim protocol (avoids two workers on one skill)

Before starting a skill:
1. Read `status/<slug>.json` if it exists.
   - `state: done` → skip it, pick the next skill.
   - `state: in_progress` with `heartbeat_epoch` less than 45 min old →
     another worker owns it → skip it, pick the next skill.
   - `state: in_progress` with a heartbeat older than 45 min AND no live
     process for it (`pgrep -f "<slug>"` empty) AND no files under
     `~/.showcase-work/<slug>/` modified in the last 15 min → stale claim:
     take it over, resume from the work dir.
   - No status file, or `state: failed`/`paused` → take it.
2. Claim it FIRST: write `status/<slug>.json` with
   `{"skill": slug, "state": "in_progress", "worker": "<your-batch-id>",
   "heartbeat_epoch": <unix>, "note": "claimed"}`.
3. Then read `~/.showcase-work/<slug>/` and resume from whatever is there
   (voice wavs, frames, scripts, logs) — never redo finished work.

Update the heartbeat after every step and at least every 10 minutes.

## Per-skill deliverables (unchanged)

In `assets/<slug>/`: `still-1.jpg` … `still-6.jpg` (skill's OWN renderer,
6 spread times; still-1 = primary), `demo.mp4` (H.264 + AAC, >= 8 s,
target ~10 s, skill's own frame pipeline — never a slideshow), `meta.json`
with `{"slug","name","family","description","best_use_cases":[...],"style",
"voice","orientation","stills":[...6],"video":"assets/<slug>/demo.mp4",
"duration_s","resolution","fps","video_bytes","stills_bytes"}`.
Description/use-cases/style come from the skill's own docs — do not invent.
Distinct ~10 s script per skill, tailored to its niche. Verify every asset
(ffprobe duration >= 8 + audio stream; stills JPEG non-zero; PIL stddev > 5).
If a skill fails twice, mark `failed` with the exact error and move on.
Delete frame dirs after the video is verified.

## Family → engine → voice

- **cartoon-audio-short** — `~/workspace/custom-skills/cartoon-audio-short/`
  (kit + tools/render.mjs; vertical 1080x1920, 30 fps). Voice: channel TTS
  `/opt/hatch/bin/tts speak --speed 105`, voice `avocado_v2:MAI_03`.
- **faceless-shorts** (deep-dive, inside-out, night-file, paper-atlas,
  stick-story, tall-tale) — `~/workspace/custom-skills/faceless-shorts/styles/<slug>/`
  (capture.mjs; vertical 1080x1920). Voice: Kokoro af_heart.
- **ai-video-editor** (clean-tech, software-walkthrough, warm-canvas) —
  `~/workspace/custom-skills/ai-video-editor/styles/<slug>/` (render.py;
  LANDSCAPE 1280x720). Voice: Kokoro af_heart.
- **nafay-style-library** (59 styles) —
  `~/workspace/custom-skills/nafay-style-library/styles/<slug>/reference.html`
  (seek-based `window.seek(t)`, `window.DURATION`; vertical 720x1280,
  except chalk-talk, creator-motion-graphics, data-story, pop-info which are
  LANDSCAPE 1280x720; paper-craft is 12 fps stop-motion — keep it 12 fps).
  Voice: Kokoro af_heart.
- **cth-animate** (crosshatch, cut-paper, isometric, math, pixel, riso,
  sketchbook) — `~/workspace/custom-skills/cth-animate/styles/<slug>/`
  (build.mjs; set `"fps": 30` in piece.json — demos run 24 fps by default).
  Voice: Kokoro af_heart.
- **artem-animation-skills templates** (breakdown, dan-koe, graph, kurzgesagt,
  low-poly, map-route, minecraft, minimalistic-graphics) —
  `~/workspace/custom-skills/artem-animation-skills/skills/<slug>/`
  (kit/anim.py + build.py; `build.py --snap` for snapshots; 1080x1920).
  Voice: Kokoro af_heart.
- **artem stick-figure** — `.../skills/stick-figure/` (engine/make.sh with
  kokoro; render.js stills; 9:16). Voice: Kokoro af_heart (tts_kokoro.py).
- **artem zach-d-films** — `.../skills/zach-d-films/` (engine/render.mjs
  stills ~10–27 s each — render video at 540x960, 24 fps, small batches,
  stills-first). Voice: Kokoro af_heart.

Kokoro everywhere (except cartoon): `~/.faceless-shorts/venv/bin/python` +
`~/workspace/custom-skills/faceless-shorts/scripts/voice.py`, voice
`af_heart` (~2.4 words/s, ~24 words for 10 s). NO ElevenLabs anywhere — no
key, never call `tts_elevenlabs.py`.

## Constraints (unchanged)

- Renders fully offline (no CDN/runtime downloads). Artem renders need
  `TMPDIR=/home/hatch/.hyperframes-tmp` (never /tmp — only 512 MB).
- System pip installs do NOT survive VM replacement — use home venvs,
  verify by import.
- If an engine is too slow at full res, drop resolution (min 540x960),
  record actuals in meta.json.
- Work dirs under `~/.showcase-work/<slug>/` (home, NOT in the repo).
- Do NOT git push, do NOT edit skills.json/index.html/styles.css/app.js.
- Never touch `~/shorts/*`, crons, Drive, YouTube, or channel videos.
- Check `logs/PAUSE` before every render; if it exists, stop heavy
  rendering, mark `paused`, exit cleanly. (Pause gate currently disabled —
  channel work is paused until the 86 stills are complete; see watchdog.sh.)
