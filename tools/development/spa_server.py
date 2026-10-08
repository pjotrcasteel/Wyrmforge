"""Serve a published Blazor SPA during browser tests, including clean deep-link paths."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


class SpaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        relative = unquote(urlsplit(self.path).path).lstrip("/")
        target = Path(self.directory) / relative
        if not target.is_file() and not target.is_dir() and not Path(relative).suffix:
            self.path = "/index.html"
        super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", default="artifacts/web/wwwroot")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    directory = str(Path(args.directory).resolve())
    with ThreadingHTTPServer(("127.0.0.1", args.port), partial(SpaHandler, directory=directory)) as server:
        server.serve_forever()


if __name__ == "__main__":
    main()
