# Dewify Payment Test — Cloudflare Worker

This Worker is the server-side payment layer for the GitHub Pages test storefront.

## Endpoints

- `GET /health`
- `POST /api/razorpay/order`
- `POST /api/razorpay/verify`
- `POST /api/stripe/checkout-session`
- `POST /webhooks/razorpay`
- `POST /webhooks/stripe`

Razorpay Orders and Stripe Checkout Sessions are created server-side.

## Secrets

Use Cloudflare Worker secrets for payment credentials. Do not put payment credentials in `vars`, source files, HTML, JavaScript, GitHub repository files, or browser storage.

Required secrets:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Commands:

```bash
npx wrangler secret put RAZORPAY_KEY_ID --config cloudflare/wrangler.jsonc
npx wrangler secret put RAZORPAY_KEY_SECRET --config cloudflare/wrangler.jsonc
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET --config cloudflare/wrangler.jsonc
npx wrangler secret put STRIPE_SECRET_KEY --config cloudflare/wrangler.jsonc
npx wrangler secret put STRIPE_WEBHOOK_SECRET --config cloudflare/wrangler.jsonc
```

The test Worker intentionally does not mark the secrets as mandatory at deploy time. This lets `/health` run before credentials are added and report which providers are configured.

## Deploy

```bash
npx wrangler deploy --config cloudflare/wrangler.jsonc
```

Start local development:

```bash
npx wrangler dev --config cloudflare/wrangler.jsonc
```

Do not commit `.dev.vars` or `.env` files containing credentials.
