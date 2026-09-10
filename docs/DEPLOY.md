# Deploying StaffFlow v0 on the branch LAN

One Windows desktop (the Team Lead's or the Branch Manager's) hosts the server. Agents open
`http://<LAN-IP>:3000` in a desktop browser. Nothing leaves the LAN.

## 1. Install Node on the host desktop

1. Download the current LTS installer from https://nodejs.org (Node 24 at the time of writing) and run it with the defaults. Leave "Automatically install the necessary tools" unticked.
2. Open a new PowerShell window and check:
   ```
   node -v
   npm -v
   ```

## 2. Get the code and build

```
git clone <repo> C:\StaffFlow
cd C:\StaffFlow
npm ci
copy .env.example .env
```

Edit `.env`:

| Key | Set to |
|---|---|
| `DATABASE_URL` | leave `file:./data/staffflow.db` |
| `SESSION_SECRET` | a long random string (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Without it every restart logs everyone out. |
| `SEED_PASSWORD` | the password the seeded accounts get on reset |
| `DEMO_CLOCK_MULTIPLIER` | leave empty in production; `10` only for a demo |
| `DEMO_CLOCK_START` | leave empty in production |

Then:

```
npm run db:reset      # creates data\staffflow.db, applies migrations, seeds; prints the accounts once
npm run build         # needs internet once (Google Fonts are downloaded and self-hosted at build time)
npm start             # http://0.0.0.0:3000 — Ctrl+C to stop; the service below replaces this
```

Change the seeded passwords straight away (see §7).

Windows PowerShell 5.1 does not accept `&&` between commands: run them one per line, or use
`npm run demo:fresh` (reset + demo in one npm script) when you want a clean demo database.

## 3. Run as a Windows service — NSSM

**Why NSSM and not pm2:** NSSM is one executable that turns any command into a real Windows
service with auto-start, auto-restart and log files, and it needs no global npm packages,
no PowerShell execution-policy changes and no extra Windows service shim. pm2 on Windows
needs `pm2-windows-service` plus a global install, and its daemon runs under the logged-in
user rather than as a service. On a locked-down branch desktop NSSM is the smaller surface.

1. Download NSSM from https://nssm.cc/download, unzip, and copy `win64\nssm.exe` to `C:\StaffFlow\tools\nssm.exe`.
2. In an **administrator** PowerShell:
   ```
   cd C:\StaffFlow
   .\tools\nssm.exe install StaffFlow "C:\Program Files\nodejs\npm.cmd" "start"
   .\tools\nssm.exe set StaffFlow AppDirectory C:\StaffFlow
   .\tools\nssm.exe set StaffFlow AppStdout C:\StaffFlow\logs\out.log
   .\tools\nssm.exe set StaffFlow AppStderr C:\StaffFlow\logs\err.log
   .\tools\nssm.exe set StaffFlow AppRotateFiles 1
   .\tools\nssm.exe set StaffFlow AppRotateBytes 10485760
   .\tools\nssm.exe set StaffFlow Start SERVICE_AUTO_START
   .\tools\nssm.exe set StaffFlow AppExit Default Restart
   mkdir logs
   .\tools\nssm.exe start StaffFlow
   ```
3. Check: `.\tools\nssm.exe status StaffFlow` → `SERVICE_RUNNING`, and open `http://localhost:3000`.

The service reads `.env` from `C:\StaffFlow`. `npm start` binds to `0.0.0.0:3000` (all
interfaces). To change the port edit the `start` script in `package.json` and restart the
service: `.\tools\nssm.exe restart StaffFlow`.

## 4. LAN address and firewall

1. Give the host a fixed LAN IP (DHCP reservation on the branch router, or a static address in the adapter settings) so the URL never changes.
2. Allow inbound TCP 3000 on the private profile only (administrator PowerShell):
   ```
   netsh advfirewall firewall add rule name="StaffFlow" dir=in action=allow protocol=TCP localport=3000 profile=private
   ```
3. From another desktop on the LAN open `http://<LAN-IP>:3000`. Bookmark it on every agent desktop.

Plain HTTP on the LAN is the v0 decision (spec §11). The login cookie is `HttpOnly`,
`SameSite=Lax`, not `Secure`; do not expose the port beyond the LAN.

## 5. Where the data lives, and the nightly copy

- The whole database is one file: `C:\StaffFlow\data\staffflow.db` (plus `-wal` / `-shm` journals while the server runs).
- Never copy the `.db` file with Explorer while the service is running — the copy can be inconsistent. Use the online backup:
  ```
  cd C:\StaffFlow
  npm run admin -- backup
  ```
  which writes `data\backups\staffflow-YYYY-MM-DD.db`.
- Nightly: Task Scheduler → Create Basic Task → "StaffFlow backup" → Daily 23:30 → Start a program:
  - Program: `C:\Program Files\nodejs\npm.cmd`
  - Arguments: `run admin -- backup`
  - Start in: `C:\StaffFlow`
  Tick "Run whether user is logged on or not". Copy `data\backups` to a network share or USB drive weekly; delete copies older than a month.
- Restore: stop the service, replace `data\staffflow.db` with a backup file (delete `-wal` and `-shm`), start the service.

## 6. Reset, demo mode, upgrades

- **Reset to seed data** (wipes all sessions and leave):
  ```
  .\tools\nssm.exe stop StaffFlow
  npm run db:reset
  .\tools\nssm.exe start StaffFlow
  ```
- **Demo mode** (10× clock, start at a chosen time): stop the service, then in a normal PowerShell:
  ```
  $env:DEMO_CLOCK_START = "2026-09-15 08:30"
  npm run demo
  ```
  The Team Lead and Branch Manager get a clock-jump control in the app bar. Do not run demo mode against the production database — reset afterwards.
- **Upgrade**: `git pull`, `npm ci`, `npx prisma migrate deploy`, `npm run admin -- sync`, `npm run build`, restart the service.

  `npm run admin -- sync` adds break types and configuration keys introduced by the new
  version. It never overwrites a value you have tuned and never touches users, sessions or
  leave. Skipping it after an upgrade that adds a configuration key makes every page fail
  with a server error, because a missing key is refused rather than silently defaulted.

## 7. Changing caps or accounts without code

All with the service running (`cd C:\StaffFlow` first):

```
npm run admin -- list
npm run admin -- set-password --username agent01 --password "NewPass123"
npm run admin -- add-agent --username agent13 --name "اسم الموظف" --gender female --password "Pass123"
npm run admin -- deactivate --username agent13
npm run admin -- activate --username agent13
npm run admin -- set-cap --general 3
npm run admin -- set-cap --toilet-female 2 --toilet-male 2
npm run admin -- sync
npm run admin -- show-config
npm run admin -- set-config --key working_days --value "6,0,1,2,3,4"
```

The general cap is also changed live by the Team Lead on the board (1 / 2 / 3). Break
parameters, work hours and leave rules live in the `BreakType` and `Config` tables; edit
`prisma/seed-data.ts` and reset, or update the rows with any SQLite tool while the service
is stopped.

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| Site unreachable from other desktops | `nssm status StaffFlow`; the firewall rule; the host's IP |
| Everyone logged out after a restart | `SESSION_SECRET` missing in `.env` |
| "database is locked" in `logs\err.log` | another process (a copy, a SQLite tool) has the file open — close it |
| Wrong time / day boundaries | the host's clock and time zone; the app works in Asia/Damascus regardless of the host's zone |
| Fonts look wrong | the build machine had no internet when `npm run build` ran — rebuild online |
