const statusEl = document.getElementById("status");
const originEl = document.getElementById("origin");
const listEl = document.getElementById("listId");

chrome.storage.local.get(["origin", "listId"], (data) => {
  if (data.origin) originEl.value = data.origin;
  if (data.listId) listEl.value = data.listId;
});

document.getElementById("save").addEventListener("click", async () => {
  const origin = originEl.value.replace(/\/$/, "");
  const listId = listEl.value.trim();
  chrome.storage.local.set({ origin, listId });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    statusEl.textContent = "No active tab";
    return;
  }
  const profile = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PROFILE" });
  const res = await fetch(`${origin}/api/lists/${listId}/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(profile),
  });
  statusEl.textContent = res.ok ? "Saved" : `Failed: ${await res.text()}`;
});
