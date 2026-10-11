// 中文字典 (Chinese dictionary)
export const zh: Record<string, string> = {
  // Navigation & Views
  'view.frequi_dashboard': 'FreqUI 主运行看板',
  'view.bot_control': '机器人控制台',
  'view.bot_select': '多机器人切换',
  'view.candle_chart': 'K线图表',
  'view.signals': 'NFI 信号分析',
  'view.active_trades': '当前持仓',
  'view.closed_trades': '历史交易',
  'view.equity_curve': '资产收益曲线',
  'view.bot_logs': '运行日志',

  // Header
  'header.running': '运行中',
  'header.stopped': '已停止',
  'header.connected': '已连接',
  'header.connecting': '连接中...',
  'header.disconnected': '已断开',
  'header.theme_toggle': '切换白天 / 暗黑主题',
  'header.language_toggle': '切换语言 (EN / 中文)',

  // Login
  'login.title': '连接 Freqtrade 机器人',
  'login.subtitle': 'FreqUI Trellis 交易工作区',
  'login.tagline': 'Freqtrade 量化策略监控与多窗口交易工作区',
  'login.cors_hint': '支持填写任意远程或本地服务地址，系统已内置通用动态代理，彻底免除跨域 (CORS) 限制。',
  'login.username': 'API 用户名 (Username)',
  'login.password': 'API 密码 (Password)',
  'login.connect': '保存并连接',
  'login.test_failed': '连接失败，请检查地址与凭据。',
  'login.readonly_hint': '只读访客无需输入密码。',
  'login.default_bot_name': 'Freqtrade 机器人',
  'login.error_unknown': '连接异常，请重试。',
  'login.footer': 'FreqUI · 100% 真实交易数据直连',

  // Logs toolbar
  'logs.autoscroll_on': '自动滚动: 开启',
  'logs.autoscroll_off': '自动滚动: 关闭',
  'logs.autoscroll_title': '切换是否自动滚动至最新日志',
  'logs.refresh': '刷新日志',
  'logs.all_levels': '全部级别',
  'logs.tail_logs': 'Bot Tail Logs ({count} 条)',
};
