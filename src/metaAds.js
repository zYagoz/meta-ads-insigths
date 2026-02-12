// src/metaAds.js
const { graphGetAll, graphGet } = require("./metaGraph");

function normalizeActId(adAccountId) {
  // aceita "123" ou "act_123"
  if (!adAccountId) throw new Error("adAccountId é obrigatório");
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

function actionValue(actions = [], actionType) {
  const found = actions.find((a) => a.action_type === actionType);
  if (!found) return 0;
  const n = Number(found.value);
  return Number.isFinite(n) ? n : 0;
}

async function listAdAccounts(fields = ["name", "account_id", "account_status", "currency", "id"]) {
  return graphGetAll("/me/adaccounts", { fields: fields.join(",") });
}

async function listCampaigns(adAccountId, fields = ["id", "name", "objective", "status", "effective_status"]) {
  const act = normalizeActId(adAccountId);
  return graphGetAll(`/${act}/campaigns`, { fields: fields.join(",") });
}

async function listAdSets(adAccountId, fields = ["id", "name", "status", "effective_status", "campaign_id", "daily_budget"]) {
  const act = normalizeActId(adAccountId);
  return graphGetAll(`/${act}/adsets`, { fields: fields.join(",") });
}

async function listAds(adAccountId, fields = ["id", "name", "status", "effective_status", "campaign_id", "adset_id"]) {
  const act = normalizeActId(adAccountId);
  return graphGetAll(`/${act}/ads`, { fields: fields.join(",") });
}

/**
 * Insights no nível de conta:
 * endpoint: /act_{id}/insights :contentReference[oaicite:1]{index=1}
 */
async function getAccountInsights(adAccountId, {
  level = "campaign",
  fields = [
    "campaign_name",
    "adset_name",
    "ad_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "actions",
    "cost_per_action_type",
    "date_start",
    "date_stop"
  ],
  date_preset = "last_7d",
  time_increment, // 1 = diário
  filtering,
  time_range
} = {}) {
  const act = normalizeActId(adAccountId);

  const params = {
    level,
    fields: fields.join(","),
    date_preset,
    time_increment,
    filtering,   // array de objetos -> será JSON.stringified no client
    time_range,  // objeto -> será JSON.stringified no client
  };

  return graphGetAll(`/${act}/insights`, params, { maxPages: 200 });
}

/**
 * Insights de um objeto específico (campaign/adset/ad):
 * endpoint: /{id}/insights :contentReference[oaicite:2]{index=2}
 */
async function getEntityInsights(entityId, params = {}) {
  if (!entityId) throw new Error("entityId é obrigatório");
  const fields = params.fields || ["spend", "impressions", "clicks", "actions", "date_start", "date_stop"];
  const payload = await graphGetAll(`/${entityId}/insights`, {
    ...params,
    fields: Array.isArray(fields) ? fields.join(",") : fields
  });
  return payload;
}

module.exports = {
  listAdAccounts,
  listCampaigns,
  listAdSets,
  listAds,
  getAccountInsights,
  getEntityInsights,
  actionValue,
};
