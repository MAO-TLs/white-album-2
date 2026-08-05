import { SiteNav } from "./SiteNav";

export default function NotFound() {
  return (
    <main className="reader-page not-found-page">
      <header className="reader-header">
        <SiteNav
          releaseHref="/white-album-2/"
          scriptHref="/white-album-2/script/"
          auditHref="/white-album-2/audit/"
          currentPage="none"
        />
        <div className="reader-intro shell">
          <p className="eyebrow">404</p>
          <h1>Nothing here</h1>
          <p>
            That page does not exist. Return to the release or open the complete
            Japanese and English script.
          </p>
          <div className="not-found-actions">
            <a className="button button-primary" href="/white-album-2/">
              Release page
            </a>
            <a
              className="button button-secondary"
              href="/white-album-2/script/"
            >
              Read the script
            </a>
          </div>
        </div>
      </header>
    </main>
  );
}
