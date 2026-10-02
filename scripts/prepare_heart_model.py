from __future__ import annotations

import argparse
import base64
import json
import math
import struct
from pathlib import Path
from typing import Any


MATERIALS = {
    "HeartBody": {"name": "Heart tissue", "color": [0.82, 0.36, 0.34, 1.0]},
    "Aorta": {"name": "Aorta and great vessels", "color": [0.74, 0.18, 0.22, 1.0]},
    "LeftCoronaryStem": {"name": "Left coronary stem", "color": [0.95, 0.74, 0.28, 1.0]},
    "LAD": {"name": "LAD", "color": [0.9, 0.19, 0.19, 1.0]},
    "LCX": {"name": "LCX", "color": [0.1, 0.48, 0.78, 1.0]},
    "RCA": {"name": "RCA", "color": [0.52, 0.28, 0.82, 1.0]},
}


def align4(data: bytes, pad_byte: bytes = b"\x00") -> bytes:
    return data + (pad_byte * ((4 - len(data) % 4) % 4))


def gltf_name(value: str) -> str:
    keep = []
    for char in value:
        if char.isalnum():
            keep.append(char)
        elif char in {" ", "-", "_"}:
            keep.append("_")
    return "_".join("".join(keep).split("_")).strip("_")


def parse_obj(path: Path) -> tuple[list[tuple[float, float, float]], list[tuple[int, int, int]]]:
    vertices: list[tuple[float, float, float]] = []
    triangles: list[tuple[int, int, int]] = []
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        for line in handle:
            if line.startswith("v "):
                parts = line.split()
                vertices.append((float(parts[1]), float(parts[2]), float(parts[3])))
            elif line.startswith("f "):
                face_indices = []
                for token in line.split()[1:]:
                    raw = token.split("/")[0]
                    index = int(raw)
                    face_indices.append(index - 1 if index > 0 else len(vertices) + index)
                for i in range(1, len(face_indices) - 1):
                    triangles.append((face_indices[0], face_indices[i], face_indices[i + 1]))
    return vertices, triangles


def manifest_entries(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for group in ["heart_body", "aorta", "neutral_coronary", "lad", "lcx", "rca"]:
        for item in manifest[group]:
            item = dict(item)
            item["group"] = {
                "heart_body": "HeartBody",
                "aorta": "Aorta",
                "neutral_coronary": "LeftCoronaryStem",
                "lad": "LAD",
                "lcx": "LCX",
                "rca": "RCA",
            }[group]
            entries.append(item)
    return entries


def combined_bounds(meshes: list[dict[str, Any]]) -> tuple[list[float], list[float]]:
    mins = [math.inf, math.inf, math.inf]
    maxs = [-math.inf, -math.inf, -math.inf]
    for mesh in meshes:
        for vertex in mesh["vertices"]:
            for axis in range(3):
                mins[axis] = min(mins[axis], vertex[axis])
                maxs[axis] = max(maxs[axis], vertex[axis])
    return mins, maxs


def normalize_meshes(meshes: list[dict[str, Any]]) -> dict[str, Any]:
    mins, maxs = combined_bounds(meshes)
    center = [(mins[i] + maxs[i]) / 2 for i in range(3)]
    extent = max(maxs[i] - mins[i] for i in range(3))
    scale = 2.0 / extent
    for mesh in meshes:
        mesh["vertices"] = [
            ((x - center[0]) * scale, (z - center[2]) * scale, -(y - center[1]) * scale)
            for x, y, z in mesh["vertices"]
        ]
    return {"source_bbox_min": mins, "source_bbox_max": maxs, "center": center, "scale": scale}


def export_glb(meshes: list[dict[str, Any]], output: Path, normalization: dict[str, Any]) -> dict[str, Any]:
    binary = bytearray()
    gltf: dict[str, Any] = {
        "asset": {"version": "2.0", "generator": "CardioTwin prepare_heart_model.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "CardioTwinHeart", "children": []}],
        "meshes": [],
        "materials": [],
        "buffers": [{"byteLength": 0}],
        "bufferViews": [],
        "accessors": [],
        "extras": {"normalization": normalization},
    }
    material_indices: dict[str, int] = {}
    for group, material in MATERIALS.items():
        material_indices[group] = len(gltf["materials"])
        gltf["materials"].append(
            {
                "name": material["name"],
                "pbrMetallicRoughness": {
                    "baseColorFactor": material["color"],
                    "metallicFactor": 0.0,
                    "roughnessFactor": 0.72,
                },
            }
        )

    group_nodes: dict[str, int] = {}
    for group in MATERIALS:
        group_nodes[group] = len(gltf["nodes"])
        gltf["nodes"].append({"name": group, "children": []})
        gltf["nodes"][0]["children"].append(group_nodes[group])

    for mesh in meshes:
        vertices = mesh["vertices"]
        triangles = mesh["triangles"]
        flat_positions = [component for vertex in vertices for component in vertex]
        flat_indices = [index for tri in triangles for index in tri]

        pos_offset = len(binary)
        binary.extend(struct.pack("<" + "f" * len(flat_positions), *flat_positions))
        binary.extend(b"\x00" * ((4 - len(binary) % 4) % 4))
        idx_offset = len(binary)
        binary.extend(struct.pack("<" + "I" * len(flat_indices), *flat_indices))
        binary.extend(b"\x00" * ((4 - len(binary) % 4) % 4))

        pos_view = len(gltf["bufferViews"])
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": pos_offset, "byteLength": len(flat_positions) * 4, "target": 34962})
        idx_view = len(gltf["bufferViews"])
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": idx_offset, "byteLength": len(flat_indices) * 4, "target": 34963})

        mins = [min(v[i] for v in vertices) for i in range(3)]
        maxs = [max(v[i] for v in vertices) for i in range(3)]
        pos_accessor = len(gltf["accessors"])
        gltf["accessors"].append(
            {"bufferView": pos_view, "componentType": 5126, "count": len(vertices), "type": "VEC3", "min": mins, "max": maxs}
        )
        idx_accessor = len(gltf["accessors"])
        gltf["accessors"].append({"bufferView": idx_view, "componentType": 5125, "count": len(flat_indices), "type": "SCALAR"})

        mesh_index = len(gltf["meshes"])
        gltf["meshes"].append(
            {
                "name": mesh["node_name"],
                "primitives": [
                    {
                        "attributes": {"POSITION": pos_accessor},
                        "indices": idx_accessor,
                        "material": material_indices[mesh["group"]],
                        "mode": 4,
                    }
                ],
                "extras": {
                    "source_filename": mesh["source_filename"],
                    "anatomical_name": mesh["anatomical_name"],
                    "role": mesh["role"],
                    "confidence": mesh["confidence"],
                },
            }
        )
        node_index = len(gltf["nodes"])
        gltf["nodes"].append({"name": mesh["node_name"], "mesh": mesh_index})
        gltf["nodes"][group_nodes[mesh["group"]]]["children"].append(node_index)

    gltf["buffers"][0]["byteLength"] = len(binary)
    json_chunk = align4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = align4(bytes(binary))
    total_length = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as handle:
        handle.write(struct.pack("<4sII", b"glTF", 2, total_length))
        handle.write(struct.pack("<I4s", len(json_chunk), b"JSON"))
        handle.write(json_chunk)
        handle.write(struct.pack("<I4s", len(bin_chunk), b"BIN\x00"))
        handle.write(bin_chunk)

    return {
        "path": str(output),
        "file_size_bytes": output.stat().st_size,
        "mesh_count": len(gltf["meshes"]),
        "node_count": len(gltf["nodes"]),
        "materials": [material["name"] for material in gltf["materials"]],
        "vertex_count": sum(len(mesh["vertices"]) for mesh in meshes),
        "triangle_count": sum(len(mesh["triangles"]) for mesh in meshes),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare CardioTwin browser-ready GLB from selected BodyParts3D OBJ files.")
    parser.add_argument("--manifest", default="scripts/heart_asset_manifest.json")
    parser.add_argument("--output", default="frontend/public/models/heart/processed/cardiotwin_heart.glb")
    parser.add_argument("--report", default="frontend/public/models/heart/processed/cardiotwin_heart_report.json")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    source_dir = Path(manifest["source_directory"])
    meshes = []
    for entry in manifest_entries(manifest):
        vertices, triangles = parse_obj(source_dir / entry["source_filename"])
        meshes.append(
            {
                **entry,
                "vertices": vertices,
                "triangles": triangles,
                "node_name": f"{entry['group']}_{gltf_name(entry['role'])}",
            }
        )

    normalization = normalize_meshes(meshes)
    report = export_glb(meshes, Path(args.output), normalization)
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
