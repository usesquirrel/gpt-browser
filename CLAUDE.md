# Claude AI Assistant Context

This document provides important context for AI assistants working on the GPT Browser project.

## Project Overview

GPT Browser is an AI-powered web browser visualization tool that generates realistic screenshot-like images of websites using AI models. It fetches HTML content from URLs and creates visual representations without actually rendering the page.

## Key Technical Details

### Tech Stack
- **Framework**: Next.js 15.4.6 with App Router
- **Language**: TypeScript
- **Package Manager**: pnpm (migrated from yarn)
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel with Edge/Node.js runtime

### AI Models Used
- **GPT-5-nano**: URL validation, HTML cleaning
- **GPT-5-mini**: HTML to visual description conversion
- **GPT-Image-1**: Image generation (OpenAI)
- **Gemini-2.5-flash-image-preview**: Alternative image generation (Google)

### Important Features
1. **Streaming Image Generation**: Partial images are streamed as they're generated
2. **Provider Switching**: Users can toggle between OpenAI and Gemini models
3. **Caching System**: Vercel Blob storage with provider-aware cache keys
4. **Dial-up Sound**: Nostalgic modem sound plays during generation (can be muted)
5. **PostHog Integration**: Comprehensive analytics and LLM observability

## Development Guidelines

### Running the Project
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

### Environment Variables
Required:
- `OPENAI_API_KEY`: OpenAI API key
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token

Optional:
- `GEMINI_API_KEY`: Google Gemini API key
- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog analytics
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog host

### Code Style
- Use TypeScript with proper types
- Functional React components with hooks
- Tailwind CSS for styling
- No unnecessary comments unless complex logic
- Follow existing patterns in the codebase

### Important Files
- `/src/app/api/generate-image/route.ts`: Main image generation endpoint
- `/src/app/utils/image-providers.ts`: Image provider implementations
- `/src/app/components/DesktopScreen.tsx`: Desktop UI simulation
- `/src/app/hooks/useImageGeneration.ts`: Streaming hook

### Vercel Deployment Notes
- Use `runtime = 'nodejs'` for long-running functions
- Set `maxDuration = 300` for Pro plan (5-minute timeout)
- SSE padding workaround for stream flushing on Vercel

## Recent Changes

### August 2025
- Fixed Vercel timeout issues with Node.js runtime
- Implemented partial image streaming
- Added PostHog LLM observability
- Added Google Gemini support
- Implemented provider-aware caching
- Added dial-up sound feature
- Migrated from yarn to pnpm

## Known Issues & Limitations
1. OpenAI may send fewer partial images than requested
2. Gemini doesn't support image size control
3. Generation takes 30-60 seconds for complex sites
4. JavaScript-rendered content won't be captured

## Security Considerations
- Never expose API keys in code
- URL validation prevents local/private network access
- All user inputs are validated before processing
- Cache keys use hashed URLs for security

## Performance Tips
- Gemini is faster and cheaper than GPT-Image-1
- Cached images load instantly
- Use "no description" mode for faster generation (roadmap)
- Lazy load non-critical assets like audio

## Testing Commands
When testing, ensure to:
1. Check both providers work (toggle button)
2. Verify caching works (reload same URL)
3. Test partial image streaming
4. Confirm dial-up sound plays/mutes correctly
5. Build succeeds with `pnpm build`

## Common Tasks

### Adding a New Image Provider
1. Create new class extending `ImageProvider` in `image-providers.ts`
2. Implement `generate()` and `generateStream()` methods
3. Register in `ImageProviderFactory`
4. Add provider toggle in UI if needed

### Debugging Streaming Issues
- Check SSE padding is working (2KB padding after partials)
- Verify `runtime = 'nodejs'` in route files
- Check Symbol.asyncIterator handling for TypeScript

### Updating Models
Models are referenced in:
- `describe-html.ts` (GPT-5-nano/mini)
- `validate-url.ts` (GPT-5-nano)
- `image-providers.ts` (GPT-Image-1, Gemini)

## Contact & Support
- Repository: https://github.com/usesquirrel/gpt-browser
- Issues: GitHub Issues
- Main maintainer: Squirrel team