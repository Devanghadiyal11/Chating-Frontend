"use client";

import React from "react";

interface HeaderProps {
  coupleName: string;
  nudgeCooldown: number;
  soundEnabled: boolean;
  connectionStatus?: "connected" | "reconnecting" | "offline";
  pendingCount?: number;
  partnerName?: string | null;
  onOpenSidebar: () => void;
  onEditCoupleName?: () => void;
  onSendNudge: () => void;
  onToggleSound: () => void;
}

export function Header({
  coupleName,
  nudgeCooldown,
  soundEnabled,
  connectionStatus = "connected",
  pendingCount = 0,
  partnerName = null,
  onOpenSidebar,
  onEditCoupleName,
  onSendNudge,
  onToggleSound,
}: HeaderProps) {
  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-[var(--border)] bg-[var(--bg-dark)] flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] flex items-center justify-center text-sm active:scale-95 transition-transform"
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="flex flex-col min-w-0">
          <button
            type="button"
            onClick={onEditCoupleName}
            className="flex items-center gap-1.5 text-left active:scale-95 transition-transform cursor-pointer group"
            title="Click to edit couple name 💕"
          >
            <span className="text-sm sm:text-base font-extrabold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {coupleName}
            </span>
            <span className="text-xs sm:text-sm">💕</span>
            <span className="text-xs text-[var(--accent)] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
              ✏️
            </span>
          </button>

          {/* One Clear Connection Indicator */}
          <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
            {partnerName ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected with {partnerName}
              </span>
            ) : connectionStatus === "connected" ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Connected
              </span>
            ) : connectionStatus === "reconnecting" ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Reconnecting...
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Offline
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

      {/* Compact Love Nudge & Notification Sound Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onSendNudge}
          disabled={nudgeCooldown > 0}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-transform active:scale-92 ${
            nudgeCooldown > 0
              ? "bg-[var(--bg-card)] border-[var(--border)] text-[var(--accent)] font-bold cursor-not-allowed opacity-75"
              : "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)] hover:scale-105"
          }`}
          title="Thinking of You! 💖"
        >
          {nudgeCooldown > 0 ? `${nudgeCooldown}s` : "💖"}
        </button>

        <button
          onClick={onToggleSound}
          className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs flex items-center justify-center active:scale-92 transition-transform hover:border-[var(--accent)]"
          title={soundEnabled ? "Sound: ON" : "Sound: Muted"}
        >
          {soundEnabled ? "🔔" : "🔕"}
        </button>
      </div>
    </header>
  );
}
