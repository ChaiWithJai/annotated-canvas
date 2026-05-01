chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

  chrome.contextMenus.create({
    id: "annotated-capture-selection",
    title: "Annotate selected text",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "annotated-capture-selection" || !tab?.id) return;

  chrome.storage.local.set({
    pendingCapture: {
      capture_method: "selection",
      selection_text: info.selectionText,
      source_url: tab.url,
      title: tab.title,
      tab_id: String(tab.id)
    }
  });

  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
  }
});
