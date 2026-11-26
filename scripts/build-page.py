#!/usr/bin/env python3
"""Merge per-skill meta.json files into skills.json for the showcase page.

Reads ~/workspace/showcase-skills/assets/<skill>/meta.json for every skill
that has one, validates the assets exist, and writes skills.json
(sorted by name). Also prints size totals for the compression decision.

Usage: python3 scripts/build-page.py
"""
import json
import os
import sys

PROJ = os.path.expanduser("~/workspace/showcase-skills")
ASSETS = os.path.join(PROJ, "assets")


def main():
    skills = []
    total_video = 0
    total_stills = 0
    missing = []
    for slug in sorted(os.listdir(ASSETS)):
        meta_path = os.path.join(ASSETS, slug, "meta.json")
        if not os.path.isfile(meta_path):
            missing.append(slug)
            continue
        with open(meta_path) as f:
            meta = json.load(f)
        # Validate assets exist on disk.
        ok = True
        for rel in meta.get("stills", []):
            p = os.path.join(PROJ, rel)
            if not os.path.isfile(p):
                print(f"WARN {slug}: missing still {rel}")
                ok = False
            else:
                total_stills += os.path.getsize(p)
        v = meta.get("video")
        if v:
            p = os.path.join(PROJ, v)
            if not os.path.isfile(p):
                print(f"WARN {slug}: missing video {v}")
                ok = False
            else:
                total_video += os.path.getsize(p)
        if ok:
            skills.append(meta)
    skills.sort(key=lambda s: s["name"].lower())
    out = {"count": len(skills), "skills": skills}
    with open(os.path.join(PROJ, "skills.json"), "w") as f:
        json.dump(out, f, indent=2)
    print(f"skills.json: {len(skills)} skills")
    print(f"skills without meta.json: {len(missing)} {missing[:10]}")
    print(f"total video bytes: {total_video} ({total_video/1e9:.3f} GB)")
    print(f"total still bytes: {total_stills} ({total_stills/1e9:.3f} GB)")
    print(f"combined: {(total_video+total_stills)/1e9:.3f} GB")
    print("compression: videos compress only if one video >100MB or all videos >1GB;")
    print("stills compress only if videos+stills >1GB.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
