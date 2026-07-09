from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.schemas import CreateSessionResponse, SessionDetail, SessionMeta
from app.services.session_service import session_service
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionMeta])
def list_sessions():
    return session_service.list_sessions()


@router.post("", response_model=CreateSessionResponse)
async def create_session(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
):
    if not file.filename or not file.filename.lower().endswith((".pptx", ".ppt")):
        raise HTTPException(status_code=400, detail="Upload a .pptx PowerPoint file")

    content = await file.read()
    upload_path = session_service.save_upload(file.filename, content)
    meta = session_service.create_from_pptx(upload_path, title=title)

    manager.init_session(meta["id"], meta["slide_count"])

    base = f"/session/{meta['id']}"
    return CreateSessionResponse(
        session_id=meta["id"],
        title=meta["title"],
        slide_count=meta["slide_count"],
        presenter_url=f"{base}?role=presenter",
        attendee_url=base,
    )


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/{session_id}")
def delete_session(session_id: str):
    if not session_service.delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}


@router.patch("/{session_id}/status")
def update_status(session_id: str, status: str):
    meta = session_service.update_meta(session_id, {"status": status})
    if not meta:
        raise HTTPException(status_code=404, detail="Session not found")
    return meta
