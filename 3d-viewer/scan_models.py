#!/usr/bin/env python3
"""
Scan ./models/ folder and generate models.json for local development.
Run this before using `npx serve` to preview locally.

Usage:  python scan_models.py
"""
import os, json, re

MODELS_DIR = "models"
EXTENSIONS = {".glb", ".gltf", ".fbx", ".obj"}

# MilVerse prefix → asset type
PREFIX_MAP = {
    "SM": "military_vehicle",   # Static Mesh (default to military_vehicle)
    "T":  "tree",
    "M":  "mailbox",
    "BLD": "building",
    "CV": "civilian_vehicle",
    "MV": "military_vehicle"
}

def parse_name(filename):
    """Parse MilVerse naming: SM_Truck_Base_v1.fbx → Truck Base v1"""
    name = os.path.splitext(filename)[0]
    name = re.sub(r'^[A-Z]+_', '', name)
    name = name.replace('_', ' ')
    return name

def parse_revision(filename):
    """Extract revision: SM_Truck_Base_v1.fbx → v1"""
    name = os.path.splitext(filename)[0]
    match = re.search(r'(v\d+)$', name)
    return match.group(1) if match else ""

def parse_type(filename):
    """Parse asset type from prefix: SM_xxx → military_vehicle"""
    name = os.path.splitext(filename)[0]
    prefix = name.split('_')[0] if '_' in name else ""
    return PREFIX_MAP.get(prefix, "military_vehicle")

def main():
    entries = []
    if not os.path.isdir(MODELS_DIR):
        print(f"No '{MODELS_DIR}/' folder found. Create it and add model files.")
        return

    for f in sorted(os.listdir(MODELS_DIR)):
        ext = os.path.splitext(f)[1].lower()
        if ext in EXTENSIONS:
            entries.append({
                "file": f"models/{f}",
                "name": parse_name(f),
                "type": parse_type(f),
                "lod": "LOD0",
                "revision": parse_revision(f)
            })

    with open("models.json", "w") as fp:
        json.dump(entries, fp, indent=2)

    print(f"Generated models.json with {len(entries)} model(s):")
    for e in entries:
        print(f"  • {e['name']} [{e['type']}] ({e['file']})")

if __name__ == "__main__":
    main()
