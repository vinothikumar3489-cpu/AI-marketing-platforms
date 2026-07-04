# Production Fix Testing Instructions

## Backend Testing

### 1. Test Port 5000 Enforcement

```bash
cd backend
npm run dev
```

**Expected Output:**
```
🚀 Starting AI Marketing Platform Backend...
✅ Killed existing process on port 5000 (PID: xxxxx)
✅ Backend server running on http://localhost:5000
📡 API ready at http://localhost:5000/api
```

**Verify:**
- Server starts on port 5000 every time
- If port is occupied, old process is automatically killed
- Server never tries ports 5001, 5002, etc.

### 2. Test nodemon Stability

```bash
# In backend directory
npm run dev

# In another terminal, create test files:
cd backend
echo "test" > runtime/logs/test.log
echo "test" > runtime/reports/test.json
echo "test" > generated/test.csv
```

**Expected:**
- ✅ Server does NOT restart when creating files in runtime/ or generated/
- ✅ Server DOES restart when editing files in src/

### 3. Test Error Handling

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Expected:
{
  "status": "ok",
  "message": "Backend running successfully"
}

# Test 404
curl http://localhost:5000/api/nonexistent

# Expected:
{
  "success": false,
  "error": "Endpoint not found",
  "path": "/api/nonexistent"
}
```

### 4. Test with Real Website (orkyn.ai)

**Growth Workspace Test:**
```bash
curl -X POST http://localhost:5000/api/chats/{chatId}/growth-workspace/run-full-analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{
    "websiteUrl": "https://orkyn.ai",
    "brandName": "",
    "companyName": "",
    "industry": "",
    "targetCountries": ["USA"],
    "campaignGoals": ["Get more leads"]
  }'
```

**Expected:**
- Backend does NOT restart during analysis
- Analysis completes successfully
- No "Resume Builder" or "Resume.io" in response
- Identity fields auto-detected from website

**SEO Intelligence Test:**
```bash
curl -X POST http://localhost:5000/api/chats/{chatId}/seo-intelligence/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{
    "websiteUrl": "https://orkyn.ai"
  }'
```

**Expected:**
- Only websiteUrl required
- Brand name, company name auto-detected
- No hardcoded values in response
- Response contains real Orkyn.ai data

---

## Frontend Testing

### 1. Test Frontend Connection

```bash
cd frontend
npm run dev
```

**Expected:**
- Frontend starts on http://localhost:5173
- Vite proxy connects to http://localhost:5000
- No CORS errors in console
- Health check succeeds

### 2. Test Growth Workspace

1. Navigate to Growth Workspace
2. **Test Form State:**
   - Fill out Step 1 (Website URL)
   - Navigate away to Dashboard
   - Navigate back to Growth Workspace
   - **Expected:** Form data is preserved (localStorage)

3. **Test Multi-Step Form:**
   - Fill all 7 steps
   - Click "Run Business Intelligence Pipeline"
   - **Expected:** 
     - Loading state shows
     - Backend doesn't restart
     - Results display after completion

4. **Test New Analysis Button:**
   - After results load, click "New Growth Analysis"
   - **Expected:**
     - Form resets to step 1
     - Previous results cleared
     - Ready for new input

### 3. Test SEO Intelligence

1. Navigate to SEO Intelligence
2. Enter URL: `https://orkyn.ai`
3. Click "Run SEO Intelligence"
4. **Expected:**
   - Analysis runs successfully
   - No brand name / company name fields visible
   - Identity auto-detected
   - Results display properly

5. **Test New SEO Analysis:**
   - Click "New SEO Analysis"
   - Enter different URL
   - **Expected:** Previous results cleared, new analysis runs

### 4. Test Dashboard

1. Navigate to Dashboard
2. Click "New Analysis" button
3. Select "Growth Workspace"
4. **Expected:**
   - New chat created
   - Navigated to Growth Workspace
   - Form is blank and ready
   - Chat list updates

---

## Integration Testing

### Test 1: Complete Flow
1. Dashboard → New Analysis → Growth Workspace
2. Fill form with orkyn.ai
3. Run analysis (watch backend terminal - no restart!)
4. Navigate to SEO Intelligence
5. Run SEO for same URL
6. Navigate back to Growth Workspace
7. **Expected:** Both results preserved independently

### Test 2: Multiple Projects
1. Create Project A (orkyn.ai)
2. Run Growth + SEO for Project A
3. Create Project B (different URL)
4. Run Growth + SEO for Project B
5. Switch between projects in chat list
6. **Expected:** Results load correctly for each project

### Test 3: Browser Refresh
1. Fill Growth Workspace form (don't submit)
2. Refresh browser (F5)
3. **Expected:** Form data restored from localStorage
4. Submit analysis
5. Refresh browser again
6. **Expected:** Results still visible

---

## Verification Checklist

### Backend ✅
- [ ] Server always runs on port 5000
- [ ] Old processes killed automatically
- [ ] nodemon ignores runtime/generated files
- [ ] No server restarts during analysis
- [ ] All API responses use standard format
- [ ] No stack traces in production mode
- [ ] Error messages are user-friendly
- [ ] No hardcoded "Resume Builder" in responses
- [ ] Identity auto-detection works

### Frontend ✅
- [ ] Growth Workspace form persists on navigation
- [ ] SEO Intelligence only requires websiteUrl
- [ ] Dashboard New Analysis button works
- [ ] Growth New Analysis button works
- [ ] SEO New Analysis button works
- [ ] No blank screens or infinite spinners
- [ ] Loading states display properly
- [ ] Error messages are clear
- [ ] Results render correctly
- [ ] No raw JSON in UI

### Integration ✅
- [ ] Frontend connects to backend:5000
- [ ] Analysis doesn't restart backend
- [ ] Chat creation works
- [ ] Chat switching loads correct data
- [ ] Multiple projects don't conflict
- [ ] Page refresh preserves state
- [ ] Concurrent Growth + SEO works

---

## Known Issues to Watch

### Issue: Form Lost on Navigation
**Status:** FIXED with useFormPersistence hook  
**Test:** Fill form, navigate away, return - data should persist

### Issue: Backend Restarts During Analysis
**Status:** FIXED with nodemon.json  
**Test:** Run analysis, watch terminal - should not see "Backend server running" during analysis

### Issue: Port 5001 Used Instead of 5000
**Status:** FIXED with process cleanup  
**Test:** Start backend twice - should always use 5000

### Issue: Hardcoded Resume Builder Values
**Status:** FIXED by removing from prompts  
**Test:** Analyze any website - should never see "Resume Builder" unless it's the actual product

---

## Performance Testing

### Load Test (Optional)
```bash
# Install artillery if needed
npm install -g artillery

# Create artillery config (artillery.yml):
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: "SEO Analysis"
    flow:
      - post:
          url: "/api/chats/test-chat-id/seo-intelligence/run"
          json:
            websiteUrl: "https://example.com"

# Run:
artillery run artillery.yml
```

**Expected:**
- Backend handles 5 requests/second
- No crashes or memory leaks
- Response times < 30 seconds

---

## Deployment Verification

Before deploying to production:

1. **Environment Variables Set:**
   ```
   PORT=5000
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   JWT_SECRET=...
   GROQ_API_KEY=...
   GEMINI_API_KEY=...
   FIRECRAWL_API_KEY=...
   CLIENT_URL=https://your-frontend-domain.com
   ```

2. **Database Migration:**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

3. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   # Verify dist/ directory created
   ```

4. **Test Production Build:**
   ```bash
   # Backend
   NODE_ENV=production node backend/src/server.js
   
   # Frontend (serve build)
   npx serve -s frontend/dist -p 3000
   ```

5. **Final Smoke Tests:**
   - [ ] Can login
   - [ ] Can create new analysis
   - [ ] Can run Growth Workspace
   - [ ] Can run SEO Intelligence
   - [ ] Results display correctly
   - [ ] No console errors
   - [ ] No server crashes

---

## Rollback Plan

If issues occur in production:

1. **Immediate:** Revert to previous version
2. **Check logs:** `backend/runtime/logs/`
3. **Database:** Ensure migrations applied
4. **Environment:** Verify all vars set
5. **Port:** Ensure 5000 is available
6. **Dependencies:** Run `npm install` fresh

---

## Success Criteria

✅ **Backend Stability:**
- Server starts reliably on port 5000
- No restarts during analysis
- All endpoints return consistent responses
- Error handling never crashes server

✅ **Frontend Stability:**
- Forms persist state across navigation
- Loading states work properly
- Error messages are clear
- No raw JSON in UI

✅ **Production Readiness:**
- No hardcoded example values
- Security: No stack traces exposed
- Performance: Handles concurrent requests
- Monitoring: Structured logging in place

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. 🚧 Implement remaining frontend fixes (Executive Story, etc.)
3. 🚧 Add E2E tests with Playwright
4. 🚧 Performance optimization
5. 🚧 Security audit
6. 🚧 Documentation update
7. ✅ Deploy to staging
8. ✅ Deploy to production

---

**Happy Testing! 🚀**
