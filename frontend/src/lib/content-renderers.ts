import { asText, asArray } from './normalizers';
const t = (v: any) => asText(v);

export interface ContentRendererProps {
  content: any;
  compact?: boolean;
}

export interface ContentRenderer {
  render: (props: ContentRendererProps) => any;
  getType: () => string;
}

const get = (obj: any, path: string, fallback: any = null) => {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return fallback;
    current = current[key];
  }
  return current ?? fallback;
};

export class BlogArticleRenderer implements ContentRenderer {
  getType() { return 'blog_article'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'blog_article',
      headline: asText(content.headline || content.title),
      metaDescription: get(content, 'metaDescription'),
      introduction: asText(content.introduction),
      sections: asArray(content.sections).map((s: any) => ({
        heading: asText(s.heading || s.title),
        body: asText(s.body),
        keyTakeaways: asArray(s.keyTakeaways || s.keyPoints || s.points).map(t),
      })),
      conclusion: asText(content.conclusion),
      cta: get(content, 'cta'),
      targetKeywords: asArray(content.targetKeywords || content.tags).map((t: any) => asText(t)),
    };
  }
}

export class FaqPageRenderer implements ContentRenderer {
  getType() { return 'faq_page'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'faq_page',
      headline: asText(content.headline || content.title),
      metaDescription: get(content, 'metaDescription'),
      introduction: get(content, 'introduction'),
      faqs: asArray(content.faqs || content.faqItems || content.items).map((f: any) => ({
        question: asText(f.question),
        answer: asText(f.answer),
      })),
      cta: get(content, 'cta'),
    };
  }
}

export class LandingPageRenderer implements ContentRenderer {
  getType() { return 'landing_page'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'landing_page',
      headline: asText(content.headline),
      subheadline: get(content, 'subheadline'),
      heroCTA: get(content, 'heroCTA'),
      painPoints: asArray(content.painPoints).map(t),
      solution: get(content, 'solution'),
      features: asArray(content.features || content.featureBlocks).map((f: any) => ({
        icon: get(f, 'icon'),
        title: asText(f.title || f.name),
        description: asText(f.description),
      })),
      finalCTA: get(content, 'finalCTA'),
      seoKeywords: asArray(content.seoKeywords).map(t),
    };
  }
}

export class ProductPageRenderer implements ContentRenderer {
  getType() { return 'product_page'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'product_page',
      productName: asText(content.productName),
      tagline: get(content, 'tagline'),
      overview: get(content, 'overview'),
      keyFeatures: asArray(content.keyFeatures).map((f: any) => ({
        name: asText(f.name),
        description: get(f, 'description'),
        benefit: get(f, 'benefit'),
      })),
      useCases: asArray(content.useCases).map((u: any) => ({
        scenario: asText(u.scenario),
        solution: asText(u.solution),
        outcome: get(u, 'outcome'),
      })),
      cta: get(content, 'cta'),
      faqs: asArray(content.faqs).map((f: any) => ({
        question: asText(f.question),
        answer: asText(f.answer),
      })),
    };
  }
}

export class ComparisonPageRenderer implements ContentRenderer {
  getType() { return 'comparison_page'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'comparison_page',
      headline: asText(content.headline),
      introduction: get(content, 'introduction'),
      comparisonTable: content.comparisonTable ? {
        headers: asArray(content.comparisonTable.headers).map(t),
        rows: asArray(content.comparisonTable.rows || content.comparisonTable.data).map((r: any) => r),
      } : null,
      whyChooseUs: get(content, 'whyChooseUs'),
      cta: get(content, 'cta'),
      competitorWeaknesses: asArray(content.competitorWeaknesses).map((w: any) => ({
        competitor: asText(w.competitor || w.name),
        weakness: asText(w.weakness),
      })),
    };
  }
}

export class FeatureAnnouncementRenderer implements ContentRenderer {
  getType() { return 'feature_announcement'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'feature_announcement',
      headline: asText(content.headline || content.title),
      subheadline: get(content, 'subheadline'),
      body: asText(content.body),
      benefits: asArray(content.benefits).map(t),
      cta: get(content, 'cta'),
      availability: get(content, 'availability'),
    };
  }
}

export class WhitepaperRenderer implements ContentRenderer {
  getType() { return 'whitepaper'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'whitepaper',
      title: asText(content.title),
      subtitle: get(content, 'subtitle'),
      executiveSummary: get(content, 'executiveSummary'),
      sections: asArray(content.sections).map((s: any) => ({
        heading: asText(s.heading || s.title),
        body: asText(s.body || s.content),
        keyFindings: asArray(s.keyFindings || s.keyPoints).map(t),
      })),
      conclusion: get(content, 'conclusion'),
      cta: get(content, 'cta'),
    };
  }
}

export class LinkedInPostRenderer implements ContentRenderer {
  getType() { return 'linkedin_post'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'linkedin_post',
      hook: asText(content.hook),
      body: asText(content.body),
      cta: get(content, 'cta'),
      hashtags: asArray(content.hashtags).map(t),
      audience: get(content, 'audience'),
      angle: asText(content.angle),
    };
  }
}

export class InstagramPostRenderer implements ContentRenderer {
  getType() { return 'instagram_post'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'instagram_post',
      hook: get(content, 'hook'),
      caption: asText(content.caption),
      cta: get(content, 'cta'),
      hashtags: asArray(content.hashtags).map(t),
      visualConcept: get(content, 'visualConcept'),
      audience: get(content, 'audience'),
      angle: get(content, 'angle'),
    };
  }
}

export class TwitterPostRenderer implements ContentRenderer {
  getType() { return 'twitter_post'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'twitter_post',
      post: asText(content.post),
      cta: get(content, 'cta'),
      hashtags: asArray(content.hashtags).map(t),
      angle: get(content, 'angle'),
      audience: get(content, 'audience'),
    };
  }
}

export class FacebookPostRenderer implements ContentRenderer {
  getType() { return 'facebook_post'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'facebook_post',
      headline: get(content, 'headline'),
      body: asText(content.body),
      cta: get(content, 'cta'),
      audience: get(content, 'audience'),
      angle: get(content, 'angle'),
    };
  }
}

export class YouTubeDescriptionRenderer implements ContentRenderer {
  getType() { return 'youtube_description'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'youtube_description',
      title: get(content, 'title'),
      description: asText(content.description),
      openingHook: get(content, 'openingHook'),
      chapters: asArray(content.chapters || content.timestamps).map((c: any) => ({
        timestamp: asText(c.timestamp || c.time),
        title: asText(c.title || c.topic),
      })),
      links: asArray(content.links).map((l: any) => ({
        url: l.url,
        text: asText(l.text || l.label),
      })),
      cta: get(content, 'cta'),
      hashtags: asArray(content.hashtags).map(t),
      keywords: asArray(content.keywords).map(t),
    };
  }
}

export class EmailCopyRenderer implements ContentRenderer {
  getType() { return 'email_copy'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'email_copy',
      emailType: get(content, 'emailType'),
      subject: asText(content.subject),
      previewText: get(content, 'previewText'),
      greeting: asText(content.greeting),
      opening: asText(content.opening),
      bodyParagraphs: asArray(content.bodyParagraphs).map(t),
      bulletPoints: asArray(content.bulletPoints).map(t),
      ctaText: asText(content.ctaText),
      ctaUrl: get(content, 'ctaUrl'),
      closing: asText(content.closing),
      signature: asText(content.signature),
      personalizationFields: asArray(content.personalizationFields).map(t),
      complianceNote: get(content, 'complianceNote'),
    };
  }
}

export class CreativeBriefRenderer implements ContentRenderer {
  getType() { return 'creative_brief'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'creative_brief',
      objective: get(content, 'objective'),
      audience: get(content, 'audience'),
      message: get(content, 'message'),
      supportingMessages: asArray(content.supportingMessages || []).map(t),
      deliverables: asArray(content.deliverables || []).map(t),
      visualDirection: get(content, 'visualDirection'),
      tone: get(content, 'tone'),
      mandatoryElements: asArray(content.mandatoryElements || content.brandSignals || []).map(t),
      prohibitedClaims: asArray(content.prohibitedClaims || content.evidenceLimitations || []).map(t),
      cta: get(content, 'cta'),
      format: get(content, 'format'),
    };
  }
}

export class VideoScriptRenderer implements ContentRenderer {
  getType() { return 'video_script'; }
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    return {
      type: 'video_script',
      title: get(content, 'title'),
      format: get(content, 'format'),
      duration: get(content, 'duration'),
      scenes: asArray(content.scenes).map((s: any) => ({
        scene: s.scene,
        narration: get(s, 'narration'),
        onScreenText: get(s, 'onScreenText'),
        visual: get(s, 'visual'),
        evidencePoint: get(s, 'evidencePoint'),
        cta: get(s, 'cta'),
      })),
    };
  }
}

export const CONTENT_RENDERERS: Record<string, ContentRenderer> = {
  blog_article: new BlogArticleRenderer(),
  faq_page: new FaqPageRenderer(),
  landing_page: new LandingPageRenderer(),
  product_page: new ProductPageRenderer(),
  comparison_page: new ComparisonPageRenderer(),
  feature_announcement: new FeatureAnnouncementRenderer(),
  whitepaper: new WhitepaperRenderer(),
  linkedin_post: new LinkedInPostRenderer(),
  instagram_post: new InstagramPostRenderer(),
  twitter_post: new TwitterPostRenderer(),
  facebook_post: new FacebookPostRenderer(),
  youtube_description: new YouTubeDescriptionRenderer(),
  email_copy: new EmailCopyRenderer(),
  creative_brief: new CreativeBriefRenderer(),
  video_script: new VideoScriptRenderer(),
};

export function getRenderer(contentType: string): ContentRenderer {
  const normalized = contentType.replace('content_', '').toLowerCase();
  return CONTENT_RENDERERS[normalized] || new BlogArticleRenderer();
}

export function renderContent(content: any, compact = false): any {
  if (!content) return null;
  const contentType = content._type || content.assetType || content.type || 'blog_article';
  const renderer = getRenderer(contentType);
  return renderer.render({ content, compact });
}

export default {
  getRenderer,
  renderContent,
  CONTENT_RENDERERS,
};
