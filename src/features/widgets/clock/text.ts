export type ClockNames = { weekdays: readonly string[]; months: readonly string[] };

export type ClockLines = { weekday: string; date: string; time: string };

const two = (value: number) => String(value).padStart(2, "0");

/** The widget's three lines: "THURSDAY", "19 NOVEMBER, 2026." and "23:27", in capitals and 24-hour time. */
export function clockLines(now: Date, names: ClockNames): ClockLines {
  return {
    weekday: (names.weekdays[now.getDay()] ?? "").toUpperCase(),
    date: `${now.getDate()} ${(names.months[now.getMonth()] ?? "").toUpperCase()}, ${now.getFullYear()}.`,
    time: `${two(now.getHours())}:${two(now.getMinutes())}`,
  };
}

/** How long until the minute changes, plus a moment so the next read is safely past it. */
export function msUntilNextMinute(now: Date) {
  return 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50;
}
