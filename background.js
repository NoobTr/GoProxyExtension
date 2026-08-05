// ============================================================
// background.js — Service Worker：接收 popup 消息，切换 DNR 规则集
// ============================================================

const RULESET_ID = "github_proxy_rules";

const toggleRules = (on) =>
  chrome.declarativeNetRequest.updateEnabledRulesets(
    on ? { enableRulesetIds: [RULESET_ID] } : { disableRulesetIds: [RULESET_ID] }
  );

chrome.storage.local.get("enabled").then(({ enabled }) => toggleRules(enabled ?? true));

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "toggle") return;
  chrome.storage.local.set({ enabled: msg.enabled }).then(() => {
    toggleRules(msg.enabled);
    sendResponse({ success: true });
  });
  return true; // 异步响应
});