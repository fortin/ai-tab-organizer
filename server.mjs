import express from "express";

const app = express();
const port = Number(process.env.PORT || 3000);
const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL || "qwen3:8b";
const categories = ["Work", "Research", "Shopping", "Entertainment", "Other"];

app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const responseSchema = {
  type: "object",
  properties: {
    assignments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          category: { type: "string", enum: categories }
        },
        required: ["id", "category"],
        additionalProperties: false
      }
    }
  },
  required: ["assignments"],
  additionalProperties: false
};

function validateTabs(tabs) {
  if (!Array.isArray(tabs) || tabs.length === 0 || tabs.length > 30) throw new Error("Send between 1 and 30 tabs.");
  const ids = new Set();
  return tabs.map((tab) => {
    const id = Number(tab?.id);
    if (!Number.isInteger(id) || ids.has(id)) throw new Error("Tab IDs must be unique integers.");
    ids.add(id);
    const title = String(tab?.title || "").slice(0, 500);
    const url = String(tab?.url || "").slice(0, 2000);
    if (!url) throw new Error("Every tab must include a URL.");
    return { id, title, url };
  });
}

app.post("/organize", async (req, res) => {
  try {
    const tabs = validateTabs(req.body?.tabs);
    const tabList = tabs.map(({ id, title, url }) => `${id}\t${title}\t${url}`).join("\n");
    const prompt = [
      "Classify each browser tab into exactly one category: Work, Research, Shopping, Entertainment, or Other.",
      "Use the tab title and URL. Return one assignment for every tab, preserving each numeric ID exactly.",
      "Do not include explanations.",
      "Tabs (ID, title, URL):",
      tabList
    ].join("\n");

    const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: responseSchema,
        options: { temperature: 0 },
        messages: [
          { role: "system", content: "You are a precise browser-tab classifier. Follow the requested JSON schema exactly." },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!ollamaResponse.ok) throw new Error(`Ollama returned ${ollamaResponse.status}: ${await ollamaResponse.text()}`);
    const ollamaPayload = await ollamaResponse.json();
    const parsed = JSON.parse(ollamaPayload.message?.content || "{}");
    const assignments = parsed.assignments;
    const expectedIds = new Set(tabs.map((tab) => tab.id));
    if (!Array.isArray(assignments) || assignments.length !== tabs.length) throw new Error("Ollama returned an incomplete classification.");
    const seen = new Set();
    for (const assignment of assignments) {
      if (!expectedIds.has(assignment.id) || seen.has(assignment.id) || !categories.includes(assignment.category)) throw new Error("Ollama returned invalid or duplicate tab IDs.");
      seen.add(assignment.id);
    }
    res.json({ assignments });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "Unable to organize tabs." });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`AI Tab Organizer server listening on http://127.0.0.1:${port}`);
  console.log(`Using Ollama model: ${model} at ${ollamaUrl}`);
});
