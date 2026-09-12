import { createWorker, type Worker } from 'tesseract.js';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

let _ocrWorker: Worker | null = null;
let _ocrWorkerLang: string | null = null;
let _ocrIdleTimer: ReturnType<typeof setTimeout> | null = null;

const IDLE_TIMEOUT_MS = 30000; // Auto-terminate after 30s of inactivity

function resetIdleTimer() {
  if (_ocrIdleTimer) {
    clearTimeout(_ocrIdleTimer);
    _ocrIdleTimer = null;
  }
  _ocrIdleTimer = setTimeout(() => {
    terminateOcrWorker();
  }, IDLE_TIMEOUT_MS);
}

/**
 * Terminates and frees the OCR worker instance and memory.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (_ocrIdleTimer) {
    clearTimeout(_ocrIdleTimer);
    _ocrIdleTimer = null;
  }
  if (_ocrWorker) {
    try {
      await _ocrWorker.terminate();
    } catch {
      /* Worker termination is best-effort and should not block cleanup */
    }
    _ocrWorker = null;
    _ocrWorkerLang = null;
  }
}

async function getOcrWorker(lang: string): Promise<Worker> {
  resetIdleTimer();
  if (_ocrWorker && _ocrWorkerLang === lang) return _ocrWorker;
  if (_ocrWorker) {
    try {
      await _ocrWorker.terminate();
    } catch {
      /* Previous worker termination is best-effort before re-initialization */
    }
    _ocrWorker = null;
    _ocrWorkerLang = null;
  }
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  _ocrWorker = await createWorker(lang, 1, {
    workerPath: `${baseUrl}/assets/lib/tesseract/worker.min.js`,
    corePath: `${baseUrl}/assets/lib/tesseract/`,
    langPath: `${baseUrl}/assets/lib/tesseract/lang`
  });
  _ocrWorkerLang = lang;
  return _ocrWorker;
}

export interface OCRResult {
  amount: number;
  text: string;
}

/**
 * Captures a photo and performs OCR to extract amount and text.
 */
export async function scanReceipt(lang: 'ara' | 'eng', keywordsStr: string = ''): Promise<OCRResult> {
  // 1. Take photo
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt
  });

  if (!image.dataUrl) throw new Error('No image captured');

  try {
    // 2. OCR Recognition
    const worker = await getOcrWorker(lang);
    const { data: { text } } = await worker.recognize(image.dataUrl);

  // 3. Smart amount extraction
  const cleanNumbers = (matches: RegExpMatchArray | null) => 
    matches ? matches.map((v) => parseFloat(v.replace(',', '.'))).filter((v) => v > 0 && v < 100000) : [];

  const keywords = [...new Set([
    'total', 'amount', 'net', 'grand', 'due', 'balance',
    ...keywordsStr.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  ])];

  let extractedAmount = 0;
  const lines = text.split('\n');

  // First pass: look for keywords in each line
  for (const line of lines) {
    if (keywords.some((k) => line.toLowerCase().includes(k))) {
      const lineNums = cleanNumbers(line.match(/\b\d+([.,]\d{1,2})?\b/g));
      if (lineNums.length > 0) {
        extractedAmount = Math.max(...lineNums);
        break; 
      }
    }
  }

  // Fallback: Find largest reasonable number
  if (extractedAmount === 0 && text) {
    const allNums = cleanNumbers(text.match(/\b\d+([.,]\d{1,2})?\b/g));
    if (allNums.length > 0) extractedAmount = Math.max(...allNums);
  }

    return {
      amount: extractedAmount,
      text: text
    };
  } finally {
    resetIdleTimer();
  }
}
