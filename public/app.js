const $ = (id) => document.getElementById(id);

const state = {
  mode: "insights",
  accounts: [],
  rows: [],
};

const DEFAULT_FIELDS =
  "campaign_name,adset_name,ad_name,spend,impressions,clicks,ctr,cpc,actions,cost_per_action_type,date_start,date_stop";

function setLoading(isLoading) {
  $("btnRun").disabled = isLoading;
  $("btnRun").textContent = isLoading ? "Carregando..." : "Buscar";
}

function showError(msg, details) {
  const box = $("errorBox");
  box.style.display = "block";
  box.innerHTML = `<b>Erro:</b> ${escapeHtml(msg)}${
    details ? `<pre>${escapeHtml(JSON.stringify(details, null, 2))}</pre>` : ""
  }`;
}

function clearError() {
  const box = $("errorBox");
  box.style.display = "none";
  box.innerHTML = "";
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[m]));
}

async function apiGet(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.details = data;
    throw err;
  }
  return data;
}

function qs(params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

function actionValue(actions, actionType) {
  if (!Array.isArray(actions) || !actionType) return 0;
  const found = actions.find(a => a?.action_type === actionType);
  const n = Number(found?.value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function costPerAction(costs, actionType) {
  if (!Array.isArray(costs) || !actionType) return 0;
  const found = costs.find(a => a?.action_type === actionType);
  const n = Number(found?.value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function flattenRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    if (Array.isArray(v)) out[k] = JSON.stringify(v);
    else if (v && typeof v === "object") out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

function toCSV(rows) {
  if (!rows?.length) return "";
  const cols = Array.from(rows.reduce((s, r) => (Object.keys(r).forEach(k => s.add(k)), s), new Set()));
  const esc = (x) => {
    const str = String(x ?? "");
    return /[,"\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
  };
  return [
    cols.map(esc).join(","),
    ...rows.map(r => cols.map(c => esc(r[c])).join(",")),
  ].join("\n");
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function renderTable(rows) {
  const thead = $("thead");
  const tbody = $("tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  $("count").textContent = String(rows.length);
  $("btnJson").disabled = rows.length === 0;
  $("btnCsv").disabled = rows.length === 0;

  if (!rows.length) return;

  const flat = rows.map(flattenRow);
  const cols = Object.keys(flat[0] || {});

  const trh = document.createElement("tr");
  cols.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c;
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  flat.forEach(r => {
    const tr = document.createElement("tr");
    cols.forEach(c => {
      const td = document.createElement("td");
      td.textContent = String(r[c] ?? "");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  $("insightsBox").style.display = mode === "insights" ? "grid" : "none";
}

async function loadAccounts() {
  const { data } = await apiGet("/adaccounts");
  state.accounts = data || [];

  const sel = $("selAccount");
  sel.innerHTML = "";
  state.accounts.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.account_id || a.id;
    opt.textContent = `${a.name} (${a.account_id || a.id})`;
    sel.appendChild(opt);
  });

  const first = state.accounts?.[0]?.account_id || state.accounts?.[0]?.id;
  if (first) sel.value = first;

  updateAccountHint();
}

function updateAccountHint() {
  const id = $("selAccount").value;
  const a = state.accounts.find(x => (x.account_id || x.id) === id);
  $("accountHint").textContent = a ? `Selecionado: ${a.name} (${a.account_id || a.id})` : "";
}

async function run() {
  clearError();
  setLoading(true);
  state.rows = [];
  renderTable([]);

  try {
    const adAccountId = $("selAccount").value;
    if (!adAccountId) throw new Error("Selecione uma conta.");

    if (state.mode === "campaigns") {
      const { data } = await apiGet(`/adaccounts/${encodeURIComponent(adAccountId)}/campaigns`);
      state.rows = data || [];
    } else if (state.mode === "adsets") {
      const { data } = await apiGet(`/adaccounts/${encodeURIComponent(adAccountId)}/adsets`);
      state.rows = data || [];
    } else if (state.mode === "ads") {
      const { data } = await apiGet(`/adaccounts/${encodeURIComponent(adAccountId)}/ads`);
      state.rows = data || [];
    } else {
      const level = $("selLevel").value;
      const preset = $("selPreset").value;
      const increment = $("selIncrement").value;
      const status = $("selStatus").value;
      const fields = $("inpFields").value.trim();
      const since = $("inpSince").value.trim();
      const until = $("inpUntil").value.trim();
      const actionType = $("inpActionType").value.trim();

      const params = {
        level,
        time_increment: increment,
        fields: fields || DEFAULT_FIELDS,
      };

      if (since && until) {
        params.time_range = JSON.stringify({ since, until });
      } else {
        params.date_preset = preset;
      }

      if (status) {
        params.filtering = JSON.stringify([
          { field: "ad.effective_status", operator: "IN", value: [status] },
        ]);
      }

      const { data } = await apiGet(`/adaccounts/${encodeURIComponent(adAccountId)}/insights${qs(params)}`);

      const enriched = (data || []).map(r => {
        const q = actionValue(r.actions, actionType);
        const c = costPerAction(r.cost_per_action_type, actionType);
        return { ...r, qualified_leads: q, cpl_qualified: c };
      });

      state.rows = enriched;
    }

    renderTable(state.rows);
  } catch (e) {
    showError(e.message, e.details);
  } finally {
    setLoading(false);
  }
}

function wire() {
  $("btnRun").addEventListener("click", run);
  $("selAccount").addEventListener("change", updateAccountHint);

  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("btnJson").addEventListener("click", () => {
    downloadText(`export-${state.mode}.json`, JSON.stringify(state.rows, null, 2), "application/json");
  });

  $("btnCsv").addEventListener("click", () => {
    const flat = state.rows.map(flattenRow);
    downloadText(`export-${state.mode}.csv`, toCSV(flat), "text/csv");
  });

  $("inpFields").value = DEFAULT_FIELDS;
  $("inpActionType").value = "complete_registration";
}

(async function init() {
  wire();
  setMode("insights");
  try {
    setLoading(true);
    await loadAccounts();
  } catch (e) {
    showError(e.message, e.details);
  } finally {
    setLoading(false);
  }
})();
