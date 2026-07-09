export interface SlideShape {
  type: string;
  bullets?: string[];
  src?: string;
  alt?: string;
  rows?: string[][];
  children?: SlideShape[];
}

export interface Slide {
  index: number;
  title: string;
  shapes: SlideShape[];
  notes?: string;
}

export interface Session {
  id: string;
  title: string;
  author?: string;
  slide_count: number;
  current_slide?: number;
  status?: string;
  slides: Slide[];
}

export interface Question {
  id: string;
  author: string;
  text: string;
  upvotes: number;
  highlighted?: boolean;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  active: boolean;
}

export interface LiveState {
  current_slide: number;
  slide_count: number;
  questions: Question[];
  polls: Poll[];
  reactions: Record<string, number>;
}

export interface CreateSessionResponse {
  session_id: string;
  title: string;
  slide_count: number;
  presenter_url: string;
  attendee_url: string;
}
