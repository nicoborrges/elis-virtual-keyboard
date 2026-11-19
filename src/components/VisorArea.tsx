import React from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';
import type { StepNumber, VisografemaItem } from '../data/elisMap';
import { cn } from '../utils/cn';
import { Hands3DCanvas } from './Hands3DCanvas';

export interface SlotEntry {
  item: VisografemaItem | null;
  updatedAt: number;
}

export interface CompletedSign {
  id: string;
  chars: string;
  items: VisografemaItem[];
  isSpace?: boolean;
}

interface VisorAreaProps {
  completedSigns: CompletedSign[];
  slots: Record<StepNumber, SlotEntry>;
  copied: boolean;
  hoveredItem: VisografemaItem | null;
  lastHoveredLabel: string | null;
  isPlaying: boolean;
  playingSign: CompletedSign | null;
  playingIndex: number;
  totalPlayingSigns: number;
  onPlayFromSign: (signId: string) => void;
  onCopy: () => void;
  onClearAll: () => void;
}

export const VisorArea: React.FC<VisorAreaProps> = ({
  completedSigns,
  slots,
  copied,
  hoveredItem,
  lastHoveredLabel,
  isPlaying,
  playingSign,
  playingIndex,
  totalPlayingSigns,
  onPlayFromSign,
  onCopy,
  onClearAll,
}) => {
  const activeSignChars = ([1, 2, 3, 4, 5] as StepNumber[])
    .map((s) => slots[s].item?.char ?? '')
    .join('');

  const hasAnyContent =
    completedSigns.length > 0 || activeSignChars.length > 0;

  return (
    <section
      aria-label="Visor ELiS e Modelo 3D das Mãos"
      className="flex-1 min-h-0 flex flex-col bg-[radial-gradient(ellipse_at_50%_35%,_rgba(49,46,129,0.24)_0%,_rgba(2,6,23,0.98)_75%)] overflow-hidden"
    >
      {/* Unified 3D Two-Hands Stage */}
      <Hands3DCanvas
        slots={slots}
        hoveredItem={hoveredItem}
        isPlaying={isPlaying}
        playingSign={playingSign}
        playingIndex={playingIndex}
        totalPlayingSigns={totalPlayingSigns}
      />

      {/* Integrated ELiS Word Strip (no heavy nested boxes or redundant headers) */}
      <div className="shrink-0 px-4 pt-1 pb-3">
        {/* Quiet single-line micro-hint only when hovering/focusing a visografema */}
        <div className="h-4 flex items-center justify-center mb-1">
          {lastHoveredLabel && (
            <span className="text-[11px] font-medium text-indigo-300/90 truncate max-w-full">
              {lastHoveredLabel}
            </span>
          )}
        </div>

        {/* Word Stream + Quiet Inline Secondary Actions (Copy / Clear) */}
        <div className="flex items-center justify-between gap-2 min-h-[54px] max-h-[84px] rounded-2xl bg-slate-900/55 border border-slate-800/60 px-3 py-1.5">
          <div
            className="flex-1 flex flex-wrap items-center gap-y-1.5 overflow-y-auto max-h-[68px]"
            aria-live="polite"
          >
            {!hasAnyContent ? (
              <span className="text-xs text-slate-500 select-none">
                Toque nos símbolos abaixo para compor um sinal
              </span>
            ) : (
              <>
                {completedSigns.map((sign) => {
                  if (sign.isSpace) {
                    return (
                      <span
                        key={sign.id}
                        className="inline-block w-3"
                        aria-label="Espaço"
                      />
                    );
                  }

                  const isCurrentlyPlaying =
                    isPlaying && playingSign?.id === sign.id;

                  return (
                    <button
                      key={sign.id}
                      type="button"
                      onClick={() => onPlayFromSign(sign.id)}
                      className={cn(
                        'inline-flex items-center px-2 pt-2 pb-1 mr-1.5 rounded-xl border text-[32px] leading-none font-elis tracking-wider animate-word-pop transition-all duration-200',
                        isCurrentlyPlaying
                          ? 'bg-emerald-500/15 border-emerald-400/70 text-white shadow-[0_0_12px_-3px_rgba(52,211,153,0.5)]'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-indigo-400/50 text-slate-100'
                      )}
                      title={`Tocar sinal: ${sign.items
                        .map((i) => i.label)
                        .join(' + ')}`}
                    >
                      {sign.chars}
                    </button>
                  );
                })}

                {activeSignChars.length > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center px-2 pt-2 pb-1 rounded-xl border text-[32px] leading-none font-elis tracking-wider transition-all duration-200',
                      isPlaying && playingSign?.id === '__active__'
                        ? 'bg-emerald-500/15 border-emerald-400/70 text-white'
                        : 'bg-indigo-500/10 border-indigo-400/35 text-indigo-100'
                    )}
                    title="Sinal em construção"
                  >
                    {activeSignChars}
                    <span className="ml-1 w-0.5 h-5 bg-indigo-400 animate-pulse rounded-full" />
                  </span>
                )}
              </>
            )}
          </div>

          {/* Quiet monochrome secondary actions — only appear when there is text */}
          {hasAnyContent && (
            <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-800/70">
              <button
                type="button"
                onClick={onCopy}
                aria-label="Copiar texto ELiS"
                title={copied ? 'Copiado!' : 'Copiar texto ELiS'}
                className={cn(
                  'p-2 rounded-xl transition-colors active:scale-90',
                  copied
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                )}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={onClearAll}
                aria-label="Limpar visor"
                title="Limpar tudo"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-300 hover:bg-slate-800/70 transition-colors active:scale-90"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
