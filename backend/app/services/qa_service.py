"""Persist Q&A submissions per session for the static all-hands site."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings
from app.services.session_service import session_service


class QaService:
    def _qa_path(self, session_id: str) -> Path:
        return Path(settings.sessions_dir) / session_id / "qa.json"

    def _read(self, session_id: str) -> list[dict]:
        path = self._qa_path(session_id)
        if not path.exists():
            return []
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (json.JSONDecodeError, OSError):
            return []

    def _write(self, session_id: str, questions: list[dict]) -> None:
        path = self._qa_path(session_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(questions, indent=2), encoding="utf-8")

    def list_questions(self, session_id: str) -> list[dict]:
        if not session_service.get_meta(session_id):
            return []
        return self._read(session_id)

    def add_question(self, session_id: str, name: str, text: str) -> dict:
        if not session_service.get_meta(session_id):
            raise ValueError("Session not found")

        cleaned = text.strip()
        if not cleaned:
            raise ValueError("Question text is required")

        display_name = (name or "Anonymous").strip() or "Anonymous"
        question = {
            "id": uuid.uuid4().hex[:8],
            "name": display_name,
            "text": cleaned,
            "time": datetime.now(timezone.utc).isoformat(),
        }

        questions = self._read(session_id)
        questions.insert(0, question)
        self._write(session_id, questions)
        return question


qa_service = QaService()
