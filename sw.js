// Service worker: guarda o app no aparelho para funcionar sem internet.
// Ao mudar qualquer arquivo do app, rode: python3 atualiza-versao.py
const VERSAO = "noskip-20261125000221";
const ARQUIVOS = ["./", "index.html", "manifest.json", "css/app.css", "js/app.js", "js/dados.js", "js/calculo.js", "js/sync.js", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon.png", "icons/favicon.ico", "icons/logo.png", "img/grad/bonus.jpg", "img/grad/cardio.jpg", "img/grad/det-afrente.jpg", "img/grad/det-apertado.jpg", "img/grad/det-batida.jpg", "img/grad/det-noritmo.jpg", "img/grad/marco-10.jpg", "img/grad/marco-100.jpg", "img/grad/marco-20.jpg", "img/grad/marco-30.jpg", "img/grad/marco-50.jpg", "img/grad/marco-bloqueado.jpg", "img/grad/marco-bonus.jpg", "img/grad/meta-afrente.jpg", "img/grad/meta-apertado.jpg", "img/grad/meta-batida.jpg", "img/grad/meta-noritmo.jpg", "img/grad/musculacao.jpg", "img/grad/outro.jpg", "img/grad/primeira.jpg", "img/grad/seq-acendendo.jpg", "img/grad/seq-aquecida.jpg", "img/grad/seq-emchamas.jpg", "img/grad/seq-recorde.jpg", "img/icones/ajustes.svg", "img/icones/alvo.svg", "img/icones/calendario-circulo.svg", "img/icones/calendario.svg", "img/icones/cardio.svg", "img/icones/casa.svg", "img/icones/chama.svg", "img/icones/check.svg", "img/icones/coringa.svg", "img/icones/estrela.svg", "img/icones/mais.svg", "img/icones/medalha.svg", "img/icones/musculacao.svg", "img/icones/outro.svg", "img/icones/seta-dir.svg", "img/icones/seta-esq.svg", "img/icones/trofeu.svg"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rede primeiro (pega atualizações); cache como reserva offline.
self.addEventListener("fetch", ev => {
  if (ev.request.method !== "GET") return;
  if (new URL(ev.request.url).hostname.endsWith("supabase.co")) return; // dados da conta: sempre direto da rede, nunca em cache
  ev.respondWith((new URL(ev.request.url).origin === location.origin ? fetch(ev.request.url, {cache: "no-cache"}) : fetch(ev.request)).then(r => {
    if (r && (r.ok || r.type === "opaque")) { const c = r.clone(); caches.open(VERSAO).then(x => x.put(ev.request, c)); }
    return r;
  }).catch(() => caches.match(ev.request, {ignoreSearch: true}).then(r => r || (ev.request.mode === "navigate" ? caches.match("index.html") : undefined))));
});
