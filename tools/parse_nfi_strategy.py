#!/usr/bin/env python3
"""
Parse NostalgiaForInfinityX8.py into strategy-blueprint.json.

Re-runnable on strategy updates:
    python3 parse_nfi_strategy.py [--strategy PATH] [--out DIR]

Outputs:
    <DIR>/strategy-blueprint.json

What it extracts (all counted from code, never invented):
  1. entry_tags      - every tag in the class-level (long|short)_*_mode_tags lists,
                       with side / mode family / live status / evidence.
  2. per-tag gates   - condition-block stats: ops (| & ~), masks, protections,
                       indicators, timeframes, top gate expressions, and mapping
                       of each gate to the 4 protection groups.
  3. exit systems    - custom_exit routing per mode family, engine chain per
                       long_exit_*/short_exit_* function, distinct exit-signal
                       templates (exit branches) per mode.
  4. ladders         - system_v4 grind rungs, de-risk levels, buyback rung
                       params + rung order tags from the v4 adjust function.
  5. summary counts.

Method details (live/off, counting rules) are in METHOD_NOTES.md.
"""

import argparse
import ast
import io
import json
import os
import re
import sys
import tokenize
from collections import OrderedDict

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def load_source(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def class_body_nodes(tree, class_name_sub="NostalgiaForInfinity"):
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and class_name_sub in node.name:
            return node
    raise RuntimeError("strategy class not found")


def eval_str_list(node, env):
    """Evaluate an AST expression that should resolve to a list of strings."""
    if isinstance(node, ast.List):
        out = []
        for e in node.elts:
            if isinstance(e, ast.Constant) and isinstance(e.value, str):
                out.append(e.value)
        return out
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        return eval_str_list(node.left, env) + eval_str_list(node.right, env)
    if isinstance(node, ast.Name):
        return list(env.get(node.id, []))
    return []


def eval_const(node):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant):
        return -node.operand.value
    if isinstance(node, ast.List):
        return [eval_const(e) for e in node.elts]
    return None


def fn_body(src, fname):
    """Return the source of a `def fname(` method (class-level indent)."""
    m = re.search(r"\n  def %s\(" % re.escape(fname), src)
    if not m:
        return None
    body = src[m.start():]
    nxt = re.search(r"\n  def \w+\(", body[10:])
    if nxt:
        body = body[: nxt.start() + 10]
    return body


def code_only(text):
    """Strip full-line comments (keeps inline code)."""
    return "\n".join(l for l in text.split("\n") if not l.strip().startswith("#"))


# ---------------------------------------------------------------------------
# 1. mode tags (class-level, first assignment wins)
# ---------------------------------------------------------------------------

MODE_TAG_RE = re.compile(r"^(long|short)_(\w+?)_mode_tags$")
BASE_FAMILY_ORDER = []  # filled in parse order


def parse_mode_tags(tree):
    cls = class_body_nodes(tree)
    env = {}
    mode_names = {}
    for node in cls.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            m = MODE_TAG_RE.match(name)
            if m and name not in env:
                env[name] = eval_str_list(node.value, env)
                BASE_FAMILY_ORDER.append(name)
            elif name.endswith("_mode_name") and name not in mode_names:
                v = eval_const(node.value)
                if isinstance(v, str):
                    mode_names[name] = v
    return env, mode_names


# ---------------------------------------------------------------------------
# 2. entry signal enable params (class-level dicts)
# ---------------------------------------------------------------------------

def parse_entry_params(tree):
    cls = class_body_nodes(tree)
    out = {}
    for node in cls.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            if name in ("long_entry_signal_params", "short_entry_signal_params") and isinstance(node.value, ast.Dict):
                d = OrderedDict()
                for k, v in zip(node.value.keys, node.value.values):
                    if isinstance(k, ast.Constant):
                        d[k.value] = eval_const(v)
                out[name] = d
    return out


def commented_param_keys(src, dict_name):
    """Keys commented out inside the params dict (dead entries)."""
    m = re.search(r"%s\s*=\s*\{" % re.escape(dict_name), src)
    if not m:
        return []
    start = m.start()
    depth = 0
    end = start
    for i in range(start, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    seg = src[start:end]
    return re.findall(r'#\s*"((?:long|short)_entry_condition_\d+_enable)"', seg)


# ---------------------------------------------------------------------------
# 3. entry condition blocks
# ---------------------------------------------------------------------------

MASK_RE = re.compile(r"^[a-z][a-z0-9_]*_(gt|lt|gte|lte|eq|ne)(_|$)")
TF_RE = re.compile(r"_(15m|1h|4h|1d)\b")

PROTECTION_GROUP_RULES = [
    ("overflow_guards", ("num_empty_288", "allowed_empty_candles")),
    ("global_protections", ("protections_long_global", "protections_short_global", "global_protections_")),
    ("candle_health", ('df["volume"]', "df['volume']")),
    ("pair_mode_guards", ("is_pair_", "is_btc_stake")),
]


def gate_group(expr):
    for group, needles in PROTECTION_GROUP_RULES:
        if any(n in expr for n in needles):
            return group
    return "other"


def parse_preamble_maps(src):
    """np_view var -> column, and mask var -> underlying np_view var."""
    m = re.search(r"\n  def populate_entry_trend\(", src)
    start = m.start()
    loop = src.find("for enabled_long_entry_signal in", start)
    pre = src[start:loop]
    np_view = {}
    for mm in re.finditer(r"^\s*(\w+)\s*=\s*np_view\(\"([^\"]+)\"\)", pre, re.M):
        np_view[mm.group(1)] = mm.group(2)
    mask_defs = {}
    for mm in re.finditer(r"^\s*(\w+)\s*=\s*(\w+)\s*(?:>|<|>=|<=|==|!=)", pre, re.M):
        var, rhs = mm.group(1), mm.group(2)
        if rhs in np_view:
            mask_defs[var] = rhs
    # masks defined via np_shift comparisons, e.g. x = np_shift(y, n) > z
    for mm in re.finditer(r"^\s*(\w+)\s*=\s*np_shift\(\s*(\w+)\s*,", pre, re.M):
        var, rhs = mm.group(1), mm.group(2)
        if rhs in np_view and var not in mask_defs:
            mask_defs[var] = rhs
    return np_view, mask_defs


def find_condition_blocks(src):
    """Return list of dicts: side, tag(int), header_desc, block_text, header_line."""
    lines = src.split("\n")
    # locate long/short sections
    long_start = next(i for i, l in enumerate(lines) if "LONG ENTRY CONDITIONS STARTS HERE" in l)
    long_end = next(i for i, l in enumerate(lines) if "LONG ENTRY CONDITIONS ENDS HERE" in l)
    short_start = next(i for i, l in enumerate(lines) if "SHORT ENTRY CONDITIONS STARTS HERE" in l)
    short_end = next(i for i, l in enumerate(lines) if "SHORT ENTRY CONDITIONS ENDS HERE" in l)

    blocks = []
    for side, s, e in (("long", long_start, long_end), ("short", short_start, short_end)):
        seg = lines[s:e]
        starts = []
        for i, l in enumerate(seg):
            mm = re.match(r"\s*if %s_entry_condition_index == (\d+):" % side, l)
            if mm:
                starts.append((i, int(mm.group(1))))
        for idx, (i, tag) in enumerate(starts):
            j = starts[idx + 1][0] if idx + 1 < len(starts) else len(seg)
            block_lines = seg[i:j]
            # header comment: nearest "# Condition #<tag>" above the if
            desc = None
            for k in range(i - 1, max(-1, i - 6), -1):
                hm = re.match(r"\s*# Condition #(\d+)\s*-\s*(.*)$", seg[k])
                if hm and int(hm.group(1)) == tag:
                    desc = hm.group(2).strip()
                    break
            blocks.append({
                "side": side,
                "tag": tag,
                "header_desc": desc,
                "block_text": "\n".join(block_lines),
            })
    return blocks


def extract_appends(block_text, logic_var):
    """Find `LOGIC.append(EXPR)` calls; return list of expr source strings."""
    out = []
    pat = re.compile(r"\b%s\.append\(" % re.escape(logic_var))
    for m in pat.finditer(block_text):
        i = m.end()
        depth = 1
        while i < len(block_text) and depth > 0:
            c = block_text[i]
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
            elif c in "\"'":
                q = c
                i += 1
                while i < len(block_text) and block_text[i] != q:
                    if block_text[i] == "\\":
                        i += 1
                    i += 1
            i += 1
        out.append(block_text[m.end(): i - 1])
    return out


def count_ops(block_text):
    """Count boolean operator tokens | & ~ via tokenize (comments/strings excluded)."""
    n = 0
    try:
        toks = tokenize.generate_tokens(io.StringIO(block_text).readline)
        for tok in toks:
            if tok.type == tokenize.OP and tok.string in ("|", "&", "~"):
                n += 1
    except (tokenize.TokenError, IndentationError, SyntaxError):
        # fallback: crude char count on comment-stripped lines
        for l in block_text.split("\n"):
            code = l.split("#", 1)[0]
            n += code.count("|") + code.count("&") + code.count("~")
    return n


def block_name_tokens(block_text):
    names = []
    try:
        toks = tokenize.generate_tokens(io.StringIO(block_text).readline)
        for tok in toks:
            if tok.type == tokenize.NAME:
                names.append(tok.string)
    except (tokenize.TokenError, IndentationError, SyntaxError):
        names = re.findall(r"[A-Za-z_]\w*", code_only(block_text))
    return names


def analyze_block(block, np_view, mask_defs):
    text = block["block_text"]
    logic_var = "long_entry_logic" if block["side"] == "long" else "short_entry_logic"
    appends = extract_appends(text, logic_var)

    # split Protections / Logic sections by section-marker comments
    lines = text.split("\n")
    section = None
    prot_appends, logic_appends = [], []
    # map append index -> section by scanning lines in order
    append_idx = 0
    for l in lines:
        sm = re.match(r"\s*#\s*(Protections|Logic)\s*$", l)
        if sm:
            section = sm.group(1)
            continue
        if re.search(r"\b%s\.append\(" % re.escape(logic_var), l):
            if append_idx < len(appends):
                (prot_appends if section == "Protections" else logic_appends).append(appends[append_idx])
            append_idx += 1

    names = block_name_tokens(text)
    mask_ids = sorted({n for n in names if MASK_RE.match(n)})
    indicators = set()
    timeframes = set()
    for mid in mask_ids:
        base = mask_defs.get(mid)
        if base and base in np_view:
            indicators.add(np_view[base])
            tm = TF_RE.search(base)
            timeframes.add(tm.group(1) if tm else "5m")
        elif mid in np_view:
            indicators.add(np_view[mid])
    for n in set(names):
        if n in np_view:
            indicators.add(np_view[n])
            tm = TF_RE.search(n)
            timeframes.add(tm.group(1) if tm else "5m")

    ops = count_ops(text)
    top_gates = []
    for a in appends[:5]:
        code_lines = [l.strip() for l in a.strip().split("\n") if l.strip() and not l.strip().startswith("#")]
        first = code_lines[0] if code_lines else ""
        top_gates.append(first[:90])
    groups_used = sorted({gate_group(a) for a in appends})
    return {
        "ops": ops,
        "masks": len(mask_ids),
        "mask_ids_sample": mask_ids[:12],
        "protections": len(prot_appends) if prot_appends else sum(
            1 for a in appends if gate_group(a) != "other"),
        "protection_appends": len(prot_appends),
        "logic_appends": len(logic_appends),
        "indicators": len(indicators),
        "timeframes": sorted(timeframes),
        "top_gates": top_gates,
        "gate_groups": groups_used,
        "appends_total": len(appends),
    }


# ---------------------------------------------------------------------------
# 4. exit systems
# ---------------------------------------------------------------------------

ENGINE_ORDER = ["signals", "main", "williams_r", "dec", "stoploss"]


def engine_chain(body, side):
    found = []
    for m in re.finditer(r"\b%s_exit_(signals|main|williams_r|dec|stoploss)\b" % side, body or ""):
        eng = m.group(1)
        if eng not in found:
            found.append(eng)
    found.sort(key=lambda e: ENGINE_ORDER.index(e))
    return ["%s_exit_%s" % (side, e) for e in found]


EXIT_TMPL_RE = re.compile(r'f"exit_[^"]*"')


def exit_templates(body):
    code = code_only(body or "")
    out = set()
    for m in EXIT_TMPL_RE.finditer(code):
        out.add(re.sub(r"\{[^}]*\}", "{mode}", m.group(0)))
    return out


def parse_custom_exit_routing(src):
    body = fn_body(src, "custom_exit")
    lines = body.split("\n")
    routes = []
    i = 0
    while i < len(lines):
        cm = re.match(r"\s*#\s*((?:Long|Short)[^:]*?)\s*$", lines[i])
        if cm and i + 1 < len(lines) and re.search(r"^\s*if\b", lines[i + 1]):
            label = cm.group(1).strip()
            j = i + 1
            cond_lines = []
            while j < len(lines):
                cond_lines.append(lines[j].strip())
                if lines[j].rstrip().endswith(":"):
                    break
                j += 1
            cond = " ".join(cond_lines)
            fn = None
            for k in range(j, min(len(lines), j + 30)):
                # stop at the next branch comment to avoid leaking into the next mode's call
                if k > j and re.match(r"\s*#\s*(?:Long|Short|Trades)\b", lines[k]):
                    break
                fm = re.search(r"=\s*(?:self\.)?(long_exit_\w+|short_exit_\w+)\(", lines[k])
                if fm:
                    fn = fm.group(1)
                    break
            routes.append({"branch": label, "condition": cond, "exit_fn": fn})
            i = j
        i += 1
    return routes


# ---------------------------------------------------------------------------
# 5. adjust routing + ladders
# ---------------------------------------------------------------------------

def parse_adjust_routing(src):
    body = fn_body(src, "adjust_trade_position")
    lines = body.split("\n")
    rules = []
    for i, l in enumerate(lines):
        rm = re.search(r"return\s+self\.(\w+)\(\*args\)", l)
        if not rm:
            continue
        target = rm.group(1)
        ret_indent = len(l) - len(l.lstrip())
        conds = []
        section = None
        for j in range(i - 1, max(-1, i - 40), -1):
            lj = lines[j]
            if not lj.strip():
                continue
            ind = len(lj) - len(lj.lstrip())
            if re.match(r"\s*#\s*-{3,}", lj):
                continue
            sm = re.match(r"\s*#\s*([A-Z][A-Z0-9 /·\-]+)\s*$", lj)
            if sm and section is None:
                section = sm.group(1).strip()
            cm = re.match(r"\s*(if|elif)\b(.*):\s*$", lj)
            if cm and ind < ret_indent:
                conds.append(cm.group(1) + cm.group(2).strip())
                ret_indent = ind
                if ind <= 6:
                    break
        side = "long" if target.startswith("long_") else "short" if target.startswith("short_") else "?"
        rules.append({
            "target": target,
            "side": side,
            "section": section,
            "conditions": list(reversed(conds)),
        })
    return rules


def parse_ladder_params(tree):
    """Class-level system_v4 grind / derisk / buyback params (AST, first wins)."""
    cls = class_body_nodes(tree)
    params = {}
    for node in cls.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            if name.startswith("system_v4_grind_") or name.startswith("system_v4_derisk_") or name.startswith("system_v4_buyback_"):
                if name not in params:
                    params[name] = eval_const(node.value)
    return params


def v4_rung_order(src):
    """First-occurrence order of ladder order-tags in long_grind_adjust_trade_position_v4."""
    body = fn_body(src, "long_grind_adjust_trade_position_v4") or ""
    tags = []
    for m in re.finditer(r'"((?:derisk_level_[1-4]|derisk_global|grind_[1-5]_(?:entry|exit|derisk)|buyback_1_(?:entry|exit|derisk)|buyback-(?:entry|exit|derisk)))"', body):
        t = m.group(1)
        if t not in tags:
            tags.append(t)
    return tags


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strategy", default=os.path.expanduser("~/workspace/user/files/NostalgiaForInfinityX8.py"))
    ap.add_argument("--out", default=os.path.expanduser("~/workspace/frequi-pipeline"))
    args = ap.parse_args()

    src = load_source(args.strategy)
    tree = ast.parse(src)

    mode_tags, mode_names = parse_mode_tags(tree)
    entry_params = parse_entry_params(tree)
    commented = {k: commented_param_keys(src, k) for k in entry_params}
    np_view, mask_defs = parse_preamble_maps(src)
    blocks = find_condition_blocks(src)
    block_by_key = {(b["side"], b["tag"]): b for b in blocks}
    analyzed = {k: analyze_block(b, np_view, mask_defs) for k, b in block_by_key.items()}

    # ---- entry tags ----
    base_families = [n for n in BASE_FAMILY_ORDER if not any(
        x in n for x in ("rebuy_grind", "rapid_rebuy", "scalp_rebuy", "adjust_mode", "known_mode", "exit_known"))]
    # canonical base families: the 10 long + 9 short primary lists
    tag_rows = []
    tag_modes = {}  # code -> list of (family_key)
    for fam in base_families:
        m = MODE_TAG_RE.match(fam)
        side, family = m.group(1), m.group(2)
        for code in mode_tags.get(fam, []):
            tag_modes.setdefault(code, []).append((side, family, fam))

    # sanity: overlaps across base families
    overlaps = {c: v for c, v in tag_modes.items() if len({s for s, _, _ in v}) > 1 or len(v) > 1}

    for code, fams in sorted(tag_modes.items(), key=lambda kv: (kv[1][0][0] != "long", int(kv[0]))):
        side = fams[0][0]
        all_modes = []
        for s, family, fam in fams:
            mn_key = "%s_%s_mode_name" % (s, family)
            all_modes.append(mode_names.get(mn_key, "%s_%s" % (s, family)))
        primary = all_modes[0]
        tag_int = int(code)
        param_dict = entry_params.get("long_entry_signal_params" if side == "long" else "short_entry_signal_params", {})
        pkey = "%s_entry_condition_%d_enable" % (side, tag_int)
        key = (side, tag_int)
        has_block = key in block_by_key
        header = block_by_key[key]["header_desc"] if has_block else None
        flags = []
        if header and re.search(r"experimental", header, re.I):
            flags.append("experimental")
        if header and re.search(r"\bRAW\b", header):
            flags.append("RAW")
        if pkey in param_dict:
            live = bool(param_dict[pkey])
            ev = "%s=%s" % (pkey, param_dict[pkey])
        else:
            live = False
            ev = "no enable param; %s" % ("unreachable (no condition block)" if not has_block else "condition block exists but never evaluated (not in params loop)")
        if flags:
            ev += " | header flags: %s" % ",".join(flags)
        row = OrderedDict([
            ("code", code),
            ("display_tag", "%s#%s" % ("L" if side == "long" else "S", code)),
            ("side", side),
            ("mode_family", fams[0][1]),
            ("mode_name", primary),
            ("primary_mode", primary),
            ("all_modes", all_modes),
            ("live", live),
            ("live_evidence", ev),
            ("condition_desc", header),
            ("has_condition_block", has_block),
        ])
        if has_block:
            a = analyzed[key]
            row["ops"] = a["ops"]
            row["masks"] = a["masks"]
            row["protections"] = a["protections"]
            row["indicators"] = a["indicators"]
            row["timeframes"] = a["timeframes"]
            row["top_gates"] = a["top_gates"]
            row["gate_groups"] = a["gate_groups"]
        else:
            row["ops"] = None
            row["masks"] = None
            row["protections"] = None
            row["indicators"] = None
            row["timeframes"] = []
            row["top_gates"] = []
            row["gate_groups"] = []
        tag_rows.append(row)

    # ---- exit systems ----
    routes = parse_custom_exit_routing(src)
    # per-mode-function exit info
    exit_fns = {}
    for r in routes:
        fn = r["exit_fn"]
        if not fn or fn in exit_fns:
            continue
        body = fn_body(src, fn)
        side = "long" if fn.startswith("long_") else "short"
        chain = engine_chain(body, side)
        own_t = exit_templates(body)
        chain_t = set(own_t)
        per_engine = {}
        for e in chain:
            et = exit_templates(fn_body(src, e))
            per_engine[e] = sorted(et)
            chain_t |= et
        mn = re.search(r"mode(?:_name)?\s*=\s*self\.(\w+)", body or "")
        exit_fns[fn] = OrderedDict([
            ("exit_fn", fn),
            ("side", side),
            ("engine_chain", chain),
            ("mode_name_attr", mn.group(1) if mn else None),
            ("mode_name", mode_names.get(mn.group(1)) if mn else None),
            ("own_exit_templates", sorted(own_t)),
            ("templates_per_engine", per_engine),
            ("exit_branches", len(chain_t)),
            ("exit_branch_templates", sorted(chain_t)),
        ])
    # attach routing info per mode family
    mode_exits = OrderedDict()
    for r in routes:
        fam_key = re.sub(r"\s+", "_", r["branch"].lower().replace(" mode", ""))
        mode_exits[fam_key] = OrderedDict([
            ("branch_label", r["branch"]),
            ("condition", r["condition"][:220]),
            ("exit_fn", r["exit_fn"]),
            ("exit_branches", exit_fns.get(r["exit_fn"], {}).get("exit_branches")),
            ("engine_chain", exit_fns.get(r["exit_fn"], {}).get("engine_chain")),
        ])

    # closed branches: distinct (owner, template) over all engines + wrappers
    all_owners = (
        ["long_exit_signals", "long_exit_main", "long_exit_williams_r", "long_exit_dec", "long_exit_stoploss",
         "short_exit_signals", "short_exit_main", "short_exit_williams_r", "short_exit_dec", "short_exit_stoploss"]
        + sorted(exit_fns.keys())
    )
    closed_pairs = set()
    for o in all_owners:
        for t in exit_templates(fn_body(src, o)):
            closed_pairs.add((o, t))

    # ---- adjust systems + ladders ----
    adjust_rules = parse_adjust_routing(src)
    ladder_params = parse_ladder_params(tree)
    rung_order = v4_rung_order(src)

    ladders = OrderedDict()
    grind_rungs = []
    for i in range(1, 6):
        grind_rungs.append(OrderedDict([
            ("rung", "grind_%d" % i),
            ("enable", ladder_params.get("system_v4_grind_%d_enable" % i)),
            ("steps", len(ladder_params.get("system_v4_grind_%d_stakes_spot" % i) or [])),
            ("stakes_spot", ladder_params.get("system_v4_grind_%d_stakes_spot" % i)),
            ("thresholds_spot", ladder_params.get("system_v4_grind_%d_thresholds_spot" % i)),
            ("profit_threshold_spot", ladder_params.get("system_v4_grind_%d_profit_threshold_spot" % i)),
            ("stakes_futures", ladder_params.get("system_v4_grind_%d_stakes_futures" % i)),
            ("order_tags", ["grind_%d_entry" % i, "grind_%d_exit" % i, "grind_%d_derisk" % i]),
        ]))
    ladders["grind_rungs"] = grind_rungs
    derisk_levels = []
    for i in range(1, 5):
        derisk_levels.append(OrderedDict([
            ("rung", "derisk_level_%d" % i),
            ("enable", ladder_params.get("system_v4_derisk_level_%d_enable" % i)),
            ("sell_share_spot", ladder_params.get("system_v4_derisk_level_%d_stake_spot" % i)),
            ("sell_share_futures", ladder_params.get("system_v4_derisk_level_%d_stake_futures" % i)),
            ("thresholds_spot", ladder_params.get("system_v4_derisk_level_%d_spot" % i)),
            ("thresholds_futures", ladder_params.get("system_v4_derisk_level_%d_futures" % i)),
        ]))
    ladders["derisk_levels"] = derisk_levels
    ladders["derisk_global_tag"] = "derisk_global"
    ladders["buyback"] = OrderedDict([
        ("rung", "buyback_1"),
        ("enable", ladder_params.get("system_v4_buyback_1_enable")),
        ("stake_spot", ladder_params.get("system_v4_buyback_1_stake_spot")),
        ("stake_futures", ladder_params.get("system_v4_buyback_1_stake_futures")),
        ("distance_ratio_negative_spot", ladder_params.get("system_v4_buyback_1_distance_ratio_negative_spot")),
        ("distance_ratio_positive_spot", ladder_params.get("system_v4_buyback_1_distance_ratio_positive_spot")),
        ("use_derisk", ladder_params.get("system_v4_buyback_1_use_derisk")),
        ("order_tags", ["buyback_1_entry", "buyback_1_exit", "buyback_1_derisk"]),
    ])
    ladders["rung_order_tags_v4"] = rung_order

    # ---- summary ----
    live_tags = [t for t in tag_rows if t["live"]]
    fams_live = {}
    for t in tag_rows:
        fams_live.setdefault((t["side"], t["mode_family"]), False)
        if t["live"]:
            fams_live[(t["side"], t["mode_family"])] = True
    ops_live = sum(t["ops"] for t in live_tags if t["ops"])
    ops_all = sum(t["ops"] for t in tag_rows if t["ops"])
    ladder_rungs = len(grind_rungs) * 3 + len(derisk_levels) + 3  # grind entry/exit/derisk + derisk + buyback e/x/d
    summary = OrderedDict([
        ("entry_tags_total", len(tag_rows)),
        ("entry_tags_live", len(live_tags)),
        ("entry_tags_with_blocks", sum(1 for t in tag_rows if t["has_condition_block"])),
        ("mode_families_total", len(fams_live)),
        ("mode_families_live", sum(1 for v in fams_live.values() if v)),
        ("decision_operators_live_tags", ops_live),
        ("decision_operators_all_blocks", ops_all),
        ("ladder_rungs_v4", ladder_rungs),
        ("closed_branches_derived", len(closed_pairs)),
        ("closed_branches_note", "distinct (exit_function, exit_signal_template) pairs across the 10 core "
         "exit engines + 18 per-mode exit wrappers; {mode} normalized. The dashboard's '227 branches' "
         "does not match any defensible counting; this derived value is the auditable one."),
        ("tag_overlaps_across_base_families", overlaps),
        ("commented_out_params", commented),
        ("strategy_file", os.path.abspath(args.strategy)),
    ])

    blueprint = OrderedDict([
        ("meta", OrderedDict([
            ("strategy", "NostalgiaForInfinityX8"),
            ("parser", "parse_nfi_strategy.py"),
            ("note", "All values counted from code. null = not derivable; never invented."),
        ])),
        ("pipeline_stages", [
            "entry_signals",
            "protections (4 groups: overflow_guards, global_protections, candle_health, pair_mode_guards)",
            "volume (df[\"volume\"] > 0 gate, appended to every evaluated condition)",
            "tag_to_mode (custom_exit branch per mode family)",
            "exit_systems (per-mode exit fn -> engine chain: signals/main/williams_r/dec/stoploss)",
            "ladders (system_v4: grind 1-5, derisk 1-4, buyback 1; legacy grind/rebuy via adjust_trade_position)",
            "closed",
        ]),
        ("entry_tags", tag_rows),
        ("mode_families", [{"side": s, "family": f, "mode_name": mode_names.get("%s_%s_mode_name" % (s, f)),
                            "tags": mode_tags.get("%s_%s_mode_tags" % (s, f), []),
                            "live": fams_live.get((s, f), False)}
                           for s, f in sorted(fams_live.keys())]),
        ("exit_systems", OrderedDict([
            ("custom_exit_routing", mode_exits),
            ("per_exit_function", exit_fns),
        ])),
        ("adjust_systems", OrderedDict([
            ("routing_rules", adjust_rules),
            ("rule_summary", [
                "long rebuy -> long_rebuy_adjust_trade_position[_v4|_v3] (system_v4/v3) else legacy",
                "long system_v4 (non-grind/btc): adjust/known modes -> long_grind_adjust_trade_position_v4 (dynamic new trade ladder)",
                "long system_v4 legacy: grind/btc/old-date -> long_grind_adjust_trade_position (staged grid recovery)",
                "long system_v3 -> long_grind_adjust_trade_position_v3; else -> _v2",
                "short mirrors long with short_* functions",
            ]),
        ])),
        ("ladders", ladders),
        ("summary", summary),
    ])

    os.makedirs(args.out, exist_ok=True)
    out_path = os.path.join(args.out, "strategy-blueprint.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(blueprint, f, indent=1)
    print("wrote", out_path)
    print(json.dumps(summary, indent=1)[:2000])


if __name__ == "__main__":
    main()
