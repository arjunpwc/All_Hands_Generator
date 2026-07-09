from pydantic import BaseModel, Field


class SlideShape(BaseModel):
    type: str
    bullets: list[str] | None = None
    src: str | None = None
    alt: str | None = None
    rows: list[list[str]] | None = None
    children: list["SlideShape"] | None = None


class Slide(BaseModel):
    index: int
    title: str
    shapes: list[SlideShape]
    notes: str = ""


class SessionMeta(BaseModel):
    id: str
    title: str
    author: str = ""
    slide_count: int
    current_slide: int = 1
    status: str = "ready"


class SessionDetail(SessionMeta):
    slides: list[Slide]


class Question(BaseModel):
    id: str
    author: str
    text: str
    upvotes: int = 0
    highlighted: bool = False


class PollOption(BaseModel):
    id: str
    label: str
    votes: int = 0


class Poll(BaseModel):
    id: str
    question: str
    options: list[PollOption]
    active: bool = True


class ReactionEvent(BaseModel):
    emoji: str
    count: int = 1


class CreateSessionResponse(BaseModel):
    session_id: str
    title: str
    slide_count: int
    presenter_url: str
    attendee_url: str


class SessionState(BaseModel):
    session: SessionMeta
    questions: list[Question] = Field(default_factory=list)
    polls: list[Poll] = Field(default_factory=list)
    reactions: dict[str, int] = Field(default_factory=dict)
