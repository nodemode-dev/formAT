interface DictationHooks {
  state(on: boolean, label: string): void;
  text(t: string): void;
  error(msg: string): void;
}

interface SpeechResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<SpeechResultLike> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function nativeRecognition(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class Dictation {
  private live = false;
  private rec: SpeechRecognitionLike | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(private language: () => string, private hooks: DictationHooks) {}

  toggle(): void {
    if (this.live) this.stop();
    else void this.start();
  }

  private set(on: boolean, label: string): void {
    this.live = on;
    this.hooks.state(on, label);
  }

  private async start(): Promise<void> {
    const Native = nativeRecognition();
    if (Native) {
      const rec = new Native();
      rec.lang = this.language() || 'en-US';
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) this.hooks.text(r[0].transcript.trim());
        }
      };
      rec.onerror = (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') this.hooks.error(`Dictation stopped: ${e.error}`);
      };
      rec.onend = () => this.set(false, 'Dictation');
      this.rec = rec;
      rec.start();
      this.set(true, 'Listening (browser speech recognition); click to stop');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.hooks.error('This browser cannot record audio');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.hooks.error('Microphone permission was refused');
      return;
    }
    this.chunks = [];
    const recorder = new MediaRecorder(this.stream);
    recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    recorder.onstop = () => void this.transcribe(recorder.mimeType || 'audio/webm');
    this.recorder = recorder;
    recorder.start();
    this.set(true, 'Recording; click to stop and transcribe');
  }

  private stop(): void {
    if (this.rec) {
      this.rec.stop();
      this.rec = null;
      return;
    }
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.set(false, 'Transcribing');
  }

  private async transcribe(mime: string): Promise<void> {
    const blob = new Blob(this.chunks, { type: mime });
    this.chunks = [];
    this.recorder = null;
    if (!blob.size) {
      this.set(false, 'Dictation');
      return;
    }
    const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
    const form = new FormData();
    form.append('audio', blob, `speech.${ext}`);
    form.append('language', this.language() || 'en-US');
    try {
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || `transcription failed (${res.status})`);
      if (body.text) this.hooks.text(String(body.text));
    } catch (e) {
      this.hooks.error(e instanceof Error ? e.message : String(e));
    } finally {
      this.set(false, 'Dictation');
    }
  }
}
