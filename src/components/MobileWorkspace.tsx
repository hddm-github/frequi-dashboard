import { useState, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useBot } from '../context/BotContext';
import { HeaderBar } from './HeaderBar';
import { FreqUIDashboardView } from '../views/FreqUIDashboardView';
import { ActiveTradesView } from '../views/ActiveTradesView';
import { BotControlView } from '../views/BotControlView';
import {
  BarChart3,
  CandlestickChart,
  Layers,
  History,
  MoreHorizontal,
  TrendingUp,
  Terminal,
  Trophy,
  Cpu,
  ChevronLeft,
  Plus,
  Server,
  RefreshCw,
} from 'lucide-react';
import { isNfiStrategy } from '../utils/nfiSignals';
import { ConnectModal } from './ConnectModal';
import { useT } from '../i18n/LocaleContext';

// ── Code-split heavy views (shared chunks with App.tsx) ──
const CandleChartView = lazy(() => import('../views/CandleChartView').then(m => ({ default: m.CandleChartView })));
const ClosedTradesView = lazy(() => import('../views/ClosedTradesView').then(m => ({ default: m.ClosedTradesView })));
const SignalsView = lazy(() => import('../views/SignalsView').then(m => ({ default: m.SignalsView })));
const BotLogsView = lazy(() => import('../views/BotLogsView').then(m => ({ default: m.BotLogsView })));
const EquityCurveView = lazy(() => import('../views/EquityCurveView').then(m => ({ default: m.EquityCurveView })));

const LazyFallback = () => (
  <div className="flex items-center justify-center h-full opacity-40 text-xs">Loading…</div>
);

export function MobileWorkspace() {
  const { theme, mobileTab, setMobileTab, activeTrades, botState, setIsSelectingBot, isConnecting, refreshData } = useBot();
  const t = useT();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Pull down to refresh touch tracking
  const [pullY, setPullY] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const startYRef = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  const isDark = theme === 'dark';
  const isFixedViewportView = mobileTab === 'chart' || mobileTab === 'logs';

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFixedViewportView) return;
    if (mainRef.current && mainRef.current.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
    } else {
      startYRef.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isFixedViewportView || isPullRefreshing || startYRef.current === 0) return;
    if (mainRef.current && mainRef.current.scrollTop <= 0) {
      const deltaY = e.touches[0].clientY - startYRef.current;
      if (deltaY > 0) {
        const damped = Math.min(Math.pow(deltaY, 0.85), 60);
        setPullY(damped);
      } else {
        setPullY(0);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (isFixedViewportView || isPullRefreshing) return;
    if (pullY >= 42) {
      setIsPullRefreshing(true);
      setPullY(42);
      try {
        await refreshData(undefined, true);
      } finally {
        setTimeout(() => {
          setIsPullRefreshing(false);
          setPullY(0);
        }, 400);
      }
    } else {
      setPullY(0);
    }
    startYRef.current = 0;
  };

  const isSecondaryView = [
    'equity_curve',
    'signals',
    'logs',
    'bot_control',
  ].includes(mobileTab);

  const renderActiveView = () => {
    switch (mobileTab) {
      case 'frequi_dashboard':
        return <FreqUIDashboardView />;
      case 'chart':
        return <Suspense fallback={<LazyFallback />}><CandleChartView /></Suspense>;
      case 'active_trades':
        return <ActiveTradesView />;
      case 'closed_trades':
        return <Suspense fallback={<LazyFallback />}><ClosedTradesView /></Suspense>;
      case 'equity_curve':
        return <Suspense fallback={<LazyFallback />}><EquityCurveView /></Suspense>;
      case 'signals':
        return <Suspense fallback={<LazyFallback />}><SignalsView /></Suspense>;
      case 'logs':
        return <Suspense fallback={<LazyFallback />}><BotLogsView /></Suspense>;
      case 'bot_control':
        return <BotControlView />;
      default:
        return <FreqUIDashboardView />;
    }
  };

  const getSecondaryTitle = () => {
    switch (mobileTab) {
      case 'equity_curve':
        return t('mobile.equity');
      case 'signals':
        return isNfiStrategy(botState.strategy) ? t('mobile.signals') : t('mobile.signals');
      case 'logs':
        return t('mobile.logs');
      case 'bot_control':
        return t('mobile.control');
      default:
        return '';
    }
  };

  return (
    <div
      className={`flex flex-col w-full h-[100dvh] overflow-hidden font-sans transition-colors ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <HeaderBar />

      {isConnecting && (
        <div className={`shrink-0 flex items-center justify-center gap-2 px-3 py-1 text-[11px] border-b ${
          isDark ? 'bg-[#10192b] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
        }`} role="status" aria-live="polite">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <span>{t('login.connecting')}</span>
        </div>
      )}

      {/* Sub-header for secondary pages */}
      {isSecondaryView && (
        <div
          className={`shrink-0 px-3 py-1.5 flex items-center justify-between border-b text-xs font-semibold ${
            isDark ? 'bg-[#0f1626] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <button
            onClick={() => {
              setShowMoreMenu(true);
              setMobileTab('frequi_dashboard');
            }}
            className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t('mobile.back')}</span>
          </button>
          <span className="text-slate-400 font-medium">{getSecondaryTitle()}</span>
        </div>
      )}

      {/* Main View Area (100% full screen width, smoothly scrollable with momentum) */}
      <main
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 w-full min-h-0 relative select-text transition-colors ${
          isFixedViewportView
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch] pb-24'
        }`}
      >
        {/* Pull Down to Refresh Visual Indicator */}
        {pullY > 0 && (
          <div
            style={{ height: `${pullY}px` }}
            className="w-full flex items-center justify-center overflow-hidden text-xs font-semibold text-emerald-500 gap-1.5 transition-all bg-emerald-500/10 border-b border-emerald-500/20 shrink-0 select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPullRefreshing || pullY >= 42 ? 'animate-spin text-emerald-500' : 'text-slate-400'}`} />
            <span>
              {isPullRefreshing
                ? t('login.connecting')
                : pullY >= 42
                ? t('header.release_to_refresh')
                : t('header.pull_to_refresh')}
            </span>
          </div>
        )}

        {renderActiveView()}

        {/* More Functions Bottom Drawer */}
        {showMoreMenu && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex flex-col justify-end overscroll-contain"
            onClick={() => setShowMoreMenu(false)}
          >
            <div
              className={`max-h-[85dvh] overflow-y-auto rounded-t-2xl p-4 border-t shadow-2xl transition-all ${
                isDark ? 'bg-[#131b2e] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-400/30 rounded-full mx-auto mb-3" />
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                {t('mobile.more')}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setMobileTab('equity_curve');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                    mobileTab === 'equity_curve'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : isDark
                      ? 'border-slate-800 bg-[#0f1626] hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{t('mobile.equity')}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t('mobile.equity_desc')}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setMobileTab('signals');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                    mobileTab === 'signals'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : isDark
                      ? 'border-slate-800 bg-[#0f1626] hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{t('mobile.signals')}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t('mobile.signals_desc')}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setMobileTab('logs');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                    mobileTab === 'logs'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : isDark
                      ? 'border-slate-800 bg-[#0f1626] hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <Terminal className="w-5 h-5 text-cyan-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{t('mobile.logs')}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t('mobile.logs_desc')}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setMobileTab('bot_control');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                    mobileTab === 'bot_control'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : isDark
                      ? 'border-slate-800 bg-[#0f1626] hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <Cpu className="w-5 h-5 text-purple-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{t('mobile.control')}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t('mobile.control_desc')}</div>
                  </div>
                </button>
              </div>

              {/* Bot Node Management for Mobile */}
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowAddModal(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('mobile.connect')}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setIsSelectingBot(true);
                  }}
                  className={`py-2 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isDark
                      ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200'
                      : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <Server className="w-4 h-4 text-cyan-500" />
                  <span>{t('mobile.nodes')}</span>
                </button>
              </div>

              <button
                onClick={() => setShowMoreMenu(false)}
                className={`mt-2 w-full py-2.5 rounded-xl text-center text-xs font-semibold border cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800/80 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}
              >
                {t('mobile.cancel')}
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Connect Modal for Mobile */}
        <ConnectModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      </main>

      {/* Mobile Bottom Navigation Bar (safe-area bottom navigation) */}
      <nav
        className={`shrink-0 border-t z-30 pt-1.5 pb-[max(env(safe-area-inset-bottom),8px)] px-1 flex items-center justify-around transition-colors ${
          isDark
            ? 'bg-[#0f1626]/95 border-slate-800/90 text-slate-400 backdrop-blur-md'
            : 'bg-white/95 border-slate-200 text-slate-500 backdrop-blur-md shadow-lg'
        }`}
      >
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => {
            setShowMoreMenu(false);
            setMobileTab('frequi_dashboard');
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-all cursor-pointer ${
            mobileTab === 'frequi_dashboard'
              ? 'text-emerald-500 font-bold scale-105'
              : 'hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-5 h-5 shrink-0" />
          <span>{t('mobile.dashboard')}</span>
        </button>

        {/* Tab 2: Candles */}
        <button
          onClick={() => {
            setShowMoreMenu(false);
            setMobileTab('chart');
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-all cursor-pointer ${
            mobileTab === 'chart'
              ? 'text-emerald-500 font-bold scale-105'
              : 'hover:text-slate-300'
          }`}
        >
          <CandlestickChart className="w-5 h-5 shrink-0" />
          <span>{t('mobile.candles')}</span>
        </button>

        {/* Tab 3: Positions */}
        <button
          onClick={() => {
            setShowMoreMenu(false);
            setMobileTab('active_trades');
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-all relative cursor-pointer ${
            mobileTab === 'active_trades'
              ? 'text-emerald-500 font-bold scale-105'
              : 'hover:text-slate-300'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 shrink-0" />
            {activeTrades.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {activeTrades.length}
              </span>
            )}
          </div>
          <span>{t('mobile.positions')}</span>
        </button>

        {/* Tab 4: Close */}
        <button
          onClick={() => {
            setShowMoreMenu(false);
            setMobileTab('closed_trades');
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-all cursor-pointer ${
            mobileTab === 'closed_trades'
              ? 'text-emerald-500 font-bold scale-105'
              : 'hover:text-slate-300'
          }`}
        >
          <History className="w-5 h-5 shrink-0" />
          <span>{t('mobile.closed')}</span>
        </button>

        {/* Tab 5: More */}
        <button
          onClick={() => setShowMoreMenu(true)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-all cursor-pointer ${
            isSecondaryView
              ? 'text-emerald-500 font-bold scale-105'
              : 'hover:text-slate-300'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 shrink-0" />
          <span>{t('mobile.more_short')}</span>
        </button>
      </nav>
    </div>
  );
}
