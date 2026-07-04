// Realistic sample data for the entire app
export const stats = {
  wastedSpend: 62,
  conversionLift: 3.4,
  timeToInsight: 10,
  cacReduction: 35,
};

export const productAnalysis = {
  industry: "HR Technology",
  category: "Workflow Automation SaaS",
  pricing: "Mid-market ($299 - $1,499 / mo)",
  confidence: 96,
  usp: "AI-powered HR automation that cuts onboarding time by 70%.",
  valueProps: [
    "Automated onboarding workflows",
    "Compliance tracking across 40+ jurisdictions",
    "AI-driven retention insights",
    "Native integrations with 150+ HRIS tools",
  ],
  painPoints: [
    "Manual HR processes draining productivity",
    "Employee retention slipping below 70%",
    "Compliance violations across regions",
    "Disconnected HR tooling stack",
  ],
  features: [
    "Smart onboarding builder",
    "Compliance radar",
    "Retention predictor",
    "Sentiment pulse surveys",
    "Custom HRIS connectors",
  ],
};

export const markets = [
  { name: "Manufacturing", fit: 91, tam: "$48B", sam: "$6.2B", growth: 12 },
  { name: "Financial Services", fit: 88, tam: "$72B", sam: "$9.8B", growth: 9 },
  { name: "Healthcare", fit: 82, tam: "$55B", sam: "$7.1B", growth: 14 },
  { name: "Education", fit: 79, tam: "$31B", sam: "$3.6B", growth: 11 },
  { name: "Retail", fit: 75, tam: "$40B", sam: "$4.4B", growth: 8 },
  { name: "Logistics", fit: 71, tam: "$28B", sam: "$2.9B", growth: 10 },
];

export const personas = [
  {
    name: "Chief HR Officer",
    title: "CHRO",
    age: "42-55",
    location: "North America, EU",
    company: "1,000 - 10,000 employees",
    goals: ["Reduce turnover 25%", "Modernize HR stack", "Drive culture metrics"],
    pains: ["Manual onboarding", "Compliance risks", "Fragmented tools"],
    kpis: ["Retention rate", "Time-to-hire", "eNPS"],
    triggers: ["New CHRO appointed", "Recent funding round", "M&A activity"],
    objections: ["Switching cost", "Data migration"],
    channels: ["LinkedIn", "Industry Events", "Analyst Reports"],
    intent: 94,
  },
  {
    name: "VP People Operations",
    title: "VP People Ops",
    age: "35-48",
    location: "Global",
    company: "200 - 2,000 employees",
    goals: ["Scale people ops", "Automate workflows"],
    pains: ["Tool sprawl", "Reporting gaps", "Manual approvals"],
    kpis: ["Workflow throughput", "Process cost"],
    triggers: ["Hiring spree", "RIF cycles", "New office launch"],
    objections: ["ROI proof", "Internal buy-in"],
    channels: ["LinkedIn", "Cold Email", "Webinars"],
    intent: 89,
  },
  {
    name: "Head of Talent",
    title: "Head of Talent",
    age: "30-45",
    location: "US, UK, IN",
    company: "100 - 1,500 employees",
    goals: ["Faster onboarding", "Better candidate XP"],
    pains: ["Drop-off in onboarding", "Disconnected ATS"],
    kpis: ["Onboarding NPS", "Activation rate"],
    triggers: ["High attrition", "ATS migration"],
    objections: ["Implementation time"],
    channels: ["LinkedIn", "Slack Communities", "Podcasts"],
    intent: 86,
  },
  {
    name: "HRIS Manager",
    title: "HRIS Manager",
    age: "32-48",
    location: "Global",
    company: "500 - 5,000 employees",
    goals: ["System consolidation", "Reliable data"],
    pains: ["Integration debt", "Reporting load"],
    kpis: ["System uptime", "Data accuracy"],
    triggers: ["Workday rollout", "ERP consolidation"],
    objections: ["Security review", "IT bandwidth"],
    channels: ["G2", "Cold Email", "LinkedIn"],
    intent: 83,
  },
  {
    name: "CFO / Finance Lead",
    title: "CFO",
    age: "40-58",
    location: "Global",
    company: "500 - 10,000 employees",
    goals: ["Reduce HR opex", "Audit readiness"],
    pains: ["Hidden HR costs", "Compliance fines"],
    kpis: ["Cost per employee", "Audit pass rate"],
    triggers: ["Annual budget cycle", "Audit findings"],
    objections: ["Pricing", "Contract terms"],
    channels: ["LinkedIn", "Analyst Reports", "Email"],
    intent: 78,
  },
];

export const intentSignals = [
  { signal: "Companies hiring HRIS Managers", score: 92, count: 1840 },
  { signal: "Series B+ rounds in last 90 days", score: 89, count: 612 },
  { signal: "Companies expanding globally", score: 84, count: 1320 },
  { signal: "Recent Workday or SAP rollout", score: 81, count: 740 },
  { signal: "Public RFPs for HR automation", score: 88, count: 198 },
  { signal: "Negative Glassdoor sentiment spike", score: 76, count: 905 },
];

export const competitors = [
  { name: "BambooHR", pricing: "$$", share: 22, sentiment: 78, strength: "Brand", weakness: "Limited AI" },
  { name: "Rippling", pricing: "$$$", share: 18, sentiment: 84, strength: "Integrations", weakness: "Pricing" },
  { name: "Gusto", pricing: "$$", share: 15, sentiment: 80, strength: "SMB UX", weakness: "Enterprise depth" },
  { name: "Workday", pricing: "$$$$", share: 28, sentiment: 71, strength: "Enterprise", weakness: "Complexity" },
  { name: "Deel", pricing: "$$$", share: 12, sentiment: 82, strength: "Global", weakness: "HR depth" },
];

export const channels = [
  { name: "LinkedIn Ads", budget: 32, cpl: 48, conv: 4.2, roi: 5.1, color: "var(--brand-blue)" },
  { name: "Cold Email", budget: 18, cpl: 22, conv: 3.1, roi: 6.4, color: "var(--brand-green)" },
  { name: "Google Ads", budget: 16, cpl: 64, conv: 2.8, roi: 3.2, color: "var(--brand-purple)" },
  { name: "Meta Ads", budget: 10, cpl: 38, conv: 1.9, roi: 2.1, color: "var(--brand-cyan)" },
  { name: "SEO", budget: 14, cpl: 18, conv: 5.2, roi: 8.7, color: "#f59e0b" },
  { name: "Partnerships", budget: 10, cpl: 30, conv: 6.1, roi: 7.3, color: "#ec4899" },
];

export const perfSeries = [
  { month: "Jan", cac: 420, ltv: 4200, roas: 2.8, conv: 1.9 },
  { month: "Feb", cac: 395, ltv: 4350, roas: 3.1, conv: 2.1 },
  { month: "Mar", cac: 360, ltv: 4500, roas: 3.5, conv: 2.4 },
  { month: "Apr", cac: 340, ltv: 4720, roas: 3.8, conv: 2.7 },
  { month: "May", cac: 305, ltv: 4880, roas: 4.2, conv: 3.0 },
  { month: "Jun", cac: 278, ltv: 5120, roas: 4.7, conv: 3.4 },
  { month: "Jul", cac: 262, ltv: 5340, roas: 5.1, conv: 3.7 },
];

export const roiRecs = [
  { action: "Reduce Meta Ads spend by 15%", impact: "+$42K savings", confidence: 92 },
  { action: "Increase LinkedIn spend by 25%", impact: "+118 SQLs / mo", confidence: 88 },
  { action: "Retarget high-intent visitors via email", impact: "+22% conv lift", confidence: 90 },
  { action: "Launch ABM for Series B accounts", impact: "+$1.2M pipeline", confidence: 84 },
  { action: "Refresh cold email subject lines", impact: "+9% open rate", confidence: 79 },
];

export const pipelineSteps = [
  "Product Upload",
  "Product Analysis",
  "Market Discovery",
  "Audience Intelligence",
  "Intent Prediction",
  "Competitor Intelligence",
  "Positioning Engine",
  "Channel Recommendation",
  "Campaign Generator",
  "Content Generator",
  "Analytics",
  "ROI Optimization",
];
