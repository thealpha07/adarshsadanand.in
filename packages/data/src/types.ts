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
export type BookFormat = "book" | "manga" | "light_novel" | "graphic_novel";
export type BookCategory = "fiction" | "nonfiction";
export type CreditRole = "author" | "story" | "art" | "translator" | "editor";
export interface Credit {
  name: string;
  role: CreditRole;
}
export interface Genre {
  slug: string;
  name: string;
  kind: BookCategory | "any";
  sort: number;
}

/** A book as books_public returns it: credits and genre keys come folded in (migration 0007). */
export interface Book {
  id: string;
  title: string;
  original_title: string | null;
  format: BookFormat;
  category: BookCategory | null;
  isbn: string | null;
  cover_url: string | null;
  shelf: Shelf;
  rating: number | null;
  recommended: boolean;
  /** One line about the book, shown on its card. For any book, not only recommended ones. */
  one_liner: string | null;
  /** Null on the public view unless the note is marked public. */
  note: string | null;
  note_public?: boolean;
  /** Vault only: books_public returns public books only (0008), so visitors never see this field. */
  visibility?: Visibility;
  translated_from: string | null;
  series: string | null;
  series_number: number | null;
  volumes_read: number | null;
  volumes_total: number | null;
  started_on: string | null;
  finished_on: string | null;
  created_at: string;
  /** In order: authors (or story and art) first, then translators and editors. */
  credits: Credit[];
  /** Genre keys, e.g. "literary-fiction"; names come from listGenres(). */
  genres: string[];
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
