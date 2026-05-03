import { cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { afterEach } from "vitest";

declare global {
  // eslint-disable-next-line no-var
  var __domTestSetupReady__: boolean | undefined;
}

if (!globalThis.__domTestSetupReady__) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  const { window } = dom;

  Object.defineProperties(globalThis, {
    window: { value: window, configurable: true, writable: true },
    document: { value: window.document, configurable: true, writable: true },
    navigator: { value: window.navigator, configurable: true, writable: true },
    HTMLElement: { value: window.HTMLElement, configurable: true, writable: true },
    HTMLAnchorElement: { value: window.HTMLAnchorElement, configurable: true, writable: true },
    HTMLInputElement: { value: window.HTMLInputElement, configurable: true, writable: true },
    Node: { value: window.Node, configurable: true, writable: true },
    Text: { value: window.Text, configurable: true, writable: true },
    Event: { value: window.Event, configurable: true, writable: true },
    MouseEvent: { value: window.MouseEvent, configurable: true, writable: true },
    KeyboardEvent: { value: window.KeyboardEvent, configurable: true, writable: true },
    CustomEvent: { value: window.CustomEvent, configurable: true, writable: true },
    getComputedStyle: { value: window.getComputedStyle, configurable: true, writable: true },
  });

  // React's input polyfill may probe these IE-era APIs.
  const htmlElementPrototype = window.HTMLElement.prototype as HTMLElement & {
    attachEvent?: () => void;
    detachEvent?: () => void;
  };
  if (!htmlElementPrototype.attachEvent) {
    htmlElementPrototype.attachEvent = () => {};
  }
  if (!htmlElementPrototype.detachEvent) {
    htmlElementPrototype.detachEvent = () => {};
  }

  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 0) as unknown as number;
  }
  if (!globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
  if (!window.matchMedia) {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
      }) as MediaQueryList;
  }

  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  globalThis.__domTestSetupReady__ = true;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});
