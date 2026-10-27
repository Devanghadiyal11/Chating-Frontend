"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/lib/types";

interface ChatInputProps {
  onSendMessage: (content: string, stagedPhoto: string | null) => void;
  onSendAudio: (audioBase64: string, durationSec: number) => void;
  onSendNudge: () => void;
  nudgeCooldown: number;
  replyTarget?: ChatMessage | null;
  onCancelReply?: () => void;
}

export function ChatInput({
  onSendMessage,
  onSendAudio,
  onSendNudge,
  nudgeCooldown,
  replyTarget,
  onCancelReply,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [stagedPhoto, setStagedPhoto] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when replying to a message
  useEffect(() => {
    if (replyTarget) {
      textInputRef.current?.focus();
    }
  }, [replyTarget]);

  // Photo source popover & gallery upload
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [qualityChoice, setQualityChoice] = useState<"original" | "optimized">("original");
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop camera when modal closes
  useEffect(() => {
    if (!cameraOpen && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [cameraOpen]);

  const startCamera = async (mode: "user" | "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setFacingMode(mode);
      setCameraOpen(true);
    } catch {
      alert("Unable to open camera. Please allow camera permissions!");
    }
  };

  const captureLivePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setStagedPhoto(dataUrl);
    setCameraOpen(false);
  };

  const flipCamera = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    startCamera(nextMode);
  };

  // Gallery File Selection & Quality Processing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    // Reset file input so selecting the same image triggers again if needed
    e.target.value = "";

    setPendingFile(file);
    setQualityChoice("original");
    setQualityModalOpen(true);
  };

  const processImage = (file: File, mode: "original" | "optimized"): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          if (mode === "optimized") {
            const maxDim = 1200;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.72));
          } else {
            // Original quality: preserve resolution, cap at max 2560px for safe WS transmission
            const maxDim = 2560;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.92));
          }
        };
        img.onerror = reject;
        img.src = src;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleApplyQuality = async () => {
    if (!pendingFile) return;
    try {
      setIsProcessingImage(true);
      const dataUrl = await processImage(pendingFile, qualityChoice);
      setStagedPhoto(dataUrl);
      setQualityModalOpen(false);
      setPendingFile(null);
    } catch {
      alert("Failed to process image. Please try another photo.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      alert("Unable to access microphone. Please allow audio permissions!");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    setRecordDuration(0);
    audioChunksRef.current = [];
  };

  const sendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    const duration = recordDuration;
    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onSendAudio(base64, duration);
      };
      reader.readAsDataURL(audioBlob);
      audioChunksRef.current = [];
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    setRecordDuration(0);
  };

  // Text Typing Handler
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleSend = () => {
    if (!text.trim() && !stagedPhoto) return;
    onSendMessage(text.trim(), stagedPhoto);
    setText("");
    setStagedPhoto(null);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-3 bg-[var(--bg-dark)] border-t border-[var(--border)] shrink-0 z-10">
      <div className="max-w-3xl xl:max-w-4xl mx-auto w-full flex flex-col gap-2">
        {/* Audio Recording Live Panel */}
        {isRecording && (
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-bold text-white">Recording Voice Note...</span>
              <span className="text-xs text-[var(--accent)] font-mono font-bold">
                {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="px-2.5 py-1 text-xs text-white/70 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={sendRecording}
                className="px-3 py-1 bg-[var(--accent)] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Send 🎙️
              </button>
            </div>
          </div>
        )}

        {/* Staged Photo Preview */}
        {stagedPhoto && (
          <div className="relative inline-block self-start rounded-xl overflow-hidden border border-[var(--accent)] shadow-md">
            <img src={stagedPhoto} alt="Captured" className="w-20 h-20 object-cover" />
            <button
              onClick={() => setStagedPhoto(null)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Replying Banner */}
        {replyTarget && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[var(--accent)] font-bold shrink-0">Replying to {replyTarget.sender}:</span>
              <span className="truncate text-[var(--text-sub)]">
                {replyTarget.content || (replyTarget.type === "image" ? "📷 Photo" : replyTarget.type === "audio" ? "🎙️ Voice Note" : "Message")}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="text-white/60 hover:text-white text-xs font-bold pl-2 shrink-0"
              title="Cancel reply"
            >
              ✕
            </button>
          </div>
        )}

        {/* Composer Row - Grouped Input Capsule with Tools */}
        <div className="w-full flex items-center gap-2">
          {/* Unified Capsule: Media buttons + Text Input + Heart Nudge */}
          <div className="flex-1 flex items-center bg-[var(--bg-card)] border border-[var(--border)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/50 rounded-2xl px-2 py-1 transition-all">
            {/* Integrated Media Tools */}
            <div className="flex items-center gap-0.5 shrink-0 text-white/70">
              {/* Camera / Gallery Button with Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPhotoMenuOpen((prev) => !prev)}
                  className="w-8 h-8 rounded-xl hover:bg-white/10 hover:text-white flex items-center justify-center text-base transition-colors active:scale-95 text-white/70"
                  title="Send Photo (Camera or Gallery)"
                >
                  📷
                </button>

                {/* Hidden Gallery Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Action Popover: Camera or Gallery */}
                {photoMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setPhotoMenuOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-2 w-52 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-1.5 z-30 flex flex-col gap-1 backdrop-blur-md">
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoMenuOpen(false);
                          startCamera(facingMode);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
                      >
                        <span className="text-base">📸</span>
                        <span>Take Live Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
                      >
                        <span className="text-base">🖼️</span>
                        <span>Upload from Gallery</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={startRecording}
                disabled={isRecording}
                className="w-8 h-8 rounded-xl hover:bg-white/10 hover:text-white flex items-center justify-center text-base transition-colors active:scale-95"
                title="Record Voice Note"
              >
                🎙️
              </button>
            </div>

            {/* Text Input Box */}
            <input
              ref={textInputRef}
              type="text"
              value={text}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write something sweet..."
              className="flex-1 bg-transparent px-2.5 py-1.5 text-sm sm:text-base text-[var(--text-main)] placeholder-[var(--text-sub)]/50 focus:outline-none"
            />

            {/* Integrated Thinking of You / Heart Nudge */}
            <button
              type="button"
              onClick={onSendNudge}
              disabled={nudgeCooldown > 0}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-transform shrink-0 active:scale-90 ${
                nudgeCooldown > 0
                  ? "text-[var(--accent)] font-bold text-xs cursor-not-allowed opacity-60"
                  : "hover:bg-[var(--accent-dim)] text-[var(--accent)] hover:scale-110"
              }`}
              title="Thinking of You! 💖"
            >
              {nudgeCooldown > 0 ? `${nudgeCooldown}s` : "💖"}
            </button>
          </div>

          {/* Compact Accent Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() && !stagedPhoto}
            className="h-10 px-4 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Send message"
          >
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Live Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-4">
          <div className="w-full flex items-center justify-between text-white text-sm font-bold px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Camera Moment
            </span>
            <button
              onClick={() => setCameraOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden border-2 border-[var(--accent)] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
          </div>

          <div className="flex items-center gap-8 mb-6">
            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center text-xl"
              title="Flip Camera"
            >
              🔄
            </button>

            <button
              onClick={captureLivePhoto}
              className="w-18 h-18 rounded-full border-4 border-white bg-[var(--accent)] shadow-lg active:scale-90 transition-transform flex items-center justify-center text-2xl"
              title="Capture Moment"
            >
              📸
            </button>

            <button
              onClick={() => setCameraOpen(false)}
              className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Send Photo Quality Modal (matches user mockup) */}
      {pendingFile && qualityModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#101012] border border-[var(--border)] rounded-3xl p-6 shadow-2xl text-left">
            {/* Close button */}
            <button
              onClick={() => {
                setQualityModalOpen(false);
                setPendingFile(null);
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-xs transition-colors"
              title="Cancel"
            >
              ✕
            </button>

            {/* Title & Subtitle */}
            <h3 className="text-white text-lg font-bold flex items-center gap-1.5">
              <span>Send photo</span>
              <span>💕</span>
            </h3>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1 mb-5">
              Choose how you want to share your moment.
            </p>

            {/* Quality Options */}
            <div className="space-y-3">
              {/* Original Quality Card */}
              <div
                onClick={() => setQualityChoice("original")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                  qualityChoice === "original"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-neutral-800 hover:border-neutral-700 bg-neutral-900/40"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      qualityChoice === "original" ? "text-[var(--accent)]" : "text-neutral-400"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm sm:text-base">
                      Original quality
                    </div>
                    <div className="text-neutral-400 text-xs sm:text-sm mt-0.5">
                      Full resolution, larger file
                    </div>
                  </div>
                </div>
                {qualityChoice === "original" && (
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                    ✓
                  </div>
                )}
              </div>

              {/* Optimized Card */}
              <div
                onClick={() => setQualityChoice("optimized")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                  qualityChoice === "optimized"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-neutral-800 hover:border-neutral-700 bg-neutral-900/40"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      qualityChoice === "optimized" ? "text-[var(--accent)]" : "text-neutral-400"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm sm:text-base">
                      Optimized
                    </div>
                    <div className="text-neutral-400 text-xs sm:text-sm mt-0.5">
                      Smaller file, faster sharing
                    </div>
                  </div>
                </div>
                {qualityChoice === "optimized" && (
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                    ✓
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Apply Button */}
            <button
              onClick={handleApplyQuality}
              disabled={isProcessingImage}
              className="w-full mt-6 py-3.5 rounded-full bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition-colors text-center shadow-lg active:scale-98 disabled:opacity-50"
            >
              {isProcessingImage ? "Processing photo..." : "Use this option"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
