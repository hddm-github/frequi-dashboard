#!/usr/bin/env python3
"""
emit_flow_ts.py — converts strategy-blueprint.json (from parse_nfi_strategy.py)
into data/nfiStrategyFlow.ts for the frequi-dashboard pipeline flow.

Run after parse_nfi_strategy.py whenever NostalgiaForInfinityX8.py changes:

    python3 parse_nfi_strategy.py --strategy <path to .py> --out <dir>
    python3 emit_flow_ts.py --json <dir>/strategy-blueprint.json \
        --out <dashboard>/data/nfiStrategyFlow.ts

Group mapping (aligned with the nfi-desk reference visuals, verified):
  - num_empty_288 / allowed_empty_candles -> candle   (reference colors it #82cfff)
  - protections_long/short_global, global_protections_* -> global
  - is_pair_*, is_btc_stake -> pair
  - df["volume"] > 0 -> candle (the Volume stage; not drawn as a protection edge)
  - every other append (the main per-tag condition expression) -> overflow
"""
import argparse
import json
import re
from datetime import datetime, timezone

GROUP_ORDER = ["overflow", "global", "candle", "pair"]


def classify_gate(expr: str) -> str:
    e = expr.lower()
    if "num_empty_288" in e or "allowed_empty_candles" in e:
        return "candle"  # reference colors this #82cfff (candle health)
    if "protections_long_global" in e or "protections_short_global" in e:
        return "global"
    if "global_protections_" in e:
        return "global"
    if "is_pair_" in e or "is_btc_stake" in e:
        return "pair"
    if 'df["volume"]' in expr or "df['volume']" in expr:
        return "candle"
    return "overflow"  # main per-tag condition expression


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--strategy-version", default="")
    args = ap.parse_args()

    d = json.load(open(args.json))
    tags = d["entry_tags"]
    live = [t for t in tags if t.get("live")]

    # ---- per-tag gates -----------------------------------------------------
    tag_gates: dict[str, list[dict[str, str]]] = {}
    group_counts = {g: 0 for g in GROUP_ORDER}
    for t in live:
        gates = []
        seen_groups: set[str] = set()
        for expr in t.get("top_gates", []) or []:
            grp = classify_gate(expr)
            # the volume gate is the Volume stage, not a protection edge
            if 'df["volume"]' in expr or "df['volume']" in expr:
                continue
            gates.append({"name": expr, "group": grp})
            seen_groups.add(grp)
        # a tag with no classifiable gate still fans to its parser groups
        if not gates:
            for gg in t.get("gate_groups", []) or []:
                mapped = {
                    "overflow_guards": "overflow",
                    "global_protections": "global",
                    "candle_health": "candle",
                    "pair_mode_guards": "pair",
                }.get(gg)
                if mapped and mapped not in seen_groups:
                    gates.append({"name": f"({mapped} guard)", "group": mapped})
                    seen_groups.add(mapped)
        tag_gates[t["display_tag"]] = gates
        for grp in seen_groups:
            group_counts[grp] += 1

    # ---- ladder on/off ------------------------------------------------------
    ladd = d["ladders"]
    ladder_on: dict[str, bool] = {}
    for i, rung in enumerate(ladd.get("grind_rungs", []), 1):
        ladder_on[f"lad_grind_{i}"] = bool(rung.get("on", rung.get("enable", True)))
    for i, lvl in enumerate(ladd.get("derisk_levels", []), 1):
        ladder_on[f"lad_derisk_{i}"] = bool(lvl.get("enable", lvl.get("on", True)))
    bb = ladd.get("buyback", {})
    if isinstance(bb, dict):
        ladder_on["lad_buyback_1"] = bool(bb.get("enable", bb.get("on", False)))
    elif isinstance(bb, list) and bb:
        ladder_on["lad_buyback_1"] = bool(bb[0].get("enable", bb[0].get("on", False)))

    closed_branches = d["summary"].get("closed_branches_derived", 245)

    meta = d.get("meta", {})
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    def ts_str(s: str) -> str:
        return json.dumps(s)

    lines = []
    lines.append("/**")
    lines.append(" * nfiStrategyFlow.ts — GENERATED FILE. Do not edit by hand.")
    lines.append(" *")
    lines.append(f" * Generated: {generated_at}")
    lines.append(f" * Source: {meta.get('strategy_file', 'NostalgiaForInfinityX8.py')}")
    lines.append(f" * Parser: parse_nfi_strategy.py + emit_flow_ts.py")
    if args.strategy_version:
        lines.append(f" * Strategy version: {args.strategy_version}")
    lines.append(" *")
    lines.append(" * Consumed by components/blueprint/flowData.ts. Re-run the")
    lines.append(" * generator after every strategy update — the pipeline flow")
    lines.append(" * picks the changes up with zero component edits.")
    lines.append(" */")
    lines.append("")
    lines.append("export type ProtectionGroup = 'overflow' | 'global' | 'candle' | 'pair';")
    lines.append("")
    lines.append("export interface FlowTagGate { name: string; group: ProtectionGroup; }")
    lines.append("")
    lines.append("/** Per-tag protection gates, keyed by display tag (e.g. \"L#46\").")
    lines.append(" * Groups follow the reference visuals: overflow / global / candle / pair.")
    lines.append(" * Tags without a classifiable gate fan out to all four groups. */")
    lines.append("export const TAG_GATES: Record<string, FlowTagGate[]> = {")
    for disp in sorted(tag_gates, key=lambda x: (x[0], int(re.sub(r"\D", "", x) or 0))):
        gates = tag_gates[disp]
        inner = ", ".join(
            "{ name: %s, group: %s }" % (ts_str(g["name"]), ts_str(g["group"]))
            for g in gates
        )
        lines.append(f"  {ts_str(disp)}: [{inner}],")
    lines.append("};")
    lines.append("")
    lines.append("/** How many live tags touch each protection group (the \"38x\" labels). */")
    lines.append("export const PROTECTION_TOUCH_COUNT: Record<ProtectionGroup, number> = {")
    for grp in GROUP_ORDER:
        lines.append(f"  {grp}: {group_counts[grp]},")
    lines.append("};")
    lines.append("")
    lines.append("/** Ladder rung enable states, parsed from system_v4_*_enable params. */")
    lines.append("export const LADDER_ON: Record<string, boolean> = {")
    for lid in sorted(ladder_on):
        lines.append(f"  {ts_str(lid)}: {'true' if ladder_on[lid] else 'false'},")
    lines.append("};")
    lines.append("")
    lines.append("/** Distinct (exit_function, exit_signal_template) pairs — auditable terminal count. */")
    lines.append(f"export const CLOSED_BRANCHES = {int(closed_branches)};")
    lines.append("")
    lines.append(f"export const FLOW_GENERATED_AT = {ts_str(generated_at)};")
    lines.append("")

    with open(args.out, "w") as f:
        f.write("\n".join(lines))
    print(f"wrote {args.out}: {len(tag_gates)} tags, "
          f"groups={group_counts}, closed_branches={closed_branches}")


if __name__ == "__main__":
    main()
