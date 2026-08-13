// ============================================================
// popup.js — 开关面板 + 自定义代理，消息路径：popup → background
// ============================================================

const DEFAULT_PROXY = "https://v6.gh-proxy.org";

const toggleEl   = document.getElementById("toggle");
const dotEl      = document.getElementById("dot");
const proxyInput = document.getElementById("proxy-input");
const saveBtn    = document.getElementById("save-btn");

// 初始化：读取开关状态 + 代理地址
chrome.storage.local.get(["enabled", "proxyUrl"]).then(({ enabled, proxyUrl }) => {
  render(enabled ?? true);
  proxyInput.value = proxyUrl || DEFAULT_PROXY;
});

toggleEl.addEventListener("click", () => {
  const next = !toggleEl.classList.contains("on");
  chrome.runtime.sendMessage({ type: "toggle", enabled: next }, (res) => {
    if (res?.success) render(next);
  });
});

saveBtn.addEventListener("click", () => {
  const value = proxyInput.value.trim();
  if (!value) {
    proxyInput.value = DEFAULT_PROXY;
    return;
  }
  chrome.runtime.sendMessage({ type: "setProxy", proxyUrl: value }, (res) => {
    if (res?.success) proxyInput.value = res.proxyUrl || value;
  });
});

const render = (on) => {
  toggleEl.classList.toggle("on", on);
  dotEl.classList.toggle("off", !on);
};