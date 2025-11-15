// Vercel serverless function wrapper for Express app
// This file should be at the root api/ directory for Vercel to recognize it
// Vercel passes Node.js req/res objects, so we can use Express app directly
let cachedApp = null;

export default async function handler(req, res) {
  // Add CORS headers for Vercel serverless function
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://kashfety-web-git-develop-kashfetys-projects.vercel.app',
    'https://kashfety-web.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // Allow all .vercel.app domains and kashfety domains
  if (origin && (origin.endsWith('.vercel.app') || origin.includes('kashfety') || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Cache the app to avoid re-importing on every request
  if (!cachedApp) {
    const { default: app } = await import("../Client/Server/server.js");
    cachedApp = app;
  }
  
  // Use Express app directly - Vercel provides Node.js req/res
  return cachedApp(req, res);
}

