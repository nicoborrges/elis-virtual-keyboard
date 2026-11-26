/**
 * GIF animado como sequência de quadros com tempo real, via ImageDecoder (WebCodecs).
 * O decodificador do Chromium entrega quadros já compostos (o quadro inteiro, não o
 * retângulo que mudou), que é o que o detector precisa.
 */

export interface GifFrameInfo {
  /** Início do quadro em segundos. */
  t: number;
  /** Duração do quadro em segundos. */
  duration: number;
}

export class GifSource {
  readonly frames: GifFrameInfo[];
  readonly duration: number;
  readonly width: number;
  readonly height: number;
  private decoder: ImageDecoder;

  private constructor(decoder: ImageDecoder, frames: GifFrameInfo[], width: number, height: number) {
    this.decoder = decoder;
    this.frames = frames;
    this.width = width;
    this.height = height;
    const last = frames[frames.length - 1];
    this.duration = last ? last.t + last.duration : 0;
  }

  static supported(): boolean {
    return typeof ImageDecoder !== 'undefined';
  }

  static async open(data: Blob): Promise<GifSource> {
    if (!GifSource.supported()) throw new Error('Este navegador não decodifica GIF quadro a quadro (use Chrome ou Edge).');
    const decoder = new ImageDecoder({ data: await data.arrayBuffer(), type: 'image/gif' });
    await decoder.tracks.ready;
    await decoder.completed;
    const track = decoder.tracks.selectedTrack;
    if (!track) throw new Error('GIF sem quadros.');
    const frames: GifFrameInfo[] = [];
    let t = 0;
    let width = 0;
    let height = 0;
    for (let i = 0; i < track.frameCount; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      // GIF sem atraso declarado: navegadores tocam a ~10 quadros/s
      const duration = image.duration ? image.duration / 1e6 : 0.1;
      width = image.displayWidth;
      height = image.displayHeight;
      image.close();
      frames.push({ t, duration });
      t += duration;
    }
    return new GifSource(decoder, frames, width, height);
  }

  /** Índice do quadro visível no tempo `t` (segundos). */
  indexAt(t: number): number {
    let i = 0;
    while (i + 1 < this.frames.length && this.frames[i + 1].t <= t + 1e-6) i++;
    return i;
  }

  /** Quadro decodificado. Quem chama deve fechar com `close()`. */
  async frame(index: number): Promise<VideoFrame> {
    const { image } = await this.decoder.decode({ frameIndex: index });
    return image;
  }

  close() {
    this.decoder.close();
  }
}
