// ============================================================
// content.js — 三层拦截：捕获 click > MutationObserver > DNR
// ============================================================

const PROXY_RULES = [
  { host: "github.com",                           pathPattern: /^\/[^/]+\/[^/]+\/releases\/download\// },
  { host: "github.com",                           pathPattern: /^\/[^/]+\/[^/]+\/archive\// },
  { host: "raw.githubusercontent.com",            pathPattern: /^\// },
  { host: "codeload.github.com",                  pathPattern: /^\// },
  { host: "release-assets.githubusercontent.com",  pathPattern: /^\// },
  { host: "objects.githubusercontent.com",        pathPattern: /^\// },
];

// ------------------------------------------------------------------
// 纯函数
// ------------------------------------------------------------------

const isGithubDownloadUrl = (url) => {
  if (!url) return false;
  let u;
  try { u = new URL(url, location.origin); } catch { return false; }
  if (u.hostname === "v6.gh-proxy.com") return false;
  return PROXY_RULES.some((r) => u.hostname === r.host && r.pathPattern.test(u.pathname));
};

const toProxyUrl = (url) => {
  const absolute = new URL(url, location.origin).href;
  return `https://v6.gh-proxy.com/${absolute}`;
};

// ------------------------------------------------------------------
// 第一层：捕获阶段 click / auxclick，在 IDM 之前拦截
// ------------------------------------------------------------------

const handleClick = (e) => {
  const a = e.target.closest("a[href]");
  if (!a) return;

  const href = a.getAttribute("href");
  if (!isGithubDownloadUrl(href)) return;

  a.dataset.ghProxyDone = "1";
  e.preventDefault();
  e.stopImmediatePropagation();

  const proxy = toProxyUrl(href);
  const newTab = e.type === "auxclick" || e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey;

  if (newTab) window.open(proxy, "_blank");
  else        window.location.href = proxy;
};

document.addEventListener("click",    handleClick, true);
document.addEventListener("auxclick",  handleClick, true);

// ------------------------------------------------------------------
// 第二层：MutationObserver — DOM 出现新链接时改写 href
// ------------------------------------------------------------------

let observer = null;

const tryReplace = (a) => {
  const href = a.getAttribute("href");
  if (!isGithubDownloadUrl(href)) return false;
  a.setAttribute("href", toProxyUrl(href));
  a.dataset.ghProxyDone = "1";
  return true;
};

const scan = () =>
  document.querySelectorAll("a[href]:not([data-gh-proxy-done])").forEach(tryReplace);

const startObserving = () => {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.tagName === "A" && node.hasAttribute("href")) tryReplace(node);
        node.querySelectorAll?.("a[href]:not([data-gh-proxy-done])").forEach(tryReplace);
      }
    }
  });
  // document_start 时 body 为 null，用 documentElement
  const root = document.body || document.documentElement;
  observer.observe(root, { childList: true, subtree: true });
};

const stopObserving = () => { observer?.disconnect(); observer = null; };

// ------------------------------------------------------------------
// 存储驱动的开关
// ------------------------------------------------------------------

let enabled = true;

const apply = (on) => {
  enabled = on;
  if (on) {
    if (document.body) scan();
    else document.addEventListener("DOMContentLoaded", scan, { once: true });
    startObserving();
  } else {
    stopObserving();
  }
};

chrome.storage.local.get("enabled").then(({ enabled: v }) => apply(v ?? true));
chrome.storage.onChanged.addListener((c) => { if ("enabled" in c) apply(c.enabled.newValue); });