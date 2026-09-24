// api/proxy.js — diagnostic + Node runtime
const MAILTM_API = "https://api.mail.tm";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const path = req.query.path || "/";
    const targetUrl = MAILTM_API + path;

    const headers = {};
    if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
    if (req.headers["authorization"]) headers["Authorization"] = req.headers["authorization"];

    const fetchOptions = { method: req.method, headers };

    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
    }

    if (typeof fetch !== "function") {
      return res.status(500).json({ error: "fetch_unavailable", node: process.version });
    }

    const upstream = await fetch(targetUrl, fetchOptions);
    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") || "application/json";

    res.setHeader("Content-Type", ct);
    return res.status(upstream.status).send(text);
  } catch (err) {
    return res.status(500).json({
      error: "proxy_exception",
      message: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : "").split("\n").slice(0, 6),
      node: process.version,
      path: req.query.path || null,
      method: req.method
    });
  }
};
