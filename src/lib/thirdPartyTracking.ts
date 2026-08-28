/**
 * Third-party tags (GA4, Google Ads, Meta Pixel, Clarity).
 *
 * Stubs queue events immediately so React/gtag calls are not lost.
 * Network scripts load after first paint (GA/Ads/Pixel) or on idle (Clarity).
 * Each provider is injected at most once.
 */

const GA4_ID = "G-9BZPGSKKYE";
const ADS_ID = "AW-16608374468";
const ADS_CONVERSION = "AW-16608374468/EtKvCIHcoegcEMTdvu89";
const PIXEL_ID = "618460890635684";
const CLARITY_ID = "y8xb26d5ve";

const SCRIPT_GTAG = "niat-gtag";
const SCRIPT_PIXEL = "niat-pixel";
const SCRIPT_CLARITY = "niat-clarity";

let scheduled = false;
let gtagQueued = false;
let pixelQueued = false;

type PixelFn = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  push: PixelFn;
};

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    fbq?: PixelFn;
    _fbq?: PixelFn;
    clarity?: ClarityFn;
  }
}

function afterFirstPaint(cb: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(cb);
  });
}

function whenIdle(cb: () => void) {
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric(() => cb(), { timeout: 2500 });
  } else {
    window.setTimeout(cb, 0);
  }
}

function injectScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.async = true;
  el.src = src;
  el.onerror = () => undefined;
  document.head.appendChild(el);
}

function installGtagStub() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === "function") return;
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
}

function queueGtagBootstrap() {
  if (gtagQueued) return;
  gtagQueued = true;
  const gtag = window.gtag!;
  gtag("js", new Date());
  gtag("config", GA4_ID);
  gtag("config", ADS_ID);
  if (!window.location.pathname.startsWith("/admin")) {
    gtag("event", "conversion", {
      send_to: ADS_CONVERSION,
      value: 1.0,
      currency: "INR",
    });
  }
}

function installPixelStub() {
  if (typeof window.fbq === "function") return;
  const fbq = function () {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, arguments as unknown as []);
    } else {
      fbq.queue.push(arguments);
    }
  } as PixelFn;
  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
}

function queuePixelBootstrap() {
  if (pixelQueued) return;
  pixelQueued = true;
  window.fbq!("init", PIXEL_ID);
  window.fbq!("track", "PageView");
}

function loadGtag() {
  injectScript(SCRIPT_GTAG, `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);
}

function loadPixel() {
  injectScript(SCRIPT_PIXEL, "https://connect.facebook.net/en_US/fbevents.js");
}

function loadClarity() {
  if (document.getElementById(SCRIPT_CLARITY)) return;
  window.clarity =
    window.clarity ||
    function () {
      const fn = window.clarity as ClarityFn;
      fn.q = fn.q || [];
      fn.q.push(arguments);
    };
  injectScript(SCRIPT_CLARITY, `https://www.clarity.ms/tag/${CLARITY_ID}`);
}

/** Install stubs, queue bootstrap events, then fetch vendor scripts off the critical path. */
export function scheduleThirdPartyTracking() {
  if (scheduled) return;
  scheduled = true;

  installGtagStub();
  queueGtagBootstrap();
  installPixelStub();
  queuePixelBootstrap();

  afterFirstPaint(() => {
    loadGtag();
    loadPixel();
  });
  whenIdle(() => {
    loadClarity();
  });
}
