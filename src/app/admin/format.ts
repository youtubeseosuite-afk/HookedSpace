// src/app/admin/format.ts
// NY FIL. Fælles tekster og datoformat til admin-siderne.

export const REPORT_REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  chikane: "Chikane",
  ulovligt: "Ulovligt indhold",
  upassende: "Upassende",
  fredning: "Fredningstid / mindstemål",
  andet: "Andet",
};

export const REPORT_TARGET_LABEL: Record<string, string> = {
  post: "opslag",
  comment: "kommentar",
  user: "profil",
  group: "gruppe",
};

export const REPORT_STATUS_LABEL: Record<string, string> = {
  open: "Åben",
  resolved: "Løst",
  dismissed: "Afvist",
};

const TZ = "Europe/Copenhagen";

export function dkDate(iso: string | null | undefined) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

export function dkDateTime(iso: string | null | undefined) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

// "for 3 dage siden", "i dag", "aldrig"
export function sinceText(iso: string | null | undefined) {
  if (!iso) return "aldrig";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return min <= 1 ? "lige nu" : `for ${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `for ${h} t siden`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? "i går" : `for ${d} dage siden`;
  const m = Math.floor(d / 30);
  if (m < 12) return m === 1 ? "for 1 måned siden" : `for ${m} måneder siden`;
  const y = Math.floor(d / 365);
  return y <= 1 ? "for 1 år siden" : `for ${y} år siden`;
}

export function banText(bannedUntil: string | null | undefined) {
  return bannedUntil ? `til ${dkDateTime(bannedUntil)}` : "permanent";
}
