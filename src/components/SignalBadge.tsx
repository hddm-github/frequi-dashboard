import { parseNfiSignal } from '../utils/nfiSignals';
import { useLocale } from '../i18n/LocaleContext';
import { Tag } from 'lucide-react';

const SIGNAL_CATEGORY_EN: Record<string, string> = {
  '常规入场': 'Regular entry',
  '做空信号体系': 'Short signal system',
  '高频超短头皮': 'High-frequency scalping',
  '头部主流大币': 'Large-cap leaders',
  '趋势波段多头': 'Trend swing long',
  '放量拉升追多': 'Volume breakout long',
  '超跌快速反弹': 'Oversold rebound',
  '回调低吸加仓': 'Pullback accumulation',
  '策略信号': 'Strategy signal',
};

interface SignalBadgeProps {
  tag?: string | null;
  className?: string;
  showIcon?: boolean;
  forceNfi?: boolean;
}

export function SignalBadge({ tag, className = '', showIcon = true }: SignalBadgeProps) {
  const info = parseNfiSignal(tag);
  const { locale, t } = useLocale();
  const category = locale === 'en' ? SIGNAL_CATEGORY_EN[info.category] || info.category : info.category;
  const rawTag = tag || t('ui.hidden');

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 select-none ${info.colorClasses} ${className}`}
      title={`${locale === 'en' ? category : info.description} (${locale === 'en' ? 'raw entry tag' : '原始入场标签'}: ${rawTag})`}
    >
      {showIcon && <Tag className="w-2.5 h-2.5 shrink-0 opacity-70" />}
      <span className="font-mono font-bold">{info.code}</span>
      {info.category && info.category !== info.code && (
        <>
          <span className="opacity-40">·</span>
          <span className="font-sans truncate max-w-[90px]">{category}</span>
        </>
      )}
    </span>
  );
}
