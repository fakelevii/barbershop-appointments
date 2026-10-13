const TIME_ZONE = 'Asia/Manila';
const START_INTERVAL = 15;

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid date');
  const parsed = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Invalid date');
  return parsed;
}

function timeMinutes(value) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid time');
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function interval(value) {
  const start = timeMinutes(value.start), end = timeMinutes(value.end);
  if (start >= end) throw new Error('Invalid interval');
  return { start, end };
}

function bookingInstant(date, time) {
  parseDate(date);
  timeMinutes(time);
  return new Date(date + 'T' + time + ':00+08:00');
}

function availableStarts({
  date, durationMinutes, now = new Date(), busy = [], blocked = [],
  workingHours = { start: '09:00', end: '18:00' }, closed = false
}) {
  const day = parseDate(date);
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes % START_INTERVAL !== 0) {
    throw new Error('Duration must be a positive multiple of 15 minutes');
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid current date');
  const hours = interval(workingHours);
  const unavailable = [
    interval({ start: '12:00', end: '13:00' }),
    ...busy.map(interval), ...blocked.map(interval)
  ];
  if (closed || day.getUTCDay() === 0) return [];
  const starts = [];
  for (let start = Math.ceil(hours.start / START_INTERVAL) * START_INTERVAL; start + durationMinutes <= hours.end; start += START_INTERVAL) {
    const end = start + durationMinutes;
    if (unavailable.some(period => start < period.end && end > period.start)) continue;
    const time = String(Math.floor(start / 60)).padStart(2, '0') + ':' + String(start % 60).padStart(2, '0');
    if (bookingInstant(date, time) <= now) continue;
    starts.push(time);
  }
  return starts;
}

module.exports = { TIME_ZONE, START_INTERVAL, availableStarts, bookingInstant, parseDate, timeMinutes };
