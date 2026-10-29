"""Derive monotonically advancing GitHub Pages release versions from the workflow run.

The historic 0.0.179 app was released by 'Deploy Wyrmforge demo' run #422.
Run #423 therefore displays 0.0.180; no source-file edit is needed per release.
"""
import argparse
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
PAGES_BASELINE_RUN = 422


def version_for_pages_run(run_number: int, props_file: Path | None = None) -> str:
    if run_number < PAGES_BASELINE_RUN:
        raise ValueError(f"Pages run {run_number} predates release baseline {PAGES_BASELINE_RUN}")
    props = props_file or ROOT / "Directory.Build.props"
    prefix = ET.parse(props).findtext("./PropertyGroup/VersionPrefix")
    if not prefix or not re.fullmatch(r"\d+\.\d+\.\d+", prefix):
        raise ValueError("Directory.Build.props must define a numeric three-part VersionPrefix")
    major, minor, patch = map(int, prefix.split("."))
    patch += run_number - PAGES_BASELINE_RUN
    if patch > 65534:
        raise ValueError("Release version exceeds .NET assembly version component limit")
    return f"{major}.{minor}.{patch}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Emit GitHub Pages build version to GitHub Actions outputs")
    parser.add_argument("--run-number", type=int, required=True)
    parser.add_argument("--github-output", type=Path, required=True)
    args = parser.parse_args()
    version = version_for_pages_run(args.run_number)
    with args.github_output.open("a", encoding="utf-8") as f:
        f.write(f"version={version}\n")
    print(f"Pages run {args.run_number}: WyrmForge version {version}")


if __name__ == "__main__":
    main()
