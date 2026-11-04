"""Six mutually compatible Grass/Moss art tiles, not a world or lighting system."""
import importlib.util
import sys
import unittest
from pathlib import Path

import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / "build_grass_moss_compatible_bank.py"
sys.path.insert(0, str(SCRIPT.parent))
SPEC = importlib.util.spec_from_file_location("build_grass_moss_compatible_bank", SCRIPT)
BANK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BANK)


class CompatibleArtBankTests(unittest.TestCase):
    def test_mixed_adjacent_edges_all_match_exactly(self):
        rng = np.random.default_rng(27)
        prototypes = [rng.integers(15, 150, (96, 96, 3), dtype=np.uint8) for _ in range(6)]
        # Give every source identical, internally periodic edges; interiors can differ.
        for p in prototypes:
            p[0] = prototypes[0][0]
            p[-1] = prototypes[0][0]
            p[:, 0] = prototypes[0][:, 0]
            p[:, -1] = prototypes[0][:, 0]
        original = [p.copy() for p in prototypes]
        converted = BANK.shared_edge_bank(prototypes, band=8)
        self.assertEqual(len(converted), 6)
        for a in converted:
            for b in converted:
                self.assertEqual(BANK.edge_pair_error(a, b), {
                    "rightIntoLeftMeanRgbGap": 0,
                    "bottomIntoTopMeanRgbGap": 0,
                })
        for before, after in zip(original, prototypes):
            np.testing.assert_array_equal(before, after)
        self.assertEqual(BANK.bank_contact(converted).size, (900, 900))

    def test_no_neutral_albedo_or_runtime_assumptions_in_art_bank(self):
        prototype = [np.full((96, 96, 3), (20 + n, 50 + n, 30 + n), dtype=np.uint8) for n in range(6)]
        bank = BANK.shared_edge_bank(prototype, band=8)
        for entry in bank:
            self.assertEqual(entry.shape, (96, 96, 3))
        self.assertFalse(np.array_equal(bank[0][48, 48], bank[5][48, 48]))
        self.assertTrue(np.array_equal(bank[0][:, 0], bank[5][:, 0]))

    def test_reject_missing_sources_and_invalid_band(self):
        tiles = [np.zeros((96, 96, 3), dtype=np.uint8) for _ in range(6)]
        with self.assertRaises(ValueError):
            BANK.shared_edge_bank(tiles[:5])
        with self.assertRaises(ValueError):
            BANK.shared_edge_bank(tiles, band=13)
        with self.assertRaises(ValueError):
            BANK.shared_edge_bank(tiles, band=4)
        with self.assertRaises(ValueError):
            BANK.shared_edge_bank([np.zeros((96, 96, 1), dtype=np.uint8)] * 6)


if __name__ == "__main__":
    unittest.main()
