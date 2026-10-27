export type ThemeType = "rose" | "lavender" | "sunset" | "noir" | "cream";

export type DeliveryStatus = "pending" | "sent" | "delivered" | "seen";

export interface ChatMessage {
  id: string;
  seq?: number;
  msg_id?: string;
  clientMessageId?: string;
  sender: string;
  content?: string;
  image?: string | null;
  audio?: string | null;
  audio_duration?: number;
  reply_to?: { id: string; sender: string; content?: string; type?: string } | null;
  type: "chat" | "image" | "audio" | "system";
  timestamp: string;
  time_ms: number;
  datetime?: string;
  created_at?: string | number;
  status?: DeliveryStatus;
  reactions?: Record<string, string[]>;
}

export interface PendingMessage {
  clientMessageId: string;
  sender: string;
  content?: string;
  image?: string | null;
  audio?: string | null;
  audio_duration?: number;
  reply_to?: { id: string; sender: string; content?: string; type?: string } | null;
  type: "chat" | "image" | "audio";
  time_ms: number;
  timestamp: string;
  datetime?: string;
  created_at?: string | number;
}

export interface CoupleSettings {
  anniversary_date: string;
  disappearing_mode: number;
  couple_name: string;
  theme: ThemeType;
}

export interface AppEvent {
  eventId: string;
  roomId: string;
  seq: number;
  type: string;
  actorId: string;
  payload: Record<string, any>;
  createdAt: number;
}
