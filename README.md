# GPT Browser

An AI-powered web browser that generates visual representations of websites using GPT-Image models. The application fetches HTML content from URLs and creates screenshot-like images showing what the websites would look like when rendered.

## Features

- 🎨 **AI-Generated Website Visualizations**: Creates realistic website screenshots using GPT-Image-1
- 🖥️ **Desktop UI Simulation**: Displays results in a simulated desktop environment with browser chrome  
- ⚡ **Real-time Streaming**: Shows partial images as they're generated for better UX
- 🔄 **Smart Caching**: Uses Vercel Blob storage to cache generated images for faster repeat visits
- 🛡️ **URL Validation**: AI-powered safety checking before processing URLs
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Architecture

The app processes URLs through several steps:
1. **Cache Check**: First checks if we already have an image for this URL
2. **URL Validation**: AI validates the URL for safety and content appropriateness
3. **HTML Fetching**: Retrieves and processes the website's HTML content
4. **Content Analysis**: AI analyzes the HTML to understand the visual structure
5. **Image Generation**: Creates a visual representation using GPT-Image-1
6. **Caching**: Stores the result in Vercel Blob storage for future use

## Setup

First, copy the environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
- `OPENAI_API_KEY`: Your OpenAI API key (get from https://platform.openai.com/api-keys)
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob storage token (get from https://vercel.com/dashboard/stores)

Then run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. Enter any website URL in the browser address bar
2. Click "Go" or press Enter
3. The app will check its cache first - if found, the image loads instantly
4. If not cached, it will generate a new visualization and cache it for next time
5. Watch as partial images appear during generation for real-time feedback

## Caching System

The app uses Vercel Blob storage to cache generated images:

- **Cache Keys**: Generated using SHA-256 hash of the URL for consistency
- **Storage**: Images stored as binary data, metadata as JSON
- **Performance**: Cache hits return results instantly (< 100ms vs 10-30s generation)
- **Persistence**: Cached images persist across deployments and sessions

## Observability & Analytics

The app includes comprehensive observability powered by PostHog:

### Web Analytics
- **User Interactions**: Page views, button clicks, navigation events
- **Performance Metrics**: Image generation completion rates, cache hit rates
- **Error Tracking**: Failed generations, validation errors

### LLM Observability  
- **Token Usage**: Prompt/completion tokens for all AI operations with automatic cost calculation
- **Latency Tracking**: Response times for each AI model call
- **Cost Monitoring**: Real-time cost tracking with current OpenAI pricing (GPT-5-nano: $0.075/$0.30, GPT-5-mini: $0.15/$0.60 per 1M tokens)
- **Error Rates**: Success/failure rates for each AI operation with detailed error messages
- **Model Performance**: Comprehensive tracking across GPT-5-nano, GPT-5-mini, and GPT-Image-1
- **Trace Correlation**: Unique trace IDs link related operations across the pipeline
- **Content Analysis**: Input/output length tracking with content previews (PII-safe)

### Tracked Operations
- `html_cleaning`: GPT-5-nano cleaning raw HTML
- `html_description`: GPT-5-mini generating image prompts from HTML
- `image_generation`: GPT-Image-1 creating website visualizations

All events include trace IDs for correlation and detailed metadata for analysis.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
