// Client-side Web Push Notification & Service Worker manager

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (err) {
    console.warn("[SW] Registration failed:", err);
    return null;
  }
}

export function getPushPermissionState(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function subscribeToPushNotifications(
  apiBaseUrl: string,
  username: string
): Promise<{ success: boolean; message: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, message: "Push notifications are not supported on this browser/device." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, message: "Notification permission was denied." };
    }

    const reg = await navigator.serviceWorker.ready;
    if (!reg) {
      return { success: false, message: "Service Worker not ready." };
    }

    // Fetch VAPID public key from backend
    const res = await fetch(`${apiBaseUrl}/api/push/vapid-public-key`);
    if (!res.ok) {
      throw new Error(`Failed to fetch VAPID key (${res.status})`);
    }
    const data = await res.json();
    const vapidKey = data.public_key;
    if (!vapidKey) {
      throw new Error("No public key returned by server");
    }

    const appServerKey = urlBase64ToUint8Array(vapidKey);
    let sub = await reg.pushManager.getSubscription();

    // If an existing subscription exists with a different key, unsubscribe and renew
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as unknown as BufferSource,
      });
    }

    // Register with backend MongoDB
    const subRes = await fetch(`${apiBaseUrl}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: username,
        subscription: sub.toJSON(),
      }),
    });

    if (!subRes.ok) {
      throw new Error("Failed to register subscription with backend");
    }

    return { success: true, message: "Push notifications active! You'll receive alerts even when the tab is closed 💕" };
  } catch (err: any) {
    console.error("[Push] Subscribe error:", err);
    return { success: false, message: err?.message || "Failed to enable notifications." };
  }
}

export async function unsubscribeFromPushNotifications(
  apiBaseUrl: string
): Promise<{ success: boolean }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { success: false };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch(`${apiBaseUrl}/api/push/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
    return { success: true };
  } catch (err) {
    console.warn("[Push] Unsubscribe error:", err);
    return { success: false };
  }
}
