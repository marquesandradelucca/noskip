// Contas do NoSkip: progresso das metas, ritmo, projeção, sequência semanal e marcos.
import { estado, hoje, data, iso, somaDias, difDias, inicioSemana } from "./dados.js?v=20261124192955";

function diasUteis(m, de, ate) { // dias entre de e ate (inclusive)
  return ate < de ? 0 : difDias(de, ate) + 1;
}

export function feitosNaMeta(m, ate) {
  const lim = ate || m.prazo;
  const ts = estado.treinos.filter(t => t.data >= m.inicio && t.data <= lim);
  if (m.contar === "cardio") return ts.filter(t => t.tipo === "cardio").length;
  if (m.contar === "dias") return new Set(ts.map(t => t.data)).size;
  return ts.length;
}

// Tudo o que as telas precisam saber de uma meta.
export function resumo(m) {
  const h = hoje();
  const feitos = feitosNaMeta(m, h < m.prazo ? h : m.prazo);
  const faltam = Math.max(0, m.alvo - feitos);
  const totais = Math.max(1, diasUteis(m, m.inicio, m.prazo));
  const ontem = somaDias(h, -1);
  const decorridos = diasUteis(m, m.inicio, h < m.prazo ? ontem : m.prazo); // hoje ainda está em aberto
  const treinouHoje = estado.treinos.some(t => t.data === h);
  const restantes = h > m.prazo ? 0 : diasUteis(m, treinouHoje ? somaDias(h, 1) : h, m.prazo); // dias que ainda dá para treinar
  const faltasLivres = Math.max(0, restantes - faltam);
  const ritmo = restantes > 0 ? faltam / (restantes / 7) : 0;
  const ideal = m.alvo * Math.min(1, (decorridos + (treinouHoje ? 1 : 0)) / totais);
  const dif = feitos - ideal;
  const proj = decorridos > 0 ? Math.round(feitos / (decorridos + (treinouHoje ? 1 : 0)) * totais) : feitos;
  const encerrou = h > m.prazo;
  let est;
  if (feitos >= m.alvo) est = "batida";
  else if (dif >= 1) est = "afrente";
  else if (dif > -1.5 && faltasLivres > 0) est = "noritmo";
  else est = "apertado";
  const diasPrazo = Math.max(0, difDias(h, m.prazo));
  return { feitos, faltam, totais, decorridos, restantes, faltasLivres, ritmo, ideal, dif, proj, est, encerrou, diasPrazo };
}

export const NOMES_ESTADO = { afrente: "à frente", noritmo: "No ritmo", apertado: "Apertado", batida: "Meta batida" };

export function linhaStatus(m, r) {
  if (r.est === "batida") return "Batida · " + m.alvo + " de " + m.alvo;
  const d = Math.round(Math.abs(r.dif));
  const ini = r.est === "afrente" ? "▲ " + d + " à frente" : r.est === "apertado" ? "▼ " + Math.max(1, d) + " atrás" : "● No ritmo";
  return ini + " · " + r.faltasLivres + " faltas livres · " + r.diasPrazo + " dias";
}

// Série de pontos reais × ideais para o gráfico (uma amostra por semana).
export function serieRealIdeal(m) {
  const h = hoje(); const fim = h < m.prazo ? h : m.prazo; const tot = difDias(m.inicio, m.prazo) || 1;
  const pts = [];
  for (let s = m.inicio; s <= fim; s = somaDias(s, 7)) pts.push({ x: difDias(m.inicio, s) / tot, y: feitosNaMeta(m, s) });
  pts.push({ x: difDias(m.inicio, fim) / tot, y: feitosNaMeta(m, fim) });
  return pts;
}

// ---------- sequência semanal ----------
// Semana conta se tiver pelo menos 1 treino. O coringa protege 1 semana vazia por mês (configurável, até 2):
// a sequência não quebra, mas também não sobe. Nunca cobre duas semanas vazias seguidas.
export function sequencia() {
  const h = hoje();
  const semanas = new Set(estado.treinos.map(t => inicioSemana(t.data)));
  const usados = {}; const coberta = new Set();
  const porMes = Math.min(2, estado.ajustes.coringasPorMes);
  const atualIni = inicioSemana(h);
  const vazio = { atual: 0, recorde: 0, coringasDisp: porMes, coringaAgora: false, coringaCobre: false, cobertas: coberta };
  if (!estado.treinos.length) return vazio;
  const primeira = inicioSemana(estado.treinos.reduce((a, t) => t.data < a ? t.data : a, h));
  let corrida = 0, recorde = 0;
  const podeCobrir = s => { const mes = s.slice(0, 7); return corrida > 0 && (usados[mes] || 0) < porMes && !coberta.has(somaDias(s, -7)); };
  for (let s = primeira; s <= atualIni; s = somaDias(s, 7)) {
    if (semanas.has(s)) corrida++;
    else if (s === atualIni) { /* semana atual ainda em aberto: não quebra */ }
    else if (podeCobrir(s)) { const mes = s.slice(0, 7); usados[mes] = (usados[mes] || 0) + 1; coberta.add(s); }
    else corrida = 0;
    recorde = Math.max(recorde, corrida);
  }
  const mesAtual = h.slice(0, 7);
  return {
    atual: corrida, recorde,
    coringasDisp: Math.max(0, porMes - (usados[mesAtual] || 0)),
    coringaAgora: coberta.has(somaDias(atualIni, -7)),
    coringaCobre: !semanas.has(atualIni) && podeCobrir(atualIni), // se esta semana terminar vazia, o coringa cobre?
    cobertas: coberta,
  };
}

export function faixa(seq) {
  const f = estado.ajustes.faixas;
  if (seq.atual > 0 && seq.atual >= seq.recorde && seq.recorde >= 2) return { id: "recorde", nome: "Recorde" };
  if (seq.atual > f.aquecida) return { id: "emchamas", nome: "Em chamas · " + (f.aquecida + 1) + "+" };
  if (seq.atual > f.acendendo) return { id: "aquecida", nome: "Aquecida · " + (f.acendendo + 1) + "–" + f.aquecida };
  return { id: "acendendo", nome: "Acendendo · 1–" + f.acendendo };
}

// ---------- marcos ----------
export const MARCOS = [10, 20, 30, 50, 100, 150, 200, 250, 300, 365, 400, 500, 600, 700, 800, 900, 1000];
// gradiente de cada marco: a escada de 5 cores se repete
export const gradMarco = v => "marco-" + [10, 20, 30, 50, 100][MARCOS.indexOf(v) % 5];
export function totalTreinos() { return estado.treinos.length; }
export function totalBonus() { return estado.treinos.filter(t => t.bonus).length; }
export function dataDoMarco(n) {
  const ts = [...estado.treinos].sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  return ts[n - 1] ? ts[n - 1].data : null;
}

export function recordes() {
  const porMes = {}, bonusMes = {};
  for (const t of estado.treinos) { const k = t.data.slice(0, 7); porMes[k] = (porMes[k] || 0) + 1; if (t.bonus) bonusMes[k] = (bonusMes[k] || 0) + 1; }
  const maior = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  // mais dias seguidos treinando
  const dias = [...new Set(estado.treinos.map(t => t.data))].sort();
  let melhor = 0, fimMelhor = null, corrida = 0;
  for (let i = 0; i < dias.length; i++) { corrida = i && difDias(dias[i - 1], dias[i]) === 1 ? corrida + 1 : 1; if (corrida > melhor) { melhor = corrida; fimMelhor = dias[i]; } }
  return { mes: maior(porMes), bonus: maior(bonusMes), seq: sequencia().recorde, dias: melhor, diasFim: fimMelhor };
}
