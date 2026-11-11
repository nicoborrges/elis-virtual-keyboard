import React from 'react';
import {
  Copy,
  Check,
  Delete,
  Trash2,
  Space,
  Sparkles,
} from 'lucide-react';
import { ELIS_STEPS, type StepNumber, type VisografemaItem } from '../data/elisMap';
import { cn } from '../utils/cn';

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
  lastHoveredLabel: string | null;
  onSelectSlot: (step: StepNumber) => void;
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
  lastHoveredLabel,
  onSelectSlot,
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
      aria-label="Visor da Palavra e Slots de Visografemas"
      className="flex flex-col gap-2.5 px-3.5 pt-2 pb-3 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border-b border-slate-800/80"
    >
      {/* Main ELiS Word Display Box */}
      <div className="relative flex flex-col justify-between min-h-[104px] max-h-[126px] rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-inner px-3.5 py-2.5 overflow-y-auto">
        {/* Top micro-header inside visor */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 select-none">
          <span className="flex items-center gap-1.5 font-medium tracking-wide uppercase text-slate-400">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Visor ELiS
          </span>
          <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
            {lastHoveredLabel ? (
              <span className="text-indigo-300 font-medium">{lastHoveredLabel}</span>
            ) : (
              <span>
                {completedSigns.filter((s) => !s.isSpace).length} sinal(is) •{' '}
                {filledSlotsCount}/5 slots
              </span>
            )}
          </span>
        </div>

        {/* Dynamic ELiS Characters Stream (32px to 44px) */}
        <div
          className="flex flex-wrap items-center gap-y-2 py-1 min-h-[52px]"
          aria-live="polite"
        >
          {!hasAnyContent ? (
            <div className="flex items-center gap-2 text-slate-600 text-xs select-none italic">
              <span>Selecione os visografemas abaixo para compor o sinal...</span>
            </div>
          ) : (
            <>
              {completedSigns.map((sign) =>
                sign.isSpace ? (
                  <span
                    key={sign.id}
                    className="inline-flex items-center justify-center mx-1.5 h-8 px-1.5 rounded bg-slate-900/60 border border-dashed border-slate-800 text-[10px] text-slate-500 select-none"
                    title="Espaço entre sinais"
                  >
                    ␣
                  </span>
                ) : (
                  <span
                    key={sign.id}
                    className="group relative inline-flex items-center px-2 py-0.5 mr-1.5 rounded-xl bg-indigo-950/35 border border-indigo-500/25 text-[38px] leading-none font-elis text-slate-100 tracking-wider animate-word-pop"
                    title={`Sinal consolidado: ${sign.items
                      .map((i) => i.label)
                      .join(' + ')}`}
                  >
                    {sign.chars}
                    {/* Subtle sign delimiter dot */}
                    <span
                      aria-hidden="true"
                      className="ml-1.5 w-1 h-4 rounded-full bg-indigo-500/30"
                    />
                  </span>
                )
              )}

              {/* Currently forming sign preview */}
              {activeSignChars.length > 0 && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-xl bg-amber-500/10 border border-amber-400/35 text-[38px] leading-none font-elis text-amber-200 tracking-wider"
                  title="Sinal em construção"
                >
                  {activeSignChars}
                  <span className="ml-1 w-0.5 h-6 bg-amber-400 animate-pulse rounded-full" />
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 5 Slots Progress & Interactive Selector Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] px-0.5">
          <span className="text-slate-400 font-medium">
            Estrutura do Sinal Atual (clique em um slot para editar):
          </span>
          <span className="text-indigo-400 font-semibold">
            Etapa {activeStep} de 5
          </span>
        </div>

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
                  'relative flex flex-col items-center justify-between h-[68px] rounded-xl border p-1.5 transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-400 shadow-[0_0_15px_-3px_rgba(99,102,241,0.45)] scale-[1.02]'
                    : isFilled
                    ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400/70'
                    : 'bg-slate-900/50 border-slate-800/90 hover:border-slate-700'
                )}
              >
                {/* Top Slot Step Number & Short Label */}
                <div className="flex items-center justify-between w-full px-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none',
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
                      'text-[9px] font-medium truncate max-w-[48px]',
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

                {/* Slot Visografema Glyph with Rise Animation */}
                <div className="flex items-center justify-center flex-1 w-full overflow-hidden">
                  {slotEntry.item ? (
                    <span
                      key={slotEntry.updatedAt}
                      className="font-elis text-[30px] leading-none text-white animate-slot-rise"
                    >
                      {slotEntry.item.char}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isActive
                          ? 'bg-indigo-400 animate-ping'
                          : 'bg-slate-700'
                      )}
                    />
                  )}
                </div>

                {/* Bottom Active Indicator Bar */}
                <span
                  className={cn(
                    'w-8 h-0.5 rounded-full transition-colors',
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

      {/* Visor Toolbar (Copy, Space, Backspace, Clear) */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={onCopy}
          disabled={!hasAnyContent}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
            copied
              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
              : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-200'
          )}
          title="Copiar palavra em caracteres ELiS para a área de transferência"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="truncate">Copiar</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onSpace}
          disabled={!hasAnyContent}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Inserir espaço / iniciar novo sinal"
        >
          <Space className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Espaço</span>
        </button>

        <button
          type="button"
          onClick={onBackspace}
          disabled={!hasAnyContent}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Apagar último visografema"
        >
          <Delete className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Apagar</span>
        </button>

        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasAnyContent}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-200 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Limpar todo o visor e reiniciar"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">Limpar</span>
        </button>
      </div>
    </section>
  );
};
