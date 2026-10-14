import { useState, useEffect, lazy, Suspense } from 'react';
import {
  WorkspaceProvider,
  Workspace,
  ViewType,
  Split,
  Stage,
  Panel,
  View,
} from '@danfessler/trellis-react';
import { BotProvider, useBot } from './context/BotContext';
import { HeaderBar } from './components/HeaderBar';
import { MobileWorkspace } from './components/MobileWorkspace';
import { FreqUIDashboardView } from './views/FreqUIDashboardView';
import { ActiveTradesView } from './views/ActiveTradesView';
import { BotControlView } from './views/BotControlView';
import { LoginGateView } from './views/LoginGateView';
import { BotSelectView } from './views/BotSelectView';
import { isNfiStrategy } from './utils/nfiSignals';
import { LocaleProvider, useLocale } from './i18n/LocaleContext';

// ── Code-split heavy views for faster initial bundle ──
const CandleChartView = lazy(() => import('./views/CandleChartView').then(m => ({ default: m.CandleChartView })));
const SignalsView = lazy(() => import('./views/SignalsView').then(m => ({ default: m.SignalsView })));
const ClosedTradesView = lazy(() => import('./views/ClosedTradesView').then(m => ({ default: m.ClosedTradesView })));
const BotLogsView = lazy(() => import('./views/BotLogsView').then(m => ({ default: m.BotLogsView })));
const EquityCurveView = lazy(() => import('./views/EquityCurveView').then(m => ({ default: m.EquityCurveView })));

const LazyFallback = () => (
  <div className="flex items-center justify-center h-full opacity-40 text-xs">Loading…</div>
);

const translateMenuLabel = (label: string, locale: 'zh' | 'en'): string => {
  if (!label) return label;
  const isZh = locale === 'zh';
  if (label === 'Restore size') return isZh ? '恢复默认尺寸' : 'Restore default size';
  if (label === 'Maximize') return isZh ? '最大化窗口' : 'Maximize current window';
  if (label === 'Float') return isZh ? '浮动为独立窗口' : 'Float as separate window';
  if (label === 'Dock') return isZh ? '停靠回工作区' : 'Dock back to workspace';
  if (label === 'Dock beside stage') return isZh ? '停靠在舞台侧边' : 'Dock beside dashboard';
  if (label.startsWith('Move ') && label.endsWith(' to')) {
    const title = label.slice(5, -3);
    return isZh ? `移动 "${title}" 至` : `Move "${title}" to`;
  }
  if (label === 'New split right') return isZh ? '向右分屏' : 'Create split panel to the right';
  if (label === 'New split below') return isZh ? '向下分屏' : 'Create split panel below';
  if (label === 'Hide') return isZh ? '隐藏此面板' : 'Hide current panel';
  if (label.startsWith('Close ')) {
    const title = label.slice(6);
    return isZh ? `关闭 "${title}"` : `Close "${title}"`;
  }
  if (label === 'Close other tabs') return isZh ? '关闭其他标签页' : 'Close other tabs';
  return label;
};

const localizeTrellisMenu = (entries: any[], locale: 'zh' | 'en'): any[] => {
  return entries.map((entry) => {
    if (typeof entry === 'string') return entry;
    const localized = { ...entry };
    if (localized.label) {
      localized.label = translateMenuLabel(localized.label, locale);
    }
    if (Array.isArray(localized.items)) {
      localized.items = localizeTrellisMenu(localized.items, locale);
    }
    return localized;
  });
};

function DashboardWorkspace() {
  const { theme, botState } = useBot();
  const { locale, t } = useLocale();

  return (
    <div
      className={`flex flex-col w-full max-w-full h-[100dvh] overflow-hidden font-sans transition-colors ${
        theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <HeaderBar />

      <main className="flex-1 w-full min-h-0 relative">
        <Workspace
          theme={theme === 'dark' ? 'dark' : 'light'}
          storageKey="frequi-trellis:layout:v9"
          version={9}
          panelMenu={(entries) => localizeTrellisMenu(entries, locale)}
        >
          {/* Register all View Types */}
          <ViewType
            id="frequi_dashboard"
            title={t('view.frequi_dashboard')}
            placement="stage"
            singleton
          >
            <FreqUIDashboardView />
          </ViewType>

          <ViewType
            id="chart"
            title={(v) => (v.params?.pair ? `${t('view.candle_chart')} - ${v.params.pair}` : t('view.candle_chart'))}
            singleton
          >
            <Suspense fallback={<LazyFallback />}><CandleChartView /></Suspense>
          </ViewType>

          <ViewType
            id="signals"
            title={() => (isNfiStrategy(botState.strategy) ? t('ui.nfi_signal_rankings') : t('view.signals'))}
            singleton
          >
            <Suspense fallback={<LazyFallback />}><SignalsView /></Suspense>
          </ViewType>

          <ViewType
            id="active_trades"
            title={t('view.active_trades')}
            singleton
          >
            <ActiveTradesView />
          </ViewType>

          <ViewType
            id="bot_control"
            title={t('view.bot_control')}
            singleton
          >
            <BotControlView />
          </ViewType>

          <ViewType
            id="closed_trades"
            title={t('view.closed_trades')}
            singleton
          >
            <Suspense fallback={<LazyFallback />}><ClosedTradesView /></Suspense>
          </ViewType>

          <ViewType
            id="logs"
            title={t('view.bot_logs')}
            singleton
          >
            <Suspense fallback={<LazyFallback />}><BotLogsView /></Suspense>
          </ViewType>

          <ViewType
            id="equity_curve"
            title={t('view.equity_curve')}
            singleton
          >
            <Suspense fallback={<LazyFallback />}><EquityCurveView /></Suspense>
          </ViewType>

          {/* FreqUI Standard + Trellis Docking Layout */}
          <Split axis="x" weights={[2.6, 1.2]}>
            {/* Main Stage: Full FreqUI Dashboard & Charts */}
            <Stage>
              <Panel>
                <View type="frequi_dashboard" />
                <View type="equity_curve" />
                <View type="chart" />
                <View type="signals" />
              </Panel>
            </Stage>

            {/* Right Side: Bot Controls & Logs */}
            <Split axis="y" weights={[1.4, 1.0]}>
              <Panel>
                <View type="bot_control" />
                <View type="active_trades" />
              </Panel>
              <Panel>
                <View type="logs" />
                <View type="closed_trades" />
              </Panel>
            </Split>
          </Split>
        </Workspace>
      </main>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

function AppRoot() {
  const { profiles, isSelectingBot } = useBot();
  const isMobile = useIsMobile();

  // If no bots configured, force user to log in at least one bot
  if (profiles.length === 0) {
    return <LoginGateView />;
  }

  // If user requested bot selection list
  if (isSelectingBot) {
    return <BotSelectView />;
  }

  // Mobile viewport: clean single-view layout with bottom navigation bar
  if (isMobile) {
    return <MobileWorkspace />;
  }

  // Desktop viewport: advanced multi-docked Trellis workspace
  return (
    <WorkspaceProvider>
      <DashboardWorkspace />
    </WorkspaceProvider>
  );
}

export function App() {
  return (
    <LocaleProvider>
      <BotProvider>
        <AppRoot />
      </BotProvider>
    </LocaleProvider>
  );
}

export default App;
