import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowLeftRight, Download, FileJson, Loader2, Pause, Play, Save, Trash2, Upload } from 'lucide-react';
import rigCalibrationData from '../data/rigCalibration.json';
import { ELIS_VISOGRAFEMAS } from '../data/elisMap';
import { addCalibrationSample, removeCalibration, roundDeep, type CalibrationStep } from '../pipeline/calibration';
import { suggestForHand, type Suggestion } from '../pipeline/classify';
import { fillGaps, smoothCapture } from '../pipeline/filter';
import { frameAt, labelAgreement, solveCapture, stabilizeSides, suspectSides, swapHandSides } from '../pipeline/solver';
import type { HandSide, LandmarkCapture, RigCalibration, SignClip, SolvedHand } from '../pipeline/types';
import { cn } from '../utils/cn';
import { CaptureDetector, finiteDuration, HAND_CONNECTIONS } from './detector';
import { RigPreview } from './RigPreview';

type Media = { kind: 'image' | 'video'; url: string; name: string };
type Status = { kind: 'idle' | 'busy' | 'error' | 'ok'; text: string };

const STEP_OF: Record<CalibrationStep, 1 | 2 | 3> = { thumb: 1, fingers: 2, palm: 3 };
const STEP_LABEL: Record<CalibrationStep, string> = { thumb: 'Polegar', fingers: 'Dedos', palm: 'Palma' };

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

function downloadJson(filename: string, data: unknown, pretty = false) {
  const blob = new Blob([pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Grava no repositório pelo servidor de dev; sem ele, baixa o arquivo. */
async function saveToRepo(kind: 'clip' | 'calibration', name: string, data: unknown): Promise<string> {
  try {
    const res = await fetch('/__pipeline/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, name, data }),
    });
    const body = await res.json();
    if (body.ok) return `Salvo em ${body.path}`;
    throw new Error(body.error);
  } catch {
    downloadJson(`${name}.json`, data);
    return 'Servidor de dev indisponível — arquivo baixado. Copie-o para src/data/.';
  }
}

/** Resumo da extração + verificações de lado (rótulo × corpo, flexão impossível, sem corpo). */
function describeCapture(capture: LandmarkCapture): string {
  const withHands = capture.frames.filter((f) => f.hands.length > 0).length;
  if (!withHands) return 'Nenhuma mão detectada. Tente mais luz, fundo liso e mãos inteiras no quadro.';
  const parts = [`${withHands}/${capture.frames.length} quadro(s) com mãos detectadas. Confira: “D” deve marcar a mão direita de quem sinaliza.`];
  const agreement = labelAgreement(capture);
  if (agreement.total) {
    parts.push(`Rótulo do detector × corpo: ${Math.round((100 * agreement.agree) / agreement.total)}% de concordância.`);
  } else {
    parts.push('Sem corpo no quadro: o lado veio só do rótulo do detector — inclua os ombros nas fotos de calibração.');
  }
  const suspect = suspectSides(capture);
  if (suspect.suspect > 0) {
    parts.push(`⚠ ${suspect.suspect} mão(s) com dedos dobrando para trás — o lado pode estar trocado (use “Trocar D↔E”).`);
  }
  return parts.join(' ');
}

export function StudioApp() {
  const [media, setMedia] = useState<Media | null>(null);
  const [usePose, setUsePose] = useState(true);
  const [fps, setFps] = useState(30);
  const [smoothing, setSmoothing] = useState(true);
  const [mirroredInput, setMirroredInput] = useState(false);
  const [dominantHand, setDominantHand] = useState<HandSide>('right');
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: 'Envie uma foto ou vídeo de Libras.' });
  const [progress, setProgress] = useState(0);
  const [capture, setCapture] = useState<LandmarkCapture | null>(null);
  const [time, setTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [calibration, setCalibration] = useState<RigCalibration>(rigCalibrationData as RigCalibration);
  const [calStep, setCalStep] = useState<CalibrationStep>('thumb');
  const [calChar, setCalChar] = useState<string | null>(null);
  const [calHand, setCalHand] = useState<'dominant' | 'nonDominant'>('dominant');
  const [clipForm, setClipForm] = useState({ word: '', elis: '', author: '', notes: '', start: 0, end: 0, validated: false });

  const detectorRef = useRef<CaptureDetector | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const solved = useMemo(() => (capture ? solveCapture(capture, { dominantHand }) : []), [capture, dominantHand]);
  const duration = capture?.source.duration ?? 0;
  const currentFrame = frameAt(solved, time);
  const currentCaptureFrame = capture ? frameAt(capture.frames, time) : undefined;

  const suggestions = useMemo(() => {
    const s = (h: SolvedHand | undefined, sign: 1 | -1) => (h ? suggestForHand(h, sign) : null);
    return { dominant: s(currentFrame?.dominant, 1), nonDominant: s(currentFrame?.nonDominant, -1) };
  }, [currentFrame]);

  // ---------------------------------------------------------------- mídia
  const onFile = useCallback(async (file: File) => {
    if (file.name.endsWith('.json')) {
      const data = JSON.parse(await file.text());
      if (data.schema === 'acme.landmarks') setCapture(data);
      else if (data.schema === 'acme.signclip') {
        const clip = data as SignClip;
        setCapture(clip.landmarks);
        setDominantHand(clip.meta.dominantHand);
        setClipForm({ ...clip.meta, start: 0, end: clip.landmarks.source.duration ?? 0, validated: clip.meta.validatedByLetras });
      } else {
        setStatus({ kind: 'error', text: 'JSON não reconhecido (esperado acme.landmarks ou acme.signclip).' });
        return;
      }
      setMedia(null);
      setTime(0);
      setStatus({ kind: 'ok', text: `Landmarks carregados de ${file.name}.` });
      return;
    }
    const kind = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : null;
    if (!kind) {
      setStatus({ kind: 'error', text: 'Formato não suportado. Use imagem, vídeo ou JSON da pipeline.' });
      return;
    }
    setMedia((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { kind, url: URL.createObjectURL(file), name: file.name };
    });
    setCapture(null);
    setTime(0);
    setProgress(0);
    setStatus({ kind: 'idle', text: 'Mídia carregada. Clique em “Extrair landmarks”.' });
  }, []);

  const ensureDetector = useCallback(async () => {
    const cur = detectorRef.current;
    if (cur && cur.hasPose === usePose) return cur;
    cur?.close();
    setStatus({ kind: 'busy', text: 'Carregando modelos do MediaPipe (1ª vez pode demorar)…' });
    const d = await CaptureDetector.create(usePose);
    detectorRef.current = d;
    return d;
  }, [usePose]);

  const extract = useCallback(async () => {
    if (!media) return;
    try {
      const detector = await ensureDetector();
      let raw: LandmarkCapture;
      if (media.kind === 'image') {
        setStatus({ kind: 'busy', text: 'Detectando mãos…' });
        raw = await detector.detectImage(imgRef.current!, media.name, { usePose, mirroredInput });
      } else {
        const controller = new AbortController();
        abortRef.current = controller;
        setStatus({ kind: 'busy', text: 'Processando vídeo quadro a quadro…' });
        raw = await detector.detectVideo(videoRef.current!, media.name, {
          usePose,
          mirroredInput,
          fps,
          signal: controller.signal,
          onProgress: setProgress,
        });
      }
      let clean = raw;
      if (raw.source.kind === 'video') {
        clean = stabilizeSides(clean);
        clean = fillGaps(clean, 4);
        if (smoothing) clean = smoothCapture(clean);
      }
      setCapture(clean);
      setStatus({ kind: 'ok', text: describeCapture(clean) });
      setClipForm((f) => ({ ...f, start: 0, end: clean.source.duration ?? 0 }));
      if (videoRef.current) videoRef.current.currentTime = 0;
      setTime(0);
    } catch (err) {
      if ((err as Error).name === 'AbortError') setStatus({ kind: 'idle', text: 'Processamento cancelado.' });
      else setStatus({ kind: 'error', text: `Falha: ${(err as Error).message}` });
    } finally {
      abortRef.current = null;
    }
  }, [media, ensureDetector, usePose, mirroredInput, fps, smoothing]);

  const swapSides = () => {
    if (!capture) return;
    const swapped = swapHandSides(capture);
    setCapture(swapped);
    setStatus({ kind: 'ok', text: `Lados trocados manualmente. ${describeCapture(swapped)}` });
  };

  useEffect(() => () => detectorRef.current?.close(), []);

  // ------------------------------------------------- tempo / reprodução
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const video = videoRef.current;
      if (video && media?.kind === 'video') {
        setTime(video.currentTime);
        if (video.paused) setPlaying(false);
      } else if (duration > 0) {
        setTime((t) => (t + (now - last) / 1000) % duration);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, media, duration]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video && media?.kind === 'video') {
      if (video.paused) void video.play();
      else video.pause();
      setPlaying(video.paused ? false : true);
    } else {
      setPlaying((p) => !p);
    }
  };

  const scrub = (t: number) => {
    setTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  // -------------------------------------------------------- sobreposição
  useEffect(() => {
    const canvas = canvasRef.current;
    const el = media?.kind === 'video' ? videoRef.current : imgRef.current;
    if (!canvas || !el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const f = currentCaptureFrame;
    if (!f) return;
    // Landmarks ficam desespelhados; a mídia exibida continua espelhada
    const mx = capture?.source.mirrored ? (x: number) => (1 - x) * w : (x: number) => x * w;

    if (f.pose) {
      ctx.fillStyle = 'rgba(201,195,185,0.8)';
      f.pose.image.slice(0, 25).forEach((p, i) => {
        if (f.pose!.visibility[i] < 0.5) return;
        ctx.beginPath();
        ctx.arc(mx(p[0]), p[1] * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    for (const hand of f.hands) {
      const color = hand.side === 'right' ? '#D8AE5E' : '#B8615C';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (const c of HAND_CONNECTIONS) {
        const a = hand.image[c.start];
        const b = hand.image[c.end];
        ctx.beginPath();
        ctx.moveTo(mx(a[0]), a[1] * h);
        ctx.lineTo(mx(b[0]), b[1] * h);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.font = '600 12px Inter, sans-serif';
      const wr = hand.image[0];
      ctx.fillText(hand.side === 'right' ? 'D' : 'E', mx(wr[0]) + 6, wr[1] * h + 14);
    }
  }, [currentCaptureFrame, media, capture]);

  // ---------------------------------------------------------- calibração
  const calTargetHand = currentFrame?.[calHand];
  const calCaptureHand = currentCaptureFrame?.hands.find(
    (h) => (h.side === dominantHand) === (calHand === 'dominant')
  );
  const calSign: 1 | -1 = calHand === 'dominant' ? 1 : -1;
  const calSuggestion = suggestions[calHand]?.[calStep][0]?.char ?? null;
  const effectiveCalChar = calChar ?? calSuggestion;

  const addSample = () => {
    if (!calTargetHand || !effectiveCalChar) return;
    setCalibration((c) => addCalibrationSample(c, calStep, effectiveCalChar, calTargetHand, calSign));
    setStatus({ kind: 'ok', text: `Amostra adicionada: ${STEP_LABEL[calStep]} “${effectiveCalChar}”.` });
  };

  const calEntries = (['thumb', 'fingers', 'palm'] as CalibrationStep[]).flatMap((step) =>
    Object.entries(calibration[step]).map(([char, v]) => ({ step, char, samples: v.samples }))
  );

  // --------------------------------------------------------------- clipe
  const buildClip = (): SignClip | null => {
    if (!capture) return null;
    const start = clipForm.start;
    const end = clipForm.end > start ? clipForm.end : capture.source.duration ?? 0;
    const frames = capture.frames.filter((f) => f.t >= start - 1e-6 && f.t <= end + 1e-6).map((f) => ({ ...f, t: f.t - start }));
    const trimmed: LandmarkCapture = { ...capture, source: { ...capture.source, duration: end - start }, frames };
    return roundDeep({
      schema: 'acme.signclip',
      version: 1,
      meta: {
        word: clipForm.word.trim(),
        elis: clipForm.elis.trim(),
        author: clipForm.author.trim(),
        notes: clipForm.notes.trim(),
        dominantHand,
        trim: { start, end },
        validatedByLetras: clipForm.validated,
      },
      landmarks: trimmed,
      frames: solveCapture(trimmed, { dominantHand }),
    } satisfies SignClip);
  };

  const saveClip = async () => {
    const clip = buildClip();
    const slug = slugify(clipForm.word);
    if (!clip || !slug) {
      setStatus({ kind: 'error', text: 'Informe a palavra em português antes de salvar o clipe.' });
      return;
    }
    setStatus({ kind: 'ok', text: await saveToRepo('clip', slug, clip) });
  };

  const useSuggestionAsElis = () => {
    const s = suggestions.dominant;
    if (!s) return;
    setClipForm((f) => ({ ...f, elis: s.thumb[0].char + s.fingers[0].char + s.palm[0].char }));
  };

  // ------------------------------------------------------------------ UI
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_50%_0%,_#1A1816_0%,_#0A0908_65%)] text-ink-100">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gold-900/40">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl font-bold tracking-[0.12em] text-gold-400">ACME</h1>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">Estúdio de Captura</span>
        </div>
        <p className="text-xs text-ink-400 max-w-xl">
          Fotos calibram as poses dos visografemas; vídeos viram clipes de sinais. Tudo é processado neste navegador —
          a mídia não é enviada a nenhum servidor e os arquivos gerados não contêm imagens (só pontos e metadados).
        </p>
        <a href="/" className="flex items-center gap-1.5 text-xs text-ink-300 hover:text-gold-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Teclado
        </a>
      </header>

      <main className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------ coluna da mídia */}
        <section className="flex flex-col gap-4 min-w-0">
          <label
            className="acme-frame flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-700 bg-ink-950/60 px-4 py-5 text-center cursor-pointer hover:border-gold-700"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void onFile(file);
            }}
          >
            <Upload className="w-5 h-5 text-gold-400" />
            <span className="text-sm text-ink-200">Arraste ou escolha uma foto, vídeo ou JSON da pipeline</span>
            <span className="text-[11px] text-ink-500">Guarde as gravações originais em <code>capturas/</code> (fora do Git)</span>
            <input
              type="file"
              accept="image/*,video/*,.json,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = '';
              }}
            />
          </label>

          {media && (
            <div className="relative self-center max-w-full rounded-xl overflow-hidden border border-ink-800 bg-black">
              {media.kind === 'image' ? (
                <img ref={imgRef} src={media.url} alt="Mídia enviada" className="block max-h-[56vh] w-auto max-w-full" onLoad={() => setTime(0)} />
              ) : (
                <video
                  ref={videoRef}
                  src={media.url}
                  className="block max-h-[56vh] w-auto max-w-full"
                  playsInline
                  muted
                  onTimeUpdate={(e) => {
                    if (!playing) setTime(e.currentTarget.currentTime);
                  }}
                  onEnded={() => setPlaying(false)}
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    void finiteDuration(v).then(setVideoDuration).catch(() => setVideoDuration(0));
                  }}
                />
              )}
              <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full" />
            </div>
          )}

          {(media?.kind === 'video' || (capture && duration > 0)) && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-ink-800 hover:bg-ink-700 text-ink-100"
                aria-label={playing ? 'Pausar' : 'Reproduzir'}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={duration || videoDuration}
                step={1 / fps}
                value={time}
                onChange={(e) => scrub(Number(e.target.value))}
                className="flex-1 accent-[#D8AE5E]"
                aria-label="Linha do tempo"
              />
              <span className="font-mono text-[11px] text-ink-400 w-20 text-right">{time.toFixed(2)} s</span>
            </div>
          )}

          <div className="grid gap-3 rounded-2xl border border-ink-800 bg-ink-950/60 p-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-300">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={usePose} onChange={(e) => setUsePose(e.target.checked)} className="accent-[#D8AE5E]" />
                Usar esqueleto do corpo (lado das mãos e escala)
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={smoothing} onChange={(e) => setSmoothing(e.target.checked)} className="accent-[#D8AE5E]" />
                Suavizar vídeo
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={mirroredInput} onChange={(e) => setMirroredInput(e.target.checked)} className="accent-[#D8AE5E]" />
                Mídia espelhada (selfie)
              </label>
              <label className="flex items-center gap-1.5">
                Quadros/s
                <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="rounded-md bg-ink-900 border border-ink-700 px-1.5 py-0.5">
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                Mão dominante
                <select value={dominantHand} onChange={(e) => setDominantHand(e.target.value as HandSide)} className="rounded-md bg-ink-900 border border-ink-700 px-1.5 py-0.5">
                  <option value="right">Direita</option>
                  <option value="left">Esquerda (espelha)</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void extract()}
                disabled={!media || status.kind === 'busy'}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-void text-xs font-semibold disabled:opacity-40"
              >
                {status.kind === 'busy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Extrair landmarks
              </button>
              {status.kind === 'busy' && media?.kind === 'video' && (
                <button type="button" onClick={() => abortRef.current?.abort()} className="h-9 px-3 rounded-xl bg-ink-800 text-xs text-ink-200">
                  Cancelar
                </button>
              )}
              {capture && (
                <button
                  type="button"
                  onClick={() => downloadJson(`${slugify(capture.source.name) || 'captura'}-landmarks.json`, roundDeep(capture))}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-ink-800 hover:bg-ink-700 text-xs text-ink-200"
                >
                  <FileJson className="w-3.5 h-3.5" /> Baixar landmarks
                </button>
              )}
              {capture && (
                <button
                  type="button"
                  onClick={swapSides}
                  title="Use se “D” não estiver na mão direita de quem sinaliza"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-ink-800 hover:bg-ink-700 text-xs text-ink-200"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Trocar D↔E
                </button>
              )}
            </div>

            {status.kind === 'busy' && media?.kind === 'video' && progress > 0 && (
              <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                <div className="h-full bg-gold-400 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
            <p
              role="status"
              className={cn(
                'text-xs',
                status.kind === 'error' ? 'text-wine-300' : status.kind === 'ok' ? 'text-vida-300' : 'text-ink-400'
              )}
            >
              {status.text}
            </p>
          </div>
        </section>

        {/* ------------------------------------------- coluna do rig e saídas */}
        <section className="flex flex-col gap-4 min-w-0">
          <div className="relative h-[340px] rounded-2xl border border-ink-800 bg-[radial-gradient(ellipse_at_50%_35%,_rgba(216,174,94,0.10)_0%,_rgba(10,9,8,0.98)_75%)] overflow-hidden">
            <RigPreview frame={currentFrame} />
            <div aria-hidden="true" className="acme-frame pointer-events-none absolute inset-2.5" />
            <span className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
              Rig procedural · prévia
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SuggestionsCard title="Mão dominante" color="text-gold-300" data={suggestions.dominant} />
            <SuggestionsCard title="Mão não dominante" color="text-wine-300" data={suggestions.nonDominant} />
          </div>

          {/* --------------------------------------------- calibração */}
          <Panel title="Calibrar visografema (fotos)">
            <p className="text-[11px] text-ink-400">
              Fotografe a configuração isolada, confira a sugestão e adicione como amostra. A média das amostras substitui a
              pose ajustada à mão no teclado.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {(['thumb', 'fingers', 'palm'] as CalibrationStep[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCalStep(s);
                    setCalChar(null);
                  }}
                  className={cn(
                    'h-8 px-3 rounded-lg border',
                    calStep === s ? 'border-gold-400 bg-gold-400/15 text-gold-100' : 'border-ink-700 text-ink-300'
                  )}
                >
                  {STEP_LABEL[s]}
                </button>
              ))}
              <select
                value={calHand}
                onChange={(e) => setCalHand(e.target.value as 'dominant' | 'nonDominant')}
                className="h-8 rounded-lg bg-ink-900 border border-ink-700 px-2 text-ink-200"
              >
                <option value="dominant">Mão dominante</option>
                <option value="nonDominant">Mão não dominante</option>
              </select>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {ELIS_VISOGRAFEMAS.filter((v) => v.step === STEP_OF[calStep]).map((v) => (
                <button
                  key={v.char}
                  type="button"
                  title={v.label}
                  aria-label={v.label}
                  onClick={() => setCalChar(v.char)}
                  className={cn(
                    'h-11 rounded-xl border font-elis text-[26px] leading-none pt-1',
                    effectiveCalChar === v.char
                      ? 'border-gold-400 bg-gold-400/15 text-white'
                      : 'border-ink-800 bg-ink-950/70 text-ink-200 hover:border-ink-600'
                  )}
                >
                  {v.char}
                  {calSuggestion === v.char && <span className="sr-only"> (sugerido)</span>}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addSample}
                disabled={!calTargetHand || !effectiveCalChar}
                className="h-8 px-3 rounded-lg bg-gold-400 hover:bg-gold-300 text-void text-xs font-semibold disabled:opacity-40"
              >
                Adicionar amostra
              </button>
              <button
                type="button"
                onClick={async () => setStatus({ kind: 'ok', text: await saveToRepo('calibration', 'rigCalibration', roundDeep(calibration)) })}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-ink-800 hover:bg-ink-700 text-xs text-ink-200"
              >
                <Save className="w-3.5 h-3.5" /> Salvar no repositório
              </button>
              {!calTargetHand && <span className="text-[11px] text-ink-500">Sem essa mão no quadro atual.</span>}
              {calTargetHand && calCaptureHand?.sideSource === 'handedness' && (
                <span className="text-[11px] text-wine-300">Sem ombros no quadro: confira D/E antes de calibrar.</span>
              )}
            </div>
            {calEntries.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {calEntries.map((e) => (
                  <li key={`${e.step}-${e.char}`} className="flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-950/70 pl-2 pr-1 py-0.5 text-[11px] text-ink-300">
                    <span className="text-ink-500">{STEP_LABEL[e.step]}</span>
                    <span className="font-elis text-lg leading-none pt-1 text-ink-100">{e.char}</span>
                    <span className="font-mono">×{e.samples}</span>
                    <button
                      type="button"
                      aria-label={`Remover calibração ${e.char}`}
                      onClick={() => setCalibration((c) => removeCalibration(c, e.step, e.char))}
                      className="p-1 text-ink-500 hover:text-wine-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* --------------------------------------------- clipe */}
          <Panel title="Exportar clipe de sinal (vídeos)">
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <Field label="Palavra (português)">
                <input value={clipForm.word} onChange={(e) => setClipForm({ ...clipForm, word: e.target.value })} className="input" placeholder="ex.: fogo" />
              </Field>
              <Field label="Escrita ELiS">
                <div className="flex gap-1.5">
                  <input value={clipForm.elis} onChange={(e) => setClipForm({ ...clipForm, elis: e.target.value })} className="input font-elis text-xl leading-none pt-1.5" />
                  <button type="button" onClick={useSuggestionAsElis} disabled={!suggestions.dominant} className="shrink-0 px-2 rounded-lg bg-ink-800 text-[11px] text-ink-300 disabled:opacity-40" title="Preenche polegar, dedos e palma com a sugestão do quadro atual">
                    Sugestão
                  </button>
                </div>
              </Field>
              <Field label="Autor / fonte">
                <input value={clipForm.author} onChange={(e) => setClipForm({ ...clipForm, author: e.target.value })} className="input" placeholder="função, não nome (ex.: monitora Letras-UFG)" />
              </Field>
              <Field label="Observações">
                <input value={clipForm.notes} onChange={(e) => setClipForm({ ...clipForm, notes: e.target.value })} className="input" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button type="button" onClick={() => setClipForm({ ...clipForm, start: time })} className="h-8 px-3 rounded-lg bg-ink-800 text-ink-200">
                Início = {clipForm.start.toFixed(2)} s
              </button>
              <button type="button" onClick={() => setClipForm({ ...clipForm, end: time })} className="h-8 px-3 rounded-lg bg-ink-800 text-ink-200">
                Fim = {clipForm.end.toFixed(2)} s
              </button>
              <label className="flex items-center gap-1.5 text-ink-300">
                <input type="checkbox" checked={clipForm.validated} onChange={(e) => setClipForm({ ...clipForm, validated: e.target.checked })} className="accent-[#D8AE5E]" />
                Validado pela Letras-UFG
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveClip()} disabled={!capture} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gold-400 hover:bg-gold-300 text-void text-xs font-semibold disabled:opacity-40">
                <Save className="w-3.5 h-3.5" /> Salvar clipe no repositório
              </button>
              <button
                type="button"
                onClick={() => {
                  const clip = buildClip();
                  if (clip) downloadJson(`${slugify(clipForm.word) || 'clipe'}.json`, clip);
                }}
                disabled={!capture}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-ink-800 hover:bg-ink-700 text-xs text-ink-200 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" /> Baixar
              </button>
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="grid gap-3 rounded-2xl border border-ink-800 bg-ink-950/60 p-4">
    <h2 className="font-display text-sm font-semibold tracking-wide text-gold-300">{title}</h2>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="grid gap-1">
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</span>
    {children}
  </label>
);

const SuggestionsCard: React.FC<{
  title: string;
  color: string;
  data: { thumb: Suggestion[]; fingers: Suggestion[]; palm: Suggestion[] } | null;
}> = ({ title, color, data }) => (
  <div className="rounded-2xl border border-ink-800 bg-ink-950/60 p-3">
    <h3 className={cn('font-mono text-[10px] uppercase tracking-[0.16em] mb-2', color)}>{title}</h3>
    {!data ? (
      <p className="text-[11px] text-ink-500">Não detectada neste quadro.</p>
    ) : (
      <div className="grid gap-1.5">
        {(
          [
            ['Polegar', data.thumb],
            ['Dedos', data.fingers],
            ['Palma', data.palm],
          ] as const
        ).map(([label, list]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-14 text-[11px] text-ink-400">{label}</span>
            {list.slice(0, 3).map((s, i) => (
              <span
                key={s.char}
                title={`${s.label} — ${(s.confidence * 100).toFixed(0)}%`}
                className={cn(
                  'flex items-center gap-1 rounded-lg border px-1.5',
                  i === 0 ? 'border-gold-500/70 bg-gold-400/10 text-ink-50' : 'border-ink-800 text-ink-400'
                )}
              >
                <span className="font-elis text-xl leading-none pt-1">{s.char}</span>
                <span className="font-mono text-[10px]">{(s.confidence * 100).toFixed(0)}%</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    )}
  </div>
);
