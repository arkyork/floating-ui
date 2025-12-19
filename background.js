chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "EXPORT_CSV") return;

  const filename = msg.filename || `chatgpt-prompts-${Date.now()}.csv`;
  const csv = msg.csv ?? "";

  // Excel対策: UTF-8 BOM を付ける（日本語が文字化けしにくい）
  const withBom = "\uFEFF" + csv;

  const url = "data:text/csv;charset=utf-8," + encodeURIComponent(withBom);

  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: true
    },
    (downloadId) => {
      sendResponse({ ok: !!downloadId });
    }
  );

  return true; // async response
});
