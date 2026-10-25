"use client";

import React, { useState, useEffect } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (username: string, pin: string, avatar: string, remember: boolean) => Promise<{ success: boolean; error?: string }>;
}

export function LoginModal({ isOpen, onLogin }: LoginModalProps) {
  const [role, setRole] = useState<"Him" | "Her">("Him");
  const [pin, setPin] = useState("1012");
  const [avatar, setAvatar] = useState("🤴");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("couple_user");
      const savedAv = localStorage.getItem("couple_avatar");
      if (savedUser === "Her") {
        setRole("Her");
        setAvatar(savedAv || "👸");
      } else if (savedUser === "Him") {
        setRole("Him");
        setAvatar(savedAv || "🤴");
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleSelectRole = (selected: "Him" | "Her") => {
    setRole(selected);
    setAvatar(selected === "Him" ? "🤴" : "👸");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.trim() !== "1012") {
      setError("Incorrect secret PIN! Please enter 1012.");
      return;
    }

    setLoading(true);
    setError(null);
    const res = await onLogin(role, pin.trim(), avatar, remember);
    setLoading(false);
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-[var(--mine-bg)] text-white text-center">
          <div className="text-4xl mb-1">💑</div>
          <h1 className="text-xl font-black">Our Sweet Space</h1>
          <p className="text-xs opacity-90 mt-0.5">Private & Romantic Couple Chat 💕</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[var(--text-sub)]">Choose Who You Are 💕</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => handleSelectRole("Him")}
                className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                  role === "Him"
                    ? "border-[var(--accent)] bg-[var(--accent-dim)] shadow-md scale-102"
                    : "border-[var(--border)] bg-[var(--bg-root)] opacity-70 hover:opacity-100"
                }`}
              >
                <span className="text-3xl">🤴</span>
                <span className="text-sm font-extrabold text-white">Him</span>
                <span className="text-[10px] text-[var(--accent)] font-semibold">The Boyfriend</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole("Her")}
                className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                  role === "Her"
                    ? "border-[var(--accent)] bg-[var(--accent-dim)] shadow-md scale-102"
                    : "border-[var(--border)] bg-[var(--bg-root)] opacity-70 hover:opacity-100"
                }`}
              >
                <span className="text-3xl">👸</span>
                <span className="text-sm font-extrabold text-white">Her</span>
                <span className="text-[10px] text-[var(--accent)] font-semibold">The Girlfriend</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-sub)]">Secret Couple PIN</label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="1012"
              className="w-full mt-1.5 bg-[var(--bg-root)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xl font-bold tracking-[8px] text-center text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberCheck"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)] rounded"
            />
            <label htmlFor="rememberCheck" className="text-xs text-[var(--text-sub)] select-none cursor-pointer">
              Remember me on this phone
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--mine-bg)] text-white text-sm font-extrabold shadow-md active:scale-98 transition-transform disabled:opacity-50"
          >
            {loading ? "Connecting..." : `Enter as ${role} 💕`}
          </button>
        </form>
      </div>
    </div>
  );
}
