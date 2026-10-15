import { parseNfiSignal, translateStrategyTerm } from '../utils/nfiSignals';
import { useLocale } from '../i18n/LocaleContext';
import { Tag } from 'lucide-react';

interface SignalBadgeProps {
  tag?: string | null;
  className?: string;
  showIcon?: boolean;
  forceNfi?: boolean;
}

export function SignalBadge({ tag, className = '', showIcon = true }: SignalBadgeProps) {
  const { locale, t } = useLocale();
  const isZh = locale === 'zh';
  const info = parseNfiSignal(tag, isZh);

  // If in English mode, ensure category text is completely in English
  const category = isZh ? info.category : translateStrategyTerm(info.category);
  const rawTag = tag || t('ui.hidden');
  const tooltipTitle = isZh
    ? `${info.description} (原始入场标签: ${rawTag})`
    : `${translateStrategyTerm(info.description)} (raw entry tag: ${rawTag})`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 select-none ${info.colorClasses} ${className}`}
      title={tooltipTitle}
    >
      {showIcon && <Tag className="w-2.5 h-2.5 shrink-0 opacity-70" />}
      <span className="font-mono font-bold">{info.code}</span>
      {category && category !== info.code && (
        <>
          <span className="opacity-40">·</span>
          <span className="font-sans truncate max-w-[110px]">{category}</span>
        </>
      )}
    </span>
  );
}
