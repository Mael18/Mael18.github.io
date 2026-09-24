// api/proxy.js — Vercel Serverless Function
// Acts as a server-side proxy to mail.tm
// No CORS because server-to-server

const MAILTM_API = "https://api.mail.tm";

export default async function handler(req, res) {
  // Set CORS headers so the frontend can call us freely
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Extract the mail.tm path from the query string
  // Example: /api/proxy?path=/domains
  // Example: /api/proxy?path=/messages&method=GET
  const path = req.query.path || "/";
  const targetUrl = MAILTM_API + path;

  // Build fetch options
  const fetchOpts = {
    method: req.method,
    headers: {},
  };

  // Forward content-type if present
  if (req.headers["content-type"]) {
    fetchOpts.headers["Content-Type"] = req.headers["content-type"];
  }

  // Forward authorization header (needed for mail.tm Bearer token)
  if (req.headers["authorization"]) {
    fetchOpts.headers["Authorization"] = req.headers["authorization"];
  }

  // Forward POST body if present
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    // Vercel parses JSON body automatically when Content-Type is application/json
    if (req.body) {
      fetchOpts.body = typeof req.body === "string" 
        ? req.body 
        : JSON.stringify(req.body);
    }
  }

  try {
    const upstream = await fetch(targetUrl, fetchOpts);
    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();

    // Set response content type
    res.setHeader("Content-Type", contentType || "application/json");
    res.status(upstream.status).send(text);
  } catch (err) {
    res.status(500).json({
      error: "Proxy failed",
      message: err.message,
      target: targetUrl,
    });
  }
}
