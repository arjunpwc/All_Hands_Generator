"""Session storage and PPTX ingestion."""

from __future__ import annotations

import json
import shutil
import sys
import uuid
from pathlib import Path

from app.config import settings

# Allow importing the generator package from repo root
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from generator import build_session_site, parse_pptx


class SessionService:
    def __init__(self) -> None:
        self.sessions_dir = Path(settings.sessions_dir)
        self.uploads_dir = Path(settings.uploads_dir)
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

    def _session_dir(self, session_id: str) -> Path:
        return self.sessions_dir / session_id

    def _meta_path(self, session_id: str) -> Path:
        return self._session_dir(session_id) / "meta.json"

    def _session_json_path(self, session_id: str) -> Path:
        return self._session_dir(session_id) / "session.json"

    def create_from_pptx(self, pptx_path: Path, title: str | None = None) -> dict:
        session_id = str(uuid.uuid4())[:8]
        session_dir = self._session_dir(session_id)
        session_dir.mkdir(parents=True, exist_ok=True)

        parsed = parse_pptx(pptx_path)
        if title:
            parsed["title"] = title

        build_session_site(parsed, session_dir)

        meta = {
            "id": session_id,
            "title": parsed["title"],
            "author": parsed.get("author", ""),
            "slide_count": parsed["slide_count"],
            "current_slide": 1,
            "status": "ready",
        }
        self._meta_path(session_id).write_text(json.dumps(meta, indent=2), encoding="utf-8")
        return meta

    def list_sessions(self) -> list[dict]:
        sessions: list[dict] = []
        for meta_file in self.sessions_dir.glob("*/meta.json"):
            sessions.append(json.loads(meta_file.read_text(encoding="utf-8")))
        return sorted(sessions, key=lambda s: s.get("title", ""))

    def get_meta(self, session_id: str) -> dict | None:
        meta_path = self._meta_path(session_id)
        if not meta_path.exists():
            return None
        return json.loads(meta_path.read_text(encoding="utf-8"))

    def get_session(self, session_id: str) -> dict | None:
        meta = self.get_meta(session_id)
        session_path = self._session_json_path(session_id)
        if not meta or not session_path.exists():
            return None

        session_data = json.loads(session_path.read_text(encoding="utf-8"))
        return {**meta, **session_data}

    def update_meta(self, session_id: str, updates: dict) -> dict | None:
        meta = self.get_meta(session_id)
        if not meta:
            return None
        meta.update(updates)
        self._meta_path(session_id).write_text(json.dumps(meta, indent=2), encoding="utf-8")
        return meta

    def save_upload(self, filename: str, content: bytes) -> Path:
        safe_name = Path(filename).name
        upload_path = self.uploads_dir / f"{uuid.uuid4().hex[:8]}_{safe_name}"
        upload_path.write_bytes(content)
        return upload_path

    def delete_session(self, session_id: str) -> bool:
        session_dir = self._session_dir(session_id)
        if not session_dir.exists():
            return False
        shutil.rmtree(session_dir)
        return True


session_service = SessionService()
