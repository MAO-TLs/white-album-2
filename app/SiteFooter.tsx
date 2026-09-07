import type { ReactNode } from "react";

type SiteFooterProps = {
  archiveHashAction?: ReactNode;
  archiveSha256?: string;
};

export function SiteFooter({
  archiveHashAction,
  archiveSha256,
}: SiteFooterProps) {
  return (
    <footer>
      <div className="shell footer-inner">
        <p>
          MAO Translations publishes unofficial, noncommercial fan translations.
          Original works and trademarks belong to their respective owners. A legally
          obtained Japanese copy of <em>WHITE ALBUM 2 Extended Edition</em> is
          required.
        </p>
        <div className="release-hashes">
          <div>
            <span>
              {archiveSha256 ? "v2.0.0 archive SHA-256" : "Script version"}
            </span>
            <code>{archiveSha256 ?? "v2.0.0"}</code>
            {archiveHashAction}
          </div>
        </div>
      </div>
    </footer>
  );
}
