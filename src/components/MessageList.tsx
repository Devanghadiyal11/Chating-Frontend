"use client";

import React, { useRef, useEffect, useState } from "react";
import { ChatMessage, DeliveryStatus } from "@/lib/types";
import { burstHearts } from "@/lib/audio";

interface MessageListProps {
  messages: ChatMessage[];
  currentUser: string;
  partnerName?: string | null;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onOpenPhoto: (src: string, sender: string, time: string) => void;
  onReplyMessage?: (msg: ChatMessage) => void;
}

export const MessageList = React.memo(function MessageList({
  messages,
  currentUser,
  partnerName = null,
  onToggleReaction,
  onDeleteMessage,
  onOpenPhoto,
  onReplyMessage,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 150;
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages.length]);

  const formatTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const formatDateLabel = (ms: number) => {
    const d = new Date(ms);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const getStatusIcon = (status?: DeliveryStatus) => {
    if (status === "pending") return "🕒";
    if (status === "delivered" || status === "seen") return "✓✓";
    return "✓";
  };

  const handleBubbleClick = (msgId: string) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      burstHearts(12);
      onToggleReaction(msgId, "❤️");
    }
    lastTapRef.current = now;
  };

  const toggleAudio = (msgId: string, src: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
      }
      audioPlayerRef.current.src = src;
      audioPlayerRef.current.onended = () => setPlayingAudioId(null);
      audioPlayerRef.current.play().catch(() => {});
      setPlayingAudioId(msgId);
    }
  };

  const getSenderRole = (sender: string) => {
    const isMine = sender.toLowerCase() === currentUser.toLowerCase();
    if (isMine) {
      return currentUser.toLowerCase() === "him" ? "Him (You)" : currentUser.toLowerCase() === "her" ? "Her (You)" : "You";
    }
    if (currentUser.toLowerCase() === "him") return "Her 💕";
    if (currentUser.toLowerCase() === "her") return "Him 💕";
    if (sender.toLowerCase() === "him") return "Him 🤴";
    if (sender.toLowerCase() === "her") return "Her 👸";
    return sender;
  };

  const getSenderAvatar = (sender: string) => {
    const isMine = sender.toLowerCase() === currentUser.toLowerCase();
    if (isMine) {
      return currentUser.toLowerCase() === "him" ? "🤴" : currentUser.toLowerCase() === "her" ? "👸" : "👑";
    }
    if (currentUser.toLowerCase() === "him") return "👸";
    if (currentUser.toLowerCase() === "her") return "🤴";
    if (sender.toLowerCase() === "him") return "🤴";
    if (sender.toLowerCase() === "her") return "👸";
    return "💕";
  };

  // Filter valid messages to prevent empty bubbles (memoized for performance)
  const validMessages = React.useMemo(() => {
    return messages.filter((msg) => Boolean(msg.content?.trim() || msg.image || msg.audio));
  }, [messages]);

  // Date divider tracking
  let lastDateLabel = "";

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col bg-transparent"
    >
      <div className="max-w-3xl xl:max-w-4xl mx-auto w-full flex flex-col flex-1">
        {/* Subtle Welcome Header */}
        {validMessages.length > 0 ? (
          <div className="text-center text-[11px] text-[var(--text-sub)] py-1.5 px-3 rounded-full bg-[var(--bg-card)]/80 border border-[var(--border)] max-w-xs mx-auto shadow-sm mb-3">
            🔒 Private couple space • Double-tap to send love 💕
          </div>
        ) : (
          <div className="text-center text-xs text-[var(--text-sub)] py-8 px-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] max-w-sm mx-auto shadow-sm my-auto">
            <div className="text-3xl mb-2">💌</div>
            <div className="font-semibold text-white mb-1">Welcome to Our Sweet Space</div>
            <div>Say hello or send a photo to start your conversation! 💕</div>
          </div>
        )}

        {validMessages.map((msg, idx) => {
          const hasText = Boolean(msg.content && msg.content.trim().length > 0);
          const timeMs = (msg.datetime ? Date.parse(msg.datetime) : 0) || Number(msg.time_ms) || Date.now();
          const dateLabel = formatDateLabel(timeMs);
          const showDivider = dateLabel !== lastDateLabel;
          if (showDivider) lastDateLabel = dateLabel;

          const isMine = msg.sender.toLowerCase() === currentUser.toLowerCase();

          const prevMsg = idx > 0 ? validMessages[idx - 1] : null;
          const nextMsg = idx < validMessages.length - 1 ? validMessages[idx + 1] : null;

          const prevTime = prevMsg ? ((prevMsg.datetime ? Date.parse(prevMsg.datetime) : 0) || Number(prevMsg.time_ms) || 0) : 0;
          const nextTime = nextMsg ? ((nextMsg.datetime ? Date.parse(nextMsg.datetime) : 0) || Number(nextMsg.time_ms) || 0) : 0;

          // Check if next message would trigger a date divider
          const nextDateLabel = nextMsg ? formatDateLabel(nextTime) : null;
          const nextHasDivider = nextDateLabel !== dateLabel;

          const sameSenderAsPrev = Boolean(
            prevMsg &&
              prevMsg.sender.toLowerCase() === msg.sender.toLowerCase() &&
              Math.abs(timeMs - prevTime) < 3 * 60 * 1000 &&
              !showDivider
          );

          const sameSenderAsNext = Boolean(
            nextMsg &&
              nextMsg.sender.toLowerCase() === msg.sender.toLowerCase() &&
              Math.abs(nextTime - timeMs) < 3 * 60 * 1000 &&
              !nextHasDivider
          );

          const isFirstInGroup = !sameSenderAsPrev;
          const isLastInGroup = !sameSenderAsNext;

          // Corner radius styling for grouped consecutive messages
          let bubbleCorners = "rounded-2xl";
          if (isMine) {
            if (isFirstInGroup && isLastInGroup) {
              bubbleCorners = "rounded-2xl rounded-br-sm";
            } else if (isFirstInGroup && !isLastInGroup) {
              bubbleCorners = "rounded-2xl rounded-br-md";
            } else if (!isFirstInGroup && !isLastInGroup) {
              bubbleCorners = "rounded-2xl rounded-r-md";
            } else {
              bubbleCorners = "rounded-2xl rounded-tr-md rounded-br-sm";
            }
          } else {
            if (isFirstInGroup && isLastInGroup) {
              bubbleCorners = "rounded-2xl rounded-bl-sm";
            } else if (isFirstInGroup && !isLastInGroup) {
              bubbleCorners = "rounded-2xl rounded-bl-md";
            } else if (!isFirstInGroup && !isLastInGroup) {
              bubbleCorners = "rounded-2xl rounded-l-md";
            } else {
              bubbleCorners = "rounded-2xl rounded-tl-md rounded-bl-sm";
            }
          }

          return (
            <React.Fragment key={msg.id}>
              {showDivider && (
                <div className="text-center my-3">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-sub)] bg-[var(--bg-card)] px-3.5 py-1 rounded-full border border-[var(--border)]">
                    {dateLabel}
                  </span>
                </div>
              )}

              <div
                className={`flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] ${
                  isMine ? "self-end flex-row-reverse" : "self-start"
                } ${isFirstInGroup ? "mt-3" : "mt-1"}`}
              >
                {/* Avatar for incoming messages: only show on the last message in a group */}
                {!isMine && (
                  isLastInGroup ? (
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm shrink-0 border bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)] mb-0.5"
                      title={getSenderRole(msg.sender)}
                    >
                      {getSenderAvatar(msg.sender)}
                    </div>
                  ) : (
                    <div className="w-7 sm:w-8 shrink-0" aria-hidden="true" />
                  )
                )}

                {/* Message Bubble Column */}
                <div className="flex flex-col min-w-0">
                  {/* Sender name on first message of an incoming group */}
                  {!isMine && isFirstInGroup && (
                    <div className="text-[11px] font-semibold text-[var(--accent)] mb-0.5 px-1">
                      {getSenderRole(msg.sender)}
                    </div>
                  )}

                  {/* Content Bubble */}
                  <div
                    onClick={() => handleBubbleClick(msg.id)}
                    className={`relative group px-3.5 py-2 shadow-sm text-sm sm:text-[15px] leading-relaxed break-words select-text ${bubbleCorners} ${
                      isMine
                        ? "bg-[var(--mine-bg)] text-white"
                        : "bg-[var(--theirs-bg)] text-[var(--theirs-text)] border border-[var(--border)]"
                    }`}
                  >
                    {/* Replied Quote */}
                    {msg.reply_to && (
                      <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-black/25 border-l-2 border-[var(--accent)] text-xs text-left max-w-full">
                        <div className="font-bold text-[var(--accent)] text-[11px] truncate">
                          {msg.reply_to.sender}
                        </div>
                        <div className="text-white/80 truncate text-[11px]">
                          {msg.reply_to.content ||
                            (msg.reply_to.type === "image"
                              ? "📷 Live Moment"
                              : msg.reply_to.type === "audio"
                              ? "🎙️ Voice Note"
                              : "Message")}
                        </div>
                      </div>
                    )}

                    {/* Photo with Photo-Shield */}
                    {msg.image && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPhoto(msg.image!, msg.sender, formatTime(timeMs));
                        }}
                        className="relative overflow-hidden rounded-xl border border-white/10 mb-1.5 max-w-[260px] max-h-[220px] cursor-pointer"
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white font-bold flex items-center gap-1 z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          Live Moment
                        </div>
                        <img
                          src={msg.image}
                          alt="Moment"
                          className="w-full h-full object-cover pointer-events-none"
                          draggable={false}
                        />
                        <div className="photo-shield" />
                      </div>
                    )}

                    {/* Audio Note */}
                    {msg.audio && (
                      <div className="flex items-center gap-3 py-1 min-w-[180px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAudio(msg.id, msg.audio!);
                          }}
                          className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold active:scale-95 transition-transform shrink-0"
                        >
                          {playingAudioId === msg.id ? "⏸" : "▶"}
                        </button>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-1 h-3">
                            <span className="w-1 bg-white/70 h-2 rounded-full animate-pulse"></span>
                            <span className="w-1 bg-white/90 h-3 rounded-full animate-pulse"></span>
                            <span className="w-1 bg-white/60 h-1.5 rounded-full animate-pulse"></span>
                            <span className="w-1 bg-white h-3 rounded-full animate-pulse"></span>
                            <span className="w-1 bg-white/80 h-2 rounded-full animate-pulse"></span>
                          </div>
                          <span className="text-[10px] opacity-80 mt-1">
                            🎙️ Voice Note {msg.audio_duration ? `• ${msg.audio_duration}s` : ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Text Content */}
                    {hasText && (
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.content!.trim()}
                      </div>
                    )}

                    {/* Integrated Time & Delivery Ticks beside message */}
                    <div
                      className={`flex items-center gap-1 text-[10px] select-none mt-1 ${
                        isMine ? "justify-end text-white/70" : "justify-end text-[var(--text-sub)]"
                      }`}
                    >
                      <span>{formatTime(timeMs)}</span>
                      {isMine && (
                        <span
                          className={`text-[10px] font-bold tracking-tighter ${
                            msg.status === "seen"
                              ? "text-cyan-300"
                              : msg.status === "delivered"
                              ? "text-white"
                              : "opacity-60"
                          }`}
                          title={msg.status}
                        >
                          {getStatusIcon(msg.status)}
                        </span>
                      )}
                    </div>

                    {/* Hover Quick Actions */}
                    <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-1.5 py-0.5 shadow-lg flex items-center gap-1.5 text-xs z-10">
                      <button
                        onClick={() => onReplyMessage?.(msg)}
                        title="Reply"
                        className="hover:scale-125 transition-transform text-white/90"
                      >
                        ↩️
                      </button>
                      <button
                        onClick={() => onToggleReaction(msg.id, "❤️")}
                        className="hover:scale-125 transition-transform"
                      >
                        ❤️
                      </button>
                      <button
                        onClick={() => onToggleReaction(msg.id, "🥰")}
                        className="hover:scale-125 transition-transform"
                      >
                        🥰
                      </button>
                      <button
                        onClick={() => onToggleReaction(msg.id, "😂")}
                        className="hover:scale-125 transition-transform"
                      >
                        😂
                      </button>
                      <button
                        onClick={() => onToggleReaction(msg.id, "🥺")}
                        className="hover:scale-125 transition-transform"
                      >
                        🥺
                      </button>
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="hover:scale-125 transition-transform pl-1 text-red-400"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Reactions Pill Display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div
                      className={`flex flex-wrap gap-1 mt-1 px-1 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {Object.entries(msg.reactions).map(([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction(msg.id, emoji)}
                          className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 active:scale-95 transition-transform ${
                            users.includes(currentUser)
                              ? "bg-[var(--accent-dim)] border-[var(--accent)] text-white"
                              : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)]"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-bold">{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
});
