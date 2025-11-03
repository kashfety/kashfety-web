// Vercel serverless function wrapper for Express app
// This file should be at the root api/ directory for Vercel to recognize it
// Vercel passes Node.js req/res objects, so we can use Express app directly
let cachedApp = null;

export default async function handler(req, res) {
  // Cache the app to avoid re-importing on every request
  if (!cachedApp) {
    const { default: app } = await import("../Client/Server/server.js");
    cachedApp = app;
  }
  
  // Use Express app directly - Vercel provides Node.js req/res
  return cachedApp(req, res);
}

