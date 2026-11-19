import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import {
  ELIS_STEPS,
  getVisografemasByStep,
  type StepNumber,
  type VisografemaItem,
} from '../data/elisMap';
import { cn } from '../utils/cn';

interface SelectorKeyboardProps {
  activeStep: StepNumber;
  selectedItemForActiveStep: VisografemaItem | null;
  onSelectVisografema: (item: VisografemaItem) => void;
  onShortcutAllClosedFingers: () => void;
  onChangeStep: (step: StepNumber) => void;
  onHoverItem: (item: VisografemaItem | null, customLabel?: string) => void;
}

export const SelectorKeyboard: React.FC<SelectorKeyboardProps> = ({
  activeStep,
  selectedItemForActiveStep,
  onSelectVisografema,
  onShortcutAllClosedFingers,
  onChangeStep,
  onHoverItem,
}) => {
  const currentStepDef = ELIS_STEPS.find((s) => s.step === activeStep)!;
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
      aria-label="Caixa Seletora Modular de Visografemas"
      className="shrink-0 max-h-[248px] flex flex-col bg-slate-900/95 rounded-t-3xl border-t border-slate-800/90 shadow-[0_-10px_28px_rgba(0,0,0,0.45)] overflow-hidden"
    >
      {/* Compact Header & Stepper */}
      <div className="flex flex-col gap-1.5 px-3 pt-2 pb-1.5 bg-slate-900/90 border-b border-slate-800/80">
        <div className="w-8 h-0.5 rounded-full bg-slate-700/80 mx-auto" />

        {/* Single-row Compact Stepper + Prev/Next */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {ELIS_STEPS.map((step) => {
              const isCurrent = step.step === activeStep;
              const isPast = step.step < activeStep;
              return (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => onChangeStep(step.step)}
                  className={cn(
                    'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all',
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : isPast
                      ? 'bg-slate-800/90 text-emerald-300 hover:bg-slate-800'
                      : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/70 hover:text-slate-300'
                  )}
                >
                  <span>{step.step}.</span>
                  <span>{step.shortTitle}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                activeStep > 1 && onChangeStep((activeStep - 1) as StepNumber)
              }
              disabled={activeStep === 1}
              aria-label="Etapa anterior"
              title="Voltar para etapa anterior"
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                activeStep < 5 && onChangeStep((activeStep + 1) as StepNumber)
              }
              disabled={activeStep === 5}
              aria-label="Próxima etapa"
              title="Avançar para próxima etapa"
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact Active Step Title + Category Sub-Tabs */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold text-slate-200 truncate">
            {currentStepDef.fullTitle}
          </h2>
          <span className="text-[10px] text-slate-400 truncate">
            {currentStepDef.categories
              ? `${items.length} itens`
              : currentStepDef.description}
          </span>
        </div>

        {currentStepDef.categories && (
          <div
            role="tablist"
            aria-label={`Subcategorias de ${currentStepDef.shortTitle}`}
            className="grid grid-flow-col auto-cols-fr gap-1 p-0.5 rounded-lg bg-slate-950/80 border border-slate-800/80"
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
                    'flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[10px] font-semibold transition-all truncate',
                    isCatActive
                      ? 'bg-indigo-600/90 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  )}
                >
                  <span className="truncate">{cat.label}</span>
                  <span
                    className={cn(
                      'text-[8.5px] px-1 rounded-full',
                      isCatActive
                        ? 'bg-indigo-800/80 text-indigo-100'
                        : 'bg-slate-800 text-slate-400'
                    )}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact Modular Visografema Keys Grid */}
      <div className="overflow-y-auto px-3 py-2 max-h-[146px]">
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
                    ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_16px_-4px_rgba(99,102,241,0.5)]'
                    : 'bg-slate-950/85 hover:bg-slate-800/90 border-slate-800/90 hover:border-indigo-500/50 text-slate-100 shadow-sm'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'font-elis leading-none transition-transform duration-150 group-hover:scale-110',
                    activeStep <= 3 ? 'text-[30px]' : 'text-[26px]'
                  )}
                >
                  {item.char}
                </span>

                <span className="sr-only">{item.label}</span>
              </button>
            );
          })}

          {/* Compact Step 1 Special Shortcut: Todos os dedos iguais/fechado (qq) */}
          {activeStep === 1 && (
            <button
              type="button"
              onClick={onShortcutAllClosedFingers}
              onMouseEnter={() =>
                onHoverItem(
                  null,
                  'Atalho: Todos os dedos iguais / fechado (Etapas 1 e 2)'
                )
              }
              onMouseLeave={() => onHoverItem(null)}
              onFocus={() =>
                onHoverItem(
                  null,
                  'Atalho: Todos os dedos iguais / fechado (Etapas 1 e 2)'
                )
              }
              onBlur={() => onHoverItem(null)}
              title="Atalho: Todos os dedos iguais / fechado (preenche Polegar e Demais Dedos)"
              aria-label="Atalho: Todos os dedos iguais ou fechado"
              className="col-span-6 group relative flex items-center justify-center gap-2.5 h-10 rounded-xl bg-gradient-to-r from-indigo-950/60 via-indigo-900/40 to-indigo-950/60 hover:from-indigo-900/70 hover:to-indigo-900/70 border border-indigo-500/40 hover:border-indigo-400 text-indigo-100 transition-all duration-150 active:scale-95 shadow-sm"
            >
              <Zap
                aria-hidden="true"
                className="w-3.5 h-3.5 text-amber-400 shrink-0 transition-transform group-hover:scale-110"
              />
              <span
                aria-hidden="true"
                className="font-elis text-[28px] leading-none tracking-widest text-white"
              >
                qq
              </span>
              <span className="sr-only">
                Atalho: Todos os dedos iguais ou fechado (preenche Polegar e Demais Dedos e avança para Orientação da Palma)
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
