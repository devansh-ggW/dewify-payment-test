# Dewify Payment Test

This repository is a testing copy of Dewify-Ecommerce for Razorpay and Stripe checkout experiments.

## Architecture

- Static storefront: GitHub Pages
- Payment API: Cloudflare Worker
- Payments: Razorpay + Stripe
- Paddle: intentionally not added yet

The browser never receives Razorpay's secret, Stripe's secret, or either webhook secret.

## Cloudflare Worker

The Worker lives in `cloudflare/`.

Install Wrangler:

```bash
npm install -D wrangler
```

Run locally:

```npx wrangler dev cloudflare/wrangler.jsonc
```

Set deployed secrets:

```npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Deploy:

```npx wrangler deploy --config cloudflare/wrangler.jsonc
```

Do not put any secret value in this repository.

## Test page

`payments-test.html` is an isolated browser test harness. Set its API base URL to your deployed Worker URL before testing.
