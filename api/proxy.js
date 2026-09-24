// api/proxy.js — diagnostic version
// Returns detailed errors so we can see what's crashing

const MAILTM_API = "https://api.mail.tm";

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const diagnostics = {
    node_version: process.version,
    method: req.method,
    query: req.query,
    url: req.url,
    has_body: !!req.body,
    body_type: typeof req.body,
    content_type: req.headers["content-type"] || null,
    has_auth: !!req.headers["authorization"],
  };

  try {
    const path = req.query.path || "/";
    const targetUrl = MAILTM_API + path;

    const headers = {};
    if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
    if (req.headers["authorization"]) headers["Authorization"] = req.headers["authorization"];

    const fetchOpts = { method: req.method, headers };

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      let body = req.body;
      if (body && typeof body === "object") {
        body = JSON.stringify(body);
      }
      if (body) fetchOpts.body = body;
    }

    // Test if global fetch exists (Node 18+)
    if (typeof fetch !== "function") {
      res.status(500).json({
        error: "fetch_not_available",
        message: "Global fetch missing. Node version too old.",
        diagnostics
      });
      return;
    }

    const upstream = await fetch(targetUrl, fetchOpts);
    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") || "application/json";

    res.setHeader("Content-Type", ct);
    res.status(upstream.status).send(text);
  } catch (err) {
    res.status(500).json({
      error: "proxy_exception",
      message: err.message,
      stack: (err.stack || "").split("\n").slice(0, 5),
      target: MAILTM_API + (req.query.path || "/"),
      diagnostics
    });
  }
};
