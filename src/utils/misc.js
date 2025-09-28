// Stable HSL color from any string (same input => same color)
export function stringToColor(str, s = 70, l = 50) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // simple deterministic hash
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // force 32-bit
  }
  const hue = Math.abs(hash) % 360; // 0..359
  return `hsl(${hue}, ${s}%, ${l}%)`;
}

// Two-letter initials (e.g., "John Doe" -> "JD")
export function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2) || "?";
}