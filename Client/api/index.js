// Vercel serverless function wrapper for Express app
export default async function handler(req, res) {
  // Dynamically import the ES module Express app
  const { default: app } = await import("../Server/server.js");
  
  // Return the app handler
  return app(req, res);
}