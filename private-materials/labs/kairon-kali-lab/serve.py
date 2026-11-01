"""Kairon учебный HTTP-сервер: только loopback, без выдачи файлов."""
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json

ROOT = Path(__file__).resolve().parent
HOME = """<!doctype html><html lang="ru"><meta charset="utf-8">
<title>Kairon: локальный сайт</title>
<h1>Твой учебный сервер работает</h1>
<p>Это страница из твоей Kali, не из интернета.</p>
<a href="/lesson">Открыть учебную страницу</a></html>"""
LESSON = """<!doctype html><html lang="ru"><meta charset="utf-8">
<title>Kairon: урок</title><h1>Урок открыт</h1><p>HTTP 200. Учебная страница.</p></html>"""


class Handler(BaseHTTPRequestHandler):
    server_version = "KaironLab/1"

    def do_GET(self):
        route = urlsplit(self.path).path
        text = HOME if route == "/" else LESSON if route == "/lesson" else "Учебная страница не найдена"
        status = 200 if route in {"/", "/lesson"} else 404
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8" if status == 200 else "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        runtime = ROOT / "runtime"
        runtime.mkdir(exist_ok=True)
        target = runtime / "access.log"
        record = {
            "time": datetime.now(timezone.utc).isoformat(),
            "peer": self.client_address[0],
            "message": (format % args)[:300],
        }
        line = json.dumps(record, ensure_ascii=True)
        # Ограничение учебного журнала, чтобы забытый сервер не заполнил диск.
        if not target.exists() or target.stat().st_size < 100_000:
            with target.open("a", encoding="utf-8") as output:
                output.write(line + "\n")
        print(line, flush=True)


if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1", 8000), Handler) as server:
        print("Kairon: http://127.0.0.1:8000/ — остановить Ctrl+C", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nУчебный сервер остановлен.", flush=True)
