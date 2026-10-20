/*
  Records a voice note in the browser and turns it into a small MP3 (mono, 16 kHz, 32 kbit/s: about
  4 KB per second). MP3 on purpose: a phone's own recorder format (WebM on Android, MP4 on iPhone) is
  not played by every phone, while MP3 plays everywhere. The microphone is read through the Web Audio
  API, the same on every browser, and encoded here, so the server only stores the file.
*/

const TARGET_RATE = 16_000;
const KBPS = 32;

type AudioContextCtor = typeof AudioContext;
const audioContextCtor = (): AudioContextCtor | undefined =>
  typeof window === "undefined"
    ? undefined
    : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext);

/** True when this browser can record from the microphone. */
export function canRecordVoice(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(audioContextCtor());
}

/** The person refused the microphone (or none is available). */
export class MicDenied extends Error {
  constructor() {
    super("microphone not allowed");
  }
}

export interface Recording {
  blob: Blob;
  /** whole seconds, at least 1 for anything recorded */
  seconds: number;
}

export class VoiceRecorder {
  private chunks: Float32Array[] = [];
  private samples = 0;
  private released = false;

  private constructor(
    private readonly ctx: AudioContext,
    private readonly stream: MediaStream,
    private readonly source: MediaStreamAudioSourceNode,
    private readonly processor: ScriptProcessorNode,
  ) {}

  /** Asks for the microphone and starts recording. Call it from a tap (phones insist on that). */
  static async start(): Promise<VoiceRecorder> {
    const Ctx = audioContextCtor();
    if (!Ctx || !navigator.mediaDevices?.getUserMedia) throw new MicDenied();
    const ctx = new Ctx(); // made inside the tap, so iPhone lets it run
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      void ctx.close();
      throw new MicDenied();
    }
    await ctx.resume().catch(() => {});

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    const recorder = new VoiceRecorder(ctx, stream, source, processor);
    processor.onaudioprocess = (event) => {
      recorder.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      recorder.samples += event.inputBuffer.length;
    };
    source.connect(processor);
    processor.connect(ctx.destination); // needed for the processor to run; it outputs silence
    return recorder;
  }

  /** How much has been recorded so far. */
  get seconds(): number {
    return this.samples / this.ctx.sampleRate;
  }

  private release() {
    if (this.released) return;
    this.released = true;
    this.processor.onaudioprocess = null;
    this.processor.disconnect();
    this.source.disconnect();
    this.stream.getTracks().forEach((track) => track.stop());
    void this.ctx.close();
  }

  /** Throws the recording away. */
  cancel() {
    this.release();
    this.chunks = [];
  }

  /** Ends the recording and encodes it. */
  async stop(): Promise<Recording> {
    const rate = this.ctx.sampleRate;
    this.release();
    const merged = new Float32Array(this.samples);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.chunks = [];
    return { blob: await encodeMp3(merged, rate), seconds: Math.max(1, Math.round(merged.length / rate)) };
  }
}

/** Averages the samples down to the target rate (speech needs no more). */
function downsample(input: Float32Array, rate: number): Float32Array {
  if (rate <= TARGET_RATE) return input;
  const ratio = rate / TARGET_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i += 1) {
    const from = Math.floor(i * ratio);
    const to = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = from; j < to; j += 1) sum += input[j];
    out[i] = to > from ? sum / (to - from) : 0;
  }
  return out;
}

async function encodeMp3(samples: Float32Array, rate: number): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs"); // loaded only when someone records
  const mono = downsample(samples, rate);
  const pcm = new Int16Array(mono.length);
  for (let i = 0; i < mono.length; i += 1) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const encoder = new Mp3Encoder(1, rate <= TARGET_RATE ? rate : TARGET_RATE, KBPS);
  const parts: Uint8Array[] = [];
  const block = 1152;
  for (let i = 0, n = 0; i < pcm.length; i += block, n += 1) {
    const part = encoder.encodeBuffer(pcm.subarray(i, i + block));
    if (part.length > 0) parts.push(part);
    // give the screen a breath now and then, so a long note does not freeze the page
    if (n % 60 === 59) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const last = encoder.flush();
  if (last.length > 0) parts.push(last);
  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}
