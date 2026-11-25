// NoSkip — telas e interações.
import { estado, salvar, novoId, TIPOS, hoje, data, iso, somaDias, difDias, inicioSemana, curta, curtaAno, comDia, mesLongo, mesCurto, letrasSemana,
  treinosDoDia, podeRegistrar, registrar, removerTreino, metasAtivas, salvarMeta, excluirMeta } from "./dados.js?v=20261124233536";
import { situacao, entrar, criarConta, sair, sincroniza, aoMudar, iniciaSync } from "./sync.js?v=20261124233536";
import { resumo, linhaStatus, serieRealIdeal, sequencia, faixa, MARCOS, totalTreinos, totalBonus, dataDoMarco, recordes, feitosNaMeta, gradMarco } from "./calculo.js?v=20261124233536";

const app = document.getElementById("app");
const camada = document.getElementById("camada");
const ui = { aba: "home", detalhe: null, cal: { modo: "ano", sel: hoje(), aberto: true, ref: hoje().slice(0, 7) }, prazoMostrado: {} };

// ---------- utilidades ----------
const G = k => `background-image:url(img/grad/${k}.jpg)`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// ícones do Figma (página "05 - icones"): tamanho natural de cada um, para manter o equilíbrio óptico
const DIM = { casa: [23.32, 20.54], calendario: [19.46, 18], trofeu: [19.1, 21.41], ajustes: [18.21, 3.71], check: [19.92, 19.92], mais: [16.11, 16.13], coringa: [19.92, 19.92],
  "seta-esq": [18.13, 14.81], "seta-dir": [18.13, 14.81], estrela: [20, 20], musculacao: [23.31, 23.69], cardio: [16.35, 21.54], outro: [19.07, 23.22], chama: [16.26, 22.91],
  alvo: [19.92, 19.92], "calendario-circulo": [19.92, 19.92], medalha: [14.07, 24.37] };
// endereço completo do ícone: funciona em qualquer pasta (localhost ou /noskip/ no GitHub Pages)
const ic = (n, s = 1) => { const [w, h] = DIM[n]; return `<i class="ic" aria-hidden="true" style="--ic:url(${new URL("img/icones/" + n + ".svg", document.baseURI).href});width:${(w * s).toFixed(1)}px;height:${(h * s).toFixed(1)}px"></i>`; };
// Vibração: Android usa navigator.vibrate; o iPhone não tem essa API, mas dá um toque háptico do sistema
// quando um interruptor (<input switch>, iOS 18+) muda — então alternamos um escondido. Precisa vir de um toque.
const _hap = (() => { const l = document.createElement("label"); l.setAttribute("aria-hidden", "true");
  l.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
  l.innerHTML = '<input type="checkbox" switch tabindex="-1">'; document.body.appendChild(l); return l; })();
function vibrar(padrao) {
  if (navigator.vibrate) { navigator.vibrate(padrao); return; }
  const toques = Array.isArray(padrao) ? Math.ceil(padrao.length / 2) : 1;
  for (let i = 0; i < toques; i++) setTimeout(() => _hap.click(), i * 90);
}
const gradMeta = r => "meta-" + r.est;
const gradDet = r => "det-" + r.est;

// ---------- render principal ----------
// anim: "push" (abre tela), "pop" (volta), "esq"/"dir" (troca de aba), "fade"
function render(anim) {
  if (!situacao().logado) { app.innerHTML = telaEntrada(); ligaEntrada(); return; }
  if (ui.detalhe) { const m = estado.metas.find(x => x.id === ui.detalhe); if (m) { app.innerHTML = telaDetalhe(m); animar(anim); return; } ui.detalhe = null; }
  const t = ui.aba === "home" ? telaHome() : ui.aba === "cal" ? telaCal() : telaConq();
  app.innerHTML = t + abas();
  animar(anim); animarAbas();
  if (ui.aba === "home") checaPrazos();
}
function animar(anim) {
  if (!anim) return;
  const el = app.querySelector(".tela"); if (!el) return;
  el.classList.add("tr-" + anim);
  el.addEventListener("animationend", () => el.classList.remove("tr-" + anim), { once: true });
}
// ---------- transição "card vira a tela" ----------
const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(.32,.72,0,1)";
function alvoTela() { const r = app.getBoundingClientRect(); return { left: r.left, top: 0, width: r.width, height: innerHeight, radius: 0 }; }
function camadaGrad(img, r, raio) {
  const c = document.createElement("div"); c.className = "expande";
  Object.assign(c.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: raio + "px", backgroundImage: /agendada/.test(img) ? "none" : `url(img/grad/${img}.jpg)`, backgroundColor: /agendada/.test(img) ? "#000" : "" });
  document.body.appendChild(c); return c;
}
function entradaEmOndas() {
  const el = app.querySelector(".tela"); if (!el) return;
  contarNumeros(el);
  [...el.children].filter(k => !k.classList.contains("fundo")).forEach((k, i) => { k.style.setProperty("--i", i); k.classList.add("onda-in"); k.addEventListener("animationend", () => k.classList.remove("onda-in"), { once: true }); });
}
function contarNumeros(el) {
  el.querySelectorAll("[data-contar]").forEach(n => {
    const fim = +n.dataset.contar, t0 = performance.now() + 420, dur = 900;
    const passo = agora => { const k = Math.min(1, Math.max(0, (agora - t0) / dur)); n.textContent = Math.round(fim * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(passo); };
    n.textContent = "0"; requestAnimationFrame(passo);
  });
}
function abrirDetalhe(id, card) {
  const m = estado.metas.find(x => x.id === id); if (!m) return;
  if (reduzir || !card) { ui.detalhe = id; window.scrollTo(0, 0); render(); return; }
  const r = card.getBoundingClientRect(); const raio = parseFloat(getComputedStyle(card).borderRadius) || 24;
  const c = camadaGrad(gradDet(resumo(m)), r, raio);
  const alvo = alvoTela();
  const anim = c.animate([
    { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: raio + "px" },
    { left: alvo.left + "px", top: "0px", width: alvo.width + "px", height: alvo.height + "px", borderRadius: "0px" }
  ], { duration: 480, easing: EASE, fill: "forwards" });
  card.style.visibility = "hidden";
  anim.onfinish = () => {
    ui.detalhe = id; window.scrollTo(0, 0); render(); entradaEmOndas();
    c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }).onfinish = () => c.remove();
  };
}
function fecharDetalhe() {
  const id = ui.detalhe; const m = estado.metas.find(x => x.id === id);
  if (reduzir || !m) { ui.detalhe = null; window.scrollTo(0, 0); render(); return; }
  const alvo = alvoTela(); const c = camadaGrad(gradDet(resumo(m)), alvo, 0);
  ui.detalhe = null; window.scrollTo(0, 0); render();
  const card = app.querySelector(`[data-meta="${id}"]`);
  if (!card) { c.remove(); return; }
  const r = card.getBoundingClientRect(); const raio = parseFloat(getComputedStyle(card).borderRadius) || 24;
  c.animate([
    { left: alvo.left + "px", top: "0px", width: alvo.width + "px", height: alvo.height + "px", borderRadius: "0px", opacity: 1 },
    { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: raio + "px", opacity: 1, offset: .85 },
    { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: raio + "px", opacity: 0 }
  ], { duration: 460, easing: EASE, fill: "forwards" }).onfinish = () => c.remove();
}

// anel de riscos de relógio em volta do número dos marcos (60 riscos, os de 5 em 5 mais longos)
const RELOGIO = (() => { let s = '<svg class="relogio" viewBox="0 0 80 80" aria-hidden="true">'; for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30, r1 = 38, r2 = i % 5 ? 35 : 32; s += `<line x1="${(40 + Math.cos(a) * r1).toFixed(2)}" y1="${(40 + Math.sin(a) * r1).toFixed(2)}" x2="${(40 + Math.cos(a) * r2).toFixed(2)}" y2="${(40 + Math.sin(a) * r2).toFixed(2)}"/>`; } return s + "</svg>"; })();
// cor do número dos marcos: tom mais escuro do gradiente (fundo claro) ou mais claro (fundo escuro)
const COR_NUM_MARCO = { "marco-10": "#FFFFFF", "marco-20": "#FFFFFF", "marco-30": "#FFFFFF", "marco-50": "#FFFFFF", "marco-100": "#FFFFFF" }; // números brancos
const ORDEM_ABAS = ["home", "cal", "conq"];

// troca de aba: a pílula desliza da aba anterior até a nova (com um leve "quique") e o ícone novo dá um pulinho
function animarAbas() {
  const de = ui.abaAnt; ui.abaAnt = null;
  if (de == null || reduzir) return;
  const p = app.querySelector(".abas-pilula"), para = ORDEM_ABAS.indexOf(ui.aba), passo = 84;
  if (!p || de === para) return;
  p.animate([{ transform: `translateX(${de * passo}px) scaleX(1)` }, { transform: `translateX(${(de + para) / 2 * passo}px) scaleX(1.18)`, offset: .45 }, { transform: `translateX(${para * passo}px) scaleX(1)` }],
    { duration: 460, easing: "cubic-bezier(.3,1.25,.5,1)" });
  const icone = app.querySelector(".aba.ativa .ic");
  if (icone) icone.animate([{ transform: "scale(.8)" }, { transform: "scale(1.14)", offset: .55 }, { transform: "scale(1)" }], { duration: 420, delay: 120, easing: "ease-out", fill: "backwards" });
}
function abas() {
  const a = (id, n, n2) => `<button class="aba ${ui.aba === id ? "ativa" : ""}" data-aba="${id}" >${ic(n2, 1)}<span class="aba-rot">${n}</span></button>`;
  return `<nav class="abas"><span class="abas-pilula" style="--i:${ORDEM_ABAS.indexOf(ui.aba)}"></span>${a("home", "Home", "casa")}${a("cal", "Calendário", "calendario")}${a("conq", "Conquistas", "trofeu")}</nav>`;
}

// ---------- Home ----------
function telaHome() {
  const ag = m => hoje() < m.inicio;
  const metas = metasAtivas().sort((a, b) => (ag(a) - ag(b)) || (ag(a) ? a.inicio.localeCompare(b.inicio) : 0) || a.ordem - b.ordem);
  let h = `<section class="tela"><div class="cab"><div class="titulo">NoSkip</div><button class="btn-redondo" data-acao="ajustes" aria-label="Ajustes">${ic("ajustes")}</button></div>`;
  if (!metas.length) {
    h += `<div class="card card-meta primeira-meta" data-acao="nova-meta">
      <div style="margin-top:auto;font-size:20px;font-weight:600">Comece com uma meta</div>
      <div style="font-size:15px;color:var(--txt2);margin:8px 0 18px">Ex.: 50 treinos até o fim do ano. A gente mostra o ritmo, as faltas livres e comemora cada marco.</div>
      <button class="pilula">Criar primeira meta</button></div>
      <p class="vazio-dica">Dica: você pode ter várias metas ao mesmo tempo (ex.: fim do ano + carnaval).</p></section>`;
    return h;
  }
  const m = metas[0], r = resumo(m);
  const hj = treinosDoDia(hoje());
  let botao;
  if (r.est === "batida") botao = `<button class="pilula" data-acao="nova-meta">Definir próxima meta</button>`;
  else if (hj.length >= 2) botao = `<button class="pilula escura" disabled>${ic("check", .9)}Treinou hoje · bônus feito</button>`;
  else if (hj.length === 1) botao = `<button class="pilula escura" data-acao="checkin">${ic("check", .9)}Treinou hoje ·<span class="ic-in">${ic("estrela", .7)}bônus</span></button>`;
  else botao = `<button class="pilula" data-acao="checkin">${ic("mais", .9)}Check-in</button>`;
  h += r.est === "agendada" ? `<div class="card card-meta agendada" data-meta="${m.id}"><div class="nome">${esc(m.nome)}</div><div class="selo">Agendada · ${curta(m.inicio)}</div>
    <div class="placar"><span class="n">0</span><span class="d">/${m.alvo}</span></div>
    <div class="status">${linhaStatus(m, r)}</div>${botao}</div>` : `<div class="card-meta grad" style="${G(gradMeta(r))}" data-meta="${m.id}">
    <div class="nome sombra-txt">${esc(m.nome)}</div>${r.est === "batida" ? `<div class="selo${ui.batidaNova && ui.batidaNova.includes(m.id) ? " espera" : ""}">Meta batida</div>` : ""}
    <div class="placar">${nPlacar(m, r)}<span class="d sombra-txt">/${m.alvo}</span></div>
    <div class="status sombra-txt">${linhaStatus(m, r)}</div>${botao}</div>`;
  h += cardSemana();
  h += `<div class="grade2">`;
  for (const o of metas.slice(1)) { const ro = resumo(o);
    if (ro.est === "agendada") { h += `<div class="tile agendada" data-meta="${o.id}"><div class="nome">${esc(o.nome)}</div><div class="quando">começa ${curta(o.inicio)}</div><div class="placar"><span class="n">0</span><span class="d">/${o.alvo}</span></div></div>`; continue; }
    h += `<div class="tile grad" style="${G(gradMeta(ro))}" data-meta="${o.id}"><div class="nome sombra-txt">${esc(o.nome)}</div><div class="placar">${nPlacar(o, ro)}<span class="d">/${o.alvo}</span></div></div>`; }
  h += `<button class="tile novo" data-acao="nova-meta">${ic("mais", 1.6)}<span style="font-size:13px;font-weight:500">Nova meta</span></button></div></section>`;
  return h;
}

// número do placar: logo após o check-in mostra o valor de antes; ele rola para o novo quando o "+1" sai
function nPlacar(m, r) {
  const de = ui.placarAnt && ui.placarAnt[m.id];
  return de != null && de !== r.feitos ? `<span class="n" data-rola="${r.feitos}">${de}</span>` : `<span class="n">${r.feitos}</span>`;
}
// rola como um contador mecânico (no estilo do NumberFlow / numericText do iOS):
// só os dígitos que mudam giram; movimento de mola (easing linear() gerado a partir de uma mola amortecida),
// as bordas da "janela" do dígito esmaecem (máscara) e o dígito que sai some enquanto o novo aparece.
const MOLA = (() => { // mola levemente subamortecida: um quique pequeno e suave, sem tranco
  const z = 0.72, T = 0.9, w = 6.9 / (z * T), wd = w * Math.sqrt(1 - z * z), pts = [];
  for (let i = 0; i <= 60; i++) { const t = i / 60 * T; pts.push((1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t))).toFixed(4)); }
  pts[60] = "1"; return { easing: `linear(${pts.join(",")})`, dur: T * 1000 };
})();
function rolaNumero(el, de, para) {
  const a = String(de), b = String(para), cor = getComputedStyle(el).color;
  el.textContent = b; el.style.position = "relative"; el.style.color = "transparent";
  const o = document.createElement("span"); o.className = "rolo"; o.style.color = cor;
  const col = (x, y) => `<span class="dg"><span class="col"><span class="sai">${x}</span><span class="entra">${y}</span></span></span>`;
  o.innerHTML = a.length === b.length ? [...b].map((c, i) => c === a[i] ? `<span class="fixo">${c}</span>` : col(a[i], c)).join("") : col(a, b);
  el.appendChild(o);
  const ESPERA = 380, PASSO = 70, cols = [...o.querySelectorAll(".col")].reverse();
  cols.forEach((c, i) => {
    const t = { delay: ESPERA + i * PASSO, fill: "both" };
    c.animate([{ transform: "translateY(0)" }, { transform: "translateY(-50%)" }], { ...t, duration: MOLA.dur, easing: MOLA.easing });
    c.querySelector(".sai").animate([{ opacity: 1 }, { opacity: 0 }], { ...t, duration: MOLA.dur * .45, easing: "ease-out" });
    c.querySelector(".entra").animate([{ opacity: 0 }, { opacity: 1 }], { ...t, duration: MOLA.dur * .5, easing: "ease-out" });
  });
  setTimeout(() => { o.remove(); el.style.color = ""; }, ESPERA + MOLA.dur + cols.length * PASSO + 30);
}
function rolaPlacares() {
  ui.placarAnt = null;
  app.querySelectorAll(".n[data-rola]").forEach(el => { const para = +el.dataset.rola, de = +el.textContent; el.removeAttribute("data-rola");
    if (reduzir) el.textContent = para; else rolaNumero(el, de, para); });
}
function cardSemana() {
  const ini = inicioSemana(hoje()); const seq = sequencia(); const h = hoje();
  let pts = "";
  for (let i = 0; i < 7; i++) {
    const d = somaDias(ini, i); const ts = treinosDoDia(d);
    const espera = ui.pontoNovo && ui.pontoNovo.dia === d ? (ui.pontoNovo.bonus ? " espera-b" : " espera") : ""; // vai acender depois do "+1"
    pts += `<div class="ponto ${ts.length ? "aceso" : ""} ${d === h ? "hoje" : ""}${espera}" data-d="${d}">${ts.some(t => t.bonus) ? '<span class="bonus"></span>' : ""}</div>`;
  }
  const txt = seq.coringaAgora ? `coringa usado · ${seq.atual} semanas` : `${seq.atual} ${seq.atual === 1 ? "semana seguida" : "semanas seguidas"}`;
  // aviso nos 2 últimos dias da semana, se ainda não treinou e há sequência a perder
  const fimSem = somaDias(ini, 6); const semTreino = ![0, 1, 2, 3, 4, 5, 6].some(i => treinosDoDia(somaDias(ini, i)).length);
  let aviso = "";
  if (semTreino && seq.atual > 0 && difDias(h, fimSem) <= 1) {
    const dia = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][data(fimSem).getDay()];
    aviso = seq.coringaCobre
      ? `<div class="aviso-sem">${ic("coringa", .7)}Sem treino esta semana · o coringa cobre</div>`
      : `<div class="aviso-sem forte">${ic("chama", .6)}Sem treino esta semana · treine até ${dia}</div>`;
  }
  return `<div class="card semana"><div class="topo"><span class="rot">Semana</span><span class="rot ic-in">${ic("chama", .55)}${txt}</span></div><div class="pontos">${pts}</div>${aviso}</div>`;
}

function checaPrazos() {
  for (const m of metasAtivas()) {
    const r = resumo(m);
    if (r.encerrou && !ui.prazoMostrado[m.id]) { ui.prazoMostrado[m.id] = 1; setTimeout(() => folhaPrazo(m, r), 300); break; }
  }
}

// ---------- Detalhe ----------
function telaDetalhe(m) {
  const r = resumo(m);
  if (r.est === "agendada") return `<section class="tela detalhe agendada" style="padding-bottom:calc(var(--seguro-b) + 32px)">
  <div class="cab"><button class="btn-redondo" data-acao="voltar" aria-label="Voltar">${ic("seta-esq")}</button><button class="btn-redondo" data-acao="acoes" data-id="${m.id}" aria-label="Mais">${ic("ajustes")}</button></div>
  <div class="titulo">${esc(m.nome)}</div>
  <div class="placar" style="margin:0 0 4px"><span class="n">0</span><span class="d">/${m.alvo}</span><span class="status" style="margin:0 0 14px auto;white-space:nowrap">Agendada</span></div>
  <div class="grade3">
    <div class="card"><div class="v">${r.diasInicio}</div><div class="l">${r.diasInicio === 1 ? "dia para começar" : "dias para começar"}</div></div>
    <div class="card"><div class="v">${r.totais}</div><div class="l">dias de meta</div></div>
    <div class="card"><div class="v">${r.ritmo.toFixed(1).replace(".", ",")}</div><div class="l">por semana</div></div>
  </div>
  <div class="card"><h3 style="font-size:15px;font-weight:600;margin-bottom:6px">De ${curtaAno(m.inicio)} a ${curtaAno(m.prazo)}</h3>
    <div class="dica" style="margin:0">Os treinos contam a partir do primeiro dia. Ritmo, folga e gráficos aparecem quando a meta começar.</div></div>
  </section>`;
  const st = linhaStatus(m, r).split(" · ")[0];
  const pct = Math.min(100, Math.round(r.feitos / m.alvo * 100));
  return `<section class="tela detalhe" style="padding-bottom:calc(var(--seguro-b) + 32px)"><div class="fundo grad" style="${G(gradDet(r))}"></div>
  <div class="cab"><button class="btn-redondo vidro" data-acao="voltar" aria-label="Voltar">${ic("seta-esq")}</button><button class="btn-redondo vidro" data-acao="acoes" data-id="${m.id}" aria-label="Mais">${ic("ajustes")}</button></div>
  <div class="titulo sombra-txt">${esc(m.nome)}</div>
  <div class="placar" style="margin:0 0 4px"><span class="n sombra-txt" data-contar="${r.feitos}">${r.feitos}</span><span class="d sombra-txt">/${m.alvo}</span><span class="status sombra-txt" style="margin:0 0 14px auto;white-space:nowrap">${st}</span></div>
  <div class="grade3">
    <div class="vidro"><div class="v">${r.faltam}</div><div class="l">para a meta</div></div>
    <div class="vidro"><div class="v">${r.diasPrazo}</div><div class="l">dias</div></div>
    <div class="vidro"><div class="v">${pct}%</div><div class="l">concluído</div></div>
  </div>
  ${cardFolga(m, r)}
  <div class="vidro"><h3 style="display:flex;justify-content:space-between">Ritmo semanal<span class="l" style="font-weight:400">últimas 12 semanas</span></h3>${grafRitmo(m, r)}
    <div class="legenda"><span><i style="width:8px;height:8px;border-radius:2px;background:rgba(255,255,255,.6)"></i>semanas anteriores</span><span><i style="width:8px;height:8px;border-radius:2px;background:#fff"></i>esta semana</span><span><svg width="14" height="2"><line x1="0" y1="1" x2="14" y2="1" stroke="#FFD166" stroke-width="2" stroke-dasharray="3 3"/></svg>necessário ${r.ritmo.toFixed(1).replace(".", ",")}/sem</span></div></div>
  <div class="vidro"><h3 style="display:flex;justify-content:space-between">Vantagem<span class="l" style="font-weight:400">treinos acima do ideal</span></h3>${grafVantagem(m, r)}</div>
  <div class="vidro"><h3>Projeção</h3>${grafProj(m, r)}<div class="legenda" style="margin-top:6px">${r.proj >= m.alvo ? `No ritmo atual, você termina com ${r.proj - m.alvo} ${r.proj - m.alvo === 1 ? "treino" : "treinos"} acima da meta.` : `No ritmo atual, você termina com ${m.alvo - r.proj} ${m.alvo - r.proj === 1 ? "treino" : "treinos"} abaixo da meta.`}</div></div>
  </section>`;
}

// dias da meta, do início até d
function diasMeta(m, ate) { const fim = ate < m.prazo ? ate : m.prazo; return fim < m.inicio ? 0 : difDias(m.inicio, fim) + 1; }

function cardFolga(m, r) {
  const total = r.faltam + r.faltasLivres; if (!total) return "";
  const cols = Math.min(28, Math.ceil(total / Math.ceil(total / 28)));
  let pts = "";
  for (let i = 0; i < total; i++) pts += `<i class="g-pt" style="--i:${i};display:block;aspect-ratio:1;border-radius:50%;${i < r.faltam ? "background:#fff" : "box-shadow:inset 0 0 0 1.2px rgba(255,255,255,.6)"}"></i>`;
  return `<div class="vidro"><h3>Folga</h3><div>
    <div style="display:flex;align-items:baseline;gap:8px;margin:-4px 0 10px"><span class="v">${r.faltasLivres}</span><span class="l">faltas livres</span></div>
    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:3px">${pts}</div>
    <div class="legenda"><span><i style="width:7px;height:7px;border-radius:4px;background:#fff"></i>treinos que faltam</span><span><i style="width:7px;height:7px;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.7)"></i>pode faltar</span></div></div></div>`;
}

function grafRitmo(m, r) {
  const h = hoje(); const fimSem = inicioSemana(h);
  const semanas = [];
  for (let k = 11; k >= 0; k--) { const ini = somaDias(fimSem, -7 * k); const fim = somaDias(ini, 6); if (fim < m.inicio) continue;
    const a = ini < m.inicio ? m.inicio : ini; const b = fim > h ? h : fim;
    semanas.push({ v: feitosNaMeta(m, b) - (a > m.inicio ? feitosNaMeta(m, somaDias(a, -1)) : 0), atual: k === 0 }); }
  if (!semanas.length) return '<div class="l">Ainda sem semanas nesta meta.</div>';
  const W = 300, H = 104, base = 92, max = Math.max(4, r.ritmo + 1, ...semanas.map(s => s.v)); const n = semanas.length;
  const bw = Math.min(18, (W - (n - 1) * 6) / n), gap = n > 1 ? (W - n * bw) / (n - 1) : 0; const y = v => base - v / max * (base - 14);
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}" height="${H}"><line x1="0" y1="${base}" x2="${W}" y2="${base}" stroke="rgba(255,255,255,.25)"/>`;
  semanas.forEach((o, i) => { const x = i * (bw + gap); s += `<rect class="g-col" style="--i:${i}" x="${x}" y="${y(o.v)}" width="${bw}" height="${Math.max(0, base - y(o.v))}" rx="4" fill="${o.atual ? "#fff" : "rgba(255,255,255,.55)"}"/><text class="g-fade" x="${x + bw / 2}" y="${y(o.v) - 4}" font-size="11" fill="#fff" text-anchor="middle" opacity=".85">${o.v}</text>`; });
  s += `<line class="g-fade" x1="0" y1="${y(r.ritmo)}" x2="${W}" y2="${y(r.ritmo)}" stroke="#FFD166" stroke-width="2" stroke-dasharray="5 4"/></svg>`;
  return s;
}

function grafVantagem(m, r) {
  const h = hoje(); const fim = h < m.prazo ? h : m.prazo; const tot = Math.max(1, diasMeta(m, m.prazo)); const span = Math.max(1, difDias(m.inicio, m.prazo));
  const pts = [];
  for (let d = m.inicio; d <= fim; d = somaDias(d, 7)) pts.push({ x: difDias(m.inicio, d) / span, v: feitosNaMeta(m, d) - m.alvo * diasMeta(m, d) / tot });
  pts.push({ x: difDias(m.inicio, fim) / span, v: feitosNaMeta(m, fim) - m.alvo * diasMeta(m, fim) / tot });
  const W = 300, H = 92, lim = Math.max(3, ...pts.map(p => Math.abs(p.v))) * 1.15, z = H / 2, y = v => z - v / lim * (z - 6);
  const linha = pts.map((p, i) => (i ? "L" : "M") + (p.x * W).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
  const ult = pts[pts.length - 1];
  const meses = []; for (let d = m.inicio.slice(0, 7) + "-01"; d <= m.prazo; d = iso(new Date(+d.slice(0, 4), +d.slice(5, 7), 1))) { const x = difDias(m.inicio, d) / span; if (x >= 0) meses.push([x, mesCurto(+d.slice(5, 7) - 1)]); }
  const passo = Math.ceil(meses.length / 6);
  const rot = meses.filter((_, i) => i % passo === 0).map(([x, n]) => `<text x="${Math.min(W - 10, x * W)}" y="${H + 14}" font-size="11" fill="#fff" opacity=".6" text-anchor="${x < .02 ? "start" : "middle"}">${n}</text>`).join("");
  const sinal = Math.round(ult.v) > 0 ? "+" : "";
  const minP = pts.reduce((a, p) => p.v < a.v ? p : a, pts[0]); const minV = Math.round(minP.v);
  const marcaMin = minV < 0 && minP !== ult ? `<circle class="g-fade" cx="${minP.x * W}" cy="${y(minP.v)}" r="3" fill="#fff" opacity=".8"/><text class="g-fade" x="${Math.max(14, Math.min(W - 14, minP.x * W))}" y="${y(minP.v) + 15}" font-size="11" fill="#fff" opacity=".8" text-anchor="middle">${String(minV).replace("-", "−")}</text>` : "";
  return `<svg class="graf" viewBox="0 0 ${W} ${H + 18}" height="${H + 18}">
    <line x1="0" y1="${z}" x2="${W}" y2="${z}" stroke="rgba(255,255,255,.35)" stroke-dasharray="3 3"/>
    <path class="g-fade" d="${linha} L${(ult.x * W).toFixed(1)} ${z} L0 ${z} Z" fill="rgba(255,255,255,.18)"/>
    <path class="g-traco" pathLength="1" d="${linha}" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle class="g-ponto" cx="${ult.x * W}" cy="${y(ult.v)}" r="4.5" fill="#fff"/>
    <text class="g-fade" x="${Math.min(W - 2, ult.x * W + 2)}" y="${y(ult.v) - 9}" font-size="11" font-weight="600" fill="#fff" text-anchor="end">${sinal}${Math.round(ult.v)}</text>${marcaMin}${rot}</svg>`;
}

function grafReal(m, r) {
  const W = 326, H = 64; const pts = serieRealIdeal(m);
  const y = v => H - (v / m.alvo) * (H - 4);
  const p = pts.map(o => (o.x * W).toFixed(1) + "," + y(o.y).toFixed(1)).join(" ");
  const ult = pts[pts.length - 1];
  return `<svg class="graf" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" height="${H}">
    <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="rgba(255,255,255,.1)"/>
    <line class="g-fade" x1="0" y1="${H}" x2="${W}" y2="4" stroke="rgba(255,255,255,.5)" stroke-width="1.5" stroke-dasharray="4 5"/>
    <polyline class="g-traco" pathLength="1" points="${p}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle class="g-ponto" cx="${ult.x * W}" cy="${y(ult.y)}" r="5" fill="#fff"/></svg>`;
}

function grafProj(m, r) {
  const max = Math.max(m.alvo * 1.2, r.proj); const W = 326, cx = W / 2, cy = 96, R = 88;
  const ponto = f => { const a = Math.PI + Math.PI * Math.min(1, f); return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; };
  const arco = (f0, f1) => { const [x0, y0] = ponto(f0), [x1, y1] = ponto(f1); return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const fp = r.proj / max, fm = m.alvo / max; const [mx, my] = ponto(fm);
  const a = Math.PI + Math.PI * Math.min(1, fp); const nx = cx + Math.cos(a) * 30, ny = cy + Math.sin(a) * 30;
  const ate = Math.min(fp, fm);
  return `<svg class="graf" viewBox="0 0 ${W} 104" height="104">
    <path d="${arco(0, 1)}" stroke="rgba(255,255,255,.16)" stroke-width="14" fill="none" stroke-linecap="round"/>
    ${fp > fm ? `<path class="g-traco g-arco2" pathLength="1" d="${arco(fm, fp)}" stroke="rgba(255,255,255,.5)" stroke-width="14" fill="none" stroke-linecap="round"/>` : ""}
    <path class="g-traco g-arco" pathLength="1" d="${arco(0, ate)}" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round"/>
    <line class="g-agulha" style="transform-origin:${cx}px ${cy}px;--de:${(-180 * Math.min(1, fp)).toFixed(1)}deg" x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="#fff"/>
    <text x="${cx}" y="${cy - 38}" fill="#fff" font-weight="300" text-anchor="middle"><tspan font-size="30" data-contar="${r.proj}">${r.proj}</tspan><tspan font-size="14" dx="2">/${m.alvo}</tspan></text></svg>`;
}

function linhaMarcos(m, r) {
  const W = 318, x = v => 4 + W * Math.min(1, v / m.alvo);
  const vals = [...new Set([...MARCOS.filter(v => v < m.alvo), m.alvo])];
  let s = `<svg class="graf" viewBox="0 0 326 48" height="48"><rect x="4" y="20" width="${W}" height="3" rx="1.5" fill="rgba(255,255,255,.18)"/><rect class="g-barra" style="transform-origin:4px 0" x="4" y="20" width="${Math.max(0, x(r.feitos) - 4)}" height="3" rx="1.5" fill="#fff"/>`;
  for (const v of vals) { const ok = r.feitos >= v; s += `<circle cx="${x(v)}" cy="21.5" r="6.5" fill="${ok ? "#fff" : "rgba(255,255,255,.25)"}" ${ok ? "" : 'stroke="rgba(255,255,255,.5)" stroke-width="1.5"'}/><text x="${x(v)}" y="44" fill="rgba(255,255,255,${ok ? .85 : .5})" font-size="11" font-weight="500" text-anchor="middle">${v}</text>`; }
  s += `<text x="${Math.min(300, Math.max(26, x(r.feitos)))}" y="9" fill="#fff" font-size="11" font-weight="600" text-anchor="middle">você · ${r.feitos}</text></svg>`;
  return s;
}

function mapaMeta(m) {
  // mesmo desenho do Calendário: 28 dias por linha, do início ao prazo
  const h = hoje(); const dias = new Set(estado.treinos.map(t => t.data));
  const n = difDias(m.inicio, m.prazo) + 1; const cols = Math.ceil(n / Math.ceil(n / 28)); // linhas equilibradas, sem ponto sobrando
  let s = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:3px;max-width:${cols * 16}px">`;
  for (let dt = m.inicio; dt <= m.prazo; dt = somaDias(dt, 1)) {
    let st = "display:block;aspect-ratio:1;border-radius:50%;";
    if (dt > h) st += "background:rgba(255,255,255,.08)"; else st += dias.has(dt) ? "background:#fff" : "background:rgba(255,255,255,.18)";
    s += `<i style="${st}"></i>`;
  }
  return s + "</div>";
}

// ---------- Calendário ----------
function telaCal() {
  const c = ui.cal; const ano = +c.sel.slice(0, 4);
  const anoTs = estado.treinos.filter(t => t.data.startsWith(ano));
  let h = `<section class="tela">`;
  if (c.modo === "ano") {
    h += `<div class="mes-nav"><div class="titulo">${ano}</div><div style="display:flex;gap:8px"><button class="btn-redondo" data-ano="-1">${ic("seta-esq")}</button><button class="btn-redondo" data-ano="1">${ic("seta-dir")}</button></div></div><div class="sub">${anoTs.length} treinos · ${anoTs.filter(t => t.bonus).length} bônus</div>`;
    h += toggleCal() + gradeAno(ano);
  } else {
    const [a, mm] = c.ref.split("-").map(Number); const mesTs = estado.treinos.filter(t => t.data.startsWith(c.ref));
    h += `<div class="mes-nav"><div class="titulo">${mesLongo(a, mm - 1)}${a !== new Date().getFullYear() ? " " + a : ""}</div><div style="display:flex;gap:8px"><button class="btn-redondo" data-mes="-1">${ic("seta-esq")}</button><button class="btn-redondo" data-mes="1">${ic("seta-dir")}</button></div></div>
      <div class="sub">${mesTs.length} treinos · ${mesTs.filter(t => t.bonus).length} bônus</div>` + toggleCal() + gradeMes(a, mm - 1);
  }
  if (!c.aberto) return h + `</section>`; // dia desmarcado: sem detalhes
  h += `<div class="titulo-dia">${comDia(c.sel)}</div>`;
  for (const m of prazosDoDia(c.sel)) { const r = resumo(m);
    h += `<div class="linha prazo-linha" data-meta="${m.id}"><span class="pz-dot" style="background:${corPrazo(m)}"></span><span class="tx"><span class="t1">Prazo · ${esc(m.nome)}</span><span class="t2">${r.feitos} de ${m.alvo} · ${r.est === "batida" ? "meta batida" : r.encerrou ? "encerrada" : r.faltam + (r.faltam === 1 ? " treino falta" : " treinos faltam")}</span></span><span class="seta">›</span></div>`; }
  const ts = treinosDoDia(c.sel);
  for (const t of ts) h += `<div class="linha" data-segurar="${t.id}"><span class="tx"><span class="t1">${TIPOS[t.tipo].nome}${t.bonus ? " · bônus" : ""}</span><span class="t2">${t.hora ? t.hora + " · " : ""}${t.bonus ? "2º treino do dia" : "segure para desfazer"}</span></span>${t.bonus ? '<span class="pt-rosa"></span>' : ""}</div>`;
  if (c.sel <= hoje() && ts.length < 2) h += `<button class="add-dia" data-acao="checkin-dia">${ic("mais", .8)}Adicionar treino neste dia</button>`;
  if (!ts.length && c.sel > hoje()) h += `<p class="vazio-dica">Dia futuro.</p>`;
  return h + `</section>`;
}
function toggleCal() { const m = ui.cal.modo; return `<div class="chips"><button class="chip ${m === "ano" ? "on" : ""}" data-modo="ano">Ano</button><button class="chip ${m === "mes" ? "on" : ""}" data-modo="mes">Mês</button></div>`; }
// Como cada dia aparece nos calendários: treino branco, bônus rosa, coringa com o símbolo.
// período especial do dia: "cj" (semana coberta pelo coringa)
function periodo(d) {
  if (d <= hoje() && diasCoringa().has(inicioSemana(d))) return "cj"; // todos os dias da semana coberta
  return null;
}
function estiloDia(d) {
  const ts = treinosDoDia(d); const per = periodo(d);
  let c;
  if (ts.some(t => t.bonus)) c = "b";
  else if (ts.length) c = { musculacao: "m", cardio: "cd", outro: "o" }[ts[0].tipo];
  else if (per) c = "vz";
  else c = d > hoje() ? "f" : "p";
  return { c, per, txt: c === "vz" && per === "cj" ? "C" : "" };
}
// classes da cápsula: liga dias seguidos do mesmo período dentro da mesma linha
function capsula(d, inicioLinha, fimLinha) {
  const per = periodo(d); if (!per) return "";
  const ini = inicioLinha || periodo(somaDias(d, -1)) !== per, fim = fimLinha || periodo(somaDias(d, 1)) !== per;
  return ` cap cap-${per}${ini ? " ini" : ""}${fim ? " fim" : ""}`;
}
let _cor = null, _corChave = "";
function diasCoringa() { // marca o 1º dia de cada semana coberta pelo coringa
  const k = estado.treinos.length + "|" + hoje() + "|" + estado.ajustes.coringasPorMes + "|" + estado.ajustes.semanaInicio;
  if (k !== _corChave) { _corChave = k; _cor = new Set([...sequencia().cobertas]); }
  return _cor;
}
// prazos de meta no calendário: cor do estado da meta (a mesma do gradiente dela)
const COR_EST = { afrente: "#FE710F", noritmo: "#469D95", apertado: "#4C569F", batida: "#FE851B", agendada: "#8E8E93" };
function prazosDoDia(d) { return estado.metas.filter(m => m.prazo === d); }
function corPrazo(m) { return COR_EST[resumo(m).est] || "#8E8E93"; }
function legendaCal() {
  const it = (c, n) => `<span><i class="lg ${c}"></i>${n}</span>`;
  return `<div class="leg-cal">${it("m", "Treino")}${it("b", "Bônus")}${it("cj", "Coringa")}${it("prazo", "Prazo")}</div>`;
}
function gradeAno(ano) {
  // o ano inteiro em ordem, dia após dia, em 15 fileiras
  const n = difDias(ano + "-01-01", ano + "-12-31") + 1; const cols = Math.ceil(n / 15);
  let s = `<div class="ano" style="--cols:${cols}">`;
  for (let i = 0; i < n; i++) {
    const dt = somaDias(ano + "-01-01", i); const e = estiloDia(dt); const col = i % cols;
    const pz = prazosDoDia(dt)[0];
    s += `<i data-dia="${dt}" class="${e.c}${capsula(dt, col === 0, col === cols - 1 || i === n - 1)} ${dt === hoje() ? "hoje" : ""} ${dt === ui.cal.sel && ui.cal.aberto ? "sel" : ""}${pz ? " prazo" : ""}"${pz ? ` style="--cor:${corPrazo(pz)}"` : ""}></i>`;
  }
  return s + `</div>` + legendaCal();
}
function gradeMes(a, m) {
  const pri = iso(new Date(a, m, 1)); const ult = new Date(a, m + 1, 0).getDate(); const h = hoje();
  const off = (data(pri).getDay() - estado.ajustes.semanaInicio + 7) % 7;
  let s = `<div class="mes">${letrasSemana().map(l => `<span class="ds">${l}</span>`).join("")}`;
  for (let i = 0; i < off; i++) s += "<span></span>";
  for (let d = 1; d <= ult; d++) { const dt = iso(new Date(a, m, d)); const e = estiloDia(dt); const col = (off + d - 1) % 7;
    s += `<button class="dia ${e.c}${capsula(dt, col === 0 || d === 1, col === 6 || d === ult)} ${dt === h ? "hoje" : ""} ${dt === ui.cal.sel && ui.cal.aberto ? "sel" : ""}" data-dia="${dt}">${d}${e.txt ? `<span class="cj-tag">${ic("coringa", .6)}</span>` : ""}${(() => { const pz = prazosDoDia(dt)[0]; return pz ? `<span class="pz-tag ${e.txt || e.c === "b" ? "esq" : ""}" style="--cor:${corPrazo(pz)}"></span>` : ""; })()}</button>`; }
  return s + "</div>" + legendaCal();
}

// ---------- Conquistas ----------
function telaConq() {
  const seq = sequencia(); const fx = faixa(seq); const tot = totalTreinos(); const rec = recordes(); const ehRecorde = seq.atual > 0 && seq.atual >= seq.recorde;
  let h = `<section class="tela"><div class="titulo">Conquistas</div>
  <div class="card-seq grad grad-faixa" style="${G("seq-" + fx.id)}"><div class="rot sombra-txt">Sequência</div>
    <div class="placar"><span class="n">${seq.atual}</span><span class="d sombra-txt">${seq.atual === 1 ? "semana" : "semanas"} ${ehRecorde ? "" : "· recorde " + seq.recorde}</span></div>
    <div style="display:flex;gap:8px">${ehRecorde ? `<span class="chip-v chip-rec">${ic("medalha", .55)}Recorde</span>` : `<span class="chip-v">${fx.nome}</span>`}<span class="chip-l">${ic("coringa", .65)}${seq.coringasDisp} ${seq.coringasDisp === 1 ? "coringa disponível" : "coringas disponíveis"}</span></div></div>
  <div class="grade3">`;
  // mostra os conquistados + os 2 próximos (fecha a linha de 3 junto com a placa de bônus)
  const prox = MARCOS.findIndex(v => tot < v); let fim = prox < 0 ? MARCOS.length : prox + 2;
  while ((Math.min(fim, MARCOS.length) + 1) % 3) fim++;
  for (const v of MARCOS.slice(0, Math.min(fim, MARCOS.length))) { const ok = tot >= v; h += `<button class="marco ${ok ? "grad" : "bloq"}" style="${ok ? G(gradMarco(v)) : ""}" data-marco="${v}">${ok ? `<span class="num-marco" style="--cor:${COR_NUM_MARCO[gradMarco(v)]};color:var(--cor)">${v}</span>` : v}</button>`; }
  h += `<div class="marco grad bonus" style="${G("marco-bonus")}"><span style="display:flex;align-items:center;gap:6px">${ic("estrela", .75)}${totalBonus()}</span><span class="mini">Treinos bônus</span></div></div>
  <div class="card"><h3 style="font-size:15px;font-weight:600;margin-bottom:6px">Recordes</h3>
    <div class="rec"><span class="ic-in"><span class="ic-box">${ic("chama", .6)}</span>Melhor streak semanal</span><b>${rec.seq} semanas</b></div>
    <div class="rec"><span class="ic-in"><span class="ic-box">${ic("chama", .6)}</span>Melhor streak diário</span><b>${rec.dias ? rec.dias + (rec.dias === 1 ? " dia" : " dias") + " · " + mesCurto(+rec.diasFim.slice(5, 7) - 1) : "—"}</b></div>
    <div class="rec"><span class="ic-in"><span class="ic-box">${ic("alvo", .66)}</span>Metas batidas</span><b>${(() => { const b = estado.metas.filter(m => feitosNaMeta(m) >= m.alvo).sort((x, y) => (y.prazo || "").localeCompare(x.prazo || "")); return b.length ? b.length + (b.length === 1 ? " meta" : " metas") + " · " + esc(b[0].nome) : "—"; })()}</b></div>
    <div class="rec"><span class="ic-in"><span class="ic-box">${ic("calendario-circulo", .66)}</span>Mais treinos num mês</span><b>${rec.mes ? rec.mes[1] + " · " + mesCurto(+rec.mes[0].slice(5) - 1) : "—"}</b></div>
    <div class="rec"><span class="ic-in"><span class="ic-box">${ic("estrela", .66)}</span>Mais bônus num mês</span><b>${rec.bonus ? rec.bonus[1] + " · " + mesCurto(+rec.bonus[0].slice(5) - 1) : "—"}</b></div></div></section>`;
  return h;
}

// ---------- folhas ----------
let fecharAtual = null;
function abrirFolha(html, montar, aoFechar) {
  fecharFolha(true);
  camada.innerHTML = `<div class="veu"></div><div class="folha"><div class="folha-in"><div class="alca"></div>${html}</div></div>`;
  const veu = camada.querySelector(".veu"), f = camada.querySelector(".folha");
  requestAnimationFrame(() => { veu.classList.add("on"); f.classList.add("on"); });
  veu.onclick = () => fecharFolha();
  camada.querySelectorAll("[data-fechar]").forEach(b => b.onclick = () => fecharFolha());
  fecharAtual = aoFechar || null;
  if (montar) montar(f);
  return f;
}
function fecharFolha(rapido) {
  const f = camada.querySelector(".folha"), v = camada.querySelector(".veu");
  if (!f) return;
  if (rapido) { camada.innerHTML = ""; return; }
  f.classList.remove("on"); v.classList.remove("on");
  setTimeout(() => { if (camada.querySelector(".folha") === f) camada.innerHTML = ""; }, 300);
  if (fecharAtual) { const c = fecharAtual; fecharAtual = null; c(); }
}
const cab = t => `<div class="cab-folha"><h2>${t}</h2><button class="fechar" data-fechar aria-label="Fechar">${ic("mais", .78)}</button></div>`;

// ---------- check-in ----------
function folhaCheckin(dataIni) {
  let dia = dataIni || hoje();
  let tipo = estado.ajustes.ultimoTipo;
  const desenha = f => {
    const ts = treinosDoDia(dia); const feitos = ts.map(t => t.tipo);
    if (feitos.includes(tipo)) tipo = Object.keys(TIPOS).find(k => !feitos.includes(k)) || tipo;
    const pode = podeRegistrar(dia, tipo);
    const ontem = somaDias(hoje(), -1);
    const chipDia = dia === hoje() ? "hoje" : dia === ontem ? "ontem" : "outro";
    f.querySelector(".folha-in").innerHTML = `<div class="alca"></div>${cab("Novo treino")}
      <div class="dica">${ts.length === 1 ? "Já tem 1 treino neste dia: o 2º, de outro tipo, vira bônus." : "Tipo de sempre e “Hoje” já marcados. É só deslizar."}</div>
      <div class="tipos">${Object.entries(TIPOS).map(([k, t]) => `<button class="tipo grad ${k === tipo ? "sel" : ""}" style="${G(t.grad)}" data-tipo="${k}">
        ${k === tipo ? `<span class="marca sel">${ic("check", 1.1)}</span>` : feitos.includes(k) ? `<span class="marca feito">${ic("check", 1.1)}</span>` : ""}
        <span class="etiqueta">${ic(k, .95)}${t.nome}</span></button>`).join("")}</div>
      <div class="chips"><button class="chip ${chipDia === "hoje" ? "on" : ""}" data-dia="hoje">Hoje</button><button class="chip ${chipDia === "ontem" ? "on" : ""}" data-dia="ontem">Ontem</button><button class="chip ${chipDia === "outro" ? "on" : ""}" data-dia="escolher">${chipDia === "outro" ? curta(dia) : "Escolher…"}</button></div>
      ${pode.ok && pode.bonus ? `<div class="card-bonus grad" style="${G("bonus")}"><span class="etiqueta">${ic("estrela", .8)}Treino bônus</span></div>` : ""}
      ${pode.ok ? `<div class="slide"><span class="txt">Deslize para registrar</span><div class="knob">${ic("seta-dir", .9)}</div></div>` : `<div class="dica" style="text-align:center;padding:10px">${pode.motivo}</div>`}`;
    f.querySelector("[data-fechar]").onclick = () => fecharFolha();
    f.querySelectorAll("[data-tipo]").forEach(b => b.onclick = () => { tipo = b.dataset.tipo; desenha(f); });
    f.querySelectorAll("[data-dia]").forEach(b => b.onclick = () => {
      const v = b.dataset.dia;
      if (v === "hoje") { dia = hoje(); desenha(f); } else if (v === "ontem") { dia = ontem; desenha(f); }
      else folhaData(dia, d => { dia = d; folhaCheckin(dia); });
    });
    const sl = f.querySelector(".slide"); if (sl) montaSlide(sl, (x, y) => confirmaCheckin(dia, tipo, x, y));
  };
  abrirFolha("", desenha);
}

function montaSlide(sl, ok) {
  const k = sl.querySelector(".knob"); let x0 = null, dx = 0; const max = () => sl.clientWidth - k.clientWidth - 12;
  const mover = e => { if (x0 === null) return; dx = Math.max(0, Math.min(max(), e.clientX - x0)); k.style.transform = `translateX(${dx}px)`; };
  k.addEventListener("pointerdown", e => { x0 = e.clientX; k.setPointerCapture(e.pointerId); k.style.transition = "none"; });
  k.addEventListener("pointermove", mover);
  const soltar = () => { if (x0 === null) return; x0 = null; if (dx >= max() - 4) { vibrar([20, 40, 60]); const r = k.getBoundingClientRect(); ok(r.left + r.width / 2, r.top + r.height / 2); } else { k.style.transition = "transform .25s"; k.style.transform = ""; } dx = 0; };
  k.addEventListener("pointerup", soltar); k.addEventListener("pointercancel", soltar);
}

const COR_TIPO = { musculacao: "255,106,26", cardio: "180,234,60", outro: "142,134,242" };
function confirmaCheckin(dia, tipo, ox, oy) {
  const antes = totalTreinos(); const seqAntes = sequencia().atual;
  const placarAnt = Object.fromEntries(metasAtivas().map(m => [m.id, resumo(m).feitos]));
  const t = registrar(dia, tipo); if (!t) return;
  ui.placarAnt = placarAnt;
  ui.batidaNova = metasAtivas().filter(m => placarAnt[m.id] < m.alvo && resumo(m).feitos >= m.alvo).map(m => m.id); // metas que este check-in completou
  fecharFolha(true);
  ui.cal.sel = dia; ui.cal.aberto = true;
  ui.pontoNovo = { dia, bonus: t.bonus }; // o ponto do dia acende na Home quando o "+1" sair
  render();
  const metas = metasAtivas(); const m = metas[0];
  const novo = MARCOS.find(v => antes < v && totalTreinos() >= v);
  const seq = sequencia();
  // explosão de luz da cor do tipo, saindo do botão
  const cor = t.bonus ? "255,46,106" : COR_TIPO[tipo];
  const ex = ox ?? innerWidth / 2, ey = oy ?? innerHeight * 0.8;
  const luz = document.createElement("div"); luz.className = "explosao";
  luz.style.setProperty("--x", ex + "px"); luz.style.setProperty("--y", ey + "px"); luz.style.setProperty("--cor", cor);
  luz.innerHTML = `<span class="onda"></span><span class="onda o2"></span><span class="flash"></span>`;
  document.body.appendChild(luz); setTimeout(() => luz.remove(), 1400);
  const div = document.createElement("div"); div.className = "confirma"; div.style.setProperty("--cor", cor);
  let sub = "";
  if (m) { const r = resumo(m); sub = `<div class="t">${r.feitos} de ${m.alvo}</div><div class="s">${r.faltam ? "faltam " + r.faltam + " · " + r.diasPrazo + " dias" : "meta batida!"}</div>`; }
  div.innerHTML = `<div class="mais1">+1</div><div class="resto">${sub}<div class="tag">${t.bonus ? "Treino bônus" : seq.atual > seqAntes ? "Sequência · " + seq.atual + " semanas" : "Sequência mantida · " + seq.atual + " semanas"}</div></div>`;
  document.body.appendChild(div);
  // o ponto acende e o placar rola quando a Home fica visível (depois do "+1" e, se houver, da tela de novo marco)
  const revela = () => { acendePonto(); rolaPlacares(); celebraMetas(); };
  const fim = () => { div.remove(); if (novo) mostraMarco(novo, () => { revela(); toastDesfazer(t); }); else { revela(); toastDesfazer(t); } };
  div.onclick = fim; setTimeout(() => { if (div.isConnected) fim(); }, 2000);
}

// ponto do dia no card Semana: acende (como na splash); se foi bônus, a bolinha rosa aparece com glow
function acendePonto() {
  const pn = ui.pontoNovo; ui.pontoNovo = null; if (!pn) return;
  const p = app.querySelector(`.ponto[data-d="${pn.dia}"]`); if (!p) return;
  p.classList.remove("espera", "espera-b");
  if (reduzir) return;
  if (pn.bonus) { const b = p.querySelector(".bonus"); if (b) b.classList.add("acende"); }
  else p.classList.add("acende");
}
// meta batida neste check-in: depois que o placar rola, um brilho atravessa o card e o selo "Meta batida" entra com um pulso
function celebraMetas() {
  const ids = ui.batidaNova || []; ui.batidaNova = null;
  for (const id of ids) {
    const card = app.querySelector(`[data-meta="${id}"]`); if (!card) continue;
    const selo = card.querySelector(".selo");
    if (reduzir) { if (selo) selo.classList.remove("espera"); continue; }
    setTimeout(() => { card.classList.add("celebra"); if (selo) { selo.classList.remove("espera"); selo.classList.add("pop"); } vibrar([30, 50, 30]);
      setTimeout(() => card.classList.remove("celebra"), 1400); }, 1300);
  }
}
function mostraMarco(v, depois) {
  const div = document.createElement("div"); div.className = "confirma marco-tela";
  div.innerHTML = `<div class="marco-palco"><div class="marco-big bloqueado"><span class="num">${v}</span><span class="varre"></span></div></div>
    <div class="t txt-in" style="margin-top:10px;--i:0">Novo marco!</div><div class="s txt-in" style="--i:1">${v} treinos · conquistado em ${curta(dataDoMarco(v) || hoje())}</div>
    <button class="pilula txt-in" style="width:200px;height:48px;margin-top:12px;--i:2">Continuar</button>`;
  document.body.appendChild(div);
  const card = div.querySelector(".marco-big"), num = card.querySelector(".num");
  const fim = () => { card.classList.add("brilha"); div.classList.add("pronto"); };
  if (reduzir) { card.classList.remove("bloqueado"); Object.assign(card.style, { backgroundImage: `url(img/grad/${gradMarco(v)}.jpg)`, color: COR_NUM_MARCO[gradMarco(v)] }); fim(); }
  else {
    // 1) entra pequeno e bloqueado  2) vira até 90°  3) troca para o lado colorido  4) termina o giro com mola  5) faixa de luz
    card.animate([{ transform: "scale(.55)", opacity: 0 }, { transform: "scale(.82)", opacity: 1 }], { duration: 260, easing: "ease-out", fill: "forwards" }).onfinish = () => {
      card.animate([{ transform: "scale(.82) rotateY(0deg)" }, { transform: "scale(.9) rotateY(90deg)" }], { duration: 260, easing: "cubic-bezier(.5,0,1,.5)", fill: "forwards" }).onfinish = () => {
        card.classList.remove("bloqueado"); card.classList.add("grad");
        card.style.backgroundImage = `url(img/grad/${gradMarco(v)}.jpg)`; card.style.color = COR_NUM_MARCO[gradMarco(v)];
        vibrar([25, 30, 50]);
        const t0 = performance.now(); const passo = agora => { const k = Math.min(1, (agora - t0) / 600); num.textContent = Math.round(v * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(passo); }; requestAnimationFrame(passo);
        card.animate([{ transform: "scale(.9) rotateY(-90deg)" }, { transform: "scale(1.08) rotateY(8deg)", offset: .7 }, { transform: "scale(1) rotateY(0deg)" }], { duration: 560, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }).onfinish = fim;
      };
    };
  }
  div.querySelector("button").onclick = () => {
    if (reduzir) { div.remove(); depois(); return; }
    card.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.6)", opacity: 0 }], { duration: 260, easing: "ease-in", fill: "forwards" });
    div.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 80, fill: "forwards" }).onfinish = () => { div.remove(); depois(); };
  };
}

let toastTimer;
const sumir = d => { d.classList.add("sai"); setTimeout(() => d.remove(), 230); };
function toastDesfazer(t) {
  document.querySelectorAll(".toast").forEach(x => x.remove());
  const d = document.createElement("div"); d.className = "toast";
  d.innerHTML = `<span>${TIPOS[t.tipo].nome} registrad${t.tipo === "musculacao" ? "a" : "o"}</span><button><b>Desfazer</b></button>`;
  document.body.appendChild(d); clearTimeout(toastTimer);
  d.querySelector("button").onclick = () => { removerTreino(t.id); d.remove(); render(); };
  toastTimer = setTimeout(() => sumir(d), 5000);
}

// Calendário no visual do app (substitui o seletor de data do sistema).
// op: titulo, min, max (padrão: hoje; null = sem limite), dica, voltar (fechar volta para a folha anterior), usar (texto do botão)
function folhaData(atual, escolher, op = {}) {
  const max = op.max === undefined ? hoje() : op.max, min = op.min || null;
  let ref = atual.slice(0, 7); let sel = atual;
  const desenha = f => {
    const [a, m] = ref.split("-").map(Number); const pri = iso(new Date(a, m - 1, 1)); const ult = new Date(a, m, 0).getDate(); const h = hoje();
    const off = (data(pri).getDay() - estado.ajustes.semanaInicio + 7) % 7;
    let g = `<div class="mes">${letrasSemana().map(l => `<span class="ds">${l}</span>`).join("")}`; for (let i = 0; i < off; i++) g += "<span></span>";
    for (let d = 1; d <= ult; d++) { const dt = iso(new Date(a, m - 1, d)); const tem = treinosDoDia(dt).length;
      const fora = (max && dt > max) || (min && dt < min);
      g += `<button class="dia ${fora ? "f" : ""}" ${fora ? "disabled" : ""} style="${dt === sel ? "background:#fff;color:#111;font-weight:600" : tem ? "background:rgba(255,255,255,.22);color:#fff" : "background:var(--sup2)"}" data-d="${dt}">${d}</button>`; }
    g += "</div>";
    f.querySelector(".folha-in").innerHTML = `<div class="alca"></div>${cab(op.titulo || "Quando foi?")}
      <div class="mes-nav"><b style="font-size:15px">${mesLongo(a, m - 1)} ${a}</b><div style="display:flex;gap:8px"><button class="fechar" data-n="-1">${ic("seta-esq", .7)}</button><button class="fechar" data-n="1">${ic("seta-dir", .7)}</button></div></div>${g}
      ${op.dica === "" ? "" : `<div class="dica">${op.dica || "Dias futuros não podem ser escolhidos."}</div>`}<button class="pilula" data-usar>${op.usar || "Usar"} ${curtaAno(sel)}</button>`;
    f.querySelector("[data-fechar]").onclick = () => op.voltar ? op.voltar() : fecharFolha();
    f.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { sel = b.dataset.d; desenha(f); });
    f.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { const d = new Date(a, m - 1 + +b.dataset.n, 1); ref = iso(d).slice(0, 7); desenha(f); });
    f.querySelector("[data-usar]").onclick = () => escolher(sel);
  };
  abrirFolha("", desenha);
}

// ---------- metas ----------
// Criar/editar meta. Para quem não sabe quantos treinos pedir: escolhe a frequência por semana e o prazo,
// e o app calcula o total (que continua editável). O ritmo aparece ao vivo, com um selo de referência.
function semanasMeta(m) { return Math.max(1, (difDias(m.inicio, m.prazo) + 1) / 7); }
function seloRitmo(r) { return r <= 2.5 ? "leve" : r <= 4.5 ? "realista" : r <= 6 ? "puxado" : "muito puxado"; }
function iniciosRapidos() {
  const d = data(hoje());
  return [["Hoje", hoje()], ["Próximo mês", iso(new Date(d.getFullYear(), d.getMonth() + 1, 1))], ["Próximo ano", (d.getFullYear() + 1) + "-01-01"]];
}
function prazosRapidos(inicio) {
  const d = data(inicio), fimMes = m => iso(new Date(d.getFullYear(), d.getMonth() + m, 0));
  const mes = difDias(inicio, fimMes(1)) < 3 ? fimMes(2) : fimMes(1);           // nos últimos dias do mês, usa o próximo
  const tres = somaDias(iso(new Date(d.getFullYear(), d.getMonth() + 3, d.getDate())), -1);
  const anoFim = d.getFullYear() + "-12-31", ano = difDias(inicio, anoFim) < 14 || anoFim === mes ? (d.getFullYear() + 1) + "-12-31" : anoFim;
  return [["Fim do mês", mes], ["3 meses", tres], ["Fim do ano", ano]];
}
function folhaMeta(meta, rascunho) {
  const ed = !!meta;
  const m = rascunho || (meta ? { ...meta } : { id: novoId(), nome: "", alvo: 0, inicio: hoje(), prazo: "", contar: "todos", status: "ativa" });
  if (!ed && !rascunho) { m.prazo = prazosRapidos(m.inicio)[2][1]; m.alvo = Math.max(1, Math.ceil(3 * semanasMeta(m) - 0.05)); }
  const totalPara = v => Math.max(1, Math.ceil(v * semanasMeta(m) - 0.05)); // arredonda para cima: o ritmo nunca fica abaixo da frequência escolhida
  const desenha = f => {
    const rapidos = prazosRapidos(m.inicio);
    const freqAtual = [2, 3, 4, 5].find(v => totalPara(v) === m.alvo);
    f.querySelector(".folha-in").innerHTML = `<div class="alca"></div>${cab(ed ? "Editar meta" : "Nova meta")}
      <div class="campo"><label>Nome</label><input data-c="nome" value="${esc(m.nome)}" placeholder="Ex.: Fim do ano"></div>
      <div class="campo"><label>Começa</label>
        <div class="chips" style="margin-top:4px">${iniciosRapidos().map(([n, v]) => `<button class="chip ${m.inicio === v ? "on" : ""}" data-inicio="${v}">${n}</button>`).join("")}</div>
        <button class="campo-data" data-data="inicio">${ic("calendario", .75)}${curtaAno(m.inicio)}</button></div>
      <div class="campo"><label>Termina</label>
        <div class="chips" style="margin-top:4px">${rapidos.map(([n, v]) => `<button class="chip ${m.prazo === v ? "on" : ""}" data-prazo="${v}">${n}</button>`).join("")}</div>
        <button class="campo-data" data-data="prazo">${ic("calendario", .75)}${curtaAno(m.prazo)}</button></div>
      <div class="campo"><label>Quantas vezes por semana?</label>
        <div class="chips" style="margin-top:4px">${[2, 3, 4, 5].map(v => `<button class="chip ${freqAtual === v ? "on" : ""}" data-freq="${v}">${v}×</button>`).join("")}</div></div>
      <div class="campo"><label>Total de treinos</label><input data-c="alvo" type="number" inputmode="numeric" min="1" value="${m.alvo}"></div>
      <div class="ritmo-vivo"><span class="rv-n"></span><span class="rv-t">por semana</span><span class="rv-selo"></span></div>
      <div class="campo"><label>Contar</label><div class="chips" style="margin-top:4px">${[["todos", "Todos os treinos"], ["dias", "Só dias"], ["cardio", "Só cardio"]].map(([k, n]) => `<button class="chip ${m.contar === k ? "on" : ""}" data-contar="${k}">${n}</button>`).join("")}</div></div>
      <button class="pilula" data-salvar>${ed ? "Salvar alterações" : "Salvar meta"}</button>`;
    const ritmo = () => {
      const r = m.alvo / semanasMeta(m), selo = seloRitmo(r);
      f.querySelector(".rv-n").textContent = "≈ " + r.toFixed(1).replace(".", ",");
      const el = f.querySelector(".rv-selo"); el.textContent = selo; el.dataset.s = selo;
      const fq = [2, 3, 4, 5].find(v => totalPara(v) === m.alvo);
      f.querySelectorAll("[data-freq]").forEach(b => b.classList.toggle("on", +b.dataset.freq === fq));
    };
    ritmo();
    f.querySelector("[data-fechar]").onclick = () => fecharFolha();
    f.querySelectorAll("[data-c]").forEach(i => i.oninput = () => {
      const k = i.dataset.c;
      if (k === "alvo") { m.alvo = Math.max(1, +i.value || 1); ritmo(); return; }
      if (k === "nome") { m.nome = i.value; return; }
      if (!i.value) return;
      const fq = [2, 3, 4, 5].find(v => totalPara(v) === m.alvo); // se veio de uma frequência, mantém a frequência
      m[k] = i.value; if (fq) m.alvo = totalPara(fq);
      desenha(f);
    });
    // datas: abrem o calendário do app; ao escolher (ou fechar) volta para esta folha com tudo preenchido
    f.querySelectorAll("[data-data]").forEach(b => b.onclick = () => {
      const k = b.dataset.data, volta = () => folhaMeta(meta, m);
      if (k === "inicio") { folhaData(m.inicio, d => { mudaInicio(d); volta(); }, { titulo: "Começa", max: null, dica: "", voltar: volta }); return; }
      folhaData(m.prazo, d => { const fq = [2, 3, 4, 5].find(v => totalPara(v) === m.alvo); m.prazo = d; if (fq) m.alvo = totalPara(fq); volta(); },
        { titulo: "Termina", min: somaDias(m.inicio, 1), max: null, dica: "", voltar: volta });
    });
    const mudaInicio = novo => {
      const fq = [2, 3, 4, 5].find(v => totalPara(v) === m.alvo);
      const iq = prazosRapidos(m.inicio).findIndex(([, v]) => v === m.prazo); // o prazo era um atalho? mantém o mesmo atalho
      m.inicio = novo;
      if (iq >= 0) m.prazo = prazosRapidos(novo)[iq][1]; else if (m.prazo <= novo) m.prazo = prazosRapidos(novo)[2][1];
      if (fq) m.alvo = totalPara(fq);
    };
    f.querySelectorAll("[data-inicio]").forEach(b => b.onclick = () => { mudaInicio(b.dataset.inicio); desenha(f); });
    f.querySelectorAll("[data-prazo]").forEach(b => b.onclick = () => { const fq = [2, 3, 4, 5].find(v => totalPara(v) === m.alvo); m.prazo = b.dataset.prazo; if (fq) m.alvo = totalPara(fq); desenha(f); });
    f.querySelectorAll("[data-freq]").forEach(b => b.onclick = () => { m.alvo = totalPara(+b.dataset.freq); desenha(f); });
    f.querySelectorAll("[data-contar]").forEach(b => b.onclick = () => { m.contar = b.dataset.contar; desenha(f); });
    f.querySelector("[data-salvar]").onclick = () => {
      if (!m.nome.trim()) { f.querySelector('[data-c="nome"]').focus(); return; }
      if (m.prazo <= m.inicio) { toastInfo("O prazo precisa ser depois do início."); return; }
      salvarMeta(m); fecharFolha(); render();
    };
  };
  abrirFolha("", desenha);
}

function folhaAcoes(m) {
  abrirFolha(`${cab(esc(m.nome))}
    <button class="linha" data-a="editar"><span class="tx"><span class="t1">Editar meta</span><span class="t2">nome · quantidade · prazo</span></span><span class="seta">›</span></button>
    <button class="linha" data-a="excluir"><span class="tx"><span class="t1 verm">Excluir meta</span><span class="t2">apaga a meta e o progresso</span></span></button>`, f => {
    f.querySelector('[data-a="editar"]').onclick = () => folhaMeta(m);
    f.querySelector('[data-a="excluir"]').onclick = () => { fecharFolha(); alertaExcluir(m); };
  });
}

// alerta no visual do app (no lugar do confirm() do navegador, que alguns ambientes bloqueiam)
function alerta(titulo, texto, rotuloOk, ok) {
  const d = document.createElement("div"); d.className = "alerta";
  d.innerHTML = `<div class="box"><h3>${titulo}</h3>${texto ? `<p>${texto}</p>` : ""}<div class="bts"><button data-n>Cancelar</button><button class="verm" data-s>${rotuloOk}</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector("[data-n]").onclick = () => d.remove();
  d.querySelector("[data-s]").onclick = () => { d.remove(); ok(); };
}
function alertaExcluir(m) {
  const d = document.createElement("div"); d.className = "alerta";
  d.innerHTML = `<div class="box"><h3>Excluir “${esc(m.nome)}”?</h3><p>O progresso desta meta será apagado. Não dá para desfazer.</p><div class="bts"><button data-n>Cancelar</button><button class="verm" data-s>Excluir</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector("[data-n]").onclick = () => d.remove();
  d.querySelector("[data-s]").onclick = () => { excluirMeta(m.id); d.remove(); ui.detalhe = null; render(); };
}

function folhaPrazo(m, r) {
  abrirFolha(`${cab(esc(m.nome) + " terminou")}
    <div style="font-size:48px;font-weight:300;letter-spacing:-.04em">${r.feitos} de ${m.alvo}</div>
    <div class="dica">${Math.round(r.feitos / m.alvo * 100)}% da meta. ${r.feitos >= m.alvo ? "Meta batida!" : "Quer mais alguns dias para fechar?"}</div>
    ${r.feitos < m.alvo ? '<button class="pilula" data-a="estender">Estender prazo</button>' : ""}
    <button class="pilula cinza" data-a="encerrar">Encerrar e guardar</button>`, f => {
    const e = f.querySelector('[data-a="estender"]'); if (e) e.onclick = () => { m.prazo = somaDias(hoje(), 14); salvarMeta(m); fecharFolha(); render(); };
    f.querySelector('[data-a="encerrar"]').onclick = () => { m.status = "encerrada"; salvarMeta(m); fecharFolha(); render(); };
  });
}

// ---------- ajustes ----------
function folhaAjustes() {
  const a = estado.ajustes;
  const l = (k, t1, t2) => `<button class="linha" data-a="${k}"><span class="tx"><span class="t1">${t1}</span><span class="t2">${t2}</span></span><span class="seta">›</span></button>`;
  abrirFolha(`${cab("Ajustes")}
    ${l("metas", "Metas", "editar · excluir")}
    ${l("coringas", "Coringas", Math.min(2, a.coringasPorMes) + " por mês")}
    ${l("faixas", "Faixas de sequência", `Acendendo 1–${a.faixas.acendendo} · Aquecida ${a.faixas.acendendo + 1}–${a.faixas.aquecida} · Em chamas ${a.faixas.aquecida + 1}+`)}
    ${l("semana", "Semana começa em", a.semanaInicio === 0 ? "Domingo" : "Segunda")}
    ${l("conta", "Conta", esc(situacao().email || "") + " · " + textoSync())}`, f => {
    const on = (k, fn) => f.querySelector(`[data-a="${k}"]`).onclick = fn;
    on("metas", folhaMetas);
    on("coringas", () => folhaNumero("Coringas", "Cada coringa protege uma semana sem treino: a sequência não quebra, mas também não sobe. Nunca cobre duas semanas seguidas.", Math.min(2, a.coringasPorMes), 0, 2, v => { a.coringasPorMes = v; }));
    on("faixas", folhaFaixas);
    on("semana", folhaSemana);
    on("conta", folhaConta);
  });
}

function folhaMetas() {
  const ms = metasAtivas(); const enc = estado.metas.filter(m => m.status === "encerrada");
  abrirFolha(`${cab("Metas")}${[...ms, ...enc].map(m => { const r = resumo(m); return `<button class="linha" data-id="${m.id}"><span class="amostra" style="${r.est === "agendada" ? "background:var(--s3)" : G(gradMeta(r))}"></span><span class="tx"><span class="t1">${esc(m.nome)}</span><span class="t2">${r.feitos} de ${m.alvo} · ${m.status === "encerrada" ? "encerrada" : r.est === "batida" ? "meta batida" : r.est === "agendada" ? "começa " + curta(m.inicio) : "até " + curta(m.prazo)}</span></span><span class="seta">›</span></button>`; }).join("")}
    <button class="add-dia" data-nova>${ic("mais", .8)}Nova meta</button><div class="dica">Toque numa meta para editar.</div>`, f => {
    f.querySelectorAll("[data-id]").forEach(b => b.onclick = () => folhaMeta(estado.metas.find(m => m.id === b.dataset.id)));
    f.querySelector("[data-nova]").onclick = () => folhaMeta();
  });
}

function folhaSemana() {
  const a = estado.ajustes;
  const desenha = f => {
    const op = (v, n) => `<button class="linha" data-v="${v}"><span class="tx"><span class="t1">${n}</span></span>${a.semanaInicio === v ? `<span class="marca-op">${ic("check", 1)}</span>` : ""}</button>`;
    f.querySelector(".folha-in").innerHTML = `<div class="alca"></div>${cab("Semana começa em")}<div class="dica">Define a ordem dos dias no calendário e quando cada semana da sequência começa.</div>
      ${op(0, "Domingo")}${op(1, "Segunda")}`;
    f.querySelector("[data-fechar]").onclick = () => fecharFolha();
    f.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { a.semanaInicio = +b.dataset.v; salvar(); desenha(f); });
  };
  abrirFolha("", desenha, () => render());
}

function folhaNumero(titulo, dica, v, min, max, ok) {
  const desenha = f => {
    f.querySelector(".folha-in").innerHTML = `<div class="alca"></div>${cab(titulo)}<div class="dica">${dica}</div>
      <div class="linha"><span class="tx"><span class="t1">${v} por mês</span></span><div class="stepper"><button data-d="-1">−</button><span>${v}</span><button data-d="1">+</button></div></div>`;
    f.querySelector("[data-fechar]").onclick = () => fecharFolha();
    f.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { v = Math.max(min, Math.min(max, v + +b.dataset.d)); ok(v); salvar(); desenha(f); });
  };
  abrirFolha("", desenha, () => render());
}

function folhaFaixas() {
  const fx = estado.ajustes.faixas;
  const desenha = f => {
    const lin = (id, nome, txt, chave) => `<div class="linha"><span class="amostra" style="${G("seq-" + id)}"></span><span class="tx"><span class="t1">${nome}</span><span class="t2">${txt}</span></span>${chave ? `<div class="stepper"><button data-k="${chave}" data-d="-1">−</button><span>${fx[chave]}</span><button data-k="${chave}" data-d="1">+</button></div>` : ""}</div>`;
    f.querySelector(".folha-in").innerHTML = `<div class="alca"></div>${cab("Faixas de sequência")}<div class="dica">Mudam a cor do card Sequência conforme as semanas seguidas.</div>
      ${lin("acendendo", "Acendendo", `de 1 a ${fx.acendendo} semanas`, "acendendo")}
      ${lin("aquecida", "Aquecida", `de ${fx.acendendo + 1} a ${fx.aquecida} semanas`, "aquecida")}
      ${lin("emchamas", "Em chamas", `${fx.aquecida + 1} semanas ou mais`)}
      ${lin("recorde", "Recorde", "igualou ou bateu o recorde")}
      <button class="pilula cinza" data-reset>Restaurar padrão</button>`;
    f.querySelector("[data-fechar]").onclick = () => fecharFolha();
    f.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k; fx[k] += +b.dataset.d; fx.acendendo = Math.max(1, fx.acendendo); fx.aquecida = Math.max(fx.acendendo + 1, fx.aquecida); salvar(); desenha(f); });
    f.querySelector("[data-reset]").onclick = () => { fx.acendendo = 3; fx.aquecida = 7; salvar(); desenha(f); };
  };
  abrirFolha("", desenha, () => render());
}

// ---------- eventos ----------
app.addEventListener("click", e => {
  const el = e.target.closest("[data-aba],[data-acao],[data-meta],[data-dia],[data-modo],[data-mes],[data-ano],[data-marco]"); if (!el) return;
  const d = el.dataset;
  if (d.aba) { if (d.aba === ui.aba) return; const dir = ORDEM_ABAS.indexOf(d.aba) > ORDEM_ABAS.indexOf(ui.aba) ? "dir" : "esq"; ui.abaAnt = ORDEM_ABAS.indexOf(ui.aba); ui.aba = d.aba; window.scrollTo(0, 0); render(dir); return; }
  if (d.acao) { e.stopPropagation();
    const a = d.acao;
    if (a === "checkin") folhaCheckin();
    else if (a === "checkin-dia") folhaCheckin(ui.cal.sel);
    else if (a === "nova-meta") folhaMeta();
    else if (a === "ajustes") folhaAjustes();
    else if (a === "voltar") fecharDetalhe();
    else if (a === "acoes") folhaAcoes(estado.metas.find(m => m.id === d.id));
    return; }
  if (d.meta) { abrirDetalhe(d.meta, el); return; }
  if (d.dia) { // tocar de novo no dia marcado desmarca
    if (ui.cal.sel === d.dia && ui.cal.aberto) ui.cal.aberto = false;
    else { ui.cal.sel = d.dia; ui.cal.aberto = true; if (ui.cal.modo === "mes") ui.cal.ref = d.dia.slice(0, 7); }
    render(); return; }
  if (d.modo) { if (d.modo === ui.cal.modo) return; ui.cal.modo = d.modo; ui.cal.ref = ui.cal.sel.slice(0, 7); render(); const g = app.querySelector(".ano,.mes"); if (g) g.classList.add("tr-grade"); return; }
  if (d.ano) { const s = ui.cal.sel; const na = +s.slice(0, 4) + +d.ano; const dt = new Date(na, +s.slice(5, 7) - 1, Math.min(+s.slice(8), new Date(na, +s.slice(5, 7), 0).getDate())); ui.cal.sel = iso(dt); ui.cal.ref = ui.cal.sel.slice(0, 7); render(); return; }
  if (d.mes) { const [a, m] = ui.cal.ref.split("-").map(Number); ui.cal.ref = iso(new Date(a, m - 1 + +d.mes, 1)).slice(0, 7); render(); return; }
  if (d.marco) { const v = +d.marco; const dt = dataDoMarco(v); toastInfo(dt ? `${v} treinos · conquistado em ${curta(dt)}` : `Faltam ${v - totalTreinos()} treinos para o ${v}`); }
});

// segurar para desfazer (Calendário)
let segTimer;
app.addEventListener("pointerdown", e => { const el = e.target.closest("[data-segurar]"); if (!el) return; segTimer = setTimeout(() => {
  vibrar(20);
  alerta("Desfazer este treino?", "Ele sai do calendário e das metas.", "Desfazer", () => { removerTreino(el.dataset.segurar); render(); }); }, 600); });
["pointerup", "pointerleave", "pointercancel"].forEach(ev => app.addEventListener(ev, () => clearTimeout(segTimer)));

function toastInfo(txt) {
  document.querySelectorAll(".toast").forEach(x => x.remove());
  const d = document.createElement("div"); d.className = "toast"; d.innerHTML = `<span>${txt}</span>`;
  document.body.appendChild(d); clearTimeout(toastTimer); toastTimer = setTimeout(() => sumir(d), 2500);
}

// ---------- conta (Supabase) ----------
let modoEntrada = "entrar";
function telaEntrada() {
  const criar = modoEntrada === "criar"; const s = situacao();
  const aviso = s.erro && /sessão expirou/i.test(s.erro) ? s.erro : "";
  return `<section class="entrada">
    <div class="lg-pts aceso entrada-logo" aria-hidden="true"><i></i><i></i><i></i><i></i><i class="r"></i><i class="v"></i></div>
    <h1 class="entrada-titulo">NoSkip</h1>
    <p class="entrada-sub">${criar ? "Crie sua conta para começar." : "Entre na sua conta para continuar."}</p>
    <form class="card entrada-card" novalidate>
      <input id="e-email" type="email" autocomplete="username" inputmode="email" autocapitalize="off" placeholder="E-mail" aria-label="E-mail">
      <input id="e-senha" type="password" autocomplete="${criar ? "new-password" : "current-password"}" placeholder="Senha${criar ? " (mínimo 6 caracteres)" : ""}" aria-label="Senha">
      ${criar ? '<input id="e-senha2" type="password" autocomplete="new-password" placeholder="Repita a senha" aria-label="Repita a senha">' : ""}
      <div class="entrada-erro" ${aviso ? "" : "hidden"}>${esc(aviso)}</div>
      <button type="submit" class="pilula entrada-ok">${criar ? "Criar conta" : "Entrar"}</button>
    </form>
    <button type="button" class="entrada-troca" data-troca>${criar ? "Já tenho conta" : "Criar conta"}</button></section>`;
}
function ligaEntrada() {
  const f = app.querySelector(".entrada-card"); const erro = f.querySelector(".entrada-erro");
  const mostra = t => { erro.textContent = t; erro.hidden = false; };
  app.querySelector("[data-troca]").onclick = () => { modoEntrada = modoEntrada === "criar" ? "entrar" : "criar"; render(); };
  f.onsubmit = async ev => {
    ev.preventDefault();
    const email = f.querySelector("#e-email").value.trim(), senha = f.querySelector("#e-senha").value, s2 = f.querySelector("#e-senha2");
    if (!email) { f.querySelector("#e-email").focus(); return; }
    if (senha.length < 6) { mostra("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (s2 && s2.value !== senha) { mostra("As senhas não são iguais."); s2.value = ""; s2.focus(); return; }
    const b = f.querySelector(".entrada-ok"); b.disabled = true; b.textContent = "Aguarde…";
    try { if (modoEntrada === "criar") await criarConta(email, senha); else await entrar(email, senha); }
    catch (e) { mostra(e.message); b.disabled = false; b.textContent = modoEntrada === "criar" ? "Criar conta" : "Entrar"; }
  };
}
function textoSync() {
  const s = situacao();
  if (s.sincronizando) return "sincronizando…";
  if (!s.online) return s.pendentes ? "sem internet · " + s.pendentes + " para enviar" : "sem internet";
  if (s.erro) return "erro ao sincronizar";
  if (!s.ultima) return "ainda não sincronizado";
  const min = Math.round((Date.now() - new Date(s.ultima)) / 60000);
  return min < 1 ? "sincronizado agora" : min < 60 ? "sincronizado há " + min + " min" : "sincronizado " + curta(s.ultima.slice(0, 10));
}
function folhaConta() {
  const desenha = f => {
    const s = situacao();
    f.querySelector(".folha-in").innerHTML = `<div class="alca"></div>${cab("Conta")}
      <div class="linha"><span class="tx"><span class="t1">${esc(s.email || "")}</span><span class="t2">${textoSync()}</span></span></div>
      ${s.erro ? `<div class="dica" style="color:var(--rosa)">${esc(s.erro)}</div>` : '<div class="dica">Seus dados ficam salvos na nuvem e sincronizam sozinhos ao abrir o app e a cada mudança.</div>'}
      <button class="pilula escura" data-sync ${s.sincronizando ? "disabled" : ""}>Sincronizar agora</button>
      <button class="linha" data-sair><span class="tx"><span class="t1 verm">Sair da conta</span><span class="t2">os dados saem deste aparelho e continuam na nuvem</span></span></button>`;
    f.querySelector("[data-fechar]").onclick = () => fecharFolha();
    f.querySelector("[data-sync]").onclick = async () => { await sincroniza(); desenha(f); };
    f.querySelector("[data-sair]").onclick = async () => {
      try { await sair(); fecharFolha(true); modoEntrada = "entrar"; render(); } catch (e) { toastInfo(esc(e.message)); }
    };
  };
  abrirFolha("", desenha);
}
// login, logout ou dados chegando de outro aparelho: redesenha (se não houver folha aberta por cima)
let _logado = situacao().logado;
aoMudar((s, chegou) => {
  const trocou = s.logado !== _logado; _logado = s.logado;
  if (trocou) { fecharFolha(true); ui.detalhe = null; render(); return; }
  if (chegou && !camada.querySelector(".folha")) render();
});
iniciaSync();

// atualiza ao virar o dia / voltar ao app
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

render();

// splash: as bolinhas acendem (~1,3 s) e depois:
// - logado: a splash some em fade e mostra a Home;
// - sem login: "âncora" — logo e nome deslizam até o lugar deles no login e o resto aparece em sequência.
(() => {
  const sp = document.getElementById("splash"); if (!sp) return;
  const espera = Math.max(0, 1450 - performance.now());
  setTimeout(() => {
    const alvo = app.querySelector(".entrada-logo"), lg = sp.querySelector(".lg-pts"), g = sp.querySelector(".sp-grupo");
    if (!alvo || !lg || reduzir) { sp.classList.add("sai"); setTimeout(() => sp.remove(), 500); return; }
    const a = lg.getBoundingClientRect(), b = alvo.getBoundingClientRect();
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = b.top - a.top;
    document.body.classList.add("entrada-chegando", "entrada-anima");
    sp.style.transition = "none"; sp.style.pointerEvents = "none";
    sp.animate([{ backgroundColor: "#000" }, { backgroundColor: "rgba(0,0,0,0)" }], { duration: 400, fill: "forwards" });
    g.animate([{ transform: "none" }, { transform: `translate(${dx}px,${dy}px)` }], { duration: 700, easing: EASE, fill: "forwards" })
      .finished.then(() => { document.body.classList.remove("entrada-chegando"); sp.remove(); });
    setTimeout(() => document.body.classList.remove("entrada-anima"), 1400);
  }, espera);
})();
