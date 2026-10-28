"""Kairon's original loopback-only HTTP exercise. No external services."""
from base64 import b64encode
from hmac import compare_digest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPECTED = "Basic " + b64encode(b"trainee:kairon28").decode("ascii")


class TrainingHandler(BaseHTTPRequestHandler):
    server_version = "KaironTraining/1.0"

    def log_message(self, format, *args):
        # Keep the exercise quiet and never record Authorization credentials.
        pass

    def respond(self, status, body, content_type="text/plain; charset=utf-8", challenge=False):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        if challenge:
            self.send_header("WWW-Authenticate", 'Basic realm="Kairon training"')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/":
            self.respond(200, (ROOT / "web/index.html").read_bytes(), "text/html; charset=utf-8")
        elif path == "/health":
            self.respond(200, b"KAIRON-LOCAL-28\n")
        elif path == "/private":
            authorization = self.headers.get("Authorization", "")
            if not compare_digest(authorization.encode("utf-8"), EXPECTED.encode("ascii")):
                self.respond(401, b"Training credentials required\n", challenge=True)
                return
            self.respond(200, b"PRIVATE-ORDERS-28\n")
        else:
            self.respond(404, b"Training route not found\n")


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), TrainingHandler)
    print("Kairon training: http://127.0.0.1:8765 ; stop with Ctrl+C", flush=True)
    try:
        server.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
