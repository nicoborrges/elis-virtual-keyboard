import { useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { BookOpen, Keyboard, Wifi, BatteryCharging } from 'lucide-react';
import {
  ELIS_VISOGRAFEMAS,
  type StepNumber,
  type VisografemaItem,
} from './data/elisMap';
import {
  VisorArea,
  type SlotEntry,
  type CompletedSign,
} from './components/VisorArea';
import { SelectorKeyboard } from './components/SelectorKeyboard';
import { ReferenceModal } from './components/ReferenceModal';

const createEmptySlots = (): Record<StepNumber, SlotEntry> => ({
  1: { item: null, updatedAt: 0 },
  2: { item: null, updatedAt: 0 },
  3: { item: null, updatedAt: 0 },
  4: { item: null, updatedAt: 0 },
  5: { item: null, updatedAt: 0 },
});

export function App() {
  const [slots, setSlots] = useState<Record<StepNumber, SlotEntry>>(createEmptySlots);
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [completedSigns, setCompletedSigns] = useState<CompletedSign[]>([]);
  const [copied, setCopied] = useState(false);
  const [lastHoveredLabel, setLastHoveredLabel] = useState<string | null>(null);
  const [isRefOpen, setIsRefOpen] = useState(false);

  const consolidateTimeoutRef = useRef<number | null>(null);

  const triggerSubtleConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 28,
        spread: 55,
        origin: { y: 0.35 },
        disableForReducedMotion: true,
      });
    } catch {
      // Ignore confetti errors in headless/restricted environments
    }
  }, []);

  const consolidateSign = useCallback(
    (finalSlots: Record<StepNumber, SlotEntry>) => {
      const items = ([1, 2, 3, 4, 5] as StepNumber[])
        .map((s) => finalSlots[s].item)
        .filter((it): it is VisografemaItem => it !== null);

      if (items.length === 0) return;

      const chars = items.map((it) => it.char).join('');
      const newSign: CompletedSign = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        chars,
        items,
      };

      setCompletedSigns((prev) => [...prev, newSign]);
      setSlots(createEmptySlots());
      setActiveStep(1);
      triggerSubtleConfetti();
    },
    [triggerSubtleConfetti]
  );

  const handleSelectVisografema = useCallback(
    (item: VisografemaItem) => {
      if (consolidateTimeoutRef.current) {
        window.clearTimeout(consolidateTimeoutRef.current);
        consolidateTimeoutRef.current = null;
      }

      const now = Date.now();
      const updatedSlots: Record<StepNumber, SlotEntry> = {
        ...slots,
        [activeStep]: { item, updatedAt: now },
      };

      setSlots(updatedSlots);

      // Canonical behavior: selecting the 5th element consolidates the sign
      if (activeStep === 5) {
        consolidateTimeoutRef.current = window.setTimeout(() => {
          consolidateSign(updatedSlots);
          consolidateTimeoutRef.current = null;
        }, 260);
      } else {
        setActiveStep((activeStep + 1) as StepNumber);
      }
    },
    [activeStep, slots, consolidateSign]
  );

  const handleShortcutAllClosedFingers = useCallback(() => {
    const thumbClosed = ELIS_VISOGRAFEMAS.find(
      (v) => v.step === 1 && v.char === 'q'
    )!;
    const fingersClosed = ELIS_VISOGRAFEMAS.find(
      (v) => v.step === 2 && v.char === 'q'
    )!;
    const now = Date.now();

    setSlots((prev) => ({
      ...prev,
      1: { item: thumbClosed, updatedAt: now },
      2: { item: fingersClosed, updatedAt: now + 1 },
    }));
    setActiveStep(3);
  }, []);

  const handleCopy = useCallback(async () => {
    const completedStr = completedSigns
      .map((s) => (s.isSpace ? ' ' : s.chars))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const activeStr = ([1, 2, 3, 4, 5] as StepNumber[])
      .map((s) => slots[s].item?.char ?? '')
      .join('');

    const fullText = [completedStr, activeStr].filter(Boolean).join(' ');
    if (!fullText) return;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [completedSigns, slots]);

  const handleSpace = useCallback(() => {
    const activeItems = ([1, 2, 3, 4, 5] as StepNumber[])
      .map((s) => slots[s].item)
      .filter((it): it is VisografemaItem => it !== null);

    // If a partial sign is being built, consolidate it as a sign first
    if (activeItems.length > 0) {
      consolidateSign(slots);
      return;
    }

    // Otherwise add a space delimiter between signs if the last item isn't already a space
    if (
      completedSigns.length > 0 &&
      !completedSigns[completedSigns.length - 1].isSpace
    ) {
      setCompletedSigns((prev) => [
        ...prev,
        {
          id: `space-${Date.now()}`,
          chars: ' ',
          items: [],
          isSpace: true,
        },
      ]);
    }
  }, [slots, completedSigns, consolidateSign]);

  const handleBackspace = useCallback(() => {
    // Check if current slots have any filled item
    const filledSteps = ([5, 4, 3, 2, 1] as StepNumber[]).filter(
      (s) => slots[s].item !== null
    );

    if (filledSteps.length > 0) {
      const targetStep =
        slots[activeStep].item !== null ? activeStep : filledSteps[0];
      setSlots((prev) => ({
        ...prev,
        [targetStep]: { item: null, updatedAt: 0 },
      }));
      setActiveStep(targetStep);
      return;
    }

    // If current slots are all empty, pop the last completed sign
    if (completedSigns.length > 0) {
      const lastSign = completedSigns[completedSigns.length - 1];
      setCompletedSigns((prev) => prev.slice(0, -1));

      if (!lastSign.isSpace && lastSign.items.length > 0) {
        const now = Date.now();
        const restoredSlots = createEmptySlots();
        // Restore all but the last visografema so the user can re-edit it immediately
        lastSign.items.slice(0, -1).forEach((it, index) => {
          const stepNum = (index + 1) as StepNumber;
          if (stepNum <= 5) {
            restoredSlots[stepNum] = { item: it, updatedAt: now + index };
          }
        });
        const nextEditStep = Math.min(lastSign.items.length, 5) as StepNumber;
        setSlots(restoredSlots);
        setActiveStep(nextEditStep);
      }
    }
  }, [slots, activeStep, completedSigns]);

  const handleClearAll = useCallback(() => {
    if (consolidateTimeoutRef.current) {
      window.clearTimeout(consolidateTimeoutRef.current);
      consolidateTimeoutRef.current = null;
    }
    setSlots(createEmptySlots());
    setCompletedSigns([]);
    setActiveStep(1);
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg- radial from-slate-900 via-slate-950 to-black flex items-center justify-center sm:p-4 md:p-6">
      {/* Smartphone Vertical Viewport Container (aspect-[9/19.5] / max-w-md) */}
      <main className="relative w-full max-w-md h-[100dvh] sm:h-[min(92dvh,860px)] sm:aspect-[9/19.5] flex flex-col bg-slate-950 sm:rounded-[42px] sm:border-[6px] sm:border-slate-800/90 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_40px_-10px_rgba(99,102,241,0.2)] overflow-hidden">
        {/* Smartphone Status Bar & App Header */}
        <header className="flex flex-col bg-slate-900/95 border-b border-slate-800/80 px-4 pt-2 pb-2 select-none shrink-0">
          {/* Simulated Mobile Status Bar */}
          <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 mb-1.5">
            <span>ELiS OS</span>
            <div className="hidden sm:block w-20 h-3.5 rounded-full bg-slate-950 border border-slate-800/80" />
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-slate-400" />
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

          {/* App Title Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xs font-bold tracking-wide text-slate-100 leading-tight">
                  Teclado Seletor ELiS
                </h1>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Escrita das Línguas de Sinais
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRefOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 text-[11px] font-medium text-indigo-300 transition-colors"
              title="Consultar tabela completa de 95 visografemas (ELiS Decodificada)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tabela ELiS</span>
            </button>
          </div>
        </header>

        {/* Section 1: Upper Area (Word Visor, 5-Slot Progress & Toolbar) */}
        <VisorArea
          completedSigns={completedSigns}
          slots={slots}
          activeStep={activeStep}
          copied={copied}
          lastHoveredLabel={lastHoveredLabel}
          onSelectSlot={(step) => setActiveStep(step)}
          onCopy={handleCopy}
          onSpace={handleSpace}
          onBackspace={handleBackspace}
          onClearAll={handleClearAll}
        />

        {/* Section 2: Lower Area (Modular Visografema Selector / Virtual Keyboard) */}
        <SelectorKeyboard
          activeStep={activeStep}
          selectedItemForActiveStep={slots[activeStep].item}
          onSelectVisografema={handleSelectVisografema}
          onShortcutAllClosedFingers={handleShortcutAllClosedFingers}
          onChangeStep={(step) => setActiveStep(step)}
          onHoverItem={setLastHoveredLabel}
        />

        {/* Bottom Home Indicator Pill */}
        <div className="bg-slate-900/95 py-1.5 flex justify-center shrink-0">
          <div className="w-28 h-1 rounded-full bg-slate-700/70" />
        </div>

        {/* Optional Reference Sheet Drawer */}
        <ReferenceModal
          isOpen={isRefOpen}
          onClose={() => setIsRefOpen(false)}
        />
      </main>
    </div>
  );
}

export default App;
