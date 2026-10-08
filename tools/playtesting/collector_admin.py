#!/usr/bin/env python3
"""Private Cloudflare collector dashboard and optional JSON export. No third-party dependencies."""
import argparse
from collections import Counter
from html import escape
import json
import os
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def request_json(base, path, token):
    request = Request(base.rstrip("/") + path, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/json",
    })
    try:
        with urlopen(request, timeout=20) as result:
            return json.load(result)
    except HTTPError as error:
        raise RuntimeError(f"Collector returned HTTP {error.code} for {path}") from error
    except URLError as error:
        raise RuntimeError("Collector is unreachable; verify HTTPS endpoint and connectivity") from error


def dashboard(summary):
    totals = summary.get("aggregate", {})
    issues = summary.get("issues", [])
    intent = summary.get("replayIntent", [])
    def metric(title, value):
        return f'<article><span>{escape(title)}</span><strong>{escape(str(value if value is not None else "—"))}</strong></article>'
    def bars(title, records, label):
        maximum = max((int(item.get("count", 0)) for item in records), default=1)
        rows = "".join(f'<div class="barline"><span>{escape(str(item.get(label, "Unknown")))}</span>'
            f'<i><b style="width:{int(item.get("count", 0))/max(1,maximum)*100:.1f}%"></b></i>'
            f'<em>{int(item.get("count", 0))}</em></div>' for item in records)
        return f'<section><h2>{escape(title)}</h2>{rows or "<p>No answers yet.</p>"}</section>'
    return f"""<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>WyrmForge — private playtest dashboard</title>
<style>
body{{background:#120f19;color:#ede0f3;font:16px system-ui,sans-serif;max-width:950px;margin:0 auto;padding:28px 18px}}
h1,h2{{font-family:Georgia,serif}}p,small{{color:#ad9eb8;line-height:1.5}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}}
article,section{{background:#231b2d;border:1px solid #52405e;border-radius:14px;padding:20px;margin:14px 0}}
article span{{display:block;color:#b7a1c4;font-size:.78rem}}article strong{{display:block;font-size:2rem;color:#d7b2fc}}
.barline{{display:grid;grid-template-columns:130px 1fr 35px;gap:10px;align-items:center;margin:12px 0}}
.barline span{{font-size:.85rem;overflow-wrap:anywhere}}.barline i{{height:13px;border-radius:10px;background:#3b2e48;overflow:hidden}}
.barline b{{display:block;height:100%;background:#ba83e3;border-radius:10px}}.barline em{{font-size:.75rem}}
</style>
<h1>WyrmForge community playtests</h1>
<p>Private snapshot. Reports were voluntarily submitted; these figures are not population-level telemetry.</p>
<div class="grid">
{metric("Reports", totals.get("reports", 0))}
{metric("Enjoyment / 5", totals.get("enjoyment"))}
{metric("Clarity / 5", totals.get("clarity"))}
{metric("Run samples shared", totals.get("sharedRunSamples", 0))}
</div>
{bars("What needs attention", issues, "area")}
{bars("Would they play again?", intent, "replay")}
<small>Do not publish this dashboard or exported reports. Keep raw comments in restricted files only.</small>
</html>"""


def main():
    parser = argparse.ArgumentParser(description="Fetch a private WyrmForge collector dashboard")
    parser.add_argument("--url", required=True, help="HTTPS Worker root URL, without /v1/reports")
    parser.add_argument("--dashboard", type=Path, default=Path("playtest-reports/dashboard.html"))
    parser.add_argument("--export-dir", type=Path, help="Optional private directory to save individual report JSONs")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()
    parsed = urlsplit(args.url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.query or parsed.fragment:
        parser.error("Collector URL must be HTTPS without query/fragment")
    token = os.environ.get("WYRMFORGE_COLLECTOR_ADMIN_TOKEN")
    if not token:
        parser.error("Set WYRMFORGE_COLLECTOR_ADMIN_TOKEN in your terminal environment, never in source code")
    try:
        summary = request_json(args.url, "/v1/admin/summary", token)
        if args.export_dir:
            size = min(100, max(1, args.limit))
            payload = request_json(args.url, f"/v1/admin/reports?limit={size}", token)
            args.export_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
            for report in payload.get("reports", []):
                identity = report.get("id", "")
                if not isinstance(identity, str) or not identity.replace("-", "").isalnum():
                    continue
                destination = args.export_dir / f"{identity}.json"
                fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd, "w", encoding="utf-8") as stream:
                    json.dump(report, stream, ensure_ascii=False, indent=2)
                    stream.write("\n")
        args.dashboard.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        fd = os.open(args.dashboard, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(dashboard(summary))
        print(f"Private dashboard written to {args.dashboard}")
        if args.export_dir:
            print(f"Private report exports written to {args.export_dir}")
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
