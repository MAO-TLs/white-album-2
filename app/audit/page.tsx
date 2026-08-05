import type { Metadata } from "next";
import { SiteFooter } from "../SiteFooter";
import { SiteNav } from "../SiteNav";
import errorIndexData from "../../public/todokanai-errors/index.json";
import dossierData from "../../public/todokanai-errors/dossiers.json";
import { AuditHashOpener } from "./AuditHashOpener";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Todokanai TL Audit",
  description:
    "A source-only editorial audit of the earlier Todokanai TL, with adjudicated line-level findings, bounded work-wide dossiers, and counterexamples.",
  alternates: {
    canonical: "https://mao-tls.github.io/white-album-2/audit/",
  },
  openGraph: {
    title: "WHITE ALBUM 2 Todokanai TL Audit",
    description:
      "Browse the completed source-only audit and open every cited example in its exact script context.",
    url: "https://mao-tls.github.io/white-album-2/audit/",
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
};

type AuditIndex = {
  schema: "wa2-todokanai-editorial-error-index/1";
  totalLines: number;
  auditedLineCount: number;
  completedPacketCount: number;
  totalPacketCount: number;
  reviewComplete: boolean;
  totalFindings: number;
  uniqueAffectedLineCount: number;
  withheldBorderlineCount: number;
  recordedCounterexampleCount: number;
  dossierCount: number;
  dossierEvidenceEntryCount: number;
  uniqueDossierEvidenceLineCount: number;
};

type DossierExample = {
  ref: string;
  kind: "finding" | "pattern_support" | "counterexample";
  note: string;
  section: string;
  route: string;
  routeLabel: string;
  scriptId: string;
  line: number;
  japanese: string;
  todokanai: string;
  findingIds: string[];
};

type Dossier = {
  id: string;
  title: string;
  claim: string;
  sourcePattern: string;
  todokanaiEffect: string;
  limits: string;
  diagnostic: string;
  examples: DossierExample[];
  findingExampleCount: number;
  supportExampleCount: number;
  counterexampleCount: number;
};

type DossierPayload = {
  schema: "wa2-todokanai-editorial-dossiers/1";
  totalLines: number;
  auditedLineCount: number;
  reviewComplete: boolean;
  totalFindings: number;
  uniqueAffectedLineCount: number;
  withheldBorderlineCount: number;
  recordedCounterexampleCount: number;
  dossierCount: number;
  dossierEvidenceEntryCount: number;
  uniqueDossierEvidenceLineCount: number;
  dossierFindingExampleCount: number;
  dossierSupportExampleCount: number;
  dossierCounterexampleCount: number;
  groups: {
    id: string;
    label: string;
    dossiers: Dossier[];
  }[];
};

const errorIndex = errorIndexData as AuditIndex;
const dossiers = dossierData as DossierPayload;

function scriptHref(example: DossierExample) {
  const errorQuery =
    example.kind === "finding" ? "&errors=todokanai" : "";
  return `../script/?route=${encodeURIComponent(
    example.route,
  )}&script=${encodeURIComponent(
    example.scriptId,
  )}&compare=todokanai${errorQuery}#${example.ref}`;
}

export default function AuditPage() {
  const auditIsConsistent =
    errorIndex.totalLines === dossiers.totalLines &&
    errorIndex.auditedLineCount === dossiers.auditedLineCount &&
    errorIndex.reviewComplete === dossiers.reviewComplete &&
    errorIndex.dossierCount === dossiers.dossierCount &&
    errorIndex.dossierEvidenceEntryCount ===
      dossiers.dossierEvidenceEntryCount &&
    errorIndex.uniqueDossierEvidenceLineCount ===
      dossiers.uniqueDossierEvidenceLineCount;

  if (!auditIsConsistent) {
    throw new Error("The Todokanai TL audit data failed its integrity check.");
  }

  return (
    <main className="reader-page audit-page">
      <AuditHashOpener />
      <header className="reader-header">
        <SiteNav
          releaseHref="../"
          scriptHref="../script/"
          auditHref="./"
          currentPage="audit"
        />
        <div className="reader-intro audit-intro shell">
          <p className="eyebrow">Source-only editorial audit</p>
          <h1>Todokanai TL audit</h1>
          <p>
            Every published finding was checked against the Japanese and its
            scene context. Borderline calls were withheld, and counterexamples
            are recorded wherever they set a useful limit on a work-wide claim.
          </p>
        </div>
      </header>

      <div className="audit-shell shell">
        <section className="audit-summary" aria-labelledby="audit-summary-title">
          <div className="audit-summary-heading">
            <div>
              <p className="eyebrow">Completed corpus review</p>
              <h2 id="audit-summary-title">What the audit records</h2>
            </div>
            <p>
              {errorIndex.auditedLineCount.toLocaleString()} of{" "}
              {errorIndex.totalLines.toLocaleString()} lines reviewed
              <span aria-hidden="true"> · </span>
              {errorIndex.completedPacketCount.toLocaleString()} of{" "}
              {errorIndex.totalPacketCount.toLocaleString()} packets
            </p>
          </div>
          <div className="audit-stat-grid">
            <div>
              <strong>{errorIndex.totalFindings.toLocaleString()}</strong>
              <span>Confirmed findings / affected lines</span>
            </div>
            <div>
              <strong>
                {errorIndex.withheldBorderlineCount.toLocaleString()}
              </strong>
              <span>Borderline calls withheld</span>
            </div>
            <div>
              <strong>
                {errorIndex.recordedCounterexampleCount.toLocaleString()}
              </strong>
              <span>Counterexamples recorded</span>
            </div>
          </div>
          <p className="audit-method-note">
            The audit evaluates Todokanai TL&apos;s English independently. It was
            not used to create or revise the MAO translation. Red markers in
            the script browser are reserved for adjudicated local errors; the{" "}
            {errorIndex.dossierCount.toLocaleString()} dossiers below describe
            recurring patterns without treating them as universal rules.
          </p>
        </section>

        <section className="audit-dossiers" aria-labelledby="audit-dossiers-title">
          <header className="audit-dossiers-heading">
            <p className="eyebrow">Work-wide dossiers</p>
            <h2 id="audit-dossiers-title">Recurring failure patterns</h2>
            <p className="audit-dossiers-evidence-count">
              {dossiers.dossierCount.toLocaleString()} dossiers
              <span aria-hidden="true"> · </span>
              {dossiers.dossierEvidenceEntryCount.toLocaleString()} cited passages
              <span aria-hidden="true"> · </span>
              {dossiers.uniqueDossierEvidenceLineCount.toLocaleString()} unique
              source lines
              <span aria-hidden="true"> · </span>
              {dossiers.dossierCounterexampleCount.toLocaleString()}{" "}
              counterexamples
            </p>
          </header>

          {dossiers.groups.length ? (
            <div className="audit-group-list">
              {dossiers.groups.map((group) => (
                <details className="audit-group" key={group.id} open>
                  <summary>
                    <span>{group.label}</span>
                    <small>
                      {group.dossiers.length} dossier
                      {group.dossiers.length === 1 ? "" : "s"}
                    </small>
                  </summary>
                  <div className="audit-dossier-list">
                    {group.dossiers.map((dossier) => (
                      <details
                        className="audit-dossier"
                        id={`dossier-${dossier.id}`}
                        key={dossier.id}
                      >
                        <summary>
                          <div>
                            <p className="audit-dossier-count">
                              {dossier.findingExampleCount} confirmed example
                              {dossier.findingExampleCount === 1 ? "" : "s"}
                              {dossier.supportExampleCount
                                ? ` · ${dossier.supportExampleCount} work-wide support${
                                    dossier.supportExampleCount === 1 ? "" : "s"
                                  }`
                                : ""}
                              {dossier.counterexampleCount
                                ? ` · ${dossier.counterexampleCount} counterexample${
                                    dossier.counterexampleCount === 1 ? "" : "s"
                                  }`
                                : ""}
                            </p>
                            <h3>{dossier.title}</h3>
                          </div>
                          <span className="audit-dossier-toggle">
                            <span>Open dossier</span>
                            <span>Close dossier</span>
                          </span>
                        </summary>
                        <div className="audit-dossier-body">
                          <a
                            className="audit-permalink"
                            href={`#dossier-${dossier.id}`}
                            aria-label={`Link to ${dossier.title}`}
                          >
                            Permanent link to this dossier #
                          </a>
                          <p className="audit-dossier-claim">{dossier.claim}</p>
                          <dl className="audit-dossier-definition">
                            <div>
                              <dt>Japanese pattern</dt>
                              <dd>{dossier.sourcePattern}</dd>
                            </div>
                            <div>
                              <dt>Todokanai TL effect</dt>
                              <dd>{dossier.todokanaiEffect}</dd>
                            </div>
                            <div>
                              <dt>Limits</dt>
                              <dd>{dossier.limits}</dd>
                            </div>
                          </dl>
                          {dossier.diagnostic ? (
                            <p className="audit-dossier-diagnostic">
                              <b>Corpus diagnostic</b>
                              {dossier.diagnostic}
                            </p>
                          ) : null}
                          <div className="audit-example-list">
                            {dossier.examples.map((example) => (
                              <a
                                className={`audit-example audit-example-${example.kind}`}
                                href={scriptHref(example)}
                                key={`${dossier.id}-${example.kind}-${example.ref}`}
                              >
                                <div className="audit-example-heading">
                                  <div>
                                    <span>
                                      {example.kind === "finding"
                                        ? "Confirmed error"
                                        : example.kind === "pattern_support"
                                          ? "Work-wide evidence"
                                          : "Counterexample"}
                                    </span>
                                    {example.section ? (
                                      <small>{example.section}</small>
                                    ) : null}
                                  </div>
                                  <code>{example.ref}</code>
                                </div>
                                <p lang="ja">{example.japanese}</p>
                                <p>{example.todokanai}</p>
                                <small>{example.note}</small>
                                <b>Open in script context →</b>
                              </a>
                            ))}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="audit-empty">
              The corpus review is complete. Work-wide dossiers are being
              prepared for this index.
            </p>
          )}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
