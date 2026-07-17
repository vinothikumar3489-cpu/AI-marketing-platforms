# AI Provider Configuration Audit Report

**Date:** 2026-07-16  
**Environment:** Development  
**Audit Scope:** All AI and research providers

## Executive Summary

All primary AI providers are currently **NOT_CONFIGURED** in the development environment. The application will fall back to deterministic rule-based generators for Growth Workspace stages when AI providers are unavailable.

## Provider Status

### AI Providers

| Provider | Status | Issue | Action Required |
|----------|--------|-------|----------------|
| **Groq** | NOT_CONFIGURED | GROQ_API_KEY not set | Add GROQ_API_KEY to Render environment |
| **Gemini** | NOT_CONFIGURED | GEMINI_API_KEY not set | Add GEMINI_API_KEY to Render environment |
| **OpenRouter** | NOT_CONFIGURED | OPENROUTER_API_KEY not set | Add OPENROUTER_API_KEY to Render environment |
| **OpenAI** | NOT_CONFIGURED | OPENAI_API_KEY not set | Add OPENAI_API_KEY to Render environment |
| **Cerebras** | INVALID_CREDENTIAL | Key is placeholder "your_key_here" | Replace CEREBRAS_API_KEY in Render environment |
| **DeepSeek** | NOT_CONFIGURED | DEEPSEEK_API_KEY not set | Add DEEPSEEK_API_KEY to Render environment |

### Research & Scraping Providers

| Provider | Status | Issue | Action Required |
|----------|--------|-------|----------------|
| **DataForSEO** | NOT_CONFIGURED | DATAFORSEO_LOGIN/PASSWORD not set | Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to Render environment |
| **Firecrawl** | NOT_CONFIGURED | FIRECRAWL_API_KEY not set | Add FIRECRAWL_API_KEY to Render environment |
| **PageSpeed** | NOT_CONFIGURED | PAGESPEED_API_KEY not set | Add PAGESPEED_API_KEY to Render environment |
| **Tavily** | NOT_CONFIGURED | TAVILY_API_KEY not set | Add TAVILY_API_KEY to Render environment |
| **Exa** | NOT_CONFIGURED | EXA_API_KEY not set | Add EXA_API_KEY to Render environment |
| **Jina** | NOT_CONFIGURED | JINA_API_KEY not set | Add JINA_API_KEY to Render environment |

## Manual Action Required

### Render Environment Variables

Replace the following values in your Render dashboard:

**Primary AI Providers (at least one required):**
- `GROQ_API_KEY` - Get from https://console.groq.com/keys
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/apikey
- `OPENROUTER_API_KEY` - Get from https://openrouter.ai/keys
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys

**Research Providers (required for SEO features):**
- `DATAFORSEO_LOGIN` - Get from https://app.dataforseo.com/api-settings
- `DATAFORSEO_PASSWORD` - Get from https://app.dataforseo.com/api-settings
- `FIRECRAWL_API_KEY` - Get from https://www.firecrawl.dev/
- `PAGESPEED_API_KEY` - Get from https://developers.google.com/speed/docs/insights/v5/get-started
- `TAVILY_API_KEY` - Get from https://tavily.com/
- `EXA_API_KEY` - Get from https://exa.ai/
- `JINA_API_KEY` - Get from https://jina.ai/

**Optional AI Providers:**
- `CEREBRAS_API_KEY` - Get from https://console.cerebras.ai/ (currently has placeholder value)
- `DEEPSEEK_API_KEY` - Get from https://platform.deepseek.com/

## Model Configuration

Standardized model defaults applied:
- `GROQ_MODEL=llama-3.3-70b-versatile`
- `GEMINI_MODEL=gemini-2.0-flash`
- `OPENROUTER_MODEL=anthropic/claude-3-haiku`
- `OPENAI_MODEL=gpt-4o-mini`

## Provider Fallback Order

The application now uses the following fallback order:
1. Groq
2. Gemini
3. OpenRouter
4. OpenAI
5. Deterministic fallback (rule-based generators)

## Cooldown Behavior

- Provider cooldown is now provider-specific (5 minutes)
- One provider's rate limit does not disable all providers
- Cooldown expires automatically after 5 minutes
- Successful health check clears stale cooldown state

## Degraded Mode

When all AI providers fail, the application:
- Preserves Firecrawl evidence (if configured)
- Preserves PageSpeed data (if configured)
- Preserves deterministic Business Intelligence
- Preserves personas, pain points, and channels already collected
- Does not overwrite populated evidence with empty fallback arrays
- Returns `completed_with_warnings` status
- Does not return HTTP 500

## Recommendations

### Immediate Actions
1. Add at least one primary AI provider key (Groq recommended for speed/cost)
2. Add DataForSEO credentials for SEO features
3. Add Firecrawl API key for website scraping
4. Add PageSpeed API key for technical SEO audit

### Priority Order
1. **High Priority:** Groq or Gemini (required for AI features)
2. **High Priority:** DataForSEO (required for competitive SEO data)
3. **Medium Priority:** Firecrawl (required for website scraping)
4. **Medium Priority:** PageSpeed (required for technical SEO audit)
5. **Low Priority:** Tavily/Exa/Jina (optional research providers)

## Validation

Run the provider audit script to verify configuration:
```bash
cd backend
node scripts/audit-providers.js
```

Expected output after configuration:
- At least one AI provider showing `AVAILABLE`
- Firecrawl showing `AVAILABLE` (if configured)
- PageSpeed showing `AVAILABLE` (if configured)
- DataForSEO showing `AVAILABLE` (if configured)
