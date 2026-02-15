import { useState, useEffect, useCallback } from "react";

const SWARM_TOKEN_KEY = "ostrich_swarm_token";

export const usePersistentIdentity = () => {
  const [identity, setIdentity] = useState({ id: "", name: "" });
  const [swarmToken, setSwarmToken] = useState<string | null>(null);

  useEffect(() => {
    // 1. Identity Logic (Existing)
    let storedId = localStorage.getItem("ostrich_device_id");
    let storedName = localStorage.getItem("ostrich_device_name");

    if (!storedId || storedId === "undefined") {
      const newId = `node-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem("ostrich_device_id", newId);
      storedId = newId;
    }

    if (!storedName) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      storedName = isMobile ? "Mobile Node" : "Desktop Node";
      localStorage.setItem("ostrich_device_name", storedName);
    }
    setIdentity({ id: storedId, name: storedName });

    // 2. Swarm Persistence Logic (New)
    const storedToken = sessionStorage.getItem(SWARM_TOKEN_KEY);
    const urlToken = new URLSearchParams(window.location.search).get("invite");

    if (urlToken) {
      // New join via URL link
      sessionStorage.setItem(SWARM_TOKEN_KEY, urlToken);
      setSwarmToken(urlToken);
    } else if (storedToken) {
      // RELOAD PROTECTION: Restore state first, then update URL for consistency
      setSwarmToken(storedToken);
      const url = new URL(window.location.href);
      url.searchParams.set("invite", storedToken);
      window.history.replaceState({}, "", url.toString());
    } else {
      setSwarmToken(null);
    }
  }, []);
  // NEW: Function to lock in a token from ANY source (QR/Manual/Link)
  const saveSwarmToken = useCallback((token: string) => {
    sessionStorage.setItem(SWARM_TOKEN_KEY, token);
    setSwarmToken(token);

    // Update URL so a browser refresh behaves like a link-join
    const url = new URL(window.location.href);
    url.searchParams.set("invite", token);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const clearSwarmToken = useCallback(() => {
    sessionStorage.removeItem(SWARM_TOKEN_KEY);
    setSwarmToken(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.history.replaceState({}, "", url.toString());
  }, []);

  return { identity, swarmToken, clearSwarmToken, saveSwarmToken }; // Added isHydrated
};
