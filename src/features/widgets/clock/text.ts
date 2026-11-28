export type ClockNames = { weekdays: readonly string[]; months: readonly string[] };

export type ClockLines = { weekday: string; date: string; time: string };

const two = (value: number) => String(value).padStart(2, "0");

/** The widget's three lines: "THURSDAY", "19 NOVEMBER, 2026." and "11:27 PM", in capitals and 12-hour time. */
export function clockLines(now: Date, names: ClockNames): ClockLines {
  return {
    weekday: (names.weekdays[now.getDay()] ?? "").toUpperCase(),
    date: `${now.getDate()} ${(names.months[now.getMonth()] ?? "").toUpperCase()}, ${now.getFullYear()}.`,
    // Midnight and noon read as 12.
    time: `${two(now.getHours() % 12 || 12)}:${two(now.getMinutes())} ${now.getHours() < 12 ? "AM" : "PM"}`,
  };
}

/** How long until the minute changes, plus a moment so the next read is safely past it. */
export function msUntilNextMinute(now: Date) {
  return 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50;
}
