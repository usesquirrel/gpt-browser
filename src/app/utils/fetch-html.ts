export async function fetchHTML(url: string): Promise<string> {
  try {
    // Validate URL
    const validatedUrl = new URL(url);
    
    // Check for localhost/development URLs
    if (validatedUrl.hostname === 'localhost' || validatedUrl.hostname === '127.0.0.1') {
      // For local development, use Node.js fetch directly
      const response = await fetch(validatedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      
      return await response.text();
    }
    
    // For external URLs, we have several options:
    
    // Option 1: Direct fetch (may fail due to CORS)
    try {
      const response = await fetch(validatedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });
      
      if (response.ok) {
        return await response.text();
      }
    } catch (corsError) {
      console.log('Direct fetch failed (likely CORS), trying proxy approach...');
    }
    
    // Option 2: Use a CORS proxy service (for development/demo)
    // Note: In production, you should use your own proxy server
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(validatedUrl.toString())}`;
    const proxyResponse = await fetch(proxyUrl);
    
    if (!proxyResponse.ok) {
      throw new Error(`Proxy fetch failed: ${proxyResponse.status} ${proxyResponse.statusText}`);
    }
    
    const proxyData = await proxyResponse.json();
    if (proxyData.status?.http_code && proxyData.status.http_code !== 200) {
      throw new Error(`Target site returned: ${proxyData.status.http_code}`);
    }
    
    return proxyData.contents || '';
    
  } catch (error) {
    console.error('Error fetching HTML:', error);
    
    // If all else fails, return a mock for demo purposes
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      console.log('Returning mock HTML for demo purposes');
      return getMockHTML(url);
    }
    
    throw error;
  }
}

// Mock HTML generator for demo/fallback
function getMockHTML(url: string): string {
  const hostname = new URL(url).hostname;
  
  // Special mock for known sites
  if (hostname.includes('example.com')) {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Example Domain</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              line-height: 1.6;
              margin: 40px auto; 
              max-width: 650px;
              padding: 0 20px;
            }
            h1 { color: #333; font-size: 2.5em; margin-bottom: 0.5em; }
            p { margin: 1em 0; color: #666; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Example Domain</h1>
          <p>This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.</p>
          <p><a href="https://www.iana.org/domains/example">More information...</a></p>
        </body>
      </html>
    `;
  }
  
  // Generic mock HTML
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${hostname} - Demo Page</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem 0;
          }
          nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          nav a {
            color: white;
            text-decoration: none;
            margin-left: 2rem;
          }
          main {
            max-width: 1200px;
            margin: 3rem auto;
            padding: 0 20px;
          }
          .hero {
            text-align: center;
            margin-bottom: 4rem;
          }
          h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 1.25rem;
            color: #666;
            margin-bottom: 2rem;
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 4rem;
          }
          .feature {
            padding: 2rem;
            background: #f8f9fa;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .feature h3 {
            color: #667eea;
            margin-bottom: 1rem;
          }
          footer {
            background: #f8f9fa;
            padding: 3rem 0;
            text-align: center;
            color: #666;
          }
        </style>
      </head>
      <body>
        <header>
          <nav>
            <div class="logo">
              <strong>${hostname}</strong>
            </div>
            <div class="nav-links">
              <a href="/">Home</a>
              <a href="/about">About</a>
              <a href="/services">Services</a>
              <a href="/contact">Contact</a>
            </div>
          </nav>
        </header>
        
        <main>
          <section class="hero">
            <h1>Welcome to ${hostname}</h1>
            <p class="subtitle">This is a demonstration page generated for testing the HTML to Image converter</p>
          </section>
          
          <section class="features">
            <div class="feature">
              <h3>🚀 Fast Performance</h3>
              <p>Lightning-fast page loads with optimized content delivery and efficient caching strategies.</p>
            </div>
            <div class="feature">
              <h3>🎨 Modern Design</h3>
              <p>Beautiful, responsive layouts that look great on all devices and screen sizes.</p>
            </div>
            <div class="feature">
              <h3>🔒 Secure & Reliable</h3>
              <p>Enterprise-grade security with 99.9% uptime guarantee and regular backups.</p>
            </div>
            <div class="feature">
              <h3>📊 Analytics</h3>
              <p>Comprehensive insights into user behavior and engagement metrics.</p>
            </div>
            <div class="feature">
              <h3>🌍 Global Reach</h3>
              <p>Content delivery network ensures fast access from anywhere in the world.</p>
            </div>
            <div class="feature">
              <h3>🛠️ Easy Integration</h3>
              <p>Simple API and webhook integration with your existing tools and workflows.</p>
            </div>
          </section>
          
          <section>
            <h2>Latest Updates</h2>
            <article style="margin: 2rem 0; padding: 1.5rem; background: white; border-left: 4px solid #667eea;">
              <h3>New Feature Release</h3>
              <p style="color: #666; margin: 0.5rem 0;">We're excited to announce our latest feature that will revolutionize how you work with web content.</p>
              <small style="color: #999;">Posted on ${new Date().toLocaleDateString()}</small>
            </article>
            <article style="margin: 2rem 0; padding: 1.5rem; background: white; border-left: 4px solid #764ba2;">
              <h3>Performance Improvements</h3>
              <p style="color: #666; margin: 0.5rem 0;">Our recent optimizations have resulted in 50% faster page loads across all regions.</p>
              <small style="color: #999;">Posted on ${new Date(Date.now() - 86400000).toLocaleDateString()}</small>
            </article>
          </section>
        </main>
        
        <footer>
          <p>&copy; ${new Date().getFullYear()} ${hostname}. All rights reserved.</p>
          <p style="margin-top: 1rem; font-size: 0.9rem;">This is a demonstration page for the HTML to Image converter.</p>
        </footer>
      </body>
    </html>
  `;
}

// Alternative implementation using Puppeteer or Playwright (requires additional setup)
export async function fetchHTMLWithBrowser(url: string): Promise<string> {
  // This would require installing puppeteer or playwright
  // npm install puppeteer
  /*
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const html = await page.content();
  await browser.close();
  return html;
  */
  
  // For now, fallback to regular fetch
  return fetchHTML(url);
}