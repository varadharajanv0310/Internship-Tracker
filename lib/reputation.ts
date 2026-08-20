/**
 * "Reputed company" is a judgement call, so it lives in one editable list
 * rather than being inferred. A role is kept only if its company matches here
 * or is on the tier-1 priority list.
 *
 * The bar used: companies you would name in an interview — global tech,
 * established product companies, funded startups with a real engineering
 * brand, major finance/quant desks, and large enterprises with real India
 * engineering centres. It deliberately excludes the long tail of unknown
 * consultancies and training shops that flood Internshala and Unstop.
 *
 * To add a company: put its name (or a distinctive word from it) in the right
 * group below. Matching is word-boundary and case-insensitive, so "Razorpay"
 * also matches "Razorpay Software Private Limited".
 */
import { norm } from "./normalize";
import { TIER1_COMPANIES } from "./profile";

export const REPUTED_COMPANIES: string[] = [
  // ---- Big tech / global platforms
  "Google", "Alphabet", "DeepMind", "Microsoft", "Amazon", "AWS", "Apple",
  "Meta", "Facebook", "Netflix", "NVIDIA", "Intel", "AMD", "Qualcomm",
  "Adobe", "Salesforce", "Oracle", "IBM", "SAP", "Cisco", "Dell", "HP",
  "Hewlett Packard Enterprise", "Samsung", "Sony", "LG Electronics",
  "Uber", "Lyft", "Airbnb", "Booking", "Priceline", "Expedia", "Tripadvisor",
  "PayPal", "Stripe", "Block", "Square", "Shopify", "Zoom", "Slack",
  "Atlassian", "ServiceNow", "Workday", "Snowflake", "Databricks", "Palantir",
  "Intuit", "Electronic Arts", "EA", "Ubisoft", "Activision", "Riot Games",
  "Take-Two", "Zynga", "Nintendo", "eBay", "Yahoo", "Dropbox", "Box",
  "Zendesk", "HubSpot", "Intercom", "Amplitude", "Braze", "Klaviyo",
  "Auth0", "Vercel", "Netlify", "Supabase", "Firebase", "Segment",
  "Twilio", "Cloudflare", "MongoDB", "Confluent", "Elastic", "HashiCorp",
  "GitLab", "GitHub", "Docker", "Canonical", "Red Hat", "VMware", "Citrix",
  "Autodesk", "PTC", "Trimble", "Unity", "Epic Games", "Roblox", "Spotify",
  "Pinterest", "Snap", "Reddit", "LinkedIn", "X Corp", "TikTok", "ByteDance",
  "Grab", "Sea Limited", "Rakuten", "Mercari", "Naver", "Line", "Tencent",
  "Alibaba", "Baidu", "Xiaomi", "OPPO", "Huawei", "Target", "Walmart",
  "Costco", "Nike", "Starbucks", "McDonald", "Visa", "Mastercard",

  // ---- AI labs and AI-first companies
  "OpenAI", "Anthropic", "Mistral AI", "Cohere", "Hugging Face", "Perplexity",
  "Scale AI", "Sarvam", "Krutrim", "Glean", "Runway", "Stability AI",
  "Character AI", "Adept", "Together AI", "Groq", "Cerebras", "Graphcore",
  "FuriosaAI", "NinjaTech AI", "Observe.AI", "Uniphore", "Fractal",
  "Tiger Analytics", "Mu Sigma", "Wadhwani AI", "AI4Bharat", "Boson AI",

  // ---- Indian product companies, unicorns and known startups
  "Flipkart", "Myntra", "Swiggy", "Zomato", "Zepto", "Blinkit", "Meesho",
  "Nykaa", "Ola", "Paytm", "PhonePe", "Razorpay", "CRED", "Groww", "Zerodha",
  "Upstox", "Jupiter", "Setu", "Juspay", "Slice", "Navi", "smallcase",
  "Pine Labs", "BharatPe", "Cashfree", "Zoho", "Freshworks", "Chargebee",
  "Postman", "BrowserStack", "Hasura", "Zeta", "Innovaccer", "Whatfix",
  "CleverTap", "MoEngage", "Darwinbox", "Icertis", "Mindtickle", "Hevo Data",
  "Sprinklr", "Druva", "Netradyne", "HighRadius", "Rubrik", "Nutanix",
  "Arcesium", "Media.net", "InMobi", "Glance", "Dream11", "Dreamsports",
  "Urban Company", "Lenskart", "PolicyBazaar", "MakeMyTrip", "Delhivery",
  "Udaan", "ShareChat", "Unacademy", "BYJU", "Vedantu", "upGrad", "Physics Wallah",
  "Practo", "Cure.fit", "Tata 1mg", "PharmEasy", "Porter", "Rapido",
  "Ather Energy", "Ola Electric", "Zetwerk", "Infra.Market", "Chargebee",
  "Kaleris", "Planys", "Hyperverge", "Vuram", "Indium", "Aspire Systems",
  "Sarvam AI", "Neuron7", "ShyftLabs", "Instawork", "AiDASH", "Aera",
  "Quest Global", "Cyient", "KPIT", "Tata Elxsi", "L&T Technology",
  "Persistent Systems", "Zensar", "Birlasoft", "Coforge", "Hexaware",
  "Teleperformance", "Concentrix", "Genpact", "WNS", "Firstsource",

  // ---- IT services and consultancies with large India centres
  "Tata Consultancy", "TCS", "Infosys", "Wipro", "HCL", "Tech Mahindra",
  "LTIMindtree", "Mphasis", "Cognizant", "Accenture", "Capgemini", "Deloitte",
  "PwC", "KPMG", "EY", "Ernst & Young", "McKinsey", "Bain", "Boston Consulting",
  "ZS Associates", "Thoughtworks", "Publicis Sapient", "Endava", "EPAM",
  "Globant", "DXC Technology", "Kyndryl", "NTT", "Avanade", "RSM", "dentsu",

  // ---- Semiconductors, hardware, industrials with software roles
  "Texas Instruments", "Analog Devices", "Micron", "Marvell", "Broadcom",
  "Applied Materials", "GlobalFoundries", "ASML", "Cadence", "Synopsys",
  "Siemens", "Bosch", "ABB", "Schneider Electric", "Honeywell", "Philips",
  "GE Aerospace", "GE HealthCare", "GE Vernova", "Rockwell Automation",
  "Johnson Controls", "Emerson", "Caterpillar", "Harman", "Valeo", "Continental",
  "Aptiv", "Magna", "Renault", "Mercedes-Benz", "BMW", "Volkswagen", "Rivian",
  "Lucid Motors", "Tesla", "Airbus", "Boeing", "Rocket Lab", "Logitech",
  "ZEISS", "Signify", "Sandisk", "Western Digital", "Seagate", "Teledyne",
  "Jabil", "Flex", "Foxconn", "Hitachi", "Panasonic", "Nidec", "Moog",
  "Baker Hughes", "Schlumberger", "Covestro", "Dow", "Ecolab",

  // ---- Finance, banking, quant
  "Goldman Sachs", "Morgan Stanley", "JPMorgan", "J.P. Morgan", "Citi",
  "Citigroup", "Barclays", "HSBC", "Deutsche Bank", "UBS", "Credit Suisse",
  "BNP Paribas", "Societe Generale", "Standard Chartered", "Wells Fargo",
  "Bank of America", "American Express", "Capital One", "BlackRock",
  "Fidelity", "State Street", "Vanguard", "Nomura", "Natixis", "Macquarie",
  "S&P Global", "Moody", "MSCI", "FactSet", "Bloomberg", "Refinitiv",
  "Thomson Reuters", "TransUnion", "Experian", "Fiserv", "FIS", "Global Payments",
  "Marsh McLennan", "Synchrony", "PNC", "Royal Bank of Canada", "Julius Baer",
  "Lombard Odier", "Brown Brothers Harriman", "Oaktree", "Ares Management",
  // quant desks
  "Jane Street", "Two Sigma", "Citadel", "Jump Trading", "Hudson River Trading",
  "Optiver", "IMC", "Tower Research", "DRW", "DV Trading", "Five Rings",
  "G-Research", "Virtu", "Schonfeld", "Millennium", "Point72", "AQR",
  "D. E. Shaw", "De Shaw", "WorldQuant", "Graviton", "Quadeye", "AlphaGrep",
  "Chicago Trading Company", "Engineers Gate", "Clear Street", "Talos",
  "Da Vinci", "Wincent", "Elwood", "Euronext", "TMX",

  // ---- Healthcare, pharma, science with real software teams
  "Roche", "Novartis", "Pfizer", "AstraZeneca", "GSK", "Sanofi", "Merck",
  "MSD", "Johnson & Johnson", "Abbott", "Medtronic", "Siemens Healthineers",
  "Thermo Fisher", "IQVIA", "Agilent", "Illumina", "Elekta", "Haemonetics",
  "Bio-Techne", "CVS Health", "McKesson", "Cigna", "Elsevier", "Wolters Kluwer",
  "RELX", "Clario", "Sirona Medical",

  // ---- Consumer, retail, media, other large brands
  "Unilever", "Procter & Gamble", "P&G", "Nestle", "PepsiCo", "Coca-Cola",
  "AB InBev", "Red Bull", "Puma", "Adidas", "CHANEL", "H&M", "Mango",
  "Warner Bros", "Disney", "Comcast", "DraftKings", "Sportradar", "Keywords Studios",
  "Zomato", "Swiggy", "Sysco", "Aramark",

  // ---- Security, infra, dev tools
  "Palo Alto Networks", "CrowdStrike", "Fortinet", "Zscaler", "Okta",
  "SailPoint", "Sophos", "Trend Micro", "Check Point", "Splunk", "Datadog",
  "New Relic", "Dynatrace", "PagerDuty", "Grafana", "Sonar", "Kong",
  "ReliaQuest", "Delinea", "Entrust", "Commvault", "Veeam", "Akamai",
  "Fastly", "DigitalOcean", "Linode", "Cloudera", "Teradata", "Informatica",
  "Talend", "Celonis", "Alteryx", "Qlik", "Tableau", "Blue Yonder", "Anaplan",
  "Guidewire", "AspenTech", "Epicor", "Infor", "Zoho", "Freshdesk",
  "Canva", "Figma", "Miro", "Notion", "Airtable", "Asana", "Monday",
  "Automation Anywhere", "UiPath", "Blue Prism", "Genesys", "Talkdesk",
  "Vonage", "Infobip", "Telnyx", "Checkout.com", "Adyen", "Affirm", "Nuvei",
  "Binance", "Coinbase", "Kraken", "Ripple", "Merkle Science",
  "The Trade Desk", "Quantcast", "Adzuna", "Handshake", "Docebo",
  "CoStar", "Wikimedia", "Mozilla", "Shift Technologies", "Xsolla",
  "Trainline", "BlaBlaCar", "Doctolib", "SIXT", "ING", "BBVA", "Bynder",
  "Frontify", "Beekeeper", "Satispay", "iwoca", "Wayflyer", "Solidgate",
  "Taktile", "Odaseva", "DataVisor", "Patsnap", "Constructor", "Malt",
  "ShopBack", "NIO", "WeRide", "Grab", "Leidos", "Axon", "Plexus",
];

/** Precompiled matchers: word-boundary, case-insensitive, on the raw name. */
const MATCHERS = [...new Set([...REPUTED_COMPANIES, ...TIER1_COMPANIES.map((c) => c.name)])]
  .filter((n) => n.trim().length >= 2)
  .map((name) => ({
    name,
    // norm() strips punctuation, so "J.P. Morgan" -> "j p morgan".
    token: norm(name),
  }))
  .filter((m) => m.token.length >= 2);

/**
 * True when the company reads as one he could name in an interview.
 * Matching is on normalized whole words, so "Razorpay Software Private
 * Limited" matches "Razorpay" but "Gateway Software Solutions" matches nothing.
 */
export function isReputed(company: string): boolean {
  const n = norm(company);
  if (!n) return false;
  return MATCHERS.some((m) => new RegExp(`\\b${m.token.replace(/\s+/g, "\\s+")}\\b`).test(n));
}

/** Which entry matched — useful when explaining why a role was kept. */
export function reputationMatch(company: string): string | null {
  const n = norm(company);
  const hit = MATCHERS.find((m) =>
    new RegExp(`\\b${m.token.replace(/\s+/g, "\\s+")}\\b`).test(n),
  );
  return hit?.name ?? null;
}
