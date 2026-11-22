import assert from "node:assert/strict";
import test from "node:test";
import { latestMessagePreview, messageBadgeCount, messagePreviewText } from "../../src/features/messages/messagePreview.ts";

test("collapsed previews format app, title and body cleanly", () => {
  assert.equal(
    messagePreviewText({ id: "1", appId: "WhatsApp", appDisplayName: "WhatsApp", title: "Alice", body: "See you later", timestamp: 100, receivedAt: 100 }),
    "WhatsApp · Alice: See you later"
  );
  assert.equal(
    messagePreviewText({ id: "2", appId: "Telegram", appDisplayName: "Telegram", title: "Bob", body: "", timestamp: 200, receivedAt: 200 }),
    "Telegram · Bob"
  );
});

test("previews share the island by most recent arrival", () => {
  const n1 = { id: "1", appId: "WhatsApp", appDisplayName: "WhatsApp", title: "Alice", body: "Hello", timestamp: 100, receivedAt: 100 };
  const n2 = { id: "2", appId: "Telegram", appDisplayName: "Telegram", title: "Bob", body: "Hey", timestamp: 200, receivedAt: 200 };
  const n3 = { id: "3", appId: "Outlook", appDisplayName: "Outlook", title: "Work", body: "Meeting", timestamp: 300, receivedAt: 300 };

  assert.equal(latestMessagePreview([n1, n2, n3]), n3);
  assert.equal(latestMessagePreview([n3, { ...n1, receivedAt: 400 }, n2]).appId, "WhatsApp");
  assert.equal(latestMessagePreview([null, n1, null]), n1);
  assert.equal(latestMessagePreview([null, null, null]), null);
});

test("notification badges bound the width without changing count", () => {
  assert.equal(messageBadgeCount(0), "0");
  assert.equal(messageBadgeCount(99), "99");
  assert.equal(messageBadgeCount(100), "99+");
  assert.equal(messageBadgeCount(12345), "99+");
});

test("an expired newer notification never reveals an older notification again", () => {
  const older = { id: "1", appId: "WhatsApp", appDisplayName: "WhatsApp", title: "Alice", body: "1", timestamp: 100, receivedAt: 100 };
  const newer = { id: "2", appId: "Telegram", appDisplayName: "Telegram", title: "Bob", body: "2", timestamp: 200, receivedAt: 200 };
  assert.equal(latestMessagePreview([older, newer], 200), newer);
  assert.equal(latestMessagePreview([older, null], 200), null);
  assert.equal(latestMessagePreview([{ ...older, receivedAt: 300 }, null], 200).appId, "WhatsApp");
});
