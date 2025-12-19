(() => {
  function find() {
    const ta = document.querySelector("textarea");
    if (ta) return { type: "textarea", el: ta };

    const ce = document.querySelector('div[contenteditable="true"]');
    if (ce) return { type: "contenteditable", el: ce };

    return null;
  }

  function getText() {
    const t = find();
    if (!t) return "";
    return t.type === "textarea" ? (t.el.value || "") : (t.el.innerText || "");
  }

  function setText(text) {
    const t = find();
    if (!t) return false;

    t.el.focus();
    if (t.type === "textarea") {
      t.el.value = text;
      t.el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      t.el.innerText = text;
      t.el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  }

  window.CGPTComposer = { find, getText, setText };
})();
