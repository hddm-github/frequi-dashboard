import type {
  BotConfig,
  BotState,
  CandleData,
  DailyRecord,
  LogEntry,
  ProfitSummary,
  SignalStat,
  Trade,
} from '../types';

export const EMPTY_BOT_STATE: BotState = {
  version: '-',
  strategy: '未连接',
  timeframe: '5m',
  state: 'stopped',
  dry_run: true,
  stake_currency: 'USDT',
  max_open_trades: 0,
  balance: 0,
  free_balance: 0,
  stake_amount: 0,
  whitelist: [],
};

export function normalizeApiUrl(url: string): string {
  let cleaned = (url || '').trim().replace(/\/dashboard\/?$/, '').replace(/\/+$/, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('/')) return cleaned;
  if (!/^https?:\/\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }
  return cleaned;
}

function mapOrders(rawOrders?: any[]): any[] | undefined {
  if (!Array.isArray(rawOrders)) return undefined;
  return rawOrders.map((o) => ({
    order_id: o.order_id,
    pair: o.pair,
    status: o.status,
    ft_order_side: o.ft_order_side,
    ft_is_entry: o.ft_is_entry,
    ft_order_tag: o.ft_order_tag,
    amount: o.amount,
    filled: o.filled,
    price: o.price,
    safe_price: o.safe_price,
    average: o.average,
    cost: o.cost,
    order_timestamp: o.order_timestamp,
    order_date: o.order_date,
    order_filled_timestamp: o.order_filled_timestamp,
    order_filled_date: o.order_filled_date,
    is_open: o.is_open,
  }));
}

export class FreqtradeClient {
  private config: BotConfig;
  public lastError: string | null = null;
  private inFlightRequests: Map<string, Promise<any>> = new Map();

  constructor(config: BotConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<BotConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): BotConfig {
    return this.config;
  }

  getBaseUrl(): string {
    const raw = normalizeApiUrl(this.config.apiUrl || '');
    if (!raw) return '';
    // If it's the dedicated server-side share endpoint, connect to it directly
    if (raw === '/share-api' || raw.startsWith('/share-api')) {
      return '/share-api';
    }
    // In Vite dev mode, route through universal /api-proxy to eliminate browser CORS limitations
    if (import.meta.env.DEV) {
      return '/api-proxy';
    }
    return raw;
  }

  private getAuthHeader(): Record<string, string> {
    // If using server-side share-api proxy, credentials are auto-injected by Nginx
    if (this.config.apiUrl === '/share-api' || this.config.apiUrl?.startsWith('/share-api')) {
      return {};
    }
    if (this.config.username || this.config.password) {
      const token = btoa(`${this.config.username || ''}:${this.config.password || ''}`);
      return { Authorization: 'Basic ' + token };
    }
    return {};
  }

  clearInFlightRequests() {
    this.inFlightRequests.clear();
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const isShareProxy = baseUrl === '/share-api' || baseUrl.startsWith('/share-api');
    let url = isShareProxy ? `${baseUrl}/${endpoint}` : `${baseUrl}/api/v1/${endpoint}`;
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          q.append(k, String(v));
        }
      });
      url += `?${q.toString()}`;
    }

    const rawApiUrl = (this.config.apiUrl || '').trim().replace(/\/dashboard\/?$/, '').replace(/\/+$/, '');

    // In-flight request deduplication: scoped by target bot apiUrl so different bots never collide
    const cacheKey = `${rawApiUrl}::${url}`;
    const existing = this.inFlightRequests.get(cacheKey);
    if (existing) {
      return existing as Promise<T>;
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.getAuthHeader(),
    };
    if (this.getBaseUrl() === '/api-proxy' && rawApiUrl && !isShareProxy) {
      headers['x-target-url'] = rawApiUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout limit

    const fetchPromise = (async () => {
      try {
        const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        if (!res.ok) {
          let msg = `API [${endpoint}] HTTP ${res.status}: ${res.statusText}`;
          if (res.status === 401) {
            msg = '身份认证失败 (401 Unauthorized)：API 用户名或密码错误，请检查机器人配置';
          } else if (res.status === 404) {
            msg = `接口未找到 (404 Not Found): ${endpoint}`;
          } else if (res.status === 502 || res.status === 504) {
            msg = `网关异常 (HTTP ${res.status})：无法连通目标服务器`;
          }
          this.lastError = msg;
          throw new Error(msg);
        }

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
          const errMsg = `目标地址返回了 HTML 网页而非 Freqtrade API 数据 (HTTP ${res.status})。请确认填写的端口是 Freqtrade 机器人 API 端口（如 8080/8989），而不是前端网页端口（${currentOrigin}）。`;
          this.lastError = errMsg;
          throw new Error(errMsg);
        }

        this.lastError = null;
        try {
          return (await res.json()) as T;
        } catch (jsonErr: any) {
          const errMsg = 'API 返回的数据不是合法 JSON 格式，请检查该地址与端口是否为 Freqtrade 服务';
          this.lastError = errMsg;
          throw new Error(errMsg);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          const timeoutMsg = `请求超时 (12s)：API [${endpoint}] 响应过慢，已自动熔断`;
          this.lastError = timeoutMsg;
          throw new Error(timeoutMsg);
        }
        if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const fetchMsg = `连接失败 (Failed to fetch)：请检查跨域 (CORS) 或端口是否开放。
原因：Freqtrade 拒绝了来自「${origin}」的跨域访问。
解决：请在机器人的 config.json 中，将 "${origin}" 加入到 api_server.CORS_origins 列表中并重启机器人。`;
          this.lastError = fetchMsg;
          throw new Error(fetchMsg);
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private async postRequest<T>(endpoint: string, body?: any): Promise<T> {
    const url = `${this.getBaseUrl()}/api/v1/${endpoint}`;
    const rawApiUrl = (this.config.apiUrl || '').trim().replace(/\/dashboard\/?$/, '').replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.getAuthHeader(),
    };
    if (this.getBaseUrl() === '/api-proxy' && rawApiUrl) {
      headers['x-target-url'] = rawApiUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = `POST [${endpoint}] 失败 (${res.status}): ${text || res.statusText}`;
        if (res.status === 401) {
          msg = '操作失败：401 Unauthorized 认证失败';
        }
        this.lastError = msg;
        throw new Error(msg);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const errMsg = `目标地址返回了 HTML 网页而非 Freqtrade API 数据 (HTTP ${res.status})。请确认填写的端口是 Freqtrade 机器人 API 端口。`;
        this.lastError = errMsg;
        throw new Error(errMsg);
      }

      this.lastError = null;
      try {
        return (await res.json().catch(() => ({} as T))) as T;
      } catch {
        return {} as T;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutMsg = `POST [${endpoint}] 请求超时 (15s)`;
        this.lastError = timeoutMsg;
        throw new Error(timeoutMsg);
      }
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const fetchMsg = `连接失败 (Failed to fetch)：请检查跨域 (CORS) 或端口是否开放。
原因：Freqtrade 拒绝了来自「${origin}」的跨域访问。
解决：请在机器人的 config.json 中，将 "${origin}" 加入到 api_server.CORS_origins 列表中并重启机器人。`;
        this.lastError = fetchMsg;
        throw new Error(fetchMsg);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.request('ping');
      return true;
    } catch (err: any) {
      this.lastError = err?.message || '无法连接到该端点';
      return false;
    }
  }

  async verifyAuth(): Promise<{ ok: boolean; message?: string }> {
    try {
      // Test ping first
      await this.request('ping');
      // Then test an endpoint requiring auth
      await this.request('show_config');
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message || '连接或认证失败' };
    }
  }

  async getBotState(): Promise<BotState> {
    try {
      const [versionData, configData, balanceData, whitelistData] = await Promise.all([
        this.request<{ version: string }>('version').catch(() => ({ version: 'Freqtrade' })),
        this.request<{
          strategy?: string;
          strategy_version?: string;
          timeframe?: string;
          state?: 'running' | 'stopped';
          dry_run?: boolean;
          stake_currency?: string;
          max_open_trades?: number;
          stake_amount?: number | string;
        }>('show_config').catch(() => ({} as any)),
        this.request<{ total: number; free?: number }>('balance').catch(() => ({ total: 0, free: 0 })),
        this.request<{ whitelist: string[] }>('whitelist').catch(() => ({ whitelist: [] })),
      ]);

      return {
        version: versionData.version || 'Freqtrade',
        strategy: configData.strategy || 'FreqtradeStrategy',
        strategy_version: configData.strategy_version || '',
        timeframe: configData.timeframe || '5m',
        state: configData.state || 'running',
        dry_run: configData.dry_run ?? true,
        stake_currency: configData.stake_currency || 'USDT',
        max_open_trades: configData.max_open_trades || 5,
        balance: balanceData.total ?? 0,
        free_balance: balanceData.free ?? balanceData.total ?? 0,
        stake_amount: configData.stake_amount ?? 0,
        whitelist: whitelistData.whitelist || [],
      };
    } catch (err: any) {
      console.warn('Real API getBotState failed:', err);
      return EMPTY_BOT_STATE;
    }
  }

  async getActiveTrades(): Promise<Trade[]> {
    try {
      const data = await this.request<any[]>('status');
      if (!Array.isArray(data)) return [];
      return data.map((item) => ({
        trade_id: item.trade_id,
        pair: item.pair,
        is_open: true,
        is_short: item.is_short,
        open_date: item.open_date,
        open_timestamp: item.open_timestamp,
        open_rate: item.open_rate,
        current_rate: item.current_rate,
        amount: item.amount,
        stake_amount: item.stake_amount,
        profit_ratio: item.profit_ratio,
        profit_pct: Math.round((item.profit_ratio || 0) * 10000) / 100,
        profit_abs:
          item.profit_abs !== undefined
            ? item.profit_abs
            : item.total_profit_abs !== undefined
            ? item.total_profit_abs
            : (Number(item.stake_amount) || 0) * (Number(item.profit_ratio) || 0),
        stop_loss_pct: item.stop_loss_pct,
        stop_loss_abs: item.stop_loss_abs,
        enter_tag: item.enter_tag,
        timeframe: item.timeframe,
        orders: mapOrders(item.orders),
      }));
    } catch (err) {
      console.warn('Real API getActiveTrades failed:', err);
      return [];
    }
  }

  async getProfitSummary(): Promise<ProfitSummary> {
    try {
      const raw = await this.request<any>('profit');
      return {
        profit_closed_coin: raw.profit_closed_coin ?? 0,
        profit_closed_percent_mean: raw.profit_closed_percent_mean ?? 0,
        profit_closed_ratio: raw.profit_closed_ratio ?? 0,
        profit_closed_fiat: raw.profit_closed_fiat ?? 0,
        profit_all_coin: raw.profit_all_coin ?? 0,
        profit_all_percent_mean: raw.profit_all_percent_mean ?? 0,
        profit_all_ratio: raw.profit_all_ratio ?? 0,
        profit_all_fiat: raw.profit_all_fiat ?? 0,
        trade_count: raw.trade_count ?? 0,
        closed_trade_count: raw.closed_trade_count ?? 0,
        first_trade_date: raw.first_trade_date ?? '-',
        latest_trade_date: raw.latest_trade_date ?? '-',
        avg_duration: raw.avg_duration ?? '0m',
        best_pair: raw.best_pair ?? '-',
        winning_trades: raw.winning_trades ?? 0,
        losing_trades: raw.losing_trades ?? 0,
        winrate: raw.winrate ?? 0,
        max_drawdown: raw.max_drawdown ?? 0,
        max_drawdown_pct: raw.max_drawdown_pct ?? 0,
      };
    } catch (err) {
      console.warn('Real API getProfitSummary failed:', err);
      return {
        profit_closed_coin: 0,
        profit_closed_percent_mean: 0,
        profit_closed_ratio: 0,
        profit_closed_fiat: 0,
        profit_all_coin: 0,
        profit_all_percent_mean: 0,
        profit_all_ratio: 0,
        profit_all_fiat: 0,
        trade_count: 0,
        closed_trade_count: 0,
        first_trade_date: '-',
        latest_trade_date: '-',
        avg_duration: '-',
        best_pair: '-',
        winning_trades: 0,
        losing_trades: 0,
        winrate: 0,
        max_drawdown: 0,
        max_drawdown_pct: 0,
      };
    }
  }

  async getClosedTrades(limit: number = 100, orderById: boolean = false): Promise<Trade[]> {
    try {
      const data = await this.request<{ trades: any[] }>('trades', {
        limit,
        order_by_id: orderById,
      });

      const list: Trade[] = (data.trades || [])
        .filter((t) => !t.is_open)
        .map((t) => ({
          trade_id: t.trade_id,
          pair: t.pair,
          is_open: false,
          is_short: t.is_short,
          open_date: t.open_date,
          open_timestamp: t.open_timestamp,
          close_date: t.close_date,
          close_timestamp: t.close_timestamp,
          open_rate: t.open_rate,
          close_rate: t.close_rate,
          amount: t.amount,
          stake_amount: t.stake_amount,
          profit_ratio: t.profit_ratio,
          profit_pct: Math.round((t.profit_ratio || 0) * 10000) / 100,
          profit_abs:
            t.profit_abs !== undefined
              ? t.profit_abs
              : t.close_profit_abs !== undefined
              ? t.close_profit_abs
              : (Number(t.stake_amount) || 0) * (Number(t.profit_ratio) || 0),
          enter_tag: t.enter_tag,
          exit_tag: t.exit_tag,
          exit_reason: t.exit_reason,
          orders: mapOrders(t.orders),
        }));

      // Strictly sort newest trades first (latest close_date / close_timestamp)
      list.sort((a, b) => {
        const timeA = a.close_timestamp || (a.close_date ? new Date(a.close_date).getTime() : 0);
        const timeB = b.close_timestamp || (b.close_date ? new Date(b.close_date).getTime() : 0);
        return timeB - timeA;
      });

      return list;
    } catch (err) {
      console.warn('Real API getClosedTrades failed:', err);
      return [];
    }
  }

  async getDailyPerformance(timescale: number = 30): Promise<DailyRecord[]> {
    try {
      const res = await this.request<any>('daily', { timescale });
      let records: any[] = [];
      if (Array.isArray(res)) {
        records = res;
      } else if (res && Array.isArray(res.data)) {
        records = res.data;
      }
      return records.map((d) => ({
        date: String(d.date || ''),
        abs_profit: Number(d.abs_profit ?? 0),
        fiat_value: Number(d.fiat_value ?? 0),
        trade_count: Number(d.trade_count ?? 0),
        starting_balance: d.starting_balance !== undefined ? Number(d.starting_balance) : undefined,
      }));
    } catch (err) {
      console.warn('Real API getDailyPerformance failed:', err);
      return [];
    }
  }

  async getSignalStats(): Promise<SignalStat[]> {
    try {
      const closed = await this.getClosedTrades(200, false);
      if (closed.length === 0) return [];

      const map = new Map<string, { total: number; wins: number; loss: number; profits: number[] }>();

      closed.forEach((t) => {
        // Look up signal identifier from enter_tag, exit_tag, or exit_reason
        const tag = t.enter_tag || t.exit_tag || t.exit_reason || 'Manual / 未标记';
        const cur = map.get(tag) || { total: 0, wins: 0, loss: 0, profits: [] };
        cur.total++;
        if (t.profit_ratio >= 0) cur.wins++;
        else cur.loss++;
        cur.profits.push(t.profit_pct);
        map.set(tag, cur);
      });

      return Array.from(map.entries())
        .map(([tag, v]) => {
          const sumProfit = v.profits.reduce((a, b) => a + b, 0);
          return {
            tag,
            total_trades: v.total,
            win_trades: v.wins,
            loss_trades: v.loss,
            win_rate: v.total > 0 ? v.wins / v.total : 0,
            total_profit_pct: Math.round(sumProfit * 100) / 100,
            avg_profit_pct: v.total > 0 ? Math.round((sumProfit / v.total) * 100) / 100 : 0,
            avg_duration_min: 0,
          };
        })
        .sort((a, b) => b.total_profit_pct - a.total_profit_pct);
    } catch {
      return [];
    }
  }

  /**
   * Fetches real Candlestick (OHLCV) data from Freqtrade /api/v1/pair_candles
   * Handles Freqtrade's PairHistory schema: { columns: string[], data: any[][] }
   * Formats timestamps to Unix seconds and sorts strictly ascending for lightweight-charts
   */
  async getCandles(
    pair: string,
    timeframe?: string,
    limit: number = 1000,
    beforeTimestamp?: number
  ): Promise<CandleData[]> {
    if (!pair) return [];

    try {
      const tf =
        timeframe && timeframe !== '-'
          ? timeframe
          : this.config.timeframe && this.config.timeframe !== '-'
          ? this.config.timeframe
          : '5m';

      // If user is panning/scrolling backwards into the past before a specific timestamp
      if (beforeTimestamp) {
        return await this.fetchBinanceCandles(pair, tf, limit, beforeTimestamp);
      }

      let res: any;

      try {
        // POST with filtered columns avoids 500 Internal Server Error caused by NFI's 200+ indicator columns
        res = await this.postRequest<any>('pair_candles', {
          pair,
          timeframe: tf,
          limit,
          columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
        });
      } catch {
        // Fallback to GET
        res = await this.request<any>('pair_candles', { pair, timeframe: tf, limit });
      }

      let rows: any[][] = [];
      let columns: string[] = [];

      if (Array.isArray(res)) {
        rows = res;
      } else if (res && Array.isArray(res.data)) {
        rows = res.data;
        columns = Array.isArray(res.columns) ? res.columns : [];
      } else {
        return [];
      }

      const dateIdx = columns.findIndex((c) => c.toLowerCase() === 'date');
      const openIdx = columns.findIndex((c) => c.toLowerCase() === 'open');
      const highIdx = columns.findIndex((c) => c.toLowerCase() === 'high');
      const lowIdx = columns.findIndex((c) => c.toLowerCase() === 'low');
      const closeIdx = columns.findIndex((c) => c.toLowerCase() === 'close');
      const volIdx = columns.findIndex((c) => c.toLowerCase() === 'volume');

      const parsed: CandleData[] = [];

      for (const row of rows) {
        if (!Array.isArray(row)) continue;

        const rawDate = dateIdx >= 0 ? row[dateIdx] : row[0];
        let time: number;
        if (typeof rawDate === 'number') {
          // If millisecond timestamp (> 1e11), convert to seconds
          time = rawDate > 1e11 ? Math.floor(rawDate / 1000) : Math.floor(rawDate);
        } else if (typeof rawDate === 'string') {
          time = Math.floor(new Date(rawDate).getTime() / 1000);
        } else {
          continue;
        }

        const open = Number(openIdx >= 0 ? row[openIdx] : row[1]);
        const high = Number(highIdx >= 0 ? row[highIdx] : row[2]);
        const low = Number(lowIdx >= 0 ? row[lowIdx] : row[3]);
        const close = Number(closeIdx >= 0 ? row[closeIdx] : row[4]);
        const volume = Number(volIdx >= 0 ? row[volIdx] : row[5] || 0);

        if (!isNaN(time) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
          parsed.push({
            time,
            open,
            high,
            low,
            close,
            volume: isNaN(volume) ? 0 : volume,
          });
        }
      }

      // Sort ascending by time
      parsed.sort((a, b) => a.time - b.time);

      // Lightweight-charts strictly prohibits duplicate timestamps
      const uniqueCandles: CandleData[] = [];
      let lastTime = -1;
      for (const candle of parsed) {
        if (candle.time > lastTime) {
          uniqueCandles.push(candle);
          lastTime = candle.time;
        }
      }

      // If Freqtrade has no candles cached for this timeframe, fallback to public market data
      if (uniqueCandles.length === 0) {
        const fallback = await this.fetchBinanceCandles(pair, tf, limit, beforeTimestamp);
        if (fallback.length > 0) return fallback;
      }

      return uniqueCandles;
    } catch (err) {
      console.warn('Real API getCandles failed for pair:', pair, err);
      // Fallback attempt on error
      const tf = timeframe && timeframe !== '-' ? timeframe : '5m';
      return await this.fetchBinanceCandles(pair, tf, limit, beforeTimestamp);
    }
  }

  /**
   * Fallback & Pagination: fetches public Kline data from Binance when Freqtrade bot only caches the active strategy timeframe
   * Supports endTime (beforeTimestamp) for infinite backward panning
   */
  private async fetchBinanceCandles(
    pair: string,
    timeframe: string,
    limit: number = 500,
    beforeTimestamp?: number
  ): Promise<CandleData[]> {
    try {
      const cleanPair = pair.split(':')[0].replace('/', '').toUpperCase();
      // Binance interval mapping
      const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w'];
      const tf = validIntervals.includes(timeframe) ? timeframe : '5m';
      const isFutures = pair.includes(':');

      const endParam = beforeTimestamp ? `&endTime=${beforeTimestamp * 1000 - 1}` : '';

      const targets = isFutures
        ? [
            { host: 'https://fapi.binance.com', path: `/fapi/v1/klines?symbol=${cleanPair}&interval=${tf}&limit=${limit}${endParam}` },
            { host: 'https://api.binance.com', path: `/api/v3/klines?symbol=${cleanPair}&interval=${tf}&limit=${limit}${endParam}` },
          ]
        : [
            { host: 'https://api.binance.com', path: `/api/v3/klines?symbol=${cleanPair}&interval=${tf}&limit=${limit}${endParam}` },
            { host: 'https://fapi.binance.com', path: `/fapi/v1/klines?symbol=${cleanPair}&interval=${tf}&limit=${limit}${endParam}` },
          ];

      for (const t of targets) {
        try {
          let resp: Response;
          if (import.meta.env.DEV) {
            resp = await fetch(`/api-proxy${t.path}`, {
              headers: { 'x-target-url': t.host },
            });
          } else {
            resp = await fetch(`${t.host}${t.path}`);
          }

          if (!resp.ok) continue;
          const klines = await resp.json();
          if (Array.isArray(klines) && klines.length > 0) {
            const data: CandleData[] = [];
            for (const k of klines) {
              const time = Math.floor(Number(k[0]) / 1000);
              const open = Number(k[1]);
              const high = Number(k[2]);
              const low = Number(k[3]);
              const close = Number(k[4]);
              const volume = Number(k[5] || 0);
              if (!isNaN(time) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
                data.push({ time, open, high, low, close, volume });
              }
            }
            return data.sort((a, b) => a.time - b.time);
          }
        } catch {
          // ignore and try next endpoint
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  async getLogs(limit: number = 100): Promise<LogEntry[]> {
    try {
      const data = await this.request<any>('logs', { limit });
      const rawLogs = data.logs || data.log || (Array.isArray(data) ? data : []);
      return rawLogs.map((row: any, i: number) => {
        if (Array.isArray(row)) {
          const timestamp = String(row[0] || '');
          const level = (String(row.length >= 5 ? row[3] : row[2] || 'INFO').toUpperCase() as any) || 'INFO';
          const message = String(row.length >= 5 ? row[4] : row[3] || row[1] || '');
          return {
            id: `${i}-${row[1] || timestamp || Date.now()}`,
            timestamp,
            level,
            message,
          };
        } else if (typeof row === 'object' && row !== null) {
          return {
            id: `${i}-${row.timestamp || Date.now()}`,
            timestamp: String(row.timestamp || row.created_at || ''),
            level: (String(row.level || 'INFO').toUpperCase() as any) || 'INFO',
            message: String(row.message || row.msg || ''),
          };
        } else {
          return {
            id: String(i),
            timestamp: '',
            level: 'INFO',
            message: String(row),
          };
        }
      });
    } catch (err) {
      console.warn('Real API getLogs failed:', err);
      return [];
    }
  }

  async forceExit(tradeId: number): Promise<boolean> {
    try {
      await this.postRequest('forceexit', { tradeid: String(tradeId) });
      return true;
    } catch {
      return false;
    }
  }

  async startBot(): Promise<boolean> {
    try {
      await this.postRequest('start');
      return true;
    } catch {
      return false;
    }
  }

  async stopBot(): Promise<boolean> {
    try {
      await this.postRequest('stop');
      return true;
    } catch {
      return false;
    }
  }

  async reloadConfig(): Promise<boolean> {
    try {
      await this.postRequest('reload_config');
      return true;
    } catch {
      return false;
    }
  }
}
