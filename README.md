# moinAI MCP — AI Assistant Integrations

Connect AI assistants like **Claude** and **Google Antigravity** to your [moinAI](https://moin.ai) chatbot via the **moinAI MCP server**, and give them the playbook to manage your bot end-to-end: create AI agents, attach knowledge and webhook actions, test conversations in the playground, and tune agent behaviour.

> **Note:** The moinAI MCP server is integrated into the moinAI platform as a remote MCP endpoint (Streamable HTTP). The standalone npm package `@moin_ai/moin-mcp` that previously lived in this repository is **deprecated** — no local server process is needed anymore. This repository now distributes the client integrations: setup instructions and the agent skill.

---

## 1. Requirements

- **Access to the moinAI platform** ([moin.ai](https://moin.ai))
- **API key with MCP access**: in the moinAI Hub go to *Bot Settings → API Settings*, copy the API key and enable **"Allow MCP access"**. One API key belongs to one bot — the assistant manages exactly that bot.

## 2. Connect the MCP server

**Endpoint:** `https://api.moin.ai/mcp` (Streamable HTTP, authenticated per request via the `x-api-key` header)

### Claude Code

```bash
claude mcp add --transport http moin-ai https://api.moin.ai/mcp \
  --header "x-api-key: YOUR_API_KEY"
```

### Claude Desktop

Claude Desktop connects via the `mcp-remote` stdio proxy — add to `claude_desktop_config.json` (*Settings → Developer → Edit Config*):

```json
{
  "mcpServers": {
    "moin-ai": {
      "command": "npx",
      "args": [
        "mcp-remote", "https://api.moin.ai/mcp",
        "--header", "x-api-key: ${MOIN_AI_API_KEY}"
      ],
      "env": { "MOIN_AI_API_KEY": "YOUR_API_KEY" }
    }
  }
}
```

### Google Antigravity (CLI and IDE)

Antigravity reads MCP servers from an `mcp_config.json`. Add the moinAI server there:

```json
{
  "mcpServers": {
    "moin-ai": {
      "serverUrl": "https://api.moin.ai/mcp",
      "headers": {
        "x-api-key": "YOUR_API_KEY"
      }
    }
  }
}
```

Where to put the file:

| Scope | Path |
|-------|------|
| Global (all projects) | `~/.gemini/config/mcp_config.json` |
| Project | `.agents/mcp_config.json` in the workspace root |

Alternatively use the interactive MCP manager: run `/mcp` in the Antigravity CLI or IDE and add the server there.

Then restart the CLI/IDE and verify with `/mcp` that `moin-ai` is connected and its tools are listed.

**Two things to watch out for:**

- Remote servers must use `serverUrl`. The legacy Gemini CLI fields `url` and `httpUrl` are **not** supported and the server will silently fail to connect.
- Antigravity does not expand environment variables in `mcp_config.json`, so the API key has to be written in plain text. Keep `.agents/mcp_config.json` out of version control (e.g. via `.gitignore`) when you use the project-scoped variant.

## 3. Install the playbook (recommended)

The MCP tools are self-describing, but the skill teaches the assistant the *system knowledge*: the staging/live model, channel handling, the end-to-end workflows (create agent → add knowledge → activate → test → deploy), the tuning loop with feedback tools, and common pitfalls.

The same skill works for Claude and Antigravity — only the install location differs.

```bash
git clone https://github.com/knowhereto/moin-mcp.git
```

### Claude

```bash
cp -r moin-mcp/skills/moin-ai-management ~/.claude/skills/
```

(Or into `.claude/skills/` of a project for project-scoped use.) Claude loads the skill automatically when you work on your moinAI bot.

### Google Antigravity

```bash
cp -r moin-mcp/skills/moin-ai-management ~/.gemini/config/skills/
```

`~/.gemini/config/skills/` is recognised by both the Antigravity CLI and the IDE. For project-scoped use, copy the folder into `.agents/skills/` in your workspace root instead. Check with `/skills` that `moin-ai-management` is loaded.

## 4. What the assistant can do

| Area | Tools |
|------|-------|
| Knowledge documents | `knowledgebase_search/create/retrieve/update/delete` — Markdown documents written in moinAI |
| Webhook integrations | `webhook_list/get/create/update/delete/test` |
| AI agents | `ai_agent_list/create/set_status`, `ai_agent_get/set_instructions` |
| AI actions | `ai_action_add_webhook/update_webhook/remove` |
| Website & PDF resources | `ai_agent_resources`, `ai_resource_add/update/set_connection` |
| Testing & tuning | `ai_playground_test`, `ai_feedback_intent`, `ai_feedback_answer` |

All write operations are restricted to the **staging** environment. Publishing to live is not possible via MCP — configurations become effective in production only through the content deployment in the moinAI Hub.

---

## 📄 License

Released under the **MIT License**. See the [LICENSE](./LICENSE) file for more information.

---

## 🙌 Contribute

Found an issue or have ideas for improving the playbook?
Open an issue or submit a pull request – we welcome contributions!
