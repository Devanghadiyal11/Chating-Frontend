"use client";

import React from "react";
import { ThemeType } from "@/lib/types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  coupleName: string;
  daysTogether: number;
  currentUser: string;
  currentAvatar: string;
  onlineUsers: string[];
  currentTheme: ThemeType;
  disappearingMode: number;
  photoCount?: number;
  onSelectTheme: (theme: ThemeType) => void;
  onChangeDisappearing: (seconds: number) => void;
  onOpenAnniversary: () => void;
  onOpenVault?: () => void;
  onClearChat: () => void;
  onLogout: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  coupleName,
  daysTogether,
  currentUser,
  currentAvatar,
  onlineUsers,
  currentTheme,
  disappearingMode,
  photoCount = 0,
  onSelectTheme,
  onChangeDisappearing,
  onOpenAnniversary,
  onOpenVault,
  onClearChat,
  onLogout,
}: SidebarProps) {
  const copyInviteLink = () => {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/?pin=1012`;
    navigator.clipboard.writeText(link).then(() => {
      alert("✨ Copied direct link to clipboard!\nSend this link to your girlfriend so she can join in 1 tap:\n\n" + link);
    }).catch(() => {
      prompt("Copy invite link for your girlfriend:", link);
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 w-72 xl:w-80 shrink-0 h-full bg-[var(--bg-dark)] border-r border-[var(--border)] flex flex-col z-50 lg:z-auto transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div
            onClick={onOpenAnniversary}
            className="flex items-center gap-2.5 cursor-pointer group hover:opacity-90 transition-opacity"
            title="Click to edit couple name 💕"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)] flex items-center justify-center text-xl shadow-sm">
              💖
            </div>
            <div>
              <div className="font-extrabold text-white text-sm truncate max-w-[170px]">
                {coupleName}
              </div>
              <div className="text-[11px] text-[var(--accent)] font-semibold">
                Private Couple Space 💕
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5">
          {/* Days Together */}
          <div
            onClick={onOpenAnniversary}
            className="p-3 rounded-2xl bg-gradient-to-b from-[var(--accent-dim)] to-transparent border border-dashed border-[var(--accent)] text-center cursor-pointer active:scale-98 transition-transform"
          >
            <div className="text-2xl font-black text-[var(--accent)]">{daysTogether}</div>
            <div className="text-[11px] text-[var(--text-sub)] font-semibold mt-0.5">
              Days of Loving You 💕
            </div>
          </div>

          {/* Combined Couple Panel (In Our Space) */}
          <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-[var(--text-sub)] tracking-wider mb-2">
              <span>In Our Space</span>
              {(() => {
                const isHim = currentUser.toLowerCase() === "him";
                const partnerTargetLower = isHim ? "her" : "him";
                const isOnline = onlineUsers.some((u) => {
                  const uLower = u.toLowerCase();
                  return uLower === partnerTargetLower || (uLower !== currentUser.toLowerCase());
                });
                return isOnline ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connected 💕
                  </span>
                ) : (
                  <span className="text-[var(--text-sub)]/80">Waiting</span>
                );
              })()}
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Partner Card */}
              {(() => {
                const isHim = currentUser.toLowerCase() === "him";
                const partnerTitle = isHim ? "Her" : "Him";
                const partnerAvatar = isHim ? "👸" : "🤴";
                const partnerTargetLower = isHim ? "her" : "him";
                const isOnline = onlineUsers.some((u) => {
                  const uLower = u.toLowerCase();
                  return uLower === partnerTargetLower || (uLower !== currentUser.toLowerCase());
                });

                return (
                  <div
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-colors ${
                      isOnline
                        ? "bg-[var(--accent-dim)] border-[var(--accent)]/40"
                        : "bg-[var(--bg-root)] border-[var(--border)] opacity-65"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{partnerAvatar}</span>
                      <span className="text-xs font-bold text-white">{partnerTitle}</span>
                      {isOnline && <span className="text-xs">💕</span>}
                    </div>
                    {isOnline ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Online
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-sub)]/80 font-medium">Offline</span>
                    )}
                  </div>
                );
              })()}

              {/* Current User Card */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[var(--bg-root)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-base">{currentUser.toLowerCase() === "him" ? "🤴" : "👸"}</span>
                  <span className="text-xs font-bold text-white/90">
                    {currentUser.toLowerCase() === "him" ? "Him" : currentUser.toLowerCase() === "her" ? "Her" : currentUser}
                  </span>
                  <span className="text-[10px] text-[var(--accent)] font-bold">(You)</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Color Themes */}
          <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="text-[10px] font-extrabold uppercase text-[var(--text-sub)] tracking-wider mb-2">
              Couple Theme (Synced 💕)
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: "rose", bg: "#e11d48", label: "🌸" },
                { id: "lavender", bg: "#7c3aed", label: "💜" },
                { id: "sunset", bg: "#ea580c", label: "🌅" },
                { id: "noir", bg: "#ff2e93", label: "🌙" },
                { id: "cream", bg: "#e05d76", label: "☁️" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTheme(t.id as ThemeType)}
                  style={{ background: t.bg }}
                  className={`h-9 rounded-xl flex items-center justify-center text-sm shadow-sm transition-transform active:scale-95 ${
                    currentTheme === t.id ? "ring-2 ring-white scale-105" : "opacity-80"
                  }`}
                  title={t.id}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Disappearing Messages */}
          <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="text-[10px] font-extrabold uppercase text-[var(--text-sub)] tracking-wider mb-1.5">
              Disappearing Messages
            </div>
            <select
              value={disappearingMode}
              onChange={(e) => onChangeDisappearing(parseInt(e.target.value, 10))}
              className="w-full bg-[var(--bg-root)] border border-[var(--border)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] focus:outline-none"
            >
              <option value="0">Off (Keep forever)</option>
              <option value="3600">Disappear after 1 hour</option>
              <option value="86400">Disappear after 24 hours</option>
            </select>
          </div>

          {/* Memories & Media Vault Navigation */}
          <button
            onClick={() => {
              onClose();
              onOpenVault?.();
            }}
            className="w-full p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-left hover:border-[var(--accent)] transition-all flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)] flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform">
                📸
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Photo & Media Vault</span>
                  <span className="text-[10px] text-[var(--accent)]">✨</span>
                </div>
                <div className="text-[10px] text-[var(--text-sub)]">
                  {photoCount} {photoCount === 1 ? "moment" : "moments"} saved
                </div>
              </div>
            </div>
            <span className="text-xs text-[var(--text-sub)] group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          {/* Copy Direct Link */}
          <button
            onClick={copyInviteLink}
            className="w-full py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-white hover:border-[var(--accent)] transition-colors flex items-center justify-center gap-1.5"
          >
            <span>🔗 Copy Link for Her</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[var(--border)] flex gap-2">
          <button
            onClick={onClearChat}
            title="Clear conversation for both partners"
            className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold active:scale-95 transition-all hover:bg-red-500/25"
          >
            🗑️ Clear Chat
          </button>
          <button
            onClick={onLogout}
            className="flex-1 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-white text-xs font-bold active:scale-95 transition-transform"
          >
            🚪 Leave
          </button>
        </div>
      </aside>
    </>
  );
}
