import { openChrome } from "./chrome.mjs";
import { extractDom } from "./score/dom-extract.mjs";

// Loads the page at the given viewport and returns its text blocks and width figures.
export function chromeSnapshot(url, width, height) {
  const chrome = openChrome({ width, height, dpr: 1 });

  try {
    chrome.open(url);

    return chrome.evaluate(`async () => { await document.fonts.ready; return (${extractDom.toString()})(); }`);
  } finally {
    chrome.close();
  }
}
