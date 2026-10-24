import { useState, useRef, useEffect } from 'react';
import { useBot } from '../context/BotContext';
import { Terminal, Filter, RefreshCw } from 'lucide-react';
import { useT } from '../i18n/LocaleContext';

function parseLogTimestamp(raw: string): { fullDate: string; time: string } {
  if (!raw) return { fullDate: '', time: '-' };
  const s = raw.replace('T', ' ').replace(',', '.');
  const parts = s.split(' ');
  if (parts.length >= 2) {
    return { fullDate: parts[0], time: parts[1].slice(0, 8) };
  }
  return { fullDate: s.slice(0, 10), time: s.slice(11, 19) || s.slice(0, 8) };
}

export function BotLogsView() {
  const { logs, logLimit, fetchLogs, isLoadingLogs, theme } = useBot();
  const t = useT();
  const levelLabel = (level: string) => t(`logs.level_${level.toLowerCase()}`, level);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const isDark = theme === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length === 0) {
      fetchLogs(logLimit);
    }
  }, [fetchLogs, logLimit, logs.length]);

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
        className={`flex items-center justify-between gap-2 px-3 py-1.5 border-b text-[11px] shrink-0 ${
          isDark ? 'border-slate-800/80 bg-slate-900/70' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <select
            value={logLimit}
            onChange={(e) => fetchLogs(Number(e.target.value))}
            disabled={isLoadingLogs}
            className={`border rounded px-2 py-0.5 text-[10px] font-sans font-medium focus:outline-none cursor-pointer transition-colors ${
              isDark
                ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-slate-600 focus:border-cyan-500'
                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 focus:border-cyan-500'
            }`}
            title="Tail lines"
            aria-label="Tail lines"
          >
            <option value="50">50 lines</option>
            <option value="100">100 lines</option>
            <option value="500">500 lines</option>
            <option value="1000">1,000 lines</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium transition-all cursor-pointer border ${
              autoScroll
                ? isDark
                  ? 'bg-cyan-950/70 border-cyan-700/80 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-700 font-semibold'
                : isDark
                ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-300'
                : 'bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-700'
            }`}
            title={t('logs.autoscroll_title')}
            aria-label={t('logs.autoscroll_title')}
            aria-pressed={autoScroll}
          >
            <RefreshCw
              className={`w-3 h-3 ${
                isLoadingLogs
                  ? 'animate-spin text-cyan-400'
                  : autoScroll
                  ? 'text-cyan-400'
                  : 'text-slate-400 opacity-60'
              }`}
            />
            <span className="hidden sm:inline">{t('logs.autoscroll')}</span>
          </button>

          <div className="flex items-center gap-1">
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
            const { fullDate, time } = parseLogTimestamp(log.timestamp);
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
                className={`leading-relaxed p-1 rounded flex items-start gap-1.5 sm:gap-2 ${
                  isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-100'
                }`}
              >
                <span
                  className="text-slate-600 dark:text-slate-400 text-[10px] shrink-0 font-mono"
                  title={fullDate ? `${fullDate} ${time}` : time}
                >
                  <span className="hidden sm:inline opacity-70">{fullDate} </span>
                  <span className="font-medium text-slate-500 dark:text-slate-300">{time}</span>
                </span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-bold shrink-0 ${levelColor}`}>
                  {levelLabel(log.level)}
                </span>
                <span className="break-all flex-1 min-w-0">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
