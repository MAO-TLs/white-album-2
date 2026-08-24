"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

type RouteSummary = {
  id: string;
  label: string;
  lineCount: number;
  scripts: {
    id: string;
    file: string;
    comparisonFile?: string;
    comparisonAvailableCount?: number;
    lineCount: number;
    firstRef: string;
    lastRef: string;
  }[];
};

type ScriptIndex = {
  version: string;
  generatedAt: string;
  totalLines: number;
  concordance?: {
    schema: string;
    file: string;
    totalLines: number;
  };
  comparison?: {
    id: string;
    label: string;
    sourceUrl: string;
    totalLines: number;
    availableEnglishLines: number;
    concordanceFile?: string;
    sources?: {
      id: string;
      label: string;
      sourceUrl: string;
      note?: string;
    }[];
  };
  routes: RouteSummary[];
};

type ScriptLine = {
  ref: string;
  line: number;
  speakerJa: string;
  speakerEn: string;
  japanese: string;
  japaneseRuby?: string;
  english: string;
};

type ScriptPayload = {
  route: string;
  routeLabel: string;
  scriptId: string;
  lineCount: number;
  lines: ScriptLine[];
};

type TodokanaiStatus =
  | "mapped_high"
  | "unmapped"
  | "supplement_external"
  | "source_only";

type TodokanaiLine = {
  ref: string;
  english: string;
  status: TodokanaiStatus;
  sourceId?: string;
};

type TodokanaiPayload = {
  route: string;
  routeLabel: string;
  scriptId: string;
  lineCount: number;
  availableCount: number;
  lines: TodokanaiLine[];
};

type TodokanaiErrorSeverity = "major" | "moderate" | "minor";

type TodokanaiErrorFinding = {
  id: string;
  ref: string;
  category: string;
  severity: TodokanaiErrorSeverity;
  highlight: string;
  evidenceJa: string;
  explanation: string;
  contextRefs: string[];
  japanese: string;
  todokanai: string;
  sourceSha256: string;
  todokanaiSha256: string;
};

type TodokanaiErrorPayload = {
  schema: "wa2-todokanai-editorial-errors/1";
  route: string;
  routeLabel: string;
  scriptId: string;
  lineCount: number;
  findingCount: number;
  findings: TodokanaiErrorFinding[];
};

type TodokanaiErrorIndex = {
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
  dossierMemberships: Record<string, string[]>;
  dossierLabels?: Record<string, string>;
  concordanceFile: string;
  dossierFile: string;
};

type TodokanaiDossierLink = {
  id: string;
  label: string;
};

type TodokanaiErrorConcordance = {
  schema: "wa2-todokanai-editorial-error-concordance/1";
  totalFindings: number;
  findings: TodokanaiErrorFinding[];
};

type ConcordanceRow = [
  ref: string,
  line: number,
  speakerJa: string,
  speakerEn: string,
  japanese: string,
  english: string,
  japaneseRuby: string,
];

type TodokanaiConcordanceRow = [
  ref: string,
  english: string,
  status: TodokanaiStatus,
  sourceId?: string,
];

type ConcordanceScript<Row> = {
  id: string;
  lineCount: number;
  lines: Row[];
};

type ConcordanceRoute<Row> = {
  id: string;
  label: string;
  lineCount: number;
  scripts: ConcordanceScript<Row>[];
};

type ConcordancePayload = {
  schema: "wa2-public-concordance/1";
  version: string;
  totalLines: number;
  fields: [
    "ref",
    "line",
    "speakerJa",
    "speakerEn",
    "japanese",
    "english",
    "japaneseRuby",
  ];
  routes: ConcordanceRoute<ConcordanceRow>[];
};

type TodokanaiConcordancePayload = {
  schema: "wa2-todokanai-concordance/1";
  totalLines: number;
  fields: ["ref", "english", "status", "sourceId"];
  routes: ConcordanceRoute<TodokanaiConcordanceRow>[];
};

type CorpusMatch = {
  routeId: string;
  routeLabel: string;
  scriptId: string;
  row: ConcordanceRow;
  comparisonRow?: TodokanaiConcordanceRow;
};

type SearchScope = "script" | "corpus";

const CORPUS_BATCH_SIZE = 100;
const RUBY_PATTERN = /\[R([^\]^]+)\^([^\]]*)\]/g;

function JapaneseRubyText({
  plain,
  rubyText,
}: {
  plain: string;
  rubyText?: string;
}) {
  if (!rubyText) return plain;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of rubyText.matchAll(RUBY_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(rubyText.slice(cursor, index));
    parts.push(
      <ruby key={`${index}-${match[1]}-${match[2]}`}>
        <rb>{match[1]}</rb>
        <rt>{match[2].trim()}</rt>
      </ruby>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < rubyText.length) parts.push(rubyText.slice(cursor));
  return parts.length ? parts : plain;
}

function errorCategoryLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function TodokanaiErrorText({
  text,
  findings,
  activeFindingId,
  onToggleFinding,
  contextHref,
  dossierLinks,
}: {
  text: string;
  findings: TodokanaiErrorFinding[];
  activeFindingId: string;
  onToggleFinding: (findingId: string) => void;
  contextHref: string;
  dossierLinks: TodokanaiDossierLink[];
}) {
  const positioned = findings
    .map((finding) => ({
      finding,
      start: text.indexOf(finding.highlight),
    }))
    .filter(({ start }) => start >= 0)
    .sort(
      (left, right) =>
        left.start - right.start ||
        right.finding.highlight.length - left.finding.highlight.length,
    );
  const fragments: ReactNode[] = [];
  const renderedIds = new Set<string>();
  let cursor = 0;

  positioned.forEach(({ finding, start }) => {
    if (start < cursor) return;
    if (start > cursor) fragments.push(text.slice(cursor, start));
    const tooltipId = `error-preview-${finding.id}`;
    fragments.push(
      <button
        className="todokanai-error-trigger"
        type="button"
        key={finding.id}
        aria-describedby={tooltipId}
        aria-expanded={activeFindingId === finding.id}
        onClick={() => onToggleFinding(finding.id)}
      >
        {finding.highlight}
        <span className="todokanai-error-preview" id={tooltipId} role="tooltip">
          <strong>{errorCategoryLabel(finding.category)}</strong>
          <span>{finding.explanation}</span>
        </span>
      </button>,
    );
    renderedIds.add(finding.id);
    cursor = start + finding.highlight.length;
  });
  if (cursor < text.length) fragments.push(text.slice(cursor));

  const unpositioned = findings.filter(
    (finding) => !renderedIds.has(finding.id),
  );
  const activeFinding = findings.find(
    (finding) => finding.id === activeFindingId,
  );

  return (
    <>
      <p className="todokanai-annotated-text">{fragments}</p>
      {unpositioned.length ? (
        <div className="todokanai-error-fallbacks">
          {unpositioned.map((finding) => (
            <button
              type="button"
              key={finding.id}
              onClick={() => onToggleFinding(finding.id)}
              aria-expanded={activeFindingId === finding.id}
            >
              View {errorCategoryLabel(finding.category).toLowerCase()} note
            </button>
          ))}
        </div>
      ) : null}
      {activeFinding ? (
        <aside
          className="todokanai-error-note"
          id={`error-note-${activeFinding.id}`}
          aria-label={`Todokanai TL error note for ${activeFinding.ref}`}
        >
          <header>
            <div>
              <span className="todokanai-error-category">
                {errorCategoryLabel(activeFinding.category)}
              </span>
              <span className="todokanai-error-severity">
                {activeFinding.severity}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onToggleFinding(activeFinding.id)}
              aria-label="Close error note"
            >
              Close
            </button>
          </header>
          <code>{activeFinding.ref}</code>
          <div className="todokanai-error-evidence">
            <span>Japanese</span>
            <p lang="ja">{activeFinding.evidenceJa}</p>
          </div>
          <div className="todokanai-error-evidence">
            <span>Todokanai TL</span>
            <p lang="en">{activeFinding.highlight}</p>
          </div>
          <p className="todokanai-error-explanation">
            {activeFinding.explanation}
          </p>
          <div className="todokanai-error-actions">
            <a href={contextHref}>Open this line in context →</a>
            {dossierLinks.map((dossier) => (
              <a
                href={`../audit/#dossier-${encodeURIComponent(dossier.id)}`}
                key={dossier.id}
              >
                {dossier.label} →
              </a>
            ))}
          </div>
        </aside>
      ) : null}
    </>
  );
}

function normalizeSearchText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ");
}

function compactSearchText(value: string) {
  return value.replace(/\s+/g, "");
}

function isJapaneseSearchText(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/u.test(value);
}

const routeFallbacks: RouteSummary[] = [
  {
    id: "intro",
    label: "Introductory Chapter",
    lineCount: 10769,
    scripts: [],
  },
  {
    id: "closing",
    label: "Closing Chapter",
    lineCount: 35275,
    scripts: [],
  },
  {
    id: "coda",
    label: "Coda",
    lineCount: 25152,
    scripts: [],
  },
  {
    id: "special",
    label: "Special Contents",
    lineCount: 6002,
    scripts: [],
  },
];

export function ScriptBrowser() {
  const [index, setIndex] = useState<ScriptIndex | null>(null);
  const [routeId, setRouteId] = useState("intro");
  const [scriptId, setScriptId] = useState("1001");
  const [payload, setPayload] = useState<ScriptPayload | null>(null);
  const [searchScope, setSearchScope] = useState<SearchScope>("script");
  const [scriptQuery, setScriptQuery] = useState("");
  const [corpusQuery, setCorpusQuery] = useState("");
  const deferredCorpusQuery = useDeferredValue(corpusQuery);
  const [corpusRouteId, setCorpusRouteId] = useState("all");
  const [corpusLimit, setCorpusLimit] = useState(CORPUS_BATCH_SIZE);
  const [concordance, setConcordance] =
    useState<ConcordancePayload | null>(null);
  const [concordanceError, setConcordanceError] = useState("");
  const [showTodokanai, setShowTodokanai] = useState(false);
  const [showTodokanaiErrors, setShowTodokanaiErrors] = useState(false);
  const [todokanaiPayload, setTodokanaiPayload] =
    useState<TodokanaiPayload | null>(null);
  const [todokanaiConcordance, setTodokanaiConcordance] =
    useState<TodokanaiConcordancePayload | null>(null);
  const [todokanaiConcordanceError, setTodokanaiConcordanceError] =
    useState("");
  const [pendingRef, setPendingRef] = useState("");
  const [todokanaiErrorIndex, setTodokanaiErrorIndex] =
    useState<TodokanaiErrorIndex | null>(null);
  const [todokanaiErrorPayload, setTodokanaiErrorPayload] =
    useState<TodokanaiErrorPayload | null>(null);
  const [todokanaiErrorConcordance, setTodokanaiErrorConcordance] =
    useState<TodokanaiErrorConcordance | null>(null);
  const [todokanaiEditorialError, setTodokanaiEditorialError] = useState("");
  const [activeTodokanaiErrorId, setActiveTodokanaiErrorId] = useState("");
  const [urlReady, setUrlReady] = useState(false);
  const [error, setError] = useState("");
  const [todokanaiError, setTodokanaiError] = useState("");

  useEffect(() => {
    fetch("../script-data/index.json")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the script index.");
        return response.json();
      })
      .then((data: ScriptIndex) => {
        setIndex(data);
        const firstRoute = data.routes[0];
        const firstScript = firstRoute?.scripts[0];
        let nextRouteId = firstRoute?.id ?? "intro";
        let nextScriptId = firstScript?.id ?? "1001";

        const url = new URL(window.location.href);
        const comparisonEnabled =
          url.searchParams.get("compare") === "todokanai";
        setShowTodokanai(comparisonEnabled);
        setShowTodokanaiErrors(
          comparisonEnabled &&
            url.searchParams.get("errors") === "todokanai",
        );
        const requestedRouteId = url.searchParams.get("route");
        const requestedScriptId = url.searchParams.get("script");
        const requestedRoute = data.routes.find(
          (route) => route.id === requestedRouteId,
        );
        const requestedScript = requestedRoute?.scripts.find(
          (script) => script.id === requestedScriptId,
        );
        if (requestedRoute && requestedScript) {
          nextRouteId = requestedRoute.id;
          nextScriptId = requestedScript.id;
        }

        const hashRef = decodeURIComponent(url.hash.slice(1));
        const hashParts = hashRef.split(":");
        if (
          hashParts.length === 4 &&
          (hashParts[0] === "wa2" || hashParts[0] === "wa2mas")
        ) {
          const hashRouteId =
            hashParts[0] === "wa2mas"
              ? "special"
              : hashParts[1] === "ic"
              ? "intro"
              : hashParts[1] === "cc"
                ? "closing"
                : hashParts[1] === "coda"
                  ? "coda"
                  : "";
          const hashRoute = data.routes.find(
            (route) => route.id === hashRouteId,
          );
          const hashScript = hashRoute?.scripts.find(
            (script) => script.id === hashParts[2],
          );
          if (hashRoute && hashScript) {
            nextRouteId = hashRoute.id;
            nextScriptId = hashScript.id;
            setPendingRef(hashRef);
          }
        } else if (url.searchParams.get("scope") === "all") {
          setSearchScope("corpus");
          setCorpusQuery(url.searchParams.get("q") ?? "");
          const requestedCorpusRoute =
            url.searchParams.get("section") ??
            url.searchParams.get("chapter");
          if (
            requestedCorpusRoute &&
            data.routes.some((route) => route.id === requestedCorpusRoute)
          ) {
            setCorpusRouteId(requestedCorpusRoute);
          }
        }

        setRouteId(nextRouteId);
        setScriptId(nextScriptId);
        setUrlReady(true);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const routes = index?.routes ?? routeFallbacks;
  const totalLineLabel = index?.totalLines.toLocaleString() ?? "77,198";
  const totalScriptCount =
    index?.routes.reduce((sum, route) => sum + route.scripts.length, 0) ?? 254;
  const selectedRoute =
    routes.find((route) => route.id === routeId) ?? routes[0];
  const orderedScripts = routes.flatMap((route) =>
    route.scripts.map((script) => ({
      routeId: route.id,
      routeLabel: route.label,
      scriptId: script.id,
    })),
  );
  const selectedScriptIndex = orderedScripts.findIndex(
    (script) => script.routeId === routeId && script.scriptId === scriptId,
  );
  const previousScript =
    selectedScriptIndex > 0 ? orderedScripts[selectedScriptIndex - 1] : null;
  const nextScript =
    selectedScriptIndex >= 0 && selectedScriptIndex < orderedScripts.length - 1
      ? orderedScripts[selectedScriptIndex + 1]
      : null;
  const query = searchScope === "corpus" ? corpusQuery : scriptQuery;
  const hasCorpusQuery = corpusQuery.trim() !== "";
  const normalizedCorpusQuery = normalizeSearchText(
    deferredCorpusQuery.trim(),
  );
  const compactCorpusQuery = isJapaneseSearchText(normalizedCorpusQuery)
    ? compactSearchText(normalizedCorpusQuery)
    : "";

  const activePayload =
    payload?.route === selectedRoute?.id && payload.scriptId === scriptId
      ? payload
      : null;
  const activeTodokanaiPayload =
    todokanaiPayload?.route === selectedRoute?.id &&
    todokanaiPayload.scriptId === scriptId
      ? todokanaiPayload
      : null;
  const activeTodokanaiErrorPayload =
    todokanaiErrorPayload?.route === selectedRoute?.id &&
    todokanaiErrorPayload.scriptId === scriptId
      ? todokanaiErrorPayload
      : null;

  function selectRoute(nextRouteId: string) {
    const nextRoute = routes.find((route) => route.id === nextRouteId);
    setTodokanaiError("");
    setTodokanaiEditorialError("");
    setActiveTodokanaiErrorId("");
    setPendingRef("");
    setRouteId(nextRouteId);
    if (nextRoute?.scripts[0]) setScriptId(nextRoute.scripts[0].id);
  }

  function selectScript(nextScriptId: string) {
    setTodokanaiError("");
    setTodokanaiEditorialError("");
    setActiveTodokanaiErrorId("");
    setPendingRef("");
    setScriptId(nextScriptId);
  }

  function selectScriptLocation(nextRouteId: string, nextScriptId: string) {
    setTodokanaiError("");
    setTodokanaiEditorialError("");
    setActiveTodokanaiErrorId("");
    setPendingRef("");
    setRouteId(nextRouteId);
    setScriptId(nextScriptId);
  }

  function selectSearchScope(nextScope: SearchScope) {
    setSearchScope(nextScope);
    setCorpusLimit(CORPUS_BATCH_SIZE);
  }

  useEffect(() => {
    if (!index || !urlReady) return;

    const timeout = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (searchScope === "corpus") {
        url.searchParams.set("scope", "all");
        if (corpusQuery) {
          url.searchParams.set("q", corpusQuery);
        } else {
          url.searchParams.delete("q");
        }
        if (corpusRouteId === "all") {
          url.searchParams.delete("section");
          url.searchParams.delete("chapter");
        } else {
          url.searchParams.set("section", corpusRouteId);
          url.searchParams.delete("chapter");
        }
        url.searchParams.delete("route");
        url.searchParams.delete("script");
        url.hash = "";
      } else {
        url.searchParams.delete("scope");
        url.searchParams.delete("q");
        url.searchParams.delete("section");
        url.searchParams.delete("chapter");
        url.searchParams.set("route", routeId);
        url.searchParams.set("script", scriptId);

        const hashParts = decodeURIComponent(url.hash.slice(1)).split(":");
        const hashRouteId =
          hashParts[0] === "wa2mas"
            ? "special"
            : hashParts[1] === "ic"
            ? "intro"
            : hashParts[1] === "cc"
              ? "closing"
              : hashParts[1] === "coda"
                ? "coda"
                : "";
        if (hashRouteId !== routeId || hashParts[2] !== scriptId) {
          url.hash = "";
        }
      }
      if (showTodokanai) {
        url.searchParams.set("compare", "todokanai");
      } else {
        url.searchParams.delete("compare");
      }
      if (showTodokanai && showTodokanaiErrors) {
        url.searchParams.set("errors", "todokanai");
      } else {
        url.searchParams.delete("errors");
      }
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [
    corpusQuery,
    corpusRouteId,
    index,
    routeId,
    scriptId,
    searchScope,
    showTodokanai,
    showTodokanaiErrors,
    urlReady,
  ]);

  useEffect(() => {
    if (!activeTodokanaiErrorId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveTodokanaiErrorId("");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeTodokanaiErrorId]);

  useEffect(() => {
    const script = selectedRoute?.scripts.find(
      (candidate) => candidate.id === scriptId,
    );
    if (!script) return;

    const controller = new AbortController();
    fetch(`../script-data/${script.file}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load script ${scriptId}.`);
        return response.json();
      })
      .then((data: ScriptPayload) => {
        setPayload(data);
        setError("");
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") setError(reason.message);
      });

    return () => controller.abort();
  }, [selectedRoute, scriptId]);

  useEffect(() => {
    if (!showTodokanai || searchScope !== "script") return;

    const script = selectedRoute?.scripts.find(
      (candidate) => candidate.id === scriptId,
    );
    if (!script) return;

    const controller = new AbortController();
    const comparisonFile = script.comparisonFile ?? script.file;
    fetch(`../todokanai-data/${comparisonFile}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load Todokanai TL for script ${scriptId}.`);
        }
        return response.json();
      })
      .then((data: TodokanaiPayload) => {
        setTodokanaiPayload(data);
        setTodokanaiError("");
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") setTodokanaiError(reason.message);
      });

    return () => controller.abort();
  }, [searchScope, selectedRoute, scriptId, showTodokanai]);

  useEffect(() => {
    if (!showTodokanaiErrors || todokanaiErrorIndex) return;

    const controller = new AbortController();
    fetch("../todokanai-errors/index.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the Todokanai TL editorial index.");
        }
        return response.json();
      })
      .then((data: TodokanaiErrorIndex) => {
        if (
          data.schema !== "wa2-todokanai-editorial-error-index/1" ||
          data.totalLines !== index?.totalLines
        ) {
          throw new Error(
            "The Todokanai TL editorial index does not match this script release.",
          );
        }
        setTodokanaiErrorIndex(data);
        setTodokanaiEditorialError("");
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") {
          setTodokanaiEditorialError(reason.message);
        }
      });

    return () => controller.abort();
  }, [index, showTodokanaiErrors, todokanaiErrorIndex]);

  useEffect(() => {
    if (!showTodokanaiErrors || searchScope !== "script") return;

    const script = selectedRoute?.scripts.find(
      (candidate) => candidate.id === scriptId,
    );
    if (!script) return;

    const controller = new AbortController();
    fetch(`../todokanai-errors/${script.file}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load error notes for script ${scriptId}.`);
        }
        return response.json();
      })
      .then((data: TodokanaiErrorPayload) => {
        if (
          data.schema !== "wa2-todokanai-editorial-errors/1" ||
          data.route !== selectedRoute.id ||
          data.scriptId !== scriptId ||
          data.lineCount !== script.lineCount
        ) {
          throw new Error(
            `The editorial notes do not match script ${scriptId}.`,
          );
        }
        setTodokanaiErrorPayload(data);
        setTodokanaiEditorialError("");
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") {
          setTodokanaiEditorialError(reason.message);
        }
      });

    return () => controller.abort();
  }, [searchScope, selectedRoute, scriptId, showTodokanaiErrors]);

  useEffect(() => {
    if (
      !showTodokanaiErrors ||
      searchScope !== "corpus" ||
      !hasCorpusQuery ||
      todokanaiErrorConcordance ||
      !todokanaiErrorIndex
    ) {
      return;
    }

    const controller = new AbortController();
    fetch(
      `../todokanai-errors/${todokanaiErrorIndex.concordanceFile}`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the Todokanai TL editorial concordance.");
        }
        return response.json();
      })
      .then((data: TodokanaiErrorConcordance) => {
        if (
          data.schema !==
            "wa2-todokanai-editorial-error-concordance/1" ||
          data.totalFindings !== todokanaiErrorIndex.totalFindings
        ) {
          throw new Error(
            "The Todokanai TL editorial concordance failed its integrity check.",
          );
        }
        setTodokanaiErrorConcordance(data);
        setTodokanaiEditorialError("");
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") {
          setTodokanaiEditorialError(reason.message);
        }
      });

    return () => controller.abort();
  }, [
    hasCorpusQuery,
    searchScope,
    showTodokanaiErrors,
    todokanaiErrorConcordance,
    todokanaiErrorIndex,
  ]);

  useEffect(() => {
    if (
      searchScope !== "corpus" ||
      !hasCorpusQuery ||
      concordance ||
      !index
    ) {
      return;
    }

    const controller = new AbortController();
    const filename = index.concordance?.file ?? "concordance.json";
    fetch(`../script-data/${filename}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the full-corpus concordance.");
        }
        return response.json();
      })
      .then((data: ConcordancePayload) => {
        if (
          data.schema !== "wa2-public-concordance/1" ||
          data.totalLines !== index.totalLines
        ) {
          throw new Error("The concordance does not match this script release.");
        }
        setConcordance(data);
        setConcordanceError("");
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") {
          setConcordanceError(reason.message);
        }
      });

    return () => controller.abort();
  }, [concordance, hasCorpusQuery, index, searchScope]);

  useEffect(() => {
    if (
      searchScope !== "corpus" ||
      !hasCorpusQuery ||
      !showTodokanai ||
      todokanaiConcordance ||
      !index
    ) {
      return;
    }

    const controller = new AbortController();
    const filename =
      index.comparison?.concordanceFile ?? "concordance.json";
    fetch(`../todokanai-data/${filename}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the Todokanai TL concordance.");
        }
        return response.json();
      })
      .then((data: TodokanaiConcordancePayload) => {
        if (
          data.schema !== "wa2-todokanai-concordance/1" ||
          data.totalLines !== index.totalLines
        ) {
          throw new Error(
            "The Todokanai TL concordance does not match this script release.",
          );
        }
        setTodokanaiConcordance(data);
        setTodokanaiConcordanceError("");
      })
      .catch((reason: Error) => {
        if (reason.name !== "AbortError") {
          setTodokanaiConcordanceError(reason.message);
        }
      });

    return () => controller.abort();
  }, [
    hasCorpusQuery,
    index,
    searchScope,
    showTodokanai,
    todokanaiConcordance,
  ]);

  const todokanaiByRef = useMemo(
    () =>
      new Map(
        (activeTodokanaiPayload?.lines ?? []).map((line) => [line.ref, line]),
      ),
    [activeTodokanaiPayload],
  );

  const todokanaiErrorsByRef = useMemo(() => {
    const byRef = new Map<string, TodokanaiErrorFinding[]>();
    (activeTodokanaiErrorPayload?.findings ?? []).forEach((finding) => {
      byRef.set(finding.ref, [...(byRef.get(finding.ref) ?? []), finding]);
    });
    return byRef;
  }, [activeTodokanaiErrorPayload]);

  const corpusTodokanaiErrorsByRef = useMemo(() => {
    const byRef = new Map<string, TodokanaiErrorFinding[]>();
    (todokanaiErrorConcordance?.findings ?? []).forEach((finding) => {
      byRef.set(finding.ref, [...(byRef.get(finding.ref) ?? []), finding]);
    });
    return byRef;
  }, [todokanaiErrorConcordance]);

  const dossierLinksForRef = (ref: string): TodokanaiDossierLink[] =>
    (todokanaiErrorIndex?.dossierMemberships?.[ref] ?? []).map((id) => ({
      id,
      label: todokanaiErrorIndex?.dossierLabels?.[id] ?? "Open work-wide dossier",
    }));

  const visibleLines = useMemo(() => {
    const lines = activePayload?.lines ?? [];
    const needle = normalizeSearchText(scriptQuery.trim());
    const compactNeedle = isJapaneseSearchText(needle)
      ? compactSearchText(needle)
      : "";
    if (!needle) return lines;
    return lines.filter((line) =>
      [
        line.ref,
        line.speakerJa,
        line.speakerEn,
        line.japanese,
        line.english,
        showTodokanai ? (todokanaiByRef.get(line.ref)?.english ?? "") : "",
      ].some((value) => {
        const normalized = normalizeSearchText(value);
        return (
          normalized.includes(needle) ||
          (compactNeedle !== "" &&
            compactSearchText(normalized).includes(compactNeedle))
        );
      }),
    );
  }, [activePayload, scriptQuery, showTodokanai, todokanaiByRef]);

  const todokanaiConcordanceAligned = useMemo<boolean | null>(() => {
    if (!concordance || !todokanaiConcordance) return null;
    if (concordance.routes.length !== todokanaiConcordance.routes.length) {
      return false;
    }

    for (
      let routeIndex = 0;
      routeIndex < concordance.routes.length;
      routeIndex += 1
    ) {
      const route = concordance.routes[routeIndex];
      const comparisonRoute = todokanaiConcordance.routes[routeIndex];
      if (
        comparisonRoute.id !== route.id ||
        comparisonRoute.scripts.length !== route.scripts.length
      ) {
        return false;
      }

      for (
        let scriptIndex = 0;
        scriptIndex < route.scripts.length;
        scriptIndex += 1
      ) {
        const script = route.scripts[scriptIndex];
        const comparisonScript = comparisonRoute.scripts[scriptIndex];
        if (
          comparisonScript.id !== script.id ||
          comparisonScript.lines.length !== script.lines.length
        ) {
          return false;
        }

        for (
          let lineIndex = 0;
          lineIndex < script.lines.length;
          lineIndex += 1
        ) {
          if (
            comparisonScript.lines[lineIndex][0] !==
            script.lines[lineIndex][0]
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }, [concordance, todokanaiConcordance]);

  const corpusComparisonReady =
    !showTodokanai || todokanaiConcordanceAligned === true;
  const corpusMatches = useMemo<CorpusMatch[]>(() => {
    if (
      !normalizedCorpusQuery ||
      !concordance ||
      !corpusComparisonReady
    ) {
      return [];
    }

    const matches: CorpusMatch[] = [];
    concordance.routes.forEach((route, routeIndex) => {
      route.scripts.forEach((script, scriptIndex) => {
        script.lines.forEach((row, lineIndex) => {
          const primaryHaystack = normalizeSearchText(
            [row[0], row[2], row[3], row[4], row[5], row[6]].join(
              "\u0000",
            ),
          );
          let matchesQuery =
            primaryHaystack.includes(normalizedCorpusQuery) ||
            (compactCorpusQuery !== "" &&
              compactSearchText(primaryHaystack).includes(
                compactCorpusQuery,
              ));
          const comparisonRow = showTodokanai
            ? todokanaiConcordance?.routes[routeIndex]?.scripts[
                scriptIndex
              ]?.lines[lineIndex]
            : undefined;

          if (!matchesQuery && comparisonRow) {
            const comparisonHaystack = normalizeSearchText(comparisonRow[1]);
            matchesQuery =
              comparisonHaystack.includes(normalizedCorpusQuery) ||
              (compactCorpusQuery !== "" &&
                compactSearchText(comparisonHaystack).includes(
                  compactCorpusQuery,
                ));
          }

          if (matchesQuery) {
            matches.push({
              routeId: route.id,
              routeLabel: route.label,
              scriptId: script.id,
              row,
              comparisonRow,
            });
          }
        });
      });
    });
    return matches;
  }, [
    compactCorpusQuery,
    concordance,
    corpusComparisonReady,
    normalizedCorpusQuery,
    showTodokanai,
    todokanaiConcordance,
  ]);

  const corpusRouteCounts = useMemo(
    () =>
      new Map(
        routes.map((route) => [
          route.id,
          corpusMatches.filter((line) => line.routeId === route.id).length,
        ]),
      ),
    [corpusMatches, routes],
  );
  const filteredCorpusMatches =
    corpusRouteId === "all"
      ? corpusMatches
      : corpusMatches.filter((line) => line.routeId === corpusRouteId);
  const visibleCorpusMatches = filteredCorpusMatches.slice(0, corpusLimit);
  const corpusScriptCount = useMemo(
    () =>
      new Set(
        filteredCorpusMatches.map(
          (line) => `${line.routeId}:${line.scriptId}`,
        ),
      ).size,
    [filteredCorpusMatches],
  );
  const corpusSectionCount = useMemo(
    () =>
      new Set(filteredCorpusMatches.map((line) => line.routeId)).size,
    [filteredCorpusMatches],
  );
  const todokanaiAlignmentFailed = todokanaiConcordanceAligned === false;
  const corpusSearchPending =
    hasCorpusQuery &&
    (deferredCorpusQuery !== corpusQuery ||
      (!concordance && !concordanceError) ||
      (showTodokanai &&
        !todokanaiConcordanceError &&
        !todokanaiAlignmentFailed &&
        todokanaiConcordanceAligned !== true));

  useEffect(() => {
    if (!pendingRef || !activePayload) return;
    if (!activePayload.lines.some((line) => line.ref === pendingRef)) return;
    if (
      showTodokanai &&
      !activeTodokanaiPayload &&
      !todokanaiError
    ) {
      return;
    }
    if (
      showTodokanaiErrors &&
      !activeTodokanaiErrorPayload &&
      !todokanaiEditorialError
    ) {
      return;
    }

    const linkedFindings = todokanaiErrorsByRef.get(pendingRef) ?? [];
    const frame = window.requestAnimationFrame(() => {
      if (showTodokanaiErrors && linkedFindings.length) {
        setActiveTodokanaiErrorId(linkedFindings[0].id);
      }
      const target = document.getElementById(pendingRef);
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
      setPendingRef("");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    activePayload,
    activeTodokanaiErrorPayload,
    activeTodokanaiPayload,
    pendingRef,
    showTodokanai,
    showTodokanaiErrors,
    todokanaiErrorsByRef,
    todokanaiEditorialError,
    todokanaiError,
  ]);

  const comparisonVisible = showTodokanai && activeTodokanaiPayload !== null;
  const editorialAnnotationsVisible =
    comparisonVisible &&
    showTodokanaiErrors &&
    activeTodokanaiErrorPayload !== null;
  const comparisonStatus = !showTodokanai
    ? "Off by default"
    : searchScope === "corpus"
      ? !hasCorpusQuery
        ? "Comparison loads when you search"
        : todokanaiConcordanceError
          ? todokanaiConcordanceError
          : todokanaiAlignmentFailed
            ? "Comparison concordance failed its alignment check."
            : todokanaiConcordanceAligned
              ? `${index?.comparison?.availableEnglishLines.toLocaleString() ?? "0"} of ${index?.totalLines.toLocaleString() ?? "0"} lines available across the corpus`
              : "Loading comparison concordance…"
      : todokanaiError
        ? todokanaiError
        : activeTodokanaiPayload
          ? `${activeTodokanaiPayload.availableCount.toLocaleString()} of ${activeTodokanaiPayload.lineCount.toLocaleString()} lines available in this script`
          : "Loading comparison…";
  const editorialStatus = !showTodokanaiErrors
    ? "Off by default"
    : todokanaiEditorialError
      ? todokanaiEditorialError
      : searchScope === "script" && activeTodokanaiErrorPayload
        ? `${activeTodokanaiErrorPayload.findingCount.toLocaleString()} adjudicated error${
            activeTodokanaiErrorPayload.findingCount === 1 ? "" : "s"
          } in this script`
        : searchScope === "corpus" && hasCorpusQuery
          ? todokanaiErrorConcordance
            ? `${todokanaiErrorConcordance.totalFindings.toLocaleString()} adjudicated findings available`
            : "Loading editorial notes…"
          : todokanaiErrorIndex
            ? `${todokanaiErrorIndex.totalFindings.toLocaleString()} findings in ${todokanaiErrorIndex.auditedLineCount.toLocaleString()} reviewed lines`
            : "Loading editorial index…";

  const resultStatus =
    searchScope === "script"
      ? !activePayload
        ? error
          ? "Script unavailable"
          : "Loading script…"
        : `${visibleLines.length.toLocaleString()} ${
            scriptQuery.trim() ? "matching " : ""
          }line${visibleLines.length === 1 ? "" : "s"}`
      : !hasCorpusQuery
        ? `${totalLineLabel} lines ready to search`
        : !concordance
          ? concordanceError || `Loading ${totalLineLabel}-line concordance…`
          : corpusSearchPending
            ? "Searching the complete corpus…"
            : `${filteredCorpusMatches.length.toLocaleString()} matching line${
                filteredCorpusMatches.length === 1 ? "" : "s"
              } across ${corpusScriptCount.toLocaleString()} script${
                corpusScriptCount === 1 ? "" : "s"
              } and ${corpusSectionCount.toLocaleString()} section${
                corpusSectionCount === 1 ? "" : "s"
              }`;

  return (
    <section className="reader-shell shell compact">
      <div className="reader-controls" id="reader-controls">
        <div className="control">
          <label htmlFor="route">Section</label>
          <select
            id="route"
            value={routeId}
            disabled={searchScope === "corpus"}
            onChange={(event) => selectRoute(event.target.value)}
          >
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="script">Script</label>
          <div className="script-picker">
            <button
              type="button"
              aria-label="Previous script"
              disabled={searchScope === "corpus" || !previousScript}
              title={
                previousScript
                  ? `Previous: ${previousScript.routeLabel} ${previousScript.scriptId}`
                  : "This is the first script"
              }
              onClick={() => {
                if (previousScript) {
                  selectScriptLocation(
                    previousScript.routeId,
                    previousScript.scriptId,
                  );
                }
              }}
            >
              ←
            </button>
            <select
              id="script"
              value={scriptId}
              disabled={searchScope === "corpus"}
              onChange={(event) => selectScript(event.target.value)}
            >
              {(selectedRoute?.scripts ?? []).map((script) => (
                <option key={script.id} value={script.id}>
                  {script.id} · {script.lineCount.toLocaleString()} lines
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Next script"
              disabled={searchScope === "corpus" || !nextScript}
              title={
                nextScript
                  ? `Next: ${nextScript.routeLabel} ${nextScript.scriptId}`
                  : "This is the final script"
              }
              onClick={() => {
                if (nextScript) {
                  selectScriptLocation(nextScript.routeId, nextScript.scriptId);
                }
              }}
            >
              →
            </button>
          </div>
        </div>

        <fieldset className="search-scope">
          <legend>Search scope</legend>
          <div className="scope-options">
            <label>
              <input
                type="radio"
                name="search-scope"
                value="script"
                checked={searchScope === "script"}
                onChange={() => selectSearchScope("script")}
              />
              <span>This script</span>
            </label>
            <label>
              <input
                type="radio"
                name="search-scope"
                value="corpus"
                checked={searchScope === "corpus"}
                onChange={() => selectSearchScope("corpus")}
              />
              <span>All scripts</span>
            </label>
          </div>
        </fieldset>

        <div className="control">
          <label htmlFor="search">
            {searchScope === "corpus"
              ? `Search all ${totalLineLabel} lines`
              : "Search this script"}
          </label>
          <input
            id="search"
            type="search"
            value={query}
            placeholder="English, 日本語, speaker, or wa2:/wa2mas: ref"
            aria-controls={
              searchScope === "corpus"
                ? "concordance-results"
                : "script-results"
            }
            aria-describedby="search-status"
            onChange={(event) => {
              if (searchScope === "corpus") {
                setCorpusQuery(event.target.value);
                setCorpusRouteId("all");
                setCorpusLimit(CORPUS_BATCH_SIZE);
              } else {
                setScriptQuery(event.target.value);
              }
            }}
          />
        </div>

        <div
          className="result-count"
          id="search-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {resultStatus}
        </div>

        <label className="comparison-toggle">
          <input
            type="checkbox"
            checked={showTodokanai}
            onChange={(event) => {
              const nextShowTodokanai = event.target.checked;
              setTodokanaiError("");
              setTodokanaiConcordanceError("");
              if (!nextShowTodokanai) {
                setTodokanaiPayload(null);
                setTodokanaiConcordance(null);
                setShowTodokanaiErrors(false);
                setTodokanaiErrorPayload(null);
                setTodokanaiErrorConcordance(null);
                setActiveTodokanaiErrorId("");
              }
              setShowTodokanai(nextShowTodokanai);
              setCorpusLimit(CORPUS_BATCH_SIZE);
            }}
          />
          <span>Display Todokanai TL for comparison</span>
          <small aria-live="polite">{comparisonStatus}</small>
        </label>
        {showTodokanai ? (
          <div className="comparison-errors-row">
            <label className="comparison-toggle comparison-toggle-errors">
              <input
                type="checkbox"
                checked={showTodokanaiErrors}
                onChange={(event) => {
                  const nextShowErrors = event.target.checked;
                  setTodokanaiEditorialError("");
                  setActiveTodokanaiErrorId("");
                  if (!nextShowErrors) {
                    setTodokanaiErrorPayload(null);
                    setTodokanaiErrorConcordance(null);
                  }
                  setShowTodokanaiErrors(nextShowErrors);
                }}
              />
              <span>Display Todokanai TL errors</span>
            </label>
            <small className="comparison-errors-status" aria-live="polite">
              {editorialStatus}
            </small>
          </div>
        ) : null}
      </div>

      {searchScope === "script" && error ? (
        <p className="script-status">{error}</p>
      ) : null}

      {searchScope === "script" && activePayload ? (
        <>
          {corpusQuery.trim() ? (
            <button
              className="back-to-concordance"
              type="button"
              onClick={() => selectSearchScope("corpus")}
            >
              ← Back to corpus results for “{corpusQuery}”
            </button>
          ) : null}
          <div className="script-meta">
            <h2>
              {activePayload.routeLabel} · {activePayload.scriptId}
            </h2>
            <p>{activePayload.lineCount.toLocaleString()} source lines</p>
          </div>

          {visibleLines.length ? (
            <div className="script-lines" id="script-results">
              {visibleLines.map((line) => {
                const todokanaiLine = todokanaiByRef.get(line.ref);
                const errorFindings = editorialAnnotationsVisible
                  ? (todokanaiErrorsByRef.get(line.ref) ?? [])
                  : [];
                const contextHref = `?route=${encodeURIComponent(
                  selectedRoute.id,
                )}&script=${encodeURIComponent(
                  scriptId,
                )}&compare=todokanai&errors=todokanai#${line.ref}`;
                return (
                  <article
                    className={`script-line${comparisonVisible ? " script-line-comparison" : ""}${errorFindings.length ? " script-line-error" : ""}`}
                    id={line.ref}
                    key={line.ref}
                    tabIndex={-1}
                  >
                    <a
                      className="line-ref"
                      href={`#${line.ref}`}
                      aria-label={`Link to ${line.ref}`}
                      title={line.ref}
                    >
                      {line.line}
                    </a>
                    <div className="line-cell line-ja" lang="ja">
                      <div className="line-cell-heading">
                        <span className="speaker speaker-ja">
                          {line.speakerJa}
                        </span>
                        {comparisonVisible ? (
                          <span className="edition-label" lang="en">
                            Japanese
                          </span>
                        ) : null}
                      </div>
                      <p>
                        <JapaneseRubyText
                          plain={line.japanese}
                          rubyText={line.japaneseRuby}
                        />
                      </p>
                    </div>
                    <div className="line-cell line-en">
                      <div className="line-cell-heading">
                        <span className="speaker">{line.speakerEn}</span>
                        {comparisonVisible ? (
                          <span className="edition-label">MAO English</span>
                        ) : null}
                      </div>
                      <p>{line.english}</p>
                    </div>
                    {comparisonVisible ? (
                      <div className="line-cell line-en line-todokanai">
                        <div className="line-cell-heading">
                          <span className="speaker">{line.speakerEn}</span>
                          <span className="edition-label">Todokanai TL</span>
                        </div>
                        {todokanaiLine?.english ? (
                          errorFindings.length ? (
                            <TodokanaiErrorText
                              text={todokanaiLine.english}
                              findings={errorFindings}
                              activeFindingId={activeTodokanaiErrorId}
                              contextHref={contextHref}
                              dossierLinks={dossierLinksForRef(line.ref)}
                              onToggleFinding={(findingId) =>
                                setActiveTodokanaiErrorId((current) =>
                                  current === findingId ? "" : findingId,
                                )
                              }
                            />
                          ) : (
                            <p>{todokanaiLine.english}</p>
                          )
                        ) : (
                          <p
                            className="comparison-missing"
                            title={`Alignment status: ${todokanaiLine?.status ?? "unavailable"}`}
                          >
                            {todokanaiLine?.status === "source_only"
                              ? "Untranslated in the Todokanai TL patch."
                              : "No aligned Todokanai TL line."}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="script-empty">No lines match this search.</p>
          )}
          <a className="back-to-controls" href="#reader-controls">
            Back to controls ↑
          </a>
        </>
      ) : null}

      {searchScope === "corpus" ? (
        <>
          {hasCorpusQuery && concordanceError ? (
            <p className="script-status">{concordanceError}</p>
          ) : null}
          {hasCorpusQuery && !concordanceError && !concordance ? (
            <p className="script-status">
              Loading the {totalLineLabel}-line concordance…
            </p>
          ) : null}
          {hasCorpusQuery && todokanaiConcordanceError ? (
            <p className="script-status">
              {todokanaiConcordanceError}
            </p>
          ) : null}
          {hasCorpusQuery && showTodokanaiErrors && todokanaiEditorialError ? (
            <p className="script-status">{todokanaiEditorialError}</p>
          ) : null}
          {hasCorpusQuery &&
          showTodokanai &&
          todokanaiAlignmentFailed ? (
            <p className="script-status">
              The Todokanai TL concordance failed its alignment check.
            </p>
          ) : null}

          {!hasCorpusQuery ? (
            <div className="concordance-prompt">
              <p className="eyebrow">Full-corpus search</p>
              <h2>Search all {totalLineLabel} lines</h2>
              <p>
                Enter a Japanese or English phrase, speaker name, script
                number, or <code>wa2:</code>/<code>wa2mas:</code> reference.
                Results cover all {totalScriptCount.toLocaleString()} scripts
                in the main game and Special Contents.
              </p>
            </div>
          ) : null}

          {concordance &&
          hasCorpusQuery &&
          corpusSearchPending &&
          !todokanaiConcordanceError ? (
            <p className="script-status">Searching the complete corpus…</p>
          ) : null}

          {concordance &&
          hasCorpusQuery &&
          !corpusSearchPending &&
          !todokanaiConcordanceError &&
          (!showTodokanai || todokanaiConcordanceAligned === true) ? (
            <>
              <div className="script-meta concordance-meta">
                <div>
                  <p className="eyebrow">
                    All {totalScriptCount.toLocaleString()} scripts
                  </p>
                  <h2>Corpus concordance</h2>
                </div>
                <p>{resultStatus}</p>
              </div>

              <nav
                className="concordance-route-filter"
                aria-label="Filter concordance results by section"
              >
                <button
                  type="button"
                  className={corpusRouteId === "all" ? "is-active" : ""}
                  aria-pressed={corpusRouteId === "all"}
                  onClick={() => {
                    setCorpusRouteId("all");
                    setCorpusLimit(CORPUS_BATCH_SIZE);
                  }}
                >
                  All sections
                  <span>{corpusMatches.length.toLocaleString()}</span>
                </button>
                {routes.map((route) => {
                  const count = corpusRouteCounts.get(route.id) ?? 0;
                  return (
                    <button
                      type="button"
                      key={route.id}
                      className={
                        corpusRouteId === route.id ? "is-active" : ""
                      }
                      aria-pressed={corpusRouteId === route.id}
                      disabled={count === 0}
                      onClick={() => {
                        setCorpusRouteId(route.id);
                        setCorpusLimit(CORPUS_BATCH_SIZE);
                      }}
                    >
                      {route.label}
                      <span>{count.toLocaleString()}</span>
                    </button>
                  );
                })}
              </nav>

              {visibleCorpusMatches.length ? (
                <>
                  <div
                    className="concordance-results"
                    id="concordance-results"
                    aria-busy={corpusSearchPending}
                  >
                    {visibleCorpusMatches.map((line) => {
                      const [
                        ref,
                        lineNumber,
                        speakerJa,
                        speakerEn,
                        japanese,
                        english,
                        japaneseRuby,
                      ] = line.row;
                      const comparisonLine = line.comparisonRow;
                      const errorFindings =
                        showTodokanaiErrors && todokanaiErrorConcordance
                          ? (corpusTodokanaiErrorsByRef.get(ref) ?? [])
                          : [];
                      const resultHref = `?route=${encodeURIComponent(
                        line.routeId,
                      )}&script=${encodeURIComponent(
                        line.scriptId,
                      )}${
                        showTodokanai
                          ? "&compare=todokanai"
                          : ""
                      }${
                        showTodokanaiErrors
                          ? "&errors=todokanai"
                          : ""
                      }#${ref}`;
                      const globalComparisonVisible =
                        showTodokanai &&
                        todokanaiConcordanceAligned === true;

                      return (
                        <article
                          className={`concordance-hit${
                            globalComparisonVisible
                              ? " concordance-hit-comparison"
                              : ""
                          }${errorFindings.length ? " concordance-hit-error" : ""}`}
                          id={ref}
                          key={ref}
                        >
                          <a
                            className="concordance-hit-link"
                            href={resultHref}
                          >
                            <span>
                              {line.routeLabel} · Script {line.scriptId} ·
                              Line {lineNumber.toLocaleString()}
                            </span>
                            <code>{ref}</code>
                            <strong>Open in script →</strong>
                          </a>
                          <div className="concordance-hit-grid">
                            <div className="line-cell line-ja" lang="ja">
                              <div className="line-cell-heading">
                                <span className="speaker speaker-ja">
                                  {speakerJa}
                                </span>
                                {globalComparisonVisible ? (
                                  <span className="edition-label" lang="en">
                                    Japanese
                                  </span>
                                ) : null}
                              </div>
                              <p>
                                <JapaneseRubyText
                                  plain={japanese}
                                  rubyText={japaneseRuby}
                                />
                              </p>
                            </div>
                            <div className="line-cell line-en">
                              <div className="line-cell-heading">
                                <span className="speaker">{speakerEn}</span>
                                {globalComparisonVisible ? (
                                  <span className="edition-label">
                                    MAO English
                                  </span>
                                ) : null}
                              </div>
                              <p>{english}</p>
                            </div>
                            {globalComparisonVisible ? (
                              <div className="line-cell line-en line-todokanai">
                                <div className="line-cell-heading">
                                  <span className="speaker">{speakerEn}</span>
                                  <span className="edition-label">
                                    Todokanai TL
                                  </span>
                                </div>
                                {comparisonLine?.[1] ? (
                                  errorFindings.length ? (
                                    <TodokanaiErrorText
                                      text={comparisonLine[1]}
                                      findings={errorFindings}
                                      activeFindingId={activeTodokanaiErrorId}
                                      contextHref={resultHref}
                                      dossierLinks={dossierLinksForRef(ref)}
                                      onToggleFinding={(findingId) =>
                                        setActiveTodokanaiErrorId((current) =>
                                          current === findingId
                                            ? ""
                                            : findingId,
                                        )
                                      }
                                    />
                                  ) : (
                                    <p>{comparisonLine[1]}</p>
                                  )
                                ) : (
                                  <p
                                    className="comparison-missing"
                                    title={`Alignment status: ${
                                      comparisonLine?.[2] ?? "unavailable"
                                    }`}
                                  >
                                    {comparisonLine?.[2] === "source_only"
                                      ? "Untranslated in the Todokanai TL patch."
                                      : "No aligned Todokanai TL line."}
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {visibleCorpusMatches.length <
                  filteredCorpusMatches.length ? (
                    <button
                      className="concordance-more"
                      type="button"
                      onClick={() =>
                        setCorpusLimit(
                          (current) => current + CORPUS_BATCH_SIZE,
                        )
                      }
                    >
                      Show the next{" "}
                      {Math.min(
                        CORPUS_BATCH_SIZE,
                        filteredCorpusMatches.length -
                          visibleCorpusMatches.length,
                      ).toLocaleString()}{" "}
                      matches
                      <span>
                        Showing{" "}
                        {visibleCorpusMatches.length.toLocaleString()} of{" "}
                        {filteredCorpusMatches.length.toLocaleString()}
                      </span>
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="script-empty">
                  No lines match this corpus search
                  {corpusRouteId === "all"
                    ? "."
                    : ` in ${
                        routes.find(
                          (route) => route.id === corpusRouteId,
                        )?.label ?? "this section"
                      }.`}
                </p>
              )}
            </>
          ) : null}
        </>
      ) : null}

      <p className="reader-note">
        The comparison column reproduces{" "}
        <a href="https://github.com/TodokanaiTL/WA2EnglishPatch">
          Todokanai TL
        </a>
        {"’s English and, for the prose bundled with Special Contents, the "}
        <a href="https://wa2analysis.com/">WA2Analysis</a>
        {" translations identified in Todokanai TL’s own credits. It appears only when requested and was not used to create or revise the MAO translation. "}
        {index?.comparison ? (
          <>
            Previous English is available for{" "}
            {index.comparison.availableEnglishLines.toLocaleString()} of{" "}
            {index.comparison.totalLines.toLocaleString()} source lines;
            unmatched and untranslated lines are marked.
          </>
        ) : null}
        {" "}
        <a href="https://github.com/MAO-TLs/white-album-2/blob/main/THIRD_PARTY_NOTICES.md">
          License notice
        </a>
        .
      </p>
    </section>
  );
}
