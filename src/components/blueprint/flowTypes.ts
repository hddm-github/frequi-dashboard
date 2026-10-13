/**
 * Shared types for the NFI X8 pipeline flow visualization.
 *
 * The flow consumes the dashboard's canonical blueprint data
 * (data/nfiStrategyBlueprint.ts) — the SAME source used by the
 * Mode Routing / Protection Gates / Entry Signals / Exit & Ladders tabs —
 * so the flow always reflects the latest strategy parse. Re-run
 * parse_nfi_strategy.py after a strategy update and the flow updates
 * automatically; no component changes needed.
 */

export interface FlowGate {
  /** e.g. "num_empty_288 <= allowed_empty_candles_288" */
  name: string;
  /** protection group: 'overflow' | 'global' | 'candle' | 'pair' */
  group: string;
}

export interface FlowTag {
  /** numeric code, e.g. "46" */
  code: string;
  /** display label, e.g. "L#46" */
  display: string;
  side: 'long' | 'short';
  modeId: string;
  ops: number;
  masks: number;
  protections: number;
  live: boolean;
  description: string;
  gates: FlowGate[];
}

export interface FlowMode {
  id: string;
  /** e.g. "L Normal" */
  label: string;
  /** strategy mode_name, e.g. "long_normal" */
  modeName: string;
  side: 'long' | 'short';
  color: string;
  /** exit-system ids this mode routes into */
  exitSystems: string[];
  live: boolean;
}

export interface FlowProtection {
  id: string;
  label: string;
  color: string;
  /** "38x" style count label */
  countLabel: string;
}

export interface FlowExitSystem {
  id: string;
  label: string;
  sub: string;
  color: string;
}

export interface FlowLadder {
  id: string;
  label: string;
  color: string;
  kind: 'grind' | 'derisk' | 'buyback';
  on: boolean;
}

/** A traced path through the flow, produced by selecting a node. */
export interface TraceSelection {
  kind: 'tag' | 'mode' | 'exit' | 'ladder' | 'protection';
  id: string;
}

export interface FlowGraph {
  tags: FlowTag[];
  modes: FlowMode[];
  protections: FlowProtection[];
  exits: FlowExitSystem[];
  ladders: FlowLadder[];
  closedBranches: number;
}
