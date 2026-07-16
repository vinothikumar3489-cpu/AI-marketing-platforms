# Manual Configuration Report

**Phase 26: Manual Configuration Report**
**Version:** 1.0
**Last Updated:** 2026-07-17

## Overview

This document provides a comprehensive manual configuration guide for the AI Marketing Platform, covering all environment variables, service configurations, and setup requirements implemented across Phases 1-25.

## Environment Variables

### Core Application

| Variable | Required | Default | Description | Phase |
|----------|----------|---------|-------------|-------|
| NODE_ENV | Yes | development | Environment (development/staging/production) | All |
| PORT | Yes | 3000 | Server port | All |
| DATABASE_URL | Yes | - | PostgreSQL connection string | All |
| JWT_SECRET | Yes | - | JWT signing secret | All |
| SESSION_SECRET | Yes | - | Session encryption secret | All |

### AI Providers

| Variable | Required | Default | Description | Phase |
|----------|----------|---------|-------------|-------|
| GROQ_API_KEY | No | - | Groq API key for AI inference | 16 |
| TAVILY_API_KEY | No | - | Tavily API key for search | 16 |
| EXA_API_KEY | No | - | Exa API key for search | 16 |
| ANTHROPIC_API_KEY | No | - | Anthropic API key for Claude | 16 |
| OPENAI_API_KEY | No | - | OpenAI API key for GPT models | 16 |

### SEO Intelligence

| Variable | Required | Default | Description | Phase |
|----------|----------|---------|-------------|-------|
| DATAFORSEO_API_KEY | No | - | DataForSEO API key for keyword intelligence | 3, 14 |
| DATAFORSEO_BASE_URL | No | https://api.dataforseo.com | DataForSEO API base URL | 3, 14 |

### Email Providers

| Variable | Required | Default | Description | Phase |
|----------|----------|---------|-------------|-------|
| GMAIL_USER | No | - | Gmail username for SMTP | 20 |
| GMAIL_APP_PASSWORD | No | - | Gmail app password for SMTP | 20 |
| SENDGRID_API_KEY | No | - | SendGrid API key | 20 |
| BREVO_API_KEY | No | - | Brevo (formerly Sendinblue) API key | 20 |
| RESEND_API_KEY | No | - | Resend API key | 20 |

### Creative/Video Providers

| Variable | Required | Default | Description | Phase |
|----------|----------|---------|-------------|-------|
| POLLINATIONS_API_KEY | No | - | Pollinations API key for image generation | 20 |
| FAL_API_KEY | No | - | Fal API key for image generation | 20 |
| SHOTSTACK_API_KEY | No | - | Shotstack API key for video rendering | 20 |
| CREATOMATE_API_KEY | No | - | Creatomate API key for video rendering | 20 |

### Analytics & Monitoring

| Variable | Required | Default | Description | Phase |
|----------|----------|---------|-------------|-------|
| GA_API_KEY | No | - | Google Analytics API key | 20 |
| MIXPANEL_API_KEY | No | - | Mixpanel API key | 20 |
| SENTRY_DSN | No | - | Sentry DSN for error tracking | 17 |
| LOG_LEVEL | No | info | Logging level (debug/info/warn/error) | All |

### CRM Integrations

| Variable | Required | Default | Description | Phase |
|----------|----------|---------|-------------|-------|
| HUBSPOT_API_KEY | No | - | HubSpot API key | 20 |
| SALESFORCE_API_KEY | No | - | Salesforce API key | 20 |

## Database Configuration

### Required Tables

The following database tables are required for the platform to function:

#### Core Tables
- `Chat` - User chat sessions
- `User` - User accounts and authentication
- `ProductIntelligence` - Product analysis results
- `CompetitorIntelligence` - Competitor analysis results
- `CampaignIntelligence` - Campaign intelligence results
- `SeoIntelligence` - SEO intelligence results
- `AutomationPlan` - Automation plan data

#### SEO Intelligence Tables (Phase 14)
- `SeoIntelligence.keywordIntelligence` - Keyword opportunities
- `SeoIntelligence.competitorSeoRecord` - Competitor SEO data
- `SeoIntelligence.contentGapRecord` - Content gap analysis
- `SeoIntelligence.geoIntelligence` - AI search readiness scores
- `SeoIntelligence.blogIntelligenceRecord` - Blog intelligence
- `SeoIntelligence.technicalAuditDetail` - Technical audit details
- `SeoIntelligence.rawCrawlData` - Raw website crawl data

#### Marketing Execution Tables (Phase 6)
- `AutomationPlan.contentStudio` - Content Studio assets
- `AutomationPlan.emailCampaigns` - Email campaign data
- `AutomationPlan.creativeStudio` - Creative briefs
- `AutomationPlan.videoStudio` - Video scripts
- `AutomationPlan.campaignPlans` - Campaign plans
- `AutomationPlan.socialCalendars` - Social calendar data
- `AutomationPlan.analyticsData` - Analytics data

#### Execution Tracking Tables
- `ExecutionRecord` - Module execution tracking
- `ExecutionLog` - Detailed execution logs

### Database Migrations

Run migrations in order:

```bash
# Phase 4: Product identity persistence
npm run migrate:add-product-identity-fields

# Phase 14: SEO intelligence normalization
npm run migrate:seo-intelligence-relations

# Phase 6: Marketing execution platform
npm run migrate:add-execution-modules

# Phase 16: GEO intelligence
npm run migrate:add-geo-intelligence

# Phase 17: Content Studio error tracking
npm run migrate:add-content-error-fields
```

## Service Configuration

### Product Identity Resolver (Phase 4)

**Configuration:** No additional configuration required. Uses existing data sources.

**Priority Order:**
1. ProductIntelligence.productName
2. ProductIntelligence.productAnalysis.name
3. EvidenceSnapshot.brand.name
4. Website domain extraction
5. Chat.productName (if not default)
6. Chat.title (final fallback)

**Invalid Product Labels:** (Phase 18, 19)
- 'unknown product'
- 'new analysis'
- 'new & featured'
- 'untitled'
- 'new project'
- 'growth analysis'
- 'featured'
- 'home'

### SEO Intelligence Normalizer (Phase 14)

**Configuration:** Requires DataForSEO API key for full functionality.

**Fallback Behavior:**
- Without DataForSEO: Uses competitor analysis and website scraping
- Keyword normalization handles multiple data source formats
- Technical audit adapter ensures consistent score structure

### Content Studio (Phase 17)

**Configuration:** Requires AI provider API key (Groq, Anthropic, or OpenAI).

**Error Handling:**
- Schema validation with retry mechanism
- Brief validation for product identity
- Claim validation for hallucinated content
- Comprehensive error logging

**Quality Scoring (Phase 18):**
- Product specificity check
- Evidence coverage validation
- Audience relevance assessment
- CTA clarity validation
- Tone consistency check
- Unsupported claims detection
- SEO alignment verification
- Readability scoring
- Brand consistency check
- Originality assessment

### Campaign Intelligence (Phase 19)

**Configuration:** Requires AI provider API key.

**Product Identity Validation:**
- Blocks generation for invalid/generic product names
- Uses canonical product identity resolver
- Returns error code: INVALID_PRODUCT_IDENTITY

**Evidence Reconciliation:**
- Detects contradictions between data sources
- Assigns quality scores to evidence
- Labels inferences with evidence status

**Campaign Safety:**
- Excludes recommendations without evidence
- Applies evidence-based filtering
- Uses fallback when AI generation fails

### Automation Centre (Phase 20)

**Tab Quality Rules:**
- Core tabs always visible: Plan, Workflow, AssetLibrary, Analytics, EmailAutomation, CRM
- Creative Studio: minimum 2 briefs
- Video Studio: minimum 2 scripts
- Social Calendar: minimum 5 entries

**Execution Summary:**
- Returns tabQuality metadata
- Includes data quality assessment
- Provides visibility reasons for hidden tabs

### Frontend Conditional Rendering (Phase 21)

**Configuration:** Uses backend tabQuality metadata.

**Fallback Behavior:**
- Falls back to frontend quality rules if backend metadata unavailable
- Maintains backward compatibility with legacy tabs

### Report Generation (Phase 22)

**Configuration:** Uses canonical product identity resolver.

**Report Types:**
- Executive Report
- Growth Report
- SEO Report
- Complete Report (PDF + JSON)

**Consistency:**
- All reports use same product identity
- Company naming consistent across report types

### API Error Contract (Phase 23)

**Error Codes:**
- VALIDATION_FAILED
- MISSING_REQUIRED_FIELD
- INVALID_INPUT
- INVALID_PRODUCT_IDENTITY
- UNSUPPORTED_FORMAT
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- RESOURCE_NOT_FOUND
- CHAT_NOT_FOUND
- INTERNAL_SERVER_ERROR
- AI_PROVIDER_ERROR
- DATABASE_ERROR
- EXTERNAL_SERVICE_ERROR

**Response Structure:**
```json
{
  "success": boolean,
  "error": string,
  "code": string,
  "details": object (development only),
  "timestamp": string
}
```

## Service Dependencies

### External APIs

#### DataForSEO (Optional - Phase 3)
- **Purpose:** Keyword intelligence, competitor SEO data
- **Required For:** Full SEO intelligence functionality
- **Fallback:** Competitor analysis and website scraping
- **Rate Limits:** Check DataForSEO documentation

#### AI Providers (Required - Phase 16)
- **Groq:** Fast AI inference
- **Anthropic:** Claude models
- **OpenAI:** GPT models
- **At least one required** for content/campaign generation

#### Email Providers (Optional - Phase 20)
- **Gmail SMTP:** Requires app password
- **SendGrid:** HTTP API (no SMTP ports needed)
- **Brevo:** HTTP API
- **Resend:** HTTP API
- **At least one recommended** for email automation

#### Creative Providers (Optional - Phase 20)
- **Pollinations:** Image generation
- **Fal:** Image generation
- **At least one recommended** for creative studio

#### Video Providers (Optional - Phase 20)
- **Shotstack:** Video rendering
- **Creatomate:** Video rendering
- **At least one recommended** for video studio

#### Analytics (Optional - Phase 20)
- **Google Analytics:** Web analytics
- **Mixpanel:** Event tracking

#### CRM (Optional - Phase 20)
- **HubSpot:** CRM integration
- **Salesforce:** CRM integration

### Internal Services

#### Database
- **Type:** PostgreSQL
- **Version:** 12+
- **Connection Pooling:** Required
- **SSL:** Recommended for production

#### Cache
- **Type:** Redis (recommended)
- **Purpose:** Session storage, caching
- **Required:** For production

#### Background Workers
- **Purpose:** Async task processing
- **Required:** For content/campaign generation
- **Implementation:** Bull/BullMQ with Redis

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Redis cache configured
- [ ] Background workers running
- [ ] External API keys validated
- [ ] SSL certificates configured
- [ ] Domain DNS configured
- [ ] Load balancer configured (if applicable)

### Post-Deployment

- [ ] Smoke tests passed (see PRODUCTION_TEST_MATRIX.md)
- [ ] Database connections verified
- [ ] Cache connections verified
- [ ] Background worker health verified
- [ ] External API connectivity verified
- [ ] Error monitoring configured (Sentry)
- [ ] Logging configured and verified
- [ ] Performance monitoring configured

### Configuration Validation

Run configuration validation script:

```bash
npm run validate:config
```

This checks:
- All required environment variables
- Database connectivity
- Redis connectivity
- External API key formats
- Background worker connectivity

## Troubleshooting

### Common Issues

#### Product Identity Not Resolving
- **Symptom:** Product shows as "Unknown" or "New Analysis"
- **Cause:** Missing product intelligence data
- **Solution:** Run product intelligence analysis first
- **Phase:** 4

#### Content Generation Blocked
- **Symptom:** Content generation returns INVALID_PRODUCT_IDENTITY error
- **Cause:** Product name is generic or invalid
- **Solution:** Update product name in chat or product intelligence
- **Phase:** 18, 19

#### Tab Not Showing
- **Symptom:** Expected tab not visible in Automation Centre
- **Cause:** Insufficient data for non-core tabs
- **Solution:** Generate more content or check data quality
- **Phase:** 20

#### Report Inconsistent Company Name
- **Symptom:** Different company names in different reports
- **Cause:** Product identity not resolved consistently
- **Solution:** Ensure product intelligence has correct productName
- **Phase:** 22

#### API Error Without Code
- **Symptom:** Error response missing error code
- **Cause:** Old error response format
- **Solution:** Update to use response.util.js functions
- **Phase:** 23

### Log Locations

- **Application Logs:** `/var/log/ai-marketing-platform/app.log`
- **Error Logs:** `/var/log/ai-marketing-platform/error.log`
- **Background Worker Logs:** `/var/log/ai-marketing-platform/worker.log`
- **Access Logs:** `/var/log/nginx/access.log` (if using nginx)

### Health Check Endpoints

- **General Health:** `GET /health`
- **Database Health:** `GET /health/database`
- **Cache Health:** `GET /health/cache`
- **Background Worker Health:** `GET /health/worker`
- **External API Health:** `GET /health/external`

## Security Configuration

### Authentication
- JWT token expiration: 24 hours
- Session expiration: 7 days
- Password hashing: bcrypt with salt rounds 10
- Rate limiting: 100 requests per minute per IP

### Authorization
- Role-based access control (RBAC)
- Resource ownership validation
- API key authentication for external integrations

### Data Protection
- Encryption at rest (database)
- Encryption in transit (TLS 1.3)
- Sensitive data masking in logs
- PII handling compliance

### API Security
- CORS configuration
- CSRF protection
- XSS protection headers
- SQL injection prevention (parameterized queries)

## Performance Configuration

### Database
- Connection pool size: 20
- Query timeout: 30 seconds
- Statement timeout: 10 seconds

### Cache
- Redis max memory: 1GB
- Cache eviction policy: allkeys-lru
- Default TTL: 3600 seconds

### Background Workers
- Concurrency: 5
- Job timeout: 5 minutes
- Retry attempts: 3
- Retry delay: exponential backoff

### API
- Request timeout: 30 seconds
- Response compression: gzip
- Static asset caching: 1 year

## Monitoring Configuration

### Metrics to Track

- Request rate (requests/second)
- Response time (P50, P95, P99)
- Error rate (by status code)
- Database query time
- Cache hit rate
- Background worker queue depth
- External API latency
- Memory usage
- CPU usage

### Alerting Thresholds

- Error rate > 1% for 5 minutes
- Response time P95 > 5s for 5 minutes
- Database connection pool > 80%
- Cache hit rate < 70%
- Background worker queue depth > 100
- Memory usage > 80%
- CPU usage > 80% for 5 minutes

## Backup Configuration

### Database Backups
- Frequency: Daily
- Retention: 30 days
- Offsite: Yes (S3 or equivalent)
- Encryption: At rest

### Cache Backups
- Frequency: Not required (ephemeral)
- Persistence: Redis AOF enabled
- Recovery: Rebuild from database

### File Storage
- Frequency: Continuous sync
- Retention: 90 days
- Offsite: Yes (S3 or equivalent)
- Encryption: At rest and in transit

## Appendix

### Configuration Files

- `.env` - Environment variables (local)
- `.env.staging` - Environment variables (staging)
- `.env.production` - Environment variables (production)
- `config/database.js` - Database configuration
- `config/cache.js` - Cache configuration
- `config/queue.js` - Background worker configuration

### Documentation References

- Phase 1-26 Implementation Documentation
- API Error Contract Specification
- Product Identity Resolver Documentation
- SEO Intelligence Normalizer Documentation
- Production Test Matrix

### Support Contacts

- **Lead Developer:** [To be configured]
- **DevOps Engineer:** [To be configured]
- **Database Administrator:** [To be configured]
- **Security Team:** [To be configured]

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-17 | Initial configuration report for Phases 1-25 |
