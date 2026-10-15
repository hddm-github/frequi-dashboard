import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  EyeOff,
  Eye,
  Shield,
  Palette,
  Share2,
} from 'lucide-react';
import type { ShareCardData, ShareCardOptions, ShareTheme } from './shareTypes';
import { renderShareCardToCanvas } from './shareCanvas';
import { useLocale } from '../../i18n/LocaleContext';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareCardData | null;
}

export function ShareCardModal({ isOpen, onClose, data }: ShareCardModalProps) {
  const { locale, t } = useLocale();
  const isZh = locale === 'zh';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Card Options
  const [options, setOptions] = useState<ShareCardOptions>({
    hideAmounts: false,
    showBalance: true,
    showStrategy: true,
    showTradeDetails: true,
    showSignal: true,
    showDuration: true,
    theme: 'dark',
  });

  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Redraw canvas whenever options, data, or locale change
  useEffect(() => {
    if (!isOpen || !data || !canvasRef.current) return;
    renderShareCardToCanvas(canvasRef.current, data, options, isZh ? 'zh' : 'en');
  }, [isOpen, data, options, isZh]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyImage = useCallback(async () => {
    if (!canvasRef.current || isExporting) return;
    setIsExporting(true);
    setCopyFeedback(null);

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Canvas blob generation failed');
        }

        try {
          // Standard modern navigator.clipboard.write API
          if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
            const item = new (window as any).ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            setCopied(true);
            setCopyFeedback(isZh ? '图片已复制到剪贴板！可直接粘贴至微信/TG/Discord' : 'Image copied to clipboard!');
            setTimeout(() => {
              setCopied(false);
              setCopyFeedback(null);
            }, 3000);
          } else {
            // Fallback: download image if clipboard not supported
            handleDownloadImage();
            setCopyFeedback(isZh ? '当前浏览器不支持直接写入图片剪贴板，已为您自动下载' : 'Clipboard not supported, image downloaded instead');
          }
        } catch (clipErr) {
          console.warn('Clipboard write failed, fallback to download:', clipErr);
          handleDownloadImage();
          setCopyFeedback(isZh ? '剪贴板权限受限，已为您自动下载图片' : 'Clipboard restricted, image downloaded instead');
        } finally {
          setIsExporting(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy card image:', err);
      setIsExporting(false);
    }
  }, [isZh]);

  const handleDownloadImage = useCallback(() => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let filename = 'frequi-share-card';
      if (data) {
        if (data.type === 'dashboard') {
          filename = `frequi-dashboard-${timestamp}.png`;
        } else {
          const cleanPair = data.pair.replace(/[/:]/g, '_');
          filename = `frequi-trade-${cleanPair}-${timestamp}.png`;
        }
      }
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download card image:', err);
    }
  }, [data]);

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-hidden select-none">
      <div
        className="relative w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-2xl shadow-2xl border border-slate-700/80 bg-[#0d1322] text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0f1626] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('share.title')}</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  HD Retina 2x
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {t('share.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title={t('ui.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {copyFeedback && (
          <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{copyFeedback}</span>
          </div>
        )}

        {/* Modal Body: Left Canvas Preview, Right Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">
          {/* Left: Card Canvas Preview */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0">
            <div className="w-full max-w-[380px] sm:max-w-[420px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-[#0b0f19] flex items-center justify-center p-1 transition-all">
              <canvas
                ref={canvasRef}
                className="w-full h-auto block rounded-xl shadow-lg"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-2.5">
              {isZh ? '所见即所得 · 超高清无损矢量渲染' : 'WYSIWYG · Crisp Retina Rendering'}
            </span>
          </div>

          {/* Right: Controls & Toggles */}
          <div className="w-full md:w-80 flex flex-col justify-between gap-5 shrink-0">
            <div className="space-y-4">
              {/* Section 1: Themes */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('share.theme_select')}</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['dark', 'gradient', 'minimal'] as ShareTheme[]).map((thm) => (
                    <button
                      key={thm}
                      type="button"
                      onClick={() => setOptions((prev) => ({ ...prev, theme: thm }))}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        options.theme === thm
                          ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      {thm === 'dark'
                        ? t('share.theme_dark')
                        : thm === 'gradient'
                        ? t('share.theme_gradient')
                        : t('share.theme_minimal')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2: Privacy & Desensitization Toggles */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('share.privacy_section')}</span>
                </label>

                <div className="space-y-2">
                  {/* Toggle 1: Hide Amounts */}
                  <div
                    onClick={() => setOptions((prev) => ({ ...prev, hideAmounts: !prev.hideAmounts }))}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      options.hideAmounts
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {options.hideAmounts ? (
                        <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-semibold">{t('share.mask_amounts')}</div>
                        <div className="text-[10px] text-slate-400">
                          {t('share.mask_amounts_desc')}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        options.hideAmounts
                          ? 'bg-amber-500 border-amber-400 text-black font-bold'
                          : 'border-slate-600'
                      }`}
                    >
                      {options.hideAmounts && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                  </div>

                  {/* Toggle 2: Show Total Balance (Dashboard Only) */}
                  {data.type === 'dashboard' && (
                    <div
                      onClick={() => setOptions((prev) => ({ ...prev, showBalance: !prev.showBalance }))}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        options.showBalance
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{t('share.show_balance')}</div>
                        <div className="text-[10px] text-slate-400">
                          {t('share.show_balance_desc')}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          options.showBalance
                            ? 'bg-emerald-500 border-emerald-400 text-black font-bold'
                            : 'border-slate-600'
                        }`}
                      >
                        {options.showBalance && <Check className="w-3 h-3 text-black stroke-[3]" />}
                      </div>
                    </div>
                  )}

                  {/* Toggle 3: Show Strategy / Bot Name */}
                  <div
                    onClick={() => setOptions((prev) => ({ ...prev, showStrategy: !prev.showStrategy }))}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      options.showStrategy
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{t('share.show_strategy')}</div>
                      <div className="text-[10px] text-slate-400">
                        {t('share.show_strategy_desc')}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        options.showStrategy
                          ? 'bg-cyan-500 border-cyan-400 text-black font-bold'
                          : 'border-slate-600'
                      }`}
                    >
                      {options.showStrategy && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                  </div>

                  {/* Trade Specific Toggles */}
                  {data.type !== 'dashboard' && (
                    <>
                      {/* Show exact prices */}
                      <div
                        onClick={() => setOptions((prev) => ({ ...prev, showTradeDetails: !prev.showTradeDetails }))}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          options.showTradeDetails
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold">{t('share.show_prices')}</div>
                          <div className="text-[10px] text-slate-400">
                            {t('share.show_prices_desc')}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            options.showTradeDetails
                              ? 'bg-cyan-500 border-cyan-400 text-black font-bold'
                              : 'border-slate-600'
                          }`}
                        >
                          {options.showTradeDetails && <Check className="w-3 h-3 text-black stroke-[3]" />}
                        </div>
                      </div>

                      {/* Show Signal Tag */}
                      <div
                        onClick={() => setOptions((prev) => ({ ...prev, showSignal: !prev.showSignal }))}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          options.showSignal
                            ? 'bg-purple-500/10 border-purple-500/40 text-purple-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold">{t('share.show_signal')}</div>
                          <div className="text-[10px] text-slate-400">
                            {t('share.show_signal_desc')}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            options.showSignal
                              ? 'bg-purple-500 border-purple-400 text-black font-bold'
                              : 'border-slate-600'
                          }`}
                        >
                          {options.showSignal && <Check className="w-3 h-3 text-black stroke-[3]" />}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {/* Copy to Clipboard Button */}
              <button
                type="button"
                onClick={handleCopyImage}
                disabled={isExporting}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? t('share.copied_done') : t('share.copy_image')}</span>
              </button>

              {/* Download PNG Button */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('share.download_image')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
