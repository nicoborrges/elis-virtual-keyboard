/**
 * Adaptador do detector (MediaPipe Tasks Vision 1.2.3) para o formato da pipeline.
 * Roda 100% no navegador: fotos e vídeos nunca saem da máquina.
 *
 * WASM e modelos vêm das URLs oficiais (versão fixada). Para uso offline,
 * copie-os para public/mediapipe/ e troque as constantes abaixo.
 */
import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type HandLandmarkerResult,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { assignHandSides, unmirrorDetection, type RawHandDetection } from '../pipeline/solver';
import type { CaptureFrame, CapturedPose, CaptureSource, LandmarkCapture, Vec3 } from '../pipeline/types';
import type { GifSource } from './gifSource';

export const MEDIAPIPE_VERSION = '1.2.3';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;

type Mode = 'IMAGE' | 'VIDEO';

const toVec3 = (l: { x: number; y: number; z: number }): Vec3 => [l.x, l.y, l.z];

export interface DetectorOptions {
  usePose: boolean;
  mirroredInput: boolean;
}

export class CaptureDetector {
  private hands: HandLandmarker;
  private pose: PoseLandmarker | null;
  private mode: Mode = 'IMAGE';
  /** Timestamps do modo VIDEO precisam crescer sempre, mesmo entre vídeos. */
  private lastTimestamp = 0;

  private constructor(hands: HandLandmarker, pose: PoseLandmarker | null) {
    this.hands = hands;
    this.pose = pose;
  }

  static async create(usePose: boolean): Promise<CaptureDetector> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const make = <T>(factory: (delegate: 'GPU' | 'CPU') => Promise<T>) =>
      factory('GPU').catch(() => factory('CPU'));

    const hands = await make((delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
        runningMode: 'IMAGE',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    );
    const pose = usePose
      ? await make((delegate) =>
          PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
            runningMode: 'IMAGE',
            numPoses: 1,
          })
        )
      : null;
    return new CaptureDetector(hands, pose);
  }

  get hasPose() {
    return this.pose !== null;
  }

  private async setMode(mode: Mode) {
    if (this.mode === mode) return;
    await this.hands.setOptions({ runningMode: mode });
    await this.pose?.setOptions({ runningMode: mode });
    this.mode = mode;
  }

  private toFrame(
    t: number,
    hr: HandLandmarkerResult,
    pr: PoseLandmarkerResult | null,
    size: { width: number; height: number },
    mirroredInput: boolean
  ): CaptureFrame {
    let pose: CapturedPose | undefined;
    if (pr && pr.landmarks.length > 0) {
      pose = {
        image: pr.landmarks[0].map(toVec3),
        visibility: pr.landmarks[0].map((l) => l.visibility ?? 0),
      };
    }
    let raw: RawHandDetection[] = hr.landmarks.map((lms, i) => ({
      image: lms.map(toVec3),
      world: hr.worldLandmarks[i].map(toVec3),
      label: hr.handedness[i]?.[0]?.categoryName ?? '',
      score: hr.handedness[i]?.[0]?.score ?? 0,
    }));
    if (mirroredInput) ({ hands: raw, pose } = unmirrorDetection(raw, pose));
    return { t, hands: assignHandSides(raw, pose, size, mirroredInput), pose };
  }

  async detectImage(image: HTMLImageElement, name: string, opts: DetectorOptions): Promise<LandmarkCapture> {
    await this.setMode('IMAGE');
    const size = { width: image.naturalWidth, height: image.naturalHeight };
    const hr = this.hands.detect(image);
    const pr = opts.usePose && this.pose ? this.pose.detect(image) : null;
    return wrap(
      { kind: 'image', name, ...size, mirrored: opts.mirroredInput },
      [this.toFrame(0, hr, pr, size, opts.mirroredInput)],
      this.hasPose && opts.usePose
    );
  }

  async detectVideo(
    video: HTMLVideoElement,
    name: string,
    opts: DetectorOptions & { fps: number; onProgress?: (fraction: number) => void; signal?: AbortSignal }
  ): Promise<LandmarkCapture> {
    await this.setMode('VIDEO');
    const size = { width: video.videoWidth, height: video.videoHeight };
    const duration = await finiteDuration(video);
    const step = 1 / opts.fps;
    const frames: CaptureFrame[] = [];
    video.pause();

    for (let i = 0; i * step <= duration; i++) {
      if (opts.signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
      const t = Math.min(i * step, Math.max(0, duration - 0.001));
      await seek(video, t);
      const ts = Math.max(this.lastTimestamp + 1, Math.round(performance.now()));
      this.lastTimestamp = ts;
      const hr = this.hands.detectForVideo(video, ts);
      const pr = opts.usePose && this.pose ? this.pose.detectForVideo(video, ts) : null;
      frames.push(this.toFrame(t, hr, pr, size, opts.mirroredInput));
      opts.onProgress?.(Math.min(1, t / duration));
    }

    return wrap(
      { kind: 'video', name, ...size, fps: opts.fps, duration, mirrored: opts.mirroredInput },
      frames,
      this.hasPose && opts.usePose
    );
  }

  /**
   * GIF de poses-chave: cada quadro é detectado como foto independente (modo IMAGE),
   * porque os quadros ficam longe demais no tempo para o rastreamento do modo VIDEO.
   */
  async detectKeyframes(
    gif: GifSource,
    name: string,
    opts: DetectorOptions & { origin?: string; onProgress?: (fraction: number) => void }
  ): Promise<LandmarkCapture> {
    await this.setMode('IMAGE');
    const size = { width: gif.width, height: gif.height };
    const frames: CaptureFrame[] = [];
    for (let i = 0; i < gif.frames.length; i++) {
      const image = await gif.frame(i);
      try {
        const hr = this.hands.detect(image);
        const pr = opts.usePose && this.pose ? this.pose.detect(image) : null;
        frames.push(this.toFrame(gif.frames[i].t, hr, pr, size, opts.mirroredInput));
      } finally {
        image.close();
      }
      opts.onProgress?.((i + 1) / gif.frames.length);
    }
    return wrap(
      {
        kind: 'keyframes',
        name,
        ...size,
        duration: gif.duration,
        mirrored: opts.mirroredInput,
        ...(opts.origin ? { origin: opts.origin } : {}),
      },
      frames,
      this.hasPose && opts.usePose
    );
  }

  close() {
    this.hands.close();
    this.pose?.close();
  }
}

function wrap(source: CaptureSource, frames: CaptureFrame[], usedPose: boolean): LandmarkCapture {
  return {
    schema: 'acme.landmarks',
    version: 1,
    source,
    createdAt: new Date().toISOString(),
    detector: `mediapipe-tasks-vision@${MEDIAPIPE_VERSION} hand_landmarker${usedPose ? ' + pose_landmarker_full' : ''}`,
    frames,
  };
}

/**
 * Vídeos gravados no navegador (MediaRecorder/webcam) costumam informar duração
 * Infinity até serem percorridos. Força o cálculo buscando um tempo enorme.
 */
export async function finiteDuration(video: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
  await new Promise<void>((resolve) => {
    const done = () => {
      if (!Number.isFinite(video.duration)) return;
      video.removeEventListener('durationchange', done);
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('durationchange', done);
    video.addEventListener('seeked', done);
    video.currentTime = 1e7;
  });
  const d = video.duration;
  await seek(video, 0);
  if (!Number.isFinite(d) || d <= 0) throw new Error('Não foi possível obter a duração do vídeo.');
  return d;
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - t) < 1e-4 && video.readyState >= 2) {
      resolve();
      return;
    }
    const done = () => {
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done);
    video.currentTime = t;
  });
}
