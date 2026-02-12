# Meta Ads Explorer (Meta Ads API v24.0) — Node + UI (1 pasta)

Projeto em **Node.js + Express** que consome a **Meta Ads API (Graph API)** usando **apenas um `META_ACCESS_TOKEN`**, com uma **interface visual** (HTML/JS/CSS) servida pelo próprio backend.

A UI permite:
- Selecionar **conta de anúncio**
- Consultar **Campanhas / AdSets / Ads / Insights**
- Aplicar filtros básicos (level, período, time_increment, status)
- Exportar **CSV/JSON**
- Atualizar o **META_ACCESS_TOKEN** pela própria interface (⚙️) e (opcionalmente) **persistir no `.env`**

---

## Requisitos

- **Node.js 18+** (recomendado, já vem com `fetch` nativo)
- Um **Access Token** com permissões adequadas para Ads:
  - `ads_read`
  - `read_insights` (para endpoints de insights)

> Se você estiver em Node < 18, instale `node-fetch` e use o fallback no `src/metaGraph.js`.

---

## Estrutura do projeto
```
meta-api/
├── .env
├── package.json
├── src/
│   ├── metaGraph.js
│   ├── metaAds.js
│   ├── tokenStore.js
│   └── server.js
└── public/
    ├── index.html
    ├── app.js
    └── styles.css
```

---

## Instalação

Na raiz do projeto:
```bash
npm install
```

Crie o arquivo `.env`:
```env
META_ACCESS_TOKEN=SEU_TOKEN_AQUI
META_API_VERSION=v24.0
PORT=3000
```

## Rodar o projeto
```bash
npm start
```

Acesse:
- **UI**: http://localhost:3000
- **Health**: http://localhost:3000/health

---

## Interface (UI)

Na UI você encontra:

- **Dropdown** para escolher a conta
- **"Tipo de busca"**:
  - Insights
  - Campanhas
  - AdSets
  - Ads

Para **Insights**, filtros:
- `level` (campaign/adset/ad/account)
- `date_preset` (last_7d, last_30d, etc)
- `time_range` (since/until)
- `time_increment` (1 diário / 7 semanal)
- `effective_status` (ACTIVE/PAUSED/ARCHIVED)
- `fields` (campos do insight)
- `action_type` para calcular:
  - `qualified_leads`
  - `cpl_qualified`

### Atualizar Token pela UI (⚙️)

1. Clique no botão **⚙️**
2. Cole o novo token
3. (Opcional) marque **Salvar no .env**
4. Salve

Isso atualiza o token em tempo real sem precisar editar `.env` na mão.

---

## Endpoints disponíveis (API)

### Health
```
GET /health
```

Resposta:
```json
{ "ok": true }
```

### Ad Accounts
```
GET /adaccounts
```

Retorna as contas do usuário autenticado.

### Estrutura
```
GET /adaccounts/:adAccountId/campaigns
GET /adaccounts/:adAccountId/adsets
GET /adaccounts/:adAccountId/ads
```

### Insights
```
GET /adaccounts/:adAccountId/insights
```

Query params principais:
- `level` = campaign | adset | ad | account
- `date_preset` = last_7d, last_30d, etc
- `time_range` = JSON string `{"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}`
- `time_increment` = 1, 7, ...
- `fields` = "campo1,campo2,..."
- `filtering` = JSON string (ex.: filtro por ad.effective_status)

Exemplo:
```bash
curl "http://localhost:3000/adaccounts/123456789/insights?level=campaign&date_preset=last_7d&time_increment=1"
```

### Config de Token

**GET /config**  
Retorna se há token e uma versão mascarada.

**POST /config/token**  
Atualiza o token.

Body:
```json
{
  "token": "NOVO_TOKEN",
  "persist": true
}
```

`persist=true` tenta sobrescrever/atualizar a linha `META_ACCESS_TOKEN=` no `.env`.

---

## Observações importantes

### Segurança

- Este projeto foi pensado para uso local (localhost).
- Se você publicar isso em servidor:
  - Proteja `POST /config/token` com autenticação (senha, JWT, IP allowlist, etc.)
  - Restrinja origens (CORS) e acesso à UI
  - Não exponha `.env` nem logs com token

### Sobre expiração do token

- Tokens podem expirar dependendo do tipo (short-lived vs long-lived) e configurações do app.
- A UI facilita trocar o token sem mexer no `.env`.

### Permissões

Se alguma rota falhar, normalmente é:
- Token inválido/expirado
- Falta de `ads_read` / `read_insights`
- Usuário sem acesso à conta de anúncio
- Rate limit (o client tem retry simples para rate limit)

---

## Troubleshooting

### Insights vazio

- Troque `level` (campaign/adset/ad)
- Troque `date_preset` (last_7d → last_30d)
- Teste `time_range` com datas válidas
- Verifique se há gasto/campanhas no período

### Erro de permissão

- Confirme que o token tem `ads_read` e `read_insights`
- Confirme que o usuário do token tem acesso ao ad account

### Node < 18 (sem fetch)

Instale:
```bash
npm i node-fetch
```

E use o fallback no `src/metaGraph.js` conforme implementado no projeto.

---

## Customizações rápidas

- Ajustar `DEFAULT_FIELDS` em `public/app.js`
- Adicionar novos filtros no front e repassar via querystring para `/insights`
- Criar "presets" (Fase 1/2/3 do funil) setando automaticamente:
  - `action_type`
  - `fields`
  - `filtering`
  - `level`

---

## Licença

Uso interno / conforme necessidade do seu projeto.