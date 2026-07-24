from __future__ import annotations

from pathlib import Path
import json
import re
from typing import Dict, Optional


BASE_DIR = Path(__file__).resolve().parents[1]
STORAGE_DIR = BASE_DIR / "storage"
INPUTS_DIR = STORAGE_DIR / "inputs"
PERSON_DIR = INPUTS_DIR / "person"
OUTFIT_DIR = INPUTS_DIR / "outfit"
OUTPUT_DIR = STORAGE_DIR / "output"
METADATA_DIR = STORAGE_DIR / "metadata"

for d in (PERSON_DIR, OUTFIT_DIR, OUTPUT_DIR, METADATA_DIR):
    d.mkdir(parents=True, exist_ok=True)


def _meta_path(session_id: str) -> Path:
    if not re.fullmatch(r"[a-f0-9-]{36}", session_id, re.IGNORECASE):
        raise ValueError("Invalid session id")
    return METADATA_DIR / f"{session_id}.json"


def _read_meta(session_id: str) -> dict:
    p = _meta_path(session_id)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            return {}
    return {}


def _write_meta(session_id: str, data: dict) -> None:
    _meta_path(session_id).write_text(json.dumps(data))


class SessionStore:
    def save_image(self, session_id: str, slot: str, image_bytes: bytes, content_type: str) -> None:
        if slot == "person":
            path = PERSON_DIR / f"{session_id}.jpg"
        elif slot == "outfit":
            path = OUTFIT_DIR / f"{session_id}.jpg"
        else:
            raise ValueError("slot must be 'person' or 'outfit'")
        path.write_bytes(image_bytes)
        meta = _read_meta(session_id)
        meta.setdefault("images", {})[slot] = {"path": str(path), "content_type": content_type}
        _write_meta(session_id, meta)

    def save_image_from_path(self, session_id: str, slot: str, file_path: Path, content_type: str) -> None:
        if slot == "person":
            dest_path = PERSON_DIR / f"{session_id}.jpg"
        elif slot == "outfit":
            dest_path = OUTFIT_DIR / f"{session_id}.jpg"
        else:
            raise ValueError("slot must be 'person' or 'outfit'")
        
        import shutil
        shutil.copy2(file_path, dest_path)
        
        meta = _read_meta(session_id)
        if slot == "outfit":
            meta["product_id"] = file_path.stem
        meta.setdefault("images", {})[slot] = {"path": str(dest_path), "content_type": content_type}
        _write_meta(session_id, meta)

    def get_images(self, session_id: str) -> Dict[str, Optional[dict]]:
        meta = _read_meta(session_id)
        images = {"person": None, "outfit": None}
        for slot in ("person", "outfit"):
            slot_info = meta.get("images", {}).get(slot)
            if slot_info:
                p = Path(slot_info["path"])
                if p.exists():
                    images[slot] = {"bytes": p.read_bytes(), "content_type": slot_info.get("content_type", "image/jpeg")}
        return images

    def save_result(self, session_id: str, result_payload: dict) -> None:
        meta = _read_meta(session_id)
        meta["result"] = result_payload
        _write_meta(session_id, meta)

    def record_usage(self, session_id: str, usage: dict) -> dict:
        meta = _read_meta(session_id)
        totals = meta.get("usage_totals", {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0})
        for key in ("input_tokens", "output_tokens", "total_tokens"):
            totals[key] = totals.get(key, 0) + int(usage.get(key, 0) or 0)
        meta["usage_totals"] = totals
        _write_meta(session_id, meta)
        return {"totals": totals, "last": usage}

    def get_usage_totals(self, session_id: str) -> dict:
        meta = _read_meta(session_id)
        return meta.get("usage_totals", {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0})

    def get_result(self, session_id: str) -> Optional[dict]:
        meta = _read_meta(session_id)
        return meta.get("result")

    def clear_session(self, session_id: str) -> None:
        meta = _read_meta(session_id)
        for slot in ("person", "outfit"):
            slot_info = meta.get("images", {}).get(slot)
            if slot_info:
                p = Path(slot_info["path"])
                if p.exists():
                    p.unlink()
        if meta.get("result"):
            p = Path(meta["result"].get("path", ""))
            if p.exists():
                p.unlink()
        mp = _meta_path(session_id)
        if mp.exists():
            mp.unlink()


store = SessionStore()
