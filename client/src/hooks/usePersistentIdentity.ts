import { useState } from "react";

// Helper to guess device name from User Agent
function getFriendlyDeviceName() {
  const ua = navigator.userAgent;
  let os = "Node";

  if (ua.includes("Mac")) os = "Mac";
  if (ua.includes("Win")) os = "Windows";
  if (ua.includes("Linux")) os = "Linux";
  if (ua.includes("Android")) os = "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let browser = "Web";
  if (ua.includes("Chrome")) browser = "Chrome";
  if (ua.includes("Firefox")) browser = "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  if (ua.includes("Edg")) browser = "Edge";

  return `${os} (${browser})`;
}

export const usePersistentIdentity = () => {
  // Initialize Synchronously from LocalStorage
  const [identity] = useState<{ id: string; name: string }>(() => {
    // 1. Try to get existing
    let storedId = localStorage.getItem("ostrich_worker_id");
    let storedName = localStorage.getItem("ostrich_device_name");

    // 2. Create if missing
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem("ostrich_worker_id", storedId);
    }

    // 3. Fix name if missing or old format
    const isOldName = storedName?.startsWith("Node-");
    if (!storedName || isOldName) {
      const friendlyName = getFriendlyDeviceName();
      const shortHash = storedId.slice(0, 4).toUpperCase();
      storedName = `${friendlyName} - ${shortHash}`;
      localStorage.setItem("ostrich_device_name", storedName);
    }

    return { id: storedId, name: storedName! };
  });

  return identity;
};
