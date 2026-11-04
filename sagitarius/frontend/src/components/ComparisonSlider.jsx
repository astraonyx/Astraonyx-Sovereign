import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function ComparisonSlider({ originalUrl, enhancedUrl, originalDims, enhancedDims }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const updateSliderPos = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      updateSliderPos(e.clientX);
    } else if (isPanning && zoom > 1) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  }, [isDragging, isPanning, zoom, startPan, updateSliderPos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (isDragging && e.touches.length > 0) {
      updateSliderPos(e.touches[0].clientX);
    }
  }, [isDragging, updateSliderPos]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  const handlePanStart = (e) => {
    if (zoom > 1 && !isDragging) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSliderPos(50);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl px-4 py-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Sebelum: <strong className="text-slate-200">{originalDims.w}×{originalDims.h}</strong></span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Sesudah (HD): <strong className="text-emerald-300">{enhancedDims.w}×{enhancedDims.h}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
            title="Perbesar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
            title="Perkecil (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-slate-600">|</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Main Image Slider Container */}
      <div
        ref={containerRef}
        onMouseDown={handlePanStart}
        className={`relative w-full h-[580px] bg-slate-950 bg-checkered rounded-2xl overflow-hidden border border-slate-800 select-none shadow-2xl ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        {/* Zoom & Pan Wrapper */}
        <div
          className="w-full h-full relative"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* Enhanced Image (Background / Right layer) */}
          <img
            src={enhancedUrl}
            alt="Enhanced HD"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* Original Image (Foreground / Left layer clipped by slider) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={originalUrl}
              alt="Original Low-Res"
              className="absolute inset-0 w-full h-full object-contain max-w-none"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                height: '100%',
              }}
            />
          </div>
        </div>

        {/* Divider Bar & Handle */}
        <div
          className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-0.5 h-full bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.8)]"></div>
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="absolute pointer-events-auto cursor-ew-resize w-10 h-10 -ml-5 rounded-full bg-white/90 backdrop-blur text-slate-900 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform border-2 border-indigo-500"
          >
            <div className="flex items-center gap-0.5">
              <span className="w-1 h-3.5 bg-slate-800 rounded-full"></span>
              <span className="w-1 h-3.5 bg-slate-800 rounded-full"></span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 flex items-center gap-1.5 shadow-lg">
          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
          <span>ORIGINAL (Sebelum)</span>
        </div>
        <div className="absolute top-4 right-4 z-10 pointer-events-none bg-indigo-950/80 backdrop-blur border border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-300 flex items-center gap-1.5 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>AI HD (Sesudah)</span>
        </div>

        {/* Hint footer */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-10">
          <span className="bg-slate-950/70 backdrop-blur px-3 py-1 rounded-full text-[11px] text-slate-400 border border-slate-800">
            Geser pemisah ke kiri/kanan untuk membandingkan detail
          </span>
        </div>
      </div>
    </div>
  );
}
