import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { useSettingsStore } from '../store/settingsStore';
import { silentFail } from '../core/utils';

interface WebSpeechRecognitionEvent {
  results: Array<Array<{ transcript: string }>>;
}

interface WebSpeechRecognitionErrorEvent {
  error: string;
}

interface WebSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type WebSpeechConstructor = new () => WebSpeechRecognition;

export class VoiceAssistant {
  private recognition: WebSpeechRecognition | null = null;
  public isListening = false;
  public onResult?: (text: string) => void;
  public onError?: (err: string) => void;
  public isNative: boolean;

  constructor(onResult?: (text: string) => void, onError?: (err: string) => void) {
    this.onResult = onResult;
    this.onError = onError;
    this.isNative = Capacitor.isNativePlatform();
    this.init();
  }

  async init(): Promise<void> {
    if (this.isNative) {
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: WebSpeechConstructor;
      webkitSpeechRecognition?: WebSpeechConstructor;
    };
    const SpeechRecognitionWeb = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionWeb) {
      this.recognition = new SpeechRecognitionWeb();
      this.recognition.lang = 'ar-SA';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript && this.onResult) this.onResult(transcript);
      };

      this.recognition.onerror = (event) => {
        if (this.onError) this.onError(event.error);
        this.stop();
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  async start(): Promise<void> {
    const activeLang = useSettingsStore.getState().language || 'ar';
    const langMap: Record<string, string> = {
      ar: 'ar-SA',
      en: 'en-US',
      fr: 'fr-FR',
      tr: 'tr-TR',
      ur: 'ur-PK',
      ms: 'ms-MY',
      id: 'id-ID',
      fa: 'fa-IR',
      es: 'es-ES',
      de: 'de-DE',
      it: 'it-IT'
    };
    const currentLang = langMap[activeLang] || 'ar-SA';

    if (this.isNative) {
      try {
        let hasAccess = false;

        const speechRecAny = SpeechRecognition as unknown as {
          checkPermissions?: () => Promise<{ speechRecognition: string }>;
          requestPermissions?: () => Promise<{ speechRecognition: string }>;
          hasPermission?: () => Promise<{ permission: boolean }>;
          requestPermission?: () => Promise<{ permission: boolean }>;
        };

        if (typeof speechRecAny.checkPermissions === 'function') {
          const status = await speechRecAny.checkPermissions();
          if (status.speechRecognition === 'granted') {
            hasAccess = true;
          } else if (typeof speechRecAny.requestPermissions === 'function') {
            const requested = await speechRecAny.requestPermissions();
            if (requested.speechRecognition === 'granted') {
              hasAccess = true;
            }
          }
        } else if (typeof speechRecAny.hasPermission === 'function') {
          const status = await speechRecAny.hasPermission();
          if (status.permission) {
            hasAccess = true;
          } else if (typeof speechRecAny.requestPermission === 'function') {
            const requested = await speechRecAny.requestPermission();
            if (requested.permission) {
              hasAccess = true;
            }
          }
        } else {
          hasAccess = true;
        }

        if (!hasAccess) {
          throw new Error('Permission denied');
        }

        if (this.isListening) return;
        this.isListening = true;

        try {
          await SpeechRecognition.removeAllListeners();
        } catch {
          // Ignore removal errors
        }

        SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
          if (data.matches && data.matches.length > 0 && this.onResult) {
            this.onResult(data.matches[0]);
          }
        });

        const res = await SpeechRecognition.start({
          language: currentLang,
          maxResults: 1,
          partialResults: true,
          popup: false
        });

        if (res && res.matches && res.matches.length > 0 && this.onResult) {
          this.onResult(res.matches[0]);
        }
      } catch (err: unknown) {
        this.isListening = false;
        const msg = err instanceof Error ? err.message : 'native_error';
        if (this.onError) this.onError(msg);
      }
      return;
    }

    if (this.recognition && !this.isListening) {
      try {
        this.recognition.lang = currentLang;
        this.recognition.start();
      } catch (err) {
        silentFail('Speech recognition error in VoiceAssistant')(err);
      }
    } else if (!this.recognition) {
      if (this.onError) this.onError('unsupported');
    }
  }

  async stop(): Promise<void> {
    this.isListening = false;
    if (this.isNative) {
      await SpeechRecognition.stop();
      return;
    }
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  isSupported(): boolean {
    if (this.isNative) return true;
    return !!this.recognition;
  }
}

export const voiceAssistant = new VoiceAssistant();
