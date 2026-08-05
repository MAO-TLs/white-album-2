#!/usr/bin/env python3
"""Build the public, source-only Todokanai editorial error layer."""

from __future__ import annotations

import hashlib
import json
import os
import re
from collections import defaultdict
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = (
    Path(os.environ["WA2_TRANSLATION_WORKSPACE"])
    if "WA2_TRANSLATION_WORKSPACE" in os.environ
    else Path(__file__).resolve().parents[5]
)
EDITORIAL_ROOT = (
    WORKSPACE_ROOT
    / "outputs/wa2-retranslation/runs/todokanai_error_editorial_v1"
)
LEDGER_PATH = EDITORIAL_ROOT / "ledger.json"
REVIEW_STATE_PATH = EDITORIAL_ROOT / "review_state.json"
MANIFEST_PATH = EDITORIAL_ROOT / "review_packet_manifest.json"
PARITY_DECISION_PATH = (
    EDITORIAL_ROOT / "mao_parity_audit_v1/review_decisions.json"
)
DOSSIER_PATH = (
    Path(os.environ["WA2_TODOKANAI_DOSSIER_PATH"])
    if "WA2_TODOKANAI_DOSSIER_PATH" in os.environ
    else EDITORIAL_ROOT / "dossiers.json"
)
PACKET_REVIEW_ROOT = EDITORIAL_ROOT / "packet_reviews"
PACKET_SOURCE_ROOT = EDITORIAL_ROOT / "review_packets"
SCRIPT_DATA_ROOT = SITE_ROOT / "public/script-data"
TODOKANAI_DATA_ROOT = SITE_ROOT / "public/todokanai-data"
OUTPUT_ROOT = (
    Path(os.environ["WA2_TODOKANAI_OUTPUT_ROOT"])
    if "WA2_TODOKANAI_OUTPUT_ROOT" in os.environ
    else SITE_ROOT / "public/todokanai-errors"
)
STYLE_OPEN_RE = re.compile(r"\[[FfSs]\d+")


def read_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: dict) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def compact_whitespace(value: str) -> str:
    return re.sub(r"\s+", "", value)


def public_source_text(value: str) -> str:
    """Project evidence through the same engine-control boundary as the browser."""

    value = re.sub(r"\[[Ww]\d+\]", "", value)
    output: list[str] = []
    cursor = 0
    while cursor < len(value):
        opening = STYLE_OPEN_RE.match(value, cursor)
        if opening is None:
            output.append(value[cursor])
            cursor += 1
            continue
        depth = 1
        end = opening.end()
        while end < len(value) and depth:
            if value[end] == "[":
                depth += 1
            elif value[end] == "]":
                depth -= 1
            end += 1
        if depth:
            raise SystemExit(f"unbalanced source style wrapper: {value!r}")
        output.append(public_source_text(value[opening.end() : end - 1]))
        cursor = end
    return "".join(output)


def finding_id(ref: str, ordinal: int, category: str) -> str:
    normalized_ref = re.sub(r"[^a-zA-Z0-9]+", "-", ref).strip("-").lower()
    normalized_category = re.sub(r"[^a-zA-Z0-9]+", "-", category).strip("-").lower()
    return f"{normalized_ref}-{ordinal:02d}-{normalized_category}"


def main() -> None:
    script_index = read_json(SCRIPT_DATA_ROOT / "index.json")
    ledger = read_json(LEDGER_PATH)
    review_state = read_json(REVIEW_STATE_PATH)
    packet_manifest = read_json(MANIFEST_PATH)

    scripts: dict[str, dict] = {}
    line_by_ref: dict[str, dict] = {}
    comparison_by_ref: dict[str, dict] = {}
    route_order: list[str] = []
    route_labels: dict[str, str] = {}

    for route in script_index["routes"]:
        route_id = route["id"]
        route_order.append(route_id)
        route_labels[route_id] = route["label"]
        for summary in route["scripts"]:
            script_id = summary["id"]
            key = f"{route_id}:{script_id}"
            primary = read_json(SCRIPT_DATA_ROOT / summary["file"])
            comparison = read_json(
                TODOKANAI_DATA_ROOT
                / summary.get("comparisonFile", summary["file"])
            )
            if primary["lineCount"] != comparison["lineCount"]:
                raise SystemExit(f"line-count mismatch for {key}")
            if len(primary["lines"]) != len(comparison["lines"]):
                raise SystemExit(f"payload-length mismatch for {key}")
            scripts[key] = {
                "route": route_id,
                "routeLabel": route["label"],
                "scriptId": script_id,
                "file": summary["file"],
                "lineCount": summary["lineCount"],
            }
            for source_line, comparison_line in zip(
                primary["lines"], comparison["lines"], strict=True
            ):
                ref = source_line["ref"]
                if comparison_line["ref"] != ref:
                    raise SystemExit(f"comparison alignment mismatch at {ref}")
                if ref in line_by_ref:
                    raise SystemExit(f"duplicate public ref: {ref}")
                line_by_ref[ref] = {**source_line, "scriptKey": key}
                comparison_by_ref[ref] = comparison_line

    # Packet reviews are the principal ledger.  The small historical control
    # ledger predates packet-0001 and overlaps one of its findings; retain its
    # unique controls without publishing the same line twice.
    packet_finding_refs: set[str] = set()
    for review_path in sorted(PACKET_REVIEW_ROOT.glob("packet-*.json")):
        review = read_json(review_path)
        for finding in review.get("findings", []):
            ref = finding["ref"]
            if ref in packet_finding_refs:
                raise SystemExit(f"duplicate packet finding ref: {ref}")
            packet_finding_refs.add(ref)

    authored_findings: list[dict] = []
    for finding in ledger["findings"]:
        if finding.get("status") != "confirmed_public":
            continue
        if finding["ref"] in packet_finding_refs:
            continue
        authored_findings.append(
            {
                "id": finding["id"],
                "ref": finding["ref"],
                "category": finding["category"],
                "severity": finding["severity"],
                "highlight": finding["highlight"],
                "evidenceJa": finding["evidence_ja"],
                "explanation": finding["explanation"],
                "contextRefs": finding.get("context_refs", []),
            }
        )

    completed_packet_ids = set(review_state["completed_packet_ids"])
    for review_path in sorted(PACKET_REVIEW_ROOT.glob("packet-*.json")):
        review = read_json(review_path)
        packet_id = review["packet_id"]
        if packet_id not in completed_packet_ids:
            raise SystemExit(f"review exists outside completed state: {packet_id}")
        if review["status"] != "source_critical_reconciled":
            raise SystemExit(f"review is not publication-ready: {packet_id}")
        for ordinal, finding in enumerate(review["findings"], start=1):
            authored_findings.append(
                {
                    "id": finding_id(
                        finding["ref"], ordinal, finding["category"]
                    ),
                    "ref": finding["ref"],
                    "category": finding["category"],
                    "severity": finding["severity"],
                    "highlight": finding["highlight"],
                    "evidenceJa": finding["evidence_ja"],
                    "explanation": finding["explanation"],
                    "contextRefs": finding.get("context_refs", []),
                }
            )

    parity_decisions = read_json(PARITY_DECISION_PATH)
    if parity_decisions.get("status") != "complete":
        raise SystemExit("MAO parity review is not complete")
    if parity_decisions.get("reviewedFindingCount") != 3169:
        raise SystemExit("MAO parity review did not inspect all 3,169 findings")
    if parity_decisions.get("totalFindingCount") != 3169:
        raise SystemExit("MAO parity review total finding count has drifted")
    audit_decisions = parity_decisions.get("auditDecisions", [])
    if len(audit_decisions) != 13:
        raise SystemExit("expected exactly 13 MAO parity audit decisions")

    finding_positions: dict[str, list[int]] = defaultdict(list)
    for position, finding in enumerate(authored_findings):
        finding_positions[finding["ref"]].append(position)
    for decision in audit_decisions:
        positions = finding_positions.get(decision["ref"], [])
        if len(positions) != 1:
            raise SystemExit(
                f"parity decision must match exactly one finding: {decision['ref']}"
            )

    withdrawn_refs = {
        decision["ref"]
        for decision in audit_decisions
        if decision["decision"] == "withdraw"
    }
    authored_findings = [
        finding for finding in authored_findings if finding["ref"] not in withdrawn_refs
    ]
    findings_by_ref_for_revision = {
        finding["ref"]: finding for finding in authored_findings
    }
    for decision in audit_decisions:
        if decision["decision"] == "withdraw":
            continue
        if decision["decision"] != "narrow":
            raise SystemExit(
                f"unknown MAO parity decision: {decision['decision']!r}"
            )
        finding = findings_by_ref_for_revision[decision["ref"]]
        finding.update(
            {
                "category": decision["newCategory"],
                "severity": decision["newSeverity"],
                "highlight": decision["newHighlight"],
                "explanation": decision["newExplanation"],
            }
        )

    ids: set[str] = set()
    findings_by_script: dict[str, list[dict]] = defaultdict(list)
    findings_by_ref: dict[str, list[dict]] = defaultdict(list)
    for finding in authored_findings:
        finding_id_value = finding["id"]
        if finding_id_value in ids:
            raise SystemExit(f"duplicate finding id: {finding_id_value}")
        ids.add(finding_id_value)

        ref = finding["ref"]
        if ref not in line_by_ref or ref not in comparison_by_ref:
            raise SystemExit(f"finding ref is absent from public data: {ref}")
        source_line = line_by_ref[ref]
        comparison_line = comparison_by_ref[ref]
        comparison_text = comparison_line.get("english", "")
        highlight = finding["highlight"]
        evidence_ja = public_source_text(finding["evidenceJa"])
        if not highlight or highlight not in comparison_text:
            raise SystemExit(
                f"highlight is not an exact public Todokanai span at {ref}: "
                f"{highlight!r}"
            )
        if (
            not evidence_ja
            or compact_whitespace(evidence_ja)
            not in compact_whitespace(source_line["japanese"])
        ):
            raise SystemExit(
                f"Japanese evidence is not an exact public source span at {ref}: "
                f"{evidence_ja!r}"
            )
        if comparison_line.get("status") in {"unmapped", "source_only"}:
            raise SystemExit(f"finding points to unavailable comparison text: {ref}")

        public_finding = {
            **finding,
            "evidenceJa": evidence_ja,
            "japanese": source_line["japanese"],
            "todokanai": comparison_text,
            "sourceSha256": sha256_text(source_line["japanese"]),
            "todokanaiSha256": sha256_text(comparison_text),
        }
        script_key = source_line["scriptKey"]
        findings_by_script[script_key].append(public_finding)
        findings_by_ref[ref].append(public_finding)

    manifest_packets = packet_manifest["packets"]
    packet_by_id = {packet["packet_id"]: packet for packet in manifest_packets}
    if set(review_state["completed_packet_ids"]) - set(packet_by_id):
        raise SystemExit("review state names a packet absent from the manifest")
    audited_line_count = sum(
        packet_by_id[packet_id]["line_count"]
        for packet_id in review_state["completed_packet_ids"]
    )
    if audited_line_count > script_index["totalLines"]:
        raise SystemExit("audited line count exceeds the public corpus")

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for stale in OUTPUT_ROOT.glob("*.json"):
        stale.unlink()

    route_summaries: list[dict] = []
    concordance_findings: list[dict] = []
    for route_id in route_order:
        route_scripts: list[dict] = []
        for key, script in scripts.items():
            if script["route"] != route_id:
                continue
            findings = sorted(
                findings_by_script.get(key, []),
                key=lambda finding: (
                    line_by_ref[finding["ref"]]["line"],
                    finding["id"],
                ),
            )
            payload = {
                "schema": "wa2-todokanai-editorial-errors/1",
                "route": route_id,
                "routeLabel": script["routeLabel"],
                "scriptId": script["scriptId"],
                "lineCount": script["lineCount"],
                "findingCount": len(findings),
                "findings": findings,
            }
            write_json(OUTPUT_ROOT / script["file"], payload)
            route_scripts.append(
                {
                    "id": script["scriptId"],
                    "file": script["file"],
                    "lineCount": script["lineCount"],
                    "findingCount": len(findings),
                }
            )
            concordance_findings.extend(findings)
        route_summaries.append(
            {
                "id": route_id,
                "label": route_labels[route_id],
                "findingCount": sum(
                    script["findingCount"] for script in route_scripts
                ),
                "scripts": route_scripts,
            }
        )

    concordance_findings.sort(
        key=lambda finding: (
            route_order.index(scripts[line_by_ref[finding["ref"]]["scriptKey"]]["route"]),
            list(scripts).index(line_by_ref[finding["ref"]]["scriptKey"]),
            line_by_ref[finding["ref"]]["line"],
            finding["id"],
        )
    )
    write_json(
        OUTPUT_ROOT / "concordance.json",
        {
            "schema": "wa2-todokanai-editorial-error-concordance/1",
            "totalFindings": len(concordance_findings),
            "findings": concordance_findings,
        },
    )

    dossier_groups: list[dict] = []
    dossier_memberships: dict[str, list[str]] = defaultdict(list)
    if DOSSIER_PATH.exists():
        dossier_source = read_json(DOSSIER_PATH)
        if dossier_source.get("schema") != "wa2-todokanai-editorial-dossier-source/1":
            raise SystemExit("unexpected Todokanai dossier source schema")
        group_ids: set[str] = set()
        dossier_ids: set[str] = set()
        for group in dossier_source.get("groups", []):
            group_id = group.get("id", "")
            if not group_id or group_id in group_ids:
                raise SystemExit(f"invalid or duplicate dossier group id: {group_id!r}")
            if not group.get("label", "").strip():
                raise SystemExit(f"dossier group has no label: {group_id}")
            group_ids.add(group_id)
            public_dossiers: list[dict] = []
            for dossier in group.get("dossiers", []):
                dossier_id = dossier["id"]
                if not dossier_id or dossier_id in dossier_ids:
                    raise SystemExit(f"invalid or duplicate dossier id: {dossier_id!r}")
                for required_field in (
                    "title",
                    "claim",
                    "source_pattern",
                    "todokanai_effect",
                    "limits",
                ):
                    if not dossier.get(required_field, "").strip():
                        raise SystemExit(
                            f"dossier {dossier_id} has no {required_field}"
                        )
                dossier_ids.add(dossier_id)
                public_examples: list[dict] = []
                example_keys: set[tuple[str, str]] = set()
                for example in dossier.get("examples", []):
                    ref = example["ref"]
                    kind = example.get("kind")
                    if kind not in {"finding", "pattern_support", "counterexample"}:
                        raise SystemExit(
                            f"dossier example has invalid kind at {ref}: {kind!r}"
                        )
                    example_key = (kind, ref)
                    if example_key in example_keys:
                        raise SystemExit(
                            f"duplicate dossier example in {dossier_id}: {kind} {ref}"
                        )
                    example_keys.add(example_key)
                    if not example.get("note", "").strip():
                        raise SystemExit(
                            f"dossier example has no note in {dossier_id}: {ref}"
                        )
                    if ref not in line_by_ref or ref not in comparison_by_ref:
                        raise SystemExit(f"dossier example ref is absent: {ref}")
                    if kind == "finding" and ref not in findings_by_ref:
                        raise SystemExit(
                            f"dossier finding example is not publicly adjudicated: {ref}"
                        )
                    if kind == "finding":
                        dossier_memberships[ref].append(dossier_id)
                    source_line = line_by_ref[ref]
                    script = scripts[source_line["scriptKey"]]
                    public_examples.append(
                        {
                            "ref": ref,
                            "kind": kind,
                            "note": example["note"],
                            "section": example.get("section", ""),
                            "route": script["route"],
                            "routeLabel": script["routeLabel"],
                            "scriptId": script["scriptId"],
                            "line": source_line["line"],
                            "japanese": source_line["japanese"],
                            "todokanai": comparison_by_ref[ref].get("english", ""),
                            "findingIds": [
                                finding["id"]
                                for finding in findings_by_ref.get(ref, [])
                            ],
                        }
                    )
                if not public_examples:
                    raise SystemExit(f"dossier has no evidence: {dossier_id}")
                public_dossiers.append(
                    {
                        "id": dossier_id,
                        "title": dossier["title"],
                        "claim": dossier["claim"],
                        "sourcePattern": dossier["source_pattern"],
                        "todokanaiEffect": dossier["todokanai_effect"],
                        "limits": dossier["limits"],
                        "diagnostic": dossier.get("diagnostic", ""),
                        "examples": public_examples,
                        "findingExampleCount": sum(
                            example["kind"] == "finding"
                            for example in public_examples
                        ),
                        "supportExampleCount": sum(
                            example["kind"] == "pattern_support"
                            for example in public_examples
                        ),
                        "counterexampleCount": sum(
                            example["kind"] == "counterexample"
                            for example in public_examples
                        ),
                    }
                )
            if public_dossiers:
                dossier_groups.append(
                    {
                        "id": group["id"],
                        "label": group["label"],
                        "dossiers": public_dossiers,
                    }
                )

    dossier_count = sum(len(group["dossiers"]) for group in dossier_groups)
    dossier_examples = [
        example
        for group in dossier_groups
        for dossier in group["dossiers"]
        for example in dossier["examples"]
    ]
    dossier_evidence_entry_count = len(dossier_examples)
    unique_dossier_evidence_line_count = len(
        {example["ref"] for example in dossier_examples}
    )
    dossier_finding_example_count = sum(
        example["kind"] == "finding" for example in dossier_examples
    )
    dossier_support_example_count = sum(
        example["kind"] == "pattern_support" for example in dossier_examples
    )
    dossier_counterexample_count = sum(
        example["kind"] == "counterexample" for example in dossier_examples
    )
    dossier_labels = {
        dossier["id"]: dossier["title"]
        for group in dossier_groups
        for dossier in group["dossiers"]
    }
    write_json(
        OUTPUT_ROOT / "dossiers.json",
        {
            "schema": "wa2-todokanai-editorial-dossiers/1",
            "totalLines": script_index["totalLines"],
            "auditedLineCount": audited_line_count,
            "reviewComplete": len(completed_packet_ids) == len(manifest_packets),
            "totalFindings": len(concordance_findings),
            "uniqueAffectedLineCount": len(findings_by_ref),
            "withheldBorderlineCount": review_state["editorial_holds"],
            "recordedCounterexampleCount": review_state[
                "recorded_counterexamples"
            ],
            "dossierCount": dossier_count,
            "dossierEvidenceEntryCount": dossier_evidence_entry_count,
            "uniqueDossierEvidenceLineCount": unique_dossier_evidence_line_count,
            "dossierFindingExampleCount": dossier_finding_example_count,
            "dossierSupportExampleCount": dossier_support_example_count,
            "dossierCounterexampleCount": dossier_counterexample_count,
            "groups": dossier_groups,
        },
    )

    review_complete = len(completed_packet_ids) == len(manifest_packets)
    write_json(
        OUTPUT_ROOT / "index.json",
        {
            "schema": "wa2-todokanai-editorial-error-index/1",
            "sourceSchema": ledger["schema"],
            "totalLines": script_index["totalLines"],
            "auditedLineCount": audited_line_count,
            "completedPacketCount": len(completed_packet_ids),
            "totalPacketCount": len(manifest_packets),
            "reviewComplete": review_complete,
            "totalFindings": len(concordance_findings),
            "uniqueAffectedLineCount": len(findings_by_ref),
            "withheldBorderlineCount": review_state["editorial_holds"],
            "recordedCounterexampleCount": review_state[
                "recorded_counterexamples"
            ],
            "dossierCount": dossier_count,
            "dossierEvidenceEntryCount": dossier_evidence_entry_count,
            "uniqueDossierEvidenceLineCount": unique_dossier_evidence_line_count,
            "dossierMemberships": dict(sorted(dossier_memberships.items())),
            "dossierLabels": dict(sorted(dossier_labels.items())),
            "concordanceFile": "concordance.json",
            "dossierFile": "dossiers.json",
            "routes": route_summaries,
        },
    )

    expected_public_findings = (
        review_state["confirmed_public_findings"] - len(withdrawn_refs)
    )
    if len(concordance_findings) != expected_public_findings:
        raise SystemExit(
            "public finding count disagrees with review state: "
            f"built={len(concordance_findings)} "
            f"post_parity_expected={expected_public_findings}"
        )

    print(
        f"wrote {len(concordance_findings)} adjudicated findings across "
        f"{len(scripts)} scripts; reviewed {audited_line_count:,} of "
        f"{script_index['totalLines']:,} lines"
    )


if __name__ == "__main__":
    main()
