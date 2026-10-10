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
import { decryptShareToken } from '../utils/shareCrypto';

export type CurrencyUnit = 'USDT' | 'USD' | 'CNY' | 'EUR';

export interface ExchangeRates {
  USD: number;
  CNY: number;
  EUR: number;
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
}

const BotContext = createContext<BotContextValue | null>(null);

function safeBase64Decode(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return atob(str);
  }
}

function extractUrlCredentials(): {
  name: string;
  apiUrl: string;
  username: string;
  password: string;
} | null {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const hashStr = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hashStr);

    const getVal = (...keys: string[]): string | null => {
      for (const k of keys) {
        const v = searchParams.get(k) || hashParams.get(k);
        if (v !== null && v !== undefined && v !== '') {
          return decodeURIComponent(v.trim());
        }
      }
      return null;
    };

    // 1. Check encrypted token parameter (?token=... or #token=... or ?t=... or ?s=...)
    const token = getVal('token', 't', 'connect', 'share_token', 's');
    if (token) {
      // First try frontend symmetric decryption
      const decrypted = decryptShareToken(token);
      if (decrypted && decrypted.apiUrl) {
        return {
          name: decrypted.name || '实盘观摩节点',
          apiUrl: decrypted.apiUrl,
          username: decrypted.username || '',
          password: decrypted.password || '',
        };
      }

      // Fallback to legacy unencrypted base64 json if present
      try {
        const decoded = safeBase64Decode(token);
        const obj = JSON.parse(decoded);
        if (obj && (obj.apiUrl || obj.url)) {
          return {
            name: obj.name || '实盘观摩节点',
            apiUrl: obj.apiUrl || obj.url,
            username: obj.username || obj.user || '',
            password: obj.password || obj.pass || '',
          };
        }
      } catch (e) {
        console.warn('Failed to parse legacy connect token:', e);
      }
    }

    // 2. Check plaintext query/hash parameters (?name=...&apiUrl=...&user=...&pass=...)
    const apiUrl = getVal('apiUrl', 'url', 'api', 'server');
    if (apiUrl) {
      const name = getVal('name', 'n', 'bot') || '实盘观摩节点';
      const username = getVal('username', 'user', 'u', 'account') || '';
      const password = getVal('password', 'pass', 'pwd', 'p') || '';

      return {
        name,
        apiUrl,
        username,
        password,
      };
    }
  } catch (err) {
    console.error('Failed to parse URL credentials:', err);
  }
  return null;
}

function loadInitialProfiles(): { profiles: BotProfile[]; activeId: string | null } {
  try {
    // 1. Check if user opened a 1-click share URL containing credentials
    const urlCreds = extractUrlCredentials();
    if (urlCreds) {
      let existingProfiles: BotProfile[] = [];
      try {
        const raw = localStorage.getItem('nfi_bot_profiles');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) existingProfiles = parsed;
        }
      } catch {}

      // Match by both apiUrl AND name: if user shares a different bot name/url, both are preserved!
      const foundIdx = existingProfiles.findIndex(
        (p) => p.apiUrl === urlCreds.apiUrl && (p.name === urlCreds.name || !urlCreds.name)
      );
      let activeId: string;

      if (foundIdx >= 0) {
        // Update credentials of this existing profile
        existingProfiles[foundIdx] = {
          ...existingProfiles[foundIdx],
          name: urlCreds.name || existingProfiles[foundIdx].name,
          username: urlCreds.username,
          password: urlCreds.password,
          isShared: true,
        };
        activeId = existingProfiles[foundIdx].id;
      } else {
        // Create new bot profile and prepend, so all shared bots accumulate in browser
        const newBot: BotProfile = {
          id: `bot-url-${Date.now()}`,
          name: urlCreds.name,
          apiUrl: urlCreds.apiUrl,
          username: urlCreds.username,
          password: urlCreds.password,
          createdAt: Date.now(),
          isShared: true,
        };
        existingProfiles = [newBot, ...existingProfiles];
        activeId = newBot.id;
      }

      localStorage.setItem('nfi_bot_profiles', JSON.stringify(existingProfiles));
      localStorage.setItem('nfi_active_bot_id', activeId);
      localStorage.setItem(
        'nfi_bot_config',
        JSON.stringify({
          apiUrl: urlCreds.apiUrl,
          username: urlCreds.username,
          password: urlCreds.password,
        })
      );

      try {
        sessionStorage.setItem('nfi_url_imported_name', urlCreds.name);
      } catch {}

      // Clean browser address bar: removes ?name=...&apiUrl=... immediately so credentials don't stay in URL history
      try {
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (e) {
        console.warn('Failed to clean URL', e);
      }

      return { profiles: existingProfiles, activeId };
    }

    // 2. Legacy /share-api mode (?share=true without explicit url)
    const searchParams = new URLSearchParams(window.location.search);
    const isShare = searchParams.get('share') === 'true' || searchParams.get('mode') === 'share';
    if (isShare) {
      const shareBot: BotProfile = {
        id: 'share-readonly-bot',
        name: '实盘观摩节点 (只读)',
        apiUrl: '/share-api',
        username: 'share-viewer',
        password: '',
        createdAt: Date.now(),
        isShared: true,
      };
      return { profiles: [shareBot], activeId: shareBot.id };
    }

    // 3. Normal load from localStorage
    const raw = localStorage.getItem('nfi_bot_profiles');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const savedActive = localStorage.getItem('nfi_active_bot_id');
        const sanitized = parsed.map((p: BotProfile) => ({
          ...p,
          isShared: p.isShared ?? (p.id?.startsWith('bot-url-') || false),
        }));
        const activeExists = sanitized.some((p: BotProfile) => p.id === savedActive);
        return {
          profiles: sanitized,
          activeId: activeExists ? savedActive : sanitized[0].id,
        };
      }
    }

    // Auto-migration from legacy single config
    const legacy = localStorage.getItem('nfi_bot_config');
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      if (parsedLegacy.apiUrl) {
        const migrated: BotProfile = {
          id: `bot-${Date.now()}`,
          name: '默认机器人',
          apiUrl: parsedLegacy.apiUrl,
          username: parsedLegacy.username || '',
          password: parsedLegacy.password || '',
          createdAt: Date.now(),
        };
        localStorage.setItem('nfi_bot_profiles', JSON.stringify([migrated]));
        localStorage.setItem('nfi_active_bot_id', migrated.id);
        return { profiles: [migrated], activeId: migrated.id };
      }
    }
  } catch (err) {
    console.error('Failed to load bot profiles', err);
  }

  return { profiles: [], activeId: null };
}

export function BotProvider({ children }: { children: ReactNode }) {
  // Theme state: 默认白天模式 (Light mode)
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('nfi_theme') as 'dark' | 'light';
    return saved || 'light';
  });

  const [shareToast, setShareToast] = useState<string | null>(null);

  // 检测新从 URL 导入的机器人提示
  useEffect(() => {
    try {
      const importedName = sessionStorage.getItem('nfi_url_imported_name');
      if (importedName) {
        sessionStorage.removeItem('nfi_url_imported_name');
        setShareToast(`已自动载入「${importedName}」并安全缓存至浏览器，地址栏已恢复干净 URL`);
      }
    } catch {}
  }, []);

  // 提示 3.5 秒后自动消失，规避 React StrictMode 清除定时器的问题
  useEffect(() => {
    if (!shareToast) return;
    const timer = setTimeout(() => {
      setShareToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [shareToast]);

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

  // Update client when active profile / config changes
  useEffect(() => {
    setClient(new FreqtradeClient(config));
  }, [config]);

  // Branch 'hide-operation-buttons': Default to Read-Only mode to hide all dangerous operation buttons
  const isReadOnly = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('readonly') !== 'false';
    } catch {
      return true;
    }
  }, []);

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

  // Live 6-second countdown timer for auto-refresh
  const [refreshCountdown, setRefreshCountdown] = useState<number>(6);

  // Live & Configurable Exchange Rates (defaults to real market rates: ~6.7025 for CNY, ~0.8929 for EUR)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(() => {
    try {
      const saved = localStorage.getItem('frequi_exchange_rates');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return { USD: 1, CNY: 6.7025, EUR: 0.8929 };
  });

  const fetchLiveRates = useCallback(async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          const cny = Number((data.rates.CNY || 6.7025).toFixed(4));
          const eur = Number((data.rates.EUR || 0.8929).toFixed(4));
          const updated: ExchangeRates = { USD: 1, CNY: cny, EUR: eur };
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

  // Universal Dynamic Currency Formatter
  const formatCurrency = useCallback((val: number, options?: { showSign?: boolean; decimals?: number }): string => {
    const decimals = options?.decimals ?? 2;
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
  }, [currencyUnit, exchangeRates]);

  // Operational state
  const [botState, setBotState] = useState<BotState>(EMPTY_BOT_STATE);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
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
   * Tier 3 (按需/低频 90s+): getSignalStats, getLogs
   */
  const refreshData = useCallback(async (overrideClient?: FreqtradeClient, forceAll: boolean = false) => {
    const targetClient = overrideClient || client;
    const currentConfig = targetClient.getConfig();
    if (!currentConfig.apiUrl) return;

    // Mutex Lock: 如果前一次请求还在处理中，直接跳过本次，绝不并发重叠！
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setRefreshCountdown(6);

    try {
      // ── Tier 1: 核心轻量数据（串行微步执行，单次只占用 1 个连接）──
      const state = await targetClient.getBotState();
      const active = await targetClient.getActiveTrades();

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

      // ── Tier 2 & 3: 统计与历史数据（按需、低频、或持仓变动时立即触发）──
      const now = Date.now();
      const timeSinceLastSecondary = now - lastSecondaryFetchTimeRef.current;
      const currentTradeIds = active.map((t) => t.trade_id).sort().join(',');
      const tradeIdsChanged = prevActiveTradeIdsRef.current !== '' && prevActiveTradeIdsRef.current !== currentTradeIds;
      const tradeCountChanged = prevActiveTradeCountRef.current !== -1 && prevActiveTradeCountRef.current !== active.length;
      prevActiveTradeCountRef.current = active.length;
      prevActiveTradeIdsRef.current = currentTradeIds;

      // 首次加载、手动强制刷新、平仓历史仍为空(尚未同步成功)、平仓/开仓(数量或ID变动)、或距上次拉取超过 30 秒且页面可见时触发
      const shouldFetchSecondary =
        forceAll ||
        lastSecondaryFetchTimeRef.current === 0 ||
        closedTradesRef.current.length === 0 ||
        tradeCountChanged ||
        tradeIdsChanged ||
        (document.visibilityState === 'visible' && timeSinceLastSecondary > 30000);

      if (shouldFetchSecondary) {
        lastSecondaryFetchTimeRef.current = now;

        // 串行执行重度数据库查询，让 SQLite / SQLAlchemy 连接池有充裕时间释放
        const summary = await targetClient.getProfitSummary().catch(() => null);
        if (summary) setProfitSummary(summary);

        // 获取最新 100 笔已平仓订单 (order_by_id: false 保证最新成交优先排在最前)
        const closed = await targetClient.getClosedTrades(100, false).catch(() => null);
        if (closed) {
          setClosedTrades(closed);
          closedTradesRef.current = closed;
        }

        // 获取近 30 日每日表现，覆盖跨月统计
        const daily = await targetClient.getDailyPerformance(30).catch(() => null);
        if (daily) setDailyRecords(daily);

        // Tier 3: 日志与信号统计更低频（仅在 forceAll 或间隔 90s 以上）
        if (forceAll || timeSinceLastSecondary > 90000 || lastSecondaryFetchTimeRef.current === now) {
          const sigs = await targetClient.getSignalStats().catch(() => null);
          if (sigs) setSignals(sigs);

          const logList = await targetClient.getLogs(60).catch(() => null);
          if (logList) setLogs(logList);
        }
      }
    } catch (err: any) {
      console.warn('Refresh data failed:', err);
      setIsConnected(false);
      setLastError(err?.message || '获取数据失败');
    } finally {
      isRefreshingRef.current = false;
    }
  }, [client]);

  // Switch to a specific bot
  const switchBot = useCallback(async (id: string): Promise<boolean> => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return false;

    setIsConnecting(true);
    setLastError(null);

    // Immediately purge previous bot's state so stale data is never shown
    setBotState(EMPTY_BOT_STATE);
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
    setClient(newClient);

    const ok = await newClient.ping();
    setIsConnecting(false);

    if (ok) {
      setIsConnected(true);
      setLastError(null);
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

    const isProtected = isReadOnly || Boolean(existing.isShared) || Boolean(existing.id?.startsWith('bot-url-'));

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
  }, [profiles, activeBotId, refreshData, isReadOnly]);

  // Delete profile
  const deleteProfile = useCallback((id: string) => {
    const remaining = profiles.filter((p) => p.id !== id);
    if (activeBotId === id) {
      const nextActive = remaining.length > 0 ? remaining[0].id : null;
      saveProfiles(remaining, nextActive);
      if (nextActive) {
        switchBot(nextActive);
      } else {
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
    if (activeProfile) {
      refreshData(undefined, true);
    }
  }, [activeProfile, refreshData]);

  // Live 6s Countdown ticker & Auto-refresh polling when actively connected
  useEffect(() => {
    if (!activeProfile || isSelectingBot) return;

    const timer = setInterval(() => {
      // 只有在标签页处于可见状态下才倒计时与轮询，完全避免后台隐秘消耗连接
      if (document.visibilityState === 'visible') {
        setRefreshCountdown((prev) => {
          if (prev <= 1) {
            refreshData();
            return 6;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeProfile, isSelectingBot, refreshData]);

  // Page Visibility: pause polling when tab is hidden, refresh immediately on visible
  useEffect(() => {
    if (!activeProfile || isSelectingBot) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setRefreshCountdown(6);
        refreshData(undefined, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeProfile, isSelectingBot, refreshData]);

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
      }}
    >
      {children}
      {shareToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 backdrop-blur text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-emerald-400/40 transition-all pointer-events-auto">
          <span>✨</span>
          <span>{shareToast}</span>
          <button
            onClick={() => setShareToast(null)}
            className="ml-1 p-0.5 rounded hover:bg-emerald-700/80 text-white/80 hover:text-white transition-colors cursor-pointer text-[11px]"
            title="关闭提示"
          >
            ✕
          </button>
        </div>
      )}
    </BotContext.Provider>
  );
}

export function useBot() {
  const ctx = useContext(BotContext);
  if (!ctx) throw new Error('useBot must be used within BotProvider');
  return ctx;
}
