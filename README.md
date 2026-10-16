# ResidentHub Demo

A **preview-only** copy of ResidentHub (Condominium Management and Facility Booking System for City Residences Condominium Corporation, capstone project of Team LockedIn). It uses **made-up sample data only and has no database**: nothing is saved anywhere except in the visitor's own browser, and nothing here can touch the real system.

Open it: `https://mochiematchaaa.github.io/residenthub-demo/`

| Part | What it is | Where it comes from |
|---|---|---|
| `index.html` | Demo home with the three links | this repo |
| `web/` | The administrator and resident dashboards (website version) with sample data. `web/demo-backend.js` replaces the database and holds the sample data in the browser. | copied from the website repository by `tools/sync-web.py` |
| `app/` | The ResidentHub app (web build) with sample data. Sign-in shows "Try as Administrator" and "Try as Resident". | built by the GitHub Action from the app repository `mochiematchaaa/Residenthub` with `--dart-define=DEMO=true` |

Demo logins (password `Demo@1234`): `admin@demo.test` and `resident@demo.test` (Unit 3B). `web/admin.html?as=admin` and `web/resident.html?as=resident` sign in directly.

## Turn it on (once)
In this repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**. Then run the workflow **Publish the demo** (Actions tab) or push any change. The first app build takes a few minutes.

## Update it
- Dashboards changed in the website repository: `python3 tools/sync-web.py ../mochiematchaaa.github.io`, then commit and push.
- App changed: nothing to do, run the workflow again (it builds the latest app source).
