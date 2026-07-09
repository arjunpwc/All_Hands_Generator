"""WebSocket connection manager for real-time all-hands interaction."""

from __future__ import annotations

import json
import uuid
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[str, set[WebSocket]] = defaultdict(set)
        self.state: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "current_slide": 1,
                "questions": [],
                "polls": [],
                "reactions": {},
            }
        )

    async def connect(self, session_id: str, websocket: WebSocket, role: str = "attendee") -> None:
        await websocket.accept()
        websocket.state.role = role
        self.active[session_id].add(websocket)
        await websocket.send_json(
            {
                "type": "state",
                "payload": self.state[session_id],
            }
        )

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        self.active[session_id].discard(websocket)
        if not self.active[session_id]:
            self.active.pop(session_id, None)

    async def broadcast(self, session_id: str, message: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for connection in list(self.active.get(session_id, set())):
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for connection in dead:
            self.disconnect(session_id, connection)

    def init_session(self, session_id: str, slide_count: int) -> None:
        self.state[session_id] = {
            "current_slide": 1,
            "slide_count": slide_count,
            "questions": [],
            "polls": [],
            "reactions": {},
        }

    async def handle_message(self, session_id: str, websocket: WebSocket, data: dict[str, Any]) -> None:
        msg_type = data.get("type")
        payload = data.get("payload", {})
        state = self.state[session_id]
        role = getattr(websocket.state, "role", "attendee")

        if msg_type == "slide_change":
            if role != "presenter":
                return
            slide = int(payload.get("slide", 1))
            state["current_slide"] = max(1, min(slide, state.get("slide_count", slide)))
            await self.broadcast(session_id, {"type": "slide_change", "payload": {"slide": state["current_slide"]}})
            return

        if msg_type == "question":
            question = {
                "id": str(uuid.uuid4())[:8],
                "author": payload.get("author", "Anonymous"),
                "text": payload.get("text", "").strip(),
                "upvotes": 0,
                "highlighted": False,
            }
            if not question["text"]:
                return
            state["questions"].append(question)
            await self.broadcast(session_id, {"type": "question", "payload": question})
            return

        if msg_type == "upvote_question":
            question_id = payload.get("id")
            for q in state["questions"]:
                if q["id"] == question_id:
                    q["upvotes"] += 1
                    await self.broadcast(session_id, {"type": "question_updated", "payload": q})
                    return

        if msg_type == "highlight_question":
            if role != "presenter":
                return
            question_id = payload.get("id")
            for q in state["questions"]:
                if q["id"] == question_id:
                    q["highlighted"] = not q.get("highlighted", False)
                    await self.broadcast(session_id, {"type": "question_updated", "payload": q})
                    return

        if msg_type == "start_poll":
            if role != "presenter":
                return
            poll = {
                "id": str(uuid.uuid4())[:8],
                "question": payload.get("question", "Quick poll"),
                "options": [
                    {"id": str(uuid.uuid4())[:6], "label": label, "votes": 0}
                    for label in payload.get("options", ["Yes", "No"])
                ],
                "active": True,
            }
            state["polls"].append(poll)
            await self.broadcast(session_id, {"type": "poll_started", "payload": poll})
            return

        if msg_type == "vote_poll":
            poll_id = payload.get("poll_id")
            option_id = payload.get("option_id")
            for poll in state["polls"]:
                if poll["id"] == poll_id and poll.get("active"):
                    for option in poll["options"]:
                        if option["id"] == option_id:
                            option["votes"] += 1
                            await self.broadcast(session_id, {"type": "poll_updated", "payload": poll})
                            return

        if msg_type == "end_poll":
            if role != "presenter":
                return
            poll_id = payload.get("poll_id")
            for poll in state["polls"]:
                if poll["id"] == poll_id:
                    poll["active"] = False
                    await self.broadcast(session_id, {"type": "poll_updated", "payload": poll})
                    return

        if msg_type == "reaction":
            emoji = payload.get("emoji", "👍")
            state["reactions"][emoji] = state["reactions"].get(emoji, 0) + 1
            await self.broadcast(
                session_id,
                {"type": "reaction", "payload": {"emoji": emoji, "count": state["reactions"][emoji]}},
            )


manager = ConnectionManager()
