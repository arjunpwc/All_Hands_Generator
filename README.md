# All Hands Generator

Turn PowerPoint decks into interactive all-hands meeting websites, hosted on Oracle Cloud Infrastructure (OCI).

**Repository:** [github.com/arjunpwc/All_Hands_Generator](https://github.com/arjunpwc/All_Hands_Generator)

## What it does

1. **Upload** a `.pptx` deck via the admin UI or API
2. **Parse** slides into structured content (titles, bullets, images, speaker notes)
3. **Generate** a session-specific website with presenter and attendee views
4. **Interact** in real time — slide sync, Q&A, polls, and reactions during the call

## Architecture

```
┌─────────────┐     upload .pptx      ┌──────────────────┐
│   Admin /   │ ────────────────────► │  FastAPI Backend │
│  Presenter  │                       │  + PPTX Parser   │
└─────────────┘                       └────────┬─────────┘
       │                                       │
       │ WebSocket                             │ static assets
       ▼                                       ▼
┌─────────────┐                       ┌──────────────────┐
│  Attendees  │ ◄── live sync ──────► │  React Frontend  │
└─────────────┘                       └──────────────────┘
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  OCI Deployment  │
                                      │  Container Inst. │
                                      │  + Object Storage│
                                      └──────────────────┘
```

## Quick start (local)

### Generate from PowerPoint (Node only — no Python required)

```bash
node generator/generate.mjs "path/to/deck.pptx" my-session-id
node generator/write-preview.mjs my-session-id
```

Open `data/sessions/my-session-id/preview.html` in a browser.

### Full stack (Python + Node)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — upload a deck, start a session, share the attendee link.

## OCI deployment

See [deploy/README.md](deploy/README.md) for:

- Docker image build and push to OCIR
- OCI Container Instance deployment
- Object Storage for generated slide assets
- Optional API Gateway + custom domain

## API overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | POST | Create session from uploaded PPTX |
| `/api/sessions/{id}` | GET | Get session metadata and slides |
| `/api/sessions/{id}/upload` | POST | Upload PPTX to existing session |
| `/ws/{session_id}` | WebSocket | Real-time slide sync and interaction |

## Interaction features

- **Slide sync** — presenter advances slides; attendees follow automatically
- **Q&A** — attendees submit questions; presenter can highlight or dismiss
- **Polls** — presenter launches polls; live results update for everyone
- **Reactions** — quick emoji reactions during the presentation

## Project structure

```
allhands-web/
├── backend/          # FastAPI API + WebSocket server
├── generator/        # PPTX parsing library
├── frontend/         # React + Vite attendee/presenter UI
├── deploy/           # Docker, Terraform, OCI configs
└── data/             # Local session data (gitignored)
```
