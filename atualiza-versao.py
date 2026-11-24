# Carimba uma versão nova (?v=N) nos arquivos, para o celular não ficar preso numa cópia antiga.
# Uso: python3 atualiza-versao.py   (rode depois de mudar qualquer arquivo do app)
import os, re, time
raiz = os.path.dirname(os.path.abspath(__file__)); v = time.strftime("%Y%m%d%H%M%S")
def troca(c, p, n):
    f = os.path.join(raiz, c); t = open(f, encoding="utf-8").read(); open(f, "w", encoding="utf-8").write(re.sub(p, n, t))
for nome in os.listdir(os.path.join(raiz, "js")):
    if nome.endswith(".js"): troca("js/" + nome, r'from "(\./[^"?]+\.js)(\?v=\d+)?"', r'from "\1?v=' + v + '"')
troca("index.html", r'(js/app\.js|css/app\.css)(\?v=\d+)?"', r'\1?v=' + v + '"')
troca("sw.js", r'const VERSAO = "[^"]*"', 'const VERSAO = "noskip-' + v + '"')
print("versão", v)
