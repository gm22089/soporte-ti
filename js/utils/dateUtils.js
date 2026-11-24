export function getLocalDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function buildLocalTimestamp(dateStr, timeStr) {
  if (!dateStr || !timeStr) return Date.now();
  const [year, month, day] = dateStr.split("-").map(Number);
  const parts = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, parts[0] || 0, parts[1] || 0, parts[2] || 0).getTime();
}

export function formatReadableDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-SV", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function formatDurationMinutes(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "—";
  const mins = Math.max(0, Math.round(minutes));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}