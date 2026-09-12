import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/index';

interface ImageCropperProps {
  image: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ image, onCrop, onCancel }: ImageCropperProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawW = canvas.width / zoom;
    const drawH = canvas.height / zoom;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      drawW,
      drawH,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [zoom, offset]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const size = Math.min(img.width, img.height);
      if (canvasRef.current) {
        canvasRef.current.width = size;
        canvasRef.current.height = size;
      }
      setOffset({ x: (img.width - size) / 2, y: (img.height - size) / 2 });
      draw();
    };
    img.src = image;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  useEffect(() => {
    draw();
  }, [draw]);

  const clampOffset = (newX: number, newY: number, currentZoom: number) => {
    if (!imgRef.current || !canvasRef.current) return { x: newX, y: newY };
    const img = imgRef.current;
    const drawW = img.width / currentZoom;
    const drawH = img.height / currentZoom;

    return {
      x: Math.max(0, Math.min(newX, img.width - drawW)),
      y: Math.max(0, Math.min(newY, img.height - drawH))
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !imgRef.current || !wrapperRef.current) return;

    const dx = ((e.clientX - lastPos.x) / wrapperRef.current.offsetWidth) * (imgRef.current.width / zoom);
    const dy = ((e.clientY - lastPos.y) / wrapperRef.current.offsetHeight) * (imgRef.current.height / zoom);

    const newPos = clampOffset(offset.x - dx, offset.y - dy, zoom);
    setOffset(newPos);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (newZoom: number) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const drawWOld = img.width / zoom;
    const drawWNew = img.width / newZoom;

    const newX = offset.x + (drawWOld - drawWNew) / 2;
    const newY = offset.y + (img.height / zoom - img.height / newZoom) / 2;

    setZoom(newZoom);
    setOffset(clampOffset(newX, newY, newZoom));
  };

  const handleConfirm = () => {
    if (!imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const out = document.createElement('canvas');
    out.width = 800;
    out.height = 800;
    const octx = out.getContext('2d');
    if (!octx) return;

    const drawW = img.width / zoom;
    const drawH = img.height / zoom;
    octx.drawImage(img, offset.x, offset.y, drawW, drawH, 0, 0, 800, 800);
    onCrop(out.toDataURL('image/jpeg', 0.75));
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#1e2124] rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
          <span className="text-white font-black text-sm">✂️ {t('txn.cropImage') || 'Crop Image'}</span>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">✕</button>
        </div>

        <div 
          ref={wrapperRef}
          className="relative aspect-square bg-black overflow-hidden cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <canvas ref={canvasRef} className="block w-full h-full" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 shadow-[inset_0_0_0_2000px_rgba(0,0,0,0.4)]"></div>
            <div className="absolute inset-[10%] border-2 border-white/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-4 border-t border-white/5">
          <span className="material-symbols-outlined text-slate-500 text-sm">zoom_out</span>
          <input 
            type="range" 
            min="1" 
            max="3" 
            step="0.01" 
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1 accent-blue-500" 
          />
          <span className="material-symbols-outlined text-slate-500 text-sm">zoom_in</span>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-4 rounded-2xl bg-white/5 text-white font-bold text-xs">{t('common.cancel')}</button>
          <button onClick={handleConfirm} className="py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-xs">✓ {t('txn.cropConfirm') || 'Crop & Save'}</button>
        </div>
      </div>
    </div>
  );
}
