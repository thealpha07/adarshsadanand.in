import { BrowserRouter, Link, Route, Routes, useParams } from "react-router";
import { useEffect, type ReactNode } from "react";
import { Empty, Failed, Loading, PageBand, SiteFooter, SiteHeader } from "@site/ui";
import { blogImageUrl, formatDate, getPost, listPosts, renderMarkdown, splitAfterParagraphs, useAsync, type Post } from "@site/data";
import "./blog.css";

export function App() {
  return (
    <BrowserRouter>
      <div style={{ ["--site" as string]: "var(--cobalt)" }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/:slug" element={<PostPage />} />
        </Routes>
        <SiteFooter />
      </div>
    </BrowserRouter>
  );
}

function readingTime(md: string): string {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

function Index() {
  const { state } = useAsync(listPosts);
  useEffect(() => { document.title = "Thoughts · Adarsh Sadanand"; }, []);

  return (
    <>
      <PageBand
        site="thoughts"
        tag="blog.adarshsadanand.in"
        title="Thoughts"
        ghost="Notes"
        intro="Questions I keep turning over: who we are, how others see us, and what the stories we read leave behind."
      />
      <main id="main" className="wrap" style={{ paddingTop: 72, paddingBottom: 96 }}>
        {state.status === "loading" && <Loading label="Loading thoughts" />}
        {state.status === "error" && <Failed message={state.message} />}
        {state.status === "ready" && state.data.length === 0 && <Empty>No thoughts published yet. The first one is on its way.</Empty>}
        {state.status === "ready" && state.data.length > 0 && <PostList posts={state.data} />}
      </main>
    </>
  );
}

function Title({ post }: { post: Post }) {
  return (
    <>
      {post.title}
      {post.subtitle && <> <span className="soft">{post.subtitle}</span></>}
    </>
  );
}

/** How many of the newest posts get a card; older ones are listed by date below. */
const CARDS = 3;

/**
 * The newest three posts as cards that step down left, right, left, like a magazine spread; every older post
 * in the dated list. Cards stay in reading order (newest first) for keyboards and screen readers; the stagger
 * is only CSS. Design: docs/adr/0014-library-details-and-thoughts-layout.md
 */
function PostList({ posts }: { posts: Post[] }) {
  const cards = posts.slice(0, CARDS);
  const rest = posts.slice(CARDS);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 96 }}>
      <ol className="post-cards">
        {cards.map((p, i) => {
          const cover = blogImageUrl(p.cover_path);
          return (
            <li key={p.id} className="post-card-item">
              <Link to={`/${p.slug}`} className="post-card">
                {cover
                  ? <img src={cover} alt="" className="post-card-cover" loading={i ? "lazy" : undefined} />
                  : <div className="post-card-cover feature-cover-empty" aria-hidden="true"><span className="grot">✳</span></div>}
                {i === 0 && <span className="tag">Latest</span>}
                <span className="grot post-card-title"><Title post={p} /></span>
                {p.excerpt && <span className="body-2 post-card-excerpt">{p.excerpt}</span>}
                <span className="mono muted">{formatDate(p.published_at)} · {readingTime(p.body_md)}{p.tags.length ? ` · ${p.tags.join(", ")}` : ""}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      {rest.length > 0 && (
        <section aria-labelledby="all-h">
          <h2 id="all-h" className="grot" style={{ fontSize: "clamp(36px, 9vw, 56px)", lineHeight: 1, marginBottom: 24 }}>All <span className="soft">thoughts</span></h2>
          <ol className="post-list">
            {rest.map((p) => (
              <li key={p.id}>
                <Link className="post-row" to={`/${p.slug}`}>
                  <span className="mono muted" style={{ paddingTop: 6 }}>{formatDate(p.published_at)}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span className="grot" style={{ fontSize: 28, lineHeight: "30px" }}><Title post={p} /></span>
                    {p.excerpt && <span className="body-2">{p.excerpt}</span>}
                    <span className="mono muted">{readingTime(p.body_md)}{p.tags.length ? ` · ${p.tags.join(", ")}` : ""}</span>
                  </span>
                  <span aria-hidden="true" className="post-arrow">↗</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function PostPage() {
  const { slug = "" } = useParams();
  const { state } = useAsync(() => getPost(slug), [slug]);
  const post = state.status === "ready" ? state.data : null;
  useEffect(() => { if (post) document.title = `${post.title} · Thoughts`; }, [post]);

  if (state.status === "loading") return <PlainBand><Loading /></PlainBand>;
  if (state.status === "error") return <PlainBand><Failed message={state.message} /></PlainBand>;
  if (!post) return <PlainBand><Empty>This thought doesn't exist, or isn't published yet. <Link to="/">See all thoughts</Link>.</Empty></PlainBand>;

  const cover = blogImageUrl(post.cover_path);
  const [opening, rest] = splitAfterParagraphs(post.body_md, 2);
  return (
    <>
      <section className="band on-dark">
        <div className="band-grid" aria-hidden="true" />
        <SiteHeader current="thoughts" />
        <div className="read" style={{ position: "relative", paddingTop: 40, paddingBottom: 64, display: "flex", flexDirection: "column", gap: 20 }}>
          <Link to="/" className="mono" style={{ color: "var(--on-hero-soft)" }}>← All thoughts</Link>
          <h1 className="grot" style={{ fontSize: "clamp(40px, 6vw, 56px)", lineHeight: 1.04, color: "#fff" }}><Title post={post} /></h1>
          <span className="mono" style={{ color: "var(--on-hero-soft)" }}>{formatDate(post.published_at)} · {readingTime(post.body_md)}</span>
          {post.tags.length > 0 && (
            <ul className="tag-list">{post.tags.map((t) => <li key={t} className="chip chip-dark">{t}</li>)}</ul>
          )}
        </div>
      </section>
      <main id="main" style={{ paddingTop: 56, paddingBottom: 96 }}>
        <article>
          {/* Two paragraphs first, so the post opens with words; then the image; then the rest. */}
          <div className="read prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(opening) }} />
          {cover && <img src={cover} alt="" className="post-cover" />}
          {rest && <div className="read prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(rest) }} />}
        </article>
      </main>
    </>
  );
}

function PlainBand({ children }: { children: ReactNode }) {
  return (
    <>
      <section className="band on-dark"><div className="band-grid" aria-hidden="true" /><SiteHeader current="thoughts" /></section>
      <main id="main" className="wrap" style={{ paddingTop: 56, paddingBottom: 96 }}>{children}</main>
    </>
  );
}
