/**
 * Typed Frontend Content Display Renderers
 * Consistent, safe rendering utilities for all AI-generated content types
 * Handles structured data with proper fallbacks and type safety
 */

import { asText, asArray } from './normalizers';

export interface ContentRendererProps {
  content: any;
  compact?: boolean;
}

/**
 * Base renderer interface
 */
export interface ContentRenderer {
  render: (props: ContentRendererProps) => any;
  getType: () => string;
}

/**
 * Blog Article Renderer
 */
export class BlogArticleRenderer implements ContentRenderer {
  getType() { return 'blog_article'; }
  
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    
    return {
      type: 'blog_article',
      title: !compact && content.title ? asText(content.title) : null,
      metaTitle: content.metaTitle ? asText(content.metaTitle) : null,
      metaDescription: content.metaDescription ? asText(content.metaDescription) : null,
      purpose: content.purpose ? asText(content.purpose) : null,
      audience: content.audience ? asText(content.audience) : null,
      outline: content.outline && asArray(content.outline).length > 0 
        ? asArray(content.outline).map((item: any) => asText(item))
        : null,
      article: content.article ? asText(content.article) : null,
      cta: content.cta ? asText(content.cta) : null,
      internalLinks: content.internalLinkSuggestions && asArray(content.internalLinkSuggestions).length > 0
        ? asArray(content.internalLinkSuggestions).map((link: any) => ({
            url: link.url,
            text: asText(link.text)
          }))
        : null,
    };
  }
}

/**
 * Email Copy Renderer
 */
export class EmailCopyRenderer implements ContentRenderer {
  getType() { return 'email_copy'; }
  
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    
    return {
      type: 'email_copy',
      subjectLine: !compact && content.subjectLine ? asText(content.subjectLine) : null,
      previewText: content.previewText ? asText(content.previewText) : null,
      body: content.body ? asText(content.body) : null,
      cta: content.cta ? asText(content.cta) : null,
      personalizationFields: content.personalizationFields && asArray(content.personalizationFields).length > 0
        ? asArray(content.personalizationFields).map((field: string) => field)
        : null,
    };
  }
}

/**
 * Social Post Renderer (LinkedIn, Instagram, Twitter, Facebook)
 */
export class SocialPostRenderer implements ContentRenderer {
  getType() { return 'social_post'; }
  
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    
    const platform = content._platform || content.platform || 'social';
    
    return {
      type: 'social_post',
      platform,
      caption: content.caption ? asText(content.caption) : null,
      text: content.text && !content.caption ? asText(content.text) : null,
      hook: content.hook ? asText(content.hook) : null,
      cta: content.cta ? asText(content.cta) : null,
      hashtags: content.hashtags && asArray(content.hashtags).length > 0
        ? asArray(content.hashtags).map((tag: string) => tag)
        : null,
    };
  }
}

/**
 * YouTube Description Renderer
 */
export class YouTubeDescriptionRenderer implements ContentRenderer {
  getType() { return 'youtube_description'; }
  
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    
    return {
      type: 'youtube_description',
      title: !compact && content.title ? asText(content.title) : null,
      description: content.description ? asText(content.description) : null,
      timestamps: content.timestamps && asArray(content.timestamps).length > 0
        ? asArray(content.timestamps).map((ts: any) => ({
            time: ts.time,
            topic: asText(ts.topic)
          }))
        : null,
      links: content.links && asArray(content.links).length > 0
        ? asArray(content.links).map((link: any) => ({
            url: link.url,
            text: asText(link.text)
          }))
        : null,
      cta: content.cta ? asText(content.cta) : null,
    };
  }
}

/**
 * Creative Brief Renderer
 */
export class CreativeBriefRenderer implements ContentRenderer {
  getType() { return 'creative_brief'; }
  
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    
    return {
      type: 'creative_brief',
      objective: !compact && content.objective ? asText(content.objective) : null,
      audience: content.audience ? asText(content.audience) : null,
      message: content.message ? asText(content.message) : null,
      visualDirection: content.visualDirection ? asText(content.visualDirection) : null,
      brandSignals: content.brandSignals && asArray(content.brandSignals).length > 0
        ? asArray(content.brandSignals).map((signal: string) => signal)
        : null,
      requiredText: content.requiredText ? asText(content.requiredText) : null,
      cta: content.cta ? asText(content.cta) : null,
      format: content.format ? asText(content.format) : null,
      evidenceLimitations: content.evidenceLimitations && asArray(content.evidenceLimitations).length > 0
        ? asArray(content.evidenceLimitations).map((limit: string) => asText(limit))
        : null,
    };
  }
}

/**
 * Video Script Renderer
 */
export class VideoScriptRenderer implements ContentRenderer {
  getType() { return 'video_script'; }
  
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    
    return {
      type: 'video_script',
      title: !compact && content.title ? asText(content.title) : null,
      duration: content.duration ? asText(content.duration) : null,
      scenes: content.scenes && asArray(content.scenes).length > 0
        ? asArray(content.scenes).map((scene: any) => ({
            scene: scene.scene,
            narration: scene.narration ? asText(scene.narration) : null,
            onScreenText: scene.onScreenText ? asText(scene.onScreenText) : null,
            visual: scene.visual ? asText(scene.visual) : null,
            cta: scene.cta ? asText(scene.cta) : null,
          }))
        : null,
    };
  }
}

/**
 * FAQ Page Renderer
 */
export class FAQPageRenderer implements ContentRenderer {
  getType() { return 'faq_page'; }
  
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    
    return {
      type: 'faq_page',
      title: !compact && content.title ? asText(content.title) : null,
      faqItems: content.faqItems && asArray(content.faqItems).length > 0
        ? asArray(content.faqItems).map((item: any) => ({
            question: asText(item.question),
            answer: asText(item.answer)
          }))
        : null,
    };
  }
}

/**
 * Landing Page Renderer
 */
export class LandingPageRenderer implements ContentRenderer {
  getType() { return 'landing_page'; }
  
  render({ content, compact = false }: ContentRendererProps) {
    if (!content) return null;
    
    return {
      type: 'landing_page',
      headline: !compact && content.headline ? asText(content.headline) : null,
      subHeadline: content.subHeadline ? asText(content.subHeadline) : null,
      problem: content.problem ? asText(content.problem) : null,
      solution: content.solution ? asText(content.solution) : null,
      body: content.body ? asText(content.body) : null,
      cta: content.cta ? asText(content.cta) : null,
    };
  }
}

/**
 * Renderer Registry
 * Maps content types to their renderers
 */
export const CONTENT_RENDERERS: Record<string, ContentRenderer> = {
  blog_article: new BlogArticleRenderer(),
  email_copy: new EmailCopyRenderer(),
  linkedin_post: new SocialPostRenderer(),
  instagram_post: new SocialPostRenderer(),
  twitter_post: new SocialPostRenderer(),
  facebook_post: new SocialPostRenderer(),
  youtube_description: new YouTubeDescriptionRenderer(),
  creative_brief: new CreativeBriefRenderer(),
  video_script: new VideoScriptRenderer(),
  faq_page: new FAQPageRenderer(),
  landing_page: new LandingPageRenderer(),
};

/**
 * Get renderer for content type
 */
export function getRenderer(contentType: string): ContentRenderer {
  // Handle variations
  const normalizedType = contentType
    .replace('content_', '')
    .replace('_post', '_post')
    .toLowerCase();
  
  return CONTENT_RENDERERS[normalizedType] || CONTENT_RENDERERS[normalizedType + '_post'] || new BlogArticleRenderer();
}

/**
 * Render content with appropriate renderer
 */
export function renderContent(content: any, compact = false): any {
  if (!content) return null;
  
  const contentType = content._type || content.assetType || content.type || 'blog_article';
  const renderer = getRenderer(contentType);
  
  return renderer.render({ content, compact });
}

export default {
  BlogArticleRenderer,
  EmailCopyRenderer,
  SocialPostRenderer,
  YouTubeDescriptionRenderer,
  CreativeBriefRenderer,
  VideoScriptRenderer,
  FAQPageRenderer,
  LandingPageRenderer,
  CONTENT_RENDERERS,
  getRenderer,
  renderContent,
};
