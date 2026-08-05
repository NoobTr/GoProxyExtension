// ============================================================
// popup.js — 开关面板，消息路径：popup → background → storage → content
// ============================================================

const toggleEl = document.getElementById("toggle");
const dotEl   = document.getElementById("dot");

chrome.storage.local.get("enabled").then(({ enabled }) => render(enabled ?? true));

toggleEl.addEventListener("click", () => {
  const next = !toggleEl.classList.contains("on");
  chrome.runtime.sendMessage({ type: "toggle", enabled: next }, (res) => {
    if (res?.success) render(next);
  });
});

const render = (on) => {
  toggleEl.classList.toggle("on", on);
  dotEl.classList.toggle("off", !on);
};