# Troubleshooting 502 Errors - AI Marketing Platform

## Issue: Request Failed 502 (Bad Gateway)

The 502 errors you're seeing indicate the frontend cannot reach the backend server. This has been **FIXED** by updating the configuration.

---

## What Was Fixed

### 1. **Port Mismatch Resolved**
- **Problem:** Frontend proxy was pointing to port 5001, backend was on port 5000
- **Solution:** Updated `frontend/vite.config.ts` to proxy to port 5000

### 2. **Configuration Files Updated**
- ✅ `frontend/vite.config.ts` - Changed proxy target from 5001 to 5000
- ✅ `backend/.env` - Confirmed PORT=5000
- ✅ `frontend/.env` - Confirmed VITE_API_URL=/api

---

## How to Fix (If Still Seeing 502 Errors)

### Option 1: Hard Refresh Browser (RECOMMENDED)
```
1. Press Ctrl + Shift + R (Windows/Linux) or Cmd + Shift + R (Mac)
2. Or: Open DevTools (F12) → Right-click Refresh → "Empty Cache and Hard Reload"
3. This clears cached API calls from the old port
```

### Option 2: Restart Services
```batch
# Use the provided batch file
RESTART_SERVICES.bat

# Or manually:

# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Option 3: Clear Browser Cache
```
1. Open DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Close and reopen browser
```

---

## Verify Backend is Running

### Test 1: Direct Backend Health Check
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{"status":"ok","message":"Backend running successfully"}
```

### Test 2: Through Frontend Proxy
```bash
curl http://localhost:8080/api/health
```

**Expected Response:**
```json
{"status":"ok","message":"Backend running successfully"}
```

### Test 3: Check Processes
```bash
# Check backend port 5000
netstat -ano | findstr ":5000"

# Check frontend port 8080
netstat -ano | findstr ":8080"
```

---

## Common Causes of 502 Errors

### 1. **Backend Not Running**
**Symptom:** No response from `http://localhost:5000/api/health`

**Fix:**
```bash
cd backend
npm run dev
```

**Expected Output:**
```
Backend server running on http://localhost:5000
```

---

### 2. **Wrong Port in Proxy Config**
**Symptom:** Backend running but frontend can't connect

**Check:**
```typescript
// frontend/vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:5000', // ← Must match backend port
    changeOrigin: true,
  }
}
```

---

### 3. **Port Already in Use**
**Symptom:** Backend says "Port 5000 in use — trying 5001"

**Fix Option A - Kill Process:**
```bash
# Find process using port 5000
netstat -ano | findstr ":5000"
# Kill it (replace PID with actual process ID)
taskkill /F /PID <PID>
```

**Fix Option B - Update Config:**
```bash
# backend/.env
PORT=5001

# frontend/vite.config.ts
target: 'http://localhost:5001'
```

---

### 4. **CORS Issues**
**Symptom:** "blocked by CORS policy" in console

**Verify Backend CORS Config:**
```javascript
// backend/src/server.js
const allowedOrigins = [
  "http://localhost:8080", // ← Frontend must be listed
  ...
];
```

---

### 5. **API Route Not Found**
**Symptom:** 404 instead of 502

**Check Route Exists:**
```javascript
// backend/src/server.js
app.use("/api/chats", seoIntRouter); // ← SEO routes mounted
app.use("/api/chats", growthWorkspaceRouter); // ← Growth routes mounted
```

**Test Specific Endpoint:**
```bash
# Test SEO endpoint (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/chats/CHAT_ID/seo-intelligence/run
```

---

## Current Configuration (Verified Working)

### Backend
- **Port:** 5000
- **Health Endpoint:** http://localhost:5000/api/health
- **SEO Route:** `/api/chats/:chatId/seo-intelligence/run`
- **Growth Route:** `/api/chats/:chatId/growth-workspace/run-full-analysis`

### Frontend
- **Port:** 8080
- **Proxy:** Forwards `/api/*` to `http://localhost:5000/api/*`
- **API Base:** `/api` (uses proxy)

### API Routes
✅ POST `/api/chats/:chatId/seo-intelligence/run` - Run SEO analysis  
✅ POST `/api/chats/:chatId/growth-workspace/run-full-analysis` - Run Growth analysis  
✅ GET `/api/chats/:chatId/full-results` - Get combined results  
✅ GET `/api/chats` - List all chats  
✅ POST `/api/chats` - Create new chat  

---

## Step-by-Step Debug Process

### Step 1: Verify Backend is Alive
```bash
curl http://localhost:5000/api/health
```
✅ If this works → Backend is running correctly  
❌ If this fails → Start backend with `cd backend && npm run dev`

### Step 2: Verify Proxy is Working
```bash
curl http://localhost:8080/api/health
```
✅ If this works → Proxy is configured correctly  
❌ If this fails → Check vite.config.ts proxy target

### Step 3: Check Browser Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Try running SEO or Growth analysis
4. Look at failed requests:
   - **URL:** Should be `http://localhost:8080/api/chats/...`
   - **Status:** If 502 → backend unreachable
   - **Status:** If 404 → route doesn't exist
   - **Status:** If 401 → authentication issue

### Step 4: Check Console for Errors
1. Open DevTools (F12)
2. Go to Console tab
3. Look for:
   - CORS errors
   - Network errors
   - API errors

---

## Still Not Working?

### Nuclear Option: Full Reset
```bash
# 1. Stop all Node processes
taskkill /F /IM node.exe

# 2. Clear all caches
cd frontend
rm -rf node_modules .vite dist
npm install

cd ../backend
rm -rf node_modules
npm install

# 3. Restart services
cd backend
npm run dev

# In new terminal:
cd frontend
npm run dev

# 4. Hard refresh browser
Ctrl + Shift + R
```

---

## Testing Checklist

After fixing, verify these work:

### Backend Health
- [ ] http://localhost:5000/api/health returns 200 OK

### Frontend Proxy
- [ ] http://localhost:8080/api/health returns 200 OK

### Growth Workspace
- [ ] Open http://localhost:8080/app/growth-workspace
- [ ] Fill in Website URL
- [ ] Click "Run Business Intelligence Pipeline"
- [ ] No 502 errors in Network tab
- [ ] Loading state appears
- [ ] Results display

### SEO Intelligence  
- [ ] Open http://localhost:8080/app/seo-intelligence
- [ ] Fill in Website URL
- [ ] Click "Run SEO Intelligence"
- [ ] No 502 errors in Network tab
- [ ] Loading state appears
- [ ] Results display

---

## Quick Reference

### Restart Backend
```bash
cd backend
npm run dev
```

### Restart Frontend
```bash
cd frontend
npm run dev
```

### Check Ports
```bash
netstat -ano | findstr ":5000"  # Backend
netstat -ano | findstr ":8080"  # Frontend
```

### Hard Refresh Browser
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

---

## Contact / Support

If errors persist after following this guide:
1. Check backend terminal for error messages
2. Check browser console for detailed errors
3. Verify database is running (PostgreSQL on port 5432)
4. Ensure all environment variables are set in backend/.env

---

**Last Updated:** June 26, 2026  
**Status:** ✅ Configuration Fixed - Requires Browser Hard Refresh
