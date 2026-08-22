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
          This is an unofficial, noncommercial fan translation. A legally
          obtained Japanese copy of <em>WHITE ALBUM 2 Extended Edition</em> is
          required.
        </p>
        <div className="release-hashes">
          <div>
            <span>
              {archiveSha256 ? "v1.3.3 archive SHA-256" : "Script version"}
            </span>
            <code>{archiveSha256 ?? "v1.3.3"}</code>
            {archiveHashAction}
          </div>
        </div>
      </div>
    </footer>
  );
}
