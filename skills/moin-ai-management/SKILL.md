---
name: moin-ai-management
description: Manage a moinAI chatbot through the moinAI MCP server — create and configure AI agents, attach knowledge resources and webhook actions, test conversations in the playground, and tune agent behaviour. Use when the user wants to build, configure, test, or debug a moinAI bot, mentions "moinAI", "moin.ai", "KI Agent", webhook integrations for their chatbot, asks why their bot answers (or doesn't answer) a certain way, or asks about the moinAI website widget's JavaScript API.
---

# moinAI Bot Management

You are connected to a moinAI bot through the moinAI MCP server. One API key = one bot: every tool call operates on the bot the key belongs to — there is no bot-id parameter anywhere.

## Core concepts

**Environments.** Every bot has a `staging` (preview) and a `live` (production) environment. ALL write operations through MCP land in staging — this is enforced server-side, not a convention. **There is NO way to publish to live via MCP.** Everything configured through MCP (agents, actions, instructions, resources) becomes effective in production only after the user runs the content deployment in the moinAI Hub. When the configuration is tested and done, tell the user to deploy in the Hub. Reading the live state is possible (`stageName: "live"` on read tools, `staging: false` in the playground).

**Channels.** Agents, actions, and resources are configured per channel (website widget, WhatsApp, ...). When you omit `channelId`, tools default to the bot's first channel — consistently across all tools, so create and test line up. Get channel IDs from `ai_agent_list`.

**Channel configuration is Hub-only.** Each channel also carries settings that shape every answer on it: a use-case context text (which feeds agent classification), the persona (agent title and description), the tone-of-voice rules, the guardrail, the language configuration and whether answers use markdown. None of it is reachable through MCP — it lives on the live bot document, so writing it would take effect in production immediately and break the staging guarantee. When one of these is the real cause of a problem, say so plainly and hand it to the user to change in the Hub, rather than working around it in agent instructions.

**Agents (intents).** A "KI Agent" is a RAG intent: it owns knowledge resources, custom instructions, AI actions, and a per-channel activation state.

## Designing good agents

- **Check `ai_agent_list` before creating.** Overlapping or duplicate agents are a main cause of misclassification — extend an existing agent before creating a similar new one.
- Agents may cover a broader topic area (modern classification handles multiple related intentions within one agent well) — but agents should stay clearly distinct **from each other**.
- **Don't create an agent for everything.** General FAQs and static information belong in the central knowledge base as documents (`knowledgebase_create`, scoped to the fallback agent) and are answered without a dedicated agent. Create a specialised agent when you need custom instructions, dedicated resources, or AI actions (processes, real-time data).
- **Every agent needs retrievable knowledge — a pure action agent does not work.** When the retrieval step returns nothing at all, the pipeline only falls back to web-search and CSV-search actions; a webhook action does not qualify, so it stops at the no-knowledge fallback (error code 101) before the action can run. One knowledge article describing what the agent can do for the user is enough to clear that gate. (This is a different gate from the later "was the knowledge useful" check, which the intent-level `ignoreKnowledgeCheck` setting disables and which an executed action satisfies anyway — so seeing `ignoreKnowledgeCheck: true` in a playground response does not mean the first gate is off.)

## Where knowledge goes

Three kinds of knowledge live in a bot, and picking the wrong one is not cosmetic: it decides who owns the content and whether your edits survive.

**Documents — `knowledgebase_create`.** Markdown you write, stored in moinAI, the same object the Hub shows under Knowledge > Documents. This is the default for any new knowledge that is not a website or a PDF: FAQ answers, policies, product facts, the one article that tells an action agent what it can do for the user. Documents count against the character quota only, not against the resource-count quota.

**Website and PDF resources — `ai_resource_add`.** For content that already lives under a URL and should stay tied to it. The resource is scraped and re-scraped from the source, so the source stays the single place the content is maintained.

**External articles — readable, but not yours to write.** `EXTERNAL` articles are content that lives in a *foreign* system (helpdesk, CMS, PIM) and is pushed into the bot through the public Article API. MCP does not create them, and it should not repair them: an edit through `knowledgebase_update` holds only until the next sync overwrites it. `knowledgebase_retrieve` returns them next to documents, marked `type: "EXTERNAL"` — when their content is wrong, say that the fix belongs in the source system instead of patching it here.

**Scope every document with `activeOn`.** A document created without `activeOn` is connected to no agent at all: it exists, it counts against the quota, and no answer can ever retrieve it. Pass agent and channel explicitly — both are plain identifiers from `ai_agent_list`:

```json
{
  "title": "Weather information",
  "body": "We can tell you the weather forecast for our location for any day within the next two weeks.",
  "activeOn": [{ "agent": "faq_wetter", "channel": "nZdovv0h" }]
}
```

`[{ "agent": "default", "channel": "default" }]` resolves to the bot's fallback agent on the first channel — the right scoping for general FAQ content that no specialised agent owns. On `knowledgebase_update`, `activeOn` replaces the whole list, so send it complete. Known quirk: the response may echo `channel: "null"` for the first channel even though the scoping applied — that is how the first channel is stored; verify with `knowledgebase_retrieve` rather than reading it as an error.

## Standard workflow: new agent end-to-end

1. `ai_agent_create` — displayName, description (drives agent selection!), 3–5 typical user queries as samples.
2. **The new agent is DEACTIVATED.** Activate it for testing: `ai_agent_set_status` with `status: "staging"`.
3. Attach knowledge — `ai_resource_add` for a webpage/PDF URL, `knowledgebase_create` for a document you write yourself (see "Where knowledge goes"). Prefer targeted pages over whole websites: a clean, focused data basis beats volume — irrelevant or duplicate content degrades answers. Indexing is asynchronous: the resource starts as `QUEUED`; poll `ai_agent_resources` until it is `TRAINED` before testing. If it ends up `FAILED`, the usual causes are scanned/password-protected PDFs, a blocked scraper, or JavaScript-rendered pages.
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
2. `webhook_test` — verify the endpoint is reachable. **A pass here proves less than it looks:** the test fires the *stored* configuration, so Handlebars placeholders go out literally, unresolved. An endpoint that accepts `{{location}}` as a real value answers HTTP 200 with nonsense. Only `ai_playground_test` exercises the template path.
3. `ai_action_add_webhook` — attach to an agent. `webhookId` is the webhook *key* from `webhook_list` (e.g. `webhook_push_1739357841113`), not an object id. The `parameters` you declare (name/type/paramDescription) are filled by the LLM **from the conversation text only** — see the next point. `description` tells the LLM when to use the action — write it like a tool description. `instruction_after` tells it what to do with the result — use it whenever the response is machine-shaped (codes, arrays, ids).
4. `ai_playground_test` — confirm in the response that the action executed and the answer uses its data. Pass `context: [{name, value}]` to preset conversation context variables; this is the only way to test a webhook whose URL depends on them.
5. When confirmed, hand over to the user: publishing to live happens via the Hub deployment.

**The LLM cannot read conversation context variables.** Neither parameter filling nor answer generation sees them. Writing "if no city is given, use the context `user_city`" into a `paramDescription` looks reasonable and fails silently — the parameter arrives empty, and the answer says "at your location" without ever knowing the location. Contexts reach a webhook through exactly one path: Handlebars in the URL, headers or body. There is no second one.

Note the asymmetry that makes this confusing: the **action's response is visible** to the LLM — that is what `instruction_after` operates on — while the **stored context is not**. Data flows page → context → Handlebars → webhook → response → LLM, and never sideways from the context into the prompt.

Because of that, "value from the conversation" and "value from the page context" are **two separate actions** on the same agent, not one action with a fallback: one declares an LLM parameter, the other declares none and puts `{{context_name}}` in the URL. The LLM picks between them reliably from their `description`.

**Actions do not chain.** Exactly one round of action calls runs per answer; afterwards the actions are no longer offered to the model. An `instruction_after` along the lines of "now run the geocoding result through the weather action" therefore cannot work — the model keeps asking for a call it can no longer reach, which surfaces as a repeating instruction and a playground timeout rather than as an error. Design each action as one self-sufficient HTTP call. Where the temptation to chain exists, close it explicitly: "this response is the final information, do not call another action."

### Worked example: weather forecast for the visit day

Open-Meteo is public and needs no API key, which makes it a good first action for a tourism or leisure bot — "is Saturday a good day to come?" becomes answerable. The location is fixed (the customer's own site), only the date comes from the conversation.

**Choose an API you can narrow down.** The whole webhook response is stored in the context and goes into the LLM prompt, so payload size is a running token cost and a source of distraction. The `daily=` field selection below returns well under a kilobyte; a weather endpoint that dumps everything returns tens of kilobytes for the same one-sentence answer. Prefer an API that lets you name the fields you want, and name them — then check the reduced set still covers what the agent promises. A trimmed weather payload that drops precipitation probability is small and cheap and can no longer answer "will it rain on Saturday?", which is the question people actually ask.

**0. Give the agent knowledge.** One `knowledgebase_create` article like "We can tell you the weather forecast for our location for any day within the next two weeks" is enough — without any retrievable knowledge the agent stops at the no-knowledge fallback and the action never runs. Scope it to the agent with `activeOn`:

```json
{
  "title": "Weather information",
  "body": "We can tell you the weather forecast for our location for any day within the next two weeks.",
  "activeOn": [{ "agent": "faq_wetter", "channel": "nZdovv0h" }]
}
```

Both fields are plain identifiers (`ai_agent_list` has them); the defaults are the literal strings `default`/`default`. Known quirk: the response may echo `channel: "null"` even though the scoping applies — verify with `knowledgebase_retrieve` rather than trusting the echo.

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

A date range in the URL keeps the LLM parameter visible, which is the point of this example. In production `forecast_days=7` plus "`daily.time[0]` is today, `[1]` tomorrow" in `instruction_after` is sturdier: one call covers the whole window, and a date outside the supported range cannot break the URL.

**2. `webhook_test`** — a failure here is a connectivity or URL problem. A pass says nothing about `{{forecast_date}}`, which is still unresolved at this point.

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

This becomes a **second webhook and a second action** on the same agent — no LLM parameter, the coordinates come straight from the context:

```json
{
  "displayName": "Weather forecast at the visitor's position",
  "url": "https://api.open-meteo.com/v1/forecast?latitude={{user_latitude}}&longitude={{user_longitude}}&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=Europe%2FBerlin",
  "method": "get",
  "sendBodyOption": "none",
  "ctx_name": "weather_forecast_visitor"
}
```

Its action declares `parameters: []` and a `description` that separates it from the first one — "use this when the user asks about the weather where *they* are, not at our location". The LLM picks between the two from those descriptions.

Test it with `ai_playground_test` and `context: [{"name": "user_latitude", "value": "48.14"}, {"name": "user_longitude", "value": "11.58"}]`. Without the `context` parameter you are not testing this action at all.

Three things to get right:

- **An empty placeholder produces a valid URL, not an error.** If the visitor declines the permission prompt the contexts are never set, `{{user_latitude}}` resolves to an empty string, and many APIs happily answer something — geo-IP services fall back to the *server's* location, and the bot then reports the weather in a datacentre with full confidence. No exception, no `webhook_error`. Note that this is quieter than a broken template: an *unresolved* `{{…}}` reaches the API as a literal and usually earns a 4xx, while an *empty* value often earns a 200. Open-Meteo answers HTTP 200 with a zero-byte body when the coordinates are empty. **The reliable guard is `instruction_after`**: have it compare the location echoed in the response against what the user asked for, and refuse to answer on a mismatch or an empty response. Do not rely on the endpoint to complain.
- Keep the site's own coordinates as a fallback: set them via `addContext` on page load and overwrite them only once the real position is known.
- The `user_` prefix is not cosmetic: `sendBodyOption: 'default'` ships exactly `uniqueUserId` and the `user_*` contexts, so a context named `latitude` would be missing from the default payload.

### When the user names the place

The third case — the user says "how is the weather in Kaltenkirchen?" — is the hardest, because Open-Meteo takes coordinates and not names. Letting the LLM fill `latitude`/`longitude` directly works better than expected: for an unambiguous German town of 20,000 it matched the official geocoder exactly. Chaining a geocoding action in front of it is not an option (see above), so this is usually the right call.

It fails silently on **ambiguous names**, though. "Springfield" was answered with weather for "Springfield, Germany" — a place that does not exist — with no error and no follow-up question. Two things contain it:

- A `paramDescription` that forbids the guess explicitly: do not execute the action when the name exists in several countries, ask which one is meant; never relocate a place to Germany just because the user writes German.
- A `instruction_after` that requires naming place, region and country in the answer, so a wrong match becomes visible to the user instead of hiding behind a plausible temperature.

Calibrating that is the actual work: a first attempt phrased as "only if you really know the location" swung too far and made the bot refuse the unambiguous town. Test both ends — a clearly known place and a deliberately ambiguous one — after every wording change.

## Widget JS API

Questions about the website widget itself — embedding it, controlling it from the page, feeding data in via `addContext`, available methods and events — are not covered by the MCP tools. The public documentation at https://dev.moin.ai/wdocs/api/api.html is the source of truth. Read that page before answering instead of guessing method names.

## Tuning loop

After each `ai_playground_test`, route the problem to the right tool — they are not interchangeable:

| Symptom | Fix |
|---|---|
| Wrong agent selected | `ai_feedback_intent` |
| Facts missing, wrong, or outdated | knowledge — `knowledgebase_create/update` (documents) / `ai_resource_add` / `ai_resource_update` (URLs) |
| Facts correct, answer badly shaped | `ai_feedback_answer` |
| Agent misbehaves on *every* question it handles | `ai_agent_set_instructions` |

**Wrong agent selected** → `ai_feedback_intent` with the message, the correct agent, and `feedback: true` (or `false` for the wrongly chosen one). This trains the classification index.

**Content problem — always fix the source, never the prompt.** Anything the bot states as fact (prices, dates, opening hours, product names, conditions) comes from knowledge, and that is the only place to fix it:

- Content missing → `knowledgebase_create` for knowledge you write yourself, `ai_resource_add` when it already exists under a URL
- Page changed / index stale → `ai_resource_update` re-scrapes and re-indexes the resource
- Page scraped incompletely (JS-rendered tables, accordions) → `ai_resource_update` with `scrapeOptions` (`waitFor`, `actions`, `includeTags`)

Never write the correct facts into instructions or into feedback as a shortcut. That creates a second, invisible copy of the data that nobody maintains and that silently goes stale — and it hides the actual gap instead of closing it.

**Answer shaping** → `ai_feedback_answer` with the `ragProtocol._id` from the playground response and a short correction (max 500 chars). This is the tool when the facts are right but the answer is incomplete, unstructured, too long, or misses an aspect — **including how this type of answer should be presented** ("list the tariffs as a markdown table, one row per tariff"). It applies to similar questions via the retrieval index, so it stays scoped to the topic it was given for. Don't restate the facts themselves here.

**Instructions — last resort, and only for the whole agent.** `ai_agent_get_instructions` → `ai_agent_set_instructions` affects *every* answer the agent produces. Two checks before writing anything there:

1. Is it a rule, not content? Nothing with a number, price, date, or name that could change belongs in instructions.
2. Does it hold for every question this agent handles? On a broad agent (general FAQ) a topic-specific rule bleeds into unrelated answers — use `ai_feedback_answer` instead. The same rule is legitimate on a narrow agent whose entire scope is that topic (e.g. a dedicated pricing agent: "always answer with the tariff table").

**On an agent with AI actions, instructions can veto an action.** They do not only shape the answer, they compete with the action `description`s for the tool choice. A rule like "if the place is unclear, ask instead of guessing" made the bot reply "you did not give me a place" to *"will it be warm at my place on Saturday?"* — with the visitor's location sitting in the context and a location action attached that would have answered it. The same agent still handled "is it raining here today?" correctly; only the combination with a target day tripped it. After every instruction change, re-test **all** actions of the agent, not just the question the instruction was written for.

Tone and style are governed by the **channel's** persona and tone-of-voice rules, not by the agent — don't restate them in agent instructions. Those are Hub-only settings (see "Channel configuration" above), so when the complaint is really about how the bot sounds, the fix is a Hub change, not an instruction.

Test staging by default. `ai_playground_test` with `staging: false` tests the production state — useful to compare before/after a deploy.

## Gotchas

- `ai_playground_test` executes real LLM calls and REALLY fires attached webhooks. It never touches live customer conversations, but the outbound calls are real.
- `ai_playground_test` can run into an MCP timeout when an action is slow or the model loops on one. A timeout is not by itself a sign of a broken configuration — retry once, and only start debugging the action if it repeats.
- **Error code 101 ("No knowledge found" / no similar documents) is often the CORRECT outcome, not a bug.** When a test message asks something the bot has no knowledge about — or deliberately should not answer — the bot is SUPPOSED to hit its no-knowledge/not-understood fallback, and that is exactly what code 101 represents. Only treat it as a problem if the topic **should** be covered (then attach the missing knowledge); do not "fix" it by adding out-of-scope content.
- Playground responses omit retrieved knowledge by default to stay small; pass `includeKnowledge: true` when debugging retrieval.
- Conversation history uses roles `user`/`bot` (oldest first) and influences both agent selection and the answer.
- `ai_agent_list` shows per-channel `state`: `success` = live, `warning` = staging only, `error` = deactivated. Check this first when an agent is "not working".
- Webhook credentials (Basic Auth passwords) are write-only: they are stored but always redacted in responses.
- If a tool returns 403 "MCP access is not enabled", the API key needs the MCP toggle in the Hub under API settings.
- If only read tools (list/get/search, playground) appear in the tool list, the API key is scoped **read-only** — configuration changes need a key with the "Read & write" access level (Hub → API settings).
- **A write tool that answers "… is not a demo bot" is a permission boundary, not a bug.** A connection authenticated with a moinAI Hub *admin* login (rather than an API key) may only change bots whose stage is `demo` — every customer bot is read-only for it, while the write tools stay listed either way. `bot_get` reports the stage, `bot_list` marks the writable bots with `demo: true`. Report the boundary and carry on read-only; never retry the call, and never offer to change the bot's stage yourself.
