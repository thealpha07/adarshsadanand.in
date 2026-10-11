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
