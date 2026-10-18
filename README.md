# NakamotoNotes Bitcoin Barometer — MCP server

Read-only MCP server for the NakamotoNotes Bitcoin Barometer: Heat Score 0-100, zone, BTC price with 24h/7d change, the ten indicators with value and heat, and daily history.

## Install

- **Hosted (no install):** add `https://nakamotonotes.com/mcp` as a remote MCP server (Streamable HTTP, no auth).
  - Claude: one click from the [Claude directory](https://claude.ai/directory/nakamoto-notes-bitcoin-barometer).
  - Grok: grok.com/connectors > New Connector > Custom, paste the URL.
  - Cursor and Grok Bot: install the `nakamotonotes-bitcoin-barometer` plugin (manifest in `.cursor-plugin/plugin.json`, server in `mcp.json`).
- **Claude Desktop (one click):** download `nakamotonotes-barometer.mcpb` from [nakamotonotes.com](https://nakamotonotes.com/downloads/nakamotonotes-barometer.mcpb) and open it.
- **Any MCP client (stdio):** `npx -y @nakamotonotes/mcp`

```json
{ "mcpServers": { "nakamotonotes": { "command": "npx", "args": ["-y", "@nakamotonotes/mcp"] } } }
```

Tools: `get_market_snapshot`, `explain_indicator`, `get_history`. No API key, no personal data; it reads the public feed at https://nakamotonotes.com/open/barometer.json.

Data licence: CC BY 4.0, attribute NakamotoNotes. The reading describes the current state against its history; it is not a forecast or investment advice.
