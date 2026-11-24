// Sincronização do NoSkip com o Supabase: login por e-mail e senha e cópia dos dados na nuvem.
// Mesmo projeto do Ice Cream Lab (mesma conta), mas tabela própria: "noskip_registros".
// Sem bibliotecas: fala direto com a API do Supabase (auth e REST).
//
// Como funciona:
// - Cada meta e cada treino é um registro; os ajustes e os marcos vistos são um registro cada.
// - O app lembra como cada item estava na última sincronização. O que mudou desde então sobe;
//   o que chegou de outro aparelho desce. Se o mesmo item mudou dos dois lados, vale o mais recente.
// - Sem internet, nada se perde: as mudanças ficam no aparelho e sobem quando a conexão voltar.
import { estado, salvarLocal, aoSalvar, limparLocal } from "./dados.js?v=20261124193100";

const URL_SUPABASE = "https://bigruncntcxnckcttjuw.supabase.co";
const CHAVE_PUBLICA = "sb_publishable_Mff_WvrBX1Qgyvbx0jn8eA_YsDL78KI"; // pública de propósito; a tabela é protegida por RLS
const TABELA = "noskip_registros";
const CHAVE_SESSAO = "noskip-sessao";
const CHAVE_SYNC = "noskip-sync";
const LISTAS = ["metas", "treinos"];          // itens com id
const UNICOS = { ajustes: "ajustes", marcos: "marcosVistos" }; // um registro cada (id "atual")

let sessao = ler(CHAVE_SESSAO);
let sync = ler(CHAVE_SYNC) || novoSync();
const ouvintes = [];
let temporizador = null, emAndamento = false;

function ler(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function grava(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function novoSync() { return { cursor: null, conhecido: {}, editado: {}, ultima: null, erro: null, usuario: null }; }

// ---------- situação (para a tela de entrada e os Ajustes) ----------
export function situacao() {
  return { logado: !!sessao, email: sessao && sessao.user && sessao.user.email, ultima: sync.ultima, erro: sync.erro,
    sincronizando: emAndamento, online: navigator.onLine, pendentes: Object.keys(sync.editado).length };
}
// fn(s, chegouDaNuvem): chegouDaNuvem = true quando dados de outro aparelho foram aplicados
export function aoMudar(fn) { ouvintes.push(fn); }
function avisa(chegou) { ouvintes.forEach(fn => { try { fn(situacao(), !!chegou); } catch (e) {} }); }

// ---------- login ----------
async function chamaAuth(caminho, corpo) {
  const r = await fetch(URL_SUPABASE + "/auth/v1/" + caminho, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: CHAVE_PUBLICA }, body: JSON.stringify(corpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(traduzErro(j));
  return j;
}
function traduzErro(j) {
  const m = (j && (j.msg || j.error_description || j.message || j.error)) || "";
  if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/already registered|already exists/i.test(m)) return "Esse e-mail já tem conta. Use “Entrar”.";
  if (/password should be at least/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/email not confirmed/i.test(m)) return "Confirme o e-mail pelo link que enviamos e tente de novo.";
  if (/invalid.*email|email.*invalid/i.test(m)) return "Esse e-mail não parece válido.";
  if (/failed to fetch|network/i.test(m)) return "Sem conexão com o servidor. Verifique a internet.";
  return m || "Não foi possível falar com o servidor.";
}
function guardaSessao(j) {
  sessao = { access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + (Number(j.expires_in) || 3600) * 1000,
    user: { id: j.user && j.user.id, email: j.user && j.user.email } };
  grava(CHAVE_SESSAO, sessao);
}

export async function entrar(email, senha) {
  let j; try { j = await chamaAuth("token?grant_type=password", { email, password: senha }); }
  catch (e) { if (/fetch/i.test(e.message)) throw new Error("Sem conexão com o servidor. Verifique a internet."); throw e; }
  aoEntrar(j);
}
export async function criarConta(email, senha) {
  const volta = encodeURIComponent(location.origin + location.pathname); // o link de confirmação volta para o NoSkip
  const j = await chamaAuth("signup?redirect_to=" + volta, { email, password: senha });
  if (!j.access_token) throw new Error("Conta criada. Confirme pelo link no seu e-mail e depois toque em “Entrar”.");
  aoEntrar(j);
}
function aoEntrar(j) {
  // Outra conta neste aparelho: começa do zero (não mistura os dados de uma pessoa com os de outra).
  if (sync.usuario && j.user && sync.usuario !== j.user.id) { sync = novoSync(); limparLocal(); }
  guardaSessao(j);
  sync.usuario = sessao.user.id; sync.erro = null; grava(CHAVE_SYNC, sync);
  avisa();
  sincroniza();
}
// Sair: só deixa sair com tudo enviado. Os dados saem do aparelho (a cópia fica na nuvem).
export async function sair() {
  if (Object.keys(sync.editado).length) await sincroniza();
  if (Object.keys(sync.editado).length) throw new Error("Há mudanças que ainda não foram enviadas. Conecte à internet e tente de novo.");
  sessao = null; grava(CHAVE_SESSAO, null);
  sync = novoSync(); grava(CHAVE_SYNC, null);
  limparLocal();
  avisa(true);
}

async function token() {
  if (!sessao) return null;
  if (Date.now() < sessao.expira - 60000) return sessao.access_token;
  try {
    const j = await chamaAuth("token?grant_type=refresh_token", { refresh_token: sessao.refresh_token });
    guardaSessao(j);
    return sessao.access_token;
  } catch (e) {
    // Sem internet: segue usando o app; tenta renovar depois.
    if (!navigator.onLine || /conexão|fetch/i.test(e.message)) return null;
    // Sessão vencida de vez: pede para entrar de novo, sem apagar nada do aparelho.
    sessao = null; grava(CHAVE_SESSAO, null);
    sync.erro = "Sua sessão expirou. Entre de novo para continuar sincronizando."; grava(CHAVE_SYNC, sync); avisa();
    return null;
  }
}

async function rest(metodo, caminho, corpo, extra) {
  const t = await token(); if (!t) throw new Error("sem sessão");
  const r = await fetch(URL_SUPABASE + "/rest/v1/" + caminho, {
    method: metodo, cache: "no-store",
    headers: Object.assign({ "Content-Type": "application/json", apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t }, extra || {}),
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || ("Erro " + r.status)); }
  return r.status === 204 ? null : r.json();
}

// ---------- itens do app como registros ----------
const chave = (tipo, id) => tipo + ":" + id;
const impressao = d => JSON.stringify(d);
function itensLocais() {
  const out = {};
  for (const tipo of LISTAS) for (const it of estado[tipo] || []) if (it && it.id != null) out[chave(tipo, it.id)] = { tipo, id: String(it.id), dados: it };
  for (const [tipo, campo] of Object.entries(UNICOS)) out[chave(tipo, "atual")] = { tipo, id: "atual", dados: estado[campo] };
  return out;
}
function aplicaRemoto(reg) {
  if (UNICOS[reg.tipo]) { if (!reg.apagado && reg.dados != null) estado[UNICOS[reg.tipo]] = reg.dados; return; }
  if (!LISTAS.includes(reg.tipo)) return;
  const lista = estado[reg.tipo] || (estado[reg.tipo] = []);
  const i = lista.findIndex(x => String(x.id) === reg.id);
  if (reg.apagado) { if (i >= 0) lista.splice(i, 1); return; }
  if (i >= 0) lista[i] = reg.dados; else lista.push(reg.dados);
}

// A cada salvamento: anota a hora do que mudou e agenda o envio.
aoSalvar(() => {
  const agora = Date.now(), locais = itensLocais();
  for (const k of Object.keys(locais)) if (sync.conhecido[k] !== impressao(locais[k].dados) && !sync.editado[k]) sync.editado[k] = agora;
  for (const k of Object.keys(sync.conhecido)) if (!locais[k] && !sync.editado[k]) sync.editado[k] = agora;
  grava(CHAVE_SYNC, sync);
  if (!sessao) return;
  clearTimeout(temporizador);
  temporizador = setTimeout(sincroniza, 2000);
});

// ---------- sincronizar: primeiro baixa o que é novo, depois envia o que mudou aqui ----------
export async function sincroniza() {
  if (!sessao || emAndamento) return;
  if (!navigator.onLine) { sync.erro = null; avisa(); return; }
  emAndamento = true; avisa();
  let chegou = false;
  try {
    const primeira = !sync.cursor;
    // 1. baixar
    let caminho = TABELA + "?select=tipo,id,dados,apagado,alterado,atualizado_em&order=atualizado_em.asc";
    if (sync.cursor) caminho += "&atualizado_em=gt." + encodeURIComponent(sync.cursor);
    const remotos = await rest("GET", caminho);
    for (const reg of remotos) {
      const k = chave(reg.tipo, reg.id), editadoAqui = sync.editado[k];
      // Na primeira vez, o que já está na nuvem prevalece; depois, vence a mudança mais recente.
      if (!editadoAqui || primeira || Number(reg.alterado) >= editadoAqui) {
        aplicaRemoto(reg); chegou = true;
        delete sync.editado[k];
        if (reg.apagado) delete sync.conhecido[k]; else sync.conhecido[k] = impressao(reg.dados);
      }
      if (!sync.cursor || reg.atualizado_em > sync.cursor) sync.cursor = reg.atualizado_em;
    }
    if (chegou) salvarLocal();

    // 2. enviar o que mudou aqui (inclusive o que foi apagado)
    const agora = itensLocais(), envio = [];
    for (const k of Object.keys(agora)) {
      const h = impressao(agora[k].dados);
      if (sync.conhecido[k] !== h) envio.push({ k, h, reg: { tipo: agora[k].tipo, id: agora[k].id, dados: agora[k].dados, apagado: false, alterado: sync.editado[k] || Date.now() } });
    }
    for (const k of Object.keys(sync.conhecido)) if (!agora[k]) {
      const [tipo, ...resto] = k.split(":");
      envio.push({ k, h: null, reg: { tipo, id: resto.join(":"), dados: null, apagado: true, alterado: sync.editado[k] || Date.now() } });
    }
    for (let i = 0; i < envio.length; i += 200) {
      const lote = envio.slice(i, i + 200);
      const resp = await rest("POST", TABELA + "?on_conflict=user_id,tipo,id&select=atualizado_em", lote.map(x => x.reg), { Prefer: "resolution=merge-duplicates,return=representation" });
      for (const x of lote) { if (x.h == null) delete sync.conhecido[x.k]; else sync.conhecido[x.k] = x.h; delete sync.editado[x.k]; }
      // o cursor avança junto, para não baixar de volta o que acabou de subir
      for (const r of resp || []) if (r.atualizado_em > (sync.cursor || "")) sync.cursor = r.atualizado_em;
    }
    sync.ultima = new Date().toISOString(); sync.erro = null;
  } catch (e) {
    if (String(e.message) !== "sem sessão") sync.erro = navigator.onLine ? "Não foi possível sincronizar: " + e.message : null;
  } finally {
    emAndamento = false; grava(CHAVE_SYNC, sync); avisa(chegou);
  }
}

// Sincroniza ao abrir, ao voltar a internet e ao voltar para o app.
export function iniciaSync() {
  addEventListener("online", () => sincroniza());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sincroniza(); });
  if (sessao) sincroniza();
}
