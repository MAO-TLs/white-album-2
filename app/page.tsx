import { CopyHashButton } from "./CopyHashButton";
import { InstallAnchorRelease } from "./InstallAnchorRelease";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

export const dynamic = "force-static";

const completeDownloadUrl =
  "https://github.com/MAO-TLs/white-album-2/releases/download/v1.2.8/White_Album_2_Complete_English_Release_v1.2.8.zip";
const completeArchiveSha256 =
  "04fc14bbb22ab17bcc143b53e189923c8c89c60313b4534b27a9108158419ae4";
const releaseNotesUrl =
  "https://github.com/MAO-TLs/white-album-2/releases/tag/v1.2.8";

export default function Home() {
  return (
    <main>
      <InstallAnchorRelease />
      <section className="hero">
        <picture>
          <source
            media="(max-width: 900px)"
            srcSet="./wa2-winter-night-960.webp"
            type="image/webp"
          />
          <source srcSet="./wa2-winter-night.webp" type="image/webp" />
          {/* A plain relative fallback survives both local export and the GitHub Pages subpath. */}
          <img
            className="hero-backdrop"
            src="./wa2-winter-night.png"
            alt=""
            aria-hidden="true"
          />
        </picture>
        <SiteNav
          releaseHref="./"
          scriptHref="./script/"
          auditHref="./audit/"
          currentPage="release"
        />

        <div className="hero-grid shell">
          <div className="hero-copy">
            <p className="eyebrow">An English translation by MAO</p>
            <h1>
              WHITE
              <br />
              ALBUM 2
            </h1>
            <p className="dek">
              A complete English script for{" "}
              <em>WHITE ALBUM 2 Extended Edition</em>—translated from the
              Japanese for accuracy, character voice, and natural literary
              English.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href={completeDownloadUrl}>
                Download complete release
                <span aria-hidden="true">↓</span>
              </a>
              <a className="button button-secondary" href="./script/">
                Read the script
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className="compatibility">
              716 MB · <a href={releaseNotesUrl}>Release notes</a> · Version
              1.2.8 · Windows + Wine/CrossOver · Japanese Extended Edition
              required
            </p>
          </div>

          <div aria-hidden="true" />
        </div>
      </section>

      <section className="release-strip" aria-label="Release information">
        <div className="shell release-grid">
          <div>
            <span className="release-label">Version</span>
            <strong>v1.2.8</strong>
          </div>
          <div>
            <span className="release-label">Script coverage</span>
            <strong>Main game + Special Contents</strong>
          </div>
          <div>
            <span className="release-label">Lines</span>
            <strong>77,198</strong>
          </div>
          <div>
            <span className="release-label">Status</span>
            <strong className="release-status">Complete</strong>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <p className="eyebrow">Read online</p>
          <h2>Browse the complete script</h2>
          <p>
            Every main-game and Special Contents line is browsable beside its
            Japanese source. Search the current scene or the complete corpus,
            then jump directly to any reference.
          </p>
        </div>
        <div className="chapter-grid">
          <a
            className="chapter-card"
            href="./script/?route=intro&script=1001"
          >
            <span className="chapter-number">01</span>
            <div>
              <h3>Introductory Chapter</h3>
              <p>10,769 lines · 30 scripts</p>
            </div>
          </a>
          <a
            className="chapter-card"
            href="./script/?route=closing&script=2001"
          >
            <span className="chapter-number">02</span>
            <div>
              <h3>Closing Chapter</h3>
              <p>35,275 lines · 98 scripts</p>
            </div>
          </a>
          <a className="chapter-card" href="./script/?route=coda&script=3001">
            <span className="chapter-number">03</span>
            <div>
              <h3>Coda</h3>
              <p>25,152 lines · 77 scripts</p>
            </div>
          </a>
          <a
            className="chapter-card"
            href="./script/?route=special&script=6001"
          >
            <span className="chapter-number">04</span>
            <div>
              <h3>Special Contents</h3>
              <p>6,002 lines · 49 scripts</p>
            </div>
          </a>
        </div>
        <a className="text-link" href="./script/">
          Open the script browser <span aria-hidden="true">→</span>
        </a>
      </section>

      <section className="install-section" id="install">
        <div className="section shell">
          <div className="install-heading">
            <div className="section-heading">
              <p className="eyebrow">Installation</p>
              <h2>How to install the patch</h2>
            </div>
            <p className="install-requirement">
              Requires a legally obtained Japanese <em>WHITE ALBUM 2 Extended
              Edition</em> installation. One archive contains the native
              Windows and Wine/CrossOver main-game builds, the translated
              Special Contents application, all eleven audio dramas, and two
              translated digital novels as PDFs. A small local patcher creates
              English-subtitled versions of all fifteen main-game movies from
              the legally installed Japanese originals.
            </p>
          </div>

          <ol className="install-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Back up the originals</h3>
                <p>
                  Back up the original main game and Special Contents, or at
                  minimum <code>WA2.exe</code>. The movie patcher also
                  preserves the Japanese movie files it replaces.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Choose your main-game build</h3>
                <p>
                  Open <code>Main Game</code>, choose either{" "}
                  <code>Windows</code> or <code>Wine-CrossOver</code>, and copy
                  everything inside <code>game files</code> into the game
                  directory. Preserve the <code>todokanai</code> and{" "}
                  <code>novels</code> subfolders. On Windows or standard Wine,
                  launch the replacement <code>WA2.exe</code>. Under CrossOver
                  on macOS, open <code>Launch WHITE ALBUM 2.command</code>.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Generate the translated movies</h3>
                <p>
                  Copy the entire <code>Main Game/Movie Patcher</code> folder
                  into the main-game directory beside <code>WA2.exe</code>.
                  Run its Windows, Wine, or CrossOver launcher. On first use it
                  downloads and verifies a pinned 106 MB FFmpeg build, then
                  generates all thirty high- and low-resolution movie assets
                  locally. Allow roughly 1.4 GB of free space.
                </p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <h3>Run Special Contents</h3>
                <p>
                  Copy the three files in{" "}
                  <code>WHITE ALBUM 2 Special Contents/patch</code> into the
                  Japanese Special Contents folder, then launch{" "}
                  <code>WA2_Special_en.exe</code>. Under Wine or CrossOver, run
                  it inside the prefix or bottle containing the Japanese
                  Special Contents installation.
                </p>
              </div>
            </li>
            <li>
              <span>05</span>
              <div>
                <h3>Play the audio dramas</h3>
                <p>
                  Open any MKV in <code>Audio Drama</code>. MAO English is the
                  default embedded subtitle track, and matching SRT files are
                  included for players that need them.
                </p>
              </div>
            </li>
            <li>
              <span>06</span>
              <div>
                <h3>Read the digital novels</h3>
                <p>
                  The <code>novels</code> folder contains translated PDFs of{" "}
                  <em>The Snow Melts, and Until the Snow Falls</em> and{" "}
                  <em>The Idol Who Forgot How to Sing</em>.
                </p>
              </div>
            </li>
          </ol>

          <aside className="install-warning">
            <strong>Platform validation</strong>
            <p>
              The Windows hook was built from source and structurally
              validated; native Windows gameplay has not been locally
              smoke-tested. The unchanged Wine/CrossOver runtime was tested
              for v1.1.0. The unchanged movie patcher passed two complete 30-file
              CrossOver renders with exact-output verification, a real first-
              run download, repeat-run and restoration tests, and both launcher
              checks. Normal story pages are capped at 55 half-width cells per
              line and three lines before an engine-native page break.
            </p>
          </aside>

          <aside className="install-warning">
            <strong>Windows black screen?</strong>
            <p>
              Install Microsoft&apos;s{" "}
              <a href="https://www.microsoft.com/en-us/download/details.aspx?id=8109">
                DirectX End-User Runtimes (June 2010)
              </a>
              . As a fallback, deleting <code>d3d9.dll</code> disables only the
              339 audio-only subtitle cues; the core translation remains
              available.
            </p>
          </aside>
        </div>
      </section>

      <section className="section shell credits-section">
        <div className="section-heading">
          <p className="eyebrow">Credits</p>
          <h2>MAO Translations</h2>
        </div>
        <dl className="credits">
          <div>
            <dt>Project Lead</dt>
            <dd>MAO</dd>
          </div>
          <div>
            <dt>Translator</dt>
            <dd>GPT-5.6 Sol</dd>
          </div>
          <div>
            <dt>Special Thanks</dt>
            <dd>gambs</dd>
          </div>
        </dl>
      </section>

      <SiteFooter
        archiveSha256={completeArchiveSha256}
        archiveHashAction={<CopyHashButton value={completeArchiveSha256} />}
      />
    </main>
  );
}
