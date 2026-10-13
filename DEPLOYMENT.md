# Deployment handoff

This is an operational handoff, not the school project documentation. The repository is prepared for two Vercel projects and MongoDB Atlas. Nothing has been deployed by this preparation step.

## Joseph: finish this part first

1. Keep `server/.env` unchanged for local development. Never put credentials into GitHub or this file.
2. Open two VS Code terminals. In the first run `cd server` then `node server.js`. If a server is already running, stop that process with Ctrl+C before restarting. In the second run `cd client` then `npm run dev` (or `npm.cmd run dev` if PowerShell blocks npm).
3. Open http://127.0.0.1:5173. Check login, booking, a customer reschedule request and the assigned barber's approval. The original time must remain reserved until approval. Do not launch another frontend if port 5173 is already in use.
4. From the repository root, review and push the changes:

   ```powershell
   git status
   git diff --check
   git add .
   git diff --cached --stat
   git diff --cached --name-only
   git commit -m "Prepare Vercel deployment and barber reschedule approval"
   git push origin main
   ```

   Before committing, check the staged filenames: `.env.example` is safe, but actual `.env` files must not be staged. Root and folder ignore rules exclude environment files, dependencies, and `.vercel` credentials. Review all staged changes; do not include unrelated work. If push is rejected because a colleague pushed first, fetch and reconcile their changes without force-pushing.
5. Send your colleague the repository link and the Codex prompt at the end of this file. Share database access privately, outside the prompt. Do not send your Vercel/GitHub password.

## Colleague: deploy after pulling Joseph's changes

### 1. Repository and account access

- Use your own GitHub and Vercel accounts. Pull the latest `main` from the shared repository, or clone it if this is your first checkout.
- Confirm you have permission to import the repository and install/authorize the Vercel GitHub integration. A GitHub collaborator cannot always authorize an integration for the repository owner.
- Check the current Vercel plan rules before relying on multi-author automatic deployment: private repositories on Hobby restrict deployments to commits authored by the Vercel project owner; private GitHub organization repositories require an eligible plan. Use a suitable Pro team with the contributors added when keeping a private collaborative repository. Do not change repository visibility or falsify commit authors to bypass access restrictions.
- Use Node.js 22.x, matching both package.json engine settings.

### 2. Create two Vercel projects from the same repository

Create the backend first. Reserve the frontend project/name as well so you can copy its actual assigned production domain. Example names below are illustrative; use the domains Vercel actually assigns, not guessed names.

| Setting | Backend | Frontend |
| --- | --- | --- |
| Root Directory | `server` | `client` |
| Framework Preset | **Other** | **Vite** |
| Node.js | 22.x | 22.x |
| Install | `npm ci` | `npm ci` |
| Build | Empty/disabled; configuration supplies this | `npm run build` |
| Output | `public` | `dist` |
| Configuration | `server/vercel.json` | `client/vercel.mjs` |
| Production Branch | `main` | `main` |

The backend deliberately uses an explicit Node.js function at `api/handler.js` to run the existing Express app. Do not select the Express preset or replace the app factory. `node server.js` remains the local startup command; Vercel does not run a permanent local server.

### 3. Set backend environment variables

Enter these in the **backend project's Production environment**, privately in Vercel:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas connection string with the intended application database explicitly selected |
| `JWT_SECRET` | A random secret of at least 32 characters; generate it privately |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | Exact frontend production origin, e.g. `https://your-shop.vercel.app`, with no trailing slash/path |

Keep the same JWT secret across routine deployments. Changing it signs everyone out. Do not prefix secrets with `VITE_`. `PORT`, `ADMIN_PASSWORD`, `BARBER_PASSWORD`, and seed credentials are not needed for normal deployment. Existing Atlas accounts and appointments stay in the selected database; do not rerun the seed just to deploy.

Allow the hosting network through Atlas Network Access and use a database user limited to the application's database. Your laptop's allowed IP does not cover Vercel. Default Vercel outbound addresses are dynamic. If using `0.0.0.0/0` for the school demonstration, understand that this allows connection attempts from anywhere; authentication still applies. Restricted IP access requires an appropriate static outbound IP setup. Never post the connection string in logs, screenshots, this document, or a Codex prompt.

Deploy the backend. Visit `https://YOUR-BACKEND/api/health`: expect `{"status":"ok","database":"connected"}`. The bare `/` backend URL is not an application page and may return 404.

### 4. Set the frontend variable and deploy

In the **frontend project's Production environment**, add:

```text
BACKEND_ORIGIN=https://YOUR-BACKEND.vercel.app
```

Use the backend's stable production domain, not a commit/preview URL. Do not append `/api`, include credentials, or point this at the frontend itself. The frontend config reads this at deployment time and creates the proxy rewrite; it intentionally fails for missing/invalid values. Local `npm run dev` does not need this variable.

Deploy the frontend. Compare its actual production origin with backend `CLIENT_ORIGIN`; correct and redeploy the backend if necessary. Environment changes require a new deployment to take effect.

Verify `https://YOUR-FRONTEND/api/health` returns JSON, not HTML or a Vercel sign-in page. Both API routes and React deep links must work through the frontend. For this public school demo the backend production endpoint must be accessible to the frontend proxy; check Deployment Protection if it returns Vercel authentication instead of JSON. Do not expose preview environments or bypass protection by placing secrets in browser code.

### 5. Test the live production URL together

Use disposable test customer accounts and future bookings. Do not delete shared data to test.

- Registration, login, page refresh while logged in, logout, and denial of authenticated access after logout.
- `/appointments` opens directly and survives browser refresh.
- Booking is immediately confirmed. Different service durations, lunch 12–1 PM, working hours, and barber time off are respected.
- Two customers competing for the same slot cannot both book it.
- Rescheduling creates a pending request. Original booking remains; the requested time is available to others.
- Assigned barber can approve/decline; customer can withdraw; other users cannot decide it.
- If another customer books the requested time first, approval fails and the original booking remains.
- Test from two separate browser profiles/private windows so customer and barber cookies do not overwrite one another.
- Verify repeated authentication from one test client does not block a different network's client. The handler uses Vercel's validated `x-real-ip` header for its per-instance limiter; verify visitor identity survives the frontend-to-backend rewrite on the live platform. Local HTTP tests cannot prove that platform hop.

### 6. Confirm automatic deployments

Keep both Vercel projects connected to the same shared GitHub repository, tracking production branch `main`. After an authorized contributor's reviewed commit is pushed/merged into `main`, inspect Deployments in both projects. Each affected project should build successfully and its stable production URL should serve the new version. Saving files locally alone never deploys them. Repository/plan commit-author restrictions still apply.

Use feature branches and pull requests for later changes. Production changes should be tested before merging. Vercel can build previews automatically, but authenticated preview testing is **not configured** by this setup: the backend accepts only the exact production `CLIENT_ORIGIN`. To test a preview, configure a separate test backend/database and an explicit allowed frontend origin; do not allow every `*.vercel.app` origin or casually reuse production data.

The existing login rate limiter is in-memory per function instance; it is not a distributed abuse-control system. For a real public business rollout, add platform/distributed rate limiting and appropriate operational monitoring. This deployment handoff is for the class demonstration.

## Copy this prompt into your colleague's Codex

```text
I am deploying our existing MERN barbershop appointment system from this shared repository. Read DEPLOYMENT.md first, then inspect server/vercel.json, server/api/handler.js, server/lib/vercel-handler.js, server/lib/database.js, and client/vercel.mjs. Help me carry out the colleague section step by step. Joseph has prepared the code; do not rebuild the system.

Deploy two Vercel projects from this SAME repository, production branch main: backend Root Directory server, Framework Other (explicit Node function), and frontend Root Directory client, Framework Vite. Both use Node 22.x. Verify the intended Vercel account/team/project before creating or deploying resources. Check private-repository and commit-author restrictions before promising automatic deployment. I will supply secrets directly in Vercel; do not ask me to paste them into chat or print .env files.

Backend Production variables: MONGODB_URI, JWT_SECRET, NODE_ENV=production, CLIENT_ORIGIN=the exact frontend production HTTPS origin without trailing slash. Frontend Production variable: BACKEND_ORIGIN=the stable backend HTTPS origin without /api. The frontend proxies /api so cookies stay on its origin. Do not switch Axios to cross-site requests or weaken cookie/origin security. Do not change repository visibility, seed/reset the shared database, commit credentials, or force-push.

Use the existing database only after confirming which database is intended. Verify Atlas network access, backend /api/health, frontend /api/health, deployment protection, login cookies and refreshed React routes. Then guide us through the live test checklist in DEPLOYMENT.md. Use isolated data for automated destructive tests. Confirm an authorized GitHub main push updates the production deployment. Preview authentication needs a separate explicit setup; do not silently point previews at production data.

Report the two production URLs, deployed commit, tests actually performed, and anything still blocked. Make necessary deployment fixes in this shared repository so Joseph receives them through GitHub.
```

References: [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [programmatic config](https://vercel.com/docs/project-configuration/vercel-ts), [rewrites](https://vercel.com/docs/routing/rewrites), [Git integration](https://vercel.com/docs/git), [collaboration restrictions](https://vercel.com/docs/deployments/troubleshoot-project-collaboration), [Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
