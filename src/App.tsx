import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
  const [hoveredItem, setHoveredItem] = useState<VisografemaItem | null>(null);
  const [lastHoveredLabel, setLastHoveredLabel] = useState<string | null>(null);
  const [isRefOpen, setIsRefOpen] = useState(false);

  // Continuous loop playback state (Enter button / key)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  const consolidateTimeoutRef = useRef<number | null>(null);

  // Build ordered list of playable signs (completed non-space signs + active partial sign if present)
  const playableSigns = useMemo<CompletedSign[]>(() => {
    const list = completedSigns.filter((s) => !s.isSpace && s.items.length > 0);
    const activeItems = ([1, 2, 3, 4, 5] as StepNumber[])
      .map((s) => slots[s].item)
      .filter((it): it is VisografemaItem => it !== null);

    if (activeItems.length > 0) {
      list.push({
        id: '__active__',
        chars: activeItems.map((i) => i.char).join(''),
        items: activeItems,
      });
    }
    return list;
  }, [completedSigns, slots]);

  const safePlayingIndex =
    playableSigns.length > 0 ? playbackIndex % playableSigns.length : 0;

  const playingSign =
    isPlaying && playableSigns.length > 0
      ? playableSigns[safePlayingIndex]
      : null;

  // Continuous loop timer when playback is active
  useEffect(() => {
    if (!isPlaying || playableSigns.length <= 1) return;

    const timer = window.setInterval(() => {
      setPlaybackIndex((prev) => (prev + 1) % playableSigns.length);
    }, 1900);

    return () => window.clearInterval(timer);
  }, [isPlaying, playableSigns.length]);

  const handleTogglePlay = useCallback(() => {
    if (playableSigns.length === 0) return;
    setIsPlaying((prev) => {
      if (!prev) {
        setPlaybackIndex(0);
        return true;
      }
      return false;
    });
  }, [playableSigns.length]);

  const handlePlayFromSign = useCallback(
    (signId: string) => {
      const idx = playableSigns.findIndex((s) => s.id === signId);
      if (idx >= 0) {
        setPlaybackIndex(idx);
        setIsPlaying(true);
      }
    },
    [playableSigns]
  );

  // Keyboard shortcut: Enter toggles loop playback; Escape stops playback or closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRefOpen) {
          setIsRefOpen(false);
        } else if (isPlaying) {
          setIsPlaying(false);
        }
        return;
      }

      if (e.key === 'Enter' && !isRefOpen) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA') {
          return;
        }
        if (playableSigns.length > 0) {
          e.preventDefault();
          handleTogglePlay();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRefOpen, isPlaying, playableSigns.length, handleTogglePlay]);

  const handleHoverItem = useCallback(
    (item: VisografemaItem | null, customLabel?: string) => {
      setHoveredItem(item);
      if (customLabel) {
        setLastHoveredLabel(customLabel);
      } else if (item) {
        setLastHoveredLabel(`#${item.id} — ${item.label}`);
      } else {
        setLastHoveredLabel(null);
      }
    },
    []
  );

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

      setIsPlaying(false);
      const now = Date.now();
      const updatedSlots: Record<StepNumber, SlotEntry> = {
        ...slots,
        [activeStep]: { item, updatedAt: now },
      };

      setSlots(updatedSlots);
      setHoveredItem(null);

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
    setIsPlaying(false);
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
    setHoveredItem(null);
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
    setIsPlaying(false);
    const activeItems = ([1, 2, 3, 4, 5] as StepNumber[])
      .map((s) => slots[s].item)
      .filter((it): it is VisografemaItem => it !== null);

    if (activeItems.length > 0) {
      consolidateSign(slots);
      return;
    }

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
    setIsPlaying(false);
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

    if (completedSigns.length > 0) {
      const lastSign = completedSigns[completedSigns.length - 1];
      setCompletedSigns((prev) => prev.slice(0, -1));

      if (!lastSign.isSpace && lastSign.items.length > 0) {
        const now = Date.now();
        const restoredSlots = createEmptySlots();
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
    setIsPlaying(false);
    setPlaybackIndex(0);
    setSlots(createEmptySlots());
    setCompletedSigns([]);
    setActiveStep(1);
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center sm:p-4 md:p-6">
      {/* Smartphone Vertical Viewport Container (aspect-[9/19.5] / max-w-md) */}
      <main className="relative w-full max-w-md h-[100dvh] sm:h-[min(92dvh,860px)] sm:aspect-[9/19.5] flex flex-col bg-slate-950 sm:rounded-[42px] sm:border-[6px] sm:border-slate-800/90 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_40px_-10px_rgba(99,102,241,0.2)] overflow-hidden">
        {/* Compact Smartphone Status Bar & App Header */}
        <header className="flex flex-col bg-slate-900/95 border-b border-slate-800/80 px-3.5 pt-1.5 pb-1.5 select-none shrink-0">
          <div className="flex items-center justify-between text-[9px] font-medium text-slate-400 mb-1">
            <span>ELiS OS</span>
            <div className="hidden sm:block w-16 h-3 rounded-full bg-slate-950 border border-slate-800/80" />
            <div className="flex items-center gap-1.5">
              <Wifi className="w-2.5 h-2.5 text-slate-400" />
              <BatteryCharging className="w-3 h-3 text-emerald-400" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                <Keyboard className="w-3.5 h-3.5" />
              </div>
              <div>
                <h1 className="text-[11px] font-bold tracking-wide text-slate-100 leading-tight">
                  Teclado Seletor ELiS
                </h1>
                <p className="text-[9px] text-slate-400 leading-tight">
                  Escrita das Línguas de Sinais
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRefOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 text-[10px] font-medium text-indigo-300 transition-colors"
              title="Consultar tabela completa de 95 visografemas (ELiS Decodificada)"
            >
              <BookOpen className="w-3 h-3" />
              <span>Tabela ELiS</span>
            </button>
          </div>
        </header>

        {/* Section 1: Expanded Upper Area (3D Two-Hands Model + Word Visor + 5 Slots + Toolbar) */}
        <VisorArea
          completedSigns={completedSigns}
          slots={slots}
          activeStep={activeStep}
          copied={copied}
          hoveredItem={hoveredItem}
          lastHoveredLabel={lastHoveredLabel}
          isPlaying={isPlaying}
          playingSign={playingSign}
          playingIndex={safePlayingIndex}
          totalPlayingSigns={playableSigns.length}
          onSelectSlot={(step) => {
            setIsPlaying(false);
            setActiveStep(step);
          }}
          onTogglePlay={handleTogglePlay}
          onPlayFromSign={handlePlayFromSign}
          onCopy={handleCopy}
          onSpace={handleSpace}
          onBackspace={handleBackspace}
          onClearAll={handleClearAll}
        />

        {/* Section 2: Compact Lower Area (Modular Visografema Selector / Virtual Keyboard) */}
        <SelectorKeyboard
          activeStep={activeStep}
          selectedItemForActiveStep={slots[activeStep].item}
          onSelectVisografema={handleSelectVisografema}
          onShortcutAllClosedFingers={handleShortcutAllClosedFingers}
          onChangeStep={(step) => setActiveStep(step)}
          onHoverItem={handleHoverItem}
        />

        {/* Bottom Home Indicator Pill */}
        <div className="bg-slate-900/95 py-1 flex justify-center shrink-0">
          <div className="w-24 h-1 rounded-full bg-slate-700/70" />
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
