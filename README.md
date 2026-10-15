# NakamotoNotes Bitcoin Barometer — MCP server

Read-only MCP server for the NakamotoNotes Bitcoin Barometer: Heat Score 0-100, zone, BTC price with 24h/7d change, the ten indicators with value and heat, and daily history.

## Install

- **Claude Desktop (one click):** download `nakamotonotes-barometer.mcpb` from the latest [release](https://github.com/multiassist/nakamotonotes-mcp/releases/latest) and open it.
- **Any MCP client (stdio):** `npx -y github:multiassist/nakamotonotes-mcp`

```json
{ "mcpServers": { "nakamotonotes": { "command": "npx", "args": ["-y", "github:multiassist/nakamotonotes-mcp"] } } }
```

Tools: `get_market_snapshot`, `explain_indicator`, `get_history`. No API key, no personal data; it reads the public feed at https://nakamotonotes.com/open/barometer.json.

Data licence: CC BY 4.0, attribute NakamotoNotes. The reading describes the current state against its history; it is not a forecast or investment advice.
