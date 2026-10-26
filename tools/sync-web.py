#!/usr/bin/env python3
"""Refreshes web/ (the dashboards demo) from a clone of the website repository (mochiematchaaa/mochiematchaaa.github.io).
Usage:  python3 tools/sync-web.py ../mochiematchaaa.github.io
Copies the real CSS/JavaScript/images, the demo backend (sample data, no database) and the two demo pages. Nothing that
talks to Supabase is copied (supabase-config.js is left out on purpose)."""
import os, re, shutil, sys
src = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "../mochiematchaaa.github.io")
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(here, "web")
os.makedirs(out, exist_ok=True)
for f in ("shared.js", "core.js", "admin.js", "admin-more.js", "admin-notify.js", "import-lists.js", "maintenance.js", "resident.js",
          "admin.css", "resident.css", "profile-refresh.css", "rh-extra.css", "logo.jpg", "resident-login-bg.jpg"):
    shutil.copy(os.path.join(src, f), os.path.join(out, f))
shutil.copy(os.path.join(src, "demo", "demo-backend.js"), os.path.join(out, "demo-backend.js"))
shutil.copy(os.path.join(src, "demo", "export-all.js"), os.path.join(out, "export-all.js"))
# The pages are made from the REAL pages of the website, so the demo always has the same features (import, notify,
# maintenance...). Only the database is swapped for demo-backend.js.
for name in ("admin.html", "resident.html"):
    s = open(os.path.join(src, name), encoding="utf-8").read()
    s = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/[^"]*"></script>\n?', '', s)
    s = re.sub(r'<script src="supabase-config\.js"></script>\n?', '', s)
    s = s.replace('<script src="shared.js', '<script src="demo-backend.js?v=9"></script>\n<script src="shared.js', 1)
    if name == "admin.html":
        s = re.sub(r'(<script src="import-lists\.js[^"]*"></script>)', r'\1\n<script src="export-all.js?v=6"></script>', s, count=1)
    s = s.replace('<title>', '<title>DEMO · ', 1)
    s = s.replace('<head>', '<head>\n<meta name="robots" content="noindex">', 1)
    s = s.replace('href="index.html"', 'href="../index.html"')
    open(os.path.join(out, name), "w", encoding="utf-8").write(s)
print("web/ refreshed from", src)
