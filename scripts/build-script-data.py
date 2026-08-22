#!/usr/bin/env python3
"""Build the public script browser and optional comparison datasets."""

from __future__ import annotations

import json
import hashlib
import os
import re
from collections import Counter, OrderedDict
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = (
    Path(os.environ["WA2_TRANSLATION_WORKSPACE"])
    if "WA2_TRANSLATION_WORKSPACE" in os.environ
    else Path(__file__).resolve().parents[5]
)
SOURCE_PATH = WORKSPACE_ROOT / "outputs/wa2-retranslation/data/corpus.jsonl"
FINAL_PATH = (
    WORKSPACE_ROOT
    / "outputs/wa2-retranslation/runs/literary_reauthor_v1_3/v1_3_3"
    / "materialized_editorial/corpora/main.jsonl"
)
FINAL_SHA256 = "bef853edec959fa912a50362d0e164f20e8253ee91eb58614900c66f6da45088"
SPEAKER_PATH = (
    WORKSPACE_ROOT
    / "outputs/wa2-retranslation/runs/literary_reauthor_v1_2/v1_2_4"
    / "main_patch/speaker_labels/review.json"
)
MAS_SOURCE_PATH = (
    WORKSPACE_ROOT
    / "outputs/wa2-retranslation/runs/mas_v1/cleanroom/corpus.jsonl"
)
MAS_FINAL_PATH = (
    WORKSPACE_ROOT
    / "outputs/wa2-retranslation/runs/literary_reauthor_v1_3/v1_3_3"
    / "materialized_editorial/corpora/special.jsonl"
)
MAS_FINAL_SHA256 = "a65651865b485f6f0d0f60a7f4f93c1b7fe5ffb44f3cd46149c6aad9e98dd672"
MAS_SPEAKER_PATH = (
    WORKSPACE_ROOT
    / "outputs/wa2-retranslation/runs/mas_v1/inputs/speaker_labels.json"
)
MAS_COMPARISON_PATH = (
    WORKSPACE_ROOT
    / "outputs/wa2-retranslation/runs/mas_v1/comparison"
    / "combined_special_comparison.jsonl"
)
TODOKANAI_ROOT = WORKSPACE_ROOT / "outputs/wa2-retranslation"
TODOKANAI_BENCHMARK_ROOT = TODOKANAI_ROOT / "benchmarks/todokanai"
TODOKANAI_ALIGNMENT_PATH = TODOKANAI_BENCHMARK_ROOT / "alignments.jsonl"
TODOKANAI_SLOT_PATH = TODOKANAI_BENCHMARK_ROOT / "slots.jsonl"
TODOKANAI_ROUTING_ROOT = (
    TODOKANAI_ROOT
    / "runs/production_v1/todokanai_routing_overlay_v1"
)
TODOKANAI_ROUTING_PATH = TODOKANAI_ROUTING_ROOT / "overlay.jsonl"
TODOKANAI_CONTINUATION_ROOT = (
    TODOKANAI_ROOT
    / "runs/production_v1/todokanai_continuation_overlay_v1"
)
TODOKANAI_CONTINUATION_PATH = TODOKANAI_CONTINUATION_ROOT / "overlay.jsonl"
OUTPUT_ROOT = SITE_ROOT / "public/script-data"
TODOKANAI_OUTPUT_ROOT = SITE_ROOT / "public/todokanai-data"

TODOKANAI_SOURCE_URL = "https://github.com/TodokanaiTL/WA2EnglishPatch"
TODOKANAI_SPECIAL_SOURCE_URL = (
    "https://drive.google.com/file/d/"
    "1AS1v0hceMsYYKEz8l1yTKhu8f3dKAhbu/view?usp=sharing"
)
WA2ANALYSIS_SOURCE_URL = "https://wa2analysis.com/"
PUBLIC_VERSION = "1.3.3"
PUBLIC_GENERATED_AT = "2026-08-23T00:00:00+00:00"
TODOKANAI_ARCHIVE_SHA256 = (
    "671408427341185c1331731e4cdc0e3d793b9754beb8e4c1e77e89d3db21ddf3"
)
TODOKANAI_SPECIAL_ARCHIVE_SHA256 = (
    "9b01dbb986801dc444b614ed18bbcac245a933b5e9231d1ead55a1cbd2db1ead"
)
TODOKANAI_ALIGNMENT_SHA256 = (
    "005fbc1700e51cdb69075fdc13afd72d533b112e5de6cdecc52d1ed5fde6d951"
)
TODOKANAI_SLOT_SHA256 = (
    "f4f89ff9e07fd5dca7a34357c78a71a23844c334e03f15374d0db31bfd0cd6e8"
)
TODOKANAI_ROUTING_SHA256 = (
    "afab4ecffabc30d187b2a6bc966665b8866aa1168bdd8130d9bb07532104abfa"
)
TODOKANAI_CONTINUATION_SHA256 = (
    "c0e9a61ac1d1457eb21985706383ccd9ae4fd386458a30eafd0ab8a046cc9181"
)
MAS_COMPARISON_SHA256 = (
    "777eb46682569313e3e6831cbd49c61fe2e2156b3798ab627901ee0415353bbf"
)
TODOKANAI_ALIGNMENT_STATUSES = (
    "mapped_high",
    "unmapped",
    "supplement_external",
)
TODOKANAI_PUBLIC_STATUSES = (
    "mapped_high",
    "unmapped",
    "supplement_external",
    "source_only",
)
JAPANESE_TEXT_RE = re.compile(r"[\u3041-\u3096\u30a1-\u30fa\u3400-\u9fff]")
LATIN_TEXT_RE = re.compile(r"[A-Za-z]")
CLOSING_QUOTE_ONLY_RE = re.compile(r"""^["'’”]+$""")
RUBY_RE = re.compile(r"\[R([^\]^]+)\^([^\]]*)\]")
STYLE_OPEN_RE = re.compile(r"\[[FfSs]\d+")

ROUTE_LABELS = OrderedDict(
    (
        ("intro", "Introductory Chapter"),
        ("closing", "Closing Chapter"),
        ("coda", "Coda"),
        ("special", "Special Contents"),
    )
)

COMPARISON_SOURCES = (
    {
        "id": "todokanai_main",
        "label": "Todokanai TL",
        "sourceUrl": TODOKANAI_SOURCE_URL,
        "archiveSha256": TODOKANAI_ARCHIVE_SHA256,
        "note": "Main-game English distributed by Todokanai TL.",
    },
    {
        "id": "todokanai_special_runtime",
        "label": "Todokanai TL",
        "sourceUrl": TODOKANAI_SPECIAL_SOURCE_URL,
        "archiveSha256": TODOKANAI_SPECIAL_ARCHIVE_SHA256,
        "note": "Special Contents scenario English embedded in Todokanai TL's v1.0 archive.",
    },
    {
        "id": "wa2analysis_todokanai_edited",
        "label": "WA2Analysis / Todokanai TL",
        "sourceUrl": TODOKANAI_SPECIAL_SOURCE_URL,
        "archiveSha256": TODOKANAI_SPECIAL_ARCHIVE_SHA256,
        "note": "WA2Analysis translation with editing and translation quality control by Todokanai TL.",
    },
    {
        "id": "wa2analysis",
        "label": "WA2Analysis",
        "sourceUrl": WA2ANALYSIS_SOURCE_URL,
        "archiveSha256": TODOKANAI_SPECIAL_ARCHIVE_SHA256,
        "note": "Unchanged WA2Analysis prose bundled with Todokanai TL's Special Contents release.",
    },
)
COMPARISON_SOURCE_BY_ID = {
    source["id"]: source
    for source in COMPARISON_SOURCES
}
MAS_COMPARISON_SOURCE_COUNTS = Counter(
    {
        "todokanai_special_runtime": 4787,
        "wa2analysis_todokanai_edited": 623,
        "wa2analysis": 592,
    }
)
MAS_COMPARISON_STATUS_COUNTS = Counter(
    {
        "mapped_high": 6001,
        "unmapped": 1,
    }
)


def read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def strip_style_wrappers(value: str) -> str:
    """Remove balanced F/S engine wrappers without consuming nested ruby tags."""

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
            raise ValueError(f"unbalanced script style wrapper: {value!r}")
        output.append(strip_style_wrappers(value[opening.end() : end - 1]))
        cursor = end
    return "".join(output)


def web_text(value: str) -> str:
    value = re.sub(r"\[[Ww]\d+\]", "", value)
    value = strip_style_wrappers(value)
    value = value.replace("<br />", "\n").replace("<br/>", "\n").replace("<br>", "\n")
    value = value.replace(r"\k\n", "\n\n")
    value = value.replace(r"\k", "\n\n")
    value = value.replace(r"\n", "\n")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def web_mas_text(value: str) -> str:
    """Remove Special Contents engine waits before ordinary web projection."""

    return web_text(value)


def web_ruby_text(raw: str, plain: str, *, mas: bool = False) -> str:
    """Keep source ruby markup while proving its base-text projection."""

    rendered = web_mas_text(raw) if mas else web_text(raw)
    if "[R" not in rendered:
        return ""
    projected = RUBY_RE.sub(lambda match: match.group(1), rendered)
    if "[R" in projected or projected != plain:
        raise ValueError(
            "ruby projection differs from plain Japanese: "
            f"raw={rendered!r} projected={projected!r} plain={plain!r}"
        )
    return rendered


def web_todokanai_text(value: str) -> str:
    """Remove engine projection while preserving wording and real paragraphs."""

    value = re.sub(r"<[wW]\d+>", "", value)
    style_wrappers = re.findall(r"<[FfSs]\d+\s*", value)
    if style_wrappers:
        value = re.sub(r"<[FfSs]\d+\s*", "", value)
        if value.count(">") != len(style_wrappers):
            raise ValueError(f"unbalanced Todokanai style wrappers: {value!r}")
        value = value.replace(">", "")
    value = value.replace("~", ",")
    value = value.replace("\r", "")
    value = value.replace("\n", " ")
    value = value.replace(r"\k\n", "\n\n")
    value = value.replace(r"\k", "\n\n")
    value = value.replace(r"\n\n", "\n\n")
    value = value.replace(r"\n", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n{2,} *", "\n\n", value)
    value = value.strip()
    if re.search(r"[<>]|\\[A-Za-z]|~", value):
        raise ValueError(f"residual Todokanai engine projection: {value!r}")
    return value


def web_prose_comparison_text(value: str) -> str:
    """Project aligned prose units as readable paragraphs without engine syntax."""

    value = value.replace("\r\n", "\n").replace("\r", "\n")
    paragraphs = []
    for paragraph in re.split(r"\n+", value):
        paragraph = re.sub(r"[ \t]+", " ", paragraph).strip()
        if not paragraph:
            continue
        paragraphs.append(paragraph)
    value = "\n\n".join(paragraphs)
    if re.search(r"<|\\[A-Za-z]|\[W\d+\]", value):
        raise ValueError(f"residual prose comparison engine projection: {value!r}")
    if any(">" in paragraph and not paragraph.startswith(">") for paragraph in paragraphs):
        raise ValueError(f"invalid prose comparison quote marker: {value!r}")
    return value


def load_mas_comparison_rows(mas_sources: list[dict]) -> list[dict]:
    """Load the frozen all-source comparison in exact Japanese corpus order."""

    if MAS_COMPARISON_SHA256.startswith("__"):
        raise ValueError("Special Contents comparison hash is not pinned")
    if sha256_file(MAS_COMPARISON_PATH) != MAS_COMPARISON_SHA256:
        raise ValueError(
            f"pinned Special Contents comparison differs: {MAS_COMPARISON_PATH}"
        )

    rows = read_jsonl(MAS_COMPARISON_PATH)
    if len(rows) != 6002 or len(rows) != len(mas_sources):
        raise ValueError(
            "Special Contents comparison row count differs: "
            f"comparison={len(rows)} source={len(mas_sources)}"
        )

    source_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    seen_refs: set[str] = set()
    for ordinal, (source, row) in enumerate(zip(mas_sources, rows), start=1):
        ref = source["ref"]
        if row.get("schema") != "wa2mas-combined-comparison/1":
            raise ValueError(f"unexpected Special Contents comparison schema for {ref}")
        if row.get("ref") != ref or ref in seen_refs:
            raise ValueError(f"Special Contents comparison order differs at {ref}")
        seen_refs.add(ref)
        if row.get("global_ordinal") != ordinal:
            raise ValueError(f"Special Contents comparison ordinal differs for {ref}")
        if row.get("section") != source["section"]:
            raise ValueError(f"Special Contents comparison section differs for {ref}")
        if str(row.get("script_id")) != str(source["script_id"]):
            raise ValueError(f"Special Contents comparison script differs for {ref}")
        if str(row.get("line_id")) != str(source["line_id"]):
            raise ValueError(f"Special Contents comparison line differs for {ref}")
        if row.get("source_hash") != source["source_hash"]:
            raise ValueError(f"Special Contents comparison source hash differs for {ref}")
        status = row.get("status")
        if status not in {"mapped_high", "source_only", "unmapped"}:
            raise ValueError(f"Special Contents comparison status differs for {ref}")
        english = row.get("english")
        if not isinstance(english, str):
            raise ValueError(f"Special Contents comparison English is invalid for {ref}")
        if bool(english.strip()) != (status == "mapped_high"):
            raise ValueError(
                f"Special Contents comparison availability differs for {ref}"
            )
        status_counts[status] += 1

        source_id = row.get("source_id")
        source_definition = COMPARISON_SOURCE_BY_ID.get(source_id)
        if source_id == "todokanai_main" or source_definition is None:
            raise ValueError(f"unknown Special Contents comparison source for {ref}")
        if row.get("source_label") != source_definition["label"]:
            raise ValueError(f"Special Contents comparison label differs for {ref}")
        source_counts[source_id] += 1

    if source_counts != MAS_COMPARISON_SOURCE_COUNTS:
        raise ValueError(
            f"Special Contents comparison source census differs: {source_counts}"
        )
    if status_counts != MAS_COMPARISON_STATUS_COUNTS:
        raise ValueError(
            f"Special Contents comparison status census differs: {status_counts}"
        )
    return rows


def _assert_binding(binding: dict, slots_by_id: dict[str, dict]) -> None:
    slot_id = binding.get("slot_id")
    slot = slots_by_id.get(slot_id)
    if slot is None:
        raise ValueError(f"unknown Todokanai slot binding: {slot_id!r}")
    for key in ("resource", "slot_index", "raw_sha256"):
        if binding.get(key) != slot.get(key):
            raise ValueError(
                f"Todokanai slot identity mismatch for {slot_id}: {key}"
            )


def _compose_todokanai_text(
    bindings: list[dict],
    slots_by_id: dict[str, dict],
) -> str:
    """Compose runtime fragments before normalizing their shared boundaries."""

    result = ""
    for binding in bindings:
        _assert_binding(binding, slots_by_id)
        fragment = slots_by_id[binding["slot_id"]]["text"]
        if not fragment:
            continue
        normalized_fragment = web_todokanai_text(fragment)
        if not normalized_fragment:
            continue
        has_boundary = result.endswith(
            (" ", "\t", "\r", "\n", r"\n", r"\k")
        )
        if (
            not result
            or has_boundary
            or CLOSING_QUOTE_ONLY_RE.fullmatch(normalized_fragment)
        ):
            result += fragment
        else:
            result += f" {fragment}"
    return web_todokanai_text(result)


def _apply_todokanai_overlay(
    *,
    name: str,
    rows: list[dict],
    state_by_ref: dict[str, dict],
    slots_by_id: dict[str, dict],
    update_status: bool,
) -> None:
    seen_refs: set[str] = set()
    for overlay in rows:
        ref = overlay.get("ref")
        if not isinstance(ref, str) or ref in seen_refs or ref not in state_by_ref:
            raise ValueError(f"invalid or duplicate {name} overlay ref: {ref!r}")
        seen_refs.add(ref)
        state = state_by_ref[ref]
        current = overlay.get("current_bindings")
        replacement = overlay.get("replacement_bindings")
        if not isinstance(current, list) or not isinstance(replacement, list):
            raise ValueError(f"invalid {name} binding arrays for {ref}")
        if state["bindings"] != current:
            raise ValueError(f"{name} current bindings differ for {ref}")
        for binding in replacement:
            _assert_binding(binding, slots_by_id)
        state["bindings"] = replacement
        if update_status:
            state["status"] = "mapped_high" if replacement else "unmapped"


def load_todokanai_runtime_rows() -> list[dict]:
    """Reconstruct shipped text from pinned runtime routing and appends."""

    pinned_files = (
        (TODOKANAI_ALIGNMENT_PATH, TODOKANAI_ALIGNMENT_SHA256),
        (TODOKANAI_SLOT_PATH, TODOKANAI_SLOT_SHA256),
        (TODOKANAI_ROUTING_PATH, TODOKANAI_ROUTING_SHA256),
        (TODOKANAI_CONTINUATION_PATH, TODOKANAI_CONTINUATION_SHA256),
    )
    for path, expected_sha256 in pinned_files:
        if sha256_file(path) != expected_sha256:
            raise ValueError(f"pinned Todokanai artifact differs: {path}")

    alignments = read_jsonl(TODOKANAI_ALIGNMENT_PATH)
    slots = read_jsonl(TODOKANAI_SLOT_PATH)
    routing = read_jsonl(TODOKANAI_ROUTING_PATH)
    continuations = read_jsonl(TODOKANAI_CONTINUATION_PATH)

    slots_by_id = {slot["slot_id"]: slot for slot in slots}
    if len(slots_by_id) != len(slots):
        raise ValueError("duplicate Todokanai slot ids")

    state_by_ref: dict[str, dict] = {}
    ordered_refs: list[str] = []
    for alignment in alignments:
        ref = alignment.get("line_ref")
        if not isinstance(ref, str) or ref in state_by_ref:
            raise ValueError(f"invalid or duplicate Todokanai alignment ref: {ref!r}")
        status = alignment.get("status")
        if status not in TODOKANAI_ALIGNMENT_STATUSES:
            raise ValueError(f"unknown Todokanai alignment status for {ref}: {status}")
        bindings = alignment.get("bindings") or []
        if not isinstance(bindings, list):
            raise ValueError(f"invalid Todokanai bindings for {ref}")
        for binding in bindings:
            _assert_binding(binding, slots_by_id)
        base_text = "".join(
            slots_by_id[binding["slot_id"]]["text"] for binding in bindings
        )
        if bindings:
            if (
                status != "mapped_high"
                or base_text != alignment.get("todokanai_text")
            ):
                raise ValueError(f"Todokanai base projection differs for {ref}")
        elif status == "mapped_high":
            raise ValueError(f"mapped Todokanai row has no bindings: {ref}")
        state_by_ref[ref] = {
            "ref": ref,
            "route": alignment["route"],
            "script_id": alignment["script_id"],
            "line_id": str(alignment["line_id"]),
            "status": status,
            "bindings": bindings,
        }
        ordered_refs.append(ref)

    _apply_todokanai_overlay(
        name="routing",
        rows=routing,
        state_by_ref=state_by_ref,
        slots_by_id=slots_by_id,
        update_status=True,
    )
    _apply_todokanai_overlay(
        name="continuation",
        rows=continuations,
        state_by_ref=state_by_ref,
        slots_by_id=slots_by_id,
        update_status=False,
    )

    if len(routing) != 710 or len(continuations) != 2445:
        raise ValueError("Todokanai runtime overlay row count differs")
    status_counts = Counter(row["status"] for row in state_by_ref.values())
    if status_counts != Counter(
        {
            "mapped_high": 70570,
            "supplement_external": 609,
            "unmapped": 17,
        }
    ):
        raise ValueError(f"Todokanai runtime status census differs: {status_counts}")

    result: list[dict] = []
    for ref in ordered_refs:
        state = state_by_ref[ref]
        result.append(
            {
                "ref": ref,
                "route": state["route"],
                "script_id": state["script_id"],
                "line_id": state["line_id"],
                "status": state["status"],
                "english": _compose_todokanai_text(
                    state["bindings"],
                    slots_by_id,
                ),
            }
        )
    return result


def main() -> None:
    if sha256_file(FINAL_PATH) != FINAL_SHA256:
        raise SystemExit("pinned v1.3.3 main corpus differs")
    if sha256_file(MAS_FINAL_PATH) != MAS_FINAL_SHA256:
        raise SystemExit("pinned v1.3.3 Special Contents corpus differs")

    sources = read_jsonl(SOURCE_PATH)
    finals = read_jsonl(FINAL_PATH)
    todokanai_rows = load_todokanai_runtime_rows()

    with SPEAKER_PATH.open(encoding="utf-8") as handle:
        speaker_payload = json.load(handle)
    speaker_labels = {
        row["speaker_ja"]: row["engine_label"]
        for row in speaker_payload["entries"]
    }

    if len(sources) != len(finals) or len(sources) != len(todokanai_rows):
        raise SystemExit(
            "row-count mismatch: "
            f"source={len(sources)} final={len(finals)} "
            f"todokanai={len(todokanai_rows)}"
        )

    final_by_ref = {row["ref"]: row["english"] for row in finals}
    if len(final_by_ref) != len(finals):
        raise SystemExit("duplicate refs in final English rows")

    todokanai_by_ref = {row["ref"]: row for row in todokanai_rows}
    if len(todokanai_by_ref) != len(todokanai_rows):
        raise SystemExit("duplicate refs in Todokanai comparison rows")

    scripts: OrderedDict[tuple[str, str], list[dict]] = OrderedDict()
    todokanai_scripts: OrderedDict[tuple[str, str], list[dict]] = OrderedDict()
    seen_refs: set[str] = set()

    for source in sources:
        ref = source["ref"]
        if ref in seen_refs:
            raise SystemExit(f"duplicate source ref: {ref}")
        if ref not in final_by_ref:
            raise SystemExit(f"missing final English for {ref}")
        if ref not in todokanai_by_ref:
            raise SystemExit(f"missing Todokanai comparison row for {ref}")
        seen_refs.add(ref)

        route = source["route"]
        script_id = source["script_id"]
        line_id = str(source["line_id"])
        comparison = todokanai_by_ref[ref]
        comparison_identity = (
            comparison["route"],
            comparison["script_id"],
            str(comparison["line_id"]),
        )
        source_identity = (route, script_id, line_id)
        if comparison_identity != source_identity:
            raise SystemExit(
                f"Todokanai identity mismatch for {ref}: "
                f"source={source_identity} comparison={comparison_identity}"
            )
        if comparison["status"] not in TODOKANAI_ALIGNMENT_STATUSES:
            raise SystemExit(
                f"unknown Todokanai alignment status for {ref}: "
                f"{comparison['status']}"
            )

        comparison_english = comparison["english"]
        comparison_status = comparison["status"]
        if (
            comparison_status == "mapped_high"
            and JAPANESE_TEXT_RE.search(comparison_english)
            and not LATIN_TEXT_RE.search(comparison_english)
        ):
            comparison_english = ""
            comparison_status = "source_only"

        speaker_ja = source.get("speaker", {}).get("ja") or ""
        japanese = web_text(source["ja"]["plain"])
        japanese_ruby = web_ruby_text(source["ja"]["raw"], japanese)
        line = {
            "ref": ref,
            "line": int(line_id),
            "speakerJa": speaker_ja,
            "speakerEn": speaker_labels.get(speaker_ja, ""),
            "japanese": japanese,
            "english": web_text(final_by_ref[ref]),
        }
        if japanese_ruby:
            line["japaneseRuby"] = japanese_ruby
        scripts.setdefault((route, script_id), []).append(line)
        todokanai_scripts.setdefault((route, script_id), []).append(
            {
                "ref": ref,
                "english": comparison_english,
                "status": comparison_status,
            }
        )

    if seen_refs != set(final_by_ref) or seen_refs != set(todokanai_by_ref):
        extras = sorted(set(final_by_ref) - seen_refs)[:5]
        comparison_extras = sorted(set(todokanai_by_ref) - seen_refs)[:5]
        raise SystemExit(
            "rows without source rows: "
            f"final={extras} todokanai={comparison_extras}"
        )

    mas_sources = read_jsonl(MAS_SOURCE_PATH)
    mas_finals = read_jsonl(MAS_FINAL_PATH)
    mas_comparisons = load_mas_comparison_rows(mas_sources)
    if len(mas_sources) != 6002 or len(mas_finals) != 6002:
        raise SystemExit(
            "Special Contents row-count mismatch: "
            f"source={len(mas_sources)} final={len(mas_finals)}"
        )
    mas_final_by_ref = {row["ref"]: row for row in mas_finals}
    if len(mas_final_by_ref) != len(mas_finals):
        raise SystemExit("duplicate refs in Special Contents English rows")
    with MAS_SPEAKER_PATH.open(encoding="utf-8") as handle:
        mas_speaker_payload = json.load(handle)
    mas_speaker_labels = {
        row["speaker_ja"]: row["engine_label"]
        for row in mas_speaker_payload["entries"]
    }

    seen_mas_refs: set[str] = set()
    for source, comparison in zip(mas_sources, mas_comparisons):
        ref = source["ref"]
        final = mas_final_by_ref.get(ref)
        if final is None:
            raise SystemExit(f"missing Special Contents English for {ref}")
        if ref in seen_mas_refs:
            raise SystemExit(f"duplicate Special Contents source ref: {ref}")
        if final["source_hash"] != source["source_hash"]:
            raise SystemExit(f"Special Contents source hash differs for {ref}")
        seen_mas_refs.add(ref)

        script_id = str(source["script_id"])
        line_id = str(source["line_id"])
        speaker_ja = source.get("speaker_ja") or ""
        japanese = web_mas_text(source["ja_plain"])
        japanese_ruby = web_ruby_text(
            source["ja_raw"], japanese, mas=True
        )
        line = {
                "ref": ref,
                "line": int(line_id),
                "speakerJa": speaker_ja,
                "speakerEn": mas_speaker_labels.get(speaker_ja, ""),
                "japanese": japanese,
                "english": web_mas_text(final["english"]),
            }
        if japanese_ruby:
            line["japaneseRuby"] = japanese_ruby
        scripts.setdefault(("special", script_id), []).append(line)
        todokanai_scripts.setdefault(("special", script_id), []).append(
            {
                "ref": ref,
                "english": (
                    (
                        web_todokanai_text(comparison["english"])
                        if comparison["source_id"] == "todokanai_special_runtime"
                        else web_prose_comparison_text(comparison["english"])
                    )
                    if comparison["english"]
                    else ""
                ),
                "status": comparison["status"],
                "sourceId": comparison["source_id"],
            }
        )

    if seen_mas_refs != set(mas_final_by_ref):
        extras = sorted(set(mas_final_by_ref) - seen_mas_refs)[:5]
        raise SystemExit(f"Special Contents rows without source rows: {extras}")
    public_total_lines = len(sources) + len(mas_sources)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for stale in OUTPUT_ROOT.glob("*.json"):
        stale.unlink()
    TODOKANAI_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for stale in TODOKANAI_OUTPUT_ROOT.glob("*.json"):
        stale.unlink()

    route_summaries: list[dict] = []
    status_counts: Counter[str] = Counter()
    concordance_routes: list[dict] = []
    todokanai_concordance_routes: list[dict] = []
    for route, route_label in ROUTE_LABELS.items():
        script_summaries: list[dict] = []
        concordance_scripts: list[dict] = []
        todokanai_concordance_scripts: list[dict] = []
        route_line_count = 0

        for (script_route, script_id), lines in scripts.items():
            if script_route != route:
                continue
            filename = f"{route}-{script_id}.json"
            comparison_lines = todokanai_scripts[(route, script_id)]
            comparison_counts = Counter(
                line["status"] for line in comparison_lines
            )
            status_counts.update(comparison_counts)
            payload = {
                "route": route,
                "routeLabel": route_label,
                "scriptId": script_id,
                "lineCount": len(lines),
                "lines": lines,
            }
            with (OUTPUT_ROOT / filename).open("w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
                handle.write("\n")

            comparison_payload = {
                "schema": "wa2-todokanai-comparison/1",
                "route": route,
                "routeLabel": route_label,
                "scriptId": script_id,
                "lineCount": len(comparison_lines),
                "availableCount": comparison_counts["mapped_high"],
                "lines": comparison_lines,
            }
            with (TODOKANAI_OUTPUT_ROOT / filename).open(
                "w", encoding="utf-8"
            ) as handle:
                json.dump(
                    comparison_payload,
                    handle,
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                handle.write("\n")

            concordance_scripts.append(
                {
                    "id": script_id,
                    "lineCount": len(lines),
                    "lines": [
                        [
                            line["ref"],
                            line["line"],
                            line["speakerJa"],
                            line["speakerEn"],
                            line["japanese"],
                            line["english"],
                            line.get("japaneseRuby", ""),
                        ]
                        for line in lines
                    ],
                }
            )
            todokanai_concordance_scripts.append(
                {
                    "id": script_id,
                    "lineCount": len(comparison_lines),
                    "lines": [
                        [
                            line["ref"],
                            line["english"],
                            line["status"],
                            *(
                                [line["sourceId"]]
                                if "sourceId" in line
                                else []
                            ),
                        ]
                        for line in comparison_lines
                    ],
                }
            )
            route_line_count += len(lines)
            script_summaries.append(
                {
                    "id": script_id,
                    "file": filename,
                    "comparisonFile": filename,
                    "comparisonAvailableCount": comparison_counts["mapped_high"],
                    "lineCount": len(lines),
                    "firstRef": lines[0]["ref"],
                    "lastRef": lines[-1]["ref"],
                }
            )

        route_summaries.append(
            {
                "id": route,
                "label": route_label,
                "lineCount": route_line_count,
                "scripts": script_summaries,
            }
        )
        concordance_routes.append(
            {
                "id": route,
                "label": route_label,
                "lineCount": route_line_count,
                "scripts": concordance_scripts,
            }
        )
        todokanai_concordance_routes.append(
            {
                "id": route,
                "label": route_label,
                "lineCount": route_line_count,
                "scripts": todokanai_concordance_scripts,
            }
        )

    concordance = {
        "schema": "wa2-public-concordance/1",
        "version": PUBLIC_VERSION,
        "totalLines": public_total_lines,
        "fields": [
            "ref",
            "line",
            "speakerJa",
            "speakerEn",
            "japanese",
            "english",
            "japaneseRuby",
        ],
        "routes": concordance_routes,
    }
    with (OUTPUT_ROOT / "concordance.json").open(
        "w", encoding="utf-8"
    ) as handle:
        json.dump(
            concordance,
            handle,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        handle.write("\n")

    todokanai_concordance = {
        "schema": "wa2-todokanai-concordance/1",
        "totalLines": public_total_lines,
        "fields": ["ref", "english", "status", "sourceId"],
        "routes": todokanai_concordance_routes,
    }
    with (TODOKANAI_OUTPUT_ROOT / "concordance.json").open(
        "w", encoding="utf-8"
    ) as handle:
        json.dump(
            todokanai_concordance,
            handle,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        handle.write("\n")

    index = {
        "schema": "wa2-public-script-browser/2",
        "version": PUBLIC_VERSION,
        "generatedAt": PUBLIC_GENERATED_AT,
        "totalLines": public_total_lines,
        "concordance": {
            "schema": concordance["schema"],
            "file": "concordance.json",
            "totalLines": public_total_lines,
        },
        "comparison": {
            "id": "todokanai",
            "label": "Todokanai TL",
            "sourceUrl": TODOKANAI_SOURCE_URL,
            "sourceArchiveSha256": TODOKANAI_ARCHIVE_SHA256,
            "totalLines": public_total_lines,
            "availableEnglishLines": status_counts["mapped_high"],
            "concordanceFile": "concordance.json",
            "sources": list(COMPARISON_SOURCES),
            "statusCounts": {
                status: status_counts[status]
                for status in TODOKANAI_PUBLIC_STATUSES
            },
        },
        "routes": route_summaries,
    }
    with (OUTPUT_ROOT / "index.json").open("w", encoding="utf-8") as handle:
        json.dump(index, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")

    comparison_index = {
        "schema": "wa2-todokanai-comparison-index/1",
        "label": "Todokanai TL",
        "sourceUrl": TODOKANAI_SOURCE_URL,
        "sourceArchiveSha256": TODOKANAI_ARCHIVE_SHA256,
        "totalLines": public_total_lines,
        "availableEnglishLines": status_counts["mapped_high"],
        "concordanceFile": "concordance.json",
        "sources": list(COMPARISON_SOURCES),
        "statusCounts": {
            status: status_counts[status] for status in TODOKANAI_PUBLIC_STATUSES
        },
        "scriptCount": len(todokanai_scripts),
    }
    with (TODOKANAI_OUTPUT_ROOT / "index.json").open(
        "w", encoding="utf-8"
    ) as handle:
        json.dump(
            comparison_index,
            handle,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        handle.write("\n")

    print(
        f"wrote {len(scripts)} scripts / {public_total_lines:,} lines to "
        f"{OUTPUT_ROOT} and {TODOKANAI_OUTPUT_ROOT}"
    )


if __name__ == "__main__":
    main()
