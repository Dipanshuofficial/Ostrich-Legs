import { useEffect, useRef, useCallback } from "react";
import ComputeWorker from "../utils/compute.worker?worker";

export const useSwarmExecution = (throttle: number, isRunning: boolean) => {
  const workerRef = useRef<Worker | null>(null);

  const updateConfig = useCallback(() => {
    workerRef.current?.postMessage({
      type: "CONFIG_UPDATE",
      payload: { throttle: isRunning ? throttle / 100 : 0 },
    });
  }, [throttle, isRunning]);

  useEffect(() => {
    const worker = new ComputeWorker();
    workerRef.current = worker;

    // Fix Bottleneck 1: Pause when tab is backgrounded
    const handleVisibility = () => {
      if (document.hidden) {
        worker.postMessage({ type: "CONFIG_UPDATE", payload: { throttle: 0 } });
      } else {
        updateConfig();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    updateConfig();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      worker.terminate();
    };
  }, [updateConfig]);

  return {
    dispatchJob: (job: any) => {
      workerRef.current?.postMessage({ type: "EXECUTE_JOB", payload: job });
    },
  };
};
