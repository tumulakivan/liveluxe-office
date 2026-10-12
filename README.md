# Office

Meeting room and boardroom bookings for Live Luxe AU. ("Office" is a working name.)

- **Booking app** (`/`): a day view of Meeting Room 1 and the Boardroom. Click a free time to book it, or click a booking to change or cancel it. **My bookings** lists what you have coming up.
- **Admin dashboard** (`/admin`, admins only): an overview of room usage, **Staff** (add, edit, remove, reset passwords, handle reset requests) and **Bookings** (all bookings a week at a time).

## Running it

Needs Node 24 or newer. There's no database server to install, because it uses Node's built-in SQLite.

```
npm install
npm run dev
```

Open http://localhost:5180. The API runs on :4100 and Vite (on :5180, so it can run next to adVantage on :5173) proxies `/api` to it.

To see the loading placeholders the way people on the hosted app will, slow the API down (development only; ignored in production). In PowerShell:

```
$env:API_DELAY_MS=800; npm run dev
```

For production, build the app and run one process on one port:

```
npm run build
npm start
```

That serves everything on http://localhost:4100 (set `PORT` to change it).

## Accounts

- On first run the database is created at `data/office.db` with the two rooms and the admin account `claudio.pistone`.
- New staff added by an admin start on the default password `liveluxeau` and have to choose their own when they first sign in.
- **Forgot password:** there's no email, so the request appears on the admin dashboard. An admin resets the account to the default password, and the person chooses a new one at their next sign-in.
- Staff change their password under **Account settings** in the top-right menu.

## Demo data

To try the app before adding real people:

```
npm run seed:demo
```

This creates about a dozen made-up staff (on the default password `liveluxeau`) and weekday bookings from last week through the next three weeks. Every booking is between 8am and 5pm, and none of them clash, by room or by person. Running it again replaces the demo data with a fresh random set. To remove it all, including the demo bookings made in the admin's name:

```
npm run seed:demo -- --clear
```

Demo accounts show a **Demo** badge under Admin → Staff, and clearing never touches real accounts or bookings.

## Settings

| Variable | Default | |
|---|---|---|
| `PORT` | `4100` | API / production port |
| `OFFICE_TZ` | `Australia/Sydney` | Office timezone, which decides what "today" and "already started" mean |
| `DB_FILE` | `data/office.db` | Where the database lives |
| `COOKIE_SECURE` | unset | Set to `true` once served over HTTPS |

Booking hours (7am–7pm), the 15-minute grid and the 90-day booking window are in `server/config.ts`.

## Backups

Everything is in `data/office.db`. To back it up, copy that file while the server is stopped.

## Checks

`npm run typecheck`
