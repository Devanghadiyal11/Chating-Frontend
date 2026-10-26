/**
 * End-to-End Network Encryption for Media Attachments (Photos)
 *
 * Uses AES-GCM-256 via Web Crypto API.
 * Guarantees photos remain encrypted during network transit (over WebSockets and HTTP),
 * while MongoDB storage stores the decrypted original format.
 */

import { ChatMessage } from "./types";

const PHOTO_ENCRYPTION_SECRET =
  process.env.NEXT_PUBLIC_PHOTO_SECRET || "couple_secret_key_1012_encrypted_transit";

let cachedCryptoKey: CryptoKey | null = null;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;
  const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto API is not available in this environment");
  }
  const encoder = new TextEncoder();
  const hash = await cryptoObj.subtle.digest("SHA-256", encoder.encode(PHOTO_ENCRYPTION_SECRET));
  cachedCryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedCryptoKey;
}

/**
 * Encrypt a photo data URL or image string before sending across the network.
 * Format: "enc:v1:<base64(iv + ciphertext + auth_tag)>"
 */
export async function encryptPhoto(dataUrl: string | null | undefined): Promise<string | null> {
  if (!dataUrl) return null;
  if (dataUrl.startsWith("enc:v1:")) return dataUrl; // already encrypted

  try {
    const key = await getEncryptionKey();
    const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
    const iv = cryptoObj.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(dataUrl);

    const ciphertext = await cryptoObj.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return "enc:v1:" + uint8ArrayToBase64(combined);
  } catch (err) {
    console.error("[Crypto] Failed to encrypt photo for network:", err);
    return dataUrl;
  }
}

/**
 * Decrypt a photo string received from the network.
 * If not encrypted (legacy or plain image), returns as is.
 */
export async function decryptPhoto(cipherStr: string | null | undefined): Promise<string | null> {
  if (!cipherStr) return null;
  if (!cipherStr.startsWith("enc:v1:")) return cipherStr;

  try {
    const key = await getEncryptionKey();
    const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
    const base64Data = cipherStr.slice("enc:v1:".length);
    const combined = base64ToUint8Array(base64Data);

    if (combined.length <= 12) return cipherStr;

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await cryptoObj.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("[Crypto] Failed to decrypt photo from network:", err);
    return cipherStr;
  }
}

/**
 * Decrypt photo in a ChatMessage if encrypted.
 */
export async function decryptMessage(msg: ChatMessage): Promise<ChatMessage> {
  if (msg.image && msg.image.startsWith("enc:v1:")) {
    const decryptedImage = await decryptPhoto(msg.image);
    return { ...msg, image: decryptedImage };
  }
  return msg;
}

/**
 * Decrypt photos in an array of ChatMessages.
 */
export async function decryptMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
  if (!messages || messages.length === 0) return [];
  return Promise.all(messages.map((m) => decryptMessage(m)));
}
