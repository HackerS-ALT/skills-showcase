#!/usr/bin/env bash
# Showcase watchdog — monitors the 86-skill generation pipeline.
# - Every 5 min: checks each skill's status/<skill>.json heartbeat.
#   A skill is STALLED only when ALL THREE hold: heartbeat older than
#   45 min AND no workdir activity in the last 30 min AND no live driver
#   process mentioning its workdir. Heartbeat age alone is NOT enough —
#   workers deep in a long render often skip heartbeat writes (27 Nov:
#   70 false markers from heartbeat age alone after a restart).
#   Stale markers are auto-cleared when a skill finishes or goes active.
# - PAUSE GATE DISABLED (user, 27 Nov 2026 ~01:29 IST): all channel work is
#   paused until the 86 showcase stills are complete, so there is no
#   long-form render to protect — the showcase keeps rendering past Fri
#   19:00. PAUSE_AT is set far in the future; re-enable a real pause time
#   when channel work resumes.
# - Logs to logs/watchdog.log. Run detached: nohup bash scripts/watchdog.sh &
set -u
PROJ="$HOME/workspace/showcase-skills"
LOG="$PROJ/logs/watchdog.log"
PAUSE_AT="2099-01-01 00:00:00"
STALL_SECS=2700  # 45 min without a heartbeat

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" >> "$LOG"; }
log "watchdog started (pid $$). Pause scheduled at $PAUSE_AT IST."

paused=0
while true; do
  now=$(date +%s)
  # --- pause gate: DISABLED (PAUSE_AT is far-future until channel work resumes) ---
  if [ "$paused" -eq 0 ]; then
    pause_epoch=$(TZ=Asia/Calcutta date -d "$PAUSE_AT" +%s 2>/dev/null || echo 0)
    if [ "$now" -ge "$pause_epoch" ] && [ "$pause_epoch" -gt 0 ]; then
      touch "$PROJ/logs/PAUSE"
      log "PAUSE gate reached — stopping showcase render processes (chromium/render/ffmpeg under showcase-skills only)"
      # Kill only processes whose cmdline mentions showcase-skills; never touch ~/shorts.
      for pid in $(pgrep -f "showcase-skills" 2>/dev/null); do
        if [ "$pid" != "$$" ]; then kill "$pid" 2>/dev/null && log "killed pid $pid ($(ps -o args= -p $pid 2>/dev/null | cut -c1-120))"; fi
      done
      log "PAUSE enforced. Long-form render window is now protected."
      paused=1
    fi
  fi

  # --- stall check: heartbeat age + workdir/process activity evidence ---
  for f in "$PROJ"/status/*.json; do
    [ -e "$f" ] || continue
    skill=$(basename "$f" .json)
    state=$(python3 -c "import json,sys; d=json.load(open('$f')); print(d.get('state',''))" 2>/dev/null)
    if [ "$state" = "done" ]; then
      if [ -f "$PROJ/status/$skill.stalled" ]; then
        rm -f "$PROJ/status/$skill.stalled"
        log "CLEAR: $skill done — stale marker removed"
      fi
      continue
    fi
    hb=$(python3 -c "import json,sys; d=json.load(open('$f')); print(d.get('heartbeat_epoch',0))" 2>/dev/null || echo 0)
    age=$(( now - hb ))
    # activity evidence: workdir touched in last 30 min, or a live driver process
    active=0
    [ -n "$(find "$HOME/.showcase-work/$skill" -newermt '-30 minutes' 2>/dev/null | head -1)" ] && active=1
    pgrep -f "showcase-work/$skill" >/dev/null 2>&1 && active=1
    if [ "$active" -eq 1 ]; then
      if [ -f "$PROJ/status/$skill.stalled" ]; then
        rm -f "$PROJ/status/$skill.stalled"
        log "CLEAR: $skill active again — stale marker removed"
      fi
      continue
    fi
    if [ "$age" -gt "$STALL_SECS" ]; then
      if [ ! -f "$PROJ/status/$skill.stalled" ]; then
        log "STALL: $skill heartbeat ${age}s old, no workdir/process activity (state=$state) — marked for respawn"
      fi
      touch "$PROJ/status/$skill.stalled"
    fi
  done

  sleep 300
done
