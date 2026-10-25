"""Test deterministic source-backed Trampled Earth segment bank and archive protection."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

location = Path(__file__).resolve().parents[1] / "build_trampled_segment_art_bank.py"
spec = importlib.util.spec_from_file_location("segment_art_bank", location)
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class SegmentBankTests(unittest.TestCase):
    def test_three_segments_have_exact_overlap_and_tampering_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            directories = []
            for family in ("grass-moss", "trampled-earth", "wet-mud"):
                folder = home / family
                folder.mkdir()
                rows = []
                for i in range(1, 7):
                    name = (f"grass-moss-ART-CANDIDATE-{i:02d}.png" if family=="grass-moss"
                            else f"{family}-INDEPENDENT-ART-CANDIDATE-{i:02d}.png")
                    yy, xx = np.indices((128,128))
                    pixels = np.stack(((xx+12*i)%256,(yy+23*i)%256,(xx+yy+9*i)%256),axis=-1).astype("uint8")
                    Image.fromarray(pixels).save(folder / name)
                    ref = {"file": name, "sha256": hashlib.sha256((folder/name).read_bytes()).hexdigest()}
                    rows.append({**ref,"approval":"unreviewed","productionUse":False} if family=="grass-moss"
                                else {"approved":False,"independent":ref})
                if family == "grass-moss":
                    report = {"stage":"editable-reproducible-grass-moss-art-candidates",
                              "sourceFamily":family,"ownerApproved":False,"runtimeUse":False,"variants":rows}
                    report_name="grass-moss-candidate-report.json"
                else:
                    report={"status":"unapproved-artwork","family":family,"runtimeUse":False,"variants":rows}
                    report_name=f"{family}-art-candidates.json"
                (folder/report_name).write_text(json.dumps(report))
                directories.append(folder)
            snapshots={p:p.read_bytes() for folder in directories for p in folder.iterdir()}
            receipt=tool.build(*directories,home/"output",side=128,height=320,overlap=32)
            self.assertEqual(len(receipt["variants"]),6)
            self.assertFalse(receipt["runtimeUse"])
            for entry in receipt["variants"]:
                a,b,c=(np.asarray(Image.open(home/"output"/name)) for name in entry["segmentFiles"])
                self.assertEqual(a.shape,(128,128,3))
                self.assertTrue(np.array_equal(a[-32:],b[:32]))
                self.assertTrue(np.array_equal(b[-32:],c[:32]))
                self.assertFalse(entry["approved"])
                self.assertFalse(entry["gameIntegration"])
            self.assertTrue(all(p.read_bytes()==raw for p,raw in snapshots.items()))
            # Outside the two narrow organic source-selection joins the
            # generator must preserve the RGB of the selected source exactly.
            sample = tool._sample([Image.open(directories[0] / f"grass-moss-ART-CANDIDATE-{i:02d}.png")
                                  for i in range(1,7)], 0, 128, 320, 2)
            source = np.asarray(Image.open(directories[0] / "grass-moss-ART-CANDIDATE-01.png"))
            y, x = 12, 43
            self.assertTrue(np.array_equal(sample[y,x].astype("uint8"),
                                            source[(y+128//3+2*13)%128,(x+2*17)%128]))
            with self.assertRaises(ValueError):
                tool.build(*directories,directories[1]/"illegal",side=128,height=320,overlap=32)
            (directories[1]/"trampled-earth-INDEPENDENT-ART-CANDIDATE-01.png").write_bytes(b"tampered")
            with self.assertRaises(ValueError):
                tool.build(*directories,home/"bad",side=128,height=320,overlap=32)


if __name__ == "__main__":
    unittest.main()
