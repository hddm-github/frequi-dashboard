import { useState } from 'react';
import { useBot } from '../context/BotContext';
import { Terminal, Filter, RefreshCw } from 'lucide-react';
import { formatUtc8 } from '../utils/dateUtils';

export function BotLogsView() {
  const { logs, refreshData, theme } = useBot();
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const isDark = theme === 'dark';

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  return (
    <div
      className={`flex flex-col h-full overflow-hidden font-mono text-xs transition-colors ${
        isDark ? 'bg-[#0a0f1d] text-slate-200' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Log toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b text-[11px] ${
          isDark ? 'border-slate-800/80 bg-slate-900/70' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-1.5 text-slate-500">
          <Terminal className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-semibold">Bot Tail Logs ({logs.length} 条)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshData()}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="刷新日志"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-slate-500" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className={`border rounded px-1.5 py-0.5 text-[10px] focus:outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <option value="ALL">全部级别</option>
              <option value="INFO">仅 INFO</option>
              <option value="WARNING">仅 WARNING</option>
              <option value="ERROR">仅 ERROR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-10">暂无日志流或等待刷新中...</div>
        ) : (
          filteredLogs.map((log) => {
            const levelColor =
              log.level === 'ERROR'
                ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                : log.level === 'WARNING'
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400'
                : log.level === 'DEBUG'
                ? 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400'
                : 'text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 dark:text-cyan-400';

            return (
              <div
                key={log.id}
                className={`leading-relaxed p-1 rounded flex items-start gap-2 ${
                  isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-100'
                }`}
              >
                <span className="text-slate-600 dark:text-slate-400 text-[10px] shrink-0 font-mono">
                  {formatUtc8(log.timestamp, 'YYYY-MM-DD HH:mm:ss')}
                </span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-bold shrink-0 ${levelColor}`}>
                  {log.level}
                </span>
                <span className="break-all">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
