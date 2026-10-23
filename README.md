# Mira backend

The Next.js app behind the Mira Chrome extension. One deployment serves two sites:

| Site | What it does |
| --- | --- |
| **accounts.dreamymonk.xyz** | Sign in (Google or email and password), choose a plan, manage businesses, connect the extension. It also serves the API, including the Claude proxy the extension talks to. |
| **dashboard.dreamymonk.xyz** | Admin dashboard: users, blocking, quotas, plans, chat transcripts, model setting. |

`src/proxy.ts` routes by hostname: requests to `dashboard.` are served from `/admin`. The accounts site returns 404 for `/admin` and for the admin API.

## How it fits together

- **Auth:** Firebase Authentication (Google and email/password). The extension signs in by opening `/extension/connect`. That page asks the server for a one-time Firebase custom token and passes it to the extension, which keeps its own session from then on.
- **Claude:** the extension calls `POST /api/claude/v1/messages` with the user's Firebase ID token. The server:
  - checks the account isn't blocked, it has a plan, and this month's quota isn't used up;
  - sets the model and attaches `ANTHROPIC_API_KEY`;
  - streams the response back and records token usage and cost.
  Users never see the key or choose the model.
- **Data:** Cloud Firestore, accessed only by the server (`firestore.rules` denies all direct access):
  - `users/{uid}`: profile, plan, status, custom quota
    - `usage/{YYYY-MM}`: cost and token totals
    - `businesses/{id}`: name and description
      - `notes/{id}`: Mira's memory notes
    - `chats/{id}`: chat transcript text (screenshots stay on the user's device)
  - `plans/{id}`: plans. A Free plan is created automatically on first run.
  - `settings/app`: the model chosen in the dashboard
  - `stats/{YYYY-MM}`: totals for the dashboard
- **Admin:** a single password in `ADMIN_PASSWORD`. Signing in sets a signed, httpOnly cookie that lasts 12 hours. Blocking a user also disables their Firebase login and signs them out everywhere.
- **Quotas:** each plan has a monthly AI credit in US dollars of model cost. The admin can set a custom amount per user. Prices per model live in `src/lib/server/usage.ts` and can be overridden with `MIRA_PRICES`.

## Setup

1. **Firebase:** create a project, then:
   - enable **Authentication** with the Google and Email/Password providers;
   - create a **Firestore** database and deploy `firestore.rules`;
   - in Authentication → Settings → Authorized domains, add `accounts.dreamymonk.xyz`;
   - create a service account key under Project settings → Service accounts.
2. **Environment:** copy `.env.example` to `.env.local` and fill it in. Add the same variables in Vercel → Settings → Environment Variables.
3. **Vercel:** import this repo, then add both domains (`accounts.dreamymonk.xyz` and `dashboard.dreamymonk.xyz`) to the same project.
4. **Extension id:** after publishing the Chrome extension, set `NEXT_PUBLIC_EXTENSION_ID` so only your extension can receive sign-in tokens.

```bash
npm install
npm run dev
```

Locally, the accounts site is at http://localhost:3000 and the admin dashboard is at http://localhost:3000/admin.

## Firestore indexes

The queries use single-field indexes, which Firestore creates automatically. If a query asks for a composite index, Firestore's error log includes a link that creates it.
