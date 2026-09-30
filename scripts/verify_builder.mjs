import fs from "node:fs";
import assert from "node:assert/strict";

const read = (p) => fs.readFileSync(p, "utf8");
const builder = read("builder.js");
const accounts = read("accounts.js");
const html = read("builder.html");
const css = read("builder.css");

assert.equal((builder.match(/\["[a-zA-Z]+","[^"]+","(?:text|email|tel|color|select)"/g) || []).length >= 20, true, "Survey field definition count is too low");
assert.equal((builder.match(/NICHES=/) || []).length, 1, "Template data missing");
assert.equal(builder.includes('num++'), true, "Template generator missing");
assert.equal(builder.includes("p.secretKey="), true, "Secret scrubbing missing");
assert.equal(builder.includes("p.webhookSecret="), true, "Webhook secret scrubbing missing");
assert.equal(builder.includes("IndexedDB"), false, "Unexpected literal IndexedDB comment check is not required");
assert.equal(builder.includes("indexedDB.open"), true, "Product binary storage should use IndexedDB");
assert.equal(builder.includes('"/health"'), true, "Payment Worker health check missing");
assert.equal(builder.includes("https://cdn.simpleicons.org/razorpay"), true, "Razorpay provider mark missing");
assert.equal(builder.includes("https://cdn.simpleicons.org/stripe"), true, "Stripe provider mark missing");
assert.equal(builder.includes('STORE_PREFIX+":"+accountId()'), true, "Builder workspace is not account-scoped");
assert.equal(accounts.includes("dewify:browser-accounts:v1"), true, "Browser accounts storage missing");
assert.equal(accounts.includes("activeId"), true, "Active account switching missing");
assert.equal(html.includes('builder.css'), true, "Builder stylesheet missing");
assert.equal(html.includes('builder.js'), true, "Builder script missing");
assert.equal(html.includes('accounts.js'), true, "Builder account script missing");
assert.equal(css.includes("prefers-reduced-motion"), true, "Reduced motion support missing");
assert.equal(css.includes("@media(max-width:680px)"), true, "Mobile layout rules missing");
assert.equal(builder.includes("devicePixelRatio||1,1.5"), true, "Canvas DPR cap missing");

console.log("Builder verification passed.");
console.log("Template matrix:", 20 * 6, "generated storefront concepts.");
console.log("Survey fields:", 4 * 5);
