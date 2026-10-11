import { useState, useEffect } from 'react';
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
import { CandleChartView } from './views/CandleChartView';
import { ActiveTradesView } from './views/ActiveTradesView';
import { ClosedTradesView } from './views/ClosedTradesView';
import { SignalsView } from './views/SignalsView';
import { BotControlView } from './views/BotControlView';
import { BotLogsView } from './views/BotLogsView';
import { EquityCurveView } from './views/EquityCurveView';
import { LoginGateView } from './views/LoginGateView';
import { BotSelectView } from './views/BotSelectView';
import { isNfiStrategy } from './utils/nfiSignals';
import { LocaleProvider, useT } from './i18n/LocaleContext';

const translateMenuLabel = (label: string): string => {
  if (!label) return label;
  if (label === 'Restore size') return 'Restore default size';
  if (label === 'Maximize') return 'Maximize current window';
  if (label === 'Float') return 'Float as separate window';
  if (label === 'Dock') return 'Dock back to workspace';
  if (label === 'Dock beside stage') return 'Dock beside dashboard';
  if (label.startsWith('Move ') && label.endsWith(' to')) {
    const title = label.slice(5, -3);
    return `Move "${title}" to`;
  }
  if (label === 'New split right') return 'Create split panel to the right';
  if (label === 'New split below') return 'Create split panel below';
  if (label === 'Hide') return 'Hide current panel';
  if (label.startsWith('Close ')) {
    const title = label.slice(6);
    return `Close "${title}"`;
  }
  if (label === 'Close other tabs') return 'Close other tabs';
  return label;
};

const localizeTrellisMenu = (entries: any[]): any[] => {
  return entries.map((entry) => {
    if (typeof entry === 'string') return entry;
    const localized = { ...entry };
    if (localized.label) {
      localized.label = translateMenuLabel(localized.label);
    }
    if (Array.isArray(localized.items)) {
      localized.items = localizeTrellisMenu(localized.items);
    }
    return localized;
  });
};

function DashboardWorkspace() {
  const { theme, botState } = useBot();
  const t = useT();

  return (
    <div
      className={`flex flex-col w-screen h-screen overflow-hidden font-sans transition-colors ${
        theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <HeaderBar />

      <main className="flex-1 w-full min-h-0 relative">
        <Workspace
          theme={theme === 'dark' ? 'dark' : 'light'}
          storageKey="frequi-trellis:layout:v9"
          version={9}
          panelMenu={localizeTrellisMenu}
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
            <CandleChartView />
          </ViewType>

          <ViewType
            id="signals"
            title={() => (isNfiStrategy(botState.strategy) ? 'NFI Strategy Signal Rankings' : 'Strategy Signal Performance')}
            singleton
          >
            <SignalsView />
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
            <ClosedTradesView />
          </ViewType>

          <ViewType
            id="logs"
            title={t('view.bot_logs')}
            singleton
          >
            <BotLogsView />
          </ViewType>

          <ViewType
            id="equity_curve"
            title={t('view.equity_curve')}
            singleton
          >
            <EquityCurveView />
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
