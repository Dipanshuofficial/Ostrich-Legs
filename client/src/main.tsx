import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./core/theme.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { SwarmProvider } from "./contexts/SwarmContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <SwarmProvider>
        <App />
      </SwarmProvider>
    </ErrorBoundary>
  </StrictMode>,
);
