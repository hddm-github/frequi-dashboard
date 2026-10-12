export interface Order {
  order_id?: string;
  pair?: string;
  status?: string;
  ft_order_side?: string;
  ft_is_entry?: boolean;
  ft_order_tag?: string;
  amount?: number;
  filled?: number;
  price?: number;
  safe_price?: number;
  average?: number;
  cost?: number;
  order_timestamp?: number;
  order_date?: string;
  order_filled_timestamp?: number;
  order_filled_date?: string;
  is_open?: boolean;
}

export interface Trade {
  trade_id: number;
  pair: string;
  is_open: boolean;
  is_short?: boolean;
  open_date: string;
  open_timestamp: number;
  close_date?: string;
  close_timestamp?: number;
  open_rate: number;
  close_rate?: number;
  current_rate?: number;
  amount: number;
  stake_amount: number;
  profit_ratio: number;
  profit_pct: number;
  profit_abs?: number;
  stop_loss_pct?: number;
  stop_loss_abs?: number;
  initial_stop_loss_pct?: number;
  enter_tag?: string;
  exit_tag?: string;
  exit_reason?: string;
  timeframe?: string;
  orders?: Order[];
}

export interface ProfitSummary {
  profit_closed_coin: number;
  profit_closed_percent_mean: number;
  profit_closed_ratio: number;
  profit_closed_fiat: number;
  profit_all_coin: number;
  profit_all_percent_mean: number;
  profit_all_ratio: number;
  profit_all_fiat: number;
  trade_count: number;
  closed_trade_count: number;
  first_trade_date: string;
  latest_trade_date: string;
  avg_duration: string;
  best_pair: string;
  winning_trades: number;
  losing_trades: number;
  winrate: number;
  max_drawdown?: number;
  max_drawdown_pct?: number;
}

export interface DailyRecord {
  date: string;
  abs_profit: number;
  fiat_value: number;
  trade_count: number;
  starting_balance?: number;
}

export interface CandleData {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalStat {
  tag: string;
  total_trades: number;
  win_trades: number;
  loss_trades: number;
  win_rate: number;
  total_profit_pct: number;
  avg_profit_pct: number;
  avg_duration_min: number;
}

export interface BotProfile {
  id: string;
  name: string;
  apiUrl: string;
  username?: string;
  password?: string;
  createdAt: number;
  lastConnected?: number;
  isShared?: boolean;
  shareToken?: string;
}

export interface BotConfig {
  apiUrl: string;
  username?: string;
  password?: string;
  shareToken?: string;
  strategyName?: string;
  timeframe?: string;
  state?: 'running' | 'stopped' | 'reload';
  dry_run?: boolean;
  stake_currency?: string;
  max_open_trades?: number;
}

export interface BotState {
  version: string;
  strategy: string;
  strategy_version?: string;
  timeframe: string;
  state: 'running' | 'stopped' | 'reload';
  dry_run: boolean;
  stake_currency: string;
  max_open_trades: number;
  balance: number;
  free_balance?: number;
  stake_amount: number | string;
  whitelist: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
}
