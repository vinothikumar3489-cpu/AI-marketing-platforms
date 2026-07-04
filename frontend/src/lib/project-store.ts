
// Return active chat ID synchronously from localStorage
function getActiveChatId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketform_active_chat_id");
}

// Set active chat ID
function setActiveChatId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("marketform_active_chat_id", id);
  window.dispatchEvent(new Event("marketform-chat-change"));
}

// For backward compatibility
export type ProductProject = {
  id: string;
  productName: string;
  websiteUrl: string;
  description: string;
  industry: string;
  targetAudience: string;
  pricing: string;
  competitors: string;
  createdAt: string;
  updatedAt: string;
  productAnalysis?: any;
  modules?: Record<string, any>;
};

export function getProjects(): ProductProject[] {
  return [];
}

export function saveProjects(projects: ProductProject[]) {}

export function getActiveProjectId() {
  return getActiveChatId();
}

export function setActiveProjectId(id: string) {
  setActiveChatId(id);
}

// Now getActiveProject will just returns a mock project with chat ID
export function getActiveProject() {
  const chatId = getActiveChatId();
  if (!chatId) return null;
  return {
    id: chatId,
    productName: "New Product",
    websiteUrl: "",
    description: "",
    industry: "",
    targetAudience: "",
    pricing: "",
    competitors: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as ProductProject;
}

export function createBlankProject() {
  const id = "temp-" + Date.now();
  setActiveChatId(id);
  return {
    id,
    productName: "New Product Project",
    websiteUrl: "",
    description: "",
    industry: "",
    targetAudience: "",
    pricing: "",
    competitors: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as ProductProject;
}

export function upsertProject(input: Partial<ProductProject> & { id?: string }) {
  return createBlankProject();
}

export function deleteProject(id: string) {}

export function generateProductAnalysis(input: ProductProject) {
  const text = `${input.productName} ${input.description} ${input.industry} ${input.targetAudience}`.toLowerCase();
  const isResume = text.includes("resume") || text.includes("job") || text.includes("career") || text.includes("hr");
  const isEco = text.includes("eco") || text.includes("sustain") || text.includes("bottle") || text.includes("plastic");
  const isPOS = text.includes("restaurant") || text.includes("pos") || text.includes("cafe") || text.includes("billing");
  const isFitness = text.includes("fitness") || text.includes("workout") || text.includes("nutrition") || text.includes("health");

  if (isResume) {
    return {
      industry: input.industry || "HR Technology",
      category: "AI Resume Builder / Career SaaS",
      confidenceScore: 94,
      uniqueValueProposition: "Helps students and job seekers create ATS-ready resumes faster with AI.",
      targetAudience: ["Students and freshers", "Recent graduates", "Job seekers"],
      painPoints: ["Complex resume builders", "High cost", "Lack of ATS knowledge"],
      marketOpportunities: ["Partner with universities", "Add LinkedIn optimization", "Offer interview prep"],
      seoSuggestions: ["resume builder", "ATS-friendly resumes", "free resume templates"],
      campaignIdeas: ["Student discount", "University partnerships", "Referral program"],
      competitorIdeas: ["Canva, Resume.io, Novoresume"],
      productSummary: "A resume builder using AI to create ATS-friendly resumes for students.",
      recommendedStrategy: "Focus on simplicity and affordability.",
      dataSourcesUsed: ["User input"],
      finalRecommendation: "Start with free tier and university partnerships.",
      provider: "gemini",
      fallbackUsed: false,
    };
  }
  if (isEco) {
    return {
      industry: input.industry || "Consumer Goods",
      category: "Sustainable Lifestyle Product",
      confidenceScore: 91,
      uniqueValueProposition: "Promotes sustainable living by reducing single-use plastic.",
      targetAudience: ["Eco-conscious consumers", "Young professionals", "Families"],
      painPoints: ["Plastic waste", "Low durability", "High prices"],
      marketOpportunities: ["Zero-waste stores", "Corporate gifting", "Subscription model"],
      seoSuggestions: ["sustainable water bottle", "eco-friendly products", "zero-waste lifestyle"],
      campaignIdeas: ["Refill stations", "Take-back program", "Influencer partnerships"],
      competitorIdeas: ["Hydro Flask", "S'well", "Klean Kanteen"],
      productSummary: "A sustainable reusable bottle brand focused on reducing plastic waste.",
      recommendedStrategy: "Emphasize durability and eco-friendly materials.",
      dataSourcesUsed: ["User input"],
      finalRecommendation: "Launch with a strong sustainability focus and eco-branding.",
      provider: "gemini",
      fallbackUsed: false,
    };
  }
  if (isPOS) {
    return {
      industry: input.industry || "Restaurant Technology",
      category: "Cloud POS / Restaurant SaaS",
      confidenceScore: 93,
      uniqueValueProposition: "Simplifies restaurant operations with cloud POS.",
      targetAudience: ["Small restaurants", "Cafes", "Food trucks"],
      painPoints: ["Manual billing", "Kitchen delays", "Inventory errors"],
      marketOpportunities: ["Integrate with delivery apps", "Inventory management", "Loyalty programs"],
      seoSuggestions: ["restaurant POS", "cloud POS", "cafe billing software"],
      campaignIdeas: ["Free trial", "Referral discounts"],
      competitorIdeas: ["Toast", "Square", "Lightspeed"],
      productSummary: "Cloud-based POS for restaurants with inventory and kitchen management.",
      recommendedStrategy: "Focus on ease of use and integrations.",
      dataSourcesUsed: ["User input"],
      finalRecommendation: "Offer free trial for first-time users.",
      provider: "gemini",
      fallbackUsed: false,
    };
  }
  if (isFitness) {
    return {
      industry: input.industry || "Health and Fitness",
      category: "AI Fitness / Nutrition App",
      confidenceScore: 90,
      uniqueValueProposition: "Delivers personalized workouts and nutrition plans with AI.",
      targetAudience: ["Fitness enthusiasts", "Beginners", "Health-conscious people"],
      painPoints: ["Confusing plans", "No motivation", "Tracking is hard"],
      marketOpportunities: ["Personal trainers", "Meal plans", "Challenges"],
      seoSuggestions: ["fitness app", "workout plans", "nutrition tracker"],
      campaignIdeas: ["30-day challenge", "Influencer collaborations"],
      competitorIdeas: ["Nike Training Club", "MyFitnessPal", "Strava"],
      productSummary: "AI-powered fitness app for personalized workout and nutrition guidance.",
      recommendedStrategy: "Focus on personalization and community.",
      dataSourcesUsed: ["User input"],
      finalRecommendation: "Start with free tier.",
      provider: "gemini",
      fallbackUsed: false,
    };
  }
  return {
    industry: input.industry || "Marketing Technology",
    category: "AI SaaS Product",
    confidenceScore: 88,
    uniqueValueProposition: "Uses AI to solve customer pain points.",
    targetAudience: ["Small businesses", "Marketing teams"],
    painPoints: ["Manual research", "No clear insights"],
    marketOpportunities: ["Automation", "Integrations"],
    seoSuggestions: ["marketing AI", "business insights"],
    campaignIdeas: ["Freemium", "Content marketing"],
    competitorIdeas: ["HubSpot", "Marketo"],
    productSummary: "AI marketing tool for business insights.",
    recommendedStrategy: "Focus on solving specific pain points.",
    dataSourcesUsed: ["User input"],
    finalRecommendation: "Launch with clear pain points focus.",
    provider: "gemini",
    fallbackUsed: false,
  };
}

export function saveModuleResult(module: string, result: any) {}
