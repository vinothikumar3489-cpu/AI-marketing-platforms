# Production Test Matrix

**Phase 25: Production Test Matrix**
**Version:** 1.0
**Last Updated:** 2026-07-17

## Overview

This document defines the production testing strategy for the AI Marketing Platform. It outlines critical test scenarios, acceptance criteria, and validation procedures for ensuring platform stability and reliability in production environments.

## Test Categories

### 1. Product Identity Resolution (Phase 4)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| PI-001 | Canonical product identity resolution across all services | Product identity resolved consistently from productIntelligence → productAnalysis → evidenceSnapshot → domain → chat.title | High |
| PI-002 | Invalid product identity blocking | Content and campaign generation blocked for generic/invalid product names | High |
| PI-003 | Product identity fallback chain | All fallback sources tested and validated | Medium |
| PI-004 | Report consistency with product identity | All reports use canonical product identity for company naming | High |

### 2. SEO Intelligence Normalization (Phase 14)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| SEO-001 | Canonical SEO payload normalization | All SEO consumers receive normalized payload with consistent structure | High |
| SEO-002 | Technical audit adapter integration | Technical audit scores normalized for all consumers | High |
| SEO-003 | Keyword opportunity normalization | Keywords normalized from various sources (DataForSEO, competitor analysis) | High |
| SEO-004 | Content gap rebuild | Content gaps normalized and evidence-backed | Medium |
| SEO-005 | Blog intelligence normalization | Blog ideas normalized with evidence tracking | Medium |

### 3. Content Studio Error Handling (Phase 17)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| CS-001 | Content generation error handling | No 500 errors from content generation, graceful error responses | High |
| CS-002 | Schema validation retry | Failed schema validation triggers retry with repair instructions | High |
| CS-003 | Brief validation blocking | Invalid briefs blocked with clear error messages | High |
| CS-004 | Claim validation integration | Hallucinated claims detected and removed | Medium |
| CS-005 | Content quality scoring | Quality scores calculated and returned for all content | Medium |

### 4. Content Quality & Product Specificity (Phase 18)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| CQ-001 | Product specificity validation | Content blocked for invalid/generic product identities | High |
| CQ-002 | Quality scoring categories | All quality checks (product specificity, evidence coverage, etc.) functional | High |
| CQ-003 | Brief content validation | Briefs with invalid product names blocked | High |
| CQ-004 | Quality scorer integration | Quality scores integrated into content generation pipeline | Medium |

### 5. Campaign Intelligence Quality (Phase 19)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| CI-001 | Product identity validation in campaigns | Campaign generation blocked for invalid product identities | High |
| CI-002 | Evidence reconciliation | Evidence contradictions detected and reported | High |
| CI-003 | Campaign safety filter | Recommendations without evidence excluded | High |
| CI-004 | Fallback mechanism | Evidence-based fallback when AI generation fails | High |
| CI-005 | Evidence status labeling | All campaign elements labeled with evidence status | Medium |

### 6. Automation Centre Tab Cleanup (Phase 20)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| AC-001 | Tab quality metadata | Backend returns tabQuality object with shouldShow flags | High |
| AC-002 | Core tab visibility | Core tabs (Plan, Workflow, AssetLibrary, Analytics, EmailAutomation, CRM) always visible | High |
| AC-003 | Creative Studio threshold | Hidden if less than 2 briefs | High |
| AC-004 | Video Studio threshold | Hidden if less than 2 scripts | High |
| AC-005 | Social Calendar threshold | Hidden if less than 5 entries | High |
| AC-006 | Execution summary generation | getExecutionSummary returns tabQuality metadata | High |

### 7. Frontend Conditional Rendering (Phase 21)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| FE-001 | Backend tab quality consumption | Frontend uses backend tabQuality metadata for visibility | High |
| FE-002 | Fallback to frontend rules | Frontend falls back to local rules when backend metadata unavailable | Medium |
| FE-003 | Tab filtering consistency | Tab visibility consistent between backend and frontend | High |
| FE-004 | Legacy tab compatibility | Legacy tabs mapped and rendered correctly | Medium |

### 8. Report Consistency (Phase 22)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| RP-001 | Product identity in reports | All reports use canonical product identity | High |
| RP-002 | Company naming consistency | Company name consistent across Executive, Growth, and SEO reports | High |
| RP-003 | Report data structure | All reports include productIdentity in data structure | Medium |
| RP-004 | Report generation stability | No errors during report generation with valid data | High |

### 9. API Error Contract (Phase 23)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| API-001 | Error codes standardization | All errors include standardized error codes | High |
| API-002 | Response structure consistency | All responses include success, timestamp, and code fields | High |
| API-003 | Specialized error responses | Invalid product identity and AI provider errors use specialized responses | High |
| API-004 | Development vs production details | Error details only included in development mode | Medium |
| API-005 | Error logging consistency | All errors logged with code, status, and timestamp | Medium |

### 10. AI Search Readiness (Phase 16)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| GEO-001 | Evidence tracking in GEO scores | AI search readiness scores include evidence metadata | High |
| GEO-002 | Fallback mechanisms | GEO scores have fallback values when real data missing | High |
| GEO-003 | Score normalization | All GEO scores normalized to 0-100 range | Medium |
| GEO-004 | Evidence status labels | GEO elements labeled with evidence status | Medium |

### 11. SEO Action Plan Quality (Phase 15)

| Test Case | Description | Acceptance Criteria | Priority |
|-----------|-------------|---------------------|----------|
| SAP-001 | Evidence-based actions only | SEO action plans contain only evidence-based actions | High |
| SAP-002 | No hardcoded actions | Canva-specific or other hardcoded actions removed | High |
| SAP-003 | Action evidence tracking | Each action includes evidence source and confidence | Medium |
| SAP-004 | Action plan generation | Action plans generated from actual SEO intelligence data | High |

## Test Execution Strategy

### Pre-Production Checklist

- [ ] All Phase 1-26 code changes deployed to staging
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] External API keys validated (DataForSEO, AI providers)
- [ ] Cache cleared
- [ ] Background workers restarted

### Smoke Tests (Critical Path)

1. **Product Analysis Flow**
   - Create new chat with website URL
   - Run product intelligence analysis
   - Verify product identity resolved correctly
   - Verify no 500 errors

2. **SEO Intelligence Flow**
   - Run SEO analysis
   - Verify normalized payload structure
   - Verify technical audit scores
   - Verify keyword opportunities

3. **Content Generation Flow**
   - Generate content with valid product identity
   - Verify content quality scores
   - Verify no 500 errors
   - Test with invalid product identity (should block)

4. **Campaign Intelligence Flow**
   - Generate campaign intelligence
   - Verify evidence reconciliation
   - Verify campaign safety filter
   - Test with invalid product identity (should block)

5. **Automation Centre Flow**
   - Generate execution plan
   - Verify tab quality metadata
   - Verify core tab visibility
   - Verify threshold-based tab hiding

6. **Report Generation Flow**
   - Generate Executive report
   - Generate Growth report
   - Generate SEO report
   - Verify product identity consistency

### Regression Tests

- [ ] All existing automated tests pass
- [ ] New test suites (api-error-contract, execution-summary) pass
- [ ] Product identity resolver tests pass
- [ ] SEO normalizer tests pass
- [ ] Automation centre e2e tests pass

### Performance Tests

- [ ] API response times < 2s for 95th percentile
- [ ] Database query optimization verified
- [ ] No memory leaks in background workers
- [ ] Concurrent request handling (100 concurrent users)

### Security Tests

- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Authentication/authorization validation
- [ ] API rate limiting
- [ ] Sensitive data not exposed in error responses

## Monitoring & Alerting

### Key Metrics

1. **Error Rates**
   - 500 errors: < 0.1%
   - 400 errors: < 1%
   - Timeout errors: < 0.5%

2. **Response Times**
   - P50: < 500ms
   - P95: < 2s
   - P99: < 5s

3. **Business Metrics**
   - Successful product analyses: > 95%
   - Successful content generations: > 90%
   - Successful campaign generations: > 90%

### Alert Thresholds

- Critical: Error rate > 1% for 5 minutes
- Warning: Error rate > 0.5% for 10 minutes
- Critical: Response time P95 > 5s for 5 minutes
- Warning: Response time P95 > 3s for 10 minutes

## Rollback Plan

### Rollback Triggers

- Error rate > 5% for 5 minutes
- Critical security vulnerability discovered
- Data corruption detected
- Performance degradation > 50%

### Rollback Procedure

1. Stop deployment pipeline
2. Revert to previous stable version
3. Restore database from backup if needed
4. Clear cache
5. Restart services
6. Verify smoke tests pass
7. Monitor for 30 minutes

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead Developer | | | |
| QA Engineer | | | |
| DevOps Engineer | | | |
| Product Owner | | | |

## Appendix

### Test Environment Configuration

- **Staging URL:** [To be configured]
- **Production URL:** [To be configured]
- **Database:** [To be configured]
- **Cache:** [To be configured]

### External Dependencies

- DataForSEO API
- AI Providers (OpenAI, Anthropic, etc.)
- Email Providers (Gmail, SendGrid, Brevo, Resend)
- Video Providers (Shotstack, Creatomate)
- Creative Providers (Pollinations, Fal)

### Known Limitations

- DataForSEO rate limits may affect SEO analysis speed
- AI provider outages may affect content/campaign generation
- Email provider SMTP timeouts may affect email sending

### References

- Phase 1-26 Implementation Documentation
- API Error Contract Specification
- Product Identity Resolver Documentation
- SEO Intelligence Normalizer Documentation
