"use client";

import React from "react";

interface ClearConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ClearConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: ClearConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-sm bg-[var(--bg-card)] border border-red-500/40 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-2xl flex items-center justify-center mx-auto shadow-sm">
          🗑️
        </div>

        <div>
          <h3 className="text-base font-extrabold text-white">
            Clear Conversation for Both?
          </h3>
          <p className="text-xs text-[var(--text-sub)] mt-2 leading-relaxed">
            This will immediately erase the current live conversation on <strong className="text-white">both your screen and your partner&apos;s screen</strong>.
          </p>
          <p className="text-[11px] text-red-400 font-semibold mt-2">
            ⚠️ This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-2.5 mt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--border)] text-xs font-bold text-white/90 hover:text-white transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
          >
            Yes, Clear for Both
          </button>
        </div>
      </div>
    </div>
  );
}
