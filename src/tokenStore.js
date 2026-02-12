// src/tokenStore.js
let token = process.env.META_ACCESS_TOKEN || "";

function getToken() {
  return token;
}

function setToken(newToken) {
  token = String(newToken || "").trim();
  // mantém compatibilidade com o resto do código
  process.env.META_ACCESS_TOKEN = token;
}

function hasToken() {
  return Boolean(token && token.length > 20);
}

function maskedToken() {
  if (!token) return "";
  const last = token.slice(-6);
  return `***${last}`;
}

module.exports = { getToken, setToken, hasToken, maskedToken };
