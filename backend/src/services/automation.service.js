import { callAI } from "../ai/services/aiRouter.service.js";

/**
 * Generate automation plan with AI or fallback to intelligent defaults
 */
export async function generateAutomationPlanWithAI(context) {
  const {
    productIntelligence,
    competitorIntelligence,
    campaignIntelligence,
    seoIntelligence,
    chatTitle,
    productName,
  } = context;

  // Extract key data
  const productData = productIntelligence?.inputJson || {};
  const productAnalysis = productIntelligence?.productAnalysis || {};
  const audienceData = productIntelligence?.audienceIntelligence || {};
  const campaignData = campaignIntelligence?.campaignGenerator || {};
  const channelData = campaignIntelligence?.channelRecommendation || {};

  // Determine product info
  const product = productName || productData.productName || chatTitle || "Your Product";
  const targetAudience = productData.targetAudience || audienceData.primaryAudience || "professionals and businesses";
  const industry = productData.industry || "technology";
  const website = productData.websiteUrl || "";

  // Determine best channels
  let channels = [];
  if (channelData.recommendedChannels && Array.isArray(channelData.recommendedChannels)) {
    channels = channelData.recommendedChannels.slice(0, 3).map(ch => ({
      channel: ch.channel || ch.name || "LinkedIn",
      priority: ch.priority || "high",
      reason: ch.reason || "Best for your audience",
    }));
  } else if (channelData.primaryChannel) {
    channels = [{ channel: channelData.primaryChannel, priority: "high", reason: "Primary channel" }];
  } else {
    // Default channels
    channels = [
      { channel: "LinkedIn", priority: "high", reason: "Professional B2B audience" },
      { channel: "Instagram", priority: "medium", reason: "Visual content engagement" },
      { channel: "Email", priority: "high", reason: "Direct communication" },
    ];
  }

  // Extract SEO Intelligence data
  const seoScore = seoIntelligence?.seoScore ?? null;
  const seoKeywords = seoIntelligence?.keywordOpportunities ?? null;
  const seoContentGaps = seoIntelligence?.contentGaps ?? null;
  const seoBlogIdeas = seoIntelligence?.blogIdeas ?? null;
  const seoCompetitorKeywords = seoIntelligence?.competitorKeywords ?? null;
  const seoTechnicalAudit = seoIntelligence?.technicalAudit ?? null;
  const seoActionPlan = seoIntelligence?.actionPlan ?? null;
  const seoScoreBreakdown = seoIntelligence?.scoreBreakdown ?? null;

  // Try AI generation first
  try {
    const prompt = `Generate a comprehensive marketing automation plan for:
Product: ${product}
Industry: ${industry}
Target Audience: ${targetAudience}
Channels: ${channels.map(c => c.channel).join(", ")}
${seoScore !== null ? `SEO Score: ${seoScore}/100` : ""}
${seoKeywords ? `Keyword Opportunities: ${JSON.stringify(seoKeywords)}` : ""}
${seoContentGaps ? `Content Gaps: ${JSON.stringify(seoContentGaps)}` : ""}
${seoBlogIdeas ? `Blog Ideas: ${JSON.stringify(seoBlogIdeas)}` : ""}
${seoCompetitorKeywords ? `Competitor Keywords: ${JSON.stringify(seoCompetitorKeywords)}` : ""}
${seoTechnicalAudit ? `Technical Audit: ${JSON.stringify(seoTechnicalAudit)}` : ""}
${seoActionPlan ? `SEO Action Plan: ${JSON.stringify(seoActionPlan)}` : ""}
${seoScoreBreakdown ? `Score Breakdown: ${JSON.stringify(seoScoreBreakdown)}` : ""}

Generate:
1. Campaign objective and weekly plan
2. Email sequence (3 emails with subject, preview, body, CTA)
3. LinkedIn posts (5 posts with different formats)
4. Instagram content (5 captions with hashtags and reel ideas)
5. Video ad scripts (3 videos with scenes and voiceover)
6. Image ad prompts (5 poster ideas with design direction)
7. Lead generation strategy with ideal profile
8. DM templates for outreach

Return as JSON with these exact keys:
{
  "campaignName": "string",
  "campaignObjective": "string",
  "targetAudience": {},
  "channels": [],
  "weeklyPlan": {},
  "kpis": {},
  "budgetSplit": {},
  "emailSequence": [],
  "emailSubjects": [],
  "emailSchedule": {},
  "leadCriteria": {},
  "linkedInCalendar": {},
  "linkedInPosts": [],
  "linkedInDmTemplates": [],
  "linkedInSchedule": {},
  "instagramCaptions": [],
  "instagramReelIdeas": [],
  "instagramSchedule": {},
  "instagramHashtags": [],
  "posterPrompts": [],
  "imageAdIdeas": [],
  "designStyles": {},
  "videoScripts": [],
  "videoScenes": [],
  "videoSchedule": {},
  "idealLeadProfile": {},
  "leadSources": [],
  "outreachAngles": [],
  "sampleLeads": []
}`;

    const aiResult = await callAI(prompt);
    
    if (aiResult.success && aiResult.data) {
      console.log('✅ [Automation] AI-generated plan created');
      return {
        ...aiResult.data,
        provider: aiResult.provider || 'ai',
        fallbackUsed: false,
      };
    }
  } catch (error) {
    console.log('⚠️ [Automation] AI generation failed, using fallback:', error.message);
  }

  // Fallback to intelligent default data
  console.log('📝 [Automation] Using intelligent fallback data');
  
  return generateFallbackAutomationPlan({
    product,
    targetAudience,
    industry,
    channels,
    website,
  });
}

/**
 * Generate intelligent fallback automation plan
 */
function generateFallbackAutomationPlan(context) {
  const { product, targetAudience, industry, channels, website } = context;

  return {
    campaignName: `${product} Growth Campaign`,
    campaignObjective: `Drive awareness and generate qualified leads for ${product}`,
    targetAudience: {
      primary: targetAudience,
      demographics: "25-45 years, professionals",
      interests: ["technology", "innovation", "productivity"],
      painPoints: ["efficiency", "time management", "scalability"],
    },
    channels: channels,
    weeklyPlan: {
      monday: "LinkedIn post + Email outreach",
      tuesday: "Instagram content + Story",
      wednesday: "Blog promotion + LinkedIn engagement",
      thursday: "Video content + Reel",
      friday: "Weekly roundup + Community engagement",
      weekend: "Plan next week content",
    },
    kpis: {
      leads: "50+ qualified leads per week",
      engagement: "5% average engagement rate",
      conversions: "10% lead-to-customer conversion",
      reach: "10,000+ impressions per week",
    },
    budgetSplit: {
      linkedin: "40%",
      instagram: "25%",
      email: "15%",
      content: "20%",
    },

    // Email Automation
    emailSequence: [
      {
        subject: `Introducing ${product}: Transform Your Workflow`,
        previewText: `See how ${product} helps ${targetAudience}`,
        body: `Hi [Name],\n\nI noticed you're interested in ${industry} solutions.\n\n${product} helps teams like yours streamline workflows and boost productivity.\n\nHere's what makes us different:\n✓ Easy to set up\n✓ Powerful features\n✓ Proven results\n\nWant to see how it works?`,
        cta: "Get a Free Demo",
        ctaUrl: website || "#",
        day: 1,
      },
      {
        subject: `[Name], here's how ${product} solves your biggest challenges`,
        previewText: "Real results from teams like yours",
        body: `Hi [Name],\n\nLast week I shared how ${product} can transform your workflow.\n\nToday, I want to show you real results:\n\n• 50% faster task completion\n• 3x better team collaboration\n• 90% reduction in manual work\n\nSee case studies from companies in ${industry}.`,
        cta: "Read Case Studies",
        ctaUrl: website || "#",
        day: 4,
      },
      {
        subject: `Last chance: Special offer for ${product}`,
        previewText: "Limited time discount inside",
        body: `Hi [Name],\n\nI don't want you to miss this opportunity.\n\nFor the next 48 hours, we're offering:\n• 30% off annual plans\n• Free onboarding\n• Priority support\n\nThis offer expires soon. Ready to get started?`,
        cta: "Claim Your Discount",
        ctaUrl: website || "#",
        day: 7,
      },
    ],
    emailSubjects: [
      `Introducing ${product}: Transform Your Workflow`,
      `[Name], here's how ${product} solves your biggest challenges`,
      `Last chance: Special offer for ${product}`,
    ],
    emailSchedule: {
      frequency: "Weekly sequence",
      bestTime: "Tuesday & Thursday, 10 AM",
      segmentation: "Industry, company size, engagement level",
    },
    leadCriteria: {
      industry: industry,
      companySize: "10-500 employees",
      jobTitles: ["Manager", "Director", "VP", "Head of", "Founder"],
      engagement: "Visited website, downloaded content, or engaged with posts",
    },

    // LinkedIn Automation
    linkedInCalendar: {
      week1: ["Thought leadership post", "Product feature highlight", "Customer success story"],
      week2: ["Industry insights", "Tips & tricks", "Behind the scenes"],
      week3: ["Case study", "Product update", "Community spotlight"],
      week4: ["Monthly roundup", "Expert interview", "Future roadmap"],
    },
    linkedInPosts: [
      {
        title: "Why We Built This",
        content: `After talking to 100+ ${targetAudience}, we discovered a common problem:\n\nThey were struggling with [pain point].\n\nThat's why we built ${product}.\n\nHere's our journey 👇\n\n[Story thread about the problem, solution, and impact]\n\nWhat challenges are you facing in ${industry}?\n\n#${industry.replace(/\s/g, '')} #Innovation #ProductDevelopment`,
        format: "Storytelling",
        bestTime: "Tuesday 9 AM",
      },
      {
        title: "5 Ways to Improve Your Workflow",
        content: `Productivity hack for ${targetAudience}:\n\n1. Automate repetitive tasks\n2. Centralize your tools\n3. Use templates\n4. Set clear priorities\n5. Measure what matters\n\n${product} helps you do all of this in one place.\n\nWhich tip resonates most with you?\n\n#Productivity #${industry.replace(/\s/g, '')} #WorkflowOptimization`,
        format: "Listicle",
        bestTime: "Wednesday 11 AM",
      },
      {
        title: "Customer Success Story",
        content: `"${product} helped us save 20 hours per week."\n\n- [Customer Name], [Company]\n\nHere's how they did it:\n\n• Challenge: Manual processes taking too long\n• Solution: Automated workflows with ${product}\n• Result: 3x faster execution\n\nRead the full case study: [link]\n\n#CaseStudy #CustomerSuccess #${industry.replace(/\s/g, '')}`,
        format: "Social proof",
        bestTime: "Thursday 10 AM",
      },
      {
        title: "Industry Insights",
        content: `The future of ${industry} is changing fast.\n\nHere are 3 trends we're watching:\n\n1️⃣ AI-powered automation\n2️⃣ Remote-first workflows\n3️⃣ Data-driven decisions\n\nHow is your team adapting?\n\n${product} is built for the future of work.\n\n#FutureOfWork #${industry.replace(/\s/g, '')} #Trends`,
        format: "Thought leadership",
        bestTime: "Monday 8 AM",
      },
      {
        title: "Product Feature Spotlight",
        content: `New feature alert! 🎉\n\n${product} now supports [feature name].\n\nWhy it matters:\n→ Faster workflows\n→ Better collaboration\n→ Real-time insights\n\nEarly access available now.\nComment "interested" to try it first.\n\n#ProductUpdate #Innovation #${industry.replace(/\s/g, '')}`,
        format: "Announcement",
        bestTime: "Friday 2 PM",
      },
    ],
    linkedInDmTemplates: [
      {
        name: "Initial Outreach",
        message: `Hi [Name], I came across your profile and noticed you work in ${industry}. I thought you might be interested in ${product} - we help teams like yours streamline workflows. Would you be open to a quick chat?`,
      },
      {
        name: "Follow-up",
        message: `Hi [Name], following up on my last message. I'd love to show you how ${product} can help with [specific pain point]. Are you available for a 15-min call this week?`,
      },
      {
        name: "Value Share",
        message: `Hi [Name], I just published an article about ${industry} trends that might interest you. Would you like me to send it over?`,
      },
    ],
    linkedInSchedule: {
      postsPerWeek: 5,
      bestTimes: ["Mon 8 AM", "Tue 9 AM", "Wed 11 AM", "Thu 10 AM", "Fri 2 PM"],
      engagementTime: "Daily, 30 minutes for comments and DMs",
    },

    // Instagram Automation
    instagramCaptions: [
      {
        title: "Monday Motivation",
        caption: `Start your week strong with ${product} 💪\n\nTransform the way you work and achieve more.\n\nSwipe to see how we help ${targetAudience} 👉`,
        hashtags: ["#MondayMotivation", "#Productivity", "#${industry.replace(/\s/g, '')}", "#WorkSmart", "#Innovation"],
        postType: "Carousel",
      },
      {
        title: "Behind the Scenes",
        caption: `Ever wondered how ${product} is built? 🛠️\n\nTake a peek behind the scenes of our team creating magic.\n\nBuilding products that make a difference. ✨`,
        hashtags: ["#BehindTheScenes", "#TeamWork", "#ProductDevelopment", "#Innovation", "#TechLife"],
        postType: "Reel",
      },
      {
        title: "Customer Success",
        caption: `"${product} changed everything for us!" 🎉\n\nHearing stories like this makes it all worth it.\n\nSwipe to see more testimonials from happy customers 💙`,
        hashtags: ["#CustomerSuccess", "#Testimonial", "#HappyCustomers", "#${industry.replace(/\s/g, '')}", "#Results"],
        postType: "Carousel",
      },
      {
        title: "Tips & Tricks",
        caption: `5 productivity hacks you need to try 📝\n\n1️⃣ Time blocking\n2️⃣ Automation\n3️⃣ Templates\n4️⃣ Prioritization\n5️⃣ Regular breaks\n\n${product} helps with all of these! Link in bio 🔗`,
        hashtags: ["#ProductivityHacks", "#WorkflowTips", "#Efficiency", "#${industry.replace(/\s/g, '')}", "#TimeManagement"],
        postType: "Single Image",
      },
      {
        title: "Feature Highlight",
        caption: `New feature alert! 🚀\n\nYou asked, we delivered.\n\nIntroducing [feature] - making your life easier, one click at a time.\n\nTry it now! Link in bio 👆`,
        hashtags: ["#NewFeature", "#ProductUpdate", "#Innovation", "#${product.replace(/\s/g, '')}", "#TechUpdate"],
        postType: "Reel",
      },
    ],
    instagramReelIdeas: [
      { title: "Before & After using our product", duration: "15s", style: "Transition" },
      { title: "Day in the life of our team", duration: "30s", style: "Vlog" },
      { title: "Quick tutorial: How to use [feature]", duration: "20s", style: "Educational" },
      { title: "Customer transformation story", duration: "25s", style: "Testimonial" },
      { title: "5 reasons to try our product", duration: "15s", style: "Listicle" },
    ],
    instagramSchedule: {
      postsPerWeek: 4,
      reelsPerWeek: 3,
      storiesPerDay: 2,
      bestTimes: ["Mon 7 PM", "Wed 6 PM", "Fri 5 PM", "Sun 8 PM"],
    },
    instagramHashtags: [
      `#${product.replace(/\s/g, '')}`,
      `#${industry.replace(/\s/g, '')}`,
      "#Innovation",
      "#Productivity",
      "#BusinessGrowth",
      "#Entrepreneurship",
      "#StartupLife",
      "#TechTools",
      "#WorkSmart",
      "#DigitalTransformation",
    ],

    // Creative Generator
    posterPrompts: [
      {
        title: "Product Hero Image",
        prompt: `Professional product showcase for ${product}, modern minimalist design, ${industry} aesthetic, clean background, high-quality 3D render, studio lighting`,
        format: "Square 1080x1080",
        usage: "Social media posts",
      },
      {
        title: "Feature Announcement",
        prompt: `Bold announcement poster for new feature, vibrant gradients, modern typography, ${product} branding, eye-catching design, professional`,
        format: "Vertical 1080x1350",
        usage: "Instagram posts",
      },
      {
        title: "Customer Testimonial",
        prompt: `Testimonial card design, clean layout, quote with attribution, ${product} colors, professional and trustworthy aesthetic`,
        format: "Square 1080x1080",
        usage: "Social proof posts",
      },
      {
        title: "Tips Carousel",
        prompt: `Multi-slide carousel template, numbered tips layout, consistent branding, ${industry} theme, readable fonts, mobile-optimized`,
        format: "Square 1080x1080 (10 slides)",
        usage: "Educational content",
      },
      {
        title: "Event Banner",
        prompt: `Webinar or event banner, professional and inviting, ${product} branding, clear CTA, modern design, includes date and time`,
        format: "Horizontal 1920x1080",
        usage: "Event promotions",
      },
    ],
    imageAdIdeas: [
      { title: "Problem-Solution Split", description: "Left side shows pain point, right shows solution with product" },
      { title: "Before/After Comparison", description: "Visual transformation using the product" },
      { title: "Feature Grid", description: "4-6 key features displayed in clean grid" },
      { title: "Social Proof Collage", description: "Multiple customer testimonials with photos" },
      { title: "Benefit Icons", description: "Visual icons representing key benefits" },
    ],
    designStyles: {
      colors: ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6"],
      fonts: ["Inter", "Poppins", "Montserrat"],
      style: "Modern, clean, professional",
      mood: "Confident, innovative, trustworthy",
    },

    // Video Ad Generator
    videoScripts: [
      {
        title: `Introducing ${product}`,
        duration: "30 seconds",
        script: `[Scene 1 - 5s] Are you tired of [pain point]?\n[Scene 2 - 10s] Meet ${product} - the smarter way to work.\n[Scene 3 - 10s] With features like [X, Y, Z], you can achieve more in less time.\n[Scene 4 - 5s] Join thousands of teams already using ${product}. Start your free trial today!`,
        voiceover: "Energetic, professional",
        visuals: "Product demo, happy users, results dashboard",
        cta: "Start Free Trial",
      },
      {
        title: "Customer Success Story",
        duration: "45 seconds",
        script: `[Scene 1 - 10s] Customer interview: "Before ${product}, we struggled with..."\n[Scene 2 - 15s] Visual montage of their journey\n[Scene 3 - 15s] "Now we're achieving incredible results!"\n[Scene 4 - 5s] Your success story starts here. Try ${product} free.`,
        voiceover: "Authentic, testimonial-style",
        visuals: "Real customer footage, metrics, celebrations",
        cta: "Get Started",
      },
      {
        title: "Quick Tutorial",
        duration: "60 seconds",
        script: `[Scene 1 - 10s] "Here's how ${product} works in 60 seconds"\n[Scene 2 - 40s] Step-by-step walkthrough with screen recording\n[Scene 3 - 10s] "See how easy it is? Try it yourself!"`,
        voiceover: "Clear, instructional",
        visuals: "Screen recording, animated highlights, user actions",
        cta: "Try It Free",
      },
    ],
    videoScenes: [
      { scene: "Hook", duration: "3-5s", description: "Grab attention with a problem or question" },
      { scene: "Problem", duration: "5-10s", description: "Show the pain point clearly" },
      { scene: "Solution", duration: "15-20s", description: "Introduce product and key benefits" },
      { scene: "Proof", duration: "5-10s", description: "Show results, testimonials, or data" },
      { scene: "CTA", duration: "3-5s", description: "Clear call-to-action" },
    ],
    videoSchedule: {
      platform: "LinkedIn, Instagram, YouTube Shorts",
      frequency: "2-3 videos per week",
      bestTimes: "Tue & Thu mornings",
    },

    // Lead Generation Agent
    idealLeadProfile: {
      industry: industry,
      companySize: "10-500 employees",
      jobTitles: ["Marketing Manager", "Director of Marketing", "VP Marketing", "CMO", "Founder", "CEO"],
      location: "US, UK, Canada, Australia",
      technographics: "Uses CRM, Marketing automation tools",
      behaviors: "Active on LinkedIn, Reads industry blogs, Attends webinars",
      painPoints: ["Manual workflows", "Poor collaboration", "Limited insights"],
      budget: "$1,000-$10,000/month",
      decisionMaker: true,
    },
    leadSources: [
      { source: "LinkedIn Sales Navigator", priority: "High", cost: "Paid" },
      { source: "Industry events & webinars", priority: "High", cost: "Free/Paid" },
      { source: "Content downloads on website", priority: "High", cost: "Free" },
      { source: "Referrals from customers", priority: "Medium", cost: "Free" },
      { source: "Outbound email campaigns", priority: "Medium", cost: "Low" },
    ],
    outreachAngles: [
      { angle: "Pain Point Focus", message: "Struggling with [specific pain]? Here's how we help..." },
      { angle: "Industry Insight", message: "Noticed you're in [industry]. This trend might interest you..." },
      { angle: "Mutual Connection", message: "We both know [Name]. They mentioned you'd find this valuable..." },
      { angle: "Content Share", message: "Wrote this article on [topic]. Thought you'd find it useful..." },
      { angle: "Direct Value", message: "Can help you achieve [specific outcome]. Interested?" },
    ],
    sampleLeads: [
      {
        name: "Sarah Johnson",
        title: "Marketing Director",
        company: "TechCorp Inc.",
        industry: industry,
        linkedIn: "linkedin.com/in/sample",
        email: "sample@techcorp.com",
        score: "A",
        reason: "Perfect ICP match, active on LinkedIn",
        status: "New",
      },
      {
        name: "Michael Chen",
        title: "VP of Growth",
        company: "StartupXYZ",
        industry: industry,
        linkedIn: "linkedin.com/in/sample2",
        email: "sample2@startupxyz.com",
        score: "A",
        reason: "Growing company, recent funding",
        status: "New",
      },
      {
        name: "Emily Rodriguez",
        title: "Head of Marketing",
        company: "Enterprise Solutions Ltd",
        industry: industry,
        linkedIn: "linkedin.com/in/sample3",
        email: "sample3@enterprise.com",
        score: "B",
        reason: "Right role, larger company",
        status: "New",
      },
    ],

    // Metadata
    provider: "fallback",
    fallbackUsed: true,
  };
}

export function sanitizeAutomationPlanData(automationData, chatTitle = 'Your Product') {
  if (!automationData || typeof automationData !== 'object') {
    return {
      campaignName: `Growth Campaign for ${chatTitle}`,
      campaignObjective: '',
      targetAudience: null,
      channels: null,
      weeklyPlan: null,
      kpis: null,
      budgetSplit: null,
      emailSequence: null,
      emailSubjects: null,
      emailSchedule: null,
      leadCriteria: null,
      linkedInCalendar: null,
      linkedInPosts: null,
      linkedInDmTemplates: null,
      linkedInSchedule: null,
      instagramCaptions: null,
      instagramReelIdeas: null,
      instagramSchedule: null,
      instagramHashtags: null,
      posterPrompts: null,
      imageAdIdeas: null,
      designStyles: null,
      videoScripts: null,
      videoScenes: null,
      videoSchedule: null,
      idealLeadProfile: null,
      leadSources: null,
      outreachAngles: null,
      sampleLeads: null,
      provider: automationData?.provider || 'ai',
      fallbackUsed: automationData?.fallbackUsed || false,
    };
  }

  return {
    campaignName: automationData.campaignName || `Growth Campaign for ${chatTitle}`,
    campaignObjective: automationData.campaignObjective || '',
    targetAudience: automationData.targetAudience || null,
    channels: automationData.channels || null,
    weeklyPlan: automationData.weeklyPlan || null,
    kpis: automationData.kpis || null,
    budgetSplit: automationData.budgetSplit || null,
    emailSequence: automationData.emailSequence || null,
    emailSubjects: automationData.emailSubjects || null,
    emailSchedule: automationData.emailSchedule || null,
    leadCriteria: automationData.leadCriteria || null,
    linkedInCalendar: automationData.linkedInCalendar || null,
    linkedInPosts: automationData.linkedInPosts || null,
    linkedInDmTemplates: automationData.linkedInDmTemplates || null,
    linkedInSchedule: automationData.linkedInSchedule || null,
    instagramCaptions: automationData.instagramCaptions || null,
    instagramReelIdeas: automationData.instagramReelIdeas || null,
    instagramSchedule: automationData.instagramSchedule || null,
    instagramHashtags: automationData.instagramHashtags || null,
    posterPrompts: automationData.posterPrompts || null,
    imageAdIdeas: automationData.imageAdIdeas || null,
    designStyles: automationData.designStyles || null,
    videoScripts: automationData.videoScripts || null,
    videoScenes: automationData.videoScenes || null,
    videoSchedule: automationData.videoSchedule || null,
    idealLeadProfile: automationData.idealLeadProfile || null,
    leadSources: automationData.leadSources || null,
    outreachAngles: automationData.outreachAngles || null,
    sampleLeads: automationData.sampleLeads || null,
    provider: automationData.provider || 'ai',
    fallbackUsed: automationData.fallbackUsed || false,
  };
}
