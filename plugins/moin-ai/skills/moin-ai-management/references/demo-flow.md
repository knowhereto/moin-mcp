# Demo flow: "Erstelle mir die Demo für XY"

A sales demo bot shows a prospect, in their own look and on their own content, what a moinAI bot does for their website. The user names a company or a URL. You do the rest end to end and finish with a short briefing for whoever runs the demo.

Read the main playbook (SKILL.md) first. This flow assumes it and does not repeat it: environments, the stage gate, the tool sections, the tuning loop.

**A demo is a showcase.** Every decision in this flow is made for the moment a prospect watches it live. Three things make that moment, and every demo should have all three unless there is a real reason not to:

1. **An integration**: at least one answer built from live data via an AI action, not only from scraped pages. This is what separates moinAI from a FAQ bot.
2. **Something visual**: a card slider (answer template) for at least one question, rather than a plain text list.
3. **A guided start**: showcase questions as quick replies in the greeting, so the presenter (or the prospect) can click straight into the best answers.

## 0. The right bot

- Call `bot_get` (and `bot_list` on a multi-bot login). A demo is built on a **demo bot**: `stage: "demo"` on an admin login, or `stage: "onboarding"` on an owner/editor login. On any other bot, stop and say so. Never build a demo on a productive customer bot, and never offer to change a bot's stage.
- If the connection covers several demo bots, ask which one to use. Name and id help. Do not pick one yourself.
- A demo bot that already has content is being *re-used*. Ask whether to replace the existing setup or extend it before changing anything.

## 1. Pin down website and use case

You need three things before building anything:

1. **The website**, as an exact URL. Not "Tierpark Nordheide" but `https://www.tierpark-nordheide.de`.
2. **The use case**: which job the bot does on that website.
3. **Language and form of address.** These come from the website, so you rarely have to ask; see step 2.

If the user gave only a company name, find the website and confirm it in your question. If the use case is missing, look at the website briefly and **ask with 2–3 concrete proposals** that fit that company. Do not ask an open "which use case?". For example:

> Für die Demo von Tierpark Nordheide würde ich einen dieser Use Cases vorschlagen:
> 1. **Besucherservice**: Öffnungszeiten, Tickets & Preise, Anfahrt, Fütterungszeiten, Barrierefreiheit
> 2. **Ticket- und Eventberatung**: Veranstaltungen als Slider, Gruppen- und Schulangebote
> 3. **Jahreskarten-Service**: Kauf, Verlängerung, Leistungen
>
> Welcher passt, oder soll es eine Kombination sein?

**Make at least one proposal include an integration**, and mark which one does. Look for a public, keyless data source that matches the use case. During the step 2 research, check:
- event calendars and ticket availability
- product search or stock
- opening status
- timetables, waste collection dates, weather
- JSON endpoints the site's own JavaScript calls (visible in the bundle or the network tab), which are often public

If nothing obvious turns up, **ask** instead of dropping it. Offer the closest options: a related public API (e.g. weather for an outdoor venue), a test endpoint the prospect could provide, or explicitly no integration for this demo. For example:

> Für eine Integration habe ich auf der Website keine öffentliche Schnittstelle gefunden. Optionen: (a) Wetter-Vorschau für den Besuchstag über Open-Meteo, (b) ihr bekommt vom Kunden einen Test-Endpunkt, (c) diese Demo ohne Integration. Was passt?

Typical use case families to draw proposals from:
- **Customer service / FAQ**: opening hours, contact, shipping, returns, contracts.
- **Product advice**: finder or comparison with a product slider.
- **Booking / tickets / events**.
- **Lead qualification**: demo or consultation request, handover.
- **Self-service processes**: status queries, forms. These usually need an integration.
- **Live information**: availability, dates, weather, status. Integration-led by nature, and the strongest showcase when a public source exists.

One clear use case makes a better demo than five half-built ones. If the user wants a combination, keep it to two.

## 2. Research company and website

Use your web tools (fetch or browser) on the public website only. No CRM data, no logins. Collect:

| What | Where to look | Used in step |
|---|---|---|
| Company, sector, offer, target group in 2–3 sentences | Home page, "Über uns" | 3 (use case) |
| Language(s) of the site; **du or Sie** | Running text, CTAs, contact page | 3, 4 |
| Tone: casual, formal, playful, emoji or none | Headlines, social teasers, FAQ answers | 3 |
| **CI colours**: primary and accent as hex | `<meta name="theme-color">`, CSS custom properties / `:root`, button and header colours, logo colours | 4 |
| **Logo or avatar image URL** | `apple-touch-icon` (often 180×180, square: best fit), `icon` links with sizes, the web app manifest icons, a square logo, the `og:image`; resolve to an **absolute https URL** right away (see step 4) | 4 |
| The pages that answer the use-case questions | FAQ, prices, opening hours, contact, shipping/returns, product and event listings | 5 |
| Public data sources | Event calendars, product search, open APIs that need no key (e.g. Open-Meteo for weather) | 5 |
| Product/event images | 2–3 detail pages: page-specific `og:image`? Image format landscape or square? | 5 |

Keep a short research brief in your working notes: company, use case, address form, tone, colours, logo URL, 5–10 source pages. Show it to the user only if something is unclear, for example two candidate brand colours or a site that mixes du and Sie. Otherwise continue.

Never invent facts about the company. If something cannot be found on the site, it does not go into the demo.

## 3. Channel settings, voice and conversation texts

**Use case (`channel_update`, `context`)**: in English, following the pattern in SKILL.md: role and website, company and sector in one sentence, the request topics of the chosen use case, and what the bot does *not* handle.

**Markdown (`channel_update`, `markdown`)**:
- Turn it on for a website widget demo whenever answers will carry structure: prices, opening hours, steps, comparisons. That is almost always the case.
- Leave it off only for channels that do not render it.

**Voice (`channel_update`, `persona` and `communicationRules`)**: set both, or the AI answers will not match the greeting.
- Persona title: the assistant's role at this company, e.g. "Customer service assistant of Tierpark Nordheide". The description covers the use-case scope, how detailed answers should be, and "only cite the given sources, never speculate". Write both in English.
- Communication rules come straight from the research: `per Du schreiben` or `per Sie schreiben`, plus one or two tone rules that match the site (e.g. "Freundlich und locker antworten", "Emojis sparsam verwenden" or "Keine Emojis verwenden").

**Multi-language (`channel_update`, `multiLanguage`)**: turn it on when the website itself is multilingual or addresses international visitors (tourism, trade fairs, shops shipping abroad). Otherwise leave it off.

**Conversation texts (`basic_cx_get` → `basic_cx_update`)**: write them in the company's voice and form of address. moinAI's own default is du; the company's site decides here.
- **Greeting**: two short messages.
  - The first says hello and makes clear that a digital assistant is answering (🤖 only if the brand uses emoji).
  - The second names the 3–4 topics of the use case and invites the user to type a question.
  - **Showcase quick replies** go on the second message, but only after testing (step 6, "Showcase quick replies"). Write the texts now, add the quick replies once you know which questions work.
- **Not understood**:
  - 2–3 variants, none of them a blunt "I did not understand".
  - Quick replies: use existing targets only. A quick reply that hands a question to an AI agent is phrased as a full question. The handover or customer service option goes last.
- **Unhappy path, thanks, rating replies**: short, in the same voice, with variants where allowed.

Example greeting for a casual brand with du:

> Hallo! 👋 Ich bin der digitale Assistent vom Tierpark Nordheide.
>
> Ich helfe dir bei Öffnungszeiten, Tickets & Preisen, Anfahrt und Fütterungszeiten. Was möchtest du wissen?

## 4. Widget in the company's CI

Call `widget_get` first, then `widget_update`:

- **`headerName`**: company or brand name.
- **`botName`**: a name for the assistant, e.g. "Tierpark-Assistent". Use a mascot name if the brand has one.
- **`botTitle`**: e.g. "Digitaler Assistent".
- **`inputPlaceholder`**: in the brand's form of address, e.g. "Stell mir deine Frage …".
- **`primaryColor` / `secondaryColor`** from the research. For `launcherButton`, `header` and `userMessage`, choose the colour and the matching `contrast`: white text on dark colours, black text on light ones.
- **`position`** stays bottom right unless the site already has something in that corner, such as a cookie button or a "back to top" button.
- **`privacyScreen`** stays off. A privacy link in the greeting is the recommended alternative.
- **`aiIndicator`** enabled.

**Avatar (`widget_set_avatar`): always set, always verified.** Every demo leaves this step with a checked avatar. That is either the company's own image or a deliberate fall-back to Moini, and either way the briefing says which. A demo should never ship with an avatar nobody looked at, and never with a broken image in the widget header.

1. **Collect candidates** from the `<head>` of the home page, best first:
   1. `apple-touch-icon` / `apple-touch-icon-precomposed`. Take the largest size, ideally 180×180. These are square and made for small round-ish display.
   2. `icon` links with an explicit size of at least 64 px (e.g. `sizes="192x192"`), and the icons of the web app manifest (`<link rel="manifest">` → `icons[]`).
   3. A square logo or mascot image from the page, or the `og:image` when it is square.

   Skip SVG (not accepted), ICO, wide wordmarks and anything under 64 px.
2. **Make the URL absolute.** `href` values in HTML are often relative (`/assets/icon-180.png`, `icon.png`) or protocol-relative (`//cdn.example.com/icon.png`).
   - Resolve them against the page URL, or against the `<base href>` if the page sets one: `https://www.example.com/assets/icon-180.png`.
   - The result must start with `https://`. A relative path, an `http://` URL or a `data:` URI is never passed to the tool.
3. **Check the URL from outside the site**, the way a visitor's browser loads it inside the widget on another page:
   - It must return HTTP **200 directly**, without redirect. If it redirects, use the final URL instead.
   - The content type must be `image/png` or `image/jpeg`. HTML means a login page, a cookie wall or a 404 page.
   - It must also work with a foreign `Referer`. Some sites block hotlinking, and the image then disappears only inside the widget.

   With a shell available:

   ```bash
   curl -s -o /dev/null -w "%{http_code} %{content_type} %{redirect_url}\n" -H "Referer: https://example.org/" "<avatar-url>"
   ```

   Expected output: `200 image/png` and an empty redirect.
4. **Prefer a stable address.** File names with a build hash (`icon-180.35d4d8762ea9c6f5.png`, `?v=…`, `/_next/static/…`) change with the next deploy of the website. The avatar then breaks silently.
   - Look for an unhashed variant first, e.g. `/apple-touch-icon.png` in the site root.
   - If only hashed files exist, use one and mark it in the briefing as "check before the meeting".
   - For a demo that will be used for weeks, recommend uploading the image in the Hub.
5. **Set it and read it back.**
   - Call `widget_set_avatar` with the absolute URL. The server checks it again: PNG/JPG, at least 64 px, no redirect. Read its warnings (not square, oversized, white/black background).
   - Then `widget_get` must show exactly that URL as `avatarUrl`.
   - Where possible, load the image once more from that stored URL to close the loop.
6. **Decide and document.**
   - **Keep the image** if the check passes and there are no warnings, or only a size warning.
   - **Fall back to Moini on purpose** if it is not square, is a wordmark, or sits on pure white, black or #222222. To do that, set the Moini URL that `widget_get` showed before the change, or leave the avatar untouched. A wordmark cropped to a circle looks broken.
   - Either way the briefing names the avatar, its URL and the result of the check.

## 5. Typical user requests and content

**Collect 8–12 realistic requests** visitors of *this* website would type for the use case:
- Write them in the visitor's language and register, including one or two vague or sloppy phrasings ("wann habt ihr auf", "was kostet das für 2 erwachsene und ein kind").
- Mix the kinds:
  - plain information (opening hours, prices, contact)
  - questions that need a list or comparison (products, events)
  - a process step (booking, status, handover)
  - **two off-topic questions** the bot should *not* answer

**Map every request to what answers it**:

| Request needs | Build |
|---|---|
| Facts on a page of the site | `ai_resource_add` with the targeted page, not the whole domain. Add `scrapeOptions` when the page is JS-heavy or noisy. |
| Facts that are scattered or hidden in PDFs/images | A `knowledgebase_create` document that sums them up, built **only** from what the site says, scoped with `activeOn`. |
| A list of products or events (**prefer this in a demo**) | An answer template on the agent (`ai_template_create` with preset `products` / `events`). Before creating it, check the images as described in SKILL.md under "Card images": do the detail pages have page-specific OG images (then `imageSource: "og"`)? Are the images landscape (`cover`) or square packshots/logos (`contain`)? |
| Live data (availability, weather, product search) | A webhook action (see SKILL.md, "Standard workflow: webhook AI action"), **only** against a public endpoint that needs no credentials. When it needs a location, resolve it through a geocoding action and never let the model estimate coordinates (SKILL.md, "When the user names the place"). If the integration needs two dependent calls, ask the user to have the demo bot raised to 2 action rounds by moinAI (SKILL.md, "Action rounds"). At least one request of the demo should run through such an action, as agreed in step 1. If none was agreed, name it in the briefing as a "would come through an integration" point. |
| A handover | The existing handover / not-understood quick replies. Do not build a fake live chat. |

**Prefer the slider.** In a demo, any request whose answer is a set of things (products, events, offers, locations, tariffs) should come back as a card slider, not as a markdown list. Make sure at least one, better two, of the showcase questions trigger it. Phrase the template instruction broadly enough to fire for those questions ("Use this template whenever several products, events or offers are listed"), and combine it with the integration where possible: an action whose response fills the cards (`fillMode: "action"`) is the strongest visual moment of a demo.

**Agents**:
- Check `ai_agent_list` first.
- General FAQ content goes to the fallback agent: knowledge scoped `default`/`default`.
- Create a dedicated agent only for a template, an action or rules of its own.
- New agents start deactivated, so set them to `staging`.
- Wait until every resource is `TRAINED` before testing.

Never put credentials of the prospect into a webhook. Never fill gaps with invented data such as prices, dates or product names: a demo that states a wrong price in front of the prospect does more damage than a missing answer.

## 6. Test

Run every request from step 5 through `ai_playground_test` (staging). For each one, check:

- **Classification**: the right agent, or the fallback for FAQ content.
- **Facts**: compare the answer against the source page itself, not against what sounds plausible.
- **Format**: lists or tables render with markdown, and the slider comes back as `cards` where a template should fire.
- **Off-topic**: the bot declines politely (code 101 is correct here).
- **Links**: every link is clickable, either as a markdown link with a meaningful text or as a button. A bare `https://…` in the text, or a button titled with a URL, is a failure (SKILL.md, "Links in answers").
- **Machine values** such as coordinates, stop ids or dates come from an action response, never from the model.

Fix each failure with the tuning loop in SKILL.md: knowledge first, then answer feedback, and instructions only as a last resort. Re-test after every change. Keep a pass/fail list; it goes into the briefing.

Check that the demo has its three showcase moments: the integration executed (the action shows up in the playground response and the answer uses its data), and a slider came back as `cards`. If one is missing, fix it before going on, or tell the user why it is missing.

**Showcase quick replies.** Now pick the **3–4 best tested questions** and add them to the greeting: `basic_cx_update`, element `greeting`, the last message, `quickReplies`.
- **Show the range**: one integration question, one slider question, one or two plain questions. Put the most impressive one first.
- **Label = the question itself.** The label is sent as the user's message, so write it as a full question, at most 50 characters, in the brand's du/Sie: "Welche Events sind am Wochenende?", not "Events".
- **Target**: the agent that answered the question in the test (its intent id from `ai_agent_list`). Questions answered by the fallback agent target the fallback agent.
- **Read it back** with `basic_cx_get`: the last greeting message must list the quick replies with the right targets.
- **Test each one**: send its exact label through `ai_playground_test`. A quick reply that does not reproduce the tested answer is replaced, not kept.

## 7. Briefing for the demo presenter

Finish with a short briefing in the user's language (German for moinAI staff, du-form). It is the only thing the presenter reads before the call, so keep it to one screen:

```markdown
## Demo: <Unternehmen> – <Use Case>

**Bot:** <Name> (`<botId>`), Kanal `<channelId>`
**Stand:** Inhalte in Staging. Für die Live-Vorschau einmal die Content-Bereitstellung im Hub ausführen.
Widget-Design, Avatar und Use Case sind sofort aktiv.

### Eingerichtet
- Use Case, Markdown an, Persona + Kommunikationsregeln (<du/Sie>, <Ton>), <Mehrsprachigkeit an/aus>, Begrüßung + Standardtexte, Widget in <Farben>
- Avatar: <Logo des Unternehmens / bewusst Moini, weil …>, `<absolute URL>`, geprüft: HTTP 200, <PNG 180×180>, kein Redirect<, ⚠ Dateiname mit Build-Hash: vor dem Termin einmal öffnen, für längere Nutzung im Hub hochladen>
- Wissen: <n> Seiten + <n> Dokumente (<Themen>)
- <Agent / Antwortvorlage / Aktion, falls gebaut>

### Showcase
- Integration: <welche Aktion, welche Datenquelle> – Frage: „<Frage>“
- Slider: „<Frage>“ → <z. B. 4 Produkte mit Bild>
- Quick Replies in der Begrüßung: „<QR 1>“, „<QR 2>“, „<QR 3>“

### Diese Fragen zeigen
1. „<Frage>“: <was passiert, z. B. Produkt-Slider mit 4 Produkten>
2. „<Frage>“: <z. B. Tabelle mit Preisen>
3. …(5–8 Fragen, die im Test bestanden haben, in einer sinnvollen Demo-Reihenfolge)

### Gut zu wissen
- Off-Topic: „<Frage>“ wird bewusst abgelehnt, gut für die Frage „erfindet der Bot etwas?“
- Nicht gebaut: <z. B. Live-Verfügbarkeit, käme über eine Integration>
- Bekannte Schwächen: <was im Test nicht bestanden hat, ehrlich>
```

Only list questions that passed the test. A question that works "most of the time" goes under known weaknesses, not into the demo script.
