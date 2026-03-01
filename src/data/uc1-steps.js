/**
 * UC1 — Secure Workforce Use of GenAI
 * Cloudflare One SASE: Gateway (DNS → Network → HTTP), RBI, DLP, Access, AI Gateway, CASB (out-of-band)
 *
 * Enforcement order verified against:
 *   https://developers.cloudflare.com/cloudflare-one/traffic-policies/order-of-enforcement/
 *   DNS policies → Egress policies → Network policies → HTTP policies (Do Not Inspect → Isolate → Allow/Block → DLP/AV)
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
      sublabel: 'WARP, PAC, RBI, WAN, DNS',
      icon: '\u{1F4BB}',
      type: 'user',
      column: 'left',
      product: 'Cloudflare WARP / Connectivity',
      description: 'Employee endpoint connecting to Cloudflare via one of several on-ramp methods: WARP client (preferred, supports DNS/Network/HTTP policies), PAC files (HTTP only), clientless Browser Isolation, agentless DNS filtering, or network-level on-ramps like Cloudflare WAN (GRE/IPsec) and WARP Connector.',
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/networks/connectivity-options/',
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
      id: 'gateway-network',
      label: 'Gateway Network',
      sublabel: 'L4 TCP/UDP policies',
      icon: '\u{1F50C}',
      type: 'cloudflare',
      column: 'center',
      product: 'Cloudflare Gateway',
      description: 'Network-layer (L4) policies evaluated after DNS. Filters TCP/UDP connections by IP, port, and SNI. Can block connections to AI service IPs even if DNS was not used for resolution.',
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
      description: 'HTTP-layer proxy inspects and applies policies to web traffic. Sub-order: Do Not Inspect → Isolate (RBI) → Allow/Block (with sanctioned/unsanctioned app status from the App Library) → DLP/AV scan on request body.',
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
      description: 'Scans outbound request body for sensitive content (PII, source code, credentials, financial data). Evaluated last in the HTTP policy chain — after Allow/Block decisions. Supports AI prompt topic classification. Also scans AI Gateway responses on the return path.',
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
      description: 'Observes and controls AI API calls with logging, rate limiting, and caching. Provides analytics on AI usage patterns. DLP feature scans both prompts and responses for sensitive data.',
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
    // Inline request path
    { id: 'e-emp-dns', from: 'employee', to: 'gateway-dns', label: 'DNS query', direction: 'ltr' },
    { id: 'e-dns-net', from: 'gateway-dns', to: 'gateway-network', label: '', direction: 'ltr' },
    { id: 'e-net-http', from: 'gateway-network', to: 'gateway-http', label: '', direction: 'ltr' },
    { id: 'e-http-rbi', from: 'gateway-http', to: 'rbi', label: 'Isolate?', direction: 'ltr' },
    { id: 'e-rbi-dlp', from: 'rbi', to: 'dlp', label: 'Body scan', direction: 'ltr' },
    { id: 'e-dlp-access', from: 'dlp', to: 'access', label: '', direction: 'ltr' },
    { id: 'e-access-aig', from: 'access', to: 'ai-gateway', label: '', direction: 'ltr' },
    { id: 'e-aig-genai', from: 'ai-gateway', to: 'genai-service', label: '', direction: 'ltr' },
    // Response path
    { id: 'e-genai-aig-resp', from: 'genai-service', to: 'ai-gateway', label: 'Response', direction: 'rtl' },
    { id: 'e-aig-dlp-resp', from: 'ai-gateway', to: 'dlp', label: '', direction: 'rtl' },
    // CASB out-of-band path
    { id: 'e-casb-genai', from: 'casb', to: 'genai-service', label: 'API scan', direction: 'rtl' },
    { id: 'e-casb-dlp', from: 'casb', to: 'dlp', label: 'DLP for files', direction: 'rtl' },
  ],

  steps: [
    // ── Inline request path (steps 1–9) ──
    {
      title: 'Employee sends request',
      product: 'Cloudflare WARP / Connectivity',
      description: 'The employee\'s managed device connects to Cloudflare\'s network via the WARP client (preferred — supports DNS, Network, and HTTP policies).',
      why: 'Multiple connectivity options ensure every device and network can be secured. WARP provides the richest policy support; agentless methods cover unmanaged devices and IoT.',
      activeNodes: ['employee', 'gateway-dns'],
      activeEdges: ['e-emp-dns'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/networks/connectivity-options/',
    },
    {
      title: 'Gateway DNS filtering',
      product: 'Cloudflare Gateway (DNS)',
      description: 'The DNS query hits Gateway\'s DNS resolver first. DNS policies are evaluated against the domain — blocking known unsanctioned AI domains at the DNS layer. However, DNS alone is not sufficient: if a user knows the IP, a TCP connection can still be established independently.',
      why: 'DNS filtering is the fastest first checkpoint for blocking known-bad domains, but must be paired with Network and HTTP policies for complete coverage.',
      activeNodes: ['gateway-dns', 'gateway-network'],
      activeEdges: ['e-dns-net'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/dns-policies/',
    },
    {
      title: 'Network policies evaluated',
      product: 'Cloudflare Gateway (Network)',
      description: 'Network-layer (L4) policies are evaluated next. These filter TCP/UDP connections by destination IP, port, and SNI. Network policies can block connections to AI service IPs even when DNS filtering was bypassed.',
      why: 'Network policies close the gap left by DNS-only filtering. They enforce controls at the transport layer before any HTTP content is exchanged.',
      activeNodes: ['gateway-network', 'gateway-http'],
      activeEdges: ['e-net-http'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/network-policies/',
    },
    {
      title: 'HTTP policies: inspect, isolate, allow/block',
      product: 'Cloudflare Gateway (HTTP)',
      description: 'HTTP-layer inspection begins. The sub-order within HTTP policies is: (1) Do Not Inspect rules checked first, (2) Isolate policies evaluated — high-risk AI tools can be sent to Remote Browser Isolation, (3) Allow/Block decisions with sanctioned vs. unsanctioned app status from the App Library.',
      why: 'HTTP-layer inspection provides the deepest visibility — full URL paths, headers, and application-level controls. The App Library\'s sanctioned/unsanctioned classification lets you enforce granular AI app policies.',
      activeNodes: ['gateway-http', 'rbi'],
      activeEdges: ['e-http-rbi'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/traffic-policies/http-policies/',
    },
    {
      title: 'RBI isolates high-risk sessions',
      product: 'Cloudflare Browser Isolation',
      description: 'For AI tools matched by Isolate policies, Remote Browser Isolation executes the webpage in a secure cloud browser. Admins can disable copy/paste, file uploads/downloads, printing, and keyboard input.',
      why: 'RBI provides a containment layer — users can view AI tools without the risk of data exfiltration through clipboard, downloads, or local browser exploits. It is evaluated as part of Gateway HTTP enforcement.',
      activeNodes: ['rbi', 'gateway-http'],
      activeEdges: ['e-http-rbi'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/policies/gateway/http-policies/isolate-policy/',
    },
    {
      title: 'DLP scans outbound prompt data',
      product: 'Cloudflare DLP',
      description: 'Data Loss Prevention scans the outbound request body — the last step in HTTP policy enforcement. Detects PII, source code, credentials, financial information, and malicious intent (jailbreak attempts). AI Prompt Protection provides content and intent analysis.',
      why: 'DLP is the final gatekeeper before data leaves the corporate boundary. It prevents employees from accidentally or intentionally sharing sensitive data with external AI services.',
      activeNodes: ['dlp', 'access'],
      activeEdges: ['e-rbi-dlp', 'e-dlp-access'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/data-loss-prevention/',
    },
    {
      title: 'Access verifies identity',
      product: 'Cloudflare Access',
      description: 'Identity is verified through your configured identity provider (OIDC/SAML). Access policies apply to SaaS apps (Access for SaaS) or self-hosted/private apps. Per-user and per-group rules determine which AI tools each employee can access.',
      why: 'Identity-aware policies ensure only authorized users with appropriate roles can access specific AI tools. Gateway Allow does not bypass Access policies — both must pass.',
      activeNodes: ['access', 'ai-gateway'],
      activeEdges: ['e-access-aig'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/policies/access/',
    },
    {
      title: 'AI Gateway logs API calls',
      product: 'Cloudflare AI Gateway',
      description: 'AI Gateway logs, rate-limits, and optionally caches AI API calls. Provides observability into prompt/response patterns, costs, and usage analytics.',
      why: 'Centralized visibility and control over all AI API interactions, with cost tracking, rate limiting to prevent abuse, and caching to optimize repeated queries.',
      activeNodes: ['ai-gateway', 'genai-service'],
      activeEdges: ['e-aig-genai'],
      docsUrl: 'https://developers.cloudflare.com/ai-gateway/',
    },
    {
      title: 'Request reaches GenAI service',
      product: 'GenAI Provider',
      description: 'The policy-evaluated, DLP-scanned request reaches the external or self-hosted GenAI service (ChatGPT, Claude, Gemini, etc.). The AI model processes the prompt and returns a response.',
      why: 'After passing through all Cloudflare security controls, the request is safe or allowed to forward — sensitive data has been detected and policy enforced at every layer.',
      activeNodes: ['genai-service'],
      activeEdges: [],
    },
    // ── Response path (step 10) ──
    {
      title: 'AI Gateway DLP scans response',
      product: 'Cloudflare AI Gateway (DLP)',
      description: 'The response from the GenAI service returns through AI Gateway. AI Gateway\'s DLP feature scans responses for sensitive data. The scanned response passes through the DLP engine for detection and policy enforcement before returning to the employee.',
      why: 'AI models can inadvertently return sensitive data from their training or context. Response-path DLP ensures no unexpected data leakage reaches the employee.',
      activeNodes: ['genai-service', 'ai-gateway', 'dlp', 'employee'],
      activeEdges: ['e-genai-aig-resp', 'e-aig-dlp-resp'],
      docsUrl: 'https://developers.cloudflare.com/ai-gateway/features/dlp/',
    },
    // ── Out-of-band: CASB (steps 11–12) ──
    {
      title: 'CASB scans SaaS posture (out-of-band)',
      product: 'Cloudflare CASB',
      description: 'Separately from the inline request path, CASB operates out-of-band via agentless API integrations with GenAI platforms — ChatGPT, Claude, and Gemini. It scans for security misconfigurations, unauthorized user activity, shadow IT, excessive sharing, and GenAI-specific risks (e.g. publicly shared GPTs, capability activation, stale API keys).',
      why: 'CASB provides asynchronous posture management — detecting misconfigurations and risky sharing settings in GenAI tools without adding latency to live user requests. No endpoint software is required; connect via API and get findings within minutes.',
      activeNodes: ['casb', 'genai-service'],
      activeEdges: ['e-casb-genai'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/cloud-and-saas-findings/',
    },
    {
      title: 'CASB + DLP scans for sensitive data in SaaS',
      product: 'Cloudflare CASB + DLP',
      description: 'CASB integrates with DLP to detect sensitive data in uploaded chat attachments or files within GenAI platforms. Configure DLP profiles with detection patterns (PII, credentials, financial data, source code), then attach them to CASB integrations. Scanning of prompt content is coming soon.',
      why: 'Employees may upload documents, spreadsheets, or code files to AI chat sessions that contain sensitive data. CASB + DLP finds this data at rest in uploaded attachments — complementing the inline DLP that protects data in motion.',
      activeNodes: ['casb', 'dlp'],
      activeEdges: ['e-casb-dlp'],
      docsUrl: 'https://developers.cloudflare.com/cloudflare-one/cloud-and-saas-findings/casb-dlp/',
    },
  ],
};
