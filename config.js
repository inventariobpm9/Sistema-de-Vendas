// =============================================================================
//  config.js — SISTEMA DE CESTAS DIA DAS MÃES
//  GitHub Pages
//
//  ⚠️  Após reimplantar o Apps Script, atualize apenas o API_URL abaixo.
//  ⚠️  Nunca commite tokens, senhas ou credenciais neste arquivo.
// =============================================================================

const CESTAS_CONFIG = {
  // 👇 Cole aqui a URL do seu Apps Script após publicar como "Aplicativo da Web"
  API_URL:   'https://script.google.com/macros/s/AKfycbye3EHth0vzIfXx3K-5ec9MXV42XXHNs1XQbqHdjlAYm46FOZNn2l7sOg7xjCak867Crg/exec',
  TIMEOUT_MS: 20000,   // 20 s — GAS pode ser lento
  VERSION:   '1.0.0'
};

// =============================================================================
//  CAMADA DE API
//  Envia { acao, ...args } via POST com Content-Type: text/plain
//  (evita preflight CORS — requisito obrigatório para o Apps Script)
// =============================================================================
const cestasApi = {

  async _call(acao, payload = {}) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CESTAS_CONFIG.TIMEOUT_MS);
    try {
      const resp = await fetch(CESTAS_CONFIG.API_URL, {
        method:  'POST',
        body:    JSON.stringify({ acao, ...payload }),
        headers: { 'Content-Type': 'text/plain' },
        signal:  ctrl.signal
      });
      if (!resp.ok) throw new Error(`Servidor retornou HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Tempo limite esgotado. Tente novamente.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },

  // ── DADOS ─────────────────────────────────────────────────────────────────
  carregarDados: ()                         => cestasApi._call('carregarDados'),

  // ── PRODUTOS ──────────────────────────────────────────────────────────────
  cadastrarProduto: (dados)                 => cestasApi._call('cadastrarProduto',   { dados }),
  excluirProduto:   (id)                    => cestasApi._call('excluirProduto',      { id }),

  // ── MODELOS ───────────────────────────────────────────────────────────────
  cadastrarModelo:  (dados)                 => cestasApi._call('cadastrarModelo',    { dados }),
  excluirModelo:    (nome)                  => cestasApi._call('excluirModelo',       { nome }),

  // ── COMPOSIÇÃO ────────────────────────────────────────────────────────────
  addItemComposicao:    (dados)             => cestasApi._call('addItemComposicao',  { dados }),
  removerItemComposicao:(nomeCesta, nomeProduto) => cestasApi._call('removerItemComposicao', { nomeCesta, nomeProduto }),

  // ── VENDAS ────────────────────────────────────────────────────────────────
  registrarVenda: (dados)                   => cestasApi._call('registrarVenda',     { dados }),
  excluirVenda:   (id)                      => cestasApi._call('excluirVenda',        { id }),
};
