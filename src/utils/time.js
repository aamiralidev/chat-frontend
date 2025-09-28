// utils/time.js
export function formatMessageTime(
  unixTs,
  {
    units = "s",              // "s" (seconds) or "ms" (milliseconds)
    locale,                   // e.g. "en-US"; defaults to browser locale
    timeZone,                 // e.g. "Asia/Karachi"
    hour12 = true,            // true => "10:31 AM", false => "10:31"
    yesterdayLabel = "yesterday",
  } = {}
) {
  const n = Number(unixTs);
  if (!Number.isFinite(n)) return "";

  // Support seconds or ms; auto-detect large numbers as ms
  const ms = units === "ms" || Math.abs(n) > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";

  // Helper: get Y/M/D in the specified time zone
  const partsOf = (date) => {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(date);
    const getNum = (t) => Number(parts.find((p) => p.type === t)?.value);
    return { y: getNum("year"), m: getNum("month"), d: getNum("day") };
  };

  const now = new Date();
  const { y: ty, m: tm, d: td } = partsOf(d);
  const { y: ny, m: nm, d: nd } = partsOf(now);
  const { y: yy, m: ym, d: yd } = partsOf(new Date(now.getTime() - 86400000)); // ~yesterday

  const isToday = ty === ny && tm === nm && td === nd;
  const isYesterday = ty === yy && tm === ym && td === yd;

  if (isToday) {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12,
    }).format(d);
  }
  if (isYesterday) return yesterdayLabel;

  // Older than yesterday → M/D/YY (no leading zeros on M/D)
  const yy2 = String(ty).slice(-2);
  return `${tm}/${td}/${yy2}`;
}
