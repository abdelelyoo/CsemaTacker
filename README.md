# Atlas Portfolio Manager (v3.0 Cloud Edition)

### Professional Investment Tracking Dashboard with Cloud Sync

This project is a high-performance, enterprise-grade portfolio manager built for the Moroccan Stock Market (CSEMA). Now with **cloud synchronization** - access your portfolio from any device!

## Features

- **Real-Time Dashboard**: Monitor your capital, P/L, and cash balance instantly.
- **Enterprise Visualization**: Interactive charts with 1M/3M/6M/1Y/ALL ranges, sparklines, and treemaps.
- **AI Analysis**: Integrated Google Gemini AI for portfolio insights and risk assessment.
- **Cloud Sync**: Multi-device synchronization via Supabase PostgreSQL database.
- **Secure Authentication**: Email/password authentication with Row Level Security.
- **Offline Support**: Automatic fallback to local storage when offline.

## Cloud Features

- **Multi-Device Access**: Use on phone, tablet, PC, or any browser
- **Automatic Sync**: Changes sync across all your devices instantly
- **Secure Data**: Your data is private and secure with RLS policies
- **Easy Migration**: One-click migration from local to cloud storage

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

### Cloud Setup

1. Create a free Supabase account at [https://supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase/schema.sql`
3. Add your Supabase credentials to `.env.local`
4. Deploy to Vercel

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Deployment

### Vercel (Recommended)

1. Import this repository to [Vercel](https://vercel.com)
2. Add these Environment Variables:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `VITE_GEMINI_API_KEY` - Google Gemini API key
3. Deploy!

Your app will be live with full cloud synchronization.

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **TailwindCSS** for styling
- **Recharts** for visualizations
- **Supabase** for cloud database and authentication
- **Dexie.js** for local database (fallback)

## Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-key
```

## Database Schema

The app uses PostgreSQL with the following tables:
- `transactions` - All buy/sell transactions
- `fees` - Account fees (CUS, SUB)
- `companies` - Company profiles
- `dividends` - Dividend records
- And more...

See `supabase/schema.sql` for the complete schema.

## Security

- **Row Level Security (RLS)**: Users can only access their own data
- **Secure Auth**: Passwords hashed by Supabase Auth
- **API Security**: Anon keys are safe for client-side use

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT
// Deployed: Thu Feb 12 13:07:20     2026
// Deployment trigger: Thu Feb 12 21:59:12     2026

## Deployment
- Last deployed: 2026-02-12 21:59:24
