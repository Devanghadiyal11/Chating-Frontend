"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChatMessage } from "@/lib/types";
import { API_BASE } from "@/lib/config";
import { decryptPhoto } from "@/lib/crypto";

interface MediaVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUser: string;
  onOpenPhoto: (src: string, sender: string, time: string) => void;
}

interface VaultItem {
  id: string;
  src: string;
  sender: string;
  timeMs: number;
  formattedTime: string;
  monthYear: string;
  dateLabel: string;
}

export function downloadImage(src: string, filename: string) {
  try {
    const a = document.createElement("a");
    a.href = src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.warn("Download failed, opening in new tab:", err);
    window.open(src, "_blank");
  }
}

export function MediaVaultModal({
  isOpen,
  onClose,
  messages,
  currentUser,
  onOpenPhoto,
}: MediaVaultModalProps) {
  const [filter, setFilter] = useState<"all" | "her" | "him">("all");
  const [dbImages, setDbImages] = useState<any[]>([]);

  // Fetch preserved photos from MongoDB Atlas 'images' collection (survives clear-chat)
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    fetch(`${API_BASE}/api/images?include_cleared=true`)
      .then((res) => res.json())
      .then(async (data) => {
        if (isCancelled || !data || !Array.isArray(data.images)) return;
        const decryptedList = await Promise.all(
          data.images.map(async (item: any) => {
            let src = item.image;
            if (src && typeof src === "string" && src.startsWith("enc:v1:")) {
              src = await decryptPhoto(src);
            }
            return { ...item, image: src };
          })
        );
        if (!isCancelled) {
          setDbImages(decryptedList);
        }
      })
      .catch((err) => {
        console.warn("[Vault] Could not fetch archived images:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  // Extract, decrypt/filter, and chronologically group all photos
  const vaultItems = useMemo(() => {
    const items: VaultItem[] = [];
    const seenIds = new Set<string>();

    const processItem = (
      id: string,
      src: string,
      sender: string,
      datetime?: string,
      time_ms?: number
    ) => {
      if (!src || typeof src !== "string" || !src.trim() || seenIds.has(id)) return;
      seenIds.add(id);

      const timeMs =
        (datetime ? Date.parse(datetime) : 0) ||
        Number(time_ms) ||
        Date.now();
      const d = new Date(timeMs);

      const monthYear = d.toLocaleDateString("default", {
        month: "long",
        year: "numeric",
      });

      const dateLabel = d.toLocaleDateString("default", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const formattedTime = d.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      items.push({
        id,
        src,
        sender,
        timeMs,
        formattedTime,
        monthYear,
        dateLabel,
      });
    };

    // Live chat messages
    messages.forEach((msg) => {
      if (msg.image) {
        processItem(msg.id, msg.image, msg.sender, msg.datetime, msg.time_ms);
      }
    });

    // MongoDB preserved images collection (includes soft-deleted photos)
    dbImages.forEach((img) => {
      if (img.image) {
        processItem(img.id, img.image, img.sender, img.datetime, img.time_ms);
      }
    });

    // Newest first
    return items.sort((a, b) => b.timeMs - a.timeMs);
  }, [messages, dbImages]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (filter === "all") return vaultItems;
    return vaultItems.filter(
      (item) => item.sender.toLowerCase() === filter.toLowerCase()
    );
  }, [vaultItems, filter]);

  // Group by Month & Year
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, VaultItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.monthYear]) {
        groups[item.monthYear] = [];
      }
      groups[item.monthYear].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[65] flex items-center justify-center p-3 sm:p-6 transition-all"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] bg-[var(--bg-dark)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-card)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-dim)] border border-[var(--accent)] text-lg flex items-center justify-center shadow-sm">
              ✨
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Memories & Media Vault
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-bold">
                  {vaultItems.length} moments
                </span>
              </h2>
              <p className="text-[11px] text-[var(--text-sub)]">
                Every captured moment between you and your partner, auto-preserved 💕
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[var(--bg-root)] border border-[var(--border)] text-sm font-bold text-white/80 hover:text-white hover:border-[var(--accent)] flex items-center justify-center active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg-root)] flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filter === "all"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-sub)] hover:text-white"
              }`}
            >
              All Moments ({vaultItems.length})
            </button>
            <button
              onClick={() => setFilter("her")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filter === "her"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-sub)] hover:text-white"
              }`}
            >
              👸 Her Moments ({vaultItems.filter((i) => i.sender.toLowerCase() === "her").length})
            </button>
            <button
              onClick={() => setFilter("him")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filter === "him"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-sub)] hover:text-white"
              }`}
            >
              🤴 Him Moments ({vaultItems.filter((i) => i.sender.toLowerCase() === "him").length})
            </button>
          </div>
        </div>

        {/* Scrollable Gallery Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 px-4 max-w-sm mx-auto">
              <div className="text-4xl mb-3">📸</div>
              <h3 className="text-base font-bold text-white mb-1">
                {vaultItems.length === 0
                  ? "Your Vault is Waiting to be Filled 💕"
                  : "No moments match this filter"}
              </h3>
              <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                Take a live photo or upload a memory in chat. It will automatically appear here, organized by date with high-resolution download options!
              </p>
            </div>
          ) : (
            Object.entries(groupedByMonth).map(([monthYear, items]) => (
              <div key={monthYear} className="space-y-3">
                {/* Month Group Divider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
                    📅 {monthYear}
                  </span>
                  <div className="h-px flex-1 bg-[var(--border)]" />
                  <span className="text-[11px] text-[var(--text-sub)] font-semibold">
                    {items.length} {items.length === 1 ? "photo" : "photos"}
                  </span>
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {items.map((item) => {
                    const isMine =
                      item.sender.toLowerCase() === currentUser.toLowerCase();
                    const senderLabel =
                      item.sender.toLowerCase() === "her"
                        ? "👸 Her"
                        : item.sender.toLowerCase() === "him"
                        ? "🤴 Him"
                        : item.sender;

                    return (
                      <div
                        key={item.id}
                        onClick={() =>
                          onOpenPhoto(item.src, item.sender, item.formattedTime)
                        }
                        className="group relative aspect-square rounded-2xl overflow-hidden border border-[var(--border)] bg-black/40 shadow-md cursor-pointer hover:border-[var(--accent)] transition-all hover:scale-[1.02]"
                      >
                        <img
                          src={item.src}
                          alt="Moment"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                          draggable={false}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white">
                            {senderLabel}
                          </span>
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white/80">
                            {item.formattedTime}
                          </span>
                        </div>

                        {/* Bottom Overlay with Quick Actions */}
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                          <span className="text-[10px] text-white/90 font-medium truncate max-w-[90px]">
                            {item.dateLabel}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPhoto(
                                  item.src,
                                  item.sender,
                                  item.formattedTime
                                );
                              }}
                              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs flex items-center justify-center transition-transform active:scale-90"
                              title="Zoom In"
                            >
                              🔍
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadImage(
                                  item.src,
                                  `our-space-${item.sender}-${item.dateLabel.replace(/[\s,]+/g, "-")}.jpg`
                                );
                              }}
                              className="w-7 h-7 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-xs flex items-center justify-center transition-transform active:scale-90 shadow-sm"
                              title="Download Photo"
                            >
                              ⬇️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
