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

const translateMenuLabel = (label: string): string => {
  if (!label) return label;
  if (label === 'Restore size') return '恢复默认大小';
  if (label === 'Maximize') return '最大化当前窗口';
  if (label === 'Float') return '悬浮独立窗口';
  if (label === 'Dock') return '停靠回工作区';
  if (label === 'Dock beside stage') return '停靠在主看板旁';
  if (label.startsWith('Move ') && label.endsWith(' to')) {
    const title = label.slice(5, -3);
    return `移动「${title}」至`;
  }
  if (label === 'New split right') return '向右拆分新建面板';
  if (label === 'New split below') return '向下拆分新建面板';
  if (label === 'Hide') return '隐藏当前面板';
  if (label.startsWith('Close ')) {
    const title = label.slice(6);
    return `关闭「${title}」`;
  }
  if (label === 'Close other tabs') return '关闭其他标签页';
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
            title="FreqUI 主运行看板"
            placement="stage"
            singleton
          >
            <FreqUIDashboardView />
          </ViewType>

          <ViewType
            id="chart"
            title={(v) => (v.params?.pair ? `K线 - ${v.params.pair}` : 'K线行情')}
            singleton
          >
            <CandleChartView />
          </ViewType>

          <ViewType
            id="signals"
            title={() => (isNfiStrategy(botState.strategy) ? 'NFI 策略信号排行榜' : '策略信号收益排行')}
            singleton
          >
            <SignalsView />
          </ViewType>

          <ViewType
            id="active_trades"
            title="活跃持仓监控"
            singleton
          >
            <ActiveTradesView />
          </ViewType>

          <ViewType
            id="bot_control"
            title="端点配置 & 机器人控制"
            singleton
          >
            <BotControlView />
          </ViewType>

          <ViewType
            id="closed_trades"
            title="历史成交流水"
            singleton
          >
            <ClosedTradesView />
          </ViewType>

          <ViewType
            id="logs"
            title="机器人运行日志"
            singleton
          >
            <BotLogsView />
          </ViewType>

          <ViewType
            id="equity_curve"
            title="资产净值收益曲线"
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
    <BotProvider>
      <AppRoot />
    </BotProvider>
  );
}

export default App;
