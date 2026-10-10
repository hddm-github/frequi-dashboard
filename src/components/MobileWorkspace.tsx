import { useState } from 'react';
import { useBot } from '../context/BotContext';
import { HeaderBar } from './HeaderBar';
import { FreqUIDashboardView } from '../views/FreqUIDashboardView';
import { CandleChartView } from '../views/CandleChartView';
import { ActiveTradesView } from '../views/ActiveTradesView';
import { ClosedTradesView } from '../views/ClosedTradesView';
import { SignalsView } from '../views/SignalsView';
import { BotControlView } from '../views/BotControlView';
import { BotLogsView } from '../views/BotLogsView';
import { EquityCurveView } from '../views/EquityCurveView';
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
} from 'lucide-react';
import { isNfiStrategy } from '../utils/nfiSignals';
import { ConnectModal } from './ConnectModal';

export function MobileWorkspace() {
  const { theme, mobileTab, setMobileTab, activeTrades, botState, setIsSelectingBot } = useBot();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const isDark = theme === 'dark';

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
        return <CandleChartView />;
      case 'active_trades':
        return <ActiveTradesView />;
      case 'closed_trades':
        return <ClosedTradesView />;
      case 'equity_curve':
        return <EquityCurveView />;
      case 'signals':
        return <SignalsView />;
      case 'logs':
        return <BotLogsView />;
      case 'bot_control':
        return <BotControlView />;
      default:
        return <FreqUIDashboardView />;
    }
  };

  const getSecondaryTitle = () => {
    switch (mobileTab) {
      case 'equity_curve':
        return '资产净值收益曲线';
      case 'signals':
        return isNfiStrategy(botState.strategy) ? 'NFI 策略信号榜' : '策略信号收益榜';
      case 'logs':
        return '机器人运行日志';
      case 'bot_control':
        return '机器人控制台';
      default:
        return '';
    }
  };

  return (
    <div
      className={`flex flex-col w-screen h-[100dvh] overflow-hidden font-sans transition-colors ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <HeaderBar />

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
            <span>返回功能列表</span>
          </button>
          <span className="text-slate-400 font-medium">{getSecondaryTitle()}</span>
        </div>
      )}

      {/* Main View Area (100% full screen width, smoothly scrollable) */}
      <main className="flex-1 w-full min-h-0 relative overflow-hidden select-text">
        {renderActiveView()}

        {/* More Functions Bottom Drawer */}
        {showMoreMenu && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end"
            onClick={() => setShowMoreMenu(false)}
          >
            <div
              className={`rounded-t-2xl p-4 border-t shadow-2xl transition-all ${
                isDark ? 'bg-[#131b2e] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-400/30 rounded-full mx-auto mb-3" />
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                更多应用与分析
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
                    <div className="text-xs font-bold truncate">净值收益曲线</div>
                    <div className="text-[10px] text-slate-500 truncate">复利收益与回撤</div>
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
                    <div className="text-xs font-bold truncate">策略信号榜</div>
                    <div className="text-[10px] text-slate-500 truncate">各买入标签胜率</div>
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
                    <div className="text-xs font-bold truncate">运行日志</div>
                    <div className="text-[10px] text-slate-500 truncate">实时执行与告警</div>
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
                    <div className="text-xs font-bold truncate">控制台</div>
                    <div className="text-[10px] text-slate-500 truncate">启停与重载配置</div>
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
                  <span>接入新机器人</span>
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
                  <span>节点列表</span>
                </button>
              </div>

              <button
                onClick={() => setShowMoreMenu(false)}
                className={`mt-2 w-full py-2.5 rounded-xl text-center text-xs font-semibold border cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800/80 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Connect Modal for Mobile */}
        <ConnectModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      </main>

      {/* Mobile Bottom Navigation Bar (安全区吸底，单手触控秒切) */}
      <nav
        className={`shrink-0 border-t z-30 pt-1.5 pb-[max(env(safe-area-inset-bottom),8px)] px-1 flex items-center justify-around transition-colors ${
          isDark
            ? 'bg-[#0f1626]/95 border-slate-800/90 text-slate-400 backdrop-blur-md'
            : 'bg-white/95 border-slate-200 text-slate-500 backdrop-blur-md shadow-lg'
        }`}
      >
        {/* Tab 1: 看板 */}
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
          <span>看板</span>
        </button>

        {/* Tab 2: K线 */}
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
          <span>K线</span>
        </button>

        {/* Tab 3: 持仓 */}
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
          <span>持仓</span>
        </button>

        {/* Tab 4: 平仓 */}
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
          <span>平仓</span>
        </button>

        {/* Tab 5: 更多 */}
        <button
          onClick={() => setShowMoreMenu(true)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-all cursor-pointer ${
            isSecondaryView
              ? 'text-emerald-500 font-bold scale-105'
              : 'hover:text-slate-300'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 shrink-0" />
          <span>更多</span>
        </button>
      </nav>
    </div>
  );
}
