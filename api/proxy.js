// api/proxy.js — Vercel Serverless Function (Node.js runtime)
// Proxy to mail.tm to bypass browser CORS

export const config = {
  runtime: 'nodejs',
};

const MAILTM_API = "https://api.mail.tm";

export default async function handler(req, res) {
  // CORS headers — allow browser to call us
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Extract mail.tm path from query string
  const path = req.query.path || "/";
  const targetUrl = MAILTM_API + path;

  // Build fetch options
  const fetchOpts = {
    method: req.method,
    headers: {},
  };

  // Forward content-type
  if (req.headers["content-type"]) {
    fetchOpts.headers["Content-Type"] = req.headers["content-type"];
  }

  // Forward auth header
  if (req.headers["authorization"]) {
    fetchOpts.headers["Authorization"] = req.headers["authorization"];
  }

  // Read raw body for POST/PUT/PATCH
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    try {
      const rawBody = await readRawBody(req);
      if (rawBody && rawBody.length > 0) {
        fetchOpts.body = rawBody;
      }
    } catch (e) {
      res.status(400).json({ error: "Failed to read body", message: e.message });
      return;
    }
  }

  try {
    const upstream = await fetch(targetUrl, fetchOpts);
    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    res.setHeader("Content-Type", contentType);
    res.status(upstream.status).send(text);
  } catch (err) {
    res.status(500).json({
      error: "Proxy failed",
      message: err.message,
      target: targetUrl,
      method: req.method,
    });
  }
}

// Read raw request body from Node request stream
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    // If Vercel already parsed it, use that
    if (req.body) {
      if (typeof req.body === "string") return resolve(req.body);
      if (typeof req.body === "object") return resolve(JSON.stringify(req.body));
    }

    let data = "";
    req.on("data", chunk => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", err => reject(err));
  });
}
