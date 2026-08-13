// ============================================================
// background.js — Service Worker：动态 DNR 规则 + 自定义代理
// ============================================================

const DEFAULT_PROXY = "https://v6.gh-proxy.org";

// 与 content.js 保持一致的匹配规则（6 个域名/路径）
const RULE_PATTERNS = [
  "^https?://github\\.com/[^/]+/[^/]+/releases/download/.*",
  "^https?://github\\.com/[^/]+/[^/]+/archive/.*",
  "^https?://raw\\.githubusercontent\\.com/.*",
  "^https?://codeload\\.github\\.com/.*",
  "^https?://release-assets\\.githubusercontent\\.com/.*",
  "^https?://objects\\.githubusercontent\\.com/.*",
];

// 校验并规范化代理地址，返回 origin（如 https://v6.gh-proxy.org）
const normalizeProxy = (raw) => {
  try {
    const u = new URL(String(raw).trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return DEFAULT_PROXY;
    return u.origin;
  } catch {
    return DEFAULT_PROXY;
  }
};

// 根据代理地址生成动态 DNR 规则
const buildRules = (proxyBase) =>
  RULE_PATTERNS.map((pattern, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { regexSubstitution: `${proxyBase}/\\0` },
    },
    condition: {
      regexFilter: pattern,
      resourceTypes: ["main_frame", "sub_frame"],
    },
  }));

// 应用规则：enabled 为 false 时清空动态规则
const applyRules = async (proxyBase, enabled) => {
  const ids = RULE_PATTERNS.map((_, i) => i + 1);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ids,
    addRules: enabled ? buildRules(proxyBase) : [],
  });
};

// 启动时同步 storage 状态
chrome.storage.local.get(["enabled", "proxyUrl"]).then(({ enabled, proxyUrl }) =>
  applyRules(normalizeProxy(proxyUrl), enabled ?? true)
);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // 开关切换
  if (msg.type === "toggle") {
    chrome.storage.local.get("proxyUrl").then(({ proxyUrl }) =>
      chrome.storage.local.set({ enabled: msg.enabled }).then(() => {
        applyRules(normalizeProxy(proxyUrl), msg.enabled);
        sendResponse({ success: true });
      })
    );
    return true; // 异步响应
  }

  // 自定义代理地址
  if (msg.type === "setProxy") {
    const base = normalizeProxy(msg.proxyUrl);
    chrome.storage.local.set({ proxyUrl: base }).then(() =>
      chrome.storage.local.get("enabled").then(({ enabled }) => {
        applyRules(base, enabled ?? true);
        sendResponse({ success: true, proxyUrl: base });
      })
    );
    return true;
  }
});