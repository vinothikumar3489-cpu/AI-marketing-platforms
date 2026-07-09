import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, Lightbulb, Zap, Target, TrendingUp, Shield,
  ChevronDown, ChevronUp, Info, X, Search, Copy, Download, Share2,
  Clock, FileText, BarChart2, Activity, Users, Building, Code, DollarSign,
  ExternalLink, Flag, Calendar, UserCheck, Layers, Sliders, Eye,
  ArrowUpRight, ArrowDownRight, ArrowRight, GripHorizontal, Star, Flame,
  Filter, Globe, Map, Briefcase, Loader2, Sparkles, Link, Plus, Check,
  MoreHorizontal, Edit3, MessageSquare, Bell, Pin, Trash2, ThumbsUp,
  ThumbsDown, HelpCircle, User, List, Grid, Maximize2, Minimize2,
  Keyboard, Command, CheckSquare, Square, LayoutDashboard, RefreshCw,
  Send, Image, Video, Music, PenTool, Megaphone, BookOpen, Mail,
  Hash, AtSign, Quote, ArrowLeft, ArrowRight as ArrowRightIcon,
  AlignLeft, AlignCenter, AlignJustify, Bold, Italic, Underline,
  Type, Heading1, Heading2, ListOrdered, List as ListIcon,
  Table, ImagePlus, Upload, FolderOpen, Save, Printer,
  FileDown, FileUp, Clipboard, ClipboardCheck,
  Settings, SlidersHorizontal, PanelRightOpen, PanelRightClose,
  Radio, RadioTower, Waypoints, ScrollText, NotepadText,
  CalendarDays, CalendarCheck, CalendarRange, ChartNoAxesCombined,
  FolderKanban, CheckCheck, Bookmark, BookmarkCheck,
  CircleCheckBig, CircleDashed, CircleDot, CircleOff,
  Speech, TextSelect, WholeWord, Wifi, Monitor,
  Eraser, EyeOff, Gavel
} from 'lucide-react';
import {
  ProgressBar, StatusBadge, ConfidenceBadge, PriorityChip, EnterpriseInsightCard,
  KPIDashboard, MiniRadarLegend, EnterpriseEmptyState, SmartNavigation,
  SearchBar, LoadingSkeleton
} from './EnterpriseComponents';
import { Badge, Card, EmptyState, Loading, PageHeader, ScoreCard, SectionTitle, EvidenceBadge } from './UI';
import { useWorkspaceMemory } from './EnterpriseDecisionSuite';
import { api } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asText, asNumber, renderSafeValue } from '../lib/normalizers';
import { getIntegrationHealth, sendTestEmail, generatePosterImage, renderVideo } from '../lib/api';

const C = {
  excellent: '#10e18b', good: '#53a7ff', needsImprovement: '#ffb347',
  critical: '#ff4757', bg: '#0f1729', card: '#151d2b', border: '#293245',
  text: '#e5e7eb', muted: '#9aa7bd', dim: '#6b7280', accent: '#818cf8',
  purple: '#a855f7', orange: '#ff6b35', pink: '#ec4899', cyan: '#06b6d4',
  brand: '#53a7ff'
};

const S = {
  card: { background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '20px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' },
  cardTitle: { fontSize: '15px', fontWeight: 600, color: C.text, flex: 1 },
  flexCenter: { display: 'flex', alignItems: 'center', gap: '8px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' },
  input: { width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px', outline: 'none' },
  btn: (color: string) => ({ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${color}`, background: `${color}15`, cursor: 'pointer', fontSize: '11px', fontWeight: 600, color, display: 'inline-flex', alignItems: 'center', gap: '4px' }),
  tag: (color: string) => ({ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${color}15`, color }),
  row: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.bg, borderRadius: '8px', border: `1px solid #1d2738` },
};

function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function now(): string { return new Date().toISOString(); }

function IntegrationHealthPanel() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getIntegrationHealth().then(d => { setHealth(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ fontSize: '11px', color: C.dim, padding: '8px 0' }}>Checking provider health...</div>;
  if (!health) return null;
  const { providers } = health;
  const items = (() => {
    const reasonMap: Record<string, string> = {
      missing_api_key: 'Missing API key', missing_from_email: 'Missing from email',
      init_failed: 'Init failed', missing_env_vars: 'Missing config',
      pollinations_only: 'Pollinations only', pollinations_fal_configured: 'Pollinations + Fal',
      shotstack_configured: 'Shotstack', creatomate_configured: 'Creatomate',
      no_video_provider: 'No provider',
    };
    const emailDesc = providers.email.configured ? (providers.email.provider === 'gmail' ? 'Gmail SMTP' : providers.email.provider === 'resend' ? 'Resend' : providers.email.provider || 'Configured') : (reasonMap[providers.email.reason] || providers.email.reason || 'Not configured');
    const imgPollinations = providers.image?.pollinations?.configured !== false;
    const imgFal = providers.image?.fal?.configured === true;
    const imgDesc = imgPollinations && imgFal ? 'Pollinations + Fal' : imgPollinations ? 'Pollinations' : imgFal ? 'Fal' : (reasonMap[providers.image.reason] || 'None');
    const storageDesc = providers.storage.configured ? 'Cloudinary' : (reasonMap[providers.storage.reason] || 'Not configured');
    const vidShotstack = providers.video?.shotstack?.configured === true;
    const vidCreatomate = providers.video?.creatomate?.configured === true;
    const videoDesc = vidShotstack ? 'Shotstack' : vidCreatomate ? 'Creatomate' : (reasonMap[providers.video.reason] || 'Not available');
    return [
      { label: 'Email', ok: providers.email.configured, detail: emailDesc, reason: providers.email.reason },
      { label: 'Image', ok: imgPollinations || imgFal, detail: imgDesc, reason: providers.image.reason },
      { label: 'Storage', ok: providers.storage.configured, detail: storageDesc, reason: providers.storage.reason },
      { label: 'Video', ok: vidShotstack || vidCreatomate, detail: videoDesc, reason: providers.video.reason },
      { label: 'AI', ok: providers.ai?.gemini || providers.ai?.groq, detail: `${providers.ai?.gemini ? 'Gemini' : ''}${providers.ai?.gemini && providers.ai?.groq ? ' + ' : ''}${providers.ai?.groq ? 'Groq' : ''}${!providers.ai?.gemini && !providers.ai?.groq ? 'None' : ''}` },
    ];
  })();
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}><Wifi size={12} /> Integration Status:</div>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', background: item.ok ? 'rgba(16,225,139,0.08)' : 'rgba(255,179,71,0.08)', border: `1px solid ${item.ok ? 'rgba(16,225,139,0.2)' : 'rgba(255,179,71,0.2)'}` }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.ok ? C.excellent : C.needsImprovement }} />
          <span style={{ fontSize: '10px', color: item.ok ? C.excellent : C.needsImprovement, fontWeight: 600 }}>{item.label}</span>
          <span style={{ fontSize: '9px', color: C.dim }}>{item.detail}{item.reason ? ` (${item.reason})` : ''}</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DATA TYPES
// ══════════════════════════════════════════════════════════════

export interface StudioAsset {
  id: string; type: string; subType: string; title: string; content: any;
  targetAudience?: string; tone?: string; goal?: string; wordCount?: number;
  evidenceRefs?: string[]; confidence: number; generatedAt: string;
  approvalStatus: 'draft' | 'approved' | 'needs-review' | 'archived';
  complianceNotes?: string; warnings?: string[];
}

export interface EvidenceRef { source: string; confidence: number; text: string; }

export interface StudioState {
  assets: StudioAsset[]; activeTab: string;
}

function createStudioState(): StudioState {
  return { assets: [], activeTab: 'content' };
}

// ══════════════════════════════════════════════════════════════
// EVIDENCE COLLECTOR
// ══════════════════════════════════════════════════════════════

function collectEvidence(fullResults: any): EvidenceRef[] {
  const ev: EvidenceRef[] = [];
  try {
    const sources = [
      { data: fullResults?.growth, label: 'Growth Analysis' },
      { data: fullResults?.growth?.product, label: 'Product Analysis' },
      { data: fullResults?.growth?.market, label: 'Market Intelligence' },
      { data: fullResults?.growth?.audience, label: 'Audience Intelligence' },
      { data: fullResults?.growth?.competitor, label: 'Competitor Intelligence' },
      { data: fullResults?.growth?.campaign, label: 'Campaign Strategy' },
      { data: fullResults?.growth?.positioning, label: 'Positioning Strategy' },
      { data: fullResults?.seoIntelligence, label: 'SEO Intelligence' },
      { data: fullResults?.seoIntelligence?.keywordIntelligence, label: 'Keywords' },
      { data: fullResults?.seoIntelligence?.contentGapAnalysis, label: 'Content Gaps' },
    ];
    sources.forEach(s => {
      if (!s.data) return;
      const str = JSON.stringify(s.data).slice(0, 200);
      if (str.length > 20) ev.push({ source: s.label, confidence: 75, text: str.slice(0, 150) });
    });
  } catch {}
  return ev;
}

// ══════════════════════════════════════════════════════════════
// CONTENT GENERATION HELPERS
// ══════════════════════════════════════════════════════════════

function generateContent(topic: string, audience: string, tone: string, goal: string, wordCount: number, evidence: EvidenceRef[], subType: string): StudioAsset {
  const ev = evidence.filter(e => e.confidence >= 60);
  const hasEvidence = ev.length > 0;
  const nowStr = now();
  const warnings: string[] = [];
  if (!hasEvidence) warnings.push('Evidence unavailable — connect more data sources.');
  if (!topic) warnings.push('Topic is required for generation.');

  const wordRange = wordCount > 0 ? `approximately ${wordCount} words` : 'concise';

  const body = `# ${topic}

${!hasEvidence ? '> **Note:** This content was generated without specific evidence. Connect analytics and intelligence data for evidence-backed content.\n' : ''}

## Target Audience
${audience || 'General audience interested in this topic.'}

## Tone & Style
${tone || 'Professional'} tone with a focus on ${goal || 'informing and engaging the reader'}.

## Introduction
${topic ? `This comprehensive guide explores ${topic.toLowerCase()}, providing actionable insights for ${audience || 'businesses and professionals'} looking to achieve their ${goal || 'goals'}.` : 'Content generation requires a topic. Please provide a topic to generate content.'}

${hasEvidence ? `## Evidence-Based Insights\n\n${ev.slice(0, 3).map(e => `- **${e.source}**: ${e.text}`).join('\n')}\n` : ''}

## Key Points
1. Understanding the landscape of ${topic || 'your industry'}
2. Strategic approaches for ${audience || 'target audience'}
3. ${goal ? `Achieving ${goal} through focused execution` : 'Measuring success and optimizing performance'}
4. Best practices and proven methodologies
5. Next steps and actionable recommendations

## Conclusion
${topic ? `This ${wordRange} overview of ${topic.toLowerCase()} provides a ${tone || 'professional'} perspective tailored for ${audience || 'decision-makers'}. Focus on implementing the key takeaways to drive meaningful results.` : 'Provide a topic to receive tailored content.'}

---
*Generated at ${new Date(nowStr).toLocaleString()} | Confidence: ${hasEvidence ? '85%' : '45%'}*`;

  return {
    id: generateId(), type: 'content', subType,
    title: topic || 'Untitled Content', content: body,
    targetAudience: audience, tone, goal, wordCount,
    evidenceRefs: hasEvidence ? ev.map(e => e.source) : undefined,
    confidence: hasEvidence ? 85 : 45,
    generatedAt: nowStr, approvalStatus: 'draft',
    warnings: warnings.length > 0 ? warnings : undefined,
    complianceNotes: hasEvidence ? undefined : 'Content is not backed by specific evidence data.'
  };
}

function generateEmail(type: string, persona: string, tone: string, subject: string, evidence: EvidenceRef[]): StudioAsset {
  const hasEvidence = evidence.length > 0;
  const nowStr = now();
  const warnings: string[] = [];
  if (!hasEvidence) warnings.push('No audience intelligence available — content may not be personalized.');
  if (type === 'cold-outreach' && !evidence.some(e => e.source.includes('Audience'))) warnings.push('Cold outreach without audience data may have lower engagement.');

  const complianceNote = 'This is a draft email. Review and comply with CAN-SPAM, GDPR, and CASL before sending. Include unsubscribe link and physical mailing address. No emails are auto-sent from this system.';
  const spamScore = hasEvidence ? 'Low' : 'Medium';

  const body = `Subject: ${subject || `Your ${persona || 'business'} opportunity`}

Preview: ${subject ? `Insights on ${subject.toLowerCase()} for your team` : 'Personalized insights for your business'}

Hi {{first_name}},

${hasEvidence ? `Based on our analysis of ${evidence.slice(0, 2).map(e => e.source).join(' and ')}, we identified opportunities that could benefit ${persona || 'your organization'}.` : `I hope this message finds you well. I'm reaching out because we believe ${persona || 'your team'} could benefit from our platform.`}

${type === 'cold-outreach' ? `I'd love to show you how companies like yours are achieving measurable results. Would you be open to a brief 15-minute call this week?` :
  type === 'follow-up' ? `I wanted to follow up on my previous message. Have you had a chance to review the information? Happy to answer any questions.` :
  type === 'demo-request' ? `I'd like to schedule a personalized demo to show you how our platform works and answer any specific questions you might have.` :
  `Let me know if you'd like to learn more about how we can help ${persona || 'your organization'} achieve its goals.`}

Best regards,
{{sender_name}}
{{sender_title}}

---
${complianceNote}
Spam Risk: ${spamScore} | Reading Time: ~2 min
Confidence: ${hasEvidence ? '80%' : '50%'} | Approval Status: Draft`;

  return {
    id: generateId(), type: 'email', subType: type,
    title: subject || `${type} Email`, content: body,
    targetAudience: persona, tone,
    confidence: hasEvidence ? 80 : 50, generatedAt: nowStr,
    approvalStatus: 'draft', warnings,
    complianceNotes: complianceNote
  };
}

function generateSocial(platform: string, goal: string, tone: string, topic: string, evidence: EvidenceRef[]): StudioAsset {
  const hasEvidence = evidence.length > 0;
  const isVisual = platform === 'instagram' || platform === 'youtube-community' || platform === 'tiktok';
  const bestTime = platform === 'linkedin' ? 'Tue-Thu 8-10 AM' : platform === 'instagram' ? 'Mon-Fri 11 AM-1 PM' : platform === 'facebook' ? 'Wed 11 AM-1 PM' : 'Daily 9-11 AM';

  const caption = `${topic || 'Industry insights'}${hasEvidence ? ` — backed by our latest analysis of ${evidence[0]?.source || 'market data'}` : ''}

${goal === 'awareness' ? `Discover how ${topic || 'industry trends'} are shaping the future.` :
  goal === 'engagement' ? `What's your take on ${topic || 'this trend'}? Drop your thoughts below! 👇` :
  goal === 'conversion' ? `Ready to transform your approach to ${topic || 'business growth'}?` :
  `Learn more about ${topic || 'key insights'} and stay ahead of the curve.`}

${hasEvidence ? `📊 Source: ${evidence.slice(0, 2).map(e => e.source).join(', ')}` : ''}

#${(topic || 'business').replace(/\s+/g, '')} #${goal || 'insights'} #${platform}
`;

  return {
    id: generateId(), type: 'social', subType: platform,
    title: `${platform} post: ${topic || 'Untitled'}`,
    content: { platform, postType: goal, hook: topic || 'Industry insights', caption, hashtags: [`#${platform}`, `#${goal || 'marketing'}`], cta: goal === 'conversion' ? 'Learn More' : 'Share Your Thoughts', visualSuggestion: isVisual ? 'Use engaging visuals, carousel for Instagram, short video for TikTok' : 'Use a professional image or data visualization', targetAudience: topic, goal, bestPostingTime: bestTime, confidence: hasEvidence ? 82 : 48, evidenceSource: hasEvidence ? evidence[0]?.source : undefined },
    targetAudience: topic, tone, goal,
    confidence: hasEvidence ? 82 : 48, generatedAt: now(),
    approvalStatus: 'draft',
    warnings: !hasEvidence ? ['No evidence data available — social insights may be generic.'] : undefined
  };
}

function generateCreative(assetType: string, platform: string, headline: string, audience: string, evidence: EvidenceRef[]): StudioAsset {
  const dimensions: Record<string, string> = {
    banner: '728x90', 'social-graphic': '1200x630', 'display-ad': '300x250',
    thumbnail: '1280x720', poster: '1080x1920', carousel: '1080x1080'
  };
  const brandColors = ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#53a7ff'];
  const topic = headline || '';
  const aud = audience || '';

  let visualDirection = 'Bold typography with gradient background, modern digital aesthetic';
  let layoutDescription = 'Full-bleed background with centered headline and CTA button at bottom';
  let imagePrompt = `${platform} visual for ${aud || 'target audience'}, no text, no letters, no words, no typography, no watermark`;
  let cta = 'Learn More';
  let subheadline = '';

  const hl = topic.toLowerCase();
  if (hl.includes('movie') || hl.includes('poster') || hl.includes('figma')) {
    visualDirection = 'Cinematic poster design with dramatic lighting, bold title area, character silhouette, layered gradients, and Figma-style design elements.';
    layoutDescription = 'Large movie title at top, central hero visual, supporting tagline below, CTA button near bottom.';
    imagePrompt = 'Cinematic poster design workspace inspired by Figma, teen-focused creative design, dramatic lighting, colorful gradients, digital design elements, blank poster mockup, no words, no letters, no typography, no watermark.';
    cta = 'Create Your Poster';
    subheadline = 'Create a bold cinematic poster that grabs attention and looks professional.';
  } else if (hl.includes('skincare') || hl.includes('organic') || hl.includes('beauty')) {
    visualDirection = 'Clean natural aesthetics with botanical elements, soft lighting, and organic textures.';
    layoutDescription = 'Product hero centered, ingredient callouts on sides, CTA at bottom.';
    imagePrompt = 'Organic skincare product photography, natural ingredients, botanical background, clean aesthetic, no text, no words, no typography, no watermark.';
    cta = 'Shop Now';
    subheadline = 'Natural ingredients. Real results. Perfect for modern wellness routines.';
  } else if (hl.includes('hospital') || hl.includes('chatbot') || hl.includes('clinic') || hl.includes('health')) {
    visualDirection = 'Modern medical interface with chatbot UI, clean gradients, and professional healthcare aesthetics.';
    layoutDescription = 'Split layout: left side chatbot interface preview, right side headline and benefits.';
    imagePrompt = 'Modern hospital reception with AI chatbot interface, clean medical design, professional healthcare, no text, no words, no typography, no watermark.';
    cta = 'Book Demo';
    subheadline = 'Automate patient scheduling with intelligent AI conversation flows.';
  } else if (hl.includes('bike') || hl.includes('electric') || hl.includes('vehicle') || hl.includes('scooter')) {
    visualDirection = 'Sleek futuristic design with dynamic motion lines, urban backdrop, and product hero shot.';
    layoutDescription = 'Product hero center-left, speed/range specs right, CTA below.';
    imagePrompt = 'Sleek electric bike on urban street, futuristic design, eco-friendly commuting, no text, no words, no typography, no watermark.';
    cta = 'Test Ride';
    subheadline = 'Eco-friendly commuting with cutting-edge electric vehicle technology.';
  } else if (hl.includes('course') || hl.includes('coding') || hl.includes('learn') || hl.includes('education')) {
    visualDirection = 'Modern educational design with code snippets, graduation cap, and interactive elements.';
    layoutDescription = 'Top hero section with headline, middle course highlights, bottom CTA.';
    imagePrompt = 'Modern online learning setup, laptop with code on screen, student studying, no text, no words, no typography, no watermark.';
    cta = 'Enroll Today';
    subheadline = 'Learn from industry experts with hands-on projects and real-world skills.';
  } else if (aud) {
    subheadline = `Designed specifically for ${aud} to achieve real results.`;
    imagePrompt = `${platform} visual for ${aud}, modern professional design, no text, no letters, no words, no typography, no watermark`;
  } else {
    imagePrompt = `${platform} creative, modern professional marketing visual, no text, no letters, no words, no typography, no watermark`;
    subheadline = 'Professional design crafted for maximum impact and engagement.';
  }

  return {
    id: generateId(), type: 'creative', subType: assetType,
    title: `${assetType}: ${headline || 'Creative Asset'}`,
    content: {
      headline: headline || (audience ? `Campaign for ${audience}` : 'Featured Campaign'),
      subheadline,
      visualDirection,
      layoutDescription,
      brandColors, typography: 'Inter (headlines), system-ui (body)',
      imagePrompt,
      cta, dimensions: dimensions[assetType] || '1200x630',
      platform, audience: audience || 'Target Audience',
      campaignGoal: 'Brand awareness and engagement',
      evidenceRef: evidence.length > 0 ? evidence[0].source : undefined
    },
    confidence: evidence.length > 0 ? 80 : 50, generatedAt: now(),
    approvalStatus: 'draft',
    warnings: evidence.length === 0 ? ['Evidence not available — creative is generated from general best practices.'] : undefined
  };
}

function generateVideo(videoType: string, platform: string, topic: string, duration: string, evidence: EvidenceRef[]): StudioAsset {
  const durationSec = duration === '15s' ? 15 : duration === '30s' ? 30 : duration === '60s' ? 60 : 90;
  const sceneCount = durationSec <= 15 ? 2 : durationSec <= 30 ? 3 : durationSec <= 60 ? 5 : 7;
  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    scene: i + 1, duration: `${Math.round(durationSec / sceneCount)}s`,
    visual: i === 0 ? `Hook: ${topic || 'Attention-grabbing opening'} — dynamic visual` :
      i === sceneCount - 1 ? `CTA: Strong closing with brand and action` :
      `Key message ${i}: Supporting points with ${evidence.length > 0 ? 'data visualization' : 'lifestyle imagery'}`,
    audio: i === 0 ? 'Energetic, attention-grabbing music' :
      i === sceneCount - 1 ? 'Building to crescendo, then soft landing for CTA' :
      'Steady background track with voiceover',
    transitions: i === 0 ? 'Quick cut' : i === sceneCount - 1 ? 'Slow fade to black with logo' : 'Cross dissolve'
  }));

  return {
    id: generateId(), type: 'video', subType: videoType,
    title: `${videoType} — ${topic || 'Untitled'}`,
    content: {
      hook: `${topic ? `What if you could ${topic.toLowerCase()}?` : 'Attention-grabbing question about your industry'}`,
      script: `${topic ? `[OPEN: Visual of ${topic} in action]\n\nDid you know that ${evidence.length > 0 ? `according to ${evidence[0]?.source}...` : 'most businesses are missing out on this opportunity?'}\n\n[SCENE 1: Problem introduction]\n[SCENE 2: Solution presentation]\n[SCENE 3: Proof and social proof]\n[SCENE 4: CTA and close]\n\nReady to get started? Visit our website.` : 'Script generation requires a topic.'}`,
      storyboard: scenes,
      voiceover: `Professional — ${durationSec <= 30 ? 'Fast-paced, energetic' : durationSec <= 60 ? 'Conversational, informative' : 'Educational, detailed'}`,
      visualDirection: platform === 'tiktok' || platform === 'instagram' ? 'Vertical 9:16, fast cuts, text overlays' : 'Horizontal 16:9, professional lighting, brand consistent',
      musicMood: durationSec <= 30 ? 'Upbeat, energetic' : durationSec <= 60 ? 'Professional, inspiring' : 'Educational, thoughtful',
      transitionSuggestions: 'Quick cuts for fast pacing, cross dissolves for educational sections',
      cta: 'Visit our website to learn more',
      duration, platform: platform || 'general',
      targetAudience: topic, campaignGoal: 'Brand awareness',
      evidenceReference: evidence.length > 0 ? evidence[0].source : undefined
    },
    confidence: evidence.length > 0 ? 78 : 45, generatedAt: now(),
    approvalStatus: 'draft',
    warnings: evidence.length === 0 ? ['Evidence data not available — video script is based on general best practices.'] : undefined
  };
}

function generateCampaign(name: string, duration: string, audience: string, goal: string, channels: string[], evidence: EvidenceRef[]): StudioAsset {
  const weeks = duration === '7d' ? 1 : duration === '30d' ? 4 : duration === '60d' ? 8 : 12;
  const weeklyPlan = Array.from({ length: Math.min(weeks, 4) }, (_, i) => ({
    week: i + 1,
    theme: i === 0 ? 'Awareness & Launch' : i === 1 ? 'Engagement & Education' : i === 2 ? 'Conversion Focus' : 'Retarget & Optimize',
    activities: [`Create ${channels[0] || 'primary channel'} assets`, `Launch ${i === 0 ? 'initial campaign' : 'optimization phase'}`, `Analyze week ${i} performance`],
    deliverables: [`${i === 0 ? 5 : 3} content pieces`, 'Performance report', 'Optimization recommendations']
  }));

  return {
    id: generateId(), type: 'campaign', subType: duration,
    title: name || `${duration} Campaign Plan`,
    content: {
      campaignName: name || `${duration} Campaign`,
      objective: goal || 'Brand awareness and lead generation',
      audience: audience || 'Target demographic based on analysis',
      channels: channels.length > 0 ? channels : ['Email', 'LinkedIn', 'Content'],
      budgetRecommendation: evidence.length > 0 ? 'Budget recommendation available — based on channel analysis' : 'Connect analytics data for budget recommendations',
      timeline: duration, weeklyPlan,
      contentAssetsNeeded: [`${channels[0] || 'Email'} sequences`, `Landing page${channels.length > 1 ? 's' : ''}`, 'Social content', 'Analytics setup'],
      kpis: ['Impressions', 'Click-through rate', 'Conversion rate', 'ROI'],
      risks: ['Market saturation', 'Audience fatigue', 'Budget constraints'],
      dependencies: ['Campaign assets ready', 'Analytics tracking configured', 'Team assignments confirmed'],
      owner: 'Marketing Team',
      evidenceSource: evidence.length > 0 ? evidence.map(e => e.source).join(', ') : undefined
    },
    confidence: evidence.length > 0 ? 83 : 50, generatedAt: now(),
    approvalStatus: 'draft',
    warnings: evidence.length === 0 ? ['No campaign evidence available — plan is based on general best practices. ROI estimate unavailable — connect analytics/ad platform.'] : undefined,
    complianceNotes: evidence.length === 0 ? undefined : 'Campaign based on available analysis data.'
  };
}

// ══════════════════════════════════════════════════════════════
// PART 8B — CONTENT STUDIO
// ══════════════════════════════════════════════════════════════

const contentTypes = [
  { value: 'blog-article', label: 'Blog Article' },
  { value: 'landing-page', label: 'Landing Page' },
  { value: 'product-page', label: 'Product Page' },
  { value: 'case-study', label: 'Case Study' },
  { value: 'feature-announcement', label: 'Feature Announcement' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'faq-page', label: 'FAQ Page' },
  { value: 'comparison-page', label: 'Comparison Page' },
  { value: 'whitepaper-outline', label: 'Whitepaper Outline' },
  { value: 'linkedin-article', label: 'LinkedIn Article' },
];

export function ContentStudio({ evidence, onSave }: { evidence: EvidenceRef[]; onSave: (asset: StudioAsset) => void }) {
  const [type, setType] = useState('blog-article');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('professional');
  const [goal, setGoal] = useState('inform');
  const [wordCount, setWordCount] = useState(800);
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<StudioAsset | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');

  const handleGenerate = () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      const result = generateContent(topic, audience, tone, goal, wordCount, evidence, type);
      setAsset(result);
      setEditContent(result.content);
      setGenerating(false);
    }, 800);
  };

  const handleSave = () => {
    if (!asset) return;
    const updated = editMode ? { ...asset, content: editContent } : asset;
    setAsset(updated);
    onSave(updated);
    setEditMode(false);
  };

  const handleCopy = () => {
    if (!asset) return;
    navigator.clipboard.writeText(editMode ? editContent : asset.content);
  };

  const tones = ['professional', 'conversational', 'persuasive', 'educational', 'inspirational', 'humorous'];
  const goals = ['inform', 'convert', 'engage', 'educate', 'inspire', 'entertain'];

  const currentType = contentTypes.find(t => t.value === type);

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><BookOpen size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Content Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Asset Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={S.input}>
              {contentTypes.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Word Count</label>
            <input type="number" value={wordCount} onChange={e => setWordCount(Number(e.target.value))} min={100} max={5000} step={100} style={S.input} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., How AI is transforming marketing automation" style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Target Audience</label>
            <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g., B2B marketers, SaaS founders" style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={S.input}>
              {tones.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Goal</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={S.input}>
              {goals.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ ...S.btn(C.brand), padding: '8px 20px' }}>
            {generating ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Sparkles size={14} /> Generate {currentType?.label || 'Content'}</>}
          </button>
          {asset && <button onClick={handleSave} style={S.btn(C.excellent)}><Save size={14} /> Save Asset</button>}
          {asset && <button onClick={() => { setEditMode(!editMode); if (!editMode) setEditContent(asset.content); }} style={S.btn(C.accent)}><Edit3 size={14} /> {editMode ? 'View Preview' : 'Edit'}</button>}
          {asset && <button onClick={handleCopy} style={S.btn(C.accent)}><Copy size={14} /> Copy</button>}
        </div>
      </div>

      {generating && (
        <div style={S.card}><LoadingSkeleton type="card" count={3} /></div>
      )}

      {asset && !generating && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>{asset.title}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={S.tag(C.brand)}>{currentType?.label || asset.subType}</span>
                <ConfidenceBadge value={asset.confidence} />
                <span style={S.tag(asset.approvalStatus === 'draft' ? C.needsImprovement : C.excellent)}>{asset.approvalStatus}</span>
                {asset.evidenceRefs && asset.evidenceRefs.length > 0 && <span style={S.tag(C.excellent)}>{asset.evidenceRefs.length} evidence sources</span>}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: C.dim }}>{new Date(asset.generatedAt).toLocaleString()}</div>
          </div>
          {asset.warnings && asset.warnings.map((w, i) => (
            <div key={i} style={{ padding: '6px 10px', background: 'rgba(255,179,71,0.08)', borderRadius: '6px', border: '1px solid rgba(255,179,71,0.2)', fontSize: '11px', color: C.needsImprovement, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={12} /> {renderSafeValue(w)}
            </div>
          ))}
          {editMode ? (
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={20} style={{ ...S.input, fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6, resize: 'vertical' }} />
          ) : (
            <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '500px', overflow: 'auto', padding: '12px', background: C.bg, borderRadius: '8px' }}>{asset.content}</div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => { const blob = new Blob([editMode ? editContent : asset.content], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${asset.title.replace(/\s+/g, '-').toLowerCase()}.md`; a.click(); URL.revokeObjectURL(url); }} style={S.btn(C.good)}><FileDown size={14} /> Export MD</button>
            <button onClick={handleCopy} style={S.btn(C.accent)}><Copy size={14} /> Copy Content</button>
          </div>
        </div>
      )}

      {!asset && !generating && (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }}>
          <BookOpen size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div>Enter a topic and click Generate to create {currentType?.label || 'content'}.</div>
          {evidence.length === 0 && <div style={{ marginTop: '8px', color: C.needsImprovement, fontSize: '11px' }}>Evidence unavailable — connect more data sources for higher quality content.</div>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 8C — EMAIL CAMPAIGN STUDIO
// ══════════════════════════════════════════════════════════════

const emailTypes = [
  { value: 'cold-outreach', label: 'Cold Outreach' },
  { value: 'follow-up', label: 'Follow-Up Sequence' },
  { value: 'demo-request', label: 'Demo Request' },
  { value: 'investor-outreach', label: 'Investor Outreach' },
  { value: 'onboarding', label: 'Customer Onboarding' },
  { value: 'retention', label: 'Customer Retention' },
  { value: 're-engagement', label: 'Re-engagement' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'referral', label: 'Referral Campaign' },
];

export function EmailStudio({ evidence, onSave }: { evidence: EvidenceRef[]; onSave: (asset: StudioAsset) => void }) {
  const { selectedChatId } = useProject();
  const [type, setType] = useState('cold-outreach');
  const [persona, setPersona] = useState('');
  const [tone, setTone] = useState('professional');
  const [subject, setSubject] = useState('');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<StudioAsset | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setSendResult(null);
    setTimeout(() => {
      const result = generateEmail(type, persona, tone, subject, evidence);
      setAsset(result);
      setEditContent(result.content);
      setGenerating(false);
    }, 600);
  };

  const handleSave = () => {
    if (!asset) return;
    const updated = editMode ? { ...asset, content: editContent } : asset;
    setAsset(updated);
    onSave(updated);
    setEditMode(false);
  };

  const handleSendTest = async () => {
    if (!asset || !selectedChatId) return;
    setSending(true);
    setSendResult(null);
    try {
      const body = editMode ? editContent : asset.content;
      const result = await sendTestEmail(selectedChatId, {
        recipientEmail: recipientEmail.trim(),
        subject: asset.title,
        body: typeof body === 'string' ? body : JSON.stringify(body),
        approvalChecked,
        senderName: 'AI Marketing Platform',
      });
      setSendResult(result);
      if (result.success) onSave(asset);
    } catch (err: any) {
      setSendResult({ success: false, error: err.message || 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const currentType = emailTypes.find(t => t.value === type);

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ ...S.card, background: 'rgba(255,179,71,0.05)', border: '1px solid rgba(255,179,71,0.3)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Shield size={16} style={{ color: C.needsImprovement }} />
          <div style={{ fontSize: '12px', color: C.needsImprovement }}>Email Compliance Notice: Review CAN-SPAM, GDPR, and CASL before sending. All emails are drafts requiring manual approval. No emails are auto-sent.</div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardHeader}><Mail size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Email Campaign Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Email Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={S.input}>
              {emailTypes.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={S.input}>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Target Persona</label>
            <input value={persona} onChange={e => setPersona(e.target.value)} placeholder="e.g., Marketing Director at SaaS company" style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Subject Line</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" style={S.input} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button onClick={handleGenerate} disabled={generating} style={{ ...S.btn(C.brand), padding: '8px 20px' }}>
            {generating ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Sparkles size={14} /> Generate {currentType?.label || 'Email'}</>}
          </button>
          {asset && <button onClick={handleSave} style={S.btn(C.excellent)}><Save size={14} /> Save Draft</button>}
          {asset && <button onClick={() => { setEditMode(!editMode); if (!editMode) setEditContent(asset.content); }} style={S.btn(C.accent)}><Edit3 size={14} /> {editMode ? 'Preview' : 'Edit'}</button>}
          {asset && <button onClick={() => navigator.clipboard.writeText(editMode ? editContent : asset.content)} style={S.btn(C.accent)}><Copy size={14} /> Copy</button>}
        </div>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={2} /></div>}

      {asset && !generating && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{asset.title}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={S.tag(C.brand)}>{currentType?.label}</span>
                <ConfidenceBadge value={asset.confidence} />
                {asset.targetAudience && <span style={S.tag(C.accent)}>{asset.targetAudience}</span>}
              </div>
            </div>
          </div>
          {asset.warnings?.map((w, i) => (
            <div key={i} style={{ padding: '6px 10px', background: 'rgba(255,179,71,0.08)', borderRadius: '6px', border: '1px solid rgba(255,179,71,0.2)', fontSize: '11px', color: C.needsImprovement, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={12} /> {renderSafeValue(w)}
            </div>
          ))}
          {editMode ? (
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={20} style={{ ...S.input, fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6, resize: 'vertical' }} />
          ) : (
            <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '500px', overflow: 'auto', padding: '12px', background: C.bg, borderRadius: '8px' }}>{asset.content}</div>
          )}
          {asset.complianceNotes && (
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,179,71,0.05)', borderRadius: '6px', fontSize: '11px', color: C.needsImprovement, display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <Shield size={12} style={{ flexShrink: 0, marginTop: '1px' }} /> {asset.complianceNotes}
            </div>
          )}

          {/* Send Test Email Section */}
          <div style={{ marginTop: '16px', padding: '14px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} style={{ color: C.brand }} /> Send Test Email
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', color: C.muted, fontWeight: 600, display: 'block', marginBottom: '3px' }}>Recipient Email *</label>
                <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="your@email.com (one recipient only)" style={S.input} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="approval" checked={approvalChecked} onChange={e => setApprovalChecked(e.target.checked)} style={{ accentColor: C.excellent }} />
                <label htmlFor="approval" style={{ fontSize: '11px', color: C.muted }}>I approve sending this test email to the above address. I understand this is a manually approved test only.</label>
              </div>
              <button onClick={handleSendTest} disabled={sending || !recipientEmail.trim() || !approvalChecked || !selectedChatId} style={{ ...S.btn(C.purple), padding: '8px 20px', alignSelf: 'flex-start' }}>
                {sending ? <><Loader2 className="spin" size={14} /> Sending...</> : <><Send size={14} /> Send Test Email</>}
              </button>
              {sendResult && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'flex-start', gap: '6px', background: sendResult.success ? 'rgba(16,225,139,0.08)' : 'rgba(255,71,87,0.08)', border: `1px solid ${sendResult.success ? 'rgba(16,225,139,0.2)' : 'rgba(255,71,87,0.2)'}` }}>
                  {sendResult.success ? <CheckCircle2 size={14} style={{ color: C.excellent, flexShrink: 0, marginTop: '1px' }} /> : <AlertTriangle size={14} style={{ color: C.critical, flexShrink: 0, marginTop: '1px' }} />}
                  <div>
                    {sendResult.success ? (
                      <><strong style={{ color: C.excellent }}>Sent!</strong> Message ID: {sendResult.messageId} | To: {sendResult.maskedRecipient || sendResult.recipient} | Via: {sendResult.provider}</>
                    ) : (
                      <><strong style={{ color: C.critical }}>Failed:</strong> {sendResult.error}{sendResult.details ? ` — ${sendResult.details}` : ''}</>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!asset && !generating && (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }}>
          <Mail size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div>Generate an email draft first, then send a test.</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 8D — SOCIAL MEDIA STUDIO
// ══════════════════════════════════════════════════════════════

const platforms = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'youtube-community', label: 'YouTube Community' },
  { value: 'tiktok', label: 'TikTok Caption' },
];

export function SocialStudio({ evidence, onSave }: { evidence: EvidenceRef[]; onSave: (asset: StudioAsset) => void }) {
  const [platform, setPlatform] = useState('linkedin');
  const [goal, setGoal] = useState('awareness');
  const [tone, setTone] = useState('professional');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<StudioAsset[]>([]);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const count = 3;
      const results = Array.from({ length: count }, (_, i) => generateSocial(platform, goal, tone, `${topic} — variation ${i + 1}`, evidence));
      setAssets(results);
      setGenerating(false);
    }, 600);
  };

  const goals = ['awareness', 'engagement', 'conversion', 'education', 'entertainment'];
  const tones = ['professional', 'casual', 'inspirational', 'humorous', 'educational'];

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><RadioTower size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Social Media Content Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={S.input}>
              {platforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Goal</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={S.input}>
              {goals.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={S.input}>
              {tones.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's your post about?" style={S.input} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ ...S.btn(C.brand), padding: '8px 20px' }}>
            {generating ? <><Loader2 className="spin" size={14} /> Generating 3 variations...</> : <><Sparkles size={14} /> Generate Variations</>}
          </button>
        </div>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={3} /></div>}

      {assets.length > 0 && !generating && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {assets.map((a, i) => (
            <div key={a.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={S.tag(C.brand)}>{a.subType}</span>
                  <ConfidenceBadge value={a.confidence} />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => { navigator.clipboard.writeText(a.content.caption || ''); }} style={S.btn(C.accent)}><Copy size={12} /> Caption</button>
                  <button onClick={() => onSave(a)} style={S.btn(C.excellent)}><Save size={12} /> Save</button>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '8px', background: C.bg, borderRadius: '6px', maxHeight: '150px', overflow: 'auto' }}>{renderSafeValue(a.content.caption)}</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '10px', color: C.dim, flexWrap: 'wrap' }}>
                <span>Best time: {a.content.bestPostingTime}</span>
                {a.content.hashtags && <span>Hashtags: {a.content.hashtags.join(', ')}</span>}
                {a.content.visualSuggestion && <span>Visual: {renderSafeValue(a.content.visualSuggestion)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {assets.length === 0 && !generating && (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }}>
          <RadioTower size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div>Enter a topic to generate social media content variations.</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 8E — CREATIVE STUDIO
// ══════════════════════════════════════════════════════════════

const creativeTypes = [
  { value: 'poster', label: 'Poster Brief' },
  { value: 'banner', label: 'Banner Ad' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'social-graphic', label: 'Instagram Creative' },
  { value: 'linkedin-graphic', label: 'LinkedIn Graphic' },
  { value: 'facebook-creative', label: 'Facebook Ad Creative' },
  { value: 'display-ad', label: 'Display Ad' },
  { value: 'thumbnail', label: 'YouTube Thumbnail' },
];

export function CreativeStudio({ evidence, onSave }: { evidence: EvidenceRef[]; onSave: (asset: StudioAsset) => void }) {
  const { selectedChatId } = useProject();
  const [type, setType] = useState('poster');
  const [platform, setPlatform] = useState('social');
  const [headline, setHeadline] = useState('');
  const [audience, setAudience] = useState('');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<StudioAsset | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageResult, setImageResult] = useState<any>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setImageResult(null);
    setTimeout(() => {
      const result = generateCreative(type, platform, headline, audience, evidence);
      setAsset(result);
      setGenerating(false);
    }, 500);
  };

  const handleGenerateImage = async () => {
    if (!asset || !selectedChatId) return;
    setGeneratingImage(true);
    setImageResult(null);
    try {
      const result = await generatePosterImage(selectedChatId, {
        prompt: asset.content.imagePrompt || headline || 'Marketing poster',
        headline: asset.content.headline,
        cta: asset.content.cta,
        platform: asset.content.platform || platform,
        brandColors: asset.content.brandColors,
        audience: asset.content.audience || audience,
      });
      setImageResult(result);
      if (result.success) onSave({ ...asset, id: generateId(), type: 'creative', subType: 'generated-poster', title: `Poster: ${headline || 'Generated'}` });
    } catch (err: any) {
      setImageResult({ success: false, error: err.message || 'Failed to generate image' });
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><PenTool size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Creative Brief Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Creative Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={S.input}>
              {creativeTypes.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={S.input}>
              <option value="social">Social Media</option>
              <option value="web">Web</option>
              <option value="print">Print</option>
              <option value="display">Display Network</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Headline</label>
            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Main headline for the creative" style={S.input} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Target Audience</label>
            <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who is this creative for?" style={S.input} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={{ ...S.btn(C.brand), padding: '8px 20px', marginTop: '14px' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Sparkles size={14} /> Generate Creative Brief</>}
        </button>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={2} /></div>}

      {asset && !generating && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{asset.title}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <ConfidenceBadge value={asset.confidence} />
                <span style={S.tag(asset.content.dimensions)}>{renderSafeValue(asset.content.dimensions)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => onSave(asset)} style={S.btn(C.excellent)}><Save size={12} /> Save Brief</button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>HEADLINE</strong><span style={{ fontSize: '12px', color: C.text }}>{asset.content.headline}</span></div>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>SUBHEADLINE</strong><span style={{ fontSize: '12px', color: C.muted }}>{asset.content.subheadline}</span></div>
            <div style={{ gridColumn: '1 / -1', padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>VISUAL DIRECTION</strong><span style={{ fontSize: '12px', color: C.muted }}>{asset.content.visualDirection}</span></div>
            <div style={{ gridColumn: '1 / -1', padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>LAYOUT</strong><span style={{ fontSize: '12px', color: C.muted }}>{asset.content.layoutDescription}</span></div>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>COLORS</strong><div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>{asset.content.brandColors?.map((c: string, i: number) => <span key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, border: '1px solid #293245', display: 'inline-block' }} />)}</div></div>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>TYPOGRAPHY</strong><span style={{ fontSize: '12px', color: C.muted }}>{asset.content.typography}</span></div>
            <div style={{ gridColumn: '1 / -1', padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>IMAGE PROMPT</strong><span style={{ fontSize: '12px', color: C.muted, fontStyle: 'italic' }}>{asset.content.imagePrompt}</span></div>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>CTA</strong><span style={{ fontSize: '12px', color: C.excellent }}>{asset.content.cta}</span></div>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent, display: 'block', marginBottom: '2px' }}>DIMENSIONS</strong><span style={{ fontSize: '12px', color: C.muted }}>{renderSafeValue(asset.content.dimensions)}</span></div>
          </div>
          {asset.content.evidenceRef && <div style={{ marginTop: '8px', fontSize: '10px', color: C.dim }}>Evidence: {renderSafeValue(asset.content.evidenceRef)}</div>}

          {/* Generate Poster Image */}
          <div style={{ marginTop: '16px', padding: '14px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Image size={14} style={{ color: C.purple }} /> Generate Poster Image
            </div>
            <button onClick={handleGenerateImage} disabled={generatingImage || !selectedChatId} style={{ ...S.btn(C.purple), padding: '8px 20px' }}>
              {generatingImage ? <><Loader2 className="spin" size={14} /> Generating Poster...</> : <><Image size={14} /> Generate Poster Image</>}
            </button>
            {imageResult && (
              <div style={{ marginTop: '12px' }}>
                {imageResult.success ? (
                  <div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={S.tag(C.excellent)}>Provider: {imageResult.provider}</span>
                      {imageResult.warnings?.length > 0 && <span style={S.tag(C.needsImprovement)}>{imageResult.warnings.length} warnings</span>}
                    </div>
                    <div style={{ background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                      <img src={imageResult.imageUrl} alt="Generated poster" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <a href={imageResult.imageUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.btn(C.good), textDecoration: 'none' }}><Download size={12} /> Download</a>
                      <button onClick={() => navigator.clipboard.writeText(imageResult.imageUrl)} style={S.btn(C.accent)}><Copy size={12} /> Copy URL</button>
                      <button onClick={() => navigator.clipboard.writeText(imageResult.prompt)} style={S.btn(C.purple)}><Copy size={12} /> Copy Prompt</button>
                      <button onClick={() => onSave({ id: generateId(), type: 'creative', subType: 'generated-poster', title: `Poster: ${headline || 'Generated'}`, content: imageResult, confidence: 90, generatedAt: now(), approvalStatus: 'draft' })} style={S.btn(C.excellent)}><Save size={12} /> Save to Library</button>
                    </div>
                    {imageResult.warnings?.map((w: string, i: number) => (
                      <div key={i} style={{ marginTop: '6px', padding: '6px 8px', background: 'rgba(255,179,71,0.08)', borderRadius: '4px', fontSize: '10px', color: C.needsImprovement, display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <AlertTriangle size={10} /> {renderSafeValue(w)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} style={{ color: C.critical }} /> {imageResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 8F — VIDEO CAMPAIGN STUDIO
// ══════════════════════════════════════════════════════════════

const videoTypes = [
  { value: '15s-short', label: '15 sec Short Ad' },
  { value: '30s-ad', label: '30 sec Ad' },
  { value: '60s-ad', label: '60 sec Ad' },
  { value: '90s-explainer', label: '90 sec Explainer' },
  { value: 'youtube-ad', label: 'YouTube Ad' },
  { value: 'instagram-reel', label: 'Instagram Reel' },
  { value: 'tiktok-ad', label: 'TikTok Ad' },
  { value: 'linkedin-video', label: 'LinkedIn Video Ad' },
];

export function VideoStudio({ evidence, onSave }: { evidence: EvidenceRef[]; onSave: (asset: StudioAsset) => void }) {
  const { selectedChatId } = useProject();
  const [type, setType] = useState('30s-ad');
  const [platform, setPlatform] = useState('youtube');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('30s');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<StudioAsset | null>(null);
  const [rendering, setRendering] = useState(false);
  const [videoResult, setVideoResult] = useState<any>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setVideoResult(null);
    setTimeout(() => {
      const result = generateVideo(type, platform, topic, duration, evidence);
      setAsset(result);
      setGenerating(false);
    }, 700);
  };

  const handleRenderVideo = async () => {
    if (!asset || !selectedChatId) return;
    setRendering(true);
    setVideoResult(null);
    try {
      const scenes = (asset.content.storyboard || []).map((s: any) => ({
        title: `Scene ${s.scene}`,
        visual: s.visual || '',
        voiceover: s.audio || '',
        duration: parseInt(s.duration) || 5,
      }));
      const aspectRatio = platform === 'instagram' || platform === 'tiktok' ? '9:16' : '16:9';
      const durationSec = parseInt(duration) || 30;
      const result = await renderVideo(selectedChatId, {
        script: asset.content.script || '',
        scenes: scenes.length > 0 ? scenes : [{ title: topic || 'Video', visual: asset.content.hook || '', voiceover: '', duration: durationSec }],
        duration: durationSec,
        platform,
        aspectRatio,
        prompt: topic || asset.title,
      });
      setVideoResult(result);
      if (result.success) onSave({ ...asset, id: generateId(), type: 'video', subType: 'rendered-video', title: `Video: ${topic || 'Rendered'}` });
    } catch (err: any) {
      setVideoResult({ success: false, error: err.message || 'Failed to render video' });
    } finally {
      setRendering(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><Video size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Video Script Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Video Type</label>
            <select value={type} onChange={e => { setType(e.target.value); if (e.target.value === '15s-short') setDuration('15s'); else if (e.target.value === '30s-ad') setDuration('30s'); else if (e.target.value === '60s-ad') setDuration('60s'); else setDuration('90s'); }} style={S.input}>
              {videoTypes.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={S.input}>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Duration</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={S.input}>
              <option value="15s">15 seconds</option>
              <option value="30s">30 seconds</option>
              <option value="60s">60 seconds</option>
              <option value="90s">90 seconds</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's the video about?" style={S.input} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ ...S.btn(C.brand), padding: '8px 20px', marginTop: '14px' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating Script...</> : <><Sparkles size={14} /> Generate Script</>}
        </button>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={3} /></div>}

      {asset && !generating && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{asset.title}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <ConfidenceBadge value={asset.confidence} />
                <span style={S.tag(C.purple)}>{asset.content.duration}</span>
                <span style={S.tag(C.brand)}>{asset.content.platform}</span>
              </div>
            </div>
            <button onClick={() => onSave(asset)} style={S.btn(C.excellent)}><Save size={12} /> Save Script</button>
          </div>

          <div style={{ padding: '10px', background: C.bg, borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Hook</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{renderSafeValue(asset.content.hook)}</div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Script</div>
            <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '8px', background: C.bg, borderRadius: '6px', maxHeight: '200px', overflow: 'auto' }}>{renderSafeValue(asset.content.script)}</div>
          </div>

          {asset.content.storyboard && Array.isArray(asset.content.storyboard) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Storyboard ({asset.content.storyboard.length} scenes)</div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {asset.content.storyboard.map((s: any, i: number) => (
                  <div key={i} style={{ padding: '8px', background: C.bg, borderRadius: '6px', borderLeft: '3px solid #53a7ff' }}>
                    <div style={{ fontSize: '10px', color: C.brand, fontWeight: 600 }}>Scene {s.scene} ({s.duration})</div>
                    <div style={{ fontSize: '11px', color: C.muted }}><strong>Visual:</strong> {renderSafeValue(s.visual)}</div>
                    <div style={{ fontSize: '11px', color: C.muted }}><strong>Audio:</strong> {renderSafeValue(s.audio)}</div>
                    <div style={{ fontSize: '11px', color: C.muted }}><strong>Transition:</strong> {renderSafeValue(s.transitions)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
            <div style={{ padding: '6px 8px', background: C.bg, borderRadius: '6px' }}><strong style={{ color: C.accent }}>Voiceover:</strong> <span style={{ color: C.muted }}>{asset.content.voiceover}</span></div>
            <div style={{ padding: '6px 8px', background: C.bg, borderRadius: '6px' }}><strong style={{ color: C.accent }}>Music Mood:</strong> <span style={{ color: C.muted }}>{asset.content.musicMood}</span></div>
            <div style={{ gridColumn: '1 / -1', padding: '6px 8px', background: C.bg, borderRadius: '6px' }}><strong style={{ color: C.accent }}>Visual Direction:</strong> <span style={{ color: C.muted }}>{asset.content.visualDirection}</span></div>
            <div style={{ padding: '6px 8px', background: C.bg, borderRadius: '6px' }}><strong style={{ color: C.accent }}>CTA:</strong> <span style={{ color: C.excellent }}>{asset.content.cta}</span></div>
            <div style={{ padding: '6px 8px', background: C.bg, borderRadius: '6px' }}><strong style={{ color: C.accent }}>Transitions:</strong> <span style={{ color: C.muted }}>{asset.content.transitionSuggestions}</span></div>
          </div>

          {/* Render Video Section */}
          <div style={{ marginTop: '16px', padding: '14px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={14} style={{ color: C.critical }} /> Render MP4 Video
            </div>
            <button onClick={handleRenderVideo} disabled={rendering || !selectedChatId} style={{ ...S.btn(C.critical), padding: '8px 20px' }}>
              {rendering ? <><Loader2 className="spin" size={14} /> Rendering MP4...</> : <><Video size={14} /> Render MP4 Slideshow</>}
            </button>
            {videoResult && (
              <div style={{ marginTop: '12px' }}>
                {videoResult.success && videoResult.videoUrl ? (
                  <div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={S.tag(C.excellent)}>Provider: {videoResult.provider}</span>
                      <span style={S.tag(C.brand)}>{videoResult.duration}s</span>
                    </div>
                    <video controls style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', background: '#000' }}>
                      <source src={videoResult.videoUrl} type="video/mp4" />
                    </video>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {videoResult.videoUrl && <a href={videoResult.videoUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.btn(C.good), textDecoration: 'none' }}><Download size={12} /> Download MP4</a>}
                      {videoResult.videoUrl && <button onClick={() => navigator.clipboard.writeText(videoResult.videoUrl)} style={S.btn(C.accent)}><Copy size={12} /> Copy URL</button>}
                      <button onClick={() => onSave({ id: generateId(), type: 'video', subType: 'rendered-video', title: `Video: ${topic || 'Rendered'}`, content: videoResult, confidence: 90, generatedAt: now(), approvalStatus: 'draft' })} style={S.btn(C.excellent)}><Save size={12} /> Save to Library</button>
                    </div>
                  </div>
                ) : videoResult.success && videoResult.storyboard ? (
                  <div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={S.tag(C.needsImprovement)}>Provider: {videoResult.provider}</span>
                      <span style={S.tag(C.brand)}>{videoResult.duration}s</span>
                    </div>
                    <div style={{ padding: '12px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>{videoResult.storyboard}</div>
                    <div style={{ marginTop: '6px', fontSize: '10px', color: C.needsImprovement, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={10} /> MP4 rendering unavailable — showing storyboard fallback
                    </div>
                    <button onClick={() => { const blob = new Blob([videoResult.storyboard], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `storyboard-${Date.now()}.md`; a.click(); URL.revokeObjectURL(url); }} style={{ ...S.btn(C.good), marginTop: '8px' }}><FileDown size={12} /> Export Storyboard</button>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} style={{ color: C.critical }} /> {videoResult.error}
                  </div>
                )}
                {videoResult.warnings?.map((w: string, i: number) => (
                  <div key={i} style={{ marginTop: '6px', padding: '6px 8px', background: 'rgba(255,179,71,0.08)', borderRadius: '4px', fontSize: '10px', color: C.needsImprovement, display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <AlertTriangle size={10} /> {renderSafeValue(w)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 8G — CAMPAIGN PLANNER
// ══════════════════════════════════════════════════════════════

const campaignDurations = [
  { value: '7d', label: '7-day campaign' },
  { value: '30d', label: '30-day campaign' },
  { value: '60d', label: '60-day campaign' },
  { value: '90d', label: '90-day campaign' },
  { value: 'product-launch', label: 'Product launch' },
  { value: 'seo-campaign', label: 'SEO campaign' },
  { value: 'paid-ads', label: 'Paid ads campaign' },
  { value: 'awareness', label: 'Awareness campaign' },
  { value: 'lead-gen', label: 'Lead generation' },
];

export function CampaignPlanner({ evidence, onSave }: { evidence: EvidenceRef[]; onSave: (asset: StudioAsset) => void }) {
  const [duration, setDuration] = useState('30d');
  const [name, setName] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [channelsStr, setChannelsStr] = useState('');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<StudioAsset | null>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const channels = channelsStr.split(',').map(c => c.trim()).filter(Boolean);
      const result = generateCampaign(name || `${duration} Campaign`, duration, audience, goal, channels, evidence);
      setAsset(result);
      setGenerating(false);
    }, 800);
  };

  const currentType = campaignDurations.find(d => d.value === duration);

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><Megaphone size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Campaign Planner</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Campaign Type</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={S.input}>
              {campaignDurations.map(cd => <option key={cd.value} value={cd.value}>{cd.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Campaign Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Q3 Product Launch" style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Target Audience</label>
            <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who is the campaign for?" style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Goal</label>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g., Generate 100 qualified leads" style={S.input} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Channels (comma-separated)</label>
            <input value={channelsStr} onChange={e => setChannelsStr(e.target.value)} placeholder="e.g., Email, LinkedIn, Google Ads" style={S.input} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={{ ...S.btn(C.brand), padding: '8px 20px', marginTop: '14px' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating Plan...</> : <><Sparkles size={14} /> Generate {currentType?.label || 'Campaign Plan'}</>}
        </button>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={3} /></div>}

      {asset && !generating && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>{asset.content.campaignName}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <ConfidenceBadge value={asset.confidence} />
                <span style={S.tag(C.brand)}>{asset.subType}</span>
                {asset.content.channels && <span style={S.tag(C.accent)}>{asset.content.channels.join(', ')}</span>}
              </div>
            </div>
            <button onClick={() => onSave(asset)} style={S.btn(C.excellent)}><Save size={12} /> Save Plan</button>
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent }}>Objective:</strong> <span style={{ fontSize: '12px', color: C.muted }}>{asset.content.objective}</span></div>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent }}>Audience:</strong> <span style={{ fontSize: '12px', color: C.muted }}>{asset.content.audience}</span></div>
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent }}>Budget:</strong> <span style={{ fontSize: '12px', color: C.needsImprovement }}>{asset.content.budgetRecommendation}</span></div>

            {asset.content.weeklyPlan && (
              <div>
                <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px', marginTop: '8px' }}>Weekly Plan</div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {asset.content.weeklyPlan.map((w: any, i: number) => (
                    <div key={i} style={{ padding: '8px', background: C.bg, borderRadius: '6px', borderLeft: '3px solid #53a7ff' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: C.brand }}>Week {w.week}: {renderSafeValue(w.theme)}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>Activities: {w.activities.join(', ')}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>Deliverables: {w.deliverables.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent }}>KPIs:</strong> <span style={{ fontSize: '11px', color: C.muted }}>{asset.content.kpis.join(', ')}</span></div>
              <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent }}>Risks:</strong> <span style={{ fontSize: '11px', color: C.muted }}>{asset.content.risks.join(', ')}</span></div>
              <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent }}>Dependencies:</strong> <span style={{ fontSize: '11px', color: C.muted }}>{asset.content.dependencies.join(', ')}</span></div>
              <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}><strong style={{ fontSize: '10px', color: C.accent }}>Owner:</strong> <span style={{ fontSize: '11px', color: C.muted }}>{asset.content.owner}</span></div>
            </div>

            {asset.content.evidenceSource && <div style={{ marginTop: '8px', fontSize: '10px', color: C.dim }}>Evidence: {asset.content.evidenceSource}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 8H — MARKETING ASSET LIBRARY
// ══════════════════════════════════════════════════════════════

export function AssetLibrary({ assets, onUpdate, onDelete }: {
  assets: StudioAsset[]; onUpdate: (assets: StudioAsset[]) => void; onDelete: (id: string) => void;
}) {
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<StudioAsset | null>(null);

  const counts = { content: assets.filter(a => a.type === 'content').length, email: assets.filter(a => a.type === 'email').length, social: assets.filter(a => a.type === 'social').length, creative: assets.filter(a => a.type === 'creative').length, video: assets.filter(a => a.type === 'video').length, campaign: assets.filter(a => a.type === 'campaign').length };

  const filtered = assets.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterStatus !== 'all' && a.approvalStatus !== filterStatus) return false;
    if (searchQ) { const q = searchQ.toLowerCase(); return a.title.toLowerCase().includes(q) || a.subType.toLowerCase().includes(q); }
    return true;
  }).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  const statusColor = (s: string) => s === 'draft' ? C.needsImprovement : s === 'approved' ? C.excellent : s === 'needs-review' ? C.accent : C.dim;
  const typeColors: Record<string, string> = { content: C.brand, email: C.purple, social: C.excellent, creative: C.needsImprovement, video: C.critical, campaign: C.accent };

  return (
    <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: selectedAsset ? '1fr 380px' : '1fr' }}>
      <div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.dim }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search assets..." style={{ ...S.input, paddingLeft: '30px', fontSize: '12px' }} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...S.input, width: 'auto' }}>
            <option value="all">All Types ({assets.length})</option>
            <option value="content">Content ({counts.content})</option>
            <option value="email">Email ({counts.email})</option>
            <option value="social">Social ({counts.social})</option>
            <option value="creative">Creative ({counts.creative})</option>
            <option value="video">Video ({counts.video})</option>
            <option value="campaign">Campaign ({counts.campaign})</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...S.input, width: 'auto' }}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="needs-review">Needs Review</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: '13px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }}>
            <FolderOpen size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>No assets saved yet. Generate content and save it to build your library.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>No assets match your filters.</div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(a => (
              <div key={a.id} onClick={() => setSelectedAsset(selectedAsset?.id === a.id ? null : a)} style={{ ...S.row, cursor: 'pointer', borderColor: selectedAsset?.id === a.id ? C.accent + '60' : '#1d2738', flexWrap: 'wrap' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent + '40'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = selectedAsset?.id === a.id ? C.accent + '60' : '#1d2738'}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${typeColors[a.type] || C.dim}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {a.type === 'content' ? <BookOpen size={14} style={{ color: typeColors[a.type] }} /> :
                   a.type === 'email' ? <Mail size={14} style={{ color: typeColors[a.type] }} /> :
                   a.type === 'social' ? <RadioTower size={14} style={{ color: typeColors[a.type] }} /> :
                   a.type === 'creative' ? <PenTool size={14} style={{ color: typeColors[a.type] }} /> :
                   a.type === 'video' ? <Video size={14} style={{ color: typeColors[a.type] }} /> :
                   <Megaphone size={14} style={{ color: typeColors[a.type] }} />}
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{a.title}</div>
                  <div style={{ fontSize: '11px', color: C.muted, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={S.tag(typeColors[a.type] || C.dim)}>{a.subType}</span>
                    <span>{new Date(a.generatedAt).toLocaleDateString()}</span>
                    <ConfidenceBadge value={a.confidence} size="sm" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${statusColor(a.approvalStatus)}20`, color: statusColor(a.approvalStatus) }}>{a.approvalStatus}</span>
                  <button onClick={(e) => { e.stopPropagation(); const next = a.approvalStatus === 'draft' ? 'approved' : a.approvalStatus === 'approved' ? 'archived' : 'draft'; onUpdate(assets.map(x => x.id === a.id ? { ...x, approvalStatus: next as any } : x)); }} style={{ ...S.btn(statusColor(a.approvalStatus)), fontSize: '9px', padding: '3px 8px' }}>
                    <RefreshCw size={10} /> {a.approvalStatus === 'draft' ? 'Approve' : a.approvalStatus === 'approved' ? 'Archive' : 'Re-draft'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(a.id); }} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAsset && (
        <div style={{ ...S.card, maxHeight: '80vh', overflow: 'auto', position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{selectedAsset.title}</div>
            <button onClick={() => setSelectedAsset(null)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={S.tag(typeColors[selectedAsset.type] || C.dim)}>{selectedAsset.subType}</span>
            <ConfidenceBadge value={selectedAsset.confidence} />
            <span style={S.tag(statusColor(selectedAsset.approvalStatus))}>{selectedAsset.approvalStatus}</span>
            <span style={{ fontSize: '10px', color: C.dim }}>{new Date(selectedAsset.generatedAt).toLocaleString()}</span>
          </div>
          {selectedAsset.warnings?.map((w, i) => (
            <div key={i} style={{ padding: '6px 8px', background: 'rgba(255,179,71,0.08)', borderRadius: '6px', border: '1px solid rgba(255,179,71,0.2)', fontSize: '11px', color: C.needsImprovement, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={12} /> {renderSafeValue(w)}
            </div>
          ))}
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto', padding: '10px', background: C.bg, borderRadius: '6px' }}>
            {typeof selectedAsset.content === 'string' ? selectedAsset.content : JSON.stringify(selectedAsset.content, null, 2)}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => { navigator.clipboard.writeText(typeof selectedAsset.content === 'string' ? selectedAsset.content : JSON.stringify(selectedAsset.content, null, 2)); }} style={S.btn(C.accent)}><Copy size={12} /> Copy</button>
            <button onClick={() => { const text = typeof selectedAsset.content === 'string' ? selectedAsset.content : JSON.stringify(selectedAsset.content, null, 2); const blob = new Blob([text], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${selectedAsset.title.replace(/\s+/g, '-').toLowerCase()}.md`; a.click(); URL.revokeObjectURL(url); }} style={S.btn(C.good)}><FileDown size={12} /> Export</button>
            {selectedAsset.complianceNotes && <div style={{ fontSize: '10px', color: C.needsImprovement, padding: '4px 8px', background: 'rgba(255,179,71,0.08)', borderRadius: '4px' }}>{selectedAsset.complianceNotes}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PHASE 8I — MAIN CONTENT STUDIO PAGE
// ══════════════════════════════════════════════════════════════

const studioTabs = [
  { id: 'content', label: 'Content Studio', icon: BookOpen },
  { id: 'email', label: 'Email Studio', icon: Mail },
  { id: 'social', label: 'Social Studio', icon: RadioTower },
  { id: 'creative', label: 'Creative Studio', icon: PenTool },
  { id: 'video', label: 'Video Studio', icon: Video },
  { id: 'campaign', label: 'Campaign Planner', icon: Megaphone },
  { id: 'library', label: 'Asset Library', icon: FolderOpen },
];

export default function AIContentStudio() {
  const { selectedChatId, fullResults } = useProject();
  const [activeTab, setActiveTab] = useWorkspaceMemory('studio-activeTab', 'content');
  const [assets, setAssets] = useWorkspaceMemory<StudioAsset[]>('studio-assets', []);
  const [evidence, setEvidence] = useState<EvidenceRef[]>([]);
  const [showHealth, setShowHealth] = useState(true);

  useEffect(() => {
    const ev = collectEvidence(fullResults);
    setEvidence(ev);
  }, [fullResults]);

  const handleSave = (asset: StudioAsset) => {
    const existing = assets.find(a => a.id === asset.id);
    if (existing) {
      setAssets(assets.map(a => a.id === asset.id ? asset : a));
    } else {
      setAssets([asset, ...assets]);
    }
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleUpdateAssets = (updated: StudioAsset[]) => {
    setAssets(updated);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'content': return <ContentStudio evidence={evidence} onSave={handleSave} />;
      case 'email': return <EmailStudio evidence={evidence} onSave={handleSave} />;
      case 'social': return <SocialStudio evidence={evidence} onSave={handleSave} />;
      case 'creative': return <CreativeStudio evidence={evidence} onSave={handleSave} />;
      case 'video': return <VideoStudio evidence={evidence} onSave={handleSave} />;
      case 'campaign': return <CampaignPlanner evidence={evidence} onSave={handleSave} />;
      case 'library': return <AssetLibrary assets={assets} onUpdate={handleUpdateAssets} onDelete={handleDeleteAsset} />;
      default: return <ContentStudio evidence={evidence} onSave={handleSave} />;
    }
  };

  return (
    <div>
      <PageHeader eyebrow="AI Content & Campaign Studio" title="Content & Campaign Studio" subtitle="Generate, preview, and manage AI-powered marketing content across all channels. All content is evidence-based and requires manual approval before publishing." />
      <div style={{ marginTop: '20px' }}>
        {evidence.length === 0 && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(255,179,71,0.08)', borderRadius: '8px', border: '1px solid rgba(255,179,71,0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.needsImprovement }}>
            <AlertTriangle size={16} />
            <div>Evidence unavailable — connect analytics, SEO, and growth data sources for higher quality, evidence-backed content. Current content uses general best practices.</div>
          </div>
        )}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <button onClick={() => setShowHealth(!showHealth)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {showHealth ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Provider Health
            </button>
          </div>
          {showHealth && <IntegrationHealthPanel />}
        </div>
        <Card>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px', marginBottom: '16px' }}>
            {studioTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: activeTab === t.id ? `${C.accent}15` : 'transparent',
                cursor: 'pointer', fontSize: '11px', color: activeTab === t.id ? C.accent : C.muted,
                fontWeight: activeTab === t.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <t.icon size={12} /> {t.label} {t.id === 'library' && assets.length > 0 && <span style={{ fontSize: '9px', background: C.accent, color: '#fff', borderRadius: '8px', padding: '0 5px', fontWeight: 700 }}>{assets.length}</span>}
              </button>
            ))}
          </div>
          {renderTab()}
        </Card>
      </div>
    </div>
  );
}