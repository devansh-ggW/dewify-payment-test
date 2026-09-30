# DEWIFY Digital Store

The DEWIFY storefront is now focused on digital products and lightweight software.

## Current product

- **DEWIFY DevCore** — V1.0.0
- Type: one-time digital purchase
- Platform: Windows
- Delivery: digital access after successful checkout

## Paddle setup

1. Create a Paddle client-side token.
2. Create the Paddle product and price for each DEWIFY product.
3. Put the client-side token in `config.js` as `PADDLE_CLIENT_TOKEN`.
4. Put the corresponding `pri_...` price ID into the product's `priceId`.
5. Keep Paddle API keys off the frontend.

Paddle.js is initialized in `index.html`, and purchases are opened with `Paddle.Checkout.open()`.

## Hosting

This is a static GitHub Pages site. The custom domain is configured as `dewify.shop`.

No physical shipping/order workflow is used by the current storefront.
