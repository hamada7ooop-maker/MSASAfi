import React, { useState, useRef, useEffect } from 'react';
import { createWorker, Worker } from 'tesseract.js';
import { useI18n } from '../../../i18n/index';
import { toast } from '../../../toast';
import { ImageCropper } from '../../../components/modals/ImageCropper';
import { silentFail } from '../../../core/utils';

interface OCRScannerProps {
  onScan: (data: { amount: string; date?: string; merchant?: string }) => void;
  onClose: () => void;
}

export function OCRScanner({ onScan, onClose }: OCRScannerProps) {
  const { t } = useI18n();
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically trigger camera capture on mount for optimal mobile UX
  useEffect(() => {
    handleCapture();
  }, []);

  const handleImage = async (imageInput: string | File) => {
    setIsScanning(true);
    setProgress(0);
    
    let worker: Worker | null = null;
    try {
      // Dynamic language loading: if app is Arabic, Persian, or Urdu, load combined 'eng+ara' 
      // to read mixed receipts, else load only 'eng' for lightning-fast performance.
      const { useSettingsStore } = await import('../../../store/settingsStore.js');
      const activeLang = useSettingsStore.getState().language || 'ar';
      const ocrLang = (activeLang === 'ar' || activeLang === 'fa' || activeLang === 'ur') ? 'eng+ara' : 'eng';

      const baseUrl = window.location.origin;
      worker = await createWorker(ocrLang, 1, {
        workerPath: `${baseUrl}/assets/lib/tesseract/worker.min.js`,
        corePath: `${baseUrl}/assets/lib/tesseract/`,
        langPath: `${baseUrl}/assets/lib/tesseract/lang`,
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const result = await worker.recognize(imageInput);
      const text = result.data.text;
      const parsedData = parseReceiptText(text);
      
      if (parsedData.amount) {
        toast(t('ocr.success') || 'تم مسح الفاتورة بنجاح', 'success');
        onScan(parsedData);
      } else {
        toast(t('ocr.failed') || 'فشل استخراج المبلغ من الفاتورة', 'warning');
      }
    } catch (err) {
      silentFail('[OCR] Processing Error')(err);
      toast(t('ocr.failed') || 'فشل استخراج البيانات', 'error');
    } finally {
      if (worker) await worker.terminate();
      setIsScanning(false);
    }
  };

  const handleCapture = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false, // Turn off buggy native OS crop editor
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt // Offers native photo/gallery choice prompt
      });

      if (image.dataUrl) {
        // Send to our beautiful interactive custom cropper first
        setImageToCrop(image.dataUrl);
      }
    } catch (err: unknown) {
      silentFail('[OCRScanner] Camera error, falling back to file input')(err);
      const msg = err instanceof Error ? err.message : '';
      // If the user cancelled, don't show picker
      if (msg !== 'User cancelled photos app' && msg !== 'User cancelled image selection') {
        fileInputRef.current?.click();
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Send uploaded receipt straight to our custom cropper
          setImageToCrop(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const parseReceiptText = (text: string) => {
    // 1. Amount Parsing (looking for currency-like patterns)
    // Regex for amounts like: 123.45, 1,234.56, etc.
    const amountRegex = /(?:total|amount|sum|net|الاجمالي|المبلغ|القيمة)[\s:]*([\d,.]+\d)/i;
    const match = text.match(amountRegex);
    let amount = '';
    
    if (match && match[1]) {
      amount = match[1].replace(/,/g, '');
    } else {
      // Fallback: search for any number that looks like a total (large number at bottom)
      const allNumbers = text.match(/[\d,.]+\d/g) || [];
      const numericValues = allNumbers
        .map(n => parseFloat(n.replace(/,/g, '')))
        .filter(n => !isNaN(n) && n > 0);
      
      if (numericValues.length > 0) {
        amount = Math.max(...numericValues).toString(); // Often the largest number is the total
      }
    }

    // 2. Date Parsing
    const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
    const dateMatch = text.match(dateRegex);
    const date = dateMatch ? dateMatch[1] : undefined;

    return { amount, date };
  };

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="flex items-center justify-between p-6">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all hover:bg-white/20">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h3 className="font-black text-white text-lg">{t('shop.perk.turboScanner')}</h3>
        <div className="w-10 h-10"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        {!isScanning ? (
          <>
            <div 
              className="w-64 h-64 rounded-[3rem] border-4 border-dashed border-white/20 flex flex-col items-center justify-center gap-4 text-white/40 hover:border-emerald-500/50 hover:text-emerald-500/50 transition-all cursor-pointer group" 
              onClick={handleCapture}
            >
              <span className="material-symbols-outlined text-6xl group-hover:scale-110 transition-transform text-emerald-400/80">add_a_photo</span>
              <p className="font-black text-sm text-white/80">{t('ocr.tip') || 'اضغط لمسح الفاتورة'}</p>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileInputChange}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold flex items-center gap-2 hover:bg-white/10 active:scale-95 transition-all text-xs"
            >
              <span className="material-symbols-outlined text-sm">photo_library</span>
              <span>{t('ocr.selectGallery') || 'اختيار من معرض الصور'}</span>
            </button>

            <div className="text-center max-w-xs">
               <p className="text-white/60 text-[10px] font-bold leading-relaxed">
                 {t('privacy.ai.body')}
               </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
                <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-emerald-500 transition-all duration-300" strokeDasharray={377} strokeDashoffset={377 - (377 * progress / 100)} />
              </svg>
              <span className="absolute font-black text-white text-xl">{progress}%</span>
            </div>
            <p className="text-emerald-400 font-black text-sm animate-pulse uppercase tracking-widest">{t('ocr.scanning')}</p>
          </div>
        )}
      </div>

      {/* Render custom image cropper overlay if a photo was captured/uploaded */}
      {imageToCrop && (
        <ImageCropper 
          imageUri={imageToCrop}
          onCrop={(croppedData) => {
            setImageToCrop(null);
            handleImage(croppedData);
          }}
          onCancel={() => {
            setImageToCrop(null);
          }}
        />
      )}
    </div>
  );
}
