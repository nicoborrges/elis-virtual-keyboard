import React from 'react';
import {
  Copy,
  Check,
  Delete,
  Trash2,
  Space,
  Sparkles,
  CornerDownLeft,
  Square,
} from 'lucide-react';
import { ELIS_STEPS, type StepNumber, type VisografemaItem } from '../data/elisMap';
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
  activeStep: StepNumber;
  copied: boolean;
  hoveredItem: VisografemaItem | null;
  lastHoveredLabel: string | null;
  isPlaying: boolean;
  playingSign: CompletedSign | null;
  playingIndex: number;
  totalPlayingSigns: number;
  onSelectSlot: (step: StepNumber) => void;
  onTogglePlay: () => void;
  onPlayFromSign: (signId: string) => void;
  onCopy: () => void;
  onSpace: () => void;
  onBackspace: () => void;
  onClearAll: () => void;
}

export const VisorArea: React.FC<VisorAreaProps> = ({
  completedSigns,
  slots,
  activeStep,
  copied,
  hoveredItem,
  lastHoveredLabel,
  isPlaying,
  playingSign,
  playingIndex,
  totalPlayingSigns,
  onSelectSlot,
  onTogglePlay,
  onPlayFromSign,
  onCopy,
  onSpace,
  onBackspace,
  onClearAll,
}) => {
  const activeSignChars = ([1, 2, 3, 4, 5] as StepNumber[])
    .map((s) => slots[s].item?.char ?? '')
    .join('');

  const hasAnyContent =
    completedSigns.length > 0 || activeSignChars.length > 0;

  const filledSlotsCount = ([1, 2, 3, 4, 5] as StepNumber[]).filter(
    (s) => slots[s].item !== null
  ).length;

  return (
    <section
      aria-label="Visor da Palavra, Modelo 3D das Mãos e Slots de Visografemas"
      className="flex-1 min-h-0 flex flex-col gap-2 px-3 pt-2 pb-2.5 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border-b border-slate-800/80 overflow-hidden"
    >
      {/* Interactive 3D Two-Hands Stage */}
      <Hands3DCanvas
        slots={slots}
        hoveredItem={hoveredItem}
        isPlaying={isPlaying}
        playingSign={playingSign}
        playingIndex={playingIndex}
        totalPlayingSigns={totalPlayingSigns}
      />

      {/* Main ELiS Word Display Box */}
      <div className="shrink-0 relative flex flex-col justify-between min-h-[76px] max-h-[96px] rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-inner px-3 py-2 overflow-y-auto">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5 select-none">
          <span className="flex items-center gap-1 font-medium tracking-wide uppercase text-slate-400">
            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
            Visor ELiS
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[215px]">
            {isPlaying && playingSign ? (
              <span className="text-emerald-300 font-semibold">
                ▶ {playingSign.items.map((i) => i.label).join(' · ')}
              </span>
            ) : lastHoveredLabel ? (
              <span className="text-indigo-300 font-medium">{lastHoveredLabel}</span>
            ) : (
              <span>
                {completedSigns.filter((s) => !s.isSpace).length} sinal(is) •{' '}
                {filledSlotsCount}/5 slots
              </span>
            )}
          </span>
        </div>

        <div
          className="flex flex-wrap items-center gap-y-1.5 py-0.5 min-h-[42px]"
          aria-live="polite"
        >
          {!hasAnyContent ? (
            <div className="flex items-center gap-2 text-slate-500 text-[11px] select-none italic">
              <span>Selecione os visografemas abaixo para compor o sinal...</span>
            </div>
          ) : (
            <>
              {completedSigns.map((sign) => {
                if (sign.isSpace) {
                  return (
                    <span
                      key={sign.id}
                      className="inline-flex items-center justify-center mx-1 h-7 px-1.5 rounded bg-slate-900/60 border border-dashed border-slate-800 text-[10px] text-slate-500 select-none"
                      title="Espaço entre sinais"
                    >
                      ␣
                    </span>
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
                      'group relative inline-flex items-center px-2 pt-2 pb-1 mr-1.5 rounded-xl border text-[32px] leading-none font-elis tracking-wider animate-word-pop transition-all duration-200',
                      isCurrentlyPlaying
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_14px_-2px_rgba(52,211,153,0.6)] scale-[1.04]'
                        : 'bg-indigo-950/35 border-indigo-500/25 hover:border-indigo-400/60 text-slate-100'
                    )}
                    title={`Clique para reproduzir: ${sign.items
                      .map((i) => i.label)
                      .join(' + ')}`}
                  >
                    {sign.chars}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'ml-1.5 w-1 h-3.5 rounded-full transition-colors',
                        isCurrentlyPlaying ? 'bg-emerald-400' : 'bg-indigo-500/30'
                      )}
                    />
                  </button>
                );
              })}

              {activeSignChars.length > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center px-2 pt-2 pb-1 rounded-xl border text-[32px] leading-none font-elis tracking-wider transition-all duration-200',
                    isPlaying && playingSign?.id === '__active__'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_14px_-2px_rgba(52,211,153,0.6)]'
                      : 'bg-amber-500/10 border-amber-400/35 text-amber-200'
                  )}
                  title="Sinal em construção"
                >
                  {activeSignChars}
                  <span className="ml-1 w-0.5 h-5 bg-amber-400 animate-pulse rounded-full" />
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 5 Slots Progress & Interactive Selector Bar */}
      <div className="shrink-0 flex flex-col gap-1">
        <div
          role="tablist"
          aria-label="Slots dos 5 visografemas do sinal"
          className="grid grid-cols-5 gap-1.5"
        >
          {ELIS_STEPS.map((stepDef) => {
            const slotEntry = slots[stepDef.step];
            const isActive = activeStep === stepDef.step;
            const isFilled = slotEntry.item !== null;

            return (
              <button
                key={stepDef.step}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Slot ${stepDef.step}: ${stepDef.shortTitle}${
                  slotEntry.item ? ` (${slotEntry.item.label})` : ' (vazio)'
                }`}
                title={`Slot ${stepDef.step}: ${stepDef.shortTitle}${
                  slotEntry.item ? ` — ${slotEntry.item.label}` : ' (Clique para selecionar)'
                }`}
                onClick={() => onSelectSlot(stepDef.step)}
                className={cn(
                  'relative flex flex-col items-center justify-between h-[56px] rounded-xl border p-1 transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-400 shadow-[0_0_15px_-3px_rgba(99,102,241,0.45)] scale-[1.02]'
                    : isFilled
                    ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400/70'
                    : 'bg-slate-900/50 border-slate-800/90 hover:border-slate-700'
                )}
              >
                <div className="flex items-center justify-between w-full px-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold leading-none',
                      isActive
                        ? 'bg-indigo-500 text-white'
                        : isFilled
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    )}
                  >
                    {stepDef.step}
                  </span>
                  <span
                    className={cn(
                      'text-[8.5px] font-medium truncate max-w-[46px]',
                      isActive
                        ? 'text-indigo-200'
                        : isFilled
                        ? 'text-emerald-300/90'
                        : 'text-slate-400'
                    )}
                  >
                    {stepDef.shortTitle}
                  </span>
                </div>

                <div className="flex items-center justify-center flex-1 w-full overflow-hidden">
                  {slotEntry.item ? (
                    <span
                      key={slotEntry.updatedAt}
                      className="font-elis text-[26px] leading-none text-white animate-slot-rise"
                    >
                      {slotEntry.item.char}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isActive
                          ? 'bg-indigo-400 animate-ping'
                          : 'bg-slate-700'
                      )}
                    />
                  )}
                </div>

                <span
                  className={cn(
                    'w-7 h-0.5 rounded-full transition-colors',
                    isActive
                      ? 'bg-indigo-400'
                      : isFilled
                      ? 'bg-emerald-500/50'
                      : 'bg-transparent'
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Visor Toolbar with Prominent Enter (Play/Stop Loop) Button */}
      <div className="shrink-0 grid grid-cols-5 gap-1">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!hasAnyContent}
          aria-pressed={isPlaying}
          className={cn(
            'flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10.5px] font-bold border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
            isPlaying
              ? 'bg-emerald-500/25 hover:bg-emerald-500/35 border-emerald-400 text-emerald-200 shadow-[0_0_14px_-3px_rgba(52,211,153,0.5)]'
              : 'bg-emerald-600/20 hover:bg-emerald-600/35 border-emerald-500/50 text-emerald-200'
          )}
          title={
            isPlaying
              ? 'Parar reprodução em loop (Tecla Enter ou Esc)'
              : 'Enter: Reproduzir sinal escrito em loop nas mãos 3D (Tecla Enter)'
          }
        >
          {isPlaying ? (
            <>
              <Square className="w-3 h-3 fill-emerald-300 text-emerald-300 shrink-0" />
              <span className="truncate">Parar</span>
            </>
          ) : (
            <>
              <CornerDownLeft className="w-3 h-3 text-emerald-300 shrink-0" />
              <span className="truncate">Enter</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCopy}
          disabled={!hasAnyContent}
          className={cn(
            'flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10.5px] font-medium border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
            copied
              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
              : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-200'
          )}
          title="Copiar palavra em caracteres ELiS para a área de transferência"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-indigo-300 shrink-0" />
              <span className="truncate">Copiar</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onSpace}
          disabled={!hasAnyContent}
          className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10.5px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Inserir espaço / iniciar novo sinal"
        >
          <Space className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">Espaço</span>
        </button>

        <button
          type="button"
          onClick={onBackspace}
          disabled={!hasAnyContent}
          className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10.5px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Apagar último visografema"
        >
          <Delete className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="truncate">Apagar</span>
        </button>

        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasAnyContent}
          className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10.5px] font-medium bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-200 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Limpar todo o visor e reiniciar"
        >
          <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
          <span className="truncate">Limpar</span>
        </button>
      </div>
    </section>
  );
};
