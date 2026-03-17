# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive GLM-5 AI insights with institutional-grade analysis
- Real Supabase authentication with password reset and session management
- Logger utility for environment-aware logging
- React.lazy code splitting for improved initial load performance
- TypeScript strict mode for better type safety
- ESLint configuration with React and import rules
- Enhanced CI/CD pipeline with lint, test, and security audit stages
- Vite proxy for OpenCode API to bypass CORS restrictions

### Security
- Removed all production console.log statements
- API keys now proxied through Vite dev server
- Client-side logging now respects environment (dev/prod)

### Performance
- Lazy loaded Dashboard, Transactions, Analysis, and other heavy components
- Suspense boundaries with loading fallbacks

### Developer Experience
- Added npm scripts: `lint`, `lint:fix`, `typecheck`, `ci`
- ESLint flat config with TypeScript, React, and import rules
- CHANGELOG.md for tracking changes
- CONTRIBUTING.md guidelines

## [2.0.1] - 2024-01-15

### Added
- AI Portfolio Analysis with Gemini integration
- Kelly Criterion calculator
- Monte Carlo simulation for risk analysis
- HHI concentration metrics
- VWAP execution analysis
- Market data caching

### Fixed
- Portfolio calculation edge cases
- Fee inference for transactions
- Bank operation categorization

## [2.0.0] - 2024-01-01

### Added
- Complete portfolio management system
- Transaction import from CSV
- Bank operations tracking
- Dividend calendar
- Performance charts
- Allocation visualization (sunburst, treemap)
- Signals scanner for Moroccan stocks
- Dark mode support
- PWA support for offline usage

### Security
- IndexedDB for local data storage
- Optional Supabase cloud sync

---

For older versions, see git history.