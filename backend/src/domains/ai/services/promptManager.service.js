// Centralized Prompt Registry
export const PROMPTS = {
  seoAudit: {
    system: "You are an expert SEO analyst...",
    buildUserPrompt: (websiteUrl) => `Analyze the SEO for ${websiteUrl}`
  },
  emailCampaign: {
    system: "You are a world-class copywriter...",
    buildUserPrompt: (context) => `Create an email campaign based on: ${JSON.stringify(context)}`
  }
};

export function getPromptTemplate(promptKey) {
  if (!PROMPTS[promptKey]) {
    throw new Error(`Prompt template '${promptKey}' not found.`);
  }
  return PROMPTS[promptKey];
}
