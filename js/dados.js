// Dados do NoSkip: tudo salvo no aparelho (localStorage). Supabase fica para depois.
const CHAVE = "noskip-v1";

export const TIPOS = {
  musculacao: { nome: "Musculação", grad: "musculacao" },
  cardio: { nome: "Cardio", grad: "cardio" },
  outro: { nome: "Outro", grad: "outro" },
};

function padrao() {
  return {
    metas: [],
    treinos: [],
    ajustes: { coringasPorMes: 1, faixas: { acendendo: 3, aquecida: 7 }, semanaInicio: 0, ultimoTipo: "musculacao" },
    marcosVistos: [],
  };
}

export let estado = carregar();

function carregar() {
  try {
    const t = localStorage.getItem(CHAVE);
    if (!t) return padrao();
    const e = JSON.parse(t);
    const p = padrao();
    return { ...p, ...e, ajustes: { ...p.ajustes, ...(e.ajustes || {}), faixas: { ...p.ajustes.faixas, ...((e.ajustes || {}).faixas || {}) } } };
  } catch (e) { return padrao(); }
}

export function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) {}
}

export function novoId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

// ---------- datas (sempre no fuso local, formato AAAA-MM-DD) ----------
export function iso(d) {
  const z = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
}
export function data(s) { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); }
export function hoje() { return iso(new Date()); }
export function somaDias(s, n) { const d = data(s); d.setDate(d.getDate() + n); return iso(d); }
export function difDias(a, b) { return Math.round((data(b) - data(a)) / 86400000); }
export function inicioSemana(s) { const d = data(s); const ini = estado.ajustes.semanaInicio; const dif = (d.getDay() - ini + 7) % 7; d.setDate(d.getDate() - dif); return iso(d); }

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_L = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function curta(s) { const d = data(s); return d.getDate() + " " + MESES[d.getMonth()]; }
export function curtaAno(s) { const d = data(s); return d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear(); }
export function comDia(s) { const d = data(s); return DIAS[d.getDay()] + ", " + d.getDate() + " " + MESES[d.getMonth()]; }
export function mesLongo(a, m) { return MESES_L[m]; }
export function mesCurto(m) { return MESES[m]; }
export function letrasSemana() { const L = ["D", "S", "T", "Q", "Q", "S", "S"]; const i = estado.ajustes.semanaInicio; return L.slice(i).concat(L.slice(0, i)); }

// ---------- treinos ----------
export function treinosDoDia(s) { return estado.treinos.filter(t => t.data === s).sort((a, b) => (a.hora || "").localeCompare(b.hora || "")); }

// Regra: até 2 treinos por dia, e o 2º só vale se for de outro tipo (vira bônus).
export function podeRegistrar(s, tipo) {
  const dia = treinosDoDia(s);
  if (dia.length === 0) return { ok: true, bonus: false };
  if (dia.length >= 2) return { ok: false, motivo: "Já são 2 treinos neste dia." };
  if (dia[0].tipo === tipo) return { ok: false, motivo: "O 2º treino do dia precisa ser de outro tipo." };
  return { ok: true, bonus: true };
}

export function registrar(s, tipo) {
  const r = podeRegistrar(s, tipo);
  if (!r.ok) return null;
  const agora = new Date();
  const hora = s === hoje() ? String(agora.getHours()).padStart(2, "0") + ":" + String(agora.getMinutes()).padStart(2, "0") : null;
  const t = { id: novoId(), data: s, hora, tipo, bonus: r.bonus };
  estado.treinos.push(t);
  estado.ajustes.ultimoTipo = tipo;
  salvar();
  return t;
}

export function removerTreino(id) {
  const t = estado.treinos.find(x => x.id === id);
  estado.treinos = estado.treinos.filter(x => x.id !== id);
  // se apagou o 1º do dia, o que sobrou deixa de ser bônus
  if (t) { const resto = treinosDoDia(t.data); if (resto.length === 1) resto[0].bonus = false; }
  salvar();
}

// ---------- metas ----------
export function metasAtivas() { return estado.metas.filter(m => m.status !== "encerrada").sort((a, b) => a.ordem - b.ordem); }
export function salvarMeta(m) {
  const i = estado.metas.findIndex(x => x.id === m.id);
  if (i >= 0) estado.metas[i] = m; else { m.ordem = estado.metas.length; estado.metas.push(m); }
  salvar();
}
export function excluirMeta(id) { estado.metas = estado.metas.filter(m => m.id !== id); salvar(); }
