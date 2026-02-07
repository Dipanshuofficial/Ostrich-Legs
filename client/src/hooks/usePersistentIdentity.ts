import { useEffect, useState } from "react";

export const usePersistentIdentity = () => {
  const [identity, setIdentity] = useState<{ id: string; name: string } | null>(
    null,
  );
  useEffect(() => {
    const storedId = localStorage.getItem("ostrich_worker_id");
    const storedName = localStorage.getItem("ostrich_device_name");

    if (storedId && storedName) {
      setIdentity({ id: storedId, name: storedName });
    } else {
      const newId = crypto.randomUUID();
      const newName = `Node-${newId.slice(0, 4).toUpperCase()}`;

      localStorage.setItem(`ostrich_worker_id`, newId);
      localStorage.setItem(`ostrich_device_name`, newName);
      setIdentity({ id: newId, name: newName });
    }
  }, []);

  return identity;
};
