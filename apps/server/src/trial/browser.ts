import { createTrialSession, type TrialHandle, type TrialOptions } from "./session.js";

let current: TrialHandle | null = null;

function readOptions(optionsJson?: string): TrialOptions {
  if (!optionsJson) return {};
  try {
    const parsed = JSON.parse(optionsJson) as TrialOptions;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

/** Browser entry. Messages cross the boundary as JSON strings. */
export function open(listener: (json: string) => void, optionsJson?: string): void {
  current?.close();
  current = createTrialSession((message) => {
    listener(JSON.stringify(message));
  }, readOptions(optionsJson));
}

export function send(json: string): void {
  current?.send(JSON.parse(json) as unknown);
}

export function close(): void {
  current?.close();
  current = null;
}
