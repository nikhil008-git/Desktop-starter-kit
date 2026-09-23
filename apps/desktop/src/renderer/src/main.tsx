import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import { App } from "./App";
import "./index.css";

// HashRouter, not BrowserRouter. A built app loads from file://.../index.html,
// so the "path" BrowserRouter sees is the file's location on disk and no route
// matches. Hash routes (#/app) work the same in dev and in the packaged app.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
