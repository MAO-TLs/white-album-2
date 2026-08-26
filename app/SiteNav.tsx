type SiteNavProps = {
  releaseHref: string;
  scriptHref: string;
  auditHref: string;
  currentPage: "release" | "script" | "audit" | "none";
};

export function SiteNav({
  releaseHref,
  scriptHref,
  auditHref,
  currentPage,
}: SiteNavProps) {
  return (
    <nav className="nav shell" aria-label="Primary navigation">
      <a className="wordmark" href="https://mao-tls.github.io/">
        MAO Translations
      </a>
      <div className="nav-links">
        <a
          href={releaseHref}
          aria-current={currentPage === "release" ? "page" : undefined}
        >
          Release
        </a>
        <a
          href={scriptHref}
          aria-current={currentPage === "script" ? "page" : undefined}
        >
          Script
        </a>
        <a
          href={auditHref}
          aria-current={currentPage === "audit" ? "page" : undefined}
        >
          Audit
        </a>
        <a href="https://github.com/MAO-TLs/white-album-2">GitHub</a>
      </div>
    </nav>
  );
}
