# Cloudflare AI Security Visual Demo

## Project Overview

Interactive visual demo of 4 Cloudflare AI security use cases deployed as a purely static site via Cloudflare Workers Static Assets. Vanilla HTML/CSS/JS with ES modules — no build step, no frameworks.

## Key Architecture Decisions

- **Static-only deployment**: No Worker script (`main`) is configured. Wrangler serves the `src/` directory directly from Cloudflare's edge via the `assets.directory` setting.
- **Vanilla JS with ES modules**: All component JS uses `export`/`import` syntax loaded via `<script type="module">`.
- **Modular data-driven design**: Each use case is defined by a data file (`src/data/ucN-steps.js`) containing nodes, edges, and steps. The shared `FlowEngine` renders any data file without modification.

## Project Structure

```
src/
  index.html                          Landing page
  use-cases/                          One HTML file per use case
  components/                         Shared JS components (flow-engine, tooltip, legend)
  styles/                             CSS (base, theme, diagram)
  data/                               Step definitions per use case
wrangler.jsonc                        Workers Static Assets config
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development via `wrangler dev` |
| `npm start` | Alias for `npm run dev` |
| `npm run deploy` | Deploy to Cloudflare Workers Static Assets |

## Cloudflare Workers Static Assets

This project uses [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) — the recommended way to deploy static sites on Cloudflare. Key docs:

- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/

For a purely static site, only `assets.directory` is needed in `wrangler.jsonc`. No `main` entry point or Worker script is required.

## Adding a New Use Case

1. Create `src/data/ucN-steps.js` exporting `{ id, title, subtitle, nodes, edges, steps }`
2. Create `src/use-cases/ucN-name.html` following the pattern of existing UC pages
3. Add a card to `src/index.html`
4. No changes needed to `flow-engine.js`, `tooltip.js`, or `legend.js`

## Product Accuracy (MANDATORY)

All Cloudflare product names, capabilities, and beta/coming-soon statuses **must** be verified against the Cloudflare Developer Documentation before writing or modifying any code, data, or copy. This is a hard requirement — not optional.

### Verification workflow

1. **Before every change** involving a Cloudflare product, feature, or capability, query the `cloudflare-docs` MCP server using `cloudflare-docs_search_cloudflare_documentation` with a relevant search term (e.g. "AI Gateway DLP", "CASB integrations", "Firewall for AI").
2. **Cross-reference** the MCP results with the official docs site at https://developers.cloudflare.com/ — fetch specific pages with `webfetch` when the MCP snippet is insufficient.
3. **Mark features accurately**: "Coming Soon" if not yet available, "Beta" if the docs say beta/early access, "closed beta" + plan requirement if restricted. Never present unreleased capabilities as GA.
4. **Do not hallucinate** product capabilities. If the docs do not confirm a feature, do not include it.
5. **After making changes**, re-verify by searching the docs again to confirm the final text matches the current state of the product.

## UC1 Enforcement Order (verified)

UC1 ("Secure Workforce Use of GenAI") follows the documented Gateway enforcement order.

**Inline request path (steps 1–9):**

1. **Employee device** → Multiple connectivity options: WARP (preferred), PAC files, clientless RBI, agentless DNS, Cloudflare WAN, WARP Connector
2. **Gateway DNS** → DNS filtering (first checkpoint, but standalone — must pair with HTTP)
3. **Gateway Network** → L4 TCP/UDP policies (closes DNS bypass gap)
4. **Gateway HTTP** → Do Not Inspect → Isolate (RBI) → Allow/Block (sanctioned/unsanctioned via App Library)
5. **RBI** → Isolate policies render in secure cloud browser (part of HTTP enforcement)
6. **DLP** → Scans outbound request body (last in HTTP policy chain)
7. **Access** → Identity verification (OIDC/SAML), applies to SaaS or self-hosted apps
8. **AI Gateway** → Logging, rate limiting, caching of AI API calls
9. **GenAI service** → Request reaches external AI provider

**Response path (step 10):**

10. **AI Gateway DLP (Beta)** → Scans response for sensitive data, routes through DLP node

**Out-of-band CASB (steps 11–12):**

11. **CASB** → Agentless API integrations with ChatGPT, Claude, Gemini — posture scanning (misconfigs, shadow IT, GenAI-specific risks)
12. **CASB + DLP** → Detects sensitive data in uploaded chat attachments or files within GenAI platforms (prompt scanning coming soon)

Key corrections made:
- Added Gateway Network policies (were missing entirely)
- RBI is part of Gateway HTTP enforcement, not a separate post-CASB step
- DLP is last in HTTP enforcement chain, not between Access and CASB
- CASB is out-of-band/API-driven, separated as its own flow section at end of steps (NOT inline)
- CASB + DLP integration for scanning files at rest added as final step
- Sanctioned/unsanctioned app classification is a Gateway HTTP feature (App Library), not CASB
- Response DLP is via AI Gateway DLP (Beta), routes through DLP node
- Step 1 expanded with full connectivity options from docs

Edge label fixes applied:
- `e-aig-dlp-resp` label removed (was "DLP scan") — this same-column skip edge from `ai-gateway` back to `dlp` caused the label to overlap the `access` node. Step 10 text explains the DLP scan sufficiently.
- `e-http-dlp` was previously replaced with sequential `e-rbi-dlp` (rbi → dlp, "Body scan") to fix the same type of collision.

Viewport fit:
- Center column uses `justify-content: space-between` to auto-distribute nodes within available viewport height
- Node sizes reduced (min-height 40-50px, tighter padding) to fit up to 8 center-column nodes (UC4) without scrolling on desktop
- `has-labeled-edge` margin reduced to prevent excessive gaps
- Tablet breakpoint (≤1024px) overrides back to `flex-start` since vertical stacking allows natural scrolling

## UC2 Flow Order (verified)

UC2 ("Govern AI Agents & MCP") covers securing agentic AI communication — AI agents accessing tools/resources via MCP protocol through Cloudflare.

**Request path (steps 1–7):**

1. **AI Agent / LLM** → External AI agent or orchestrator initiates MCP tool call
2. **MCP Client** → Translates agent intent into MCP protocol request
3. **Cloudflare Access** → Identity verification (mTLS, service tokens) for machine-to-machine auth
4. **MCP Server Portal** → Cloudflare-hosted MCP server portal (open beta, all plans) — discovery, routing, logging
5. **Gateway HTTP + DLP** → Inline inspection of MCP payloads, DLP scans for sensitive data in tool calls
6. **DLP for MCP** → Coming Soon — dedicated DLP scanning for MCP server portal traffic
7. **MCP Remote Server** → Request reaches the target tool/resource server

**Response path (steps 8–9):**

8. **MCP Remote Server → MCP Server Portal** → Response returns through portal with logging
9. **MCP Server Portal → AI Agent** → Final response delivered to agent/LLM

Key product notes:
- MCP Server Portals: open beta, all plans
- DLP for MCP Server Portals: Coming Soon (uses `coming-soon` node type in diagram)
- Gateway HTTP provides inline inspection of MCP protocol traffic

## UC3 Flow Order (verified)

UC3 ("Build Securely with AI") covers developers and applications using AI Gateway to securely call LLM providers.

**Dual origin architecture:** Two left-column nodes feed into AI Gateway:
1. **Application / Agent** — programmatic API calls from your app
2. **Employee Developer** — AI coding assistants (Copilot, Cursor, Claude Code)

Both integrate via a **single unified endpoint** — one base URL change (one line of code).

**AI Gateway pipeline (steps 1–6, request path):**

1. **Origins → AI Gateway Endpoint** → Both origins send requests to AI Gateway unified endpoint (OpenAI-compatible /chat/completions)
2. **Rate Limiting** → Per-user/per-model rate limits to control costs and prevent abuse
3. **Caching** → Exact-match caching to reduce redundant LLM calls
4. **Guardrails (Beta)** → Content filtering, toxicity, jailbreak, PII detection on prompts
5. **DLP (Beta)** → AI Gateway DLP scans outbound prompts for sensitive data
6. **Dynamic Routing (Beta)** → Conditional routing, A/B testing, rate/budget limits, automatic fallback across multiple providers (OpenAI, Anthropic, Google AI, Workers AI)

**LLM processing (step 7):**

7. **LLM Provider** → Request reaches selected provider

**Response path (steps 8–10):**

8. **DLP Response Scan (Beta)** → AI Gateway DLP scans LLM response for sensitive data (PII, credentials, proprietary information generated by the model)
9. **Workers Middleware** → Optional post-processing (formatting, redaction, logging, analytics)
10. **Response → Application** → Final response returned to the originating app

Key product notes:
- AI Gateway Guardrails, DLP, Dynamic Routing: Beta
- DLP scans BOTH prompts (outbound) AND responses (inbound) per docs
- Dynamic Routing supports conditional logic, A/B percentage splits, per-key rate/budget limits, automatic fallback
- Workers middleware is optional (for response transformation)
- Right column shows 5 LLM providers (OpenAI, Anthropic, Google AI, Workers AI, Other GenAI) to illustrate Dynamic Routing fan-out

## UC4 Flow Order (verified)

UC4 ("Protect AI-Powered Apps") covers protecting YOUR AI-powered application from external threats via Cloudflare's reverse proxy.

**Dual origin threat model:** Two left-column nodes represent traffic sources:
1. **End User** — legitimate users of your AI-powered app
2. **Attacker** — malicious actors attempting prompt injection, model theft, abuse

**Security stack (steps 1–10):**

1. **External requests → Cloudflare Edge** → All traffic (legitimate and malicious) hits Cloudflare's edge
2. **DDoS Protection** → Volumetric attack mitigation (always-on, L3/L4/L7)
3. **Bot Management** → ML-based bot detection, JS fingerprinting, behavioral analysis
4. **WAF** → Managed rulesets, custom rules, OWASP protection
5. **Rate Limiting** → Configurable rate limits per endpoint/IP/session
6. **Firewall for AI** → Prompt injection detection, topic restriction, PII redaction (closed beta, Enterprise)
7. **API Shield** → Schema validation, mTLS, sequence enforcement for AI API endpoints
8. **Your AI Application** → Clean requests reach your origin AI app
9. **Security Analytics** → Centralized logging/dashboard for all security events (Cloudflare product, center column)
10. **Response to End User** → Insights loop back; response delivered

Key product notes:
- Firewall for AI: closed beta, Enterprise only
- Security Analytics is a Cloudflare product (rendered in center column, not origin column)
- The flow emphasizes Cloudflare as a reverse proxy protecting the origin

## Design Tokens

- Primary: `#F38020` (Cloudflare orange)
- Background: `#0d1117` (dark)
- Node types: `user` `#3B82F6` | `cloudflare` `#F38020` | `ai` `#10B981` | `resource` `#8B5CF6` | `coming-soon` dashed border, muted
- Font: Inter / system-sans

## Additional Project Files

- `visual-inspiration/` — 7 reference PNG images used as design inspiration for the flow diagrams
- `.editorconfig` — Editor formatting rules
- `.vscode/settings.json` — VS Code workspace settings
