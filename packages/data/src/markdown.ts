import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Markdown to safe HTML. Posts are written only by the admin, but sanitising
 * anyway means a compromised account still cannot inject scripts into readers' browsers.
 */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/**
 * Splits a post's Markdown after its first `n` paragraphs, so the cover image can sit between the opening
 * and the rest. Only real paragraphs count: headings, quotes, lists and code don't. When the post has `n`
 * paragraphs or fewer, everything is the opening and the rest is empty, so the image goes at the end.
 * Works on marked's own tokens, so a blank line inside a code block can't be mistaken for a paragraph break.
 */
export function splitAfterParagraphs(md: string, n: number): [opening: string, rest: string] {
  const tokens = marked.lexer(md);
  let seen = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === "paragraph" && ++seen === n) {
      const cut = i + 1;
      return [tokens.slice(0, cut).map((t) => t.raw).join("").trim(), tokens.slice(cut).map((t) => t.raw).join("").trim()];
    }
  }
  return [md.trim(), ""];
}
