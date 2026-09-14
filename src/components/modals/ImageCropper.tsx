import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../i18n/index';

interface ImageCropperProps {
  imageUri: string;
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageUri, onCrop, onCancel }: ImageCropperProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgRect, setImgRect] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // Dragging states
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const cropStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const activeHandle = useRef<string | null>(null); // 'tl', 'tr', 'bl', 'br', 'body'

  // Update rect on image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const width = img.clientWidth;
    const height = img.clientHeight;
    
    setImgRect({
      width,
      height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });
    
    // Set initial crop area: 15% padding from each side
    setCrop({
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.1),
      width: Math.round(width * 0.8),
      height: Math.round(height * 0.8)
    });
    setImageLoaded(true);
  };

  // Keep track of window resize to adjust crop area proportionally
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && imageLoaded) {
        const img = imageRef.current;
        const newW = img.clientWidth;
        const newH = img.clientHeight;
        
        setCrop(prev => {
          const ratioX = newW / imgRect.width;
          const ratioY = newH / imgRect.height;
          return {
            x: Math.max(0, Math.min(newW - 20, prev.x * ratioX)),
            y: Math.max(0, Math.min(newH - 20, prev.y * ratioY)),
            width: Math.max(20, Math.min(newW, prev.width * ratioX)),
            height: Math.max(20, Math.min(newH, prev.height * ratioY))
          };
        });
        
        setImgRect(prev => ({
          ...prev,
          width: newW,
          height: newH
        }));
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, imgRect]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set pointer capture to receive events outside element boundaries
    e.currentTarget.setPointerCapture(e.pointerId);
    
    isDragging.current = true;
    activeHandle.current = handle;
    dragStart.current = { x: e.clientX, y: e.clientY };
    cropStart.current = { ...crop };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    const start = cropStart.current;
    const bounds = imgRect;
    
    const newCrop = { ...crop };
    
    const minSize = 40; // minimum crop size in pixels
    
    if (activeHandle.current === 'body') {
      newCrop.x = Math.max(0, Math.min(bounds.width - start.width, start.x + dx));
      newCrop.y = Math.max(0, Math.min(bounds.height - start.height, start.y + dy));
    } 
    else if (activeHandle.current === 'tl') {
      const newX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dx));
      const newY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dy));
      newCrop.width = start.x + start.width - newX;
      newCrop.height = start.y + start.height - newY;
      newCrop.x = newX;
      newCrop.y = newY;
    } 
    else if (activeHandle.current === 'tr') {
      const newY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dy));
      newCrop.width = Math.max(minSize, Math.min(bounds.width - start.x, start.width + dx));
      newCrop.height = start.y + start.height - newY;
      newCrop.y = newY;
    } 
    else if (activeHandle.current === 'bl') {
      const newX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dx));
      newCrop.width = start.x + start.width - newX;
      newCrop.height = Math.max(minSize, Math.min(bounds.height - start.y, start.height + dy));
      newCrop.x = newX;
    } 
    else if (activeHandle.current === 'br') {
      newCrop.width = Math.max(minSize, Math.min(bounds.width - start.x, start.width + dx));
      newCrop.height = Math.max(minSize, Math.min(bounds.height - start.y, start.height + dy));
    }
    
    setCrop(newCrop);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    activeHandle.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleCropConfirm = () => {
    if (!imageRef.current || !imageLoaded) return;
    
    const img = imageRef.current;
    
    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Scale crop coordinates from display size to natural/raw image size
    const scaleX = imgRect.naturalWidth / imgRect.width;
    const scaleY = imgRect.naturalHeight / imgRect.height;
    
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropW = crop.width * scaleX;
    const cropH = crop.height * scaleY;
    
    canvas.width = cropW;
    canvas.height = cropH;
    
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );
    
    // Output cropped image as jpeg DataURL
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCrop(croppedDataUrl);
  };

  return (
    <div className="fixed inset-0 z-[110000] flex flex-col bg-black/95 backdrop-blur-xl justify-between animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-b from-black/50 to-transparent">
        <button aria-label={t('action.close') || 'Close'} 
          onClick={onCancel} 
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all hover:bg-white/20"
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <h3 className="font-black text-white text-lg">{t('ocr.cropTitle') || 'تأطير وقص الفاتورة'}</h3>
        <div className="w-10 h-10"></div>
      </div>

      {/* Interactive Crop Workspace */}
      <div 
        ref={containerRef}
        className="flex-1 w-full flex items-center justify-center p-4 relative overflow-hidden select-none"
      >
        <div className="relative max-w-[95vw] max-h-[65vh] inline-block shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black/40">
          <img 
            ref={imageRef}
            src={imageUri} 
            alt={t('ocr.cropTitle') || 'Crop preview'}
            className="max-w-[95vw] max-h-[65vh] object-contain pointer-events-none block"
            onLoad={handleImageLoad}
          />
          
          {imageLoaded && (
            <>
              {/* Semi-transparent dark layer around crop area */}
              <div 
                className="absolute inset-0 bg-black/60 pointer-events-none"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%, 
                    0% 0%, 
                    ${crop.x}px ${crop.y}px, 
                    ${crop.x}px ${crop.y + crop.height}px, 
                    ${crop.x + crop.width}px ${crop.y + crop.height}px, 
                    ${crop.x + crop.width}px ${crop.y}px, 
                    ${crop.x}px ${crop.y}px
                  )`
                }}
              />

              {/* Glowing Crop Box Overlay */}
              <div
                className="absolute border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-move touch-none"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height
                }}
                onPointerDown={(e) => handlePointerDown(e, 'body')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {/* 4 Glowing Corner Handles */}
                {/* Top-Left */}
                <div 
                  className="absolute -top-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-10 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, 'tl')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <div className="w-3.5 h-3.5 border-t-4 border-l-4 border-emerald-400 rounded-tl shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                </div>
                {/* Top-Right */}
                <div 
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-10 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, 'tr')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <div className="w-3.5 h-3.5 border-t-4 border-r-4 border-emerald-400 rounded-tr shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                </div>
                {/* Bottom-Left */}
                <div 
                  className="absolute -bottom-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-10 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, 'bl')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <div className="w-3.5 h-3.5 border-b-4 border-l-4 border-emerald-400 rounded-bl shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                </div>
                {/* Bottom-Right */}
                <div 
                  className="absolute -bottom-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-10 touch-none"
                  onPointerDown={(e) => handlePointerDown(e, 'br')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <div className="w-3.5 h-3.5 border-b-4 border-r-4 border-emerald-400 rounded-br shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                </div>

                {/* Grid Lines inside crop box for cool UI feel */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 border border-white/10 pointer-events-none">
                  <div className="border-r border-b border-dashed border-emerald-400/50" />
                  <div className="border-r border-b border-dashed border-emerald-400/50" />
                  <div className="border-b border-dashed border-emerald-400/50" />
                  <div className="border-r border-b border-dashed border-emerald-400/50" />
                  <div className="border-r border-b border-dashed border-emerald-400/50" />
                  <div className="border-b border-dashed border-emerald-400/50" />
                  <div className="border-r border-dashed border-emerald-400/50" />
                  <div className="border-r border-dashed border-emerald-400/50" />
                  <div className="pointer-events-none" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer controls */}
      <div className="p-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4">
        <p className="text-white/50 text-xs font-bold text-center leading-relaxed max-w-xs">
          {t('ocr.cropTip') || 'اسحب المقابض لتأطير الفاتورة بدقة وتجنب حواف الطاولة أو الخلفية المشوشة للحصول على أفضل قراءة للمبالغ'}
        </p>
        
        <button aria-label={t('action.crop') || 'Crop'} 
          onClick={handleCropConfirm}
          className="w-full max-w-sm py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-base"
        >
          <span className="material-symbols-outlined" aria-hidden="true">crop</span>
          <span>{t('ocr.cropConfirm') || 'قص ومعالجة المستند'}</span>
        </button>
      </div>
    </div>
  );
}
