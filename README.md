# StockTracker — frontend

Web interface (React 19 + Vite) for the [stocktracker-api](../stocktracker-api): a watchlist of B3 stocks, quotes, price alerts, notifications and an e-mail digest.

The interface is available in Brazilian Portuguese and English. The language is picked from the browser on the first visit and can be switched on the sign-in pages and under Account (saved in `localStorage`). Numbers and dates follow the chosen language; prices are always in BRL. Messages that the API sends itself (validation errors, for example) are shown as the API wrote them.

## Running

```bash
# 1. Start the API (port 3000) — see the stocktracker-api README
# 2. Frontend
npm install
npm run dev        # http://localhost:5173
```

The API does not enable CORS, so Vite forwards `/api/*` to it (`vite.config.js`). To point at another instance, copy `.env.example` to `.env` and set `API_PROXY_TARGET`. To call an API on another origin directly instead, set `VITE_API_URL`.

Other scripts: `npm run build`, `npm run preview`, `npm run lint` (oxlint).

### Passwords

New passwords (sign-up and reset) must be either:

- at least 15 characters long, with any combination of characters, or
- at least 8 characters long if they include a number and a lowercase letter.

The rule lives in `src/lib/password.js` and matches the one the API enforces. Login does not check it, so accounts created under an older rule can still sign in.

### Password reset

On the "Esqueci minha senha" page, the API answers 404 when the address has no account. The page then says so and links to sign-up with the address filled in. Otherwise the API e-mails a reset link.

The API builds that link from `PASSWORD_RESET_URL`. Point it at this app's reset page, for example `PASSWORD_RESET_URL=http://localhost:5173/redefinir-senha` in the API's `.env`. Without that variable, the e-mail carries only the code, which can be pasted on `/redefinir-senha`. Sending also needs `SMTP_URL` set in the API.

## Structure

```
src/
  api/client.js          API calls, Bearer token, 401 handling
  auth/AuthContext.jsx   session (login, sign-up, expiry, logout across tabs)
  hooks/useAsync.js      loading + periodic refresh (only while the tab is visible)
  hooks/useQuotes.js     quotes in batches of 10; isolates unknown tickers (404)
  hooks/useSearchHistory.js  recent quote searches, per account, in localStorage
  i18n/                  translations (pt-BR.js, en.js), provider and translate()
  lib/format.js          currency, number and date formatting (follows the language)
  lib/password.js        password rule shared by sign-up and reset
  components/            Layout (collapsible sidebar / bottom bar), AuthLayout, modal, toasts, AlertForm
  pages/                 Login, Forgot password, Reset password, Dashboard, Watchlist, Quotes,
                         Alerts, Notifications, Account
```

| Route | Page |
| --- | --- |
| `/login` | Login and sign-up |
| `/esqueci-senha` | Forgot password |
| `/redefinir-senha` | Reset password (opened from the e-mail link) |
| `/` | Dashboard |
| `/watchlist` | Watchlist |
| `/cotacoes` | Quotes |
| `/alertas` | Price alerts |
| `/notificacoes` | Notifications |
| `/conta` | Account |

Responsive layout: full sidebar above 1100px (collapsible, preference saved in `localStorage`), collapsed automatically on tablets, and replaced by a bottom tab bar below 640px. Icons: `lucide-react`.

### Adding a language

Copy `src/i18n/en.js`, translate the values, and register it in `LOCALES` and `LOCALE_NAMES` in `src/i18n/translate.js`. Keys missing from a language fall back to pt-BR. Routes stay in Portuguese (`/cotacoes`, `/alertas`, …) in every language.

### Search history

The quotes page lists the last 8 searches above the results. Only tickers that came back with a quote are saved, so typos stay out. History is stored in `localStorage` per account, so it is not shared across devices.

## Known limitations

- The API has no price history, so there is no intraday chart — the quote screen shows the day's range.
- The free brapi plan restricts some tickers; in those cases the API answers 502 and the interface shows a notice.

## Security (production)

- The JWT is stored in `localStorage` (the API only accepts Bearer tokens). Any XSS would expose it, so:
  - do not use `dangerouslySetInnerHTML` or render HTML coming from the API;
  - serve the app with a Content-Security-Policy, for example:
    `default-src 'self'; img-src 'self' https://icons.brapi.dev data:; connect-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`
    (the CSP is not in `index.html` because React Refresh in dev mode uses an inline script).
- Serve the frontend and the API on the same origin (reverse proxy on `/api`) over HTTPS.
- The password reset token arrives in the URL fragment (`#token=…`), which the browser never sends to servers, and the page removes it from the address bar as soon as it reads it.
- The forgot-password page reveals whether an address has an account. Sign-up already does the same, and the API rate-limits both per IP and per address.
