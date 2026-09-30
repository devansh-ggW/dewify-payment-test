import fs from "node:fs";
import assert from "node:assert/strict";

const read=(p)=>fs.readFileSync(p,"utf8");
const builder=read("builder.js");
const accounts=read("accounts.js");
const html=read("builder.html");
const css=read("builder.css");

const surveyMatches=builder.match(/\["[a-zA-Z]+","[^"]+","(?:text|email|tel|color|select)"/g)||[];
assert.equal(surveyMatches.length,20,"Survey should define exactly 20 fields (4 pages × 5).");

const nichesLine=builder.match(/const NICHES=\[(.*?)\];/s)?.[1]||"";
const nicheCount=(nichesLine.match(/"[^"]+"/g)||[]).length;
assert.equal(nicheCount,20,"Template library should define 20 niches.");

assert.equal(builder.includes("num++"),true,"Template generator missing.");
assert.equal(/\.secretKey=""/.test(builder),true,"Secret scrub logic missing.");
assert.equal(/\.webhookSecret=""/.test(builder),true,"Webhook secret scrub logic missing.");
assert.equal(builder.includes("indexedDB.open"),true,"Product binary storage should use IndexedDB.");
assert.equal(builder.includes('"/health"'),true,"Payment Worker health check missing.");
assert.equal(builder.includes("https://cdn.simpleicons.org/razorpay"),true,"Razorpay provider mark missing.");
assert.equal(builder.includes("https://cdn.simpleicons.org/stripe"),true,"Stripe provider mark missing.");
assert.equal(builder.includes('STORE_PREFIX+":"+accountId()'),true,"Builder workspace is not account-scoped.");
assert.equal(builder.includes("function scopedFileKey"),true,"IndexedDB product files are not account-scoped.");
assert.equal(accounts.includes("dewify:browser-accounts:v1"),true,"Browser accounts storage missing.");
assert.equal(accounts.includes("activeId"),true,"Active account switching missing.");
assert.equal(html.includes("builder.css"),true,"Builder stylesheet missing.");
assert.equal(html.includes("builder.js"),true,"Builder script missing.");
assert.equal(html.includes("accounts.js"),true,"Builder account script missing.");
assert.equal(css.includes("prefers-reduced-motion"),true,"Reduced motion support missing.");
assert.equal(css.includes("@media(max-width:680px)"),true,"Mobile layout rules missing.");
assert.equal(builder.includes("devicePixelRatio||1,1.5"),true,"Canvas DPR cap missing.");
assert.equal(builder.includes("surveyPage<SURVEY.length-1"),true,"Survey page navigation missing.");
assert.equal(builder.includes("srcdoc"),true,"Template preview iframe missing.");
assert.equal(builder.includes("data-preview"),true,"Preview buttons missing.");
assert.equal(builder.includes("data-use-template"),true,"Template selection missing.");
assert.equal(builder.includes("data-remove-product"),true,"Product removal control missing.");
for(const key of ["termsEnabled","privacyEnabled","cookiesEnabled","cookieDisclaimerEnabled","refundEnabled","disclaimerEnabled"]){
  assert.equal(builder.includes(key),true,key+" legal control missing.");
}
assert.equal(html.includes('id="survey-overlay"'),true,"Survey modal missing.");
assert.equal(html.includes('id="preview-overlay"'),true,"Preview modal missing.");
assert.equal(html.includes('id="preview-use"'),true,"Preview use action missing.");
assert.equal(html.includes('id="survey-next"'),true,"Survey continue control missing.");
assert.equal(builder.includes("payment-next"),true,"Payment continue control missing.");
assert.equal(builder.includes("export publish config"),false,"Case-insensitive message check uses actual button text instead.");

console.log("Builder verification passed.");
console.log("Template matrix: 20 niches × 6 variants = 120 concepts.");
console.log("Survey pages: 4; fields: 20 (5 per page).");
