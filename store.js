(() => {
  const KEY = "cgpt_prompt_float_state_v1";

  const DEFAULT_STATE = () => ({
    prompts: [],
    minimized: false,
    pos: { right: 16, bottom: 16 }
  });

  // 旧キーから移行（あなたが使ってた配列保存）
  const LEGACY_KEY = "cgpt_prompts_v1";

  function sanitizeState(raw) {
    const s = DEFAULT_STATE();
    if (!raw || typeof raw !== "object") return s;

    if (Array.isArray(raw.prompts)) s.prompts = raw.prompts;
    if (typeof raw.minimized === "boolean") s.minimized = raw.minimized;

    if (raw.pos && typeof raw.pos === "object") {
      const r = Number(raw.pos.right);
      const b = Number(raw.pos.bottom);
      if (Number.isFinite(r)) s.pos.right = Math.max(0, r);
      if (Number.isFinite(b)) s.pos.bottom = Math.max(0, b);
    }
    return s;
  }

  async function load() {
    const data = await chrome.storage.local.get([KEY, LEGACY_KEY]);
    const cur = data?.[KEY];
    if (cur) return sanitizeState(cur);

    // legacy migration
    const legacy = data?.[LEGACY_KEY];
    if (Array.isArray(legacy)) {
      const migrated = DEFAULT_STATE();
      migrated.prompts = legacy;
      await chrome.storage.local.set({ [KEY]: migrated });
      return migrated;
    }

    const fresh = DEFAULT_STATE();
    await chrome.storage.local.set({ [KEY]: fresh });
    return fresh;
  }

  async function save(state) {
    const s = sanitizeState(state);
    await chrome.storage.local.set({ [KEY]: s });
  }

  window.CGPTStore = { load, save };
})();
