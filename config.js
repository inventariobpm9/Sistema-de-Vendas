// =============================================================================
//  config.js — SISTEMA DE CESTAS DIA DAS MÃES v4.0
//  GitHub Pages + Google Apps Script
//
//  ✅ A URL do Apps Script fica em api-url.json (na mesma pasta).
//  ✅ Quando reimplantar o Apps Script, atualize SOMENTE o api-url.json.
//  ✅ Nunca commite tokens, senhas ou credenciais neste arquivo.
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────────────────────
const CESTAS_CONFIG = {
  // URL lida dinamicamente de api-url.json — não mude aqui
  API_URL:    null,
  TIMEOUT_MS: 30000,
  VERSION:    '4.0.0',
  // Caminho do arquivo com a URL (relativo ao HTML que carrega config.js)
  URL_FILE:   'api-url.json'
};

// ─────────────────────────────────────────────────────────────────────────────
//  CARREGA A URL DO APPS SCRIPT DE api-url.json
//  Retorna Promise<string> com a URL pronta.
//  Resultado é cacheado na sessão para não re-buscar a cada chamada.
// ─────────────────────────────────────────────────────────────────────────────
let _apiUrlCache = null;

async function _obterApiUrl() {
  if (_apiUrlCache) return _apiUrlCache;

  // Tenta usar sessionStorage para não re-buscar durante a mesma sessão
  try {
    const salva = sessionStorage.getItem('_cestas_api_url');
    if (salva && salva.startsWith('https://script.google.com')) {
      _apiUrlCache = salva;
      return _apiUrlCache;
    }
  } catch(_) {}

  // Busca o arquivo api-url.json com cache-busting para sempre pegar a versão mais recente
  const resp = await fetch(CESTAS_CONFIG.URL_FILE + '?v=' + Date.now(), {
    cache: 'no-store'
  });

  if (!resp.ok) {
    throw new Error(
      'Arquivo api-url.json não encontrado.\n' +
      'Verifique se o arquivo existe na raiz do repositório GitHub.'
    );
  }

  const json = await resp.json();

  if (!json.url || json.url === 'COLE_AQUI_A_URL_DO_APPS_SCRIPT') {
    throw new Error(
      'api-url.json não está configurado!\n\n' +
      'Edite o arquivo api-url.json e cole a URL do seu Apps Script:\n' +
      '{ "url": "https://script.google.com/macros/s/SEU_ID/exec" }'
    );
  }

  _apiUrlCache = json.url;

  try { sessionStorage.setItem('_cestas_api_url', _apiUrlCache); } catch(_) {}

  return _apiUrlCache;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CAMADA DE API
// ─────────────────────────────────────────────────────────────────────────────
const cestasApi = {

  // Limpa o cache da URL (útil ao trocar de implantação sem recarregar a página)
  limparCacheUrl() {
    _apiUrlCache = null;
    try { sessionStorage.removeItem('_cestas_api_url'); } catch(_) {}
  },

  async _call(acao, payload = {}) {
    const url = await _obterApiUrl();

    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CESTAS_CONFIG.TIMEOUT_MS);

    try {
      const resp = await fetch(url, {
        method:   'POST',
        body:     JSON.stringify({ acao, ...payload }),
        headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
        signal:   ctrl.signal,
        redirect: 'follow',
      });

      // Lê como texto — o Apps Script às vezes retorna HTML de erro com HTTP 200
      const text = await resp.text();

      // Se veio HTML (página de login ou erro do Google) avisa de forma clara
      if (text.trimStart().startsWith('<')) {
        console.error('[cestasApi] Resposta HTML recebida (não é JSON):', text.substring(0, 400));
        throw new Error(
          'O Apps Script retornou uma página HTML em vez de JSON.\n\n' +
          'Verifique:\n' +
          '1. Apps Script → Implantar → quem tem acesso = "Qualquer pessoa"\n' +
          '2. A URL em api-url.json é a correta (termina em /exec)\n' +
          '3. O script foi reimplantado como NOVA VERSÃO após edições'
        );
      }

      try {
        return JSON.parse(text);
      } catch (_) {
        console.error('[cestasApi] Resposta não-JSON:', text.substring(0, 400));
        throw new Error('Resposta inválida da API: ' + text.substring(0, 120));
      }

    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error(
          'Tempo limite esgotado (' + (CESTAS_CONFIG.TIMEOUT_MS / 1000) + 's).\n' +
          'O Apps Script pode estar demorando. Tente novamente.'
        );
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },

  // ── DADOS ──────────────────────────────────────────────────────────────────
  carregarDados: ()                             => cestasApi._call('carregarDados'),

  // ── PRODUTOS ───────────────────────────────────────────────────────────────
  cadastrarProduto: (dados)                     => cestasApi._call('cadastrarProduto',    { dados }),
  excluirProduto:   (id)                        => cestasApi._call('excluirProduto',       { id }),

  // ── CESTAS ─────────────────────────────────────────────────────────────────
  criarCesta:           (dados)                 => cestasApi._call('criarCesta',           { dados }),
  excluirCesta:         (numero)                => cestasApi._call('excluirCesta',          { numero }),
  addItemCesta:         (dados)                 => cestasApi._call('addItemCesta',          { dados }),
  removerItemCesta:     (numeroCesta, nomeProd) => cestasApi._call('removerItemCesta',      { numeroCesta, nomeProduto: nomeProd }),
  atualizarMargemCesta: (numero, margem)        => cestasApi._call('atualizarMargemCesta',  { numero, margem }),
  atualizarFotoCesta:   (numero, fotoUrl)       => cestasApi._call('atualizarFotoCesta',    { numero, fotoUrl }),

  // ── VENDAS ─────────────────────────────────────────────────────────────────
  registrarVenda: (dados)                       => cestasApi._call('registrarVenda',       { dados }),
  excluirVenda:   (id)                          => cestasApi._call('excluirVenda',          { id }),
};
