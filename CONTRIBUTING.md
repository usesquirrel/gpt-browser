# Contributing to GPT Browser

First off, thank you for considering contributing to GPT Browser! It's people like you that make GPT Browser such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our values of being respectful, inclusive, and collaborative.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples** (URLs that cause issues)
* **Describe the behavior you observed** and what you expected
* **Include screenshots** if relevant
* **Include browser console errors** if any
* **Note your environment** (OS, browser, Node version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description** of the suggested enhancement
* **Provide specific examples** to demonstrate the enhancement
* **Describe the current behavior** and how it would change
* **Explain why this enhancement would be useful**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `yarn install`
3. **Make your changes** following the code style guide
4. **Add tests** if applicable
5. **Ensure the test suite passes**: `yarn test` (if tests exist)
6. **Run linting**: `yarn lint`
7. **Build the project**: `yarn build`
8. **Commit your changes** with a descriptive commit message
9. **Push to your fork** and submit a pull request

## Development Setup

### Prerequisites

- Node.js 18+ and yarn
- OpenAI API key
- Vercel account (for blob storage)

### Local Development

1. Clone your fork:
```bash
git clone https://github.com/usesquirrel/gpt-browser.git
cd gpt-browser
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. Run development server:
```bash
yarn dev
```

### Project Structure

```
src/app/
├── api/              # API endpoints
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # External library configs
├── utils/           # Utility functions
└── page.tsx         # Main page component
```

### Key Areas for Contribution

#### 1. Image Providers
Add support for new image generation models:
- Create a new provider class extending `ImageProvider`
- Implement `generate()` and `generateStream()` methods
- Register in `ImageProviderFactory`

#### 2. Caching Improvements
- Add support for different storage backends
- Implement cache invalidation strategies
- Add cache statistics and management UI

#### 3. Performance Optimizations
- Reduce token usage in prompts
- Optimize HTML cleaning algorithms
- Improve streaming performance

#### 4. UI/UX Enhancements
- Add dark mode support
- Improve mobile responsiveness
- Add more loading states and animations

#### 5. New Features
- Batch URL processing
- Export functionality (PDF, PNG)
- Browser history
- Bookmarking system

## Code Style Guide

### TypeScript
- Use TypeScript for all new code
- Define proper types, avoid `any` when possible
- Use interfaces for object shapes
- Document complex types

### React
- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic to custom hooks
- Handle loading and error states

### Styling
- Use Tailwind CSS classes
- Follow mobile-first responsive design
- Maintain consistent spacing and colors
- Use CSS variables for themes

### Best Practices
- Handle errors gracefully
- Add loading states for async operations
- Log important operations for debugging
- Consider cost implications (AI tokens)
- Write self-documenting code
- Add comments for complex logic

## Testing

Currently, the project doesn't have a test suite. Contributions to add testing are highly welcome:

- Unit tests for utilities
- Integration tests for API endpoints
- Component tests for UI
- E2E tests for critical flows

## Commit Messages

Follow conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding tests
- `chore:` Maintenance tasks

Examples:
```
feat: add support for DALL-E 3 image generation
fix: resolve timeout issue on Vercel deployment
docs: update README with troubleshooting section
```

## API Design Guidelines

When adding new endpoints:

1. **Follow RESTful conventions** where applicable
2. **Support streaming** for long-running operations
3. **Include proper error handling** with meaningful messages
4. **Add request validation** using Zod or similar
5. **Document the endpoint** in README
6. **Consider rate limiting** for expensive operations

## Performance Considerations

- **Token Usage**: Minimize prompts while maintaining quality
- **Caching**: Cache expensive operations aggressively
- **Streaming**: Use SSE for real-time updates
- **Timeouts**: Set appropriate timeouts for API calls
- **Error Recovery**: Implement retry logic with backoff

## Security Guidelines

- **Never commit secrets** to the repository
- **Validate all user input** before processing
- **Sanitize URLs** before fetching
- **Implement rate limiting** for public deployments
- **Use environment variables** for sensitive config
- **Follow OWASP guidelines** for web security

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion in GitHub Discussions
- Reach out to maintainers

## Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Given credit in commit messages

Thank you for contributing to GPT Browser! 🙏