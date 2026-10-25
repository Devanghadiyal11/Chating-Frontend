"use client";

import React from "react";

interface HeaderProps {
  coupleName: string;
  daysTogether: number;
  nudgeCooldown: number;
  soundEnabled: boolean;
  connectionStatus?: "connected" | "reconnecting" | "offline";
  pendingCount?: number;
  partnerName?: string | null;
  isReloading?: boolean;
  onOpenSidebar: () => void;
  onOpenAnniversary: () => void;
  onOpenThemeModal?: () => void;
  onSendNudge: () => void;
  onToggleSound: () => void;
  onReloadChat?: () => void;
}

export function Header({
  coupleName,
  daysTogether,
  nudgeCooldown,
  soundEnabled,
  connectionStatus = "connected",
  pendingCount = 0,
  partnerName = null,
  isReloading = false,
  onOpenSidebar,
  onOpenAnniversary,
  onOpenThemeModal,
  onSendNudge,
  onToggleSound,
  onReloadChat,
}: HeaderProps) {
  return (
    <header className="px-3 sm:px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-dark)] flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] flex items-center justify-center text-lg active:scale-95 transition-transform"
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="flex flex-col min-w-0">
          <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 truncate">
            <span className="truncate">{coupleName}</span>
            <span className="text-xs sm:text-sm">💕</span>
            {partnerName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{partnerName} online</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenAnniversary}
              className="text-[11px] sm:text-xs text-[var(--accent)] font-bold text-left truncate flex items-center gap-1 hover:underline"
            >
              <span>✨ Together {daysTogether} days 💕</span>
            </button>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[10px]">
              {partnerName ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected with {partnerName}
                </span>
              ) : connectionStatus === "connected" ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live
                </span>
              ) : connectionStatus === "reconnecting" ? (
                <span className="text-amber-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Reconnecting
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Offline
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-amber-300 font-bold pl-0.5">
                  • {pendingCount} queued
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Love Nudge / Thinking of You */}
        <button
          onClick={onSendNudge}
          disabled={nudgeCooldown > 0}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center text-sm sm:text-base transition-transform active:scale-92 ${
            nudgeCooldown > 0
              ? "bg-[var(--bg-card)] border-[var(--border)] text-[var(--accent)] font-black text-xs cursor-not-allowed opacity-75"
              : "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)] animate-pulse"
          }`}
          title="Thinking of You! 💖"
        >
          {nudgeCooldown > 0 ? `${nudgeCooldown}s` : "💖"}
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm sm:text-base flex items-center justify-center active:scale-92 transition-transform"
          title={soundEnabled ? "Sound: ON" : "Sound: Muted"}
        >
          {soundEnabled ? "🔔" : "🔕"}
        </button>

        {/* Reload Chat Section Only */}
        {onReloadChat && (
          <button
            onClick={onReloadChat}
            disabled={isReloading}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm sm:text-base flex items-center justify-center active:scale-92 transition-all ${
              isReloading ? "opacity-50 cursor-not-allowed" : "hover:border-[var(--accent)]"
            }`}
            title="Reload Chat Section Only"
          >
            <span className={isReloading ? "animate-spin" : ""}>🔄</span>
          </button>
        )}
      </div>
    </header>
  );
}
