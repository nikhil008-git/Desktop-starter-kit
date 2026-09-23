import type { Api } from "../../preload";

declare global {
  interface Window {
    /** Exposed by src/preload/index.ts. */
    api: Api;
  }
}

export {};
