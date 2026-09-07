# moinAI MCP — AI Assistant Integrations

Connect AI assistants like **Claude** and **Google Antigravity** to your [moinAI](https://moin.ai) chatbot via the **moinAI MCP server**, and give them the playbook to manage your bot end-to-end: create AI agents, attach knowledge and webhook actions, test conversations in the playground, and tune agent behaviour.

> **Note:** The moinAI MCP server is integrated into the moinAI platform as a remote MCP endpoint (Streamable HTTP). The standalone npm package `@moin_ai/moin-mcp` that previously lived in this repository is **deprecated** — no local server process is needed anymore. This repository now distributes the client integrations: the **Claude plugin** (`plugins/moin-ai`, which bundles the server connection and the playbook), the agent skill on its own, and setup instructions for clients the plugin does not cover.

---

## 1. Requirements

- **Access to the moinAI platform** ([moin.ai](https://moin.ai))
- **Either** a moinAI Hub login — used for the OAuth flow, reaches every bot your account can access, and is what the plugin below uses;
- **or** an **API key with MCP access**: in the moinAI Hub go to *Bot Settings → API Settings*, copy the API key and enable **"Allow MCP access"**. One API key belongs to one bot — the assistant manages exactly that bot.

## 2. Install the plugin (Claude Code and Cowork)

The quickest path. The plugin bundles the MCP server *and* the playbook, so one install replaces the manual server setup and the skill copy below:

```bash
claude plugin marketplace add knowhereto/moin-mcp
claude plugin install moin-ai@moin-ai
```

Start a new session and run `/mcp` — the server appears as `plugin:moin-ai:moin-ai` and asks you to authenticate. Log in to the Hub, pick your bots and the permission level on the consent page (see [OAuth](#connecting-with-your-hub-login-instead-oauth) below), and you're connected. The playbook loads by itself.

Everything after this point is for setups the plugin does not cover: Claude Desktop, Google Antigravity, or connecting with an API key instead of a Hub login.

## 3. Connect the MCP server manually

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

### Connecting with your Hub login instead (OAuth)

An API key belongs to exactly one bot. If you manage several, you can authenticate as a moinAI Hub user instead and reach all of them over one connection. Add the server **without** a header:

```bash
claude mcp add --transport http moin-ai https://api.moin.ai/mcp
```

The client discovers the authorization server, registers itself, and opens your browser. Log in to the Hub as usual and you land on a consent page where you choose two things:

| Choice | Options |
|---|---|
| Which bots the assistant may reach | any subset of the bots your account can access — admin accounts always cover all of theirs, so the page lists them instead of offering a choice |
| What it may do | `mcp:read` — inspect the configuration and test in the playground<br>`mcp:write` — additionally make staging changes |

Your Hub role caps what you can grant. Editors and owners can hand out `mcp:write` for their own bots. An **admin** account reaches every bot it administrates, so it is held to read on all of them — except sales demo bots (lifecycle stage `demo`, set by moinAI staff): it can grant `mcp:write` as soon as at least one of those is in reach, and the write tools then work on those bots only. The consent page says which case applies to you.

Two practical differences to the API key:

- **Bot selection moves into the call.** With one bot in the grant, nothing changes. With several, tools take a `botId` argument, and a `bot_list` tool shows what the token covers. Ask the assistant to work on a bot by name and it will resolve it.
- **No key to store.** Nothing in plain text in a config file — which also removes the Antigravity caveat above about environment variables.

Everything else is identical, including the rule that writes only ever reach staging.

## 4. Install the playbook manually

The MCP tools are self-describing, but the skill teaches the assistant the *system knowledge*: the staging/live model, channel handling, the end-to-end workflows (create agent → add knowledge → activate → test → deploy), the tuning loop with feedback tools, and common pitfalls.

If you installed the plugin in section 2, you already have this — skip ahead. Otherwise the same skill works for Claude and Antigravity, and only the install location differs.

```bash
git clone https://github.com/knowhereto/moin-mcp.git
```

### Claude

```bash
cp -r moin-mcp/plugins/moin-ai/skills/moin-ai-management ~/.claude/skills/
```

(Or into `.claude/skills/` of a project for project-scoped use.) Claude loads the skill automatically when you work on your moinAI bot.

### Google Antigravity

```bash
cp -r moin-mcp/plugins/moin-ai/skills/moin-ai-management ~/.gemini/config/skills/
```

`~/.gemini/config/skills/` is recognised by both the Antigravity CLI and the IDE. For project-scoped use, copy the folder into `.agents/skills/` in your workspace root instead. Check with `/skills` that `moin-ai-management` is loaded.

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

## 📄 License

Released under the **MIT License**. See the [LICENSE](./LICENSE) file for more information.

---

## 🙌 Contribute

Found an issue or have ideas for improving the playbook?
Open an issue or submit a pull request – we welcome contributions!
