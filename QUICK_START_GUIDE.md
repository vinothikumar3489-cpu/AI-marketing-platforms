# Quick Start Guide - AI Marketing Platform

## ✅ What Was Fixed

The complete "New Analysis" flow is now working:

1. **"New Analysis" Buttons** - Added to Dashboard, Growth Workspace, and SEO Intelligence pages
2. **Form Visibility** - Input forms now show when no data exists
3. **State Management** - Proper mode transitions (form → running → results → error)
4. **Project Indicator** - Shows "New Project / No company" before analysis, updates after
5. **Backend Validation** - Removed productName requirement, now only needs websiteUrl
6. **Error Handling** - Clean error displays with Retry and New Analysis options
7. **Data Separation** - Growth and SEO can be reset independently without losing other data

---

## 🚀 How to Run

### 1. Start Backend (Port 5001)
```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ Backend server running on http://localhost:5001
✅ Database connected
```

### 2. Start Frontend (Port 8080 or 5173)
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

### 3. Open Browser
Navigate to: `http://localhost:8080` (or the port shown in terminal)

---

## 📋 User Flow Test

### Test 1: Dashboard → Growth Workspace
1. Open Dashboard (`http://localhost:8080/app/dashboard`)
2. Click **"New Analysis"** button (top-right)
3. Modal appears with 3 options
4. Click **"Growth Workspace"**
5. ✅ Redirects to Growth Workspace page
6. ✅ Shows 7-step input form
7. ✅ Top indicator shows "New Project / No company"

### Test 2: Run Growth Analysis
1. In Growth Workspace, fill **Website URL**: `https://orkyn.ai`
2. (Optional) Fill other fields: Brand Name, Industry, Audience, etc.
3. Navigate through steps 1-7 using **Next Step** button
4. On Step 7, click **"Run Business Intelligence Pipeline"**
5. ✅ Loading state appears with progress text
6. ✅ Results display with tabs: Executive Snapshot, Product DNA, Market Intelligence, etc.
7. ✅ **"New Growth Analysis"** button appears (top-right)
8. ✅ Top indicator updates to show detected product/company

### Test 3: Reset Growth Analysis
1. With results visible, click **"New Growth Analysis"** (top-right)
2. ✅ Form resets to Step 1
3. ✅ All fields cleared
4. ✅ Results hidden
5. ✅ User can enter new URL and run again

### Test 4: SEO Intelligence
1. Navigate to SEO Intelligence page
2. ✅ Shows input form with only "Website URL" field
3. Enter URL: `https://orkyn.ai`
4. Click **"Run SEO Intelligence"**
5. ✅ Loading state appears
6. ✅ Results display with tabs: Executive Dashboard, Technical Audit, Keyword Intelligence, etc.
7. ✅ **"New SEO Analysis"** button appears (top-right)
8. Click "New SEO Analysis"
9. ✅ Form resets

### Test 5: Error Handling
1. Stop backend server (`Ctrl+C` in backend terminal)
2. Try running Growth or SEO analysis
3. ✅ Error card appears: "Backend server is unreachable"
4. ✅ Shows **Retry** and **New Analysis** buttons
5. Restart backend
6. Click **Retry**
7. ✅ Analysis runs successfully

---

## 🎯 Key Features

### Dashboard
- **"New Analysis" Button** - Opens modal with 3 analysis type options
- **Project Cards** - Shows all previous analyses with Growth/SEO scores
- **Search** - Filter projects by name or company

### Growth Workspace
- **7-Step Form**:
  1. Website URL (required)
  2. Brand Basics (optional)
  3. Target Audience (optional)
  4. Campaign Goal (optional)
  5. Budget & Channels (optional)
  6. Competitors (optional)
  7. Final Confirmation
- **Auto-Detection** - Backend detects product/company/industry from URL if not provided
- **Progress Indicator** - Shows completion percentage
- **New Analysis Button** - Resets form while keeping previous results in history

### SEO Intelligence
- **Simple Input** - Only asks for Website URL
- **14-Step Audit** - Technical, Content, Competitor, GEO analysis
- **Auto-Detection** - Detects brand/company from URL
- **Tabs** - Executive Dashboard, Technical Audit, Keyword Intelligence, Competitor SEO, Content Gaps, GEO/AI Visibility, Blog Intelligence, Action Plan

### Project Indicator (Top Bar)
- Before analysis: **"New Project / No company"**
- After Growth: **Detected product name / Detected company**
- After SEO: **Detected brand / Website URL**
- Click to open dropdown with all projects

---

## 📁 Files Changed

### Frontend (5 files)
- `frontend/src/pages/GrowthWorkspacePage.tsx` - Added mode state, New Analysis button, form visibility
- `frontend/src/pages/SEOIntelligencePage.tsx` - Added mode state, New Analysis button, error handling
- `frontend/src/pages/DashboardPage.tsx` - Added New Analysis button + modal
- `frontend/src/context/ProjectContext.tsx` - Safe defaults, error handling, no auto-load on createChat
- `frontend/src/components/AppLayout.tsx` - Dynamic project indicator based on analysis results

### Backend (1 file)
- `backend/src/modules/growth-workspace/growthWorkspace.controller.js` - Made productName optional

---

## 🐛 Troubleshooting

### Frontend doesn't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend shows database error
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### Port already in use
```bash
# Kill process on port 5001 (backend)
npx kill-port 5001

# Kill process on port 8080 (frontend)
npx kill-port 8080
```

### "New Analysis" button not appearing
- Check that analysis has completed successfully
- Check browser console for errors
- Verify mode state is 'results' (not 'form' or 'running')

### Project indicator shows stale data
- This is expected until you run first analysis
- After running Growth or SEO, indicator will update
- Refresh page if indicator doesn't update

---

## 📊 API Endpoints

### Growth Workspace
- **POST** `/api/chats/:chatId/growth-workspace/run-full-analysis`
  - Body: `{ websiteUrl: string, brandName?: string, companyName?: string, ... }`
  - Returns: Analysis results

### SEO Intelligence
- **POST** `/api/chats/:chatId/seo-intelligence/run`
  - Body: `{ websiteUrl: string }`
  - Returns: SEO analysis

### Full Results
- **GET** `/api/chats/:chatId/full-results`
  - Returns: `{ growth: {...}, seo: {...}, executive: {...} }`

### Chats
- **GET** `/api/chats` - List all chats
- **POST** `/api/chats` - Create new chat
  - Body: `{ title: string }`

---

## ✨ Next Steps

After testing the current flow, you can:
1. Add more form validations (URL format, budget range, etc.)
2. Implement real-time progress WebSocket
3. Add export functionality (PDF, PPTX)
4. Enable editing existing analyses
5. Add form draft auto-save

---

**Last Updated:** June 26, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
