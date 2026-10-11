import { useEffect, useState } from "react";
import { contact, publicNav, siteUrl, type SiteKey } from "../sites";
import "./header.css";

interface Props {
  current: SiteKey;
}

/** Top bar shared by every public site, drawn on a midnight band. */
export function SiteHeader({ current }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="wrap site-header">
        <a href={siteUrl("home")} className="site-mark">
          Adarsh<sup>®</sup>
        </a>
        <nav aria-label="Sites" className="site-nav">
          {publicNav.map((item) => (
            <a
              key={item.key}
              className="nav-link"
              href={siteUrl(item.key)}
              aria-current={item.key === current ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="menu-button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen(true)}
        >
          <svg width="32" height="14" viewBox="0 0 32 14" aria-hidden="true">
            <path d="M0 1h32M0 13h32" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </header>
      {menuOpen && <MenuOverlay current={current} onClose={() => setMenuOpen(false)} />}
    </>
  );
}

function MenuOverlay({ current, onClose }: { current: SiteKey; onClose: () => void }) {
  // Escape closes the menu; the page behind does not scroll while it is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const items: { label: string; href: string; key?: SiteKey }[] = [
    { label: "Home", href: siteUrl("home"), key: "home" },
    { label: "Work", href: siteUrl("home", "/#work") },
    { label: "Thoughts", href: siteUrl("thoughts"), key: "thoughts" },
    { label: "Library", href: siteUrl("library"), key: "library" },
    { label: "People", href: siteUrl("people"), key: "people" },
    { label: "Contact", href: siteUrl("home", "/#contact") },
  ];

  return (
    <div id="site-menu" className="menu-overlay on-dark" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="menu-grid" aria-hidden="true" />
      <div className="wrap menu-inner">
        <div className="menu-top">
          <a href={siteUrl("home")} className="site-mark">
            Adarsh<sup>®</sup>
          </a>
          <button type="button" className="menu-button" aria-label="Close menu" onClick={onClose} autoFocus>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l14 14M19 5 5 19" />
            </svg>
          </button>
        </div>
        <div className="menu-body">
          <nav aria-label="Main" className="menu-links">
            {items.map((item, i) => (
              <a
                key={item.label}
                href={item.href}
                className="menu-item"
                aria-current={item.key === current ? "page" : undefined}
                onClick={onClose}
              >
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="grot">{item.label}</span>
              </a>
            ))}
          </nav>
          <dl className="menu-info">
            <div><dt className="mono">Email</dt><dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>
            <div><dt className="mono">Based in</dt><dd>{contact.location}</dd></div>
            <div><dt className="mono">Usually replies</dt><dd>Within a few days</dd></div>
            <div>
              <dt className="mono">Elsewhere</dt>
              <dd className="menu-social"><a href={contact.github}>GitHub</a><a href={contact.linkedin}>LinkedIn</a></dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
