import type { Metadata } from "next";
import { SiteNav } from "../SiteNav";
import { SiteFooter } from "../SiteFooter";
import { ScriptBrowser } from "./ScriptBrowser";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Script Browser",
  description:
    "Browse all 77,198 main-game and Special Contents lines from the complete WHITE ALBUM 2 English translation beside the Japanese source.",
  alternates: {
    canonical: "https://mao-tls.github.io/white-album-2/script/",
  },
  openGraph: {
    title: "WHITE ALBUM 2 Script Browser",
    description:
      "Browse all 77,198 main-game and Special Contents lines beside the v1.3.3 MAO English translation.",
    url: "https://mao-tls.github.io/white-album-2/script/",
    siteName: "MAO Translations",
    images: [
      {
        url: "https://mao-tls.github.io/white-album-2/wa2-winter-night.png",
        width: 1731,
        height: 909,
        alt: "A snowflake over quiet snowfields at night",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WHITE ALBUM 2 Script Browser",
    description:
      "Browse all 77,198 Japanese and English lines across the main game and Special Contents.",
    images: [
      "https://mao-tls.github.io/white-album-2/wa2-winter-night.png",
    ],
  },
};

export default function ScriptPage() {
  return (
    <main className="reader-page">
      <header className="reader-header">
        <SiteNav
          releaseHref="../"
          scriptHref="./"
          auditHref="../audit/"
          currentPage="script"
        />
        <div className="reader-intro shell">
          <p className="eyebrow">Script Version v1.3.3</p>
          <h1>Script browser</h1>
          <p>
            Search the complete 77,198-line corpus or read any of its 254
            scripts beside the v1.3.3 MAO English translation. An optional
            comparison with the earlier Todokanai TL and bundled WA2Analysis
            prose can be displayed where aligned data is available.
          </p>
        </div>
      </header>
      <ScriptBrowser />
      <SiteFooter />
    </main>
  );
}
