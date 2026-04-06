/** Minimal interface every channel must implement */
export interface Channel {
  /** Begin receiving messages (non-blocking — starts background loop) */
  start(): Promise<void>;
  /** Gracefully stop the channel */
  stop(): void;
}
