import { useState, type FormEvent } from 'react';
import { useBot } from '../context/BotContext';
import { Server, ShieldCheck, AlertCircle, ArrowRight, Sun, Moon, Loader2 } from 'lucide-react';
import { normalizeApiUrl } from '../api/client';

export function LoginGateView() {
  const { addProfile, theme, setTheme, lastError } = useBot();
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8080');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await addProfile({
        name: name.trim() || 'Freqtrade 机器人',
        apiUrl: normalizeApiUrl(apiUrl),
        username: username.trim(),
        password: password.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.error || lastError || '无法连接到该端点，请检查 API 基础地址和账号密码');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '连接异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-screen flex flex-col justify-between transition-colors ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Top Bar with Brand & Theme Switcher */}
      <header
        className={`px-6 py-4 flex items-center justify-between border-b transition-colors ${
          isDark ? 'border-slate-800 bg-[#0f1626]/90' : 'border-slate-200 bg-white/80'
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center font-bold text-sm text-white shadow-md">
            F
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
              <span>FreqUI</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                Live
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Freqtrade 量化策略监控与多窗口交易工作区
            </div>
          </div>
        </div>

        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            isDark
              ? 'border-slate-700 bg-[#1a233a] text-amber-400 hover:bg-[#222e4c]'
              : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          title="切换白天 / 暗黑主题"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="hidden sm:inline font-mono">{isDark ? '白天模式' : '暗黑模式'}</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div
          className={`w-full max-w-md rounded-2xl border shadow-xl p-6 sm:p-8 transition-colors ${
            isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3">
              <Server className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">接入首个 Freqtrade 机器人</h1>
            <p className="text-xs text-slate-500 mt-1">
              连接运行在云服务器或本地的 Freqtrade 机器人节点（100% 真实 REST API 直连）
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="break-all">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                机器人备注名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: 实盘策略机器人 #1"
                className={`w-full border rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:border-emerald-500 transition-colors ${
                  isDark
                    ? 'bg-[#1a233a] border-slate-700 text-slate-100 placeholder:text-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Freqtrade 服务地址 (Base URL)
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setApiUrl('http://127.0.0.1:8080')}
                    className="px-2 py-0.5 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 text-slate-600 dark:text-slate-400 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    默认本地 (8080)
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiUrl('')}
                    className="px-2 py-0.5 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 text-slate-500 rounded text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    清空
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://127.0.0.1:8080 或 http://服务器IP:端口"
                className={`w-full border rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                  isDark
                    ? 'bg-[#1a233a] border-slate-700 text-slate-100 placeholder:text-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                支持填写任意远程或本地服务地址，系统已内置通用动态代理，彻底免除跨域 (CORS) 限制。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  API 用户名 (Username)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如: freqtrade"
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                    isDark
                      ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  API 密码 (Password)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-emerald-500 transition-colors ${
                    isDark
                      ? 'bg-[#1a233a] border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在验证并连接 Freqtrade 端点...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>测试连接并登录进入看板</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500">
        FreqUI · 100% 真实交易数据直连
      </footer>
    </div>
  );
}
