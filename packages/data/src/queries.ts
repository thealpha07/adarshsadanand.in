import { supabase } from "./client";
import type { Anecdote, Book, Person, Post } from "./types";

/**
 * Read queries for the public sites. They read from *_public views, which
 * already filter out drafts, private rows and private columns at the database.
 * The UI never has to remember to hide anything.
 */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listPosts(): Promise<Post[]> {
  return unwrap(await supabase.from("posts_public").select("*").order("published_at", { ascending: false }));
}

export async function getPost(slug: string): Promise<Post | null> {
  return unwrap(await supabase.from("posts_public").select("*").eq("slug", slug).maybeSingle());
}

export async function listBooks(): Promise<Book[]> {
  return unwrap(
    await supabase.from("books_public").select("*").order("finished_on", { ascending: false, nullsFirst: true }).order("created_at", { ascending: false }),
  );
}

export async function listPeople(): Promise<Person[]> {
  return unwrap(await supabase.from("people_public").select("*").order("sort_order").order("created_at"));
}

export async function getPerson(slug: string): Promise<{ person: Person | null; anecdotes: Anecdote[] }> {
  const person: Person | null = unwrap(await supabase.from("people_public").select("*").eq("slug", slug).maybeSingle());
  if (!person) return { person: null, anecdotes: [] };
  const anecdotes: Anecdote[] = unwrap(
    await supabase.from("anecdotes_public").select("*").eq("person_id", person.id).order("created_at", { ascending: false }),
  );
  return { person, anecdotes };
}

/** Public URL of an image in the blog-images bucket. */
export function blogImageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
}
