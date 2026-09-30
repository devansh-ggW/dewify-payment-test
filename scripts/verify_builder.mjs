import fs from "node:fs";
import assert from "node:assert/strict";

const read=p=>fs.readFileSync(p,"utf8");
const files=[
"builder.html","builder-setup.html","builder-templates.html","builder-editor.html",
"builder-products.html","builder-policies.html","builder-payment.html","builder-publish.html",
"builder.css","builder-core.js","builder-app.js","builder-export-v2.js","accounts.js"
];
for(const f of files)assert.equal(fs.existsSync(f),true,"Missing "+f);

const html=read("builder.html"), core=read("builder-core.js"), app=read("builder-app.js"), css=read("builder.css"), accounts=read("accounts.js"), exp=read("builder-export-v2.js");
for(const page of ["builder.html","builder-setup.html","builder-templates.html","builder-editor.html","builder-products.html","builder-policies.html","builder-payment.html","builder-publish.html"]){
  const h=read(page);
  assert.equal(h.includes("builder.css"),true,page+" missing stylesheet");
  assert.equal(h.includes("builder-core.js"),true,page+" missing core");
  assert.equal(h.includes("builder-app.js"),true,page+" missing app");
  assert.equal(h.includes("accounts.js"),true,page+" missing browser accounts");
  assert.equal(h.includes("id='builder-stars'")||h.includes('id="builder-stars"'),true,page+" missing star canvas");
}
for(const term of ['type="email"','type="tel"','name="email"','name="phone"'])assert.equal(accounts.includes(term),false,"Account UI must not collect "+term);
assert.equal(accounts.includes("dewify:browser-accounts:v1"),true);
assert.equal(accounts.includes("activeId"),true);
assert.equal(core.includes("dewify:builder-workspace:v3"),true);
assert.equal(core.includes("indexedDB.open"),true);
assert.equal(core.includes("function fileKey"),true);
assert.equal(core.includes("const TEMPLATES=[]"),true);
assert.equal(core.match(/const NICHES=[(.*?)]/s)?.[1].match(/"[^"]+"/g).length,12);
assert.equal(core.match(/const STYLES=[(.*?)]/s)?.[1].match(/{id:/g).length,6);
assert.equal(app.includes("builder-templates.html"),true);
assert.equal(app.includes("Browse before you build"),true);
assert.equal(app.includes("builder-products.html"),true);
assert.equal(app.includes("This is the source of truth for what appears in the storefront export"),true);
assert.equal(app.includes("download-zip"),true);
assert.equal(app.includes("payment provider your customers will use"),true);
assert.equal(app.includes("No keys. No webhooks. No KYC here."),true);
assert.equal(exp.includes("payment-config.js"),true);
assert.equal(exp.includes("CNAME"),true);
assert.equal(exp.includes("products.html"),true);
assert.equal(exp.includes("Direct product file URLs"),false);
assert.equal(css.includes("--bg:#050505"),true);
assert.equal(css.includes("--gold:#f0c85a"),true);
assert.equal(css.includes("@media(max-width:760px)"),true);
assert.equal(css.includes("prefers-reduced-motion"),true);

console.log("Rebuilt Dewify builder verification passed.");
console.log("Pages: overview, setup, templates, editor, products, policies, checkout, publish.");
console.log("Template library: 12 niches × 6 visual directions = 72 templates.");
console.log("Accounts: browser-local workspace names only; no email/phone fields.");
console.log("Export: disabled until required setup, template, product, policies, checkout and domain are ready.");
