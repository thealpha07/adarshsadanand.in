import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { Empty, Failed, Loading, PageBand, SiteFooter, SiteHeader } from "@site/ui";
import { blogImageUrl, formatDate, getPost, listPosts, renderMarkdown, useAsync, type Post } from "@site/data";
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

function PostList({ posts }: { posts: Post[] }) {
  const [latest, ...rest] = posts;
  const cover = blogImageUrl(latest.cover_path);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 72 }}>
      <Link to={`/${latest.slug}`} className="feature">
        {cover ? <img src={cover} alt="" className="feature-cover" /> : <div className="feature-cover feature-cover-empty" aria-hidden="true"><span className="grot">✳</span></div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="tag">Latest</span>
          <span className="grot feature-title"><Title post={latest} /></span>
          {latest.excerpt && <span className="body-lg body-2">{latest.excerpt}</span>}
          <span className="mono muted">{formatDate(latest.published_at)} · {readingTime(latest.body_md)}{latest.tags.length ? ` · ${latest.tags.join(", ")}` : ""}</span>
        </div>
      </Link>

      {rest.length > 0 && (
        <section aria-labelledby="all-h">
          <h2 id="all-h" className="grot" style={{ fontSize: 56, lineHeight: "56px", marginBottom: 24 }}>All <span className="soft">thoughts</span></h2>
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
          {cover && <img src={cover} alt="" className="post-cover" />}
          <div className="read prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body_md) }} />
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
