# moinAI plugin for Claude

Manage a [moinAI](https://www.moin.ai) customer service chatbot from Claude.

```bash
claude plugin marketplace add knowhereto/moin-mcp
claude plugin install moin-ai@moin-ai
```

## What it contains

- **MCP server** — the moinAI remote endpoint `https://api.moin.ai/mcp`, registered as `plugin:moin-ai:moin-ai`. Authentication runs over OAuth against your moinAI Hub login: on first use the client opens a consent page where you choose which of your bots the assistant may reach and whether it may only read and test (`mcp:read`) or also make staging changes (`mcp:write`). Your Hub role caps what you can grant.
- **`moin-ai-management` skill** — the playbook. The tools are self-describing, but the skill carries the system knowledge: the staging/live model, channel handling, the workflows from creating an agent to deploying it, the tuning loop with the feedback tools, and the pitfalls.

## What the assistant can do

Inspect a bot's channels, languages, agents and knowledge; create and edit knowledge documents; attach websites and PDFs as knowledge resources; create AI agents and write their custom instructions; register webhooks and attach them as AI actions; test answers in the playground and correct a wrong intent match or a weak answer through the feedback tools.

**Every write operation is confined to the staging environment.** There is no publish-to-live path in this plugin by design — changes become effective in production only through the content deployment in the moinAI Hub. Read access to the live configuration is unrestricted.

## Requirements

A moinAI account with a bot, and a Hub login. See the [repository README](https://github.com/knowhereto/moin-mcp) for the API-key alternative and for setups outside Claude Code.

## Privacy & support

- Privacy policy: https://www.moin.ai/datenschutz
- Issues and questions: https://github.com/knowhereto/moin-mcp/issues

Released under the MIT License.
