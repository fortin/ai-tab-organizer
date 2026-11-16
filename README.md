# AI Tab Organizer

A lightweight Chromium extension that uses a local Ollama model to organize open browser tabs into named tab groups.

The default model is `qwen3:8b`. Tab information is sent to the local Node.js server and then to Ollama on your computer; no OpenAI API key or cloud service is required.

## Features

- Classifies up to 30 unpinned, ungrouped tabs in the current window.
- Uses five categories: Work, Research, Shopping, Entertainment, and Other.
- Creates native browser tab groups with category names and colors.
- Runs against Ollama locally.

## Requirements

- Brave, Google Chrome, or another Chromium-based browser with Manifest V3 support.
- Node.js 20 or newer.
- [Ollama](https://ollama.com/) with the Qwen3 8B model.

## Installation

1. Install and start Ollama.
2. Download the model:

   ```bash
   ollama pull qwen3:8b
   ```

3. Install the server dependency from this folder:

   ```bash
   npm install
   ```

4. Start the local server:

   ```bash
   npm start
   ```

5. Open `brave://extensions` or `chrome://extensions`.
6. Enable **Developer mode**.
7. Choose **Load unpacked** and select this `ai-tab-organizer` folder.
8. Pin the extension, open some tabs, and choose **Organize My Tabs**.

Keep the terminal running while using the extension. The first request may take longer while Ollama loads the model.

## Configuration

By default, the server uses:

- Server: `http://127.0.0.1:3000`
- Ollama: `http://127.0.0.1:11434`
- Model: `qwen3:8b`

Override the Ollama URL or model when starting the server:

```bash
OLLAMA_URL=http://127.0.0.1:11434 OLLAMA_MODEL=qwen3:8b npm start
```

The browser extension expects the backend at `http://127.0.0.1:3000/organize`.

## Troubleshooting

- **Nothing happens:** confirm `npm start` is still running, then reload the extension from the extensions page.
- **Model not found:** run `ollama list` and confirm that `qwen3:8b` is installed.
- **Connection refused:** confirm Ollama is running and listening on port `11434`.
- **Need logs:** watch the terminal running `npm start`. For browser-side errors, right-click the extension icon and choose **Inspect popup**.

## Permissions and privacy

The extension requests `tabs` to read tab titles and URLs, and `tabGroups` to create and label groups. It only sends the current window's eligible tab titles and URLs to the local backend. The backend sends that information to the configured Ollama instance.

## License

MIT. See [LICENSE](LICENSE).
