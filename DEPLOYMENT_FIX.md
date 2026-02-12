# Vercel Deployment Hook

## Problem
The production domain `csema.vercel.app` is pointing to an old deployment.
The preview URL shows the latest changes correctly.

## Solution Options

### Option 1: Manual Redeploy (Easiest)
1. Go to https://vercel.com/dashboard
2. Select **CsemaTacker** project
3. Click **Deployments** tab
4. Find the latest deployment (commit: `529bbca`)
5. Click **"Promote to Production"** or the **three dots ⋯** → **"Redeploy"**
6. Select **"Use existing Build Cache"** = NO

### Option 2: Create Deploy Hook
1. Go to https://vercel.com/dashboard
2. Select **CsemaTacker** project
3. Go to **Settings** → **Git** 
4. Scroll to **"Deploy Hooks"**
5. Create a hook named "Redeploy Production"
6. Copy the URL (looks like: `https://api.vercel.com/v1/integrations/deploy/...`)
7. Run: `curl -X POST <your-deploy-hook-url>`

### Option 3: Alias Command (Requires Vercel CLI Login)
```bash
# First login (opens browser)
vercel login

# Then alias the latest deployment
vercel alias csema-tacker-yqgo-git-main-abdels-projects-78504615.vercel.app csema.vercel.app
```

### Option 4: Use Working Preview URL
Use this URL until production is fixed:
```
https://csema-tacker-yqgo-git-main-abdels-projects-78504615.vercel.app/
```

## Current Status
- ✅ Latest commit: `529bbca` pushed to GitHub
- ✅ Preview deployment working with fee/tax fixes
- ❌ Production domain `csema.vercel.app` stuck on old deployment

## Root Cause
Vercel production domain not auto-updating from git pushes.

## Recommended Action
Use **Option 1** - Manual redeploy from Vercel Dashboard (takes 30 seconds)