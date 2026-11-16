const SERVER_URL = "http://127.0.0.1:3000/organize";
const MAX_TABS = 30;

const CATEGORY_COLORS = {
  Work: "blue",
  Research: "purple",
  Shopping: "yellow",
  Entertainment: "red",
  Other: "grey"
};

const button = document.getElementById("organize");
const status = document.getElementById("status");

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = kind;
}

async function organizeTabs() {
  button.disabled = true;
  setStatus("Reading tabs...");

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const candidates = tabs
      .filter((tab) => tab.groupId === -1 && !tab.pinned && tab.id != null && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://") && !tab.url.startsWith("edge://"))
      .slice(0, MAX_TABS)
      .map(({ id, title, url }) => ({ id, title: title || "(untitled)", url }));

    if (!candidates.length) throw new Error("No eligible ungrouped tabs found.");
    setStatus(`Classifying ${candidates.length} tab${candidates.length === 1 ? "" : "s"} with Ollama...`);

    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabs: candidates })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Server returned ${response.status}.`);

    const expectedIds = new Set(candidates.map((tab) => tab.id));
    const assignments = payload.assignments;
    if (!Array.isArray(assignments) || assignments.length !== candidates.length) {
      throw new Error("The server returned an incomplete classification.");
    }

    const groups = new Map();
    for (const item of assignments) {
      if (!expectedIds.has(item.id) || !CATEGORY_COLORS[item.category]) throw new Error("The server returned an invalid tab assignment.");
      if (groups.has(item.category)) groups.get(item.category).push(item.id);
      else groups.set(item.category, [item.id]);
    }

    for (const [category, tabIds] of groups) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, { title: category, color: CATEGORY_COLORS[category] });
    }
    setStatus(`Organized ${candidates.length} tabs.`, "success");
  } catch (error) {
    setStatus(error.message || "Something went wrong.", "error");
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", organizeTabs);
