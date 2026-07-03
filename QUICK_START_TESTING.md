# 🚀 Quick Start: Platform Stabilization Testing

**Ready to test?** All Phase 1 code fixes are complete. Follow these steps to verify platform stability.

---

## ⚡ 5-Minute Setup

### Step 1: Verify Prerequisites
```bash
# Check PostgreSQL is running
netstat -ano | findstr :5432
# Should see something like: TCP    0.0.0.0:5432    LISTENING

# If not running:
# Start PostgreSQL service from Services panel or:
net start postgresql-x64-14  # Adjust version number
```

### Step 2: Backend Setup
```bash
cd backend

# Install dependencies (if not done)
npm install

# Apply database migrations
npx prisma migrate deploy

# (Optional) Seed test data
npm run seed

# Verify .env has all required keys:
# - DATABASE_URL
# - JWT_SECRET
# - GROQ_API_KEY (required)
# - GEMINI_API_KEY (fallback)
# - TAVILY_API_KEY (optional but recommended)
# - FIRECRAWL_API_KEY (optional but recommended)
```

### Step 3: Start Backend
```bash
# From backend directory
npm run dev

# ✅ SUCCESS OUTPUT:
# 🚀 Starting AI Marketing Platform Backend...
# ✅ Backend server running on http://localhost:5000
# 📡 API ready at http://localhost:5000/api

# ❌ ERROR: Port already in use?
# The script should auto-kill the old process
# If not, manually kill it:
netstat -ano | findstr :5000
# Note the PID (last column)
taskkill /F /PID <PID>
```

### Step 4: Start Frontend
```bash
# Open NEW terminal
cd frontend

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev

# ✅ SUCCESS OUTPUT:
# VITE v6.4.3  ready in X ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

### Step 5: Open Browser
```
Navigate to: http://localhost:5173

Expected:
- Login page loads
- No console errors (press F12)
- Clean UI, no broken images

Login Credentials (after seed):
- Email: admin@test.com
- Password: password123
```

---

## 🧪 Quick Smoke Test (10 Minutes)

### Test 1: Growth Workspace - New Analysis
1. Navigate to **Growth Workspace** from sidebar
2. Fill in form:
   - Company: `Orkyn`
   - Product: `AI Marketing Platform`
   - Website: `https://orkyn.ai`
   - Description: `AI-powered marketing intelligence platform`
   - Industry: `SaaS / Marketing Tech`
   - Competitors: `HubSpot, Marketo`
3. Click through all 7 steps (fill minimal info)
4. Click **"Run Business Intelligence Pipeline"**
5. **Watch backend terminal** - should NOT restart!
6. **Watch browser console** - should have no errors!
7. Wait 30-60 seconds for completion
8. **Expected:**
   - Progress bar shows completion
   - All 8 tabs populate with data
   - Growth Score displays (0-100)
   - No raw JSON visible
   - No "Resume Builder" unless analyzing resume.io

✅ **Pass Criteria:** Analysis completes, results display, no crashes

### Test 2: SEO Intelligence - New Analysis
1. Navigate to **SEO Intelligence** from sidebar
2. Enter URL: `https://orkyn.ai`
3. Click **"Run SEO Intelligence"**
4. **Watch backend terminal** - should NOT restart!
5. **Watch browser console** - should have no errors!
6. Wait 45-90 seconds for completion
7. **Expected:**
   - Progress indicators show
   - All 8 tabs populate (Overview, Technical, Keywords, etc.)
   - SEO Score displays (0-100)
   - Charts render correctly
   - No raw JSON visible

✅ **Pass Criteria:** SEO analysis completes, all tabs work, no crashes

### Test 3: Dashboard Update
1. Navigate to **Dashboard** from sidebar
2. **Expected:**
   - Orkyn project appears in "Recent Projects"
   - Growth Score shows (from Test 1)
   - SEO Score shows (from Test 2)
   - Status badges: "Growth Analysis" + "SEO Analysis"
   - Last updated timestamp is recent

✅ **Pass Criteria:** Dashboard reflects both analyses

### Test 4: Chat History & Delete
1. Navigate to **Chat History** from sidebar
2. See Orkyn project listed
3. Click **Delete** icon (trash can)
4. Confirm deletion
5. **Expected:**
   - Toast notification appears: "Project deleted successfully"
   - Project disappears from list
   - No console errors
   - Button shows spinner during delete

✅ **Pass Criteria:** Delete works with feedback, no errors

---

## ✅ Quick Verification Checklist

After 10-minute smoke test, verify:

- [ ] Backend started on port 5000 (not 5001/5002)
- [ ] Frontend builds with 0 TypeScript errors
- [ ] Login works
- [ ] Growth Workspace analysis completes successfully
- [ ] SEO Intelligence analysis completes successfully
- [ ] Dashboard shows both scores
- [ ] Chat delete works with toast notification
- [ ] No backend restarts during analyses
- [ ] No console errors anywhere
- [ ] No raw JSON in UI
- [ ] No "Resume Builder" data (unless analyzing resume.io)

**If all checked:** Platform is stable for continued testing! ✅

**If any fail:** Document the issue and refer to `STABILIZATION_TESTING_PLAN.md` for detailed debugging.

---

## 🔥 Common Issues & Quick Fixes

### Issue: Backend won't start (EADDRINUSE)
```bash
# Port 5000 still in use
netstat -ano | findstr :5000
taskkill /F /PID <PID>

# Then restart
npm run dev
```

### Issue: 502 Bad Gateway in browser
```bash
# Backend not running or wrong port
# Check backend terminal - should see "running on http://localhost:5000"
# If not, restart backend

# Check frontend vite.config.ts proxy:
# Should proxy /api to http://localhost:5000
```

### Issue: Database connection error
```bash
# PostgreSQL not running
net start postgresql-x64-14

# Or check DATABASE_URL in backend/.env
# Should be: postgresql://username:password@localhost:5432/dbname
```

### Issue: Analysis fails with "API key missing"
```bash
# Check backend/.env
# At minimum need: GROQ_API_KEY
# Add to .env:
GROQ_API_KEY=your_key_here

# Restart backend after adding keys
```

### Issue: Frontend shows old cached data
```bash
# Hard refresh browser
# Windows: Ctrl+Shift+R
# Mac: Cmd+Shift+R

# Or clear localStorage:
# F12 → Application → Storage → Local Storage → Clear All
```

---

## 📊 Next Steps After Quick Test

### If All Tests Pass
1. Proceed to **Full Test Suite**: `STABILIZATION_TESTING_PLAN.md`
2. Run all 70+ test cases systematically
3. Document results in `STABILIZATION_TEST_RESULTS.md`
4. Mark any failures for immediate fix

### If Tests Fail
1. **Document failure:**
   - Which test failed?
   - What was the error message?
   - Screenshot the issue
   - Copy console logs
2. **Check if known issue:**
   - See `STABILIZATION_REPORT.md` Issues #16-43
   - May already be documented
3. **Report new bug:**
   - Add to `STABILIZATION_REPORT.md`
   - Severity: Critical/High/Medium/Low
   - Impact description
4. **Fix or skip:**
   - If critical: Fix immediately, re-test
   - If medium/low: Document, continue testing

---

## 🎯 Full Testing Timeline

| Phase | Tests | Est. Time | Priority |
|-------|-------|-----------|----------|
| Quick Smoke Test | 4 tests | 10 mins | 🔴 Critical |
| Growth Runtime | 28 checks | 1 hour | 🔴 Critical |
| SEO Runtime | 35 checks | 1 hour | 🔴 Critical |
| Integration | 30 checks | 1 hour | 🟡 High |
| Edge Cases | 26 checks | 30 mins | 🟡 High |
| Real Websites (E2E) | 38 checks | 1.5 hours | 🟡 High |
| Leakage Verify | 7 checks | 30 mins | 🟢 Medium |
| Performance | 15 checks | 45 mins | 🟢 Medium |
| **TOTAL** | **183 checks** | **6-7 hours** | |

**Recommendation:** Complete Quick Smoke Test first (10 mins), then schedule dedicated time for full suite.

---

## 💡 Testing Tips

1. **Keep Both Terminals Visible:** Watch for errors in real-time
2. **Use Browser DevTools:** F12 → Console tab open at all times
3. **Test Incrementally:** Don't batch - test one feature, verify, move on
4. **Document Everything:** Screenshot issues immediately
5. **Use Real Data:** Test with actual websites (orkyn.ai, resume.io, notion.so)
6. **Don't Skip Tests:** Each test catches different issues
7. **Re-test After Fixes:** If you fix a bug, re-run related tests

---

## 🎉 Success Criteria

**Quick Test Complete:** All 4 smoke tests pass
**Full Test Complete:** All 183 checks pass
**Platform Stable:** Zero critical/high bugs remaining

**Then:** Create `FINAL_STABILIZATION_COMPLETION_REPORT.md` and start Phase 5!

---

**Last Updated:** June 26, 2026  
**Est. Time to Stable:** 6-7 hours testing + 2-3 hours fixes = 8-10 hours total  
**Status:** ✅ Ready to test - all code fixes complete
