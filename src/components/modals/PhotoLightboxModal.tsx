"use client";

import React from "react";

interface PhotoLightboxModalProps {
  photo: { src: string; sender: string; time: string } | null;
  onClose: () => void;
}

export function PhotoLightboxModal({ photo, onClose }: PhotoLightboxModalProps) {
  if (!photo) return null;

  const handleDownload = () => {
    try {
      const a = document.createElement("a");
      a.href = photo.src;
      a.download = `our-space-${photo.sender}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(photo.src, "_blank");
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/95 z-[70] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black/50">
          <img
            src={photo.src}
            alt="Captured Moment"
            className="max-w-full max-h-[72vh] object-contain pointer-events-none"
            draggable={false}
          />
          <div className="photo-shield" onContextMenu={(e) => e.preventDefault()} />
        </div>

        <div className="mt-3 text-center text-white">
          <div className="text-sm font-bold flex items-center justify-center gap-1.5">
            <span>Captured by {photo.sender}</span>
            <span>💕</span>
          </div>
          <div className="text-xs text-[var(--text-sub)] mt-0.5">{photo.time}</div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="px-5 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>⬇️</span>
            <span>Download Photo</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors active:scale-95 cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );
}
