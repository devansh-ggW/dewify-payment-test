# Paddle setup for DEWIFY

This file is a checklist for wiring the live Paddle account to the static storefront.

## Frontend values

Edit `config.js`:

- `PADDLE_ENVIRONMENT` = `production` for the live site, or `sandbox` while testing.
- `PADDLE_CLIENT_TOKEN` = the Paddle client-side token for this storefront.
- `products[].priceId` = the Paddle price ID for that product.

Client-side Paddle tokens are intended to be exposed in frontend code. Do not put Paddle API keys or other server credentials here.

## Checkout

The site uses Paddle.js v2 overlay checkout. A product Buy button sends its `priceId` to Paddle.

Before a live checkout can open successfully, make sure your Paddle dashboard has the appropriate default payment link/domain configuration for the site.

## Digital delivery

The current static MVP shows the product's `downloadUrl` after Paddle emits `checkout.completed`.

For stronger protection later, move fulfillment behind a server-side entitlement system and verify Paddle webhooks before granting access.
