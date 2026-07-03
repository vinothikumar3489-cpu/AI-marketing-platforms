# Production Intelligence Upgrade - Implementation Start Guide

## 🎯 Current Status

**Immediate Issue**: Content Gap Engine error - `productName` undefined
**Root Cause**: Variable scoping issue in content-gap-engine.service.js
**Status**: ✅ **FIXED**

---

## ✅ Phase 1: Foundation (STARTED)

### Completed Tasks:
1. ✅ Fixed content-gap-engine.service.js variable scoping
2. ✅ Created comprehensive specification document
3. ✅ Designed hybrid requirements + technical architecture

### Immediate Next Steps (Today):

#### 1. Test the Fix
```bash
# Navigate to backend
cd backend

# Restart the server
npm run dev
```

#### 2. Test SEO Intelligence
- Open frontend: http://localhost:5173
- Create new chat
- Enter website URL: https://orkyn.ai
- Click "Run SEO Analysis"
- Verify: No errors in console
- Verify: Content Gap section loads correctly

#### 3. Verify Growth Workspace
- In same chat, test Growth Workspace
- Verify all modules load

---

## 📋 Next Implementation Tasks (Priority Order)

### Task 1: Create Validation Service (2 hours)
**File**: `backend/src/services/validation/ai-validator.service.js`

**Purpose**: Validate all AI outputs before saving

**Implementation**:
```javascript
export async function validateAIOutput(response, schema) {
  // 1. Parse JSON with retry
  // 2. Validate schema
  // 3. Check quality
  // 4. Add confidence scores
  // 5. Return validated data
}
```

### Task 2: Create Evidence Tracker (2 hours)

**File**: `backend/src/services/validation/evidence-tracker.service.js`

**Purpose**: Track sources for every claim

**Implementation**:
```javascript
export class EvidenceTracker {
  constructor() {
    this.sources = [];
  }
  
  addSource(url, type, content) {
    this.sources.push({ url, type, content, timestamp: new Date() });
  }
  
  getSources() {
    return this.sources;
  }
  
  citeClaim(claim, sourceIndex) {
    return {
      claim,
      source: this.sources[sourceIndex],
      confidence: calculateConfidence(claim, this.sources[sourceIndex])
    };
  }
}
```

### Task 3: Add Confidence Scoring (3 hours)
**File**: `backend/src/services/validation/confidence-scorer.service.js`

**Purpose**: Calculate confidence for every assertion

**Scoring Logic**:
- Direct extraction from HTML: 95-100
- Clear text pattern match: 85-94
- Strong inference: 70-84
- Weak inference: 50-69
- Guess: < 50 (reject)

### Task 4: Update Database Schema (1 hour)
**File**: `backend/prisma/schema.prisma`

**Changes**:
```prisma
model GrowthWorkspace {
  // Add confidence fields
  productConfidence     Int?
  marketConfidence      Int?
  audienceConfidence    Int?
  
  // Add evidence tracking
  evidenceSources       Json?
  
  // Add cache management
  cacheExpiry           DateTime?
  lastRefreshed         DateTime?
}

// NEW
model StrategicStory {
  id                    String   @id @default(cuid())
  chatId                String   @unique
  userId                String
  currentSituation      Json
  marketPosition        Json
  competitorLandscape   Json
  currentProblems       Json
  growthBottlenecks     Json
  hiddenOpportunities   Json
  customerBehaviour     Json
  marketingStrategy     Json
  seoStrategy           Json
  growthStrategy        Json
  revenueStrategy       Json
  roadmap90Day          Json
  futureVision          Json
  generatedAt           DateTime @default(now())
  updatedAt             DateTime @updatedAt
  chat                  Chat     @relation(fields: [chatId], references: [id])
}
```

**Run Migration**:
```bash
cd backend
npx prisma migrate dev --name add_production_features
npx prisma generate
```

---

## 🗓️ Week 1 Schedule

### Monday (Today)
- ✅ Fix content-gap error
- ✅ Create specification
- ⏳ Test fixes
- ⏳ Create validation service
- ⏳ Create evidence tracker

### Tuesday
- Implement confidence scoring
- Update database schema
- Run migrations
- Test new foundation

### Wednesday
- Begin Product Intelligence redesign
- Add evidence tracking to extraction
- Add confidence scoring

### Thursday
- Continue Product Intelligence
- Begin Market Discovery redesign

### Friday
- Complete Market Discovery
- Begin Audience Intelligence
- Weekly review and testing

---

## 📊 Progress Tracking

Use this checklist to track implementation:

### Phase 1: Foundation ✅ STARTED
- [x] Fix immediate error
- [x] Create comprehensive spec
- [ ] Create validation service
- [ ] Create evidence tracker
- [ ] Implement confidence scoring
- [ ] Update database schema
- [ ] Implement caching layer
- [ ] Add retry logic

### Phase 2: Growth Workspace Redesign
- [ ] Product Intelligence Engine
- [ ] Market Discovery Engine
- [ ] Audience Intelligence Engine
- [ ] Competitor Intelligence Engine
- [ ] Intent Prediction Engine
- [ ] Positioning Engine
- [ ] Campaign Generator
- [ ] Channel Recommendation
- [ ] Action Plan Generator

### Phase 3: SEO Intelligence Upgrade
- [ ] Identity Detection
- [ ] Technical SEO
- [ ] Keyword Intelligence
- [ ] GEO Intelligence
- [ ] Competitor SEO
- [ ] Content Gap
- [ ] Blog Intelligence
- [ ] Executive Dashboard

### Phase 4: Strategic Story Page
- [ ] Story generator
- [ ] Backend API
- [ ] Frontend page
- [ ] PDF export

### Phase 5: Frontend Transformation
- [ ] Growth Workspace UI
- [ ] SEO Intelligence UI
- [ ] Strategic Story UI
- [ ] Visualization components
- [ ] Responsive design

### Phase 6: Performance & Polish
- [ ] Parallelization
- [ ] Caching optimization
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Documentation

---

## 🎯 Success Checklist

Before considering any phase complete, verify:

✅ **Code Quality**
- [ ] No console errors
- [ ] Proper error handling
- [ ] Comprehensive logging
- [ ] Code is readable and maintainable

✅ **Data Quality**
- [ ] All outputs have confidence scores
- [ ] Sources cited for all claims
- [ ] No generic/templated content
- [ ] Evidence tracked

✅ **Performance**
- [ ] Meets target load times
- [ ] No blocking operations
- [ ] Caching functional

✅ **User Experience**
- [ ] UI is professional
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Navigation intuitive

---

## 🚀 Quick Commands

```bash
# Start development
cd backend && npm run dev
cd frontend && npm run dev

# Run migrations
cd backend
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio

# Run tests (when available)
npm test

# Build for production
npm run build
```

---

## 📞 Need Help?

Refer to:
- Main Spec: `.kiro/specs/production-intelligence-upgrade/SPEC.md`
- API Documentation: `backend/API.md` (to be created)
- Architecture Diagrams: See SPEC.md section 2.1

---

**Status**: ✅ Ready to proceed with Phase 1 implementation  
**Next Milestone**: Complete Phase 1 by end of Week 2  
**Last Updated**: 2026-06-26
