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
        # Asset folders can share a SPA route prefix (for example arena-lab/ashfang).
        # Only folders with an actual index are documents; never leak a listing
        # in place of an extensionless application deep link.
        has_index = target.is_dir() and any((target / name).is_file()
                                               for name in ("index.html", "index.htm"))
        if not target.is_file() and not has_index and not Path(relative).suffix:
            self.path = "/index.html"
        super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", default="artifacts/web/wwwroot")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--host", default="127.0.0.1",
                        help="Bind address. Use 0.0.0.0 only on a trusted private network for phone playtests.")
    args = parser.parse_args()
    directory = str(Path(args.directory).resolve())
    with ThreadingHTTPServer((args.host, args.port), partial(SpaHandler, directory=directory)) as server:
        server.serve_forever()


if __name__ == "__main__":
    main()
