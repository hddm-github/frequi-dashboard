import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type {
  BotConfig,
  BotProfile,
  BotState,
  DailyRecord,
  LogEntry,
  ProfitSummary,
  SignalStat,
  Trade,
} from '../types';
import { FreqtradeClient, EMPTY_BOT_STATE, normalizeApiUrl } from '../api/client';
import { useLocale } from '../i18n/LocaleContext';

export type CurrencyUnit = 'USDT' | 'USD' | 'CNY' | 'EUR' | 'IDR';

export interface ExchangeRates {
  USD: number;
  CNY: number;
  EUR: number;
  IDR: number;
}

interface BotContextValue {
  profiles: BotProfile[];
  activeProfile: BotProfile | null;
  activeBotId: string | null;
  isSelectingBot: boolean;
  setIsSelectingBot: (val: boolean) => void;
  client: FreqtradeClient;
  config: BotConfig;
  botState: BotState;
  activeTrades: Trade[];
  closedTrades: Trade[];
  profitSummary: ProfitSummary | null;
  dailyRecords: DailyRecord[];
  signals: SignalStat[];
  logs: LogEntry[];
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
  isConnected: boolean;
  isConnecting: boolean;
  lastError: string | null;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  currencyUnit: CurrencyUnit;
  setCurrencyUnit: (unit: CurrencyUnit) => void;
  exchangeRates: ExchangeRates;
  setCustomRate: (unit: CurrencyUnit, rate: number) => void;
  fetchLiveRates: () => Promise<void>;
  formatCurrency: (val: number, options?: { showSign?: boolean; decimals?: number }) => string;
  hideBalances: boolean;
  toggleHideBalances: () => void;
  initialCapital: number;
  setInitialCapital: (val: number) => void;
  isManualCapital: boolean;
  resetInitialCapitalToAuto: () => void;
  autoInferredCapital: number;
  isReadOnly: boolean;
  addProfile: (profile: Omit<BotProfile, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateProfile: (id: string, updates: Partial<BotProfile>) => Promise<boolean>;
  deleteProfile: (id: string) => void;
  switchBot: (id: string) => Promise<boolean>;
  disconnectCurrent: () => void;
  refreshData: (overrideClient?: FreqtradeClient, forceAll?: boolean) => Promise<void>;
  forceExitTrade: (tradeId: number) => Promise<boolean>;
  startBot: () => Promise<boolean>;
  stopBot: () => Promise<boolean>;
  reloadConfig: () => Promise<boolean>;
  mobileTab: string;
  setMobileTab: (tab: string) => void;
  refreshCountdown: number;
  refreshInterval: number;
  setRefreshInterval: (seconds: number) => void;
}

const BotContext = createContext<BotContextValue | null>(null);

function loadInitialProfiles(): { profiles: BotProfile[]; activeId: string | null } {
  try {
    // Load only explicitly saved bot profiles. Deleted profiles stay deleted.
    // 3. Normal load from localStorage
    const raw = localStorage.getItem('nfi_bot_profiles');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const savedActive = localStorage.getItem('nfi_active_bot_id');
        const sanitized = parsed.map((p: BotProfile) => ({
          ...p,
          apiUrl: normalizeApiUrl(p.apiUrl === '/ft-api' || p.apiUrl === '/owner-api' ? '/' : p.apiUrl),
        }));
        const activeExists = sanitized.some((p: BotProfile) => p.id === savedActive);
        return {
          profiles: sanitized,
          activeId: activeExists ? savedActive : sanitized[0].id,
        };
      }
    }

  } catch (err) {
    console.error('Failed to load bot profiles', err);
  }

  return { profiles: [], activeId: null };
}

function loadBotSnapshot(botId: string | null): {
  botState?: BotState;
  activeTrades?: Trade[];
  profitSummary?: ProfitSummary;
  closedTrades?: Trade[];
} | null {
  if (!botId) return null;
  try {
    const raw = localStorage.getItem(`frequi_snapshot_${botId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveBotSnapshot(
  botId: string | null,
  data: {
    botState?: BotState;
    activeTrades?: Trade[];
    profitSummary?: ProfitSummary | null;
    closedTrades?: Trade[];
  }
) {
  if (!botId) return;
  try {
    const existing = loadBotSnapshot(botId) || {};
    const updated = {
      ...existing,
      ...data,
      savedAt: Date.now(),
    };
    localStorage.setItem(`frequi_snapshot_${botId}`, JSON.stringify(updated));
  } catch {}
}

export function BotProvider({ children }: { children: ReactNode }) {
  useLocale();

  // Theme state: 默认白天模式 (Light mode)
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('nfi_theme') as 'dark' | 'light';
    return saved || 'light';
  });


  const setTheme = (t: 'dark' | 'light') => {
    localStorage.setItem('nfi_theme', t);
    setThemeState(t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Multi-Bot profiles & active bot
  const [initialData] = useState(loadInitialProfiles);
  const [profiles, setProfiles] = useState<BotProfile[]>(initialData.profiles);
  const [activeBotId, setActiveBotId] = useState<string | null>(initialData.activeId);
  const [isSelectingBot, setIsSelectingBot] = useState<boolean>(false);

  const activeProfile = useMemo(() => {
    if (!activeBotId) return null;
    return profiles.find((p) => p.id === activeBotId) || null;
  }, [profiles, activeBotId]);

  const config: BotConfig = useMemo(() => {
    if (!activeProfile) {
      return { apiUrl: '' };
    }
    return {
      apiUrl: activeProfile.apiUrl,
      username: activeProfile.username,
      password: activeProfile.password,
      };
  }, [activeProfile]);

  const [client, setClient] = useState<FreqtradeClient>(() => new FreqtradeClient(config));
  const clientRef = useRef<FreqtradeClient>(client);
  const activeBotIdRef = useRef<string | null>(activeBotId);
  const activeRequestIdRef = useRef<number>(0);
  const lastLoadedBotIdRef = useRef<string | null>(null);

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  useEffect(() => {
    activeBotIdRef.current = activeBotId;
  }, [activeBotId]);

  // Update client when active profile / config changes
  useEffect(() => {
    const nextClient = new FreqtradeClient(config);
    clientRef.current = nextClient;
    setClient(nextClient);
  }, [config]);

  // Branch 'hide-operation-buttons': Default to Read-Only mode to hide all dangerous operation buttons
  const isReadOnly = false;

  // Global Currency Unit State: 默认 CNY 计价
  const [currencyUnit, setCurrencyUnitState] = useState<CurrencyUnit>(() => {
    const saved = localStorage.getItem('frequi_currency_unit') as CurrencyUnit;
    return saved || 'CNY';
  });

  const setCurrencyUnit = (unit: CurrencyUnit) => {
    setCurrencyUnitState(unit);
    localStorage.setItem('frequi_currency_unit', unit);
  };

  // Mobile App active tab state
  const [mobileTab, setMobileTab] = useState<string>('frequi_dashboard');

  // Configurable auto-refresh interval (defaults to 6s, 0 means manual, persisted to localStorage)
  const [refreshInterval, setRefreshIntervalState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('frequi_refresh_interval');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch {}
    return 6;
  });

  const [refreshCountdown, setRefreshCountdown] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('frequi_refresh_interval');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch {}
    return 6;
  });

  const setRefreshInterval = useCallback((seconds: number) => {
    const val = Math.max(0, Math.floor(seconds));
    setRefreshIntervalState(val);
    setRefreshCountdown(val);
    try {
      localStorage.setItem('frequi_refresh_interval', String(val));
    } catch {}
  }, []);

  const refreshIntervalRef = useRef<number>(refreshInterval);
  useEffect(() => {
    refreshIntervalRef.current = refreshInterval;
  }, [refreshInterval]);

  // Live & Configurable Exchange Rates (defaults to real market rates: ~6.7025 for CNY, ~0.8929 for EUR)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(() => {
    try {
      const saved = localStorage.getItem('frequi_exchange_rates');
      if (saved) {
        return { USD: 1, CNY: 6.7025, EUR: 0.8929, IDR: 16000, ...JSON.parse(saved) };
      }
    } catch {}
    return { USD: 1, CNY: 6.7025, EUR: 0.8929, IDR: 16000 };
  });

  const fetchLiveRates = useCallback(async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          const cny = Number((data.rates.CNY || 6.7025).toFixed(4));
          const eur = Number((data.rates.EUR || 0.8929).toFixed(4));
          const idr = Number((data.rates.IDR || 16000).toFixed(2));
          const updated: ExchangeRates = { USD: 1, CNY: cny, EUR: eur, IDR: idr };
          setExchangeRates(updated);
          localStorage.setItem('frequi_exchange_rates', JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch live exchange rates:', e);
    }
  }, []);

  useEffect(() => {
    fetchLiveRates();
  }, [fetchLiveRates]);

  const setCustomRate = useCallback((unit: CurrencyUnit, newRate: number) => {
    if (unit === 'USD' || unit === 'USDT' || newRate <= 0) return;
    setExchangeRates((prev) => {
      const updated = { ...prev, [unit]: newRate };
      localStorage.setItem('frequi_exchange_rates', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [hideBalances, setHideBalances] = useState<boolean>(() => {
    try { return localStorage.getItem('frequi_hide_balances') === 'true'; } catch { return false; }
  });

  const toggleHideBalances = useCallback(() => {
    setHideBalances((current) => {
      const next = !current;
      localStorage.setItem('frequi_hide_balances', String(next));
      return next;
    });
  }, []);

  // Universal Dynamic Currency Formatter
  const formatCurrency = useCallback((val: number, options?: { showSign?: boolean; decimals?: number }): string => {
    if (hideBalances) return '••••••';
    const decimals = options?.decimals ?? (currencyUnit === 'IDR' ? 0 : 2);
    let rate = 1;
    let symbol = 'USDT';

    if (currencyUnit === 'USD') {
      rate = exchangeRates.USD || 1;
      symbol = '$';
    } else if (currencyUnit === 'CNY') {
      rate = exchangeRates.CNY || 6.7025;
      symbol = '¥';
    } else if (currencyUnit === 'EUR') {
      rate = exchangeRates.EUR || 0.8929;
      symbol = '€';
    } else if (currencyUnit === 'IDR') {
      rate = exchangeRates.IDR || 16000;
      symbol = 'Rp';
    } else {
      symbol = 'USDT';
    }

    const converted = val * rate;
    const sign = options?.showSign && converted > 0 ? '+' : '';
    const formattedNum = converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    if (currencyUnit === 'USDT') {
      return `${sign}${formattedNum} USDT`;
    }
    return `${sign}${symbol}${formattedNum}`;
  }, [currencyUnit, exchangeRates, hideBalances]);

  // ── SWR Snapshot: instant hydrate from cached data ──
  const snapshot = useMemo(() => loadBotSnapshot(initialData.activeId), []);

  // Operational state — pre-filled from snapshot for instant first paint
  const [botState, setBotState] = useState<BotState>(() => snapshot?.botState || EMPTY_BOT_STATE);
  const [activeTrades, setActiveTrades] = useState<Trade[]>(() => snapshot?.activeTrades || []);
  const [closedTrades, setClosedTrades] = useState<Trade[]>(() => snapshot?.closedTrades || []);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(() => snapshot?.profitSummary || null);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [signals, setSignals] = useState<SignalStat[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Auto-calculated or inferred starting capital from live bot data
  const autoInferredCapital = useMemo(() => {
    // 1. Check earliest daily record starting_balance
    if (dailyRecords && dailyRecords.length > 0) {
      const sorted = [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date));
      const earliestWithStarting = sorted.find((r) => r.starting_balance && r.starting_balance > 0);
      if (earliestWithStarting?.starting_balance) {
        return Math.round(earliestWithStarting.starting_balance * 100) / 100;
      }
    }

    // 2. Infer from current balance - closed profit
    if (botState.balance && botState.balance > 0) {
      const closed = profitSummary?.profit_closed_coin || 0;
      const derived = botState.balance - closed;
      if (derived > 0) {
        return Math.round(derived * 100) / 100;
      }
    }

    // 3. User requested default: 2000 USDT
    return 2000;
  }, [dailyRecords, botState.balance, profitSummary]);

  // Track whether the user has manually overridden initial capital
  const [isManualCapital, setIsManualCapital] = useState<boolean>(() => {
    return localStorage.getItem('frequi_initial_capital_custom') === 'true';
  });

  const [initialCapital, setInitialCapitalState] = useState<number>(() => {
    const isCustom = localStorage.getItem('frequi_initial_capital_custom') === 'true';
    const saved = localStorage.getItem('frequi_initial_capital');
    if (isCustom && saved && Number(saved) > 0 && Number(saved) !== 10000) {
      return Number(saved);
    }
    return 2000;
  });

  // When bot data loads and user hasn't manually overridden, auto-sync initial capital to inferred value
  useEffect(() => {
    if (!isManualCapital && autoInferredCapital > 0) {
      setInitialCapitalState(autoInferredCapital);
    }
  }, [autoInferredCapital, isManualCapital]);

  const setInitialCapital = useCallback((val: number) => {
    setInitialCapitalState(val);
    setIsManualCapital(true);
    localStorage.setItem('frequi_initial_capital_custom', 'true');
    localStorage.setItem('frequi_initial_capital', String(val));
  }, []);

  const resetInitialCapitalToAuto = useCallback(() => {
    setIsManualCapital(false);
    localStorage.removeItem('frequi_initial_capital_custom');
    localStorage.removeItem('frequi_initial_capital');
    setInitialCapitalState(autoInferredCapital);
  }, [autoInferredCapital]);

  // Concurrency & Mutex Locks (生命周期互斥锁，彻底杜绝并发请求压垮 SQLite 连接池)
  const isRefreshingRef = useRef<boolean>(false);
  const lastSecondaryFetchTimeRef = useRef<number>(0);
  const prevActiveTradeCountRef = useRef<number>(-1);
  const prevActiveTradeIdsRef = useRef<string>('');
  const closedTradesRef = useRef<Trade[]>([]);

  // Sync profiles to localStorage
  const saveProfiles = (newProfiles: BotProfile[], newActiveId?: string | null) => {
    setProfiles(newProfiles);
    localStorage.setItem('nfi_bot_profiles', JSON.stringify(newProfiles));
    if (newActiveId !== undefined) {
      setActiveBotId(newActiveId);
      if (newActiveId) {
        localStorage.setItem('nfi_active_bot_id', newActiveId);
      } else {
        localStorage.removeItem('nfi_active_bot_id');
      }
    }
  };

  /**
   * 分级刷新机制：
   * Tier 1 (轻量高频 6~8s): getBotState, getActiveTrades
   * Tier 2 (中频或事件驱动 60s+ 或持仓数量变化时): getProfitSummary, getClosedTrades, getDailyPerformance
   * Tier 3 (按需/低频 60s+): getSignalStats, getLogs
   */
  const refreshData = useCallback(async (overrideClient?: FreqtradeClient, forceAll: boolean = false) => {
    const targetClient = overrideClient || clientRef.current;
    const currentConfig = targetClient.getConfig();
    if (!currentConfig.apiUrl) return;

    // Mutex Lock: 如果已有非强制请求在处理中，跳过本次。若是 forceAll (如切换机器人或手动强制刷新)，则立刻抢占执行！
    if (isRefreshingRef.current && !forceAll) {
      return;
    }

    isRefreshingRef.current = true;
    const currentReqId = ++activeRequestIdRef.current;
    const currentActiveBotId = activeBotIdRef.current;
    if (refreshIntervalRef.current > 0) {
      setRefreshCountdown(refreshIntervalRef.current);
    }

    try {
      // ── Tier 1: 核心数据并行获取，first paint 不等待历史统计 ──
      const [state, active] = await Promise.all([
        targetClient.getBotState(),
        targetClient.getActiveTrades(),
      ]);
      if (activeRequestIdRef.current !== currentReqId || activeBotIdRef.current !== currentActiveBotId) return;

      setBotState(state);
      setActiveTrades(active);

      // Smart pair sync
      setSelectedPair((prev) => {
        const isValid = prev && (active.some((t) => t.pair === prev) || state.whitelist.includes(prev));
        if (isValid) return prev;
        if (active.length > 0 && active[0].pair) return active[0].pair;
        if (state.whitelist.length > 0) return state.whitelist[0];
        return '';
      });

      setIsConnected(true);
      setLastError(null);

      // ── SWR: persist snapshot for instant next-load ──
      saveBotSnapshot(activeBotIdRef.current, { botState: state, activeTrades: active });

      // ── Tier 2 & 3: 历史数据在核心 UI 已可用后后台同步 ──
      const now = Date.now();
      const timeSinceLastSecondary = now - lastSecondaryFetchTimeRef.current;
      const currentTradeIds = active.map((t) => t.trade_id).sort().join(',');
      const tradeIdsChanged = prevActiveTradeIdsRef.current !== '' && prevActiveTradeIdsRef.current !== currentTradeIds;
      const tradeCountChanged = prevActiveTradeCountRef.current !== -1 && prevActiveTradeCountRef.current !== active.length;
      prevActiveTradeCountRef.current = active.length;
      prevActiveTradeIdsRef.current = currentTradeIds;

      const shouldFetchSecondary =
        forceAll ||
        lastSecondaryFetchTimeRef.current === 0 ||
        closedTradesRef.current.length === 0 ||
        tradeCountChanged ||
        tradeIdsChanged ||
        (document.visibilityState === 'visible' && timeSinceLastSecondary > 30000);

      if (shouldFetchSecondary) {
        lastSecondaryFetchTimeRef.current = now;
        const fetchTier3 = forceAll || timeSinceLastSecondary > 60000 || timeSinceLastSecondary === 0;

        // Core state is committed above first. Keep heavy DB queries serial to protect SQLite.
        const summary = await targetClient.getProfitSummary().catch(() => null);
        if (activeRequestIdRef.current !== currentReqId || activeBotIdRef.current !== currentActiveBotId) return;
        if (summary) setProfitSummary(summary);

        const closed = await targetClient.getClosedTrades(100, false).catch(() => null);
        if (activeRequestIdRef.current !== currentReqId || activeBotIdRef.current !== currentActiveBotId) return;
        if (closed) {
          setClosedTrades(closed);
          closedTradesRef.current = closed;
        }

        const daily = await targetClient.getDailyPerformance(30).catch(() => null);
        if (activeRequestIdRef.current !== currentReqId || activeBotIdRef.current !== currentActiveBotId) return;
        if (daily) setDailyRecords(daily);

        // SWR: include secondary data in snapshot
        saveBotSnapshot(activeBotIdRef.current, { profitSummary: summary, closedTrades: closed || undefined });

        if (fetchTier3) {
          const sigs = await targetClient.getSignalStats(closed || undefined).catch(() => null);
          if (activeRequestIdRef.current !== currentReqId || activeBotIdRef.current !== currentActiveBotId) return;
          if (sigs) setSignals(sigs);

          const logList = await targetClient.getLogs(60).catch(() => null);
          if (activeRequestIdRef.current !== currentReqId || activeBotIdRef.current !== currentActiveBotId) return;
          if (logList) setLogs(logList);
        }
      }
    } catch (err: any) {
      if (activeRequestIdRef.current === currentReqId && activeBotIdRef.current === currentActiveBotId) {
        console.warn('Refresh data failed:', err);
        setIsConnected(false);
        setLastError(err?.message || '获取数据失败');
      }
    } finally {
      if (activeRequestIdRef.current === currentReqId) {
        isRefreshingRef.current = false;
      }
    }
  }, []);

  // Switch to a specific bot
  const switchBot = useCallback(async (id: string): Promise<boolean> => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return false;

    // 立即注销上一机器人的所有在途请求并重置互斥锁
    const myReqId = ++activeRequestIdRef.current;
    activeBotIdRef.current = id;
    lastLoadedBotIdRef.current = id;
    isRefreshingRef.current = false;
    lastSecondaryFetchTimeRef.current = 0;
    prevActiveTradeCountRef.current = -1;
    prevActiveTradeIdsRef.current = '';

    setIsConnecting(true);
    setLastError(null);

    // 立即清空历史策略数据并给出友好过渡提示，杜绝旧策略残影
    setBotState({
      ...EMPTY_BOT_STATE,
      strategy: '正在连接策略...',
    });
    setActiveTrades([]);
    setClosedTrades([]);
    closedTradesRef.current = [];
    setProfitSummary(null);
    setDailyRecords([]);
    setSignals([]);
    setLogs([]);
    setSelectedPair('');

    setActiveBotId(id);
    localStorage.setItem('nfi_active_bot_id', id);

    const newClient = new FreqtradeClient({
      apiUrl: target.apiUrl,
      username: target.username,
      password: target.password,
    });
    newClient.clearInFlightRequests();
    clientRef.current = newClient;
    setClient(newClient);

    const ok = await newClient.ping();
    if (activeRequestIdRef.current !== myReqId) return false;

    setIsConnecting(false);

    if (ok) {
      setIsConnected(true);
      setLastError(null);
      // 切换成功后立即全量同步新机器人的策略与全层数据
      await refreshData(newClient, true);
      setIsSelectingBot(false);
      return true;
    } else {
      setIsConnected(false);
      const errMsg = newClient.lastError || '无法连接该机器人节点 (网络超时或认证失败)';
      setLastError(errMsg);
      return false;
    }
  }, [profiles, refreshData]);

  // Add a new profile
  const addProfile = useCallback(async (
    profileData: Omit<BotProfile, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string; id?: string }> => {
    setIsConnecting(true);
    setLastError(null);

    const cleanUrl = normalizeApiUrl(profileData.apiUrl);
    const tempClient = new FreqtradeClient({
      apiUrl: cleanUrl,
      username: profileData.username,
      password: profileData.password,
    });

    const verify = await tempClient.verifyAuth();
    if (!verify.ok) {
      setIsConnecting(false);
      const errMsg = verify.message || '连接失败，请检查地址或用户名密码';
      setLastError(errMsg);
      return { success: false, error: errMsg };
    }

    const newId = `bot-${Date.now()}`;
    const newProfile: BotProfile = {
      ...profileData,
      apiUrl: cleanUrl,
      id: newId,
      createdAt: Date.now(),
      lastConnected: Date.now(),
    };

    const nextList = [...profiles, newProfile];
    saveProfiles(nextList, newId);
    setClient(tempClient);
    setIsConnected(true);
    setIsConnecting(false);
    setIsSelectingBot(false);

    await refreshData(tempClient);
    return { success: true, id: newId };
  }, [profiles, refreshData]);

  // Update existing profile (name, apiUrl, username, password)
  const updateProfile = useCallback(async (id: string, updates: Partial<BotProfile>): Promise<boolean> => {
    const existing = profiles.find((p) => p.id === id);
    if (!existing) return false;

    const isProtected = false;

    // 对于受保护/分享的机器人，允许随意修改名称 (name)，但严格禁止篡改敏感连接凭据
    const safeUpdates: Partial<BotProfile> = isProtected
      ? { name: (updates.name || '').trim() || existing.name }
      : {
          ...updates,
          name: (updates.name || '').trim() || existing.name,
        };

    const updated = profiles.map((p) => (p.id === id ? { ...p, ...safeUpdates } : p));
    saveProfiles(updated);

    if (activeBotId === id && !isProtected) {
      const active = updated.find((p) => p.id === id);
      if (active) {
        const newClient = new FreqtradeClient({
          apiUrl: active.apiUrl,
          username: active.username,
          password: active.password,
        });
        setClient(newClient);
        await refreshData(newClient);
      }
    }
    return true;
  }, [profiles, activeBotId, refreshData]);

  // Delete profile
  const deleteProfile = useCallback((id: string) => {
    const remaining = profiles.filter((p) => p.id !== id);
    if (activeBotId === id) {
      const nextActive = remaining.length > 0 ? remaining[0].id : null;
      saveProfiles(remaining, nextActive);
      if (nextActive) {
        switchBot(nextActive);
      } else {
        localStorage.removeItem('nfi_bot_config');
        localStorage.removeItem('nfi_active_bot_id');
        setIsConnected(false);
        setBotState(EMPTY_BOT_STATE);
        setActiveTrades([]);
        setClosedTrades([]);
      }
    } else {
      saveProfiles(remaining);
    }
  }, [profiles, activeBotId, switchBot]);

  const disconnectCurrent = useCallback(() => {
    setIsSelectingBot(true);
  }, []);

  const forceExitTrade = useCallback(async (tradeId: number): Promise<boolean> => {
    if (isReadOnly) return false;
    const success = await client.forceExit(tradeId);
    if (success) {
      await refreshData();
    }
    return success;
  }, [client, isReadOnly, refreshData]);

  const startBot = useCallback(async (): Promise<boolean> => {
    if (isReadOnly) return false;
    const success = await client.startBot();
    if (success) await refreshData();
    return success;
  }, [client, isReadOnly, refreshData]);

  const stopBot = useCallback(async (): Promise<boolean> => {
    if (isReadOnly) return false;
    const success = await client.stopBot();
    if (success) await refreshData();
    return success;
  }, [client, isReadOnly, refreshData]);

  const reloadConfig = useCallback(async (): Promise<boolean> => {
    if (isReadOnly) return false;
    const success = await client.reloadConfig();
    if (success) await refreshData();
    return success;
  }, [client, isReadOnly, refreshData]);

  // Initial load: 进来后直接强制全量拉取一次手动同步接口(包含平仓历史与收益)
  useEffect(() => {
    if (activeProfile && lastLoadedBotIdRef.current !== activeProfile.id) {
      lastLoadedBotIdRef.current = activeProfile.id;
      refreshData(undefined, true);
    }
  }, [activeProfile, refreshData]);

  // Live Countdown ticker & Auto-refresh polling when actively connected
  useEffect(() => {
    if (!activeProfile || isSelectingBot || refreshInterval <= 0) return;

    const timer = setInterval(() => {
      // 只有在标签页处于可见状态下才倒计时与轮询，完全避免后台隐秘消耗连接
      if (document.visibilityState === 'visible') {
        setRefreshCountdown((prev) => {
          if (prev <= 1) {
            refreshData();
            return refreshInterval;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeProfile, isSelectingBot, refreshData, refreshInterval]);

  // Page Visibility: pause polling when tab is hidden, refresh immediately on visible
  useEffect(() => {
    if (!activeProfile || isSelectingBot) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (refreshInterval > 0) {
          setRefreshCountdown(refreshInterval);
        }
        refreshData(undefined, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeProfile, isSelectingBot, refreshData, refreshInterval]);

  return (
    <BotContext.Provider
      value={{
        profiles,
        activeProfile,
        activeBotId,
        isSelectingBot,
        setIsSelectingBot,
        client,
        config,
        botState,
        activeTrades,
        closedTrades,
        profitSummary,
        dailyRecords,
        signals,
        logs,
        selectedPair,
        setSelectedPair,
        isConnected,
        isConnecting,
        lastError,
        theme,
        setTheme,
        currencyUnit,
        setCurrencyUnit,
        exchangeRates,
        setCustomRate,
        fetchLiveRates,
        formatCurrency,
        hideBalances,
        toggleHideBalances,
        initialCapital,
        setInitialCapital,
        isManualCapital,
        resetInitialCapitalToAuto,
        autoInferredCapital,
        isReadOnly,
        addProfile,
        updateProfile,
        deleteProfile,
        switchBot,
        disconnectCurrent,
        refreshData,
        forceExitTrade,
        startBot,
        stopBot,
        reloadConfig,
        mobileTab,
        setMobileTab,
        refreshCountdown,
        refreshInterval,
        setRefreshInterval,
      }}
    >
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  const ctx = useContext(BotContext);
  if (!ctx) throw new Error('useBot must be used within BotProvider');
  return ctx;
}
