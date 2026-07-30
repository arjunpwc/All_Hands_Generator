from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.qa_service import qa_service
from app.services.session_service import session_service

router = APIRouter(prefix="/api/sessions", tags=["qa"])


class QuestionCreate(BaseModel):
    name: str | None = None
    author: str | None = None
    text: str = Field(min_length=1, max_length=2000)


class StoredQuestion(BaseModel):
    id: str
    name: str
    text: str
    time: str


@router.get("/{session_id}/questions", response_model=list[StoredQuestion])
def list_questions(session_id: str):
    if not session_service.get_meta(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return qa_service.list_questions(session_id)


@router.post("/{session_id}/questions", response_model=StoredQuestion, status_code=201)
def create_question(session_id: str, body: QuestionCreate):
    if not session_service.get_meta(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    name = body.name or body.author or "Anonymous"
    try:
        return qa_service.add_question(session_id, name, body.text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
