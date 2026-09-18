# moinAI MCP — AI Assistant Integrations

Connect AI assistants like **Claude** to your [moinAI](https://moin.ai) chatbot via the **moinAI MCP server**, and give them the playbook to manage your bot end-to-end: create AI agents, attach knowledge and webhook actions, test conversations in the playground, and tune agent behaviour.

> **Note:** The moinAI MCP server is integrated into the moinAI platform as a remote MCP endpoint (Streamable HTTP). The standalone npm package `@moin_ai/moin-mcp` that previously lived in this repository is **deprecated** — no local server process is needed anymore. This repository now distributes the client integrations: the **Claude plugin** (`plugins/moin-ai`, which bundles the server connection and the playbook), the agent skill on its own, and setup instructions for clients the plugin does not cover.

---

## 1. Requirements

- **Access to the moinAI platform** ([moin.ai](https://moin.ai))
- **A moinAI Hub login.** It drives the OAuth flow, reaches every bot your account can access, and is what both paths below use. There is no key to create and nothing to store in a config file.

> Connecting with an API key still works, but it is **deprecated** — see [Deprecated: API key authentication](#deprecated-api-key-authentication) at the end.

## 2. Install the plugin (Claude Code and Cowork)

The recommended path. The plugin bundles the MCP server *and* the playbook, so one install replaces the manual server setup and the skill copy below:

```bash
claude plugin marketplace add knowhereto/moin-mcp
```

```bash
claude plugin install moin-ai@moin-ai
```

Start a new session and run `/mcp` — the server appears as `plugin:moin-ai:moin-ai` and asks you to authenticate. Log in to the Hub, pick your bots and the permission level on the consent page (see [What you grant on the consent page](#what-you-grant-on-the-consent-page) below), and you're connected. The playbook loads by itself.

Everything after this point is for setups the plugin does not cover, such as Claude Desktop.

## 3. Connect the MCP server manually

**Endpoint:** `https://api.moin.ai/mcp` (Streamable HTTP, authenticated with your Hub login via OAuth)

Add the server **without** any authentication header. The client discovers the authorization server, registers itself, and opens your browser on first use.

### Claude Code

```bash
claude mcp add --transport http moin-ai https://api.moin.ai/mcp
```

### Claude Desktop

Claude Desktop connects via the `mcp-remote` stdio proxy — add to `claude_desktop_config.json` (*Settings → Developer → Edit Config*):

```json
{
  "mcpServers": {
    "moin-ai": {
      "command": "npx",
      "args": ["mcp-remote", "https://api.moin.ai/mcp"]
    }
  }
}
```

### What you grant on the consent page

Logging in to the Hub lands you on a consent page where you choose two things:

| Choice | Options |
|---|---|
| Which bots the assistant may reach | any subset of the bots your account can access — admin accounts always cover all of theirs, so the page lists them instead of offering a choice |
| What it may do | `mcp:read` — inspect the configuration and test in the playground<br>`mcp:write` — additionally make staging changes |

Your Hub role caps what you can grant. Editors and owners can hand out `mcp:write` for their own bots. An **admin** account reaches every bot it administrates, so it is held to read on all of them — except sales demo bots (lifecycle stage `demo`, set by moinAI staff): it can grant `mcp:write` as soon as at least one of those is in reach, and the write tools then work on those bots only. The consent page says which case applies to you.

**Bot selection happens in the call.** With one bot in the grant, nothing changes. With several, tools take a `botId` argument, and a `bot_list` tool shows what the token covers. Ask the assistant to work on a bot by name and it will resolve it.

Writes only ever reach staging, whichever way you connect.

## 4. Install the playbook manually

The MCP tools are self-describing, but the skill teaches the assistant the *system knowledge*: the staging/live model, channel handling, the end-to-end workflows (create agent → add knowledge → activate → test → deploy), the tuning loop with feedback tools, and common pitfalls.

If you installed the plugin in section 2, you already have this — skip ahead. Otherwise install it by hand:

```bash
git clone https://github.com/knowhereto/moin-mcp.git
```

```bash
cp -r moin-mcp/plugins/moin-ai/skills/moin-ai-management ~/.claude/skills/
```

(Or into `.claude/skills/` of a project for project-scoped use.) Claude loads the skill automatically when you work on your moinAI bot.

## 5. What the assistant can do

| Area | Tools |
|------|-------|
| Bot overview | `bot_get` — name, stage, languages and every channel's configuration; `bot_list` on a multi-bot Hub login |
| Knowledge documents | `knowledgebase_search/create/retrieve/update/delete` — Markdown documents written in moinAI |
| Webhook integrations | `webhook_list/get/create/update/delete/test` |
| AI agents | `ai_agent_list/create/set_status`, `ai_agent_get/set_instructions` |
| AI actions | `ai_action_add_webhook/update_webhook/remove` |
| Website & PDF resources | `ai_agent_resources`, `ai_resource_add/update/set_connection` |
| Testing & tuning | `ai_playground_test`, `ai_feedback_intent`, `ai_feedback_answer` |

All write operations are restricted to the **staging** environment. Publishing to live is not possible via MCP — configurations become effective in production only through the content deployment in the moinAI Hub.

---

## Deprecated: API key authentication

The MCP server also accepts an API key in an `x-api-key` header, set up in the moinAI Hub under *Bot Settings → API Settings* with **"Allow MCP access"** enabled. One API key belongs to exactly one bot.

**This path is deprecated.** It still works today and existing connections keep running, but support for it will be **removed in a future release** — the date is not fixed yet. Use the plugin or the OAuth connection above instead, and migrate existing API-key connections when you get the chance. Removing the header from your configuration is all it takes; the client then runs the Hub login on the next start.

If you still need it — for example in a client that cannot complete an OAuth flow — add the header to the setup from section 3:

```bash
claude mcp add --transport http moin-ai https://api.moin.ai/mcp \
  --header "x-api-key: YOUR_API_KEY"
```

For Claude Desktop, pass it through `mcp-remote`:

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

---

## 📄 License

Released under the **MIT License**. See the [LICENSE](./LICENSE) file for more information.

---

## 🙌 Contribute

Found an issue or have ideas for improving the playbook?
Open an issue or submit a pull request – we welcome contributions!
