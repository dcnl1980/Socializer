function scrapeProfile() {
  const url = location.href.split("?")[0];
  const h1 = document.querySelector("h1");
  const name = h1?.textContent?.trim() ?? "";
  const [firstName, ...rest] = name.split(/\s+/);
  const lastName = rest.join(" ");
  const title =
    document.querySelector(".text-body-medium")?.textContent?.trim() ?? "";
  return {
    linkedinUrl: url,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    title: title || undefined,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SCRAPE_PROFILE") {
    sendResponse(scrapeProfile());
  }
  return true;
});
