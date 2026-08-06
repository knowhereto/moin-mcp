---
name: moin-ai-management
description: Manage a moinAI chatbot through the moinAI MCP server — create and configure AI agents, attach knowledge resources and webhook actions, test conversations in the playground, and tune agent behaviour. Use when the user wants to build, configure, test, or debug a moinAI bot, mentions "moinAI", "moin.ai", "KI Agent", webhook integrations for their chatbot, asks why their bot answers (or doesn't answer) a certain way, or asks about the moinAI website widget's JavaScript API.
---

# moinAI Bot Management

You are connected to a moinAI bot through the moinAI MCP server. One API key = one bot: every tool call operates on the bot the key belongs to — there is no bot-id parameter anywhere.

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

1. `webhook_create` — HTTPS URL and method (only GET/POST are executed at runtime!), optional headers/auth. Three fields decide whether it works:
   - **Templates.** URL, headers and body support Handlebars, resolved from the conversation context **by plain name**: a context `user_email` is `{{user_email}}`, not `{{ctx.user_email}}`.
   - **`sendBodyOption`** defaults to `'default'`, which sends moinAI's standard payload (`uniqueUserId` plus every `user_*` context). Use `'none'` for GET endpoints, and `'custom'` **together with** `data` to send your own JSON — passing `data` while the mode stays `'default'` silently discards it.
   - **`ctx_name`** names the context the response is stored in (default `webhook_response`). A failed call sets `webhook_error` instead.
2. `webhook_test` — verify the endpoint is reachable before wiring it up.
3. `ai_action_add_webhook` — attach to an agent. `webhookId` is the webhook *key* from `webhook_list` (e.g. `webhook_push_1739357841113`), not an object id. The `parameters` you declare (name/type/paramDescription) are filled by the LLM from the conversation and become Handlebars variables under their plain name. `description` tells the LLM when to use the action — write it like a tool description. `instruction_after` tells it what to do with the result — use it whenever the response is machine-shaped (codes, arrays, ids).
4. `ai_playground_test` — confirm in the response that the action executed and the answer uses its data.
5. When confirmed, hand over to the user: publishing to live happens via the Hub deployment.

### Worked example: weather forecast for the visit day

Open-Meteo is public and needs no API key, which makes it a good first action for a tourism or leisure bot — "is Saturday a good day to come?" becomes answerable. The location is fixed (the customer's own site), only the date comes from the conversation.

**1. `webhook_create`**

```json
{
  "displayName": "Weather forecast for our location",
  "url": "https://api.open-meteo.com/v1/forecast?latitude=53.55&longitude=9.99&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=Europe%2FBerlin&start_date={{forecast_date}}&end_date={{forecast_date}}",
  "method": "get",
  "sendBodyOption": "none",
  "ctx_name": "weather_forecast"
}
```

`sendBodyOption: "none"` matters here — the default would attach moinAI's payload to a GET request.

**2. `webhook_test`** — the endpoint answers without parameters too, so a failure at this point is a connectivity or URL problem, not a template problem.

**3. `ai_action_add_webhook`**

```json
{
  "intentId": "<agent id from ai_agent_list>",
  "webhookId": "webhook_push_...",
  "name": "Weather on the visit day",
  "description": "Fetches the weather forecast for our location on a specific day. Use it when the user asks about the weather, conditions, or whether a day is suitable for a visit.",
  "parameters": [
    {
      "name": "forecast_date",
      "type": "string",
      "paramDescription": "Date in YYYY-MM-DD format. Derive it from the question ('on Saturday' -> the date of the coming Saturday). Only up to 16 days ahead is available."
    }
  ],
  "instruction_after": "The response contains daily.weather_code (WMO code), daily.temperature_2m_max in °C and daily.precipitation_probability_max in percent. Turn that into one plain-language sentence with a short visit recommendation. Never mention the raw code."
}
```

**4. `ai_playground_test`** — "Wie wird das Wetter am Samstag bei euch?" The response must show the action executed, and the answer must read as a forecast rather than as raw JSON.

### Passing page data into the webhook

Contexts the website sets through the widget are Handlebars variables like any other, which is how the fixed coordinates above become dynamic. The page asks for the visitor's position and hands it to the widget:

```js
navigator.geolocation.getCurrentPosition((pos) => {
  window.moin.addContext({
    user_latitude: pos.coords.latitude.toFixed(2),
    user_longitude: pos.coords.longitude.toFixed(2),
  });
});
```

The webhook URL then reads them by name:

```
https://api.open-meteo.com/v1/forecast?latitude={{user_latitude}}&longitude={{user_longitude}}&daily=...
```

Two things to get right:

- Geolocation needs HTTPS and an explicit browser permission prompt. If the visitor declines, the contexts are never set, the placeholders resolve to empty strings and the URL breaks. Keep the site's own coordinates as a fallback — set them via `addContext` on page load and overwrite them only once the position is known.
- The `user_` prefix is not cosmetic: `sendBodyOption: 'default'` ships exactly `uniqueUserId` and the `user_*` contexts, so a context named `latitude` would be missing from the default payload.

## Widget JS API

Questions about the website widget itself — embedding it, controlling it from the page, feeding data in via `addContext`, available methods and events — are not covered by the MCP tools. The public documentation at https://dev.moin.ai/wdocs/api/api.html is the source of truth. Read that page before answering instead of guessing method names.

## Tuning loop

After each `ai_playground_test`, route the problem to the right tool — they are not interchangeable:

| Symptom | Fix |
|---|---|
| Wrong agent selected | `ai_feedback_intent` |
| Facts missing, wrong, or outdated | resources — `ai_resource_add` / `ai_resource_update` / `knowledgebase_*` |
| Facts correct, answer badly shaped | `ai_feedback_answer` |
| Agent misbehaves on *every* question it handles | `ai_agent_set_instructions` |

**Wrong agent selected** → `ai_feedback_intent` with the message, the correct agent, and `feedback: true` (or `false` for the wrongly chosen one). This trains the classification index.

**Content problem — always fix the source, never the prompt.** Anything the bot states as fact (prices, dates, opening hours, product names, conditions) comes from knowledge, and that is the only place to fix it:

- Content missing → `ai_resource_add` or `knowledgebase_create`
- Page changed / index stale → `ai_resource_update` re-scrapes and re-indexes the resource
- Page scraped incompletely (JS-rendered tables, accordions) → `ai_resource_update` with `scrapeOptions` (`waitFor`, `actions`, `includeTags`)

Never write the correct facts into instructions or into feedback as a shortcut. That creates a second, invisible copy of the data that nobody maintains and that silently goes stale — and it hides the actual gap instead of closing it.

**Answer shaping** → `ai_feedback_answer` with the `ragProtocol._id` from the playground response and a short correction (max 500 chars). This is the tool when the facts are right but the answer is incomplete, unstructured, too long, or misses an aspect — **including how this type of answer should be presented** ("list the tariffs as a markdown table, one row per tariff"). It applies to similar questions via the retrieval index, so it stays scoped to the topic it was given for. Don't restate the facts themselves here.

**Instructions — last resort, and only for the whole agent.** `ai_agent_get_instructions` → `ai_agent_set_instructions` affects *every* answer the agent produces. Two checks before writing anything there:

1. Is it a rule, not content? Nothing with a number, price, date, or name that could change belongs in instructions.
2. Does it hold for every question this agent handles? On a broad agent (general FAQ) a topic-specific rule bleeds into unrelated answers — use `ai_feedback_answer` instead. The same rule is legitimate on a narrow agent whose entire scope is that topic (e.g. a dedicated pricing agent: "always answer with the tariff table").

Tone and style are governed bot-wide by the persona/communication rules in the Hub — don't duplicate them per agent.

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
