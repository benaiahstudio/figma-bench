import { detectErrorPage, openChrome } from "./chrome.mjs";
import { extractDom } from "./score/dom-extract.mjs";

// Loads the page at the given viewport and returns its text blocks and width figures.
// Throws if the browser landed on its own error page instead of the app.
export function chromeSnapshot(url, width, height, chromeOptions = {}) {
  const chrome = openChrome({ width, height, dpr: 1, ...chromeOptions });

  try {
    chrome.open(url);

    const snapshot = chrome.evaluate(`async () => { await document.fonts.ready; return (${extractDom.toString()})(); }`);
    const problem = detectErrorPage(snapshot.page ?? {});

    if (problem) throw new Error(`${url} did not load: ${problem}. Nothing was scored.`);

    return snapshot;
  } finally {
    chrome.close();
  }
}
