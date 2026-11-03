export const SCHEDULER_INTERVAL_MS = 15_000;
export const COMMAND_QUEUED_TIMEOUT_MS = 2 * 60 * 1000;
export const COMMAND_SENT_TIMEOUT_MS = 60 * 1000;
export const COMMAND_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
export const DEVICE_OFFLINE_TIMEOUT_MS = 5 * 60 * 1000;

export function configuredTimeout(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
