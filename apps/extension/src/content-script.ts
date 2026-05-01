function readPageContext() {
  const media = document.querySelector<HTMLMediaElement>("video, audio");
  const selection = window.getSelection()?.toString() ?? "";

  return {
    source_url: window.location.href,
    title: document.title,
    selection_text: selection.trim(),
    media: media
      ? {
          current_time: media.currentTime,
          duration: Number.isFinite(media.duration) ? media.duration : undefined,
          kind: media.tagName.toLowerCase() === "audio" ? "audio" : "video"
        }
      : undefined
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ANNOTATED_READ_CONTEXT") {
    sendResponse(readPageContext());
  }
});
