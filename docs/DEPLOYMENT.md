# Atlas Portfolio Manager - Cloud Deployment Guide

This guide will help you deploy your portfolio tracker to the cloud with full multi-device synchronization.

## Overview

Your app now supports:
- **Cloud Database**: PostgreSQL database via Supabase (free tier available)
- **Authentication**: Secure user accounts with email/password
- **Multi-device Sync**: Access your data from phone, PC, or any browser
- **Local Backup**: Automatic fallback to local storage when offline

## Prerequisites

1. A GitHub account
2. A Vercel account (free)
3. A Supabase account (free)

## Step 1: Set Up Supabase (Cloud Database)

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose an organization (or create one)
4. Enter project details:
   - **Name**: `atlas-portfolio`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location (e.g., `North America`)
5. Click "Create new project" (takes ~2 minutes)

### 1.2 Get Your API Credentials

1. Once the project is ready, go to the **Project Dashboard**
2. Click on the **Project Settings** icon (gear icon) in left sidebar
3. Go to **API** section
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`)
   - **Project API Keys** → `anon public` (starts with `eyJ...`)

### 1.3 Set Up Database Schema

1. In Supabase Dashboard, click on **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste it into the SQL Editor
5. Click **Run**

This creates all the necessary tables with proper security (RLS policies).

### 1.4 Enable Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled (default)
3. Go to **Settings** → **Email Templates** (optional: customize emails)

## Step 2: Update Environment Variables

### 2.1 Local Development

1. Open `.env.local` file in your project
2. Replace the placeholder values with your Supabase credentials:

```env
GEMINI_API_KEY=AIzaSyBndjfuQCmo2EterNNeWBcSuLvqPiTv8X8

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.2 Production (Vercel)

You'll add these in Step 4.

## Step 3: Push to GitHub

### 3.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Add cloud sync with Supabase"
```

### 3.2 Add Remote Repository

```bash
git remote add origin https://github.com/abdelelyoo/CsemaTacker.git
```

If you get an error saying remote already exists:
```bash
git remote remove origin
git remote add origin https://github.com/abdelelyoo/CsemaTacker.git
```

### 3.3 Push to GitHub

```bash
git branch -M main
git push -u origin main
```

If prompted, enter your GitHub credentials.

## Step 4: Deploy to Vercel

### 4.1 Connect GitHub to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up/login with GitHub
2. Click **Add New...** → **Project**
3. Find and select your `CsemaTacker` repository
4. Click **Import**

### 4.2 Configure Project

1. **Framework Preset**: Select `Vite`
2. **Root Directory**: `./` (leave as default)
3. **Build Command**: `npm run build` (should be auto-detected)
4. **Output Directory**: `dist` (should be auto-detected)

### 4.3 Add Environment Variables

Under **Environment Variables**, add:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `VITE_GEMINI_API_KEY` | AIzaSyBndjfuQCmo2EterNNeWBcSuLvqPiTv8X8 |

### 4.4 Deploy

1. Click **Deploy**
2. Wait for the build to complete (~2-3 minutes)
3. Your app will be live at a URL like `https://atlas-portfolio-xxxxx.vercel.app`

## Step 5: Enable Cloud Sync

### 5.1 On Your First Device

1. Open your deployed app URL
2. Go to the **Transactions** tab
3. Click **"Enable Cloud Sync"**
4. Create an account with email/password
5. Click **"Migrate Data"** to upload your existing local data to the cloud

### 5.2 On Additional Devices

1. Open the same deployed app URL on your phone or other PC
2. Click **"Enable Cloud Sync"**
3. Sign in with the same email/password
4. Your data will automatically sync from the cloud!

## Features

### Cloud Sync Status Indicators

- **Cloud Sync Active** (Green): You're connected and syncing to cloud
- **Enable Cloud Sync** (Blue): Click to sign in and enable sync
- **Cloud not configured** (Amber): Supabase credentials missing

### Data Migration

- Click **"Migrate Data"** to upload local data to cloud
- Progress is shown during migration
- All your transactions, fees, and company profiles will be synced

### Multi-Device Access

Once cloud sync is enabled:
- Changes on one device appear on all devices
- Works on phone, tablet, PC, or any browser
- Automatic sync when you sign in

## Troubleshooting

### "Cloud not configured" message
- Check that environment variables are set in Vercel
- Ensure `.env.local` is correct for local development

### Can't sign up / sign in
- Check Supabase Authentication settings
- Verify email provider is enabled
- Check spam folder for confirmation emails

### Data not syncing
- Ensure you're signed in on all devices
- Refresh the page to trigger sync
- Check browser console for errors

### Migration failed
- Ensure you have local data to migrate
- Check browser console for specific errors
- Try exporting local data first as backup

## Security Notes

- All data is secured with Row Level Security (RLS)
- Users can only access their own data
- Passwords are hashed by Supabase Auth
- API keys are safe to expose (they're anon/public keys)
- Never commit your service role key to Git

## Backup Your Data

Even with cloud sync, it's good practice to:
1. Export your transactions periodically (CSV export in app)
2. Download local backup from browser storage

## Free Tier Limits (Supabase)

- **Database**: 500 MB
- **API Requests**: Unlimited (fair use)
- **Authentication**: 100,000 users/month
- **Storage**: 1 GB (if you add file uploads later)

These limits are generous for personal use!

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify all environment variables are correct
3. Check Supabase dashboard for database errors
4. Review Vercel deployment logs

## Next Steps

- Install the Vercel app on your phone ("Add to Home Screen")
- Bookmark the deployed URL for easy access
- Share the URL with family members (they'll need their own accounts)

Your portfolio tracker is now in the cloud! 🚀
