# moinAI Bot Management

This extension connects Gemini to a moinAI bot via the moinAI MCP server (Streamable HTTP). Set the `MOIN_AI_API_KEY` environment variable to a bot API key that has MCP access enabled (moinAI Hub → API settings → "Allow MCP access", where the setup command is also shown).

One API key = one bot: every tool call operates on the bot the key belongs to — there is no bot-id parameter anywhere.

## Core concepts

**Environments.** Every bot has a `staging` (preview) and a `live` (production) environment. ALL write operations through MCP land in staging — this is enforced server-side, not a convention. **There is NO way to publish to live via MCP.** Everything configured through MCP (agents, actions, instructions, resources) becomes effective in production only after the user runs the content deployment in the moinAI Hub. When the configuration is tested and done, tell the user to deploy in the Hub. Reading the live state is possible (`stageName: "live"` on read tools, `staging: false` in the playground).

**Channels.** Agents, actions, and resources are configured per channel (website widget, WhatsApp, ...). When you omit `channelId`, tools default to the bot's first channel — consistently across all tools, so create and test line up. Get channel IDs from `ai_agent_list`.

**Agents (intents).** A "KI Agent" is a RAG intent: it owns knowledge resources, custom instructions, AI actions, and a per-channel activation state.

## Designing good agents

- **Check `ai_agent_list` before creating.** Overlapping or duplicate agents are a main cause of misclassification — extend an existing agent before creating a similar new one.
- Agents may cover a broader topic area (modern classification handles multiple related intentions within one agent well) — but agents should stay clearly distinct **from each other**.
- **Don't create an agent for everything.** General FAQs and static information belong in the central knowledge base (`knowledgebase_*` tools) and are answered without a dedicated agent. Create a specialised agent when you need custom instructions, dedicated resources, or AI actions (processes, real-time data).

## Standard workflow: new agent end-to-end

1. `ai_agent_create` — displayName, description (drives agent selection!), 3–5 typical user queries as samples.
2. **The new agent is DEACTIVATED.** Activate it for testing: `ai_agent_set_status` with `status: "staging"`.
3. `ai_resource_add` — attach knowledge (webpage/PDF URL). Prefer targeted pages over whole websites: a clean, focused data basis beats volume — irrelevant or duplicate content degrades answers. Indexing is asynchronous: the resource starts as `QUEUED`; poll `ai_agent_resources` until it is `TRAINED` before testing. If it ends up `FAILED`, the usual causes are scanned/password-protected PDFs, a blocked scraper, or JavaScript-rendered pages.
4. Control what gets scraped with `scrapeOptions` (Firecrawl parameters, on `ai_resource_add` or later via `ai_resource_update`, which re-scrapes):
   - `onlyMainContent: true` — strip navigation, headers, footers, sidebars (good default for content pages)
   - `excludeTags: ['nav', '.cookie-banner', '#comments']` / `includeTags: ['article', '.faq']` — CSS selectors to cut noise or scope precisely; when answers contain menu/footer text, this is the fix
   - `waitFor: 3000` — wait for JavaScript-rendered content before scraping; the fix when a page scrapes empty/incomplete
   - `actions: [...]` — browser interactions executed in order before scraping, for pages that need JS interaction: `{"type":"wait","milliseconds":2000}`, `{"type":"click","selector":"#load-more"}`, `{"type":"scroll","direction":"down"}`, `{"type":"write","text":"..."}`, `{"type":"press","key":"Enter"}`, `{"type":"executeJavascript","script":"..."}` — e.g. click "load more"/accordion elements so hidden content ends up in the knowledge
   - `headers: {...}` — custom HTTP headers for cookie- or auth-protected pages; `mobile: true` emulates a mobile device
   - Other Firecrawl scrape parameters (see docs.firecrawl.dev) are passed through (`formats` is reserved by the pipeline). Resource-level options override the bot-wide scraping defaults.
5. `ai_playground_test` — send a realistic user message. Check `classification` (was the right agent selected?) and `answer.text`.
6. Iterate (see "Tuning" below).
7. When everything works: tell the user the agent is ready and that they can publish it via the content deployment in the moinAI Hub — MCP cannot go live.

## Standard workflow: webhook AI action

1. `webhook_create` — HTTPS URL, method (only GET/POST are executed at runtime!), optional headers/auth. URL, headers, and body support Handlebars templates like `{{ctx.user_email}}` resolved from conversation context.
2. `webhook_test` — verify the endpoint is reachable before wiring it up.
3. `ai_action_add_webhook` — attach to an agent. The `parameters` you declare (name/type/description) are filled by the LLM from the conversation and become Handlebars variables in the webhook. `description` tells the LLM when to use the action — write it like a tool description.
4. `ai_playground_test` — confirm in the response that the action executed and the answer uses its data.
5. When confirmed, hand over to the user: publishing to live happens via the Hub deployment.

## Tuning loop

After each `ai_playground_test`:

- **Wrong agent selected?** → `ai_feedback_intent` with the message, the correct agent, and `feedback: true` (or `false` for the wrongly chosen one). This trains the classification index.
- **Right agent, weak answer?**
  - Adjust subject-specific rules and scope: `ai_agent_get_instructions` → `ai_agent_set_instructions`. Keep instructions about the *subject* (what to cover, what to exclude, domain rules) — tone and style are governed bot-wide by the persona/communication rules in the Hub, don't duplicate them per agent.
  - Correct a specific answer: `ai_feedback_answer` with the `ragProtocol._id` from the playground response and a short correction (max 500 chars). Describe what the correct answer should *contain*, not how it should sound. This influences future similar answers via the retrieval index.
- **Missing knowledge?** → `ai_resource_add` or the `knowledgebase_*` tools, then re-test.

Test staging by default. `ai_playground_test` with `staging: false` tests the production state — useful to compare before/after a deploy.

## Gotchas

- `ai_playground_test` executes real LLM calls and REALLY fires attached webhooks. It never touches live customer conversations, but the outbound calls are real.
- **Error code 101 ("No knowledge found" / no similar documents) is often the CORRECT outcome, not a bug.** When a test message asks something the bot has no knowledge about — or deliberately should not answer — the bot is SUPPOSED to hit its no-knowledge/not-understood fallback, and that is exactly what code 101 represents. Only treat it as a problem if the topic **should** be covered (then attach the missing knowledge); do not "fix" it by adding out-of-scope content.
- Playground responses omit retrieved knowledge by default to stay small; pass `includeKnowledge: true` when debugging retrieval.
- Conversation history uses roles `user`/`bot` (oldest first) and influences both agent selection and the answer.
- `ai_agent_list` shows per-channel `state`: `success` = live, `warning` = staging only, `error` = deactivated. Check this first when an agent is "not working".
- Webhook credentials (Basic Auth passwords) are write-only: they are stored but always redacted in responses.
- If a tool returns 403 "MCP access is not enabled", the API key needs the MCP toggle in the Hub under API settings.
- If only read tools (list/get/search, playground) appear in the tool list, the API key is scoped **read-only** — configuration changes need a key with the "Read & write" access level (Hub → API settings).
