import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceAssistant, voiceAssistant } from '../../src/services/voiceAssistant';
import { useSettingsStore } from '../../src/store/settingsStore';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import type { LanguageCode } from '../../src/types/language';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('@capacitor-community/speech-recognition', () => ({
  SpeechRecognition: {
    start: vi.fn(),
    stop: vi.fn(),
    removeAllListeners: vi.fn(),
    addListener: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    hasPermission: vi.fn(),
    requestPermission: vi.fn(),
  },
}));

/**
 * Fake Web Speech engine. Fields intentionally start at values OPPOSITE to what
 * the assistant is expected to configure, so the assertions prove assignment.
 */
class FakeWebSpeechRecognition {
  static instances: FakeWebSpeechRecognition[] = [];
  lang = 'en-GB';
  continuous = true;
  interimResults = true;
  onstart: (() => void) | null = null;
  onresult: ((event: { results: Array<Array<{ transcript?: string }>> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  constructor() {
    FakeWebSpeechRecognition.instances.push(this);
  }
}

/** Second, distinct fake so "prefers standard API over webkit" is provable. */
class FakeWebkitSpeechRecognition extends FakeWebSpeechRecognition {
  static webkitInstances: FakeWebkitSpeechRecognition[] = [];
  constructor() {
    super();
    FakeWebkitSpeechRecognition.webkitInstances.push(this);
  }
}

function mountWebAssistant(
  onResult?: (text: string) => void,
  onError?: (err: string) => void
): VoiceAssistant {
  (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
    FakeWebSpeechRecognition;
  return new VoiceAssistant(onResult, onError);
}

function lastEngine(): FakeWebSpeechRecognition {
  const engine = FakeWebSpeechRecognition.instances.at(-1);
  if (!engine) throw new Error('no web engine was created');
  return engine;
}

/** Reinstall fresh native plugin mocks for one test (also undoes `delete`). */
function installNativePlugin() {
  const sr = SpeechRecognition as unknown as Record<string, unknown>;
  sr.checkPermissions = vi.fn().mockResolvedValue({ speechRecognition: 'granted' });
  sr.requestPermissions = vi.fn().mockResolvedValue({ speechRecognition: 'granted' });
  sr.hasPermission = vi.fn().mockResolvedValue({ permission: true });
  sr.requestPermission = vi.fn().mockResolvedValue({ permission: true });
  sr.start = vi.fn().mockResolvedValue({ matches: [] });
  sr.stop = vi.fn().mockResolvedValue(undefined);
  sr.removeAllListeners = vi.fn().mockResolvedValue(undefined);
  sr.addListener = vi.fn().mockResolvedValue(undefined);
}

describe('VoiceAssistant Unit Tests (voiceAssistant.ts)', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    FakeWebSpeechRecognition.instances.length = 0;
    FakeWebkitSpeechRecognition.webkitInstances.length = 0;
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    useSettingsStore.setState({ language: 'ar' });
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  describe('module export', () => {
    it('exports a shared singleton that initializes safely without any speech API', () => {
      expect(voiceAssistant).toBeInstanceOf(VoiceAssistant);
      expect((voiceAssistant as unknown as { recognition: unknown }).recognition).toBeNull();
      expect(voiceAssistant.isNative).toBe(false);
    });
  });

  describe('web engine initialization', () => {
    it('creates and configures a web engine for Arabic (ar-SA, non-continuous, final results only)', () => {
      mountWebAssistant();
      const engine = lastEngine();
      expect(engine.lang).toBe('ar-SA');
      expect(engine.continuous).toBe(false);
      expect(engine.interimResults).toBe(false);
    });

    it('stores the caller callbacks on the instance', () => {
      const onResult = vi.fn();
      const onError = vi.fn();
      const va = mountWebAssistant(onResult, onError);
      expect(va.onResult).toBe(onResult);
      expect(va.onError).toBe(onError);
      expect(va.isListening).toBe(false);
    });

    it('prefers the standard SpeechRecognition API over the webkit-prefixed one', () => {
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
        FakeWebSpeechRecognition;
      (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
        FakeWebkitSpeechRecognition;
      new VoiceAssistant();
      expect(FakeWebSpeechRecognition.instances).toHaveLength(1);
      expect(FakeWebkitSpeechRecognition.webkitInstances).toHaveLength(0);
    });

    it('stays inert when the browser exposes no Web Speech API at all', () => {
      const va = new VoiceAssistant();
      expect((va as unknown as { recognition: unknown }).recognition).toBeNull();
      expect(va.isSupported()).toBe(false);
    });
  });

  describe('web engine event handlers', () => {
    it('onstart/onend flip the listening flag', () => {
      const va = mountWebAssistant();
      const engine = lastEngine();
      expect(va.isListening).toBe(false);
      engine.onstart?.();
      expect(va.isListening).toBe(true);
      engine.onend?.();
      expect(va.isListening).toBe(false);
    });

    it('onresult delivers the first transcript to onResult', () => {
      const onResult = vi.fn();
      mountWebAssistant(onResult);
      const engine = lastEngine();
      engine.onresult?.({ results: [[{ transcript: 'كم صرفت اليوم' }, { transcript: 'ignored' }]] });
      expect(onResult).toHaveBeenCalledTimes(1);
      expect(onResult).toHaveBeenCalledWith('كم صرفت اليوم');
    });

    it('onresult with an empty transcript does not invoke onResult', () => {
      const onResult = vi.fn();
      mountWebAssistant(onResult);
      lastEngine().onresult?.({ results: [[{ transcript: undefined }]] });
      expect(onResult).not.toHaveBeenCalled();
    });

    it('tolerates missing callbacks when results arrive', () => {
      const va = mountWebAssistant(); // no callbacks
      expect(() =>
        lastEngine().onresult?.({ results: [[{ transcript: 'anything' }]] })
      ).not.toThrow();
      expect(va.isListening).toBe(false);
    });

    it('onerror forwards the error, stops the engine and clears listening', () => {
      const onError = vi.fn();
      const va = mountWebAssistant(undefined, onError);
      const engine = lastEngine();
      engine.onstart?.();
      engine.onerror?.({ error: 'no-speech' });
      expect(onError).toHaveBeenCalledWith('no-speech');
      expect(engine.stop).toHaveBeenCalled();
      expect(va.isListening).toBe(false);
    });
  });

  describe('start() — web path', () => {
    it('maps the active settings language to its BCP-47 locale and starts the engine', async () => {
      useSettingsStore.setState({ language: 'en' });
      const va = mountWebAssistant();
      const engine = lastEngine();
      await va.start();
      expect(engine.lang).toBe('en-US');
      expect(engine.start).toHaveBeenCalledTimes(1);
    });

    it.each<[LanguageCode, string]>([
      ['ar', 'ar-SA'],
      ['en', 'en-US'],
      ['fr', 'fr-FR'],
      ['tr', 'tr-TR'],
      ['ur', 'ur-PK'],
      ['ms', 'ms-MY'],
      ['id', 'id-ID'],
      ['fa', 'fa-IR'],
      ['es', 'es-ES'],
      ['de', 'de-DE'],
      ['it', 'it-IT'],
    ])('maps settings language %s → %s', async (lang, locale) => {
      useSettingsStore.setState({ language: lang });
      const va = mountWebAssistant();
      await va.start();
      expect(lastEngine().lang).toBe(locale);
    });

    it('falls back to ar-SA for an unmapped language (corrupted persisted store)', async () => {
      // zustand persist rehydrates raw storage values, so the runtime guard must
      // tolerate codes the LanguageCode union does not contain.
      useSettingsStore.setState({ language: 'zh' as unknown as LanguageCode });
      const va = mountWebAssistant();
      await va.start();
      expect(lastEngine().lang).toBe('ar-SA');
    });

    it('the listening flag follows onstart, not the start() call itself', async () => {
      const va = mountWebAssistant();
      const engine = lastEngine();
      await va.start();
      expect(va.isListening).toBe(false); // engine has not signalled onstart yet
      engine.onstart?.();
      expect(va.isListening).toBe(true);
    });

    it('does not restart the engine while already listening', async () => {
      const va = mountWebAssistant();
      const engine = lastEngine();
      engine.onstart?.();
      await va.start();
      expect(engine.start).not.toHaveBeenCalled();
    });

    it('swallows engine start failures silently (no onError on the web path)', async () => {
      const onError = vi.fn();
      const va = mountWebAssistant(undefined, onError);
      const engine = lastEngine();
      engine.start.mockImplementation(() => {
        throw new Error('already started');
      });
      await expect(va.start()).resolves.toBeUndefined();
      expect(onError).not.toHaveBeenCalled();
    });

    it("reports 'unsupported' when no web engine exists", async () => {
      const onError = vi.fn();
      const va = new VoiceAssistant(undefined, onError);
      await va.start();
      expect(onError).toHaveBeenCalledWith('unsupported');
    });
  });

  describe('stop() — web path', () => {
    it('stops the engine and clears the listening flag', async () => {
      const va = mountWebAssistant();
      const engine = lastEngine();
      engine.onstart?.();
      await va.stop();
      expect(va.isListening).toBe(false);
      expect(engine.stop).toHaveBeenCalledTimes(1);
    });

    it('is a safe no-op without an engine', async () => {
      const va = new VoiceAssistant();
      await expect(va.stop()).resolves.toBeUndefined();
    });
  });

  describe('isSupported()', () => {
    it('is true on web with an engine and false without one', () => {
      expect(mountWebAssistant().isSupported()).toBe(true);
      delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
      expect(new VoiceAssistant().isSupported()).toBe(false);
    });
  });

  describe('native platform', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      installNativePlugin();
    });

    it('skips web engine creation and always reports supported', () => {
      (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
        FakeWebSpeechRecognition;
      const va = new VoiceAssistant();
      expect((va as unknown as { recognition: unknown }).recognition).toBeNull();
      expect(va.isSupported()).toBe(true);
    });

    it('granted permissions: registers the partialResults listener and starts with locale + options', async () => {
      const va = new VoiceAssistant();
      await va.start();
      expect(va.isListening).toBe(true);
      expect(SpeechRecognition.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(SpeechRecognition.addListener).toHaveBeenCalledWith(
        'partialResults',
        expect.any(Function)
      );
      expect(SpeechRecognition.start).toHaveBeenCalledWith({
        language: 'ar-SA',
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
    });

    it('partialResults events deliver the first match to onResult', async () => {
      const onResult = vi.fn();
      const va = new VoiceAssistant(onResult);
      await va.start();
      const listener = vi.mocked(SpeechRecognition.addListener).mock.calls[0]?.[1] as (
        data: { matches?: string[] }
      ) => void;
      listener({ matches: ['سبعمئة ريال'] });
      expect(onResult).toHaveBeenCalledWith('سبعمئة ريال');
      listener({ matches: [] });
      listener({ matches: undefined });
      expect(onResult).toHaveBeenCalledTimes(1);
    });

    it("delivers the start() result's first match immediately", async () => {
      const onResult = vi.fn();
      vi.mocked(SpeechRecognition.start).mockResolvedValue({ matches: ['مرحبا'] });
      const va = new VoiceAssistant(onResult);
      await va.start();
      expect(onResult).toHaveBeenCalledWith('مرحبا');
      expect(va.isListening).toBe(true);
    });

    it('does not call onResult when start() returns no matches', async () => {
      const onResult = vi.fn();
      vi.mocked(SpeechRecognition.start).mockResolvedValue(undefined);
      const va = new VoiceAssistant(onResult);
      await va.start();
      expect(onResult).not.toHaveBeenCalled();
    });

    it('requests permissions when the initial check is not granted (current API)', async () => {
      vi.mocked(SpeechRecognition.checkPermissions).mockResolvedValue({
        speechRecognition: 'prompt',
      });
      const va = new VoiceAssistant();
      await va.start();
      expect(SpeechRecognition.requestPermissions).toHaveBeenCalledTimes(1);
      expect(SpeechRecognition.start).toHaveBeenCalledTimes(1);
    });

    it("throws 'Permission denied' when permission stays ungranted after requesting", async () => {
      const onError = vi.fn();
      vi.mocked(SpeechRecognition.checkPermissions).mockResolvedValue({
        speechRecognition: 'prompt',
      });
      vi.mocked(SpeechRecognition.requestPermissions).mockResolvedValue({
        speechRecognition: 'denied',
      });
      const va = new VoiceAssistant(undefined, onError);
      await va.start();
      expect(onError).toHaveBeenCalledWith('Permission denied');
      expect(va.isListening).toBe(false);
      expect(SpeechRecognition.start).not.toHaveBeenCalled();
    });

    it('legacy permission API: proceeds directly when hasPermission is true', async () => {
      const sr = SpeechRecognition as unknown as Record<string, unknown>;
      delete sr.checkPermissions;
      delete sr.requestPermissions;
      const va = new VoiceAssistant();
      await va.start();
      expect(SpeechRecognition.hasPermission).toHaveBeenCalledTimes(1);
      expect(SpeechRecognition.requestPermission).not.toHaveBeenCalled();
      expect(SpeechRecognition.start).toHaveBeenCalledTimes(1);
    });

    it('legacy permission API: requests once when hasPermission is false', async () => {
      const sr = SpeechRecognition as unknown as Record<string, unknown>;
      delete sr.checkPermissions;
      delete sr.requestPermissions;
      vi.mocked(SpeechRecognition.hasPermission).mockResolvedValue({ permission: false });
      const va = new VoiceAssistant();
      await va.start();
      expect(SpeechRecognition.requestPermission).toHaveBeenCalledTimes(1);
      expect(SpeechRecognition.start).toHaveBeenCalledTimes(1);
    });

    it('legacy permission API: denies when the request also returns false', async () => {
      const onError = vi.fn();
      const sr = SpeechRecognition as unknown as Record<string, unknown>;
      delete sr.checkPermissions;
      delete sr.requestPermissions;
      vi.mocked(SpeechRecognition.hasPermission).mockResolvedValue({ permission: false });
      vi.mocked(SpeechRecognition.requestPermission).mockResolvedValue({ permission: false });
      const va = new VoiceAssistant(undefined, onError);
      await va.start();
      expect(onError).toHaveBeenCalledWith('Permission denied');
      expect(SpeechRecognition.start).not.toHaveBeenCalled();
    });

    it('proceeds when the plugin exposes no permission methods at all', async () => {
      const sr = SpeechRecognition as unknown as Record<string, unknown>;
      delete sr.checkPermissions;
      delete sr.requestPermissions;
      delete sr.hasPermission;
      delete sr.requestPermission;
      const va = new VoiceAssistant();
      await va.start();
      expect(SpeechRecognition.start).toHaveBeenCalledTimes(1);
      expect(va.isListening).toBe(true);
    });

    it('surfaces native engine failures via onError and clears the listening flag', async () => {
      const onError = vi.fn();
      vi.mocked(SpeechRecognition.start).mockRejectedValue(new Error('audio busy'));
      const va = new VoiceAssistant(undefined, onError);
      await va.start();
      expect(onError).toHaveBeenCalledWith('audio busy');
      expect(va.isListening).toBe(false);
    });

    it("maps non-Error rejections to 'native_error'", async () => {
      const onError = vi.fn();
      vi.mocked(SpeechRecognition.start).mockRejectedValue('raw string failure');
      const va = new VoiceAssistant(undefined, onError);
      await va.start();
      expect(onError).toHaveBeenCalledWith('native_error');
    });

    it('ignores removeAllListeners failures and still registers the listener', async () => {
      vi.mocked(SpeechRecognition.removeAllListeners).mockRejectedValue(new Error('nope'));
      const va = new VoiceAssistant();
      await va.start();
      expect(SpeechRecognition.addListener).toHaveBeenCalledTimes(1);
      expect(SpeechRecognition.start).toHaveBeenCalledTimes(1);
    });

    it('a second start() while listening re-checks permissions but does not restart', async () => {
      const va = new VoiceAssistant();
      await va.start();
      await va.start();
      expect(SpeechRecognition.checkPermissions).toHaveBeenCalledTimes(2);
      expect(SpeechRecognition.start).toHaveBeenCalledTimes(1);
      expect(SpeechRecognition.addListener).toHaveBeenCalledTimes(1);
    });

    it('stop() stops the native engine and clears the listening flag', async () => {
      const va = new VoiceAssistant();
      await va.start();
      await va.stop();
      expect(SpeechRecognition.stop).toHaveBeenCalledTimes(1);
      expect(va.isListening).toBe(false);
    });

    it('maps the active language to the native start locale too', async () => {
      useSettingsStore.setState({ language: 'fr' });
      const va = new VoiceAssistant();
      await va.start();
      expect(SpeechRecognition.start).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'fr-FR' })
      );
    });
  });
});
