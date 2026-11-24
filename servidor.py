# Servidor local para testar no celular pelo Wi-Fi.
# Uso: python3 servidor.py   (depois abra http://IP-DO-MAC:8001 no celular)
import http.server, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()
class Servidor(http.server.ThreadingHTTPServer):
    request_queue_size = 128
Servidor(("0.0.0.0", 8001), SemCache).serve_forever()
