"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE, getWsUrl, getAuthHeaders } from "@/lib/config";
import {
  ChatMessage,
  ThemeType,
  PendingMessage,
  AppEvent,
} from "@/lib/types";
import {
  savePendingMessage,
  getPendingMessages,
  removePendingMessage,
  clearPendingMessages,
} from "@/lib/indexedDb";
import { playMessageChime, playLoveNudgeChime, burstHearts } from "@/lib/audio";
import { Header } from "@/components/Header";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { Sidebar } from "@/components/Sidebar";

// Modals
import { ThemeModal } from "@/components/modals/ThemeModal";
import { PhotoLightboxModal } from "@/components/modals/PhotoLightboxModal";
import { AnniversaryModal } from "@/components/modals/AnniversaryModal";
import { LoginModal } from "@/components/modals/LoginModal";
import { ClearConfirmModal } from "@/components/modals/ClearConfirmModal";

// Helper: Determine if two message representations refer to the exact same message
function isSameMessage(a: ChatMessage, b: ChatMessage): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.clientMessageId && b.clientMessageId && a.clientMessageId === b.clientMessageId) return true;
  if (a.id && b.clientMessageId && a.id === b.clientMessageId) return true;
  if (a.clientMessageId && b.id && a.clientMessageId === b.id) return true;
  return false;
}

// Helper: Merge and deduplicate messages seamlessly without ghost duplicates or empty bubbles
function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const validIncoming = incoming.filter(
    (m) => Boolean(m.content?.trim() || m.image || m.audio)
  );
  if (validIncoming.length === 0) return current;

  // Build fast-lookup index map for O(1) lookups
  const map = new Map<string, number>();
  const result = [...current];

  result.forEach((m, idx) => {
    if (m.id) map.set(m.id, idx);
    if (m.clientMessageId) map.set(m.clientMessageId, idx);
  });

  for (const item of validIncoming) {
    let existingIndex = -1;
    if (item.id && map.has(item.id)) {
      existingIndex = map.get(item.id)!;
    } else if (item.clientMessageId && map.has(item.clientMessageId)) {
      existingIndex = map.get(item.clientMessageId)!;
    }

    if (existingIndex !== -1 && existingIndex < result.length) {
      const existing = result[existingIndex];
      const merged: ChatMessage = {
        ...existing,
        ...item,
        status:
          item.status === "seen" || existing.status === "seen"
            ? "seen"
            : item.status === "delivered" || existing.status === "delivered"
            ? "delivered"
            : item.status || existing.status,
        reactions: { ...existing.reactions, ...item.reactions },
      };
      result[existingIndex] = merged;
      if (merged.id) map.set(merged.id, existingIndex);
      if (merged.clientMessageId) map.set(merged.clientMessageId, existingIndex);
    } else {
      const newIdx = result.length;
      result.push(item);
      if (item.id) map.set(item.id, newIdx);
      if (item.clientMessageId) map.set(item.clientMessageId, newIdx);
    }
  }

  return result
    .filter((m) => Boolean(m.content?.trim() || m.image || m.audio))
    .sort((a, b) => {
      if (a.seq && b.seq && a.seq !== b.seq) return a.seq - b.seq;
      return (Number(a.time_ms) || 0) - (Number(b.time_ms) || 0);
    });
}

export default function ChatPage() {
  const [mounted, setMounted] = useState(false);

  // Session & User
  const [currentUser, setCurrentUser] = useState("");
  const [currentAvatar, setCurrentAvatar] = useState("🐻");
  const [sessionToken, setSessionToken] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Room State
  const [coupleName, setCoupleName] = useState("Our Sweet Space 💕");
  const [anniversaryDate, setAnniversaryDate] = useState("2024-02-14");
  const [daysTogether, setDaysTogether] = useState(0);
  const [disappearingMode, setDisappearingMode] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>("rose");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Love Nudge Cooldown
  const [nudgeCooldown, setNudgeCooldown] = useState(0);

  // Messages State
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Modals & Drawers
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState<{ src: string; sender: string; time: string } | null>(null);
  const [anniversaryModalOpen, setAnniversaryModalOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Connection & Offline Queue
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting" | "offline">("reconnecting");
  const [pendingCount, setPendingCount] = useState(0);

  // Reply Target State
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);

  // Stable references for async callbacks and WebSocket listeners
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const sessionTokenRef = useRef(sessionToken);
  sessionTokenRef.current = sessionToken;

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const currentThemeRef = useRef(currentTheme);
  currentThemeRef.current = currentTheme;

  const wsRef = useRef<WebSocket | null>(null);
  const maxSeqRef = useRef<number>(0);
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  // Refresh pending items count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const items = await getPendingMessages();
      setPendingCount(items.length);
    } catch {}
  }, []);

  // Calculate days together
  const calcDays = useCallback((dateStr: string) => {
    const start = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor(Math.abs(now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    setDaysTogether(diff);
  }, []);

  // Stable Set Theme Helper
  const applyThemeStyle = useCallback((theme: ThemeType) => {
    if (currentThemeRef.current === theme && typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === theme) {
      return;
    }
    currentThemeRef.current = theme;
    setCurrentTheme(theme);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("couple_theme", theme);
    }
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, []);

  // Initial Load & Session Initialization
  useEffect(() => {
    setMounted(true);
    refreshPendingCount();

    const savedUser = localStorage.getItem("couple_user");
    const savedToken = localStorage.getItem("couple_token");
    const savedAv = localStorage.getItem("couple_avatar") || "🐻";
    const savedTheme = (localStorage.getItem("couple_theme") as ThemeType) || "rose";

    applyThemeStyle(savedTheme);

    if (savedUser && savedToken) {
      setCurrentUser(savedUser);
      setSessionToken(savedToken);
      setCurrentAvatar(savedAv);
      setIsLoggedIn(true);
    }

    const onOnline = () => setConnectionStatus("reconnecting");
    const onOffline = () => setConnectionStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onLeave = () => {
      const u = currentUserRef.current;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.close();
        } catch {}
      }
      if (u && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(`${API_BASE}/api/leave?username=${encodeURIComponent(u)}`);
      }
    };
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("pagehide", onLeave);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [refreshPendingCount, applyThemeStyle]);

  // Send ACK for partner's message
  const sendAck = useCallback((msgId: string, status: "delivered" | "seen" = "delivered") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ack", msg_id: msgId, status }));
    } else {
      fetch(`${API_BASE}/api/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionTokenRef.current) },
        body: JSON.stringify({ msg_id: msgId, status }),
      }).catch(() => {});
    }
  }, []);

  // Unified Event Processor (Deduplication + Strict Sequence Ordering)
  const processEvent = useCallback((event: AppEvent) => {
    if (!event) return;

    if (event.eventId && processedEventIdsRef.current.has(event.eventId)) {
      return;
    }
    if (event.eventId) {
      processedEventIdsRef.current.add(event.eventId);
    }

    if (event.seq) {
      maxSeqRef.current = Math.max(maxSeqRef.current, event.seq);
    }

    const { type, actorId, payload } = event;

    switch (type) {
      case "message.created": {
        const chatItem: ChatMessage = payload as ChatMessage;
        if (!chatItem?.id) break;
        if (!chatItem.content?.trim() && !chatItem.image && !chatItem.audio) break;
        if (chatItem.seq) maxSeqRef.current = Math.max(maxSeqRef.current, chatItem.seq);

        setMessages((prev) => mergeMessages(prev, [chatItem]));

        if (chatItem.clientMessageId) {
          removePendingMessage(chatItem.clientMessageId).then(() => refreshPendingCount());
        }

        if (actorId.toLowerCase() !== currentUserRef.current.toLowerCase()) {
          sendAck(chatItem.id, "delivered");
          playMessageChime(soundEnabledRef.current);
        }
        break;
      }

      case "reaction.updated": {
        if (payload?.msg_id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.msg_id ? { ...m, reactions: payload.reactions } : m))
          );
          if (actorId.toLowerCase() !== currentUserRef.current.toLowerCase()) {
            burstHearts(12);
          }
        }
        break;
      }

      case "nudge.created": {
        burstHearts(40);
        playLoveNudgeChime(soundEnabledRef.current);
        break;
      }

      case "theme.updated": {
        if (payload?.theme && payload.theme !== currentThemeRef.current) {
          applyThemeStyle(payload.theme);
          if (actorId.toLowerCase() !== currentUserRef.current.toLowerCase()) {
            burstHearts(20);
          }
        }
        break;
      }

      case "settings.updated": {
        const conf = payload?.settings || {};
        if (conf.couple_name) setCoupleName(conf.couple_name);
        if (conf.anniversary_date) {
          setAnniversaryDate(conf.anniversary_date);
          calcDays(conf.anniversary_date);
        }
        if (conf.disappearing_mode !== undefined) setDisappearingMode(conf.disappearing_mode);
        if (conf.theme && conf.theme !== currentThemeRef.current) {
          applyThemeStyle(conf.theme);
        }
        break;
      }

      case "message.deleted": {
        if (payload?.msg_id) {
          setMessages((prev) => prev.filter((m) => m.id !== payload.msg_id));
        }
        break;
      }

      case "chat.cleared": {
        setMessages([]);
        break;
      }

      default:
        break;
    }
  }, [sendAck, applyThemeStyle, calcDays, refreshPendingCount]);

  // Catch-up Missed Events upon reconnect
  const syncMissedEvents = useCallback(async () => {
    const token = sessionTokenRef.current;
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/events?after_seq=${maxSeqRef.current}`, {
        headers: getAuthHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          for (const ev of data.events) {
            processEvent(ev);
          }
        }
      }
    } catch {}
  }, [processEvent]);

  // Part 1: Reload Chat Messages & Reactions (Runs every 5s at offset 0s)
  const syncMessages = useCallback(async () => {
    const user = currentUserRef.current;
    const token = sessionTokenRef.current;
    if (!user) return;

    try {
      let url = `${API_BASE}/api/messages?username=${encodeURIComponent(user)}`;
      if (maxSeqRef.current > 0) {
        url += `&after_seq=${maxSeqRef.current}`;
      }
      const res = await fetch(url, { headers: getAuthHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        const incoming: ChatMessage[] = (data.messages || []).filter(
          (m: ChatMessage) => Boolean(m.content?.trim() || m.image || m.audio)
        );
        if (incoming.length > 0) {
          incoming.forEach((m) => {
            if (m.seq) maxSeqRef.current = Math.max(maxSeqRef.current, m.seq);
            if (m.sender.toLowerCase() !== user.toLowerCase() && m.status !== "delivered" && m.status !== "seen") {
              sendAck(m.id, "delivered");
            }
          });
          setMessages((prev) => mergeMessages(prev, incoming));
        }
      }
    } catch {}
  }, [sendAck]);

  // Part 2: Reload Partner Presence (Runs every 5s at offset 1s)
  const syncPresence = useCallback(async () => {
    const user = currentUserRef.current;
    const token = sessionTokenRef.current;
    if (!user) return;

    try {
      const usersRes = await fetch(`${API_BASE}/api/users?username=${encodeURIComponent(user)}`, {
        headers: getAuthHeaders(token),
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.users && Array.isArray(data.users)) {
          setOnlineUsers(data.users);
        }
      }
    } catch {}
  }, []);

  // Part 3: Reload Couple Settings, Days Together & Theme (Runs every 5s at offset 2s)
  const syncSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (res.ok) {
        const conf = await res.json();
        if (conf.couple_name) setCoupleName(conf.couple_name);
        if (conf.anniversary_date) {
          setAnniversaryDate(conf.anniversary_date);
          calcDays(conf.anniversary_date);
        }
        if (conf.disappearing_mode !== undefined) setDisappearingMode(conf.disappearing_mode);
        if (conf.theme && conf.theme !== currentThemeRef.current) {
          applyThemeStyle(conf.theme);
        }
      }
    } catch {}
  }, [calcDays, applyThemeStyle]);

  // Persistent Chat: Initial fetch of full chat history on join / rejoin
  const loadHistory = useCallback(async () => {
    const user = currentUserRef.current;
    const token = sessionTokenRef.current;
    if (!user) return;

    try {
      const url = `${API_BASE}/api/messages?username=${encodeURIComponent(user)}`;
      const res = await fetch(url, { headers: getAuthHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        const incoming: ChatMessage[] = (data.messages || []).filter(
          (m: ChatMessage) => Boolean(m.content?.trim() || m.image || m.audio)
        );
        if (incoming.length > 0) {
          incoming.forEach((m) => {
            if (m.seq) maxSeqRef.current = Math.max(maxSeqRef.current, m.seq);
            if (m.sender.toLowerCase() !== user.toLowerCase() && m.status !== "delivered" && m.status !== "seen") {
              sendAck(m.id, "delivered");
            }
          });
          setMessages((prev) => mergeMessages(prev, incoming));
        }
      }
    } catch {}
  }, [sendAck]);

  const loadSettings = syncSettings;

  // Flush Outgoing Offline IndexedDB Queue
  const flushQueue = useCallback(async () => {
    try {
      const queue = await getPendingMessages();
      if (!queue.length) return;
      for (const item of queue) {
        if (!item.content?.trim() && !item.image && !item.audio) {
          await removePendingMessage(item.clientMessageId);
          continue;
        }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(item));
          await removePendingMessage(item.clientMessageId);
          setMessages((prev) =>
            prev.map((m) => (m.clientMessageId === item.clientMessageId || m.id === item.clientMessageId ? { ...m, status: "sent" } : m))
          );
        } else {
          const res = await fetch(`${API_BASE}/api/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionTokenRef.current) },
            body: JSON.stringify(item),
          });
          if (res.ok) {
            await removePendingMessage(item.clientMessageId);
            setMessages((prev) =>
              prev.map((m) => (m.clientMessageId === item.clientMessageId || m.id === item.clientMessageId ? { ...m, status: "sent" } : m))
            );
          }
        }
      }
      refreshPendingCount();
    } catch (e) {
      console.warn("[Queue] Error flushing offline items:", e);
    }
  }, [refreshPendingCount]);

  // Connect WebSocket & Wire Event Stream
  useEffect(() => {
    if (!isLoggedIn) return;

    let ws: WebSocket | null = null;
    let heartbeat: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    const connect = () => {
      const user = currentUserRef.current;
      const token = sessionTokenRef.current;
      if (!user) return;

      const url = getWsUrl(user, token);
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isCleanedUp) return;
        setConnectionStatus("connected");
        fetch(`${API_BASE}/api/purge_dummies`).catch(() => {});
        flushQueue();
        loadHistory();
        syncMissedEvents();
        loadSettings();

        heartbeat = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 15000);
      };

      ws.onmessage = (e) => {
        if (isCleanedUp) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "pong") return;

          // 1. Process Unified Event Envelope
          if (msg.type === "event" && msg.event) {
            processEvent(msg.event);
            return;
          }

          // 2. Presence & Delivery Status Updates
          if (msg.type === "msg_status") {
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.msg_id ? { ...m, status: msg.status } : m))
            );
            return;
          }

          if (msg.type === "partner_online") {
            const partnerUser = msg.username || (currentUserRef.current.toLowerCase() === "him" ? "Her" : "Him");
            setOnlineUsers((prev) => Array.from(new Set([...prev, partnerUser])));
            setMessages((prev) =>
              prev.map((m) => (m.status === "sent" ? { ...m, status: "delivered" } : m))
            );
            return;
          }

          if (msg.type === "partner_offline") {
            const offlineUser = msg.username ? msg.username.toLowerCase() : "";
            setOnlineUsers((prev) => prev.filter((u) => u.toLowerCase() !== offlineUser));
            return;
          }

          if (msg.type === "users_update") {
            const users: string[] = msg.users || [];
            setOnlineUsers(users);
            return;
          }

          if (msg.type === "theme_update") {
            if (msg.theme && msg.theme !== currentThemeRef.current) {
              applyThemeStyle(msg.theme);
              if (msg.sender && msg.sender !== "system" && msg.sender.toLowerCase() !== currentUserRef.current.toLowerCase()) {
                burstHearts(20);
              }
            }
            return;
          }

          if (msg.type === "settings_update") {
            const conf = msg.settings || {};
            if (conf.couple_name) setCoupleName(conf.couple_name);
            if (conf.anniversary_date) {
              setAnniversaryDate(conf.anniversary_date);
              calcDays(conf.anniversary_date);
            }
            if (conf.theme && conf.theme !== currentThemeRef.current) {
              applyThemeStyle(conf.theme);
            }
            return;
          }

          if (msg.type === "nudge") {
            burstHearts(40);
            playLoveNudgeChime(soundEnabledRef.current);
            return;
          }

          if (msg.type === "delete_message") {
            setMessages((prev) => prev.filter((m) => m.id !== msg.msg_id));
            return;
          }

          if (msg.type === "reaction_update") {
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.msg_id ? { ...m, reactions: msg.reactions } : m))
            );
            return;
          }

          // Legacy chat / photo / audio payload fallback
          const chatItem: ChatMessage = msg;
          if (chatItem.id) {
            if (!chatItem.content?.trim() && !chatItem.image && !chatItem.audio) return;
            if (chatItem.seq) maxSeqRef.current = Math.max(maxSeqRef.current, chatItem.seq);

            setMessages((prev) => mergeMessages(prev, [chatItem]));

            if (chatItem.clientMessageId) {
              removePendingMessage(chatItem.clientMessageId).then(() => refreshPendingCount());
            }

            if (chatItem.sender && chatItem.sender.toLowerCase() !== currentUserRef.current.toLowerCase()) {
              sendAck(chatItem.id, "delivered");
              playMessageChime(soundEnabledRef.current);
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        if (isCleanedUp) return;
        setConnectionStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting");
        if (heartbeat) clearInterval(heartbeat);
        reconnectTimeout = setTimeout(() => connect(), 2000);
      };

      ws.onerror = () => {
        if (isCleanedUp) return;
        setConnectionStatus("reconnecting");
      };
    };

    connect();
    loadHistory();
    syncPresence();

    // Dedicated 3-Second Reload: "In Our Space" partner presence reloads every 3 seconds
    const presenceInterval = setInterval(() => {
      syncPresence();
    }, 3000);

    // Staggered 5-Second Dispatcher: Reloads other parts of the app every 5 seconds, but NOT at the same time
    let tick = 0;
    const staggeredInterval = setInterval(() => {
      const phase = tick % 5;
      tick++;

      switch (phase) {
        case 0:
          // Part 1: Reload Chat Messages & Reactions (runs at t = 0s, 5s, 10s...)
          syncMessages();
          break;
        case 1:
          // Part 2: Heartbeat Ping / WebSocket Health
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "ping" }));
          }
          break;
        case 2:
          // Part 3: Reload Couple Settings, Days Counter & Synced Theme (runs at t = 2s, 7s, 12s...)
          syncSettings();
          break;
        case 3:
          // Part 4: Reload Connection Health & Queue Flush (runs at t = 3s, 8s, 13s...)
          flushQueue();
          break;
        case 4:
          // Part 5: Smooth network breathing room (runs at t = 4s, 9s, 14s...)
          break;
      }
    }, 1000);

    return () => {
      isCleanedUp = true;
      if (ws) ws.close();
      if (heartbeat) clearInterval(heartbeat);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(staggeredInterval);
      clearInterval(presenceInterval);
    };
  }, [isLoggedIn, flushQueue, loadHistory, syncMessages, syncPresence, syncSettings, syncMissedEvents, loadSettings, calcDays, sendAck, applyThemeStyle, refreshPendingCount, processEvent]);

  // Login handler
  const handleLogin = async (name: string, pin: string, avatar: string, remember: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.username);
        setSessionToken(data.token);
        setCurrentAvatar(avatar);
        setIsLoggedIn(true);

        if (remember) {
          localStorage.setItem("couple_user", data.username);
          localStorage.setItem("couple_token", data.token);
          localStorage.setItem("couple_avatar", avatar);
        }
        if (data.settings?.theme) applyThemeStyle(data.settings.theme);
        return { success: true };
      }
      return { success: false, error: data.detail || "Access denied" };
    } catch (e: unknown) {
      return { success: false, error: "Connection error: " + (e instanceof Error ? e.message : String(e)) };
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (!confirm("Leave and lock your private chat?")) return;
    if (wsRef.current) wsRef.current.close();
    localStorage.removeItem("couple_user");
    localStorage.removeItem("couple_token");
    setMessages([]);
    clearPendingMessages().catch(() => {});
    setIsLoggedIn(false);
    setCurrentUser("");
    setSessionToken("");
  };

  // Send Message (Instant WebSocket dispatch, non-blocking background IndexedDB write)
  const handleSendMessage = (content: string, stagedPhoto: string | null) => {
    if (!content?.trim() && !stagedPhoto) return; // Drop empty attempts

    const clientMessageId = "m_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const nowMs = Date.now();
    const replyDoc = replyTarget
      ? {
          id: replyTarget.id,
          sender: replyTarget.sender,
          content: replyTarget.content,
          type: replyTarget.type,
        }
      : null;

    const payload: ChatMessage = {
      id: clientMessageId,
      clientMessageId,
      msg_id: clientMessageId,
      sender: currentUser,
      content,
      image: stagedPhoto,
      type: stagedPhoto ? "image" : "chat",
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      time_ms: nowMs,
      seq: nowMs,
      reply_to: replyDoc,
      status: "pending",
      reactions: {},
    };

    // 1. Instant optimistic local render & clear reply preview (0ms)
    setMessages((prev) => mergeMessages(prev, [payload]));
    setReplyTarget(null);

    // 2. Dispatch over WebSocket IMMEDIATELY (0ms wait!)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      setMessages((prev) =>
        prev.map((m) => (m.id === clientMessageId ? { ...m, status: "sent" } : m))
      );
    } else {
      fetch(`${API_BASE}/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionToken) },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (res.ok) {
          removePendingMessage(clientMessageId).catch(() => {});
          refreshPendingCount();
          setMessages((prev) =>
            prev.map((m) => (m.id === clientMessageId ? { ...m, status: "sent" } : m))
          );
        }
      }).catch(() => {});
    }

    // 3. Asynchronously write to durable IndexedDB queue in background without blocking network
    savePendingMessage(payload as PendingMessage).then(refreshPendingCount).catch(() => {});
  };

  // Send Audio Note (Instant WebSocket dispatch)
  const handleSendAudio = (audioBase64: string, durationSec: number) => {
    if (!audioBase64) return; // Drop empty attempts

    const clientMessageId = "m_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const nowMs = Date.now();
    const replyDoc = replyTarget
      ? {
          id: replyTarget.id,
          sender: replyTarget.sender,
          content: replyTarget.content,
          type: replyTarget.type,
        }
      : null;

    const payload: ChatMessage = {
      id: clientMessageId,
      clientMessageId,
      msg_id: clientMessageId,
      sender: currentUser,
      audio: audioBase64,
      audio_duration: durationSec,
      type: "audio",
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      time_ms: nowMs,
      seq: nowMs,
      reply_to: replyDoc,
      status: "pending",
      reactions: {},
    };

    setMessages((prev) => mergeMessages(prev, [payload]));
    setReplyTarget(null);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      setMessages((prev) =>
        prev.map((m) => (m.id === clientMessageId ? { ...m, status: "sent" } : m))
      );
    } else {
      fetch(`${API_BASE}/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionToken) },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (res.ok) {
          removePendingMessage(clientMessageId).catch(() => {});
          refreshPendingCount();
          setMessages((prev) =>
            prev.map((m) => (m.id === clientMessageId ? { ...m, status: "sent" } : m))
          );
        }
      }).catch(() => {});
    }

    savePendingMessage(payload as PendingMessage).then(refreshPendingCount).catch(() => {});
  };

  // Love Nudge with 5s Cooldown
  const handleSendNudge = () => {
    if (nudgeCooldown > 0) return;
    setNudgeCooldown(5);
    burstHearts(30);
    playLoveNudgeChime(soundEnabled);

    const interval = setInterval(() => {
      setNudgeCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "nudge" }));
    } else {
      fetch(`${API_BASE}/api/nudge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionToken) },
        body: JSON.stringify({ sender: currentUser }),
      });
    }
  };

  // Select Synced Theme
  const handleSelectTheme = (theme: ThemeType) => {
    applyThemeStyle(theme);
    burstHearts(18);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "theme_change", theme }));
    }
    fetch(`${API_BASE}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionToken) },
      body: JSON.stringify({ theme }),
    }).catch(() => {});
  };

  // Toggle Reaction
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    burstHearts(10);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "reaction", msg_id: msgId, emoji }));
    } else {
      fetch(`${API_BASE}/api/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionToken) },
        body: JSON.stringify({ msg_id: msgId, emoji, sender: currentUser }),
      });
    }
  };

  // Delete Message
  const handleDeleteMessage = (msgId: string) => {
    if (!confirm("Delete this message for both of you?")) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "delete_message", msg_id: msgId }));
    } else {
      fetch(`${API_BASE}/api/messages/${encodeURIComponent(msgId)}`, {
        method: "DELETE",
        headers: getAuthHeaders(sessionToken),
      });
    }
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  // Clear Chat Modal Trigger
  const handleClearChat = () => {
    setClearConfirmOpen(true);
  };

  // Execute Clear Chat for both partners
  const handleExecuteClear = async () => {
    setClearConfirmOpen(false);
    setMessages([]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat_clear" }));
    }
    try {
      await fetch(`${API_BASE}/api/messages`, {
        method: "DELETE",
        headers: getAuthHeaders(sessionTokenRef.current),
      });
    } catch {}
  };

  // Save Anniversary & Couple Name
  const handleSaveAnniversary = async (date: string, name: string) => {
    burstHearts(20);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionToken) },
        body: JSON.stringify({ anniversary_date: date, couple_name: name }),
      });
      if (res.ok) {
        setAnniversaryDate(date);
        setCoupleName(name);
        calcDays(date);
      }
    } catch {}
  };

  // Change Disappearing Mode
  const handleChangeDisappearing = async (seconds: number) => {
    setDisappearingMode(seconds);
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(sessionToken) },
        body: JSON.stringify({ disappearing_mode: seconds }),
      });
    } catch {}
  };

  if (!mounted) {
    return (
      <div className="flex w-full h-[100dvh] items-center justify-center bg-[#0c0a10] text-[#e11d48]">
        <span className="text-4xl animate-bounce">💖</span>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full h-[100dvh] overflow-hidden bg-[var(--bg-root)] text-[var(--text-main)]">
      {/* Login Modal */}
      <LoginModal isOpen={!isLoggedIn} onLogin={handleLogin} />

      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        coupleName={coupleName}
        daysTogether={daysTogether}
        currentUser={currentUser}
        currentAvatar={currentAvatar}
        onlineUsers={onlineUsers}
        currentTheme={currentTheme}
        disappearingMode={disappearingMode}
        onSelectTheme={handleSelectTheme}
        onChangeDisappearing={handleChangeDisappearing}
        onOpenAnniversary={() => setAnniversaryModalOpen(true)}
        onClearChat={handleClearChat}
        onLogout={handleLogout}
      />

      {/* Main Chat Stream */}
      <main className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden relative">
        {(() => {
          const isPartnerOnline = onlineUsers.some((u) => u.toLowerCase() !== currentUser.toLowerCase());
          const partnerDisplayName = currentUser.toLowerCase() === "him"
            ? "Her"
            : currentUser.toLowerCase() === "her"
            ? "Him"
            : (onlineUsers.find((u) => u.toLowerCase() !== currentUser.toLowerCase()) || "Partner");

          return (
            <>
              <Header
                coupleName={coupleName}
                nudgeCooldown={nudgeCooldown}
                soundEnabled={soundEnabled}
                connectionStatus={connectionStatus}
                pendingCount={pendingCount}
                partnerName={isPartnerOnline ? partnerDisplayName : null}
                onOpenSidebar={() => setSidebarOpen(true)}
                onEditCoupleName={() => setAnniversaryModalOpen(true)}
                onSendNudge={handleSendNudge}
                onToggleSound={() => setSoundEnabled((prev) => !prev)}
              />

              <MessageList
                messages={messages}
                currentUser={currentUser}
                partnerName={partnerDisplayName}
                onToggleReaction={handleToggleReaction}
                onDeleteMessage={handleDeleteMessage}
                onOpenPhoto={(src, sender, time) => setActivePhoto({ src, sender, time })}
                onReplyMessage={(msg) => setReplyTarget(msg)}
              />

              <ChatInput
                onSendMessage={handleSendMessage}
                onSendAudio={handleSendAudio}
                onSendNudge={handleSendNudge}
                nudgeCooldown={nudgeCooldown}
                replyTarget={replyTarget}
                onCancelReply={() => setReplyTarget(null)}
              />
            </>
          );
        })()}
      </main>

      {/* Theme Modal */}
      <ThemeModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Photo Lightbox */}
      <PhotoLightboxModal
        photo={activePhoto}
        onClose={() => setActivePhoto(null)}
      />

      {/* Anniversary & Couple Name Modal */}
      <AnniversaryModal
        isOpen={anniversaryModalOpen}
        onClose={() => setAnniversaryModalOpen(false)}
        currentDate={anniversaryDate}
        currentName={coupleName}
        onSave={handleSaveAnniversary}
      />

      {/* Protected Clear Chat Confirmation Modal */}
      <ClearConfirmModal
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={handleExecuteClear}
      />
    </div>
  );
}
