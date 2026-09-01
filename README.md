# Reflex Delivery Management System

MVP for Kenyan retailers: retailer delivery intake, dispatcher dashboard, rider assignment, and status tracking. The backend is Node.js/Express and uses Supabase Postgres. SMS is wired for Africa's Talking when credentials are supplied; otherwise it runs in safe demo mode.

## Local setup

1. Create a Supabase project and run `sql/schema.sql` in its SQL editor.
2. Copy `.env.example` to `.env` and fill `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. `npm install`
4. `npm start`
5. Open `http://localhost:10000`.

## GitHub

```bash
git init
git add .
git commit -m "Build Reflex MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/reflex-delivery-system.git
git push -u origin main
```

## Render

Create a Web Service from the GitHub repo. Build command: `npm install`. Start command: `npm start`. Health check: `/api/health`. Add the environment variables from `.env.example` in Render. Render can automatically redeploy pushes to the connected branch.

## Current MVP

- Dispatcher delivery dashboard
- Delivery creation
- Rider list and availability
- Manual rider assignment
- Assignment SMS adapter
- Picked Up / Delivered status updates
- Delivery event history in database
- WhatsApp webhook verification endpoint

## Production next steps

- Add authentication and roles
- Parse real WhatsApp Business messages
- Implement Africa's Talking inbound SMS callbacks for rider status commands
- Add proof-of-delivery photo/signature storage
- Add audit logs, rate limiting, input normalization and webhook signature verification
- Add automated rider assignment and GPS/USSD phases
