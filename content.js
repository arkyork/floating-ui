(() => {
  if (window.__cgptPromptFloatStarted) return;
  window.__cgptPromptFloatStarted = true;

  const start = () => window.CGPTPromptUI?.init?.();

  if (document.readyState === "complete" || document.readyState === "interactive") start();
  else window.addEventListener("DOMContentLoaded", start, { once: true });
})();
