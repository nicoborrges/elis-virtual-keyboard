import React, { useState } from 'react';
import { CornerDownLeft, Delete, Space, Square, Zap } from 'lucide-react';
import {
  ELIS_STEPS,
  getVisografemasByStep,
  type StepNumber,
  type VisografemaItem,
} from '../data/elisMap';
import type { SlotEntry } from './VisorArea';
import { cn } from '../utils/cn';

interface SelectorKeyboardProps {
  slots: Record<StepNumber, SlotEntry>;
  activeStep: StepNumber;
  hasAnyContent: boolean;
  isPlaying: boolean;
  onSelectVisografema: (item: VisografemaItem) => void;
  onShortcutAllClosedFingers: () => void;
  onChangeStep: (step: StepNumber) => void;
  onHoverItem: (item: VisografemaItem | null, customLabel?: string) => void;
  onSpace: () => void;
  onBackspace: () => void;
  onTogglePlay: () => void;
}

export const SelectorKeyboard: React.FC<SelectorKeyboardProps> = ({
  slots,
  activeStep,
  hasAnyContent,
  isPlaying,
  onSelectVisografema,
  onShortcutAllClosedFingers,
  onChangeStep,
  onHoverItem,
  onSpace,
  onBackspace,
  onTogglePlay,
}) => {
  const currentStepDef = ELIS_STEPS.find((s) => s.step === activeStep)!;
  const selectedItemForActiveStep = slots[activeStep].item;

  const [categoryOverrides, setCategoryOverrides] = useState<
    Partial<Record<StepNumber, string>>
  >({});

  const activeCategory = currentStepDef.categories
    ? categoryOverrides[activeStep] ??
      (selectedItemForActiveStep?.category &&
      currentStepDef.categories.some(
        (c) => c.id === selectedItemForActiveStep.category
      )
        ? selectedItemForActiveStep.category
        : currentStepDef.categories[0].id)
    : undefined;

  const handleSelectCategory = (catId: string) => {
    setCategoryOverrides((prev) => ({
      ...prev,
      [activeStep]: catId,
    }));
  };

  const items = getVisografemasByStep(activeStep, activeCategory);

  const gridColsClass =
    activeStep === 1 || activeStep === 3
      ? 'grid-cols-6 gap-1.5'
      : activeStep === 2
      ? 'grid-cols-5 gap-1.5'
      : items.length <= 8
      ? 'grid-cols-4 gap-1.5'
      : 'grid-cols-5 gap-1.5';

  return (
    <section
      aria-label="Teclado Seletor Modular de Visografemas"
      className="shrink-0 flex flex-col bg-slate-900/95 rounded-t-[28px] border-t border-slate-800/80 shadow-[0_-12px_32px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      {/* 1. Single Unified Stepper (5 Slim Interactive Slot Pills — zero duplication) */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-800/60">
        <div
          role="tablist"
          aria-label="Etapas e slots dos 5 visografemas do sinal"
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
                aria-label={`Etapa ${stepDef.step}: ${stepDef.shortTitle}${
                  slotEntry.item ? ` (${slotEntry.item.label})` : ''
                }`}
                title={`${stepDef.fullTitle}${
                  slotEntry.item ? ` — ${slotEntry.item.label}` : ''
                }`}
                onClick={() => onChangeStep(stepDef.step)}
                className={cn(
                  'relative flex items-center justify-center gap-1 h-10 rounded-xl border px-1.5 transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-400/80 text-white shadow-[0_0_14px_-4px_rgba(99,102,241,0.55)]'
                    : isFilled
                    ? 'bg-slate-950/70 border-slate-700/80 text-slate-100 hover:border-slate-600'
                    : 'bg-slate-950/35 border-slate-800/60 text-slate-500 hover:text-slate-300 hover:border-slate-700/80'
                )}
              >
                {slotEntry.item ? (
                  <>
                    <span
                      key={slotEntry.updatedAt}
                      className="font-elis text-[24px] leading-none translate-y-[2px] text-white animate-slot-rise"
                    >
                      {slotEntry.item.char}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full',
                        isActive ? 'bg-indigo-400' : 'bg-emerald-400/80'
                      )}
                    />
                  </>
                ) : (
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={cn(
                        'text-[10px] font-bold leading-none',
                        isActive ? 'text-indigo-300' : 'text-slate-600'
                      )}
                    >
                      {stepDef.step}
                    </span>
                    <span
                      className={cn(
                        'text-[10.5px] font-medium truncate',
                        isActive ? 'text-indigo-100' : 'text-slate-400'
                      )}
                    >
                      {stepDef.shortTitle}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Category Sub-Tabs ONLY for Steps 4 & 5 (clean, no noisy counts) */}
        {currentStepDef.categories && (
          <div
            role="tablist"
            aria-label={`Subcategorias de ${currentStepDef.shortTitle}`}
            className="grid grid-flow-col auto-cols-fr gap-1 p-0.5 rounded-xl bg-slate-950/70 border border-slate-800/60 mt-2"
          >
            {currentStepDef.categories.map((cat) => {
              const isCatActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isCatActive}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={cn(
                    'py-1 px-1.5 rounded-lg text-[11px] font-medium transition-all truncate',
                    isCatActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Modular Visografema Keys Grid */}
      <div className="overflow-y-auto px-3 pt-2.5 pb-2 max-h-[152px]">
        <div className={cn('grid', gridColsClass)}>
          {items.map((item) => {
            const isSelected =
              selectedItemForActiveStep?.id === item.id &&
              selectedItemForActiveStep?.char === item.char;

            return (
              <button
                key={`${item.step}-${item.id}-${item.char}`}
                type="button"
                onClick={() => onSelectVisografema(item)}
                onMouseEnter={() => onHoverItem(item)}
                onMouseLeave={() => onHoverItem(null)}
                onFocus={() => onHoverItem(item)}
                onBlur={() => onHoverItem(null)}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  'group relative flex items-center justify-center rounded-xl border transition-all duration-150 select-none active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  activeStep <= 3 ? 'h-12' : 'h-11',
                  isSelected
                    ? 'bg-indigo-600/25 border-indigo-400 text-white shadow-[0_0_14px_-4px_rgba(99,102,241,0.5)]'
                    : 'bg-slate-950/75 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700 text-slate-100'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'font-elis leading-none translate-y-[2px] transition-transform duration-150 group-hover:scale-110',
                    activeStep <= 3 ? 'text-[28px]' : 'text-[24px]'
                  )}
                >
                  {item.char}
                </span>

                <span className="sr-only">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Native Mobile Keyboard Control Row (Shortcut/Space, Backspace, Primary Enter/Play) */}
      <div className="flex items-center gap-1.5 px-3 pt-1 pb-2.5">
        {activeStep === 1 && (
          <button
            type="button"
            onClick={onShortcutAllClosedFingers}
            onMouseEnter={() =>
              onHoverItem(null, 'Atalho: Todos os dedos fechados')
            }
            onMouseLeave={() => onHoverItem(null)}
            onFocus={() =>
              onHoverItem(null, 'Atalho: Todos os dedos fechados')
            }
            onBlur={() => onHoverItem(null)}
            title="Atalho: Todos os dedos iguais / fechado"
            aria-label="Atalho: Todos os dedos fechados"
            className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-200 transition-all active:scale-95 shrink-0"
          >
            <Zap aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
            <span
              aria-hidden="true"
              className="font-elis text-[24px] leading-none translate-y-[1px] tracking-widest text-white"
            >
              qq
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onSpace}
          disabled={!hasAnyContent}
          title="Inserir espaço / próximo sinal"
          aria-label="Espaço"
          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none"
        >
          <Space className="w-3.5 h-3.5 text-slate-400" />
          <span>Espaço</span>
        </button>

        <button
          type="button"
          onClick={onBackspace}
          disabled={!hasAnyContent}
          title="Apagar último visografema"
          aria-label="Apagar"
          className="flex items-center justify-center w-12 h-10 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all active:scale-90 disabled:opacity-35 disabled:pointer-events-none shrink-0"
        >
          <Delete className="w-4 h-4" />
        </button>

        {/* Single Primary Accent Key: Enter (Play / Stop Loop) */}
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!hasAnyContent}
          aria-pressed={isPlaying}
          title={
            isPlaying
              ? 'Parar reprodução em loop (Enter ou Esc)'
              : 'Enter: Reproduzir sinal escrito em loop nas mãos 3D'
          }
          className={cn(
            'flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold border transition-all active:scale-95 disabled:opacity-35 disabled:pointer-events-none shrink-0',
            isPlaying
              ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 text-slate-950 shadow-[0_0_16px_-3px_rgba(52,211,153,0.6)]'
              : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/30'
          )}
        >
          {isPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-slate-950" />
              <span>Parar</span>
            </>
          ) : (
            <>
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>Tocar</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
};
