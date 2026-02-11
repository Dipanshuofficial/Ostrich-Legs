import { useState, useEffect } from "react";

export const usePersistentIdentity = () => {
  const [identity, setIdentity] = useState({ id: "", name: "" });

  useEffect(() => {
    // 1. Check LocalStorage
    let storedId = localStorage.getItem("ostrich_device_id");
    let storedName = localStorage.getItem("ostrich_device_name");

    // 2. Generate New ID if missing
    if (!storedId) {
      storedId = `node-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("ostrich_device_id", storedId);
    }

    // 3. Generate Name based on Platform
    if (!storedName) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      storedName = isMobile ? "Mobile Node" : "Desktop Node";
      localStorage.setItem("ostrich_device_name", storedName);
    }

    setIdentity({ id: storedId, name: storedName });
  }, []);

  return identity;
};
