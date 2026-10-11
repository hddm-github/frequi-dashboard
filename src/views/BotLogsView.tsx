import { useState, useRef, useEffect } from 'react';
import { useBot } from '../context/BotContext';
import { Terminal, Filter, RefreshCw, ArrowDown } from 'lucide-react';
import { formatUtc8 } from '../utils/dateUtils';
import { useT } from '../i18n/LocaleContext';

export function BotLogsView() {
  const { logs, refreshData, theme } = useBot();
  const t = useT();
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const isDark = theme === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

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
          <span className="font-semibold">{t('logs.tail_logs').replace('{count}', String(logs.length))}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !autoScroll;
              setAutoScroll(next);
              if (next && scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans transition-colors cursor-pointer border ${
              autoScroll
                ? isDark
                  ? 'bg-cyan-950/60 border-cyan-700/80 text-cyan-300'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-700 font-medium'
                : isDark
                ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-300'
                : 'bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-700'
            }`}
            title={t('logs.autoscroll_title')}
          >
            <ArrowDown className={`w-3 h-3 ${autoScroll ? 'text-cyan-400' : 'text-slate-400 opacity-60'}`} />
            <span>{autoScroll ? t('logs.autoscroll_on') : t('logs.autoscroll_off')}</span>
          </button>

          <button
            onClick={() => refreshData()}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title={t('logs.refresh')}
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
              <option value="ALL">{t('logs.all_levels')}</option>
              <option value="INFO">{t('logs.info_only')}</option>
              <option value="WARNING">{t('logs.warning_only')}</option>
              <option value="ERROR">{t('logs.error_only')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2.5 space-y-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-10">{t('logs.empty')}</div>
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
