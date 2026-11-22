import assert from "node:assert/strict";
import test from "node:test";
import { formatMessageCardTime, splitMessageSender } from "../../src/features/messages/messageCardText.ts";
import { en } from "../../src/i18n/sections/messages.ts";

const date = (year, month, day, hour = 14, minute = 5) => new Date(year, month - 1, day, hour, minute).getTime();
test("today, yesterday and older notifications use 24-hour local dates", () => {
  const now = date(2026, 11, 12, 20);
  assert.equal(formatMessageCardTime(date(2026, 11, 12), now, en.yesterday), "14:05");
  assert.equal(formatMessageCardTime(date(2026, 11, 11), now, en.yesterday), `${en.yesterday} 14:05`);
  assert.equal(formatMessageCardTime(date(2026, 11, 10), now, en.yesterday), "11/10 14:05");
  assert.equal(formatMessageCardTime(date(2026, 12, 31, 0, 0), date(2027, 1, 1), en.yesterday), `${en.yesterday} 00:00`);
  assert.equal(formatMessageCardTime(date(2026, 3, 8, 0, 5), date(2026, 3, 9, 0, 1), en.yesterday), `${en.yesterday} 00:05`);
  assert.equal(formatMessageCardTime(NaN, now, en.yesterday), "");
});

test("splits the first full-width or ASCII colon and preserves the original text", () => {
  for (const body of ["Sender\uFF1APlease see attachment", "Alice: please see https://example.com", " Bob \uFF1A Content: preserved colon", `${"A".repeat(24)}:content`]) {
    const result = splitMessageSender(body);
    assert.ok(result);
    assert.equal(result.sender + result.separator + result.content, body);
  }
  assert.equal(splitMessageSender("Sender\uFF1APlease see attachment").sender, "Sender");
  assert.equal(splitMessageSender("Alice: hello").sender, "Alice");
});

test("ambiguous prefixes stay unmodified", () => {
  for (const body of ["Plain message", "", ":hello", " :hello", "Alice: ", `${"A".repeat(25)}:hello`, "line\nbreak:hello", "https://example.com", "14:05", "Really? yes"]) {
    assert.equal(splitMessageSender(body), null, body);
  }
});
