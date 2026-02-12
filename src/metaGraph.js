// src/metaGraph.js
require("dotenv").config();

const DEFAULT_VERSION = process.env.META_API_VERSION || "v24.0";
const BASE_URL = `https://graph.facebook.com/${DEFAULT_VERSION}`;

const tokenStore = require("./tokenStore");

// src/metaGraph.js (no topo)
const fetchFn = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : (...args) => import("node-fetch").then(({ default: f }) => f(...args));


function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Converte objetos/arrays em JSON string para parâmetros tipo filtering/time_range
function normalizeParams(params = {}) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object") out[k] = JSON.stringify(v);
    else out[k] = String(v);
  }
  return out;
}

function buildUrl(path, params) {
  const url = new URL(`${BASE_URL}${path}`);
  const usp = new URLSearchParams(normalizeParams(params));
  url.search = usp.toString();
  return url.toString();
}

function parseGraphError(payload) {
  const err = payload?.error;
  if (!err) return null;
  const e = new Error(err.message || "Graph API error");
  e.code = err.code;
  e.subcode = err.error_subcode;
  e.type = err.type;
  e.fbtrace_id = err.fbtrace_id;
  return e;
}

/**
 * GET no Graph API com retry simples para rate limit (code 80004 ou 17)
 */
async function graphGet(path, params = {}, opts = {}) {
  const token = opts.accessToken || tokenStore.getToken();
  if (!token) throw new Error("META_ACCESS_TOKEN não definido (use a engrenagem na UI).");

  const maxRetries = opts.maxRetries ?? 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const url = buildUrl(path, { ...params, access_token: token });

    const res = await fetchFn(url, { method: "GET" });
    const payload = await res.json().catch(() => ({}));

    const graphErr = parseGraphError(payload);
    if (!graphErr && res.ok) return payload;

    // Retry em rate limit
    const isRateLimit = graphErr && (graphErr.code === 80004 || graphErr.code === 17);
    if (isRateLimit && attempt < maxRetries) {
      const backoff = 400 * Math.pow(2, attempt); // 400, 800, 1600...
      await sleep(backoff);
      continue;
    }

    // Outros erros: estoura
    throw graphErr || new Error(`HTTP ${res.status}: ${JSON.stringify(payload)}`);
  }
}

/**
 * Paginação por cursor "after"
 */
async function graphGetAll(path, params = {}, opts = {}) {
  const limit = opts.limit ?? 100; // page size
  const maxPages = opts.maxPages ?? 50;

  let after = undefined;
  let page = 0;
  const all = [];

  while (page < maxPages) {
    const payload = await graphGet(path, { ...params, limit, after }, opts);
    const data = payload?.data || [];
    all.push(...data);

    after = payload?.paging?.cursors?.after;
    if (!after) break;
    page++;
  }

  return all;
}

module.exports = { graphGet, graphGetAll };
