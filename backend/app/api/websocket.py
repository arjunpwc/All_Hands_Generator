from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.session_service import session_service
from app.services.websocket_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{session_id}")
async def session_websocket(websocket: WebSocket, session_id: str, role: str = "attendee"):
    session = session_service.get_session(session_id)
    if not session:
        await websocket.close(code=4004)
        return

    if session_id not in manager.state:
        manager.init_session(session_id, session["slide_count"])

    await manager.connect(session_id, websocket, role=role)

    try:
        while True:
            data = await websocket.receive_json()
            await manager.handle_message(session_id, websocket, data)
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
