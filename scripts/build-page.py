#!/usr/bin/env python3
"""Build skills.json for the showcase page — ALWAYS all 86 slots.

Enumerates the 86 skills from disk (canonical source, never a hardcoded
list), merges in assets/<slug>/meta.json where a skill is done, and emits
a NAME-ONLY placeholder entry for every skill not finished yet, so the
live grid always shows all 86 slots with no broken images, videos or links.

Usage: python3 scripts/build-page.py
"""
import json
import os
import sys

PROJ = os.path.expanduser("~/workspace/showcase-skills")
ASSETS = os.path.join(PROJ, "assets")
SKILLS = os.path.expanduser("~/workspace/custom-skills")
TEXT_PATH = os.path.join(PROJ, "skills-text.json")

# (family, directory, names to exclude)
SOURCES = [
    ("cartoon-audio-short", None, set()),  # single skill, handled below
    ("faceless-shorts", os.path.join(SKILLS, "faceless-shorts", "styles"), set()),
    ("ai-video-editor", os.path.join(SKILLS, "ai-video-editor", "styles"), {"index.json"}),
    ("nafay-style-library", os.path.join(SKILLS, "nafay-style-library", "styles"), set()),
    ("cth-animate", os.path.join(SKILLS, "cth-animate", "styles"), {"README.md"}),
    ("artem-animation-skills", os.path.join(SKILLS, "artem-animation-skills", "skills"), {"zach-3d-films"}),
]


def enumerate_skills():
    out = [("cartoon-audio-short", "cartoon-audio-short")]
    for family, d, exclude in SOURCES[1:]:
        for name in sorted(os.listdir(d)):
            if name in exclude:
                continue
            if not os.path.isdir(os.path.join(d, name)):
                continue
            out.append((name, family))
    out.sort(key=lambda t: t[0].lower())
    return out


def main():
    skills = enumerate_skills()
    assert len(skills) == 86, f"expected 86 skills, found {len(skills)}"
    text_data = {}
    if os.path.isfile(TEXT_PATH):
        with open(TEXT_PATH) as f:
            text_data = json.load(f).get("skills", {})
    entries = []
    done = 0
    text_only = 0
    total_video = 0
    total_stills = 0
    for slug, family in skills:
        meta_path = os.path.join(ASSETS, slug, "meta.json")
        if os.path.isfile(meta_path):
            with open(meta_path) as f:
                meta = json.load(f)
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
                meta["status"] = "done"
                # family_key: the source family slug (stable filter key).
                # meta's `family` is a free-form display label that varies
                # per skill; without this the family filter hides done
                # skills whose label is not a source slug.
                meta["family_key"] = family
                entries.append(meta)
                done += 1
                continue
            print(f"WARN {slug}: meta.json present but assets incomplete — showing text-only")
        t = text_data.get(slug)
        if t:
            text_only += 1
            entries.append({
                "slug": slug,
                "name": slug,
                "family": family,
                "family_key": family,
                "status": "text",
                "description": t.get("description", ""),
                "best_use_cases": t.get("best_use_cases", []),
                "style": t.get("style", ""),
                "voice": t.get("voice", ""),
                "stills": [],
                "video": "",
            })
            continue
        entries.append({
            "slug": slug,
            "name": slug,
            "family": family,
            "family_key": family,
            "status": "pending",
            "description": "",
            "best_use_cases": [],
            "style": "",
            "voice": "",
            "stills": [],
            "video": "",
        })
    entries.sort(key=lambda s: s["name"].lower())
    with open(os.path.join(PROJ, "skills.json"), "w") as f:
        json.dump({"count": len(entries), "done": done, "skills": entries}, f, indent=2)
    print(f"skills.json: {len(entries)} slots, {done} done, {text_only} text-only, {len(entries)-done-text_only} pending")
    print(f"total video bytes: {total_video} ({total_video/1e9:.3f} GB)")
    print(f"total still bytes: {total_stills} ({total_stills/1e9:.3f} GB)")
    print(f"combined: {(total_video+total_stills)/1e9:.3f} GB")
    print("compression: videos compress only if one video >100MB or all videos >1GB;")
    print("stills compress only if videos+stills >1GB.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
