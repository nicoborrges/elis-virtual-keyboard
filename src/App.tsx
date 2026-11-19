import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { BookOpen } from 'lucide-react';
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

  const hasAnyContent = playableSigns.length > 0 || completedSigns.length > 0;

  const safePlayingIndex =
    playableSigns.length > 0 ? playbackIndex % playableSigns.length : 0;

  const playingSign =
    isPlaying && playableSigns.length > 0
      ? playableSigns[safePlayingIndex]
      : null;

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
        setLastHoveredLabel(item.label);
      } else {
        setLastHoveredLabel(null);
      }
    },
    []
  );

  const triggerSubtleConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 24,
        spread: 50,
        origin: { y: 0.38 },
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
      <main className="relative w-full max-w-md h-[100dvh] sm:h-[min(92dvh,860px)] sm:aspect-[9/19.5] flex flex-col bg-slate-950 sm:rounded-[40px] sm:border-[6px] sm:border-slate-800/90 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_40px_-10px_rgba(99,102,241,0.18)] overflow-hidden">
        {/* Minimalist Top Bar (Block 1) */}
        <header className="flex items-center justify-between px-4 h-12 bg-slate-950/90 border-b border-slate-900 select-none shrink-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-bold tracking-tight text-slate-100">
              ELiS
            </h1>
            <span className="text-[11px] font-medium text-slate-500">
              Teclado Visual
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsRefOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 transition-colors"
            title="Consultar tabela completa de 95 visografemas"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tabela</span>
          </button>
        </header>

        {/* Unified Upper Area: 3D Two-Hands + Integrated ELiS Visor (Block 2) */}
        <VisorArea
          completedSigns={completedSigns}
          slots={slots}
          copied={copied}
          hoveredItem={hoveredItem}
          lastHoveredLabel={lastHoveredLabel}
          isPlaying={isPlaying}
          playingSign={playingSign}
          playingIndex={safePlayingIndex}
          totalPlayingSigns={playableSigns.length}
          onPlayFromSign={handlePlayFromSign}
          onCopy={handleCopy}
          onClearAll={handleClearAll}
        />

        {/* Compact Native-Style Keyboard Drawer with Unified Stepper & Control Row (Block 3) */}
        <SelectorKeyboard
          slots={slots}
          activeStep={activeStep}
          hasAnyContent={hasAnyContent}
          isPlaying={isPlaying}
          onSelectVisografema={handleSelectVisografema}
          onShortcutAllClosedFingers={handleShortcutAllClosedFingers}
          onChangeStep={(step) => {
            setIsPlaying(false);
            setActiveStep(step);
          }}
          onHoverItem={handleHoverItem}
          onSpace={handleSpace}
          onBackspace={handleBackspace}
          onTogglePlay={handleTogglePlay}
        />

        {/* Reference Sheet Modal */}
        <ReferenceModal
          isOpen={isRefOpen}
          onClose={() => setIsRefOpen(false)}
        />
      </main>
    </div>
  );
}

export default App;
