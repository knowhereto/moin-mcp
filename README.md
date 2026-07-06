# moinAI MCP — AI Assistant Integrations

Connect AI assistants like **Claude** and **Gemini** to your [moinAI](https://moin.ai) chatbot via the **moinAI MCP server**, and give them the playbook to manage your bot end-to-end: create AI agents, attach knowledge and webhook actions, test conversations in the playground, and tune agent behaviour.

> **Note:** The moinAI MCP server is integrated into the moinAI platform as a remote MCP endpoint (Streamable HTTP). The standalone npm package `@moin_ai/moin-mcp` that previously lived in this repository is **deprecated** — no local server process is needed anymore. This repository now distributes the client integrations: setup instructions, the Claude skill, and the Gemini extension.

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

### Gemini CLI

The Gemini extension below configures the MCP server automatically — set `MOIN_AI_API_KEY` in your environment.

## 3. Install the playbook (recommended)

The MCP tools are self-describing, but the skill/extension teaches the assistant the *system knowledge*: the staging/live model, channel handling, the end-to-end workflows (create agent → add knowledge → activate → test → deploy), the tuning loop with feedback tools, and common pitfalls.

### Claude (Agent Skill)

```bash
git clone https://github.com/knowhereto/moin-mcp.git
cp -r moin-mcp/skills/claude/moin-ai-management ~/.claude/skills/
```

(Or into `.claude/skills/` of a project for project-scoped use.) Claude loads the skill automatically when you work on your moinAI bot.

### Gemini CLI (Extension)

```bash
git clone https://github.com/knowhereto/moin-mcp.git
cp -r moin-mcp/skills/gemini/moin-ai-management ~/.gemini/extensions/
export MOIN_AI_API_KEY=YOUR_API_KEY
```

The extension configures the MCP server connection and loads the playbook (`GEMINI.md`) into every session.

## 4. What the assistant can do

| Area | Tools |
|------|-------|
| Knowledge Base | `knowledgebase_search/create/retrieve/update/delete` |
| Webhook integrations | `webhook_list/get/create/update/delete/test` |
| AI agents | `ai_agent_list/create/set_status`, `ai_agent_get/set_instructions` |
| AI actions | `ai_action_add_webhook/update_webhook/remove/deploy` |
| Knowledge resources | `ai_agent_resources`, `ai_resource_add/set_connection` |
| Testing & tuning | `ai_playground_test`, `ai_feedback_intent`, `ai_feedback_answer` |

All write operations are restricted to the **staging** environment. Publishing to live is not possible via MCP — configurations become effective in production only through the content deployment in the moinAI Hub.

---

## 📄 License

Released under the **MIT License**. See the [LICENSE](./LICENSE) file for more information.

---

## 🙌 Contribute

Found an issue or have ideas for improving the playbooks?
Open an issue or submit a pull request – we welcome contributions!
