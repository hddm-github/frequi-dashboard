import { parseNfiSignal } from '../utils/nfiSignals';
import { Tag } from 'lucide-react';

interface SignalBadgeProps {
  tag?: string | null;
  className?: string;
  showIcon?: boolean;
  forceNfi?: boolean;
}

export function SignalBadge({ tag, className = '', showIcon = true }: SignalBadgeProps) {
  const info = parseNfiSignal(tag);

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 select-none ${info.bgLight} ${info.textLight} ${info.borderLight} dark:${info.bgDark} dark:${info.textDark} dark:${info.borderDark} ${className}`}
      title={`${info.description} (原始入场标签: ${tag || '无'})`}
    >
      {showIcon && <Tag className="w-2.5 h-2.5 shrink-0 opacity-70" />}
      <span className="font-mono font-bold">{info.code}</span>
      {info.category && info.category !== info.code && (
        <>
          <span className="opacity-40">·</span>
          <span className="font-sans truncate max-w-[90px]">{info.category}</span>
        </>
      )}
    </span>
  );
}
