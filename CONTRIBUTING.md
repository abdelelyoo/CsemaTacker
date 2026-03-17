# Contributing to Atlas Portfolio Manager

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites
- Node.js 20+
- npm 10+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/atlas-portfolio-manager.git
cd atlas-portfolio-manager

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your API keys to .env.local
# VITE_OPENCODE_API_KEY=your_key_here
# VITE_SUPABASE_URL=your_url_here
# VITE_SUPABASE_ANON_KEY=your_key_here
```

### Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Type check
npm run typecheck

# Build for production
npm run build

# Run full CI pipeline locally
npm run ci
```

## Code Style

### TypeScript
- Use strict mode (enabled in tsconfig.json)
- All new code must pass type checking
- Avoid `any` types - use proper typing
- Use `unknown` instead of `any` for truly unknown types

### Logging
- Use the logger utility instead of console.log
- Import: `import { logger, logContext } from '../utils/logger'`
- Log levels: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`

```typescript
// Good
logger.info(logContext.PORTFOLIO, 'Transaction added', { ticker: 'ATW' });

// Bad - never use console.log in production code
console.log('Transaction added');
```

### Components
- Use React.lazy for heavy components
- Wrap lazy components in Suspense with fallback
- All components should be typed with React.FC<Props>

```typescript
// Good
const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));

const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
);
```

### API Keys
- Never hardcode API keys
- Always use environment variables: `import.meta.env.VITE_YOUR_KEY`
- Add keys to `.env.example` template

## Pull Request Process

1. **Fork and Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add/update tests
   - Run lint and typecheck

3. **Test Locally**
   ```bash
   npm run ci  # Runs typecheck, lint, test, and build
   ```

4. **Commit**
   - Use conventional commit messages
   - Format: `type(scope): description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **CI Checks**
   - All CI checks must pass
   - Preview deployment will be generated

## Project Structure

```
atlas-portfolio-manager/
├── components/    # React components
├── context/       # React contexts
├── hooks/         # Custom hooks
├── services/      # API services
├── utils/         # Utility functions
├── types/         # TypeScript types
├── lib/           # Third-party configs
├── docs/          # Documentation
└── tests/         # Test files
```

## Testing Guidelines

- Unit tests go in `tests/` directory
- Test file naming: `*.test.ts` or `*.test.tsx`
- Use Vitest for testing
- Use React Testing Library for component tests

```bash
# Run specific test file
npm run test -- --run tests/utils/portfolioCalc.test.ts

# Watch mode
npm run test:watch
```

## Questions?

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Tag maintainers for urgent matters

## License

By contributing, you agree that your contributions will be licensed under the MIT License.