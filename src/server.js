// src/server.js
require("dotenv").config();
const path = require("path");
const express = require("express");

const {
  listAdAccounts,
  listCampaigns,
  listAdSets,
  listAds,
  getAccountInsights,
} = require("./metaAds");

const app = express();
app.use(express.json());

// Serve a interface visual (sem build)
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_, res) => res.json({ ok: true }));

app.get("/adaccounts", async (req, res) => {
  try {
    const data = await listAdAccounts();
    res.json({ data });
  } catch (e) {
    res.status(400).json({ error: e.message, code: e.code, subcode: e.subcode, fbtrace_id: e.fbtrace_id });
  }
});

app.get("/adaccounts/:adAccountId/campaigns", async (req, res) => {
  try {
    const data = await listCampaigns(req.params.adAccountId);
    res.json({ data });
  } catch (e) {
    res.status(400).json({ error: e.message, code: e.code, subcode: e.subcode, fbtrace_id: e.fbtrace_id });
  }
});

app.get("/adaccounts/:adAccountId/adsets", async (req, res) => {
  try {
    const data = await listAdSets(req.params.adAccountId);
    res.json({ data });
  } catch (e) {
    res.status(400).json({ error: e.message, code: e.code, subcode: e.subcode, fbtrace_id: e.fbtrace_id });
  }
});

app.get("/adaccounts/:adAccountId/ads", async (req, res) => {
  try {
    const data = await listAds(req.params.adAccountId);
    res.json({ data });
  } catch (e) {
    res.status(400).json({ error: e.message, code: e.code, subcode: e.subcode, fbtrace_id: e.fbtrace_id });
  }
});

/**
 * Insights:
 * - level=campaign|adset|ad|account
 * - date_preset=last_7d etc
 * - time_increment=1
 * - fields=campo1,campo2...
 * - filtering=<JSON string>
 * - time_range=<JSON string> {"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}
 */
app.get("/adaccounts/:adAccountId/insights", async (req, res) => {
  try {
    const {
      level = "campaign",
      date_preset = "last_7d",
      time_increment,
      fields,
      filtering,
      time_range,
    } = req.query;

    const parsedFiltering = filtering ? JSON.parse(filtering) : undefined;
    const parsedTimeRange = time_range ? JSON.parse(time_range) : undefined;

    const fieldsArr = fields
      ? String(fields).split(",").map(s => s.trim()).filter(Boolean)
      : undefined;

    const data = await getAccountInsights(req.params.adAccountId, {
      level,
      date_preset: parsedTimeRange ? undefined : date_preset,
      time_increment: time_increment ? Number(time_increment) : undefined,
      filtering: parsedFiltering,
      time_range: parsedTimeRange,
      fields: fieldsArr,
    });

    res.json({ data });
  } catch (e) {
    res.status(400).json({ error: e.message, code: e.code, subcode: e.subcode, fbtrace_id: e.fbtrace_id });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Rodando em http://localhost:${port}`));
