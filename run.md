# Running StaffFlow on the branch — step by step

This is the plain-language guide for putting StaffFlow on the boss's desktop and opening it
from every employee desktop on the branch network. The full reference (Windows service,
backups, troubleshooting) is `docs/DEPLOY.md`; this file is the short path.

Everything below is typed into **Windows PowerShell** on the host desktop, one line at a
time. PowerShell does not accept two commands joined with `&&`, so never paste two commands on
one line.

---

## Part 1 — One-time setup on the host desktop (the boss's PC)

### 1. Install Node.js and Git

1. Node.js: go to https://nodejs.org and download the **LTS** installer (Node 24 or newer). Run it with the default options.
2. Git: go to https://git-scm.com/download/win and run the installer with the default options.
3. Close every PowerShell window, open a new one, and check both work:

```
node -v
git --version
```

Both must print a version number.

### 2. Get the project

```
cd C:\
git clone https://github.com/ITomarShamma/StaffFlow.git
cd C:\StaffFlow
npm ci
```

`npm ci` downloads the libraries (a few minutes the first time; needs internet).

### 3. Create the settings file

```
copy .env.example .env
notepad .env
```

In Notepad set these lines and save:

```
DATABASE_URL="file:./data/staffflow.db"
SESSION_SECRET="type-a-long-random-sentence-here-nobody-else-knows"
SEED_PASSWORD="Demo1234"
DEMO_CLOCK_MULTIPLIER=""
DEMO_CLOCK_START=""
```

- `SESSION_SECRET`: any long random text. Without it everyone is logged out each time the server restarts.
- `SEED_PASSWORD`: the password every account starts with. Change it to something private before the first real day.
- The two `DEMO_` lines must stay **empty** for real use.

### 4. Create the database with the accounts

```
npm run db:reset
```

This prints the account list once (`agent01` … `agent12`, `lead`, `manager`) with the shared password. Save that output somewhere safe.

### 5. Build and start

```
npm run build
npm start
```

`npm run build` needs internet once (it downloads the Arabic font). `npm start` keeps running
in that window and prints `Network: http://0.0.0.0:3000`. Leave the window open.

Open http://localhost:3000 on the host desktop and log in as `manager` with the shared
password. If the board appears, the server works.

### 6. Let the other desktops reach it

Find the host desktop's address on the branch network:

```
ipconfig
```

Look for **IPv4 Address** under the adapter that is plugged into the branch network, for
example `192.168.1.20`. Write it down — this is the address the employees will use.

Open the firewall port once, in a PowerShell window started with **Run as administrator**:

```
netsh advfirewall firewall add rule name="StaffFlow" dir=in action=allow protocol=TCP localport=3000 profile=private
```

Ask the branch IT contact to give the host desktop a fixed address (a DHCP reservation on the
router), so the address never changes.

---

## Part 2 — On every employee desktop

1. Open Chrome or Edge.
2. Go to `http://192.168.1.20:3000` (use the host's real address from step 6).
3. Bookmark it, or put a shortcut on the desktop.
4. Each agent logs in with their own username (`agent01` … `agent12`) and the shared password. The Team Lead uses `lead`, the Branch Manager uses `manager`.

Agents see only their own screens. If someone types the manager's address they get a
«غير مصرح لك بالوصول إلى هذه الصفحة» page — that is intended.

---

## Part 3 — First-day housekeeping

### Give everyone their own password

On the host desktop, one line per account (the server can keep running):

```
npm run admin -- set-password --username agent01 --password "Pass-for-agent01"
npm run admin -- set-password --username lead --password "Pass-for-lead"
npm run admin -- set-password --username manager --password "Pass-for-manager"
```

### Check names and roles

```
npm run admin -- list
```

To add, rename or disable someone, see `docs/DEPLOY.md` §7. Names and headcount are data,
never code.

---

## Part 4 — Day to day

| Task | What to do |
|---|---|
| Server window closed by mistake | `cd C:\StaffFlow` then `npm start` |
| Keep it running after a reboot, without a window | Install it as a Windows service — `docs/DEPLOY.md` §3 (about ten minutes, needs an administrator PowerShell) |
| Nightly copy of the data | `npm run admin -- backup` (writes `data\backups\staffflow-<date>.db`). `docs/DEPLOY.md` §5 shows how to schedule it |
| Start over with fresh seed data (deletes everything) | stop the server (Ctrl+C in its window), then `npm run db:reset`, then `npm start` |
| Update to a newer version | stop the server, then `git pull`, `npm ci`, `npx prisma migrate deploy`, `npm run admin -- sync`, `npm run build`, `npm start` |

All timestamps are kept in Asia/Damascus regardless of the desktop's own time-zone setting.

---

## Part 5 — Demo mode (only for showing the idea)

Demo mode runs the clock ten times faster so overrun and auto-end happen within a minute,
and gives the Team Lead and Branch Manager a clock-jump control in the app bar. Never use it
on the real database: reset afterwards.

```
npm run demo:fresh
```

That resets the database and starts the demo server in one go. To start the demo clock at a
chosen time on a chosen day (a working day, Sunday to Thursday — "leave for tomorrow" on a
Thursday lands on Friday and costs nothing), first set the start in `.env`:

```
DEMO_CLOCK_MULTIPLIER="10"
DEMO_CLOCK_START="2026-09-15 08:30"
```

then `npm run demo`. Put both lines back to empty before real use.

---

## If something goes wrong

| What you see | What to check |
|---|---|
| Employees cannot open the page, host can | The firewall rule (Part 1 step 6); the host's address; both PCs on the same branch network |
| "table main.User does not exist" | The database was never created or was wiped: stop the server, run `npm run db:reset`, start again |
| "A server error occurred" on every page after an update | The database is missing a setting the new version needs. Run `npm run admin -- sync`, then reload. It adds what is missing without deleting anything |
| "Another next dev server is already running" | An old server window is still open — close it, or `npm start` instead of `npm run demo` |
| Everyone logged out after a restart | `SESSION_SECRET` in `.env` is empty |
| Page is in the wrong font | `npm run build` ran without internet — connect and build again |
| Anything else | `docs/DEPLOY.md` §8 |
