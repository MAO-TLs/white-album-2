import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";

const exportRoot = new URL("../dist/client/", import.meta.url);
const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");
const primaryNav = (document) => {
  const match = document.match(
    /<nav\b[^>]*aria-label="Primary navigation"[^>]*>[\s\S]*?<\/nav>/i,
  );
  assert.ok(match, "expected a rendered primary navigation");
  return match[0];
};

test("exports the release, script, and audit pages", async () => {
  const [home, script, audit, notFound, sourceCss] = await Promise.all([
    readFile(new URL("index.html", exportRoot), "utf8"),
    readFile(new URL("script/index.html", exportRoot), "utf8"),
    readFile(new URL("audit/index.html", exportRoot), "utf8"),
    readFile(new URL("404.html", exportRoot), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.ok(home.includes("<h1>WHITE<br/>ALBUM 2</h1>"));
  assert.match(home, /release-label">Version/i);
  assert.match(home, /v1\.2\.6/i);
  assert.match(home, /WHITE ALBUM 2 Special Contents/i);
  assert.doesNotMatch(home, /Mini After Story|Coming soon/i);
  assert.match(home, /Project Lead/i);
  assert.match(home, /Complete/i);
  assert.match(home, /Back up the originals/i);
  assert.doesNotMatch(home, /Special Contents movie/i);
  assert.doesNotMatch(home, /Special Contents mv000\.pak/i);
  assert.match(home, /Download complete release/i);
  assert.match(home, /716 MB/i);
  assert.match(home, /Release notes/i);
  assert.match(home, /two translated digital novels/i);
  assert.match(home, /all fifteen main-game movies/i);
  assert.match(home, /Generate the translated movies/i);
  assert.match(home, /generates all thirty high- and low-resolution movie assets/i);
  assert.match(home, /pinned 106 MB FFmpeg build/i);
  assert.match(home, /Read the digital novels/i);
  assert.match(home, /native Windows gameplay has not been locally/i);
  assert.match(
    home,
    /White_Album_2_Complete_English_Release_v1\.2\.6\.zip/i,
  );
  assert.match(
    home,
    /6ad54894ba7fb29f05de72623dc5f7253e9a558038595172a6457c5950f6bd86/i,
  );
  assert.match(home, /capped at 55[\s\S]*three lines/i);
  assert.match(home, /Launch WHITE ALBUM 2\.command/i);
  assert.match(home, /DirectX End-User Runtimes/i);
  assert.match(
    home,
    /Windows black screen/i,
  );
  assert.match(home, /GPT-5\.6 Sol/i);
  assert.match(home, /gambs/i);
  assert.match(home, /href=["']\.\/script\/\?route=intro&amp;script=1001/i);
  assert.match(home, /href=["']\.\/script\/\?route=closing&amp;script=2001/i);
  assert.match(home, /href=["']\.\/script\/\?route=coda&amp;script=3001/i);
  assert.match(home, /href=["']\.\/script\/\?route=special&amp;script=6001/i);
  assert.match(home, /wa2-winter-night-960\.webp/i);
  assert.match(home, /wa2-winter-night\.webp/i);
  assert.match(script, /Script browser/i);
  assert.match(script, /Script Version v1\.2\.6/i);
  assert.match(script, /77,198/i);
  assert.doesNotMatch(script, /including every Special Contents script/i);
  assert.match(audit, /Todokanai TL audit/i);
  assert.match(audit, /Source-only editorial audit/i);
  assert.match(audit, /Confirmed findings/i);
  assert.match(audit, /Borderline calls withheld/i);
  assert.match(audit, /Counterexamples recorded/i);
  const [homeNav, scriptNav, auditNav, notFoundNav] = [
    home,
    script,
    audit,
    notFound,
  ].map(primaryNav);
  for (const nav of [homeNav, scriptNav, auditNav, notFoundNav]) {
    assert.match(nav, />Release</i);
    assert.match(nav, />Read the script</i);
    assert.match(nav, />Audit</i);
    assert.match(nav, />GitHub</i);
    assert.match(
      nav,
      /class="wordmark" href="https:\/\/mao-tls\.github\.io\/"[\s\S]*?>MAO Translations</i,
    );
    assert.doesNotMatch(nav, /class="wordmark"[^>]*aria-current/i);
    assert.doesNotMatch(nav, />Install</i);
    assert.doesNotMatch(nav, /snow-mark|❄/i);
  }
  assert.match(homeNav, /href=["']\.\/["'] aria-current="page"[^>]*>Release</i);
  assert.match(scriptNav, /href=["']\.\.\/["'][^>]*>Release</i);
  assert.match(
    scriptNav,
    /href=["']\.\/["'] aria-current="page"[^>]*>Read the script/i,
  );
  assert.match(auditNav, /href=["']\.\.[/]script\/["'][^>]*>Read the script/i);
  assert.match(
    auditNav,
    /href=["']\.\/["'] aria-current="page"[^>]*>Audit/i,
  );
  assert.match(
    notFoundNav,
    /href=["']\/white-album-2\/["'][^>]*>Release/i,
  );
  assert.match(
    notFoundNav,
    /href=["']\/white-album-2\/script\/["'][^>]*>Read the script/i,
  );
  assert.match(
    notFoundNav,
    /href=["']\/white-album-2\/audit\/["'][^>]*>Audit/i,
  );
  assert.doesNotMatch(sourceCss, /scroll-behavior:\s*smooth/i);
  assert.doesNotMatch(sourceCss, /\.snow-mark/);
  assert.match(sourceCss, /\.nav\s*\{[\s\S]*?min-height: 92px/);
  assert.match(
    sourceCss,
    /@media \(max-width: 640px\)[\s\S]*?\.nav\s*\{[\s\S]*?min-height: 74px/,
  );
  assert.match(script, /Display Todokanai TL for comparison/i);
  assert.match(script, /Search scope/i);
  assert.match(script, /All scripts/i);
  assert.match(script, /77,198-line corpus/i);
  assert.match(script, /Todokanai TL/i);
  assert.match(script, /not used to create or revise the MAO translation/i);
  assert.match(script, /THIRD_PARTY_NOTICES\.md/i);
  assert.match(
    home,
    /<link rel="canonical" href="https:\/\/mao-tls\.github\.io\/white-album-2\/"/i,
  );
  assert.match(
    script,
    /<link rel="canonical" href="https:\/\/mao-tls\.github\.io\/white-album-2\/script\/"/i,
  );
  assert.match(
    script,
    /property="og:url" content="https:\/\/mao-tls\.github\.io\/white-album-2\/script\/"/i,
  );
  assert.match(
    audit,
    /<link rel="canonical" href="https:\/\/mao-tls\.github\.io\/white-album-2\/audit\/"/i,
  );
  assert.match(home, /\/white-album-2\/assets\//);
  assert.match(script, /\/white-album-2\/assets\//);
  assert.match(audit, /\/white-album-2\/assets\//);
  assert.doesNotMatch(home, /(?:href|src)=["']\/assets\//);
  assert.doesNotMatch(script, /(?:href|src)=["']\/assets\//);
  assert.doesNotMatch(audit, /(?:href|src)=["']\/assets\//);
  assert.match(notFound, /Nothing here/i);
  assert.match(notFound, /content="noindex" name="robots"/i);
  assert.match(notFound, /href=["']\/white-album-2\/["']/i);
  assert.match(notFound, /href=["']\/white-album-2\/script\/["']/i);
  assert.match(notFound, /href=["']\/white-album-2\/audit\/["']/i);
});

test("releases the one-time install fragment after navigation", async () => {
  const source = await readFile(
    new URL("../app/InstallAnchorRelease.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /window\.location\.hash === "#install"/);
  assert.match(source, /target\.scrollIntoView/);
  assert.match(source, /window\.history\.replaceState/);
  assert.match(source, /window\.location\.pathname/);
  assert.match(source, /window\.location\.search/);
  assert.match(source, /addEventListener\("hashchange"/);
  assert.match(source, /removeEventListener\("hashchange"/);
  assert.match(source, /a\[href="#install"\]/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /document\.addEventListener\("click"/);
  assert.match(source, /document\.removeEventListener\("click"/);
  assert.doesNotMatch(source, /pushState/);
});

test("keeps full-corpus search lazy, shareable, and navigable", async () => {
  const source = await readFile(
    new URL("../app/script/ScriptBrowser.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /All sections/);
  assert.match(source, /Filter concordance results by section/);
  assert.doesNotMatch(source, /All chapters|by chapter|this chapter/);

  assert.match(source, /id="reader-controls"/);
  assert.match(
    source,
    /className="back-to-controls" href="#reader-controls"/,
  );

  assert.match(source, /url\.searchParams\.get\("q"\)/);
  assert.match(source, /url\.searchParams\.set\("q", corpusQuery\)/);
  assert.match(source, /url\.searchParams\.get\("section"\)/);
  assert.match(source, /url\.searchParams\.set\("section", corpusRouteId\)/);

  assert.match(
    source,
    /searchScope !== "corpus" \|\|\s+!hasCorpusQuery \|\|\s+concordance/,
  );
  assert.doesNotMatch(
    source,
    /PreparedConcordanceLine|PreparedTodokanaiLine|compactHaystack/,
  );
  assert.match(source, /setTodokanaiConcordance\(null\)/);
  assert.match(source, /Display Todokanai TL errors/i);
  assert.match(source, /function JapaneseRubyText/);
  assert.match(source, /<ruby key=/);
  assert.match(source, /<rb>\{match\[1\]\}<\/rb>/);
  assert.match(source, /<rt>\{match\[2\]\.trim\(\)\}<\/rt>/);
  assert.match(source, /url\.searchParams\.get\("errors"\)/);
  assert.match(
    source,
    /url\.searchParams\.set\("errors", "todokanai"\)/,
  );
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /TodokanaiErrorText/);
  assert.doesNotMatch(source, /Browse the work-wide dossiers/);
  assert.doesNotMatch(source, /className="todokanai-audit-link"/);
  assert.match(source, /todokanaiErrorIndex\?\.dossierMemberships\?\.\[ref\]/);
  assert.match(source, /\.\.\/audit\/#dossier-/);
  assert.match(source, /setActiveTodokanaiErrorId\(linkedFindings\[0\]\.id\)/);
  assert.doesNotMatch(source, /function TodokanaiDossiers/);
  assert.doesNotMatch(source, /todokanaiDossiers/);
  assert.doesNotMatch(source, /todokanaiErrorIndex\.dossierFile/);
  assert.match(
    source,
    /!activePayload[\s\S]*?"Loading script…"/,
  );
});

test("keeps all concordance section filters in one desktop row", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.concordance-route-filter\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/,
  );
  assert.match(
    css,
    /@media \(max-width: 900px\)[\s\S]*?\.concordance-route-filter\s*\{[^}]*grid-template-columns:\s*1fr 1fr;/,
  );
  assert.match(
    css,
    /@media \(max-width: 640px\)[\s\S]*?\.concordance-route-filter\s*\{[^}]*grid-template-columns:\s*1fr;/,
  );
});

test("ships a source-only adjudicated Todokanai TL error layer", async () => {
  const [scriptIndex, errorIndex, errorConcordance, dossiers, sourceCss] =
    await Promise.all([
      readFile(new URL("script-data/index.json", exportRoot), "utf8").then(
        JSON.parse,
      ),
      readFile(new URL("todokanai-errors/index.json", exportRoot), "utf8").then(
        JSON.parse,
      ),
      readFile(
        new URL("todokanai-errors/concordance.json", exportRoot),
        "utf8",
      ).then(JSON.parse),
      readFile(
        new URL("todokanai-errors/dossiers.json", exportRoot),
        "utf8",
      ).then(JSON.parse),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

  assert.equal(
    errorIndex.schema,
    "wa2-todokanai-editorial-error-index/1",
  );
  assert.equal(errorIndex.totalLines, scriptIndex.totalLines);
  assert.equal(errorIndex.totalPacketCount, 492);
  assert.ok(errorIndex.completedPacketCount > 0);
  assert.ok(errorIndex.completedPacketCount <= errorIndex.totalPacketCount);
  assert.ok(errorIndex.auditedLineCount > 0);
  assert.ok(errorIndex.auditedLineCount <= errorIndex.totalLines);
  assert.equal(
    errorIndex.reviewComplete,
    errorIndex.completedPacketCount === errorIndex.totalPacketCount,
  );
  assert.equal(errorIndex.totalFindings, 3160);
  assert.equal(errorIndex.uniqueAffectedLineCount, 3160);
  assert.equal(errorIndex.withheldBorderlineCount, 2542);
  assert.equal(errorIndex.recordedCounterexampleCount, 194);
  assert.equal(typeof errorIndex.dossierMemberships, "object");
  assert.equal(typeof errorIndex.dossierLabels, "object");
  assert.equal(
    errorConcordance.schema,
    "wa2-todokanai-editorial-error-concordance/1",
  );
  assert.equal(errorConcordance.totalFindings, errorIndex.totalFindings);
  assert.equal(errorIndex.dossierFile, "dossiers.json");
  assert.equal(dossiers.schema, "wa2-todokanai-editorial-dossiers/1");
  assert.equal(dossiers.totalLines, errorIndex.totalLines);
  assert.equal(dossiers.auditedLineCount, errorIndex.auditedLineCount);
  assert.equal(dossiers.reviewComplete, errorIndex.reviewComplete);
  assert.ok(Array.isArray(dossiers.groups));
  assert.equal(dossiers.totalFindings, errorIndex.totalFindings);
  assert.equal(
    dossiers.uniqueAffectedLineCount,
    errorIndex.uniqueAffectedLineCount,
  );
  assert.equal(
    dossiers.withheldBorderlineCount,
    errorIndex.withheldBorderlineCount,
  );
  assert.equal(
    dossiers.recordedCounterexampleCount,
    errorIndex.recordedCounterexampleCount,
  );
  assert.equal(
    dossiers.groups.reduce(
      (sum, group) => sum + group.dossiers.length,
      0,
    ),
    errorIndex.dossierCount,
  );
  assert.equal(dossiers.dossierCount, errorIndex.dossierCount);
  assert.equal(
    dossiers.dossierEvidenceEntryCount,
    dossiers.groups.reduce(
      (sum, group) =>
        sum +
        group.dossiers.reduce(
          (dossierSum, dossier) => dossierSum + dossier.examples.length,
          0,
        ),
      0,
    ),
  );
  assert.equal(
    dossiers.uniqueDossierEvidenceLineCount,
    new Set(
      dossiers.groups.flatMap((group) =>
        group.dossiers.flatMap((dossier) =>
          dossier.examples.map((example) => example.ref),
        ),
      ),
    ).size,
  );
  assert.equal(
    errorIndex.dossierEvidenceEntryCount,
    dossiers.dossierEvidenceEntryCount,
  );
  assert.equal(
    errorIndex.uniqueDossierEvidenceLineCount,
    dossiers.uniqueDossierEvidenceLineCount,
  );
  assert.equal(errorIndex.dossierCount, 24);
  assert.equal(Object.keys(errorIndex.dossierLabels).length, 24);

  dossiers.groups.forEach((group) => {
    group.dossiers.forEach((dossier) => {
      assert.equal(
        dossier.findingExampleCount,
        dossier.examples.filter((example) => example.kind === "finding").length,
      );
      assert.equal(
        dossier.supportExampleCount,
        dossier.examples.filter((example) => example.kind === "pattern_support")
          .length,
      );
      assert.equal(
        dossier.counterexampleCount,
        dossier.examples.filter((example) => example.kind === "counterexample")
          .length,
      );
      dossier.examples.forEach((example) => {
        const memberships = errorIndex.dossierMemberships[example.ref] ?? [];
        if (example.kind === "finding") {
          assert.ok(memberships.includes(dossier.id));
          assert.ok(example.findingIds.length > 0);
        } else {
          assert.ok(!memberships.includes(dossier.id));
          assert.equal(example.findingIds.length, 0);
        }
      });
    });
  });

  const scriptSummaries = errorIndex.routes.flatMap((route) => route.scripts);
  assert.equal(scriptSummaries.length, 254);
  const payloads = await Promise.all(
    scriptSummaries.map((script) =>
      readFile(
        new URL(`todokanai-errors/${script.file}`, exportRoot),
        "utf8",
      ).then(JSON.parse),
    ),
  );
  const findings = payloads.flatMap((payload) => payload.findings);
  assert.equal(findings.length, errorIndex.totalFindings);
  assert.deepEqual(findings, errorConcordance.findings);
  assert.equal(new Set(findings.map((finding) => finding.id)).size, findings.length);

  const primaryByRef = new Map();
  const comparisonByRef = new Map();
  await Promise.all(
    scriptIndex.routes.flatMap((route) =>
      route.scripts.map(async (script) => {
        const [primary, comparison] = await Promise.all([
          readFile(new URL(`script-data/${script.file}`, exportRoot), "utf8").then(
            JSON.parse,
          ),
          readFile(
            new URL(`todokanai-data/${script.comparisonFile}`, exportRoot),
            "utf8",
          ).then(JSON.parse),
        ]);
        primary.lines.forEach((line) => primaryByRef.set(line.ref, line));
        comparison.lines.forEach((line) => comparisonByRef.set(line.ref, line));
      }),
    ),
  );

  findings.forEach((finding) => {
    const primary = primaryByRef.get(finding.ref);
    const comparison = comparisonByRef.get(finding.ref);
    assert.ok(primary, `missing source for ${finding.ref}`);
    assert.ok(comparison, `missing comparison for ${finding.ref}`);
    assert.equal(finding.japanese, primary.japanese);
    assert.equal(finding.todokanai, comparison.english);
    assert.ok(comparison.english.includes(finding.highlight));
    assert.ok(
      primary.japanese.replace(/\s+/g, "").includes(
        finding.evidenceJa.replace(/\s+/g, ""),
      ),
    );
  });
  assert.ok(findings.some((finding) => finding.ref === "wa2:ic:1001:59"));
  assert.ok(findings.some((finding) => finding.ref === "wa2:ic:1002:336"));
  assert.ok(!findings.some((finding) => finding.ref === "wa2:ic:1001:3"));
  assert.ok(!findings.some((finding) => finding.ref === "wa2:ic:1001:49"));
  assert.doesNotMatch(
    JSON.stringify({ errorIndex, errorConcordance, dossiers, payloads }),
    /MAO English|our translation|v1\.2|\/Users\/|\/private\/tmp\//i,
  );
  assert.match(sourceCss, /\.script-line-error/);
  assert.match(sourceCss, /\.todokanai-error-trigger/);
  assert.match(sourceCss, /\.todokanai-error-preview/);
  assert.match(sourceCss, /\.todokanai-error-note/);
  assert.doesNotMatch(sourceCss, /\.todokanai-audit-link/);
  assert.match(sourceCss, /\.audit-dossiers/);
  assert.match(sourceCss, /\.audit-example-finding/);
  assert.match(sourceCss, /\.audit-example-pattern_support/);
});

test("renders a stable, source-linked work-wide dossier index", async () => {
  const source = await readFile(
    new URL("../app/audit/page.tsx", import.meta.url),
    "utf8",
  );
  const hashOpener = await readFile(
    new URL("../app/audit/AuditHashOpener.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /dossiers\.groups\.map/);
  assert.match(source, /className="audit-group"/);
  assert.match(source, /<details[\s\S]*?open>/);
  assert.match(
    source,
    /<details\s+className="audit-dossier"\s+id=\{`dossier-\$\{dossier\.id\}`\}/,
  );
  assert.doesNotMatch(
    source,
    /<details\s+className="audit-dossier"[\s\S]{0,180}\bopen\b/,
  );
  assert.match(source, /id=\{`dossier-\$\{dossier\.id\}`\}/);
  assert.match(source, /example\.kind === "finding"/);
  assert.match(source, /"&errors=todokanai"/);
  assert.match(source, /compare=todokanai\$\{errorQuery\}#/);
  assert.match(source, /example\.japanese/);
  assert.match(source, /example\.todokanai/);
  assert.match(source, /errorIndex\.totalFindings/);
  assert.match(source, /Confirmed findings \/ affected lines/);
  assert.doesNotMatch(source, /errorIndex\.uniqueAffectedLineCount/);
  assert.match(source, /errorIndex\.withheldBorderlineCount/);
  assert.match(source, /errorIndex\.recordedCounterexampleCount/);
  assert.match(source, /errorIndex\.dossierCount/);
  assert.match(source, /example\.kind === "pattern_support"/);
  assert.match(source, /dossier\.supportExampleCount/);
  assert.match(source, /dossier\.diagnostic/);
  assert.match(source, /example\.section/);
  assert.match(source, /dossiers\.dossierEvidenceEntryCount/);
  assert.match(source, /dossiers\.uniqueDossierEvidenceLineCount/);
  assert.match(hashOpener, /targetId\.startsWith\("dossier-"\)/);
  assert.match(hashOpener, /target instanceof HTMLDetailsElement/);
  assert.match(hashOpener, /target\.open = true/);
  assert.match(hashOpener, /ancestor instanceof HTMLDetailsElement/);
  assert.match(hashOpener, /ancestor\.open = true/);
});

test("ships the full clean public script index", async () => {
  const indexPath = new URL("script-data/index.json", exportRoot);
  const index = JSON.parse(await readFile(indexPath, "utf8"));

  assert.equal(index.version, "1.2.6");
  assert.equal(index.totalLines, 77198);
  assert.equal(index.routes.length, 4);
  assert.equal(
    index.routes.reduce((sum, route) => sum + route.scripts.length, 0),
    254,
  );
  assert.equal(
    index.routes.reduce((sum, route) => sum + route.lineCount, 0),
    77198,
  );
  const special = index.routes.find((route) => route.id === "special");
  assert.equal(special.label, "Special Contents");
  assert.equal(special.lineCount, 6002);
  assert.equal(special.scripts.length, 49);

  const firstScript = index.routes[0].scripts[0];
  const payload = JSON.parse(
    await readFile(
      new URL(`script-data/${firstScript.file}`, exportRoot),
      "utf8",
    ),
  );
  assert.equal(payload.lines[0].ref, "wa2:ic:1001:1");
  assert.equal(payload.lines[0].japanese, "「あ…」");
  assert.equal(payload.lines[0].english, "“Ah…”");
  assert.equal(payload.lines[0].speakerEn, "Haruki");
  assert.equal(
    payload.lines[2].japaneseRuby,
    "[R空港^ここ]に着いたときから、\nいつ泣き出すかもしれなかった空は、\nちょっとだけ意地を張り、その涙を冷たい風で凍らせた。",
  );
  assert.doesNotMatch(JSON.stringify(payload), /todokanai|wiki_en|source.*file/i);

  const specialPayloads = await Promise.all(
    special.scripts.map(async (script) =>
      JSON.parse(
        await readFile(
          new URL(`script-data/${script.file}`, exportRoot),
          "utf8",
        ),
      ),
    ),
  );
  const specialPayload = specialPayloads[0];
  assert.equal(specialPayload.lines[0].ref, "wa2mas:kazusa_true:6001:1");
  assert.equal(specialPayload.lines[0].speakerEn, "Miyoko");
  assert.equal(
    specialPayload.lines[0].english,
    '“Yes, they should be coming through the gate any minute now.”',
  );
  const specialLines = specialPayloads.flatMap((payload) => payload.lines);
  assert.equal(specialLines.length, 6002);
  const specialText = specialLines.flatMap((line) => [
    line.ref,
    line.speakerJa,
    line.speakerEn,
    line.japanese,
    line.english,
  ]);
  assert.ok(
    specialText.every((value) => !/\\[kn]|\[W\d+\]/i.test(value)),
    "Special Contents text must not expose literal engine control codes",
  );
  assert.doesNotMatch(
    JSON.stringify(specialPayloads),
    /\/Users\/|\/private\/tmp\/|source_file/i,
  );

  const main = index.routes
    .filter((route) => route.id !== "special")
    .flatMap((route) => route.scripts);
  const mainPayloads = await Promise.all(
    main.map(async (script) =>
      JSON.parse(
        await readFile(
          new URL(`script-data/${script.file}`, exportRoot),
          "utf8",
        ),
      ),
    ),
  );
  const mainText = mainPayloads
    .flatMap((payload) => payload.lines)
    .flatMap((line) => [line.japanese, line.english]);
  assert.ok(
    mainText.every((value) => !/\[(?:[Ww]\d+\]|[FfSs]\d+)/.test(value)),
    "Main-game text must not expose literal engine control codes",
  );
});

test("ships a complete lazy-loaded corpus concordance", async () => {
  const index = JSON.parse(
    await readFile(new URL("script-data/index.json", exportRoot), "utf8"),
  );
  const primaryRaw = await readFile(
    new URL(`script-data/${index.concordance.file}`, exportRoot),
  );
  const comparisonRaw = await readFile(
    new URL(
      `todokanai-data/${index.comparison.concordanceFile}`,
      exportRoot,
    ),
  );
  const primary = JSON.parse(primaryRaw.toString("utf8"));
  const comparison = JSON.parse(comparisonRaw.toString("utf8"));

  assert.equal(index.concordance.schema, "wa2-public-concordance/1");
  assert.equal(index.concordance.totalLines, 77198);
  assert.equal(primary.schema, "wa2-public-concordance/1");
  assert.equal(primary.version, "1.2.6");
  assert.equal(primary.totalLines, 77198);
  assert.deepEqual(primary.fields, [
    "ref",
    "line",
    "speakerJa",
    "speakerEn",
    "japanese",
    "english",
    "japaneseRuby",
  ]);
  assert.equal(comparison.schema, "wa2-todokanai-concordance/1");
  assert.equal(comparison.totalLines, 77198);
  assert.deepEqual(comparison.fields, [
    "ref",
    "english",
    "status",
    "sourceId",
  ]);
  assert.ok(primaryRaw.byteLength < 17 * 1024 * 1024);
  assert.ok(comparisonRaw.byteLength < 9 * 1024 * 1024);
  assert.ok(gzipSync(primaryRaw).byteLength < 5.5 * 1024 * 1024);
  assert.ok(gzipSync(comparisonRaw).byteLength < 2.5 * 1024 * 1024);

  assert.deepEqual(
    primary.routes.map(({ id, label, lineCount, scripts }) => ({
      id,
      label,
      lineCount,
      scriptCount: scripts.length,
    })),
    index.routes.map(({ id, label, lineCount, scripts }) => ({
      id,
      label,
      lineCount,
      scriptCount: scripts.length,
    })),
  );

  const expectedPrimary = (
    await Promise.all(
      index.routes.flatMap((route) =>
        route.scripts.map(async (script) => {
          const payload = JSON.parse(
            await readFile(
              new URL(`script-data/${script.file}`, exportRoot),
              "utf8",
            ),
          );
          return payload.lines.map((line) => [
            line.ref,
            line.line,
            line.speakerJa,
            line.speakerEn,
            line.japanese,
            line.english,
            line.japaneseRuby ?? "",
          ]);
        }),
      ),
    )
  ).flat();
  const primaryRows = primary.routes.flatMap((route) =>
    route.scripts.flatMap((script) => script.lines),
  );
  const comparisonRows = comparison.routes.flatMap((route) =>
    route.scripts.flatMap((script) => script.lines),
  );

  assert.equal(primaryRows.length, 77198);
  assert.equal(comparisonRows.length, 77198);
  assert.deepEqual(primaryRows, expectedPrimary);
  assert.equal(new Set(primaryRows.map((row) => row[0])).size, 77198);
  assert.deepEqual(
    comparisonRows.map((row) => row[0]),
    primaryRows.map((row) => row[0]),
  );
  assert.equal(
    comparisonRows.filter(
      (row) => row[2] === "mapped_high" && row[1] !== "",
    ).length,
    76557,
  );

  const spiderThreadRefs = primaryRows
    .filter((row) => row[4].includes("蜘蛛の糸"))
    .map((row) => row[0]);
  assert.deepEqual(spiderThreadRefs, [
    "wa2:ic:1004:256",
    "wa2:cc:2303:130",
    "wa2:coda:3016:188",
  ]);

  const meddlingRows = primaryRows.filter(
    (row) => row[0].startsWith("wa2:") && row[4].includes("お節介"),
  );
  const meddlingRouteCounts = meddlingRows.reduce(
    (counts, row) => {
      const route = row[0].split(":")[1];
      counts[route] += 1;
      return counts;
    },
    { ic: 0, cc: 0, coda: 0 },
  );
  assert.equal(meddlingRows.length, 82);
  assert.equal(
    new Set(
      meddlingRows.map((row) => row[0].split(":").slice(1, 3).join(":")),
    ).size,
    47,
  );
  assert.deepEqual(meddlingRouteCounts, { ic: 9, cc: 52, coda: 21 });
  assert.equal(
    primaryRows.filter(
      (row) => row[0].startsWith("wa2mas:") && row[4].includes("お節介"),
    ).length,
    21,
  );
  assert.ok(
    primaryRows.some(
      (row) => row[0] === "wa2:ic:1001:1" && row[3] === "Haruki",
    ),
  );

  const primaryObstinanceRefs = primaryRows
    .filter((row) =>
      [row[0], row[2], row[3], row[4], row[5]].some((value) =>
        value.toLocaleLowerCase().includes("obstinance"),
      ),
    )
    .map((row) => row[0]);
  const comparisonObstinanceRefs = comparisonRows
    .filter((row) => row[1].toLocaleLowerCase().includes("obstinance"))
    .map((row) => row[0]);
  assert.deepEqual(primaryObstinanceRefs, []);
  assert.deepEqual(comparisonObstinanceRefs, [
    "wa2:ic:1001:3",
    "wa2:ic:1013:252",
    "wa2:coda:3909:84",
    "wa2mas:digital_novel_5000:5003:76",
  ]);
});

test("ships the optional aligned Todokanai TL comparison separately", async () => {
  const index = JSON.parse(
    await readFile(new URL("script-data/index.json", exportRoot), "utf8"),
  );
  const comparisonIndex = JSON.parse(
    await readFile(new URL("todokanai-data/index.json", exportRoot), "utf8"),
  );

  assert.equal(index.comparison.label, "Todokanai TL");
  assert.equal(index.comparison.totalLines, 77198);
  assert.equal(index.comparison.availableEnglishLines, 76557);
  assert.equal(
    index.comparison.sourceArchiveSha256,
    "671408427341185c1331731e4cdc0e3d793b9754beb8e4c1e77e89d3db21ddf3",
  );
  assert.equal(comparisonIndex.totalLines, 77198);
  assert.equal(comparisonIndex.availableEnglishLines, 76557);
  assert.equal(comparisonIndex.scriptCount, 254);
  assert.deepEqual(comparisonIndex.statusCounts, {
    mapped_high: 76557,
    unmapped: 18,
    supplement_external: 609,
    source_only: 14,
  });
  assert.deepEqual(comparisonIndex.sources, [
    {
      id: "todokanai_main",
      label: "Todokanai TL",
      sourceUrl: "https://github.com/TodokanaiTL/WA2EnglishPatch",
      archiveSha256:
        "671408427341185c1331731e4cdc0e3d793b9754beb8e4c1e77e89d3db21ddf3",
      note: "Main-game English distributed by Todokanai TL.",
    },
    {
      id: "todokanai_special_runtime",
      label: "Todokanai TL",
      sourceUrl:
        "https://drive.google.com/file/d/1AS1v0hceMsYYKEz8l1yTKhu8f3dKAhbu/view?usp=sharing",
      archiveSha256:
        "9b01dbb986801dc444b614ed18bbcac245a933b5e9231d1ead55a1cbd2db1ead",
      note: "Special Contents scenario English embedded in Todokanai TL's v1.0 archive.",
    },
    {
      id: "wa2analysis_todokanai_edited",
      label: "WA2Analysis / Todokanai TL",
      sourceUrl:
        "https://drive.google.com/file/d/1AS1v0hceMsYYKEz8l1yTKhu8f3dKAhbu/view?usp=sharing",
      archiveSha256:
        "9b01dbb986801dc444b614ed18bbcac245a933b5e9231d1ead55a1cbd2db1ead",
      note: "WA2Analysis translation with editing and translation quality control by Todokanai TL.",
    },
    {
      id: "wa2analysis",
      label: "WA2Analysis",
      sourceUrl: "https://wa2analysis.com/",
      archiveSha256:
        "9b01dbb986801dc444b614ed18bbcac245a933b5e9231d1ead55a1cbd2db1ead",
      note: "Unchanged WA2Analysis prose bundled with Todokanai TL's Special Contents release.",
    },
  ]);
  assert.deepEqual(index.comparison.sources, comparisonIndex.sources);

  const scriptPairs = index.routes.flatMap((route) =>
    route.scripts.map(async (script) => {
      const [primaryText, comparisonText] = await Promise.all([
        readFile(
          new URL(`script-data/${script.file}`, exportRoot),
          "utf8",
        ),
        readFile(
          new URL(
            `todokanai-data/${script.comparisonFile}`,
            exportRoot,
          ),
          "utf8",
        ),
      ]);
      assert.doesNotMatch(
        comparisonText,
        /\/Users\/|\/private\/tmp\/|source_file|manifest_path/i,
      );
      return {
        script,
        primary: JSON.parse(primaryText),
        comparison: JSON.parse(comparisonText),
      };
    }),
  );
  const payloads = await Promise.all(scriptPairs);
  const statusCounts = {
    mapped_high: 0,
    unmapped: 0,
    supplement_external: 0,
    source_only: 0,
  };
  const sourceOnlyRefs = [];
  const fixtures = new Map();
  const specialFixtureRefs = new Set([
    "wa2mas:kazusa_true:6001:1",
    "wa2mas:kazusa_normal_extra:4009:1253",
    "wa2mas:digital_novel_5000:5000:1",
    "wa2mas:digital_novel_5000:5001:22",
    "wa2mas:digital_novel_5000:5001:23",
    "wa2mas:digital_novel_5000:5002:34",
    "wa2mas:digital_novel_5000:5002:35",
    "wa2mas:digital_novel_5000:5002:36",
    "wa2mas:digital_novel_5000:5004:1",
    "wa2mas:digital_novel_5000:5004:2",
    "wa2mas:digital_novel_5000:5004:3",
    "wa2mas:digital_novel_5100:5104:14",
    "wa2mas:digital_novel_5200:5200:1",
    "wa2mas:short_story_7300:7300:60",
    "wa2mas:digital_novel_5200:5204:17",
    "wa2mas:digital_novel_5205:5205:2",
    "wa2mas:short_story_7300:7300:10",
    "wa2mas:short_story_7300:7300:11",
  ]);
  const specialFixtures = new Map();
  const specialSourceCounts = {
    todokanai_special_runtime: 0,
    wa2analysis_todokanai_edited: 0,
    wa2analysis: 0,
  };
  const specialStatusCounts = {
    mapped_high: 0,
    source_only: 0,
    unmapped: 0,
  };
  let lineCount = 0;

  for (const { script, primary, comparison } of payloads) {
    assert.equal(comparison.route, primary.route);
    assert.equal(comparison.scriptId, primary.scriptId);
    assert.equal(comparison.lineCount, primary.lineCount);
    assert.equal(comparison.lines.length, primary.lines.length);
    assert.equal(
      comparison.availableCount,
      comparison.lines.filter((line) => line.status === "mapped_high").length,
    );
    assert.equal(script.comparisonAvailableCount, comparison.availableCount);

    comparison.lines.forEach((line, lineIndex) => {
      assert.equal(line.ref, primary.lines[lineIndex].ref);
      assert.ok(line.status in statusCounts);
      statusCounts[line.status] += 1;
      lineCount += 1;
      if (line.ref.startsWith("wa2mas:")) {
        assert.deepEqual(Object.keys(line).sort(), [
          "english",
          "ref",
          "sourceId",
          "status",
        ]);
        assert.ok(line.status in specialStatusCounts);
        specialStatusCounts[line.status] += 1;
        assert.ok(line.sourceId in specialSourceCounts);
        specialSourceCounts[line.sourceId] += 1;
        if (specialFixtureRefs.has(line.ref)) {
          specialFixtures.set(line.ref, {
            englishSha256: sha256(line.english),
            sourceId: line.sourceId,
            status: line.status,
          });
        }
      } else {
        assert.deepEqual(Object.keys(line).sort(), [
          "english",
          "ref",
          "status",
        ]);
      }

      assert.doesNotMatch(primary.lines[lineIndex].japanese, /\\[nk]/);
      assert.doesNotMatch(primary.lines[lineIndex].english, /\\[nk]/);
      if (
        line.sourceId === "wa2analysis" ||
        line.sourceId === "wa2analysis_todokanai_edited"
      ) {
        assert.doesNotMatch(line.english, /<|\\[A-Za-z]|\[W\d+\]/);
        assert.ok(
          line.english
            .split(/\n+/)
            .every((paragraph) => !paragraph.includes(">") || paragraph.startsWith(">")),
        );
      } else {
        assert.doesNotMatch(line.english, /[<>]|\\[A-Za-z]|\[W\d+\]|~/);
      }
      assert.doesNotMatch(line.english, /(^|[^\n])\n([^\n]|$)/);
      if (line.status === "mapped_high") {
        assert.notEqual(line.english, "");
      } else {
        assert.equal(line.english, "");
      }
      if (
        line.status === "source_only" &&
        !line.ref.startsWith("wa2mas:")
      ) {
        sourceOnlyRefs.push(line.ref);
      }
      if (
        line.ref === "wa2:cc:2404:137" ||
        line.ref === "wa2:coda:3209:376" ||
        line.ref === "wa2:coda:3001:2" ||
        line.ref === "wa2:ic:1002:54" ||
        line.ref === "wa2:ic:1002:119" ||
        line.ref === "wa2:cc:2001:203" ||
        line.ref === "wa2:cc:2010:130" ||
        line.ref === "wa2:cc:2403:336" ||
        line.ref === "wa2:ic:1013:318"
      ) {
        fixtures.set(line.ref, line.english);
      }
    });
  }

  assert.equal(lineCount, 77198);
  assert.deepEqual(statusCounts, {
    mapped_high: 76557,
    unmapped: 18,
    supplement_external: 609,
    source_only: 14,
  });
  assert.deepEqual(specialSourceCounts, {
    todokanai_special_runtime: 4787,
    wa2analysis_todokanai_edited: 623,
    wa2analysis: 592,
  });
  assert.deepEqual(specialStatusCounts, {
    mapped_high: 6001,
    source_only: 0,
    unmapped: 1,
  });
  assert.equal(specialFixtures.size, specialFixtureRefs.size);
  assert.deepEqual(Object.fromEntries(specialFixtures), {
    "wa2mas:kazusa_true:6001:1": {
      englishSha256:
        "40c9dc712daca04380c4188b9d4bb7760fb304e128bde77581ddc85952187ecc",
      sourceId: "todokanai_special_runtime",
      status: "mapped_high",
    },
    "wa2mas:kazusa_normal_extra:4009:1253": {
      englishSha256:
        "88efff55580f588ea481e8da23fe9c68d05a91e79e35dbf8aba56d6535f5a0b5",
      sourceId: "todokanai_special_runtime",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5000:5000:1": {
      englishSha256:
        "1e02736c32dfc801a31c155f42364c5ba04bea9df34219ba7fb822f4b4290f9f",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5000:5001:22": {
      englishSha256:
        "f6473ebbbea120ad91340ae860310d7136b0cc4eb4cce252e66c080e9e221c72",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5000:5001:23": {
      englishSha256:
        "eb3fa27a91da49ca3d4923f65d270c97f614d4d5f0a7fcbbb017584e38f8a491",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5000:5002:34": {
      englishSha256:
        "ea2fd110ffc00d6815a4031940d16c44e78feb944b31584e5ebc51aa36e76c9c",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5000:5002:35": {
      englishSha256:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sourceId: "wa2analysis_todokanai_edited",
      status: "unmapped",
    },
    "wa2mas:digital_novel_5000:5002:36": {
      englishSha256:
        "0654156d1f48421e435e6a463becbe7d3dc6c4f6a52b9917657d736cab9b0b61",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5000:5004:1": {
      englishSha256:
        "3cb4c89d40a68d630f6cd7a1e81bae34ee5162e7c2c61b00469a6d87ae984c65",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5000:5004:2": {
      englishSha256:
        "e12af235dbcb73c0ce26d4ddee0400608b16a2fa869bf0c2fd17cef1ad83a6b5",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5000:5004:3": {
      englishSha256:
        "8b69051d131a61343f2b020175d10b20b57b829c71463cfb7b90cfa3beefbe7b",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5100:5104:14": {
      englishSha256:
        "f10449e2f348f9c6a73f518aa870852f58c5b05b1387a5c61cf9f80309ccf8bd",
      sourceId: "wa2analysis_todokanai_edited",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5200:5200:1": {
      englishSha256:
        "f6309503436140065b93fbf4cbf2e41413b1c00b67d4a94a71c0085c1a76b983",
      sourceId: "wa2analysis",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5200:5204:17": {
      englishSha256:
        "300beddfa04b58d8497fcdfd8049bdae782d2d34e46f9f9fb542c2eab60e0d0d",
      sourceId: "wa2analysis",
      status: "mapped_high",
    },
    "wa2mas:digital_novel_5205:5205:2": {
      englishSha256:
        "b5b84316783404cf9269b6d803598b19b0b5895a68a0e2bdd0b913a34c60dcad",
      sourceId: "wa2analysis",
      status: "mapped_high",
    },
    "wa2mas:short_story_7300:7300:10": {
      englishSha256:
        "d6e1d77dcda2afc5b9604c1be421f1b03d111608704f332ca527783a2ffa52ae",
      sourceId: "wa2analysis",
      status: "mapped_high",
    },
    "wa2mas:short_story_7300:7300:11": {
      englishSha256:
        "3b909282c9e1eeb54e39879970934fd2ee29ad8bb60c86d6ed2d7e4be37dfea5",
      sourceId: "wa2analysis",
      status: "mapped_high",
    },
    "wa2mas:short_story_7300:7300:60": {
      englishSha256:
        "878777ae9410f12621e26bf1a5505758c56394371d340ca5cb80bf8a3e60bc16",
      sourceId: "wa2analysis",
      status: "mapped_high",
    },
  });
  assert.deepEqual(sourceOnlyRefs.sort(), [
    "wa2:coda:5000:1",
    "wa2:coda:5000:10",
    "wa2:coda:5000:11",
    "wa2:coda:5000:12",
    "wa2:coda:5000:2",
    "wa2:coda:5000:3",
    "wa2:coda:5000:4",
    "wa2:coda:5000:5",
    "wa2:coda:5000:6",
    "wa2:coda:5000:7",
    "wa2:coda:5000:8",
    "wa2:coda:5000:9",
    "wa2:coda:5100:1",
    "wa2:coda:5100:2",
  ]);
  assert.equal(
    fixtures.get("wa2:cc:2404:137"),
    '"Stop joking. You\'re being too strong."',
  );
  assert.equal(
    fixtures.get("wa2:coda:3209:376"),
    '"Why didn\'t you say that sooner!?"\n\n"Why didn\'t you say that sooner!?"',
  );
  assert.equal(
    fixtures.get("wa2:coda:3001:2"),
    "Another day begins with my habitual hot morning shower, which, as always, washes my sleepiness away and gives my body its sensation and warmth back.",
  );
  assert.equal(
    fixtures.get("wa2:ic:1002:54"),
    "Simply put, it looked like she wanted to promote herself by going on stage during this year's festival…",
  );
  assert.equal(
    fixtures.get("wa2:ic:1002:119"),
    "Among other things, there are some cunningly placed signboards within the university, and in a sense, the enthusiasm surrounding the Miss Houjou High contest is greater than anything on the university campus. For us, anyway.",
  );
  assert.equal(
    fixtures.get("wa2:cc:2001:203"),
    "At any rate, by showing up three to four times a week,\n\nI gain the reward of earning enough money to pay my rent with some to spare and a workload that's more than enough to kill someone.",
  );
  assert.equal(
    fixtures.get("wa2:cc:2010:130"),
    '"He\'s always removed, looking at others from a distance as if he were a complete stranger, absolutely terrified of getting close… A cold-blooded animal…"',
  );
  assert.equal(
    fixtures.get("wa2:cc:2403:336"),
    '"Who says you have to wait obediently until the person turns around to look at you again? Is there any guarantee that it will even happen in the first place?"',
  );
  assert.equal(
    fixtures.get("wa2:ic:1013:318"),
    '"Its title is… Todokanai Koi."',
  );

  const firstComparison = payloads[0].comparison;
  assert.equal(firstComparison.lines[0].english, '"Ah…"');
  assert.equal(
    firstComparison.lines[1].english,
    "At last, it started falling.",
  );
  assert.equal(
    firstComparison.lines[2].english,
    "The sky had been on the brink of breaking down ever since we arrived at the airport, but in a moment's obstinance, it allowed the cold wind to freeze its tears into ice.",
  );
});

test("includes GitHub Pages metadata assets", async () => {
  await Promise.all([
    stat(new URL(".nojekyll", exportRoot)),
    stat(new URL("favicon.png", exportRoot)),
    stat(new URL("wa2-winter-night.png", exportRoot)),
    stat(new URL("wa2-winter-night.webp", exportRoot)),
    stat(new URL("wa2-winter-night-960.webp", exportRoot)),
  ]);
  const [robots, sitemap] = await Promise.all([
    readFile(new URL("robots.txt", exportRoot), "utf8"),
    readFile(new URL("sitemap.xml", exportRoot), "utf8"),
  ]);
  assert.match(robots, /Allow: \//);
  assert.match(
    robots,
    /Sitemap: https:\/\/mao-tls\.github\.io\/white-album-2\/sitemap\.xml/,
  );
  assert.match(
    sitemap,
    /https:\/\/mao-tls\.github\.io\/white-album-2\/script\//,
  );
});

test("retains the complete Todokanai TL license notice", async () => {
  const notice = await readFile(
    new URL("../THIRD_PARTY_NOTICES.md", import.meta.url),
    "utf8",
  );
  assert.match(notice, /Copyright \(c\) 2017-2022, Todokanai TL/);
  assert.match(notice, /Redistributions of source code must retain/);
  assert.match(notice, /Redistributions in binary form must reproduce/);
  assert.match(notice, /Neither the name of the copyright holder/);
  assert.match(notice, /THIS SOFTWARE IS PROVIDED.*"AS IS"/s);
});
