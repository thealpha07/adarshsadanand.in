/** Row shapes. They mirror supabase/migrations/*.sql; change both together. */

export type PostStatus = "draft" | "published";
export interface Post {
  id: string;
  slug: string;
  title: string;
  /** The softer second phrase of a two-tone title. */
  subtitle: string | null;
  excerpt: string | null;
  body_md: string;
  cover_path: string | null;
  tags: string[];
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Shelf = "want" | "reading" | "read";
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_url: string | null;
  shelf: Shelf;
  rating: number | null;
  recommended: boolean;
  recommend_reason: string | null;
  /** Null on the public view unless the note is marked public. */
  note: string | null;
  note_public?: boolean;
  started_on: string | null;
  finished_on: string | null;
  created_at: string;
}

export type Visibility = "public" | "private";
export interface Person {
  id: string;
  slug: string;
  alias: string;
  /** Private: never exposed by the public view. */
  initials?: string | null;
  context: string | null;
  met_label: string | null;
  impression_headline: string | null;
  first_impression: string | null;
  traits: string[];
  match_kind: string | null;
  match_value: string | null;
  match_reason: string | null;
  visibility?: Visibility;
  sort_order: number;
  created_at: string;
}

export interface Anecdote {
  id: string;
  person_id: string;
  occurred_label: string | null;
  body: string;
  is_public?: boolean;
  created_at: string;
}

export interface VaultFile {
  id: string;
  name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string | null;
  created_at: string;
}

export type LearningStage = "started" | "practising" | "applying";
export interface Learning {
  id: string;
  topic: string;
  focus: string | null;
  stage: LearningStage;
  started_on: string | null;
  link: string | null;
  /** Admin only: hidden rows never reach the public view. */
  visible?: boolean;
  sort_order: number;
}
