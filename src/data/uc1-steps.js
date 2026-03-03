/**
 * UC1 — Secure Workforce Use of GenAI
 * Cloudflare One SASE: Gateway (DNS → Egress → Network → HTTP), RBI, DLP, Access, AI Gateway, CASB (out-of-band)
 *
 * Two user types:
 *   1. General Employees — Use GenAI via browser (ChatGPT, Claude web UI, etc.)
 *   2. Developers — Use AI coding assistants (OpenCode, Cursor, etc.) that make API calls through AI Gateway
 *
 * Both go through Cloudflare One (Gateway DNS → Egress → Network → HTTP → DLP → Access).
 * Developers additionally route their AI API calls through AI Gateway for rate limiting, caching, guardrails, and DLP.
 *
 * Enforcement order verified against:
 *   https://developers.cloudflare.com/cloudflare-one/traffic-policies/order-of-enforcement/
 *   DNS policies → Egress policies → Network policies → HTTP policies (Do Not Inspect → Isolate → Allow/Block → DLP/AV)
 *
 * AI Gateway features:
 *   https://developers.cloudflare.com/ai-gateway/features/
 *   Rate limiting, caching, guardrails (toxicity, jailbreak, PII), DLP (prompts + responses), dynamic routing
 *
 * CASB is API-driven / out-of-band and does NOT operate inline on request traffic.
 *   https://developers.cloudflare.com/cloudflare-one/cloud-and-saas-findings/
 * CASB + DLP integration scans files stored in SaaS apps (not live traffic).
 *   https://developers.cloudflare.com/cloudflare-one/cloud-and-saas-findings/casb-dlp/
 */

export const uc1 = {
  id: 'uc1',
  title: 'Secure Workforce Use of GenAI',
  subtitle: 'Discover and control how employees interact with GenAI tools',

  nodes: [
    // Left column — Origins
    {
      id: 'employee',
      label: 'Employee Device',
      sublabel: 'WARP, PAC, RBI, WAN, Appliance, DNS',
      icon: '\u{1F4BB}',
      type: 'user',
      column: 'left',
      product: 'Cloudflare WARP / Connectivity',
      description: 'Employee endpoint connecting to Cloudflare via one of several on-ramp methods: WARP client (preferred, supports DNS/Network/HTTP policies), PAC files (HTTP only), clientless Browser Isolation, agentless DNS filtering, or network-level on-ramps like WARP Connector, Cloudflare WAN (formerly called Magic WAN) via GRE/IPsec tunnels and Cloudflare One Appliance (formerly called Magic WAN Connector).',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/networks/connectivity-options/',
    },
    {
      id: 'developer',
      label: 'Developer',
      sublabel: 'AI coding assistants',
      icon: '\u{1F468}\u{200D}\u{1F4BB}',
      type: 'user',
      column: 'left',
      product: 'AI Gateway for Developers',
      description: 'Software engineers using AI coding assistants (OpenCode, Cursor, Claude Code, etc.). Developers route through Cloudflare One with an on-ramp method that supports HTTP policies (optimally WARP client). When their AI coding tool is configured to use AI Gateway\'s OpenAI-compatible endpoint as the base URL (a one-line change), they gain rate limiting, caching, guardrails, DLP on prompts and responses, and usage analytics (tokens, latency, etc.).',
      docsUrl: 'https://developers.cloudflare.com/ai-gateway/',
    },
    // Center column — Cloudflare stack (in enforcement order)
    {
      id: 'gateway-dns',
      label: 'Gateway DNS',
      sublabel: 'DNS filtering',
      icon: '\u{1F310}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare Gateway',
      description: 'DNS-layer filtering evaluates policies against domain queries. Blocks or allows DNS resolution for AI SaaS domains. Note: DNS filtering alone does not prevent access if the user knows the IP — pair with Network and HTTP policies for full coverage.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/dns-policies/',
    },
    {
      id: 'egress',
      label: 'Egress Policies',
      sublabel: 'Source IP control',
      icon: '\u{1F6EB}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare Gateway (Egress)',
      description: 'Egress policies control which source IP is used for outbound traffic. Dedicated egress IPs let you allowlist Cloudflare traffic in SaaS AI providers.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/egress-policies/',
    },
    {
      id: 'gateway-network',
      label: 'Gateway Network',
      sublabel: 'L4 TCP/UDP policies',
      icon: '\u{1F50C}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare Gateway',
      description: 'Network-layer (L4) policies evaluated after egress. Filters TCP/UDP connections by IP, port, and SNI. Can block connections to AI service IPs even if DNS was not used for resolution.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/network-policies/',
    },
    {
      id: 'gateway-http',
      label: 'Gateway HTTP',
      sublabel: 'HTTP policy evaluation',
      icon: '\u{1F6E1}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare Gateway',
      description: 'HTTP-layer proxy inspects and applies policies to web traffic. Sub-order: Do Not Inspect → Isolate (RBI) → Allow/Block (with sanctioned/unsanctioned status from the App Library + Confidence Scores) → DLP/AV scan on request body. Shadow AI discovery surfaces unapproved AI tool usage.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/http-policies/',
    },
    {
      id: 'rbi',
      label: 'Browser Isolation',
      sublabel: 'Remote Browser Isolation',
      icon: '\u{1F5A5}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare Browser Isolation',
      description: 'Part of Gateway HTTP enforcement. Isolate policies are evaluated second (after Do Not Inspect). For high-risk or unmanaged AI tools, RBI executes the page in a secure cloud browser. Can disable copy/paste, uploads/downloads, and keyboard input.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/policies/gateway/http-policies/isolate-policy/',
    },
    {
      id: 'dlp',
      label: 'DLP',
      sublabel: 'Data Loss Prevention',
      icon: '\u{1F50D}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare DLP',
      description: 'Scans outbound request body for sensitive content. Evaluated last in the HTTP policy chain. AI Prompt Protection classifies prompts by content (PII, source code, credentials, financial data) and intent (jailbreak, malicious code). Full prompt logging available.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/data-loss-prevention/',
    },
    {
      id: 'access',
      label: 'Access',
      sublabel: 'Identity & IdP integration',
      icon: '\u{1F512}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare Access',
      description: 'Zero Trust identity verification via OIDC/SAML. Applies to SaaS apps (Access for SaaS) or self-hosted/private apps behind Access. Gateway Allow does not bypass Access policies.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/policies/access/',
    },
    {
      id: 'ai-gateway',
      label: 'AI Gateway',
      sublabel: 'Logging, rate limiting, caching',
      icon: '\u{2699}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare AI Gateway',
      description: 'Observes and controls AI API calls with logging, rate limiting, and caching. Provides analytics on AI usage patterns. DLP scans both prompts and responses. Usage data feeds the AI Security Report dashboard.',
      docsUrl: 'https://developers.cloudflare.com/ai-gateway/',
    },
    // Right column — Destinations
    {
      id: 'genai-service',
      label: 'GenAI Provider',
      sublabel: 'ChatGPT, Claude, Gemini, etc.',
      icon: '\u{1F916}',
      type: 'ai-service',
      column: 'right',
      description: 'Third-party generative AI services like OpenAI ChatGPT, Anthropic Claude, Google Gemini, and Perplexity.',
    },
    // Out-of-band — CASB (shown separately)
    {
      id: 'casb',
      label: 'CASB',
      sublabel: 'API-driven SaaS scanning',
      icon: '\u{1F441}',
      type: 'cloudflare',
      column: 'right',
      product: 'Cloudflare CASB',
      description: 'API-driven, out-of-band scanner. Integrates with GenAI platforms (ChatGPT, Claude, Gemini) via agentless API connections to scan for misconfigurations, unauthorized user activity, shadow IT, and data exposure. Integrates with DLP to detect sensitive data in uploaded chat attachments or files. Operates asynchronously — not inline on request traffic.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/cloud-and-saas-findings/',
    },
  ],

  edges: [
    // Inline request path — Employee
    { id: 'e-emp-dns', from: 'employee', to: 'gateway-dns', label: 'DNS, Network & HTTPS', direction: 'ltr' },
    // Inline request path — Developer (same Cloudflare One stack)
    { id: 'e-dev-dns', from: 'developer', to: 'gateway-dns', label: '', direction: 'ltr' },
    { id: 'e-dns-egress', from: 'gateway-dns', to: 'egress', label: '', direction: 'ltr' },
    { id: 'e-egress-net', from: 'egress', to: 'gateway-network', label: '', direction: 'ltr' },
    { id: 'e-net-http', from: 'gateway-network', to: 'gateway-http', label: '', direction: 'ltr' },
    { id: 'e-http-rbi', from: 'gateway-http', to: 'rbi', label: 'Isolate?', direction: 'ltr' },
    { id: 'e-rbi-dlp', from: 'rbi', to: 'dlp', label: 'Body scan', direction: 'ltr' },
    { id: 'e-dlp-access', from: 'dlp', to: 'access', label: '', direction: 'ltr' },
    { id: 'e-access-aig', from: 'access', to: 'ai-gateway', label: '', direction: 'ltr' },
    { id: 'e-aig-genai', from: 'ai-gateway', to: 'genai-service', label: '', direction: 'ltr' },
    // Response path — Employee
    { id: 'e-genai-aig-resp', from: 'genai-service', to: 'ai-gateway', label: 'Response', direction: 'rtl' },
    { id: 'e-aig-dlp-resp', from: 'ai-gateway', to: 'dlp', label: '', direction: 'rtl' },
    { id: 'e-dlp-emp-resp', from: 'dlp', to: 'employee', label: '', direction: 'rtl' },
    // Response path — Developer (AI Gateway direct response)
    { id: 'e-aig-dev-resp', from: 'ai-gateway', to: 'developer', label: '', direction: 'rtl' },
    // CASB out-of-band path
    { id: 'e-casb-genai', from: 'casb', to: 'genai-service', label: 'API scan', direction: 'rtl' },
    { id: 'e-casb-dlp', from: 'casb', to: 'dlp', label: 'DLP for files', direction: 'rtl' },
  ],

  steps: [
    // ── Inline request path (steps 1–10) ──
    {
      title: 'Employees & Developers connect',
      product: 'Cloudflare WARP / Connectivity',
      description: 'All employees\' managed devices connect to Cloudflare\'s network via the WARP client (preferred — supports DNS, Network, and HTTP policies). This includes developers using AI coding assistants (OpenCode, Cursor, Claude Code) — their web traffic and AI API calls both route through Cloudflare One.',
      why: 'Every employee — including software engineers using AI coding tools — connects through a Cloudflare One on-ramp. This ensures consistent security policies across all workforce AI usage, whether browsing ChatGPT or using an AI coding assistant.',
      activeNodes: ['employee', 'developer', 'gateway-dns'],
      activeEdges: ['e-emp-dns', 'e-dev-dns'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/networks/connectivity-options/',
    },
    {
      title: 'Gateway DNS filtering',
      product: 'Cloudflare Gateway (DNS)',
      description: 'The DNS query hits Gateway\'s DNS resolver first. DNS policies block or allow resolution for AI SaaS domains. DNS alone is not sufficient — must be paired with Network and HTTP policies.',
      why: 'DNS filtering is the fastest first checkpoint for blocking known-bad domains, but must be paired with Network and HTTP policies for complete coverage.',
      activeNodes: ['gateway-dns', 'egress'],
      activeEdges: ['e-dns-egress'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/dns-policies/',
    },
    {
      title: 'Egress policies assign source IP',
      product: 'Cloudflare Gateway (Egress)',
      description: 'Egress policies select which source IP is used for outbound connections. Dedicated egress IPs can be allowlisted in AI SaaS providers or self-hosted apps to ensure traffic is only accepted from Cloudflare.',
      why: 'Dedicated egress IPs let you enforce that AI SaaS apps only accept traffic originating from your Cloudflare tenant — closing off direct-access bypasses.',
      activeNodes: ['egress', 'gateway-network'],
      activeEdges: ['e-egress-net'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/egress-policies/',
    },
    {
      title: 'Network policies evaluated',
      product: 'Cloudflare Gateway (Network)',
      description: 'Network-layer (L4) policies filter TCP/UDP connections by destination IP, port, and SNI. Can block connections to AI service IPs even when DNS was bypassed.',
      why: 'Network policies close the gap left by DNS-only filtering. They enforce controls at the transport layer before any HTTP content is exchanged.',
      activeNodes: ['gateway-network', 'gateway-http'],
      activeEdges: ['e-net-http'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/network-policies/',
    },
    {
      title: 'HTTP policies: inspect, isolate, allow/block',
      product: 'Cloudflare Gateway (HTTP)',
      description: 'HTTP-layer inspection begins. Sub-order: (1) Do Not Inspect, (2) Isolate (RBI), (3) Allow/Block using app status from the App Library and Application Confidence Scores. Shadow AI discovery surfaces unapproved AI tool usage in the AI security report.',
      why: 'HTTP-layer inspection provides the deepest visibility — full URL paths, headers, and application-level controls. Confidence Scores automate risk assessment of AI apps at scale.',
      activeNodes: ['gateway-http', 'rbi'],
      activeEdges: ['e-http-rbi'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/http-policies/',
      owasp: ['LLM02:2025 Sensitive Information Disclosure', 'LLM06:2025 Excessive Agency'],
    },
    {
      title: 'RBI isolates high-risk sessions',
      product: 'Cloudflare Browser Isolation',
      description: 'For AI tools matched by Isolate policies, Remote Browser Isolation executes the webpage in a secure cloud browser. Admins can disable copy/paste, file uploads/downloads, printing, and keyboard input.',
      why: 'RBI provides a containment layer — users can view AI tools without the risk of data exfiltration through clipboard, downloads, or local browser exploits. It is evaluated as part of Gateway HTTP enforcement.',
      activeNodes: ['rbi', 'gateway-http'],
      activeEdges: ['e-http-rbi'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/policies/gateway/http-policies/isolate-policy/',
      owasp: ['LLM02:2025 Sensitive Information Disclosure'],
    },
    {
      title: 'DLP + AI Prompt Protection',
      product: 'Cloudflare DLP',
      description: 'DLP scans outbound request bodies — last in HTTP enforcement. AI Prompt Protection classifies prompts by content (PII, source code, credentials, financial data) and intent (jailbreak, malicious code, PII extraction). Full prompt logging available for forensics.',
      why: 'DLP is the final gatekeeper before data leaves the corporate boundary. Topic-based classification lets you build granular per-group policies — e.g. block engineering from sharing source code with AI but allow HR to query PII.',
      activeNodes: ['dlp', 'access'],
      activeEdges: ['e-rbi-dlp', 'e-dlp-access'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/data-loss-prevention/',
      owasp: ['LLM01:2025 Prompt Injection', 'LLM02:2025 Sensitive Information Disclosure', 'ASI01 Agent Goal Hijack'],
    },
    {
      title: 'Access verifies identity',
      product: 'Cloudflare Access',
      description: 'Identity is verified through your configured identity provider (OIDC/SAML). Access policies apply to SaaS apps (Access for SaaS) or self-hosted/private apps. Per-user and per-group rules determine which AI tools each employee can access.',
      why: 'Identity-aware policies ensure only authorized users with appropriate roles can access specific AI tools. Gateway Allow does not bypass Access policies — both must pass.',
      activeNodes: ['access', 'ai-gateway'],
      activeEdges: ['e-access-aig'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/policies/access/',
      owasp: ['LLM06:2025 Excessive Agency'],
    },
    {
      title: 'AI Gateway logs API calls',
      product: 'Cloudflare AI Gateway',
      description: 'AI Gateway logs, rate-limits, and caches AI API calls. For developers using AI coding assistants (OpenCode, Cursor, Claude Code), these benefits apply when the tool has been configured to route requests through AI Gateway\'s OpenAI-compatible endpoint — a one-line base URL change. Provides observability into prompt/response patterns, costs, and usage analytics. Feeds data into the AI Security Report dashboard.',
      why: 'Centralized visibility and control over all AI API interactions, with cost tracking, rate limiting to prevent abuse, and caching to optimize repeated queries. Developers benefit from AI Gateway when their coding tools are configured to use AI Gateway\'s unified endpoint as the base URL.',
      activeNodes: ['ai-gateway', 'genai-service'],
      activeEdges: ['e-aig-genai'],
      docsUrl: 'https://developers.cloudflare.com/ai-gateway/',
      owasp: ['LLM02:2025 Sensitive Information Disclosure', 'LLM10:2025 Unbounded Consumption', 'ASI02 Tool Misuse & Exploitation'],
    },
    {
      title: 'Request reaches GenAI service',
      product: 'GenAI Provider',
      description: 'The policy-evaluated, DLP-scanned request reaches the external or self-hosted GenAI service (ChatGPT, Claude, Gemini, etc.). The AI model processes the prompt and returns a response.',
      why: 'After passing through all Cloudflare security controls, the request is safe or allowed to forward — sensitive data has been detected and policy enforced at every layer.',
      activeNodes: ['genai-service'],
      activeEdges: [],
    },
    // ── Response path (steps 11–12) ──
    {
      title: 'AI Gateway DLP scans response',
      product: 'Cloudflare AI Gateway (DLP)',
      description: 'The response from the GenAI service returns through AI Gateway. AI Gateway\'s DLP feature scans responses for sensitive data. The scanned response passes through the DLP engine for detection and policy enforcement.',
      why: 'AI models can inadvertently return sensitive data from their training or context. Response-path DLP ensures no unexpected data leakage reaches the employee or developer.',
      activeNodes: ['genai-service', 'ai-gateway', 'dlp'],
      activeEdges: ['e-genai-aig-resp', 'e-aig-dlp-resp'],
      docsUrl: 'https://developers.cloudflare.com/ai-gateway/features/dlp/',
      owasp: ['LLM02:2025 Sensitive Information Disclosure'],
    },
    {
      title: 'Response delivered to users',
      product: 'Cloudflare One + AI Gateway',
      description: 'The scanned, policy-evaluated response is delivered back to both employees (via DLP) and developers (from AI Gateway). The complete round-trip was secured: every layer of Cloudflare One inspected, logged, and enforced policy on both the request and response.',
      why: 'Full round-trip security ensures that both outbound prompts and inbound AI responses are protected. Every user — whether browsing ChatGPT or using an AI coding assistant — receives a clean response that has passed through DLP scanning.',
      activeNodes: ['dlp', 'ai-gateway', 'employee', 'developer'],
      activeEdges: ['e-dlp-emp-resp', 'e-aig-dev-resp'],
    },
    // ── Out-of-band: CASB (steps 13–14) ──
    {
      title: 'CASB scans SaaS posture (out-of-band)',
      product: 'Cloudflare CASB',
      description: 'Separately from the inline request path, CASB operates out-of-band via agentless API integrations with GenAI platforms — ChatGPT, Claude, and Gemini. It scans for security misconfigurations, unauthorized user activity, shadow IT, excessive sharing, and GenAI-specific risks (e.g. publicly shared GPTs, capability activation, stale API keys).',
      why: 'CASB provides asynchronous posture management — detecting misconfigurations and risky sharing settings in GenAI tools without adding latency to live user requests. No endpoint software is required; connect via API and get findings within minutes.',
      activeNodes: ['casb', 'genai-service'],
      activeEdges: ['e-casb-genai'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/cloud-and-saas-findings/',
      owasp: ['LLM02:2025 Sensitive Information Disclosure'],
    },
    {
      title: 'CASB + DLP scans for sensitive data in SaaS',
      product: 'Cloudflare CASB + DLP',
      description: 'CASB integrates with DLP to detect sensitive data in uploaded chat attachments or files within GenAI platforms. Configure DLP profiles with detection patterns (PII, credentials, financial data, source code), then attach them to CASB integrations. Scanning of prompt content is coming soon.',
      why: 'Employees may upload documents, spreadsheets, or code files to AI chat sessions that contain sensitive data. CASB + DLP finds this data at rest in uploaded attachments — complementing the inline DLP that protects data in motion.',
      activeNodes: ['casb', 'dlp'],
      activeEdges: ['e-casb-dlp'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/cloud-and-saas-findings/casb-dlp/',
      owasp: ['LLM02:2025 Sensitive Information Disclosure'],
    },
  ],
};
