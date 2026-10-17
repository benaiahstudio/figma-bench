import assert from "node:assert/strict";
import test from "node:test";
import { detectErrorPage, openChrome, openPageId, parseCliJson } from "../src/chrome.mjs";

const pagesReply = (id) => JSON.stringify({ pages: [{ id, selected: true }] });

test("parseCliJson takes the first complete object and ignores notices around it", () => {
  const text = `Checking...\n${pagesReply(7)}\n\nUpdate available! 1.10.1 -> 1.11 {run npm i -g}\n{"other":1}`;

  assert.deepEqual(parseCliJson(text), { pages: [{ id: 7, selected: true }] });
  assert.deepEqual(parseCliJson('{"message":"a } b \\" { c"} tail }'), { message: 'a } b " { c' });
  assert.throws(() => parseCliJson("no json here"), /No JSON/);
  assert.throws(() => parseCliJson('{"a": 1'), /Incomplete/);
});

test("new_page is retried until a page list comes back", () => {
  const replies = ["{}", "boom", '{"pages":[]}', pagesReply(3)];
  const pauses = [];
  const cli = () => {
    const reply = replies.shift();

    if (reply === "boom") throw new Error("spawn failed");

    return reply;
  };

  assert.equal(openPageId(cli, { sleep: (ms) => pauses.push(ms) }), "3");
  assert.equal(pauses.length, 3);
  assert.ok(pauses[2] > pauses[0]);
});

test("openPageId gives up after the given number of tries", () => {
  let calls = 0;
  const cli = () => {
    calls++;

    return "{}";
  };

  assert.throws(() => openPageId(cli, { tries: 4, sleep: () => {} }), /after 4 tries/);
  assert.equal(calls, 4);
});

test("openChrome works through an injected CLI and reads evaluate results", () => {
  const seen = [];
  const cli = (args) => {
    seen.push(args[0]);

    if (args[0] === "new_page") return `${pagesReply(5)}\nUpdate available`;
    if (args[0] === "evaluate_script") return JSON.stringify({ message: 'Result\n```json\n{"ok":true}\n```' });

    return "{}";
  };
  const chrome = openChrome({ width: 390, height: 844, cli, sleep: () => {} });

  chrome.open("http://127.0.0.1:1/");
  assert.deepEqual(chrome.evaluate("() => 1"), { ok: true });
  assert.deepEqual(seen, ["new_page", "emulate", "navigate_page", "evaluate_script"]);
});

test("browser error pages are detected", () => {
  assert.match(detectErrorPage({ href: "chrome-error://chromewebdata/" }), /Chrome error page/);
  assert.match(detectErrorPage({ title: "127.0.0.1", text: "This site can't be reached\n127.0.0.1 refused to connect.\nERR_CONNECTION_REFUSED" }), /Chrome error page/);
  assert.match(detectErrorPage({ text: "ERR_CONNECTION_REFUSED" }), /ERR_CONNECTION_REFUSED/);
  assert.equal(detectErrorPage({ href: "http://127.0.0.1:4000/", title: "Shop", text: "Welcome to the shop" }), null);
});
