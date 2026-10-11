import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
import { Empty, Failed, Loading, PageBand, SiteFooter, siteUrl } from "@site/ui";
import { getPerson, listPeople, useAsync, type Person } from "@site/data";
import "./people.css";

export function App() {
  return (
    <BrowserRouter>
      <div style={{ ["--site" as string]: "var(--plum)", ["--site-light" as string]: "#d6a6e3" }}>
        <Routes>
          <Route path="/" element={<Grid />} />
          <Route path="/:slug" element={<PersonPage />} />
        </Routes>
        <SiteFooter>
          <span className="small">
            Recognise yourself and want it removed? <a href={siteUrl("home", "/#contact")} style={{ color: "#fff" }}>Ask me</a> and I'll take it down.
          </span>
        </SiteFooter>
      </div>
    </BrowserRouter>
  );
}

function Grid() {
  const { state } = useAsync(listPeople);
  const [context, setContext] = useState<string | null>(null);
  useEffect(() => { document.title = "People · Adarsh Sadanand"; }, []);

  const people = state.status === "ready" ? state.data : [];
  // Filters come from the data, so a new context appears without a code change.
  const contexts = useMemo(() => [...new Set(people.map((p) => p.context).filter(Boolean))] as string[], [people]);
  const visible = context ? people.filter((p) => p.context === context) : people;

  return (
    <>
      <PageBand
        site="people"
        tag="characters.adarshsadanand.in"
        title="People"
        softTitle="I've met"
        ghost="Characters"
        intro="Short sketches of people who left an impression. Every name and detail is changed; each person gets an alias and a symbol I've matched to them."
      />
      <main id="main" className="wrap" style={{ paddingTop: 56, paddingBottom: 96, display: "flex", flexDirection: "column", gap: 40 }}>
        {contexts.length > 1 && (
          <div role="group" aria-label="Filter by where we met" className="filters">
            <button type="button" className="filter" aria-pressed={context === null} onClick={() => setContext(null)}>Everyone</button>
            {contexts.map((c) => (
              <button key={c} type="button" className="filter" aria-pressed={context === c} onClick={() => setContext(c)}>{c}</button>
            ))}
          </div>
        )}
        {state.status === "loading" && <Loading label="Loading people" />}
        {state.status === "error" && <Failed message={state.message} />}
        {state.status === "ready" && visible.length === 0 && <Empty>No one here yet.</Empty>}
        {visible.length > 0 && (
          <ul className="people-grid">
            {visible.map((p, i) => <PersonCard key={p.id} person={p} index={i + 1} />)}
          </ul>
        )}
      </main>
    </>
  );
}

function PersonCard({ person, index }: { person: Person; index: number }) {
  return (
    <li>
      <Link to={`/${person.slug}`} className="person">
        <span aria-hidden="true" className="grot person-number">{String(index).padStart(2, "0")}</span>
        <span className="mark" aria-hidden="true">{person.alias.charAt(0)}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="grot" style={{ fontSize: 30, lineHeight: "32px" }}>{person.alias}</span>
          {person.match_value && <span className="mono" style={{ color: "var(--plum)", fontWeight: 700 }}>✳ {person.match_value}</span>}
        </span>
        {person.first_impression && <p className="body-2">{person.first_impression}</p>}
        <span className="chips">
          {person.context && <span className="chip">{person.context}</span>}
          {person.met_label && <span className="chip">{person.met_label}</span>}
        </span>
      </Link>
    </li>
  );
}

function PersonPage() {
  const { slug = "" } = useParams();
  const { state } = useAsync(() => getPerson(slug), [slug]);
  const data = state.status === "ready" ? state.data : null;
  useEffect(() => { if (data?.person) document.title = `${data.person.alias} · People`; }, [data]);

  if (state.status !== "ready" || !data?.person) {
    return (
      <>
        <PageBand site="people" tag="characters.adarshsadanand.in" title="People" ghost="Characters" />
        <main id="main" className="wrap" style={{ paddingTop: 56, paddingBottom: 96 }}>
          {state.status === "loading" && <Loading />}
          {state.status === "error" && <Failed message={state.message} />}
          {state.status === "ready" && <Empty>This person isn't here, or their page is private. <Link to="/">See everyone</Link>.</Empty>}
        </main>
      </>
    );
  }

  const { person, anecdotes } = data;
  return (
    <>
      <PageBand
        site="people"
        tag={[person.context, person.met_label].filter(Boolean).join(" · ")}
        title={person.alias}
        ghost="Characters"
        before={<Link to="/" className="mono" style={{ color: "var(--on-hero-soft)" }}>← Everyone</Link>}
      />
      <main id="main" className="wrap person-layout">
        <div className="person-main">
          {(person.impression_headline || person.first_impression) && (
            <section aria-labelledby="imp-h" className="stack-16">
              <span className="tag">First impression</span>
              <h2 id="imp-h" className="grot" style={{ fontSize: 40, lineHeight: "42px" }}>{person.impression_headline ?? "First impression"}</h2>
              {person.first_impression && <p className="body-lg body-2" style={{ maxWidth: "64ch" }}>{person.first_impression}</p>}
            </section>
          )}
          <section aria-labelledby="anec-h" className="stack-16">
            <h2 id="anec-h" className="grot" style={{ fontSize: 40, lineHeight: "42px" }}>Anecdotes</h2>
            {anecdotes.length === 0 ? (
              <p className="body-2">No stories shared yet.</p>
            ) : (
              <ol className="anecdotes">
                {anecdotes.map((a) => (
                  <li key={a.id}>
                    <span className="mono muted">{a.occurred_label}</span>
                    <p className="body-lg" style={{ maxWidth: "60ch" }}>{a.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
        <aside aria-label="Symbol and details" className="person-side">
          {person.match_value && (
            <div className="symbol on-dark">
              <span className="mono" style={{ color: "#d6a6e3" }}>✳ Their symbol</span>
              <span className="grot" style={{ fontSize: 40, lineHeight: "42px", color: "#fff" }}>{person.match_value}</span>
              {person.match_kind && <span className="mono" style={{ color: "var(--on-hero-soft)" }}>{person.match_kind}</span>}
              {person.match_reason && <p className="small" style={{ color: "var(--on-hero-soft)" }}>{person.match_reason}</p>}
            </div>
          )}
          <dl className="details">
            {person.context && <><dt className="mono muted">Where we met</dt><dd>{person.context}</dd></>}
            {person.met_label && <><dt className="mono muted">Since</dt><dd>{person.met_label}</dd></>}
            {person.traits.length > 0 && (
              <>
                <dt className="mono muted">Traits</dt>
                <dd className="chips">{person.traits.map((t) => <span key={t} className="chip">{t}</span>)}</dd>
              </>
            )}
          </dl>
        </aside>
      </main>
    </>
  );
}
