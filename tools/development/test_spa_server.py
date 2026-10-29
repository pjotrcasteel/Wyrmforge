"""Actual HTTP regression: SPA routes can also be parents of static proof pages."""
import tempfile
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen
from spa_server import SpaHandler
from verify_web_assets import unresolved_pointers

class SpaServerTests(unittest.TestCase):
    def test_runtime_asset_guard_rejects_pointer_but_accepts_real_image(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pointer = root / "missing.png"
            pointer.write_bytes(b"version https://git-lfs.github.com/spec/v1\noid sha256:123\nsize 1234\n")
            (root / "real.png").write_bytes(b"\x89PNG\r\n\x1a\n")
            self.assertEqual(unresolved_pointers(root), [pointer])

    def test_asset_directory_does_not_shadow_spa_route(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "index.html").write_text("APP SHELL")
            proof = root / "arena-lab" / "ashfang"
            proof.mkdir(parents=True)
            (proof / "index.html").write_text("PRESERVED PROOF")
            (proof / "atlas.png").write_bytes(b"ATLAS")
            with ThreadingHTTPServer(("127.0.0.1", 0), partial(SpaHandler, directory=directory)) as server:
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                base = f"http://127.0.0.1:{server.server_port}"
                try:
                    for route in ("/arena-lab", "/arena-lab/?seed=1204", "/hunt-lab?play=true", "/arena-lab?seed=1441%26stage%3D5"):
                        with urlopen(base + route) as response:
                            self.assertEqual(response.read(), b"APP SHELL", route)
                    with urlopen(base + "/arena-lab/ashfang/") as response:
                        self.assertEqual(response.read(), b"PRESERVED PROOF")
                    with urlopen(base + "/arena-lab/ashfang/atlas.png") as response:
                        self.assertEqual(response.read(), b"ATLAS")
                    with self.assertRaises(HTTPError) as missing:
                        urlopen(base + "/missing.png")
                    self.assertEqual(missing.exception.code, 404)
                finally:
                    server.shutdown()
                    thread.join()

if __name__ == "__main__":
    unittest.main()
