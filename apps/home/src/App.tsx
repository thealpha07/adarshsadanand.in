import { SiteHeader, contact, siteUrl } from "@site/ui";
import { listBooks, listLearning, listPeople, listPosts, formatDate, formatMonth, learningStageLabel, useAsync } from "@site/data";
import { about, hero, hobbies, learning, projects, whatIDo } from "./content";
import "./home.css";

export function App() {
  return (
    <>
      <Hero />
      <main id="main">
        <Elsewhere />
        <About />
        <Hobbies />
        <WhatIDo />
        <Projects />
        <Learning />
        <Lately />
      </main>
      <Contact />
    </>
  );
}

function TwoTone({ parts }: { parts: readonly [string, string, string] }) {
  return (
    <>
      {parts[0]} <span className="soft">{parts[1]}</span> {parts[2]}
    </>
  );
}

function Cross({ left, top }: { left: string; top: number }) {
  return (
    <svg className="cross" style={{ left: `calc(${left} - 6px)`, top }} viewBox="0 0 13 13" aria-hidden="true">
      <path d="M6.5 0v13M0 6.5h13" stroke="currentColor" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="hero on-dark" aria-label="Introduction">
      <div className="hero-grid" aria-hidden="true" />
      <Cross left="25%" top={104} />
      <Cross left="50%" top={104} />
      <Cross left="75%" top={104} />
      <Cross left="25%" top={566} />
      <Cross left="75%" top={566} />
      <SiteHeader current="home" />

      <p aria-hidden="true" className="grot hero-ghost">{hero.ghostWord}</p>
      <img
        className="hero-portrait"
        src="/images/portrait.webp"
        alt={hero.portraitAlt}
        width={475}
        height={1144}
        fetchPriority="high"
      />
      <p className="mono hero-line">{hero.line}</p>

      <a className="hero-book" href={siteUrl("library")}>
        <img src="/images/tuesdays-with-morrie.webp" alt="Cover of Tuesdays with Morrie by Mitch Albom" width={160} height={160} />
        <span className="hero-book-strip">
          <span className="mono">✳ Reading</span>
          <span className="mono">/Library</span>
        </span>
      </a>

      <div className="hero-name">
        <span>©{new Date().getFullYear()}</span>
        <h1 className="grot">{hero.firstName}</h1>
      </div>

      <a className="hero-talk" href="#contact">
        <img src="/images/headshot.webp" alt="" width={64} height={64} />
        <span className="hero-talk-text">
          <span className="hero-talk-small">Let's talk</span>
          <strong>{hero.fullName}</strong>
          <span className="hero-talk-small">{hero.role}</span>
        </span>
        <span className="hero-talk-arrow" aria-hidden="true">↗</span>
      </a>
    </section>
  );
}

function Elsewhere() {
  const links = [
    { label: "Thoughts", href: siteUrl("thoughts") },
    { label: "Library", href: siteUrl("library") },
    { label: "People", href: siteUrl("people") },
    { label: "GitHub", href: contact.github },
  ];
  return (
    <nav aria-label="Elsewhere on this site" className="wrap elsewhere">
      <span className="mono muted">Elsewhere on this site</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} className="elsewhere-link">
          {l.label} ↗
        </a>
      ))}
    </nav>
  );
}

function About() {
  return (
    <section className="wrap split section" aria-labelledby="about-h">
      <span className="tag">About me</span>
      <div className="stack-32">
        <h2 id="about-h" className="grot h-section">
          <TwoTone parts={about.heading} />
        </h2>
        <p className="body-lg body-2" style={{ maxWidth: "60ch" }}>{about.bio}</p>
        <div className="row-12">
          <a className="btn btn-dark" href={about.resumeHref} download>Download resume</a>
          <a className="btn btn-line" href="#contact">Get in touch</a>
        </div>
      </div>
    </section>
  );
}

function Hobbies() {
  return (
    <section className="wrap split section" aria-labelledby="off-h">
      <span className="tag">Off the clock</span>
      <div className="stack-32">
        <h2 id="off-h" className="grot h-section">
          <TwoTone parts={hobbies.heading} />
        </h2>
        <ul className="hobbies">
          {hobbies.items.map((h, i) => (
            <li key={h.title} className="hobby">
              <span className="mono muted">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="grot hobby-title">{h.title}</h3>
              <p className="small body-2">{h.note}</p>
              {h.link && (
                <a className="hobby-link mono" href={siteUrl(h.link)}>See the Library ↗</a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function WhatIDo() {
  return (
    <section className="wrap section" aria-labelledby="do-h">
      <div className="split">
        <span className="tag">What I do</span>
        <h2 id="do-h" className="grot h-section">
          <TwoTone parts={whatIDo.heading} />
        </h2>
      </div>
      <div style={{ marginTop: 40 }}>
        {whatIDo.areas.map((a, i) => (
          <div key={a.title} className="area">
            <span className="tag">{String(i + 1).padStart(3, "0")}</span>
            <div className="stack-14">
              <h3 className="grot" style={{ fontSize: 32, lineHeight: "34px" }}>{a.title}</h3>
              <p className="body-2" style={{ maxWidth: "48ch" }}>{a.desc}</p>
              <ul className="chips" aria-label="Skills">
                {a.skills.map((s) => <li key={s} className="chip">{s}</li>)}
              </ul>
            </div>
            <div className="area-visual on-dark" aria-hidden="true">
              <span className="mono" style={{ color: "var(--on-hero-soft)", position: "relative" }}>✳ {a.title}</span>
              <pre>{a.visual}</pre>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Projects() {
  return (
    <section id="work" className="wrap section" aria-labelledby="work-h">
      <div className="section-head">
        <div className="stack-16">
          <span className="tag">Selected work</span>
          <h2 id="work-h" className="grot" style={{ fontSize: "clamp(48px, 7vw, 104px)", lineHeight: 0.9 }}>
            My <span className="soft">projects.</span>
          </h2>
        </div>
        <a className="btn btn-line" href={contact.github}>All projects on GitHub</a>
      </div>
      <ol className="projects">
        {projects.map((p, i) => (
          <li key={p.name}>
            <a className="project" href={p.href}>
              {p.image ? (
                <img src={p.image} alt={`Screenshot of ${p.name}`} className="project-shot" />
              ) : (
                <div className="placeholder project-shot">Screenshot of {p.name} coming soon</div>
              )}
              <span className="project-strip">
                <span className="mono">✳ {String(i + 1).padStart(2, "0")} {p.name}</span>
                <span className="mono muted">{p.kind}</span>
              </span>
              <span className="grot project-line">{p.line}</span>
              <span className="body-2">{p.desc}</span>
              <span className="mono muted">{p.stack}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Live from the vault's Homepage tab. If the list is empty or the database is unreachable,
 * the section steps aside instead of showing an error on the front page.
 */
function Learning() {
  const { state } = useAsync(listLearning);
  if (state.status === "error" || (state.status === "ready" && state.data.length === 0)) return null;
  const items = state.status === "ready" ? state.data : [];

  return (
    <section className="wrap split section" aria-labelledby="learn-h" aria-busy={state.status === "loading"}>
      <span className="tag">Currently learning</span>
      <div className="stack-32">
        <h2 id="learn-h" className="grot h-section">
          <TwoTone parts={learning.heading} />
        </h2>
        <ul className="learning">
          {items.map((l) => (
            <li key={l.id} className="learn">
              <div className="learn-head">
                <h3 className="grot learn-topic">{l.topic}</h3>
                <span className={`learn-stage stage-${l.stage}`}>{learningStageLabel[l.stage]}</span>
              </div>
              {l.focus && <p className="body-2 learn-focus">{l.focus}</p>}
              <div className="learn-meta mono muted">
                {l.started_on && <span>Since {formatMonth(l.started_on)}</span>}
                {l.link && <a href={l.link} className="learn-link">Notes ↗</a>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Live from the database, so the homepage stays current without edits. */
function Lately() {
  const { state } = useAsync(async () => {
    const [posts, books, people] = await Promise.all([listPosts(), listBooks(), listPeople()]);
    return {
      post: posts[0] ?? null,
      book: books.find((b) => b.shelf === "reading") ?? null,
      person: [...people].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null,
    };
  });
  const data = state.status === "ready" ? state.data : null;

  return (
    <section className="wrap section" aria-labelledby="lately-h">
      <div className="split">
        <span className="tag">Lately</span>
        <h2 id="lately-h" className="grot h-section">
          Reading, thinking <span className="soft">and meeting people</span>
        </h2>
      </div>
      <div className="tiles" aria-busy={state.status === "loading"}>
        <a className="card" href={data?.post ? siteUrl("thoughts", `/${data.post.slug}`) : siteUrl("thoughts")}>
          <span className="tag">Latest thought</span>
          <span className="grot tile-title">
            {data?.post ? `${data.post.title}${data.post.subtitle ? ` ${data.post.subtitle}` : ""}` : "Thoughts"}
          </span>
          <span className="small muted" style={{ marginTop: "auto" }}>{data?.post ? formatDate(data.post.published_at) : "Read the latest"}</span>
        </a>
        <a className="card" href={siteUrl("library")}>
          <span className="tag">Currently reading</span>
          <span className="grot tile-title">{data?.book?.title ?? "The library"}</span>
          <span className="small muted" style={{ marginTop: "auto" }}>{data?.book?.author ?? "What I'm reading"}</span>
        </a>
        <a className="card" href={data?.person ? siteUrl("people", `/${data.person.slug}`) : siteUrl("people")}>
          <span className="tag">Newest in People</span>
          <span className="grot tile-title">{data?.person?.alias ?? "People I've met"}</span>
          <span className="small muted" style={{ marginTop: "auto" }}>
            {data?.person ? [data.person.met_label && `Since ${data.person.met_label}`, data.person.match_value].filter(Boolean).join(" · ") : "Sketches, not portraits"}
          </span>
        </a>
      </div>
    </section>
  );
}

function Contact() {
  const cards = [
    { label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    { label: "GitHub", value: "github.com/thealpha07", href: contact.github },
    { label: "LinkedIn", value: "linkedin.com/in/adarsh-sadanand", href: contact.linkedin },
  ];
  return (
    <footer id="contact" className="contact on-dark" aria-labelledby="contact-h">
      <div className="wrap stack-48" style={{ paddingTop: 96, paddingBottom: 64 }}>
        <div className="section-head">
          <h2 id="contact-h" className="grot contact-title">
            Let's<br />
            <span className="soft">talk</span>
          </h2>
          <span className="mono" style={{ color: "#c3cad1" }}>©{new Date().getFullYear()} · {contact.location}</span>
        </div>
        <div className="contact-cards">
          {cards.map((c) => (
            <a key={c.label} href={c.href} className="contact-card">
              <span className="mono" style={{ color: "#c3cad1" }}>{c.label}</span>
              <span className="contact-value">{c.value}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
