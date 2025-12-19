// ui.js
// Depends on: CGPTStore, CGPTComposer, CGPTCsv
(() => {
  const ID = "cgpt-prompt-float";

  if (document.getElementById(ID)) return;

  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  const esc = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const state = {
    prompts: [],
    minimized: false,
    pos: { right: 16, bottom: 16 },
    editingId: null // ★追加: 編集中のid（nullなら新規）
  };

  let root, header, listEl, toastEl, titleEl, textEl, addBtn, cancelBtn;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => (toastEl.style.opacity = "0"), 1200);
  }

  function applyPosition() {
    root.style.right = `${state.pos.right}px`;
    root.style.bottom = `${state.pos.bottom}px`;
  }

  async function persist() {
    await window.CGPTStore.save(state);
  }

  function setMinimized(min) {
    state.minimized = !!min;
    root.classList.toggle("min", state.minimized);
    persist();
  }

  function setEditMode(idOrNull) {
    state.editingId = idOrNull;

    const isEditing = !!state.editingId;

    // 保存ボタンの文言変更
    addBtn.textContent = isEditing ? "更新" : "保存";

    // ★編集取消は編集時だけ表示
    if (cancelBtn) cancelBtn.style.display = isEditing ? "inline-block" : "none";

    persist();
  }


  function renderList() {
    if (!state.prompts.length) {
      listEl.innerHTML = `<div class="empty">まだ保存がありません</div>`;
      return;
    }

    listEl.innerHTML = state.prompts
      .slice()
      .reverse()
      .map(
        (p) => `
          <div class="item" data-id="${p.id}">
            <div class="itemTop">
              <div class="itemTitle">${esc(p.title || "Untitled")}</div>
              <div class="btnRow">
                <button class="btn use" title="入力欄に貼る">貼る</button>
                <button class="btn copy" title="コピー">Copy</button>
                <button class="btn edit" title="編集">Edit</button> <!-- ★追加 -->
                <button class="btn del" title="削除">Del</button>
              </div>
            </div>
          </div>
        `
      )
      .join("");
  }

  async function doExportCsv() {
    if (!state.prompts.length) return toast("No prompts to export");

    const csv = window.CGPTCsv.toCsv(state.prompts);
    const bom = "\uFEFF"; // Excel/日本語対策
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `prompts_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast("CSV exported");
  }

  async function doImportCsv() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      const text = await file.text();

      const existingIds = new Set(state.prompts.map((p) => p.id));
      const { added, skipped, prompts } = window.CGPTCsv.importCsv(text, {
        uid,
        now: () => Date.now(),
        existingIds
      });

      if (!added) {
        toast(skipped ? "No new rows (duplicates/empty)" : "No rows imported");
        return;
      }

      state.prompts.push(...prompts);
      await persist();
      renderList();
      toast(`Imported ${added}`);
    });

    input.click();
  }

  function buildUI() {
    root = document.createElement("div");
    root.id = ID;
    root.innerHTML = `
      <div class="wrap">
        <div class="head" title="ドラッグで移動">
          <div class="title">Prompts</div>
          <div>
            <button class="hbtn" data-act="min" title="最小化">_</button>
            <button class="hbtn" data-act="close" title="閉じる">×</button>
          </div>
        </div>

        <div class="body">
          <div class="box">
            <input class="inTitle" type="text" placeholder="タイトル（任意）" />
            <textarea class="inText" rows="4" placeholder="保存したいプロンプト"></textarea>
            <div class="rowBtns">
              <button class="btn primary" data-act="add">保存</button>
              <button class="btn" data-act="cancelEdit">編集取消</button> <!-- ★追加 -->
              <button class="btn" data-act="import">CSV import</button>
              <button class="btn" data-act="export">CSV export</button>
            </div>
          </div>

          <div class="list" aria-label="saved prompts"></div>
        </div>

        <div class="toast" aria-live="polite"></div>
      </div>
    `;

    document.documentElement.appendChild(root);

    header = root.querySelector(".head");
    listEl = root.querySelector(".list");
    toastEl = root.querySelector(".toast");
    titleEl = root.querySelector(".inTitle");
    textEl = root.querySelector(".inText");
    addBtn = root.querySelector('[data-act="add"]');
    cancelBtn = root.querySelector('[data-act="cancelEdit"]');

    applyPosition();
    renderList();
    setMinimized(state.minimized);
    setEditMode(state.editingId); 
    // 復元：編集モードだった場合（任意）
    if (state.editingId) addBtn.textContent = "更新";

    // click actions
    root.addEventListener("click", async (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      const act = t.getAttribute("data-act");
      if (act === "min") return setMinimized(!state.minimized);
      if (act === "close") return root.remove();

      if (act === "cancelEdit") {
        setEditMode(null);
        titleEl.value = "";
        textEl.value = "";
        addBtn.textContent = "保存";
        toast("編集を取り消しました");
        return;
      }

      if (act === "add") {
        const title = titleEl.value.trim();
        const text = textEl.value.trim();
        if (!text) return toast("本文が空です");

        // ★編集モードなら更新、そうでなければ新規
        if (state.editingId) {
          const idx = state.prompts.findIndex((x) => x.id === state.editingId);
          if (idx === -1) {
            // 何らかで消えてたら新規扱い
            state.prompts.push({ id: uid(), title, text, createdAt: Date.now() });
          } else {
            state.prompts[idx] = {
              ...state.prompts[idx],
              title,
              text,
              // createdAtは保持したいならそのまま。更新日時が欲しければ updatedAt を追加すると良い
            };
          }
          setEditMode(null);
          addBtn.textContent = "保存";
          toast("更新しました");
        } else {
          state.prompts.push({ id: uid(), title, text, createdAt: Date.now() });
          toast("保存しました");
        }

        titleEl.value = "";
        textEl.value = "";

        await persist();
        renderList();
        return;
      }

      if (act === "export") return doExportCsv();
      if (act === "import") return doImportCsv();

      // item buttons
      const btn = t.closest("button");
      const item = t.closest(".item");
      if (!btn || !item) return;

      const id = item.getAttribute("data-id");
      const p = state.prompts.find((x) => x.id === id);
      if (!p) return;

      if (btn.classList.contains("use")) {
        return toast(window.CGPTComposer.setText(p.text) ? "貼り付けました" : "入力欄が見つかりません");
      }

      if (btn.classList.contains("copy")) {
        try {
          await navigator.clipboard.writeText(p.text);
          toast("コピーしました");
        } catch {
          toast("コピー失敗");
        }
        return;
      }

      if (btn.classList.contains("edit")) {
        // ★編集開始：入力欄に反映して編集モードへ
        titleEl.value = p.title || "";
        textEl.value = p.text || "";
        setEditMode(p.id);
        addBtn.textContent = "更新";
        return;
      }

      if (btn.classList.contains("del")) {
        state.prompts = state.prompts.filter((x) => x.id !== id);

        // 編集中のものを消したら編集モード解除
        if (state.editingId === id) {
          setEditMode(null);
          titleEl.value = "";
          textEl.value = "";
          addBtn.textContent = "保存";
        }

        await persist();
        renderList();
        toast("削除しました");
        return;
      }
    });

    // drag move (right/bottom anchor)
    let dragging = false;
    let startX = 0, startY = 0;
    let startRight = 0, startBottom = 0;

    header.addEventListener("mousedown", (e) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("button")) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startRight = state.pos.right;
      startBottom = state.pos.bottom;

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    function onMove(e) {
      if (!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      state.pos.right = Math.max(0, startRight - dx);
      state.pos.bottom = Math.max(0, startBottom - dy);

      applyPosition();
    }

    async function onUp() {
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      await persist();
      toast("位置を保存しました");
    }

    // keyboard: Ctrl+Shift+L
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
        setMinimized(!state.minimized);
      }
    });
  }

  async function init() {
    const loaded = await window.CGPTStore.load();
    state.prompts = loaded.prompts || [];
    state.minimized = !!loaded.minimized;
    state.pos = loaded.pos || state.pos;
    state.editingId = loaded.editingId ?? null; // ★追加（保存されてないならnull）

    buildUI();
  }

  window.CGPTPromptUI = { init };
})();
