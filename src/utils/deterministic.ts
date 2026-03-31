import { CryptoUtils } from "../backend/CryptoUtils";

export function detId(seed: unknown, prefix = ""): string {
  const s = CryptoUtils.stableStringify(seed);
  const h = CryptoUtils.nonCryptoFingerprint(s);
  const id = h.slice(-12);
  return prefix ? `${prefix}-${id}` : id;
}

export function detTimestamp(seed: unknown): number {
  const s = CryptoUtils.stableStringify(seed);
  const h = CryptoUtils.nonCryptoFingerprint(s);
  return parseInt(h.slice(-8), 16);
}

export function detRandomInt(
  seed: unknown,
  min: number,
  max: number,
  salt: unknown = "",
): number {
  const s = CryptoUtils.stableStringify({ seed, salt });
  const h = CryptoUtils.nonCryptoFingerprint(s);
  const v = parseInt(h.slice(-8), 16);
  return min + (v % (max - min + 1));
}

function zeroPad(n: number, width = 2) {
  return n.toString().padStart(width, "0");
}

// Convert epoch milliseconds to UTC date components without using `Date`.
function daysToYMD(days: number) {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097; // [0, 146096]
  const yoe = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365,
  ); // [0,399]
  let y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  let m = mp + (mp < 10 ? 3 : -9);
  y += m <= 2 ? 1 : 0;
  return { year: y, month: m, day: d };
}

export function formatIsoTimestamp(ms: number): string {
  const days = Math.floor(ms / 86400000);
  let rem = ms % 86400000;
  if (rem < 0) rem += 86400000;

  const { year, month, day } = daysToYMD(days);

  const hour = Math.floor(rem / 3600000);
  rem = rem % 3600000;
  const minute = Math.floor(rem / 60000);
  rem = rem % 60000;
  const second = Math.floor(rem / 1000);
  const millisecond = rem % 1000;

  return (
    `${year}-${zeroPad(month)}-${zeroPad(day)}T` +
    `${zeroPad(hour)}:${zeroPad(minute)}:${zeroPad(second)}.${String(millisecond).padStart(3, "0")}Z`
  );
}

export function formatTime(ms: number): string {
  // Returns HH:MM:SS portion (used previously by formatTimestamp)
  const rem = ((ms % 86400000) + 86400000) % 86400000;
  const hour = Math.floor(rem / 3600000);
  const minute = Math.floor((rem % 3600000) / 60000);
  const second = Math.floor((rem % 60000) / 1000);
  return `${zeroPad(hour)}:${zeroPad(minute)}:${zeroPad(second)}`;
}

export function getStartOfMonth(ms: number): number {
  const days = Math.floor(ms / 86400000);
  const { year, month } = daysToYMD(days);
  // compute days till the first of the month
  // construct date for year-month-1 as days since epoch
  // Reverse convert: use algorithm to compute days from y,m,d -> days
  const a = Math.floor((14 - month) / 12);
  const y = year - a;
  const m = month + 12 * a - 3;
  const julianDay =
    1 +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    719468;
  return julianDay * 86400000;
}

export default { detId, detTimestamp, detRandomInt };

// --- Governance Specifics ---
export function createAgentSignature(
  agentId: string,
  proposalId: string,
  type: "terminal" | "autonomous" = "terminal",
): string {
  const raw = `${agentId}::${proposalId}::${now()}::${type}::COUNCIL_SIG`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Return a pseudo SHA-like segment
  return Math.abs(hash).toString(16).padStart(10, "0") + "...";
}

// Deterministic clock: returns a deterministic epoch (ms) based on environment
// configuration. Core logic must call `now()` instead of `Date.now()` or
// `new Date()` to satisfy Zero-Temperature determinism requirements.
export function now(): number {
  const v = process.env["DETERMINISTIC_NOW_MS"];
  if (v) {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  // Fallback: stable constant epoch (approx. 2024-03-09) — deterministic across runs
  return 1710000000000;
}
