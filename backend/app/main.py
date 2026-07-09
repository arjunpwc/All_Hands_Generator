from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.sessions import router as sessions_router
from app.api.websocket import router as websocket_router
from app.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)
app.include_router(websocket_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name}


sessions_path = Path(settings.sessions_dir)
if sessions_path.exists():
    app.mount("/static/sessions", StaticFiles(directory=str(sessions_path)), name="session-assets")

frontend_dist = Path(__file__).resolve().parents[2] / "static"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend-assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            return {"detail": "Not found"}
        index = frontend_dist / "index.html"
        if full_path and (frontend_dist / full_path).is_file():
            return FileResponse(frontend_dist / full_path)
        return FileResponse(index)

