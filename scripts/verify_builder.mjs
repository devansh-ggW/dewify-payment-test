import fs from "node:fs";
import assert from "node:assert/strict";

const read=p=>fs.readFileSync(p,"utf8");
const pages=[
  "builder.html","builder-setup.html","builder-templates.html","builder-editor.html",
  "builder-products.html","builder-policies.html","builder-payment.html","builder-publish.html"
];
const assets=["builder.css","builder-core.js","builder-app.js","builder-export-v2.js","builder-stars.js","accounts.js"];

for(const f of [...pages,...assets])assert.equal(fs.existsSync(f),true,"Missing "+f);

for(const page of pages){
  const h=read(page);
  for(const token of ["builder.css","builder-core.js","builder-stars.js","builder-export-v2.js","builder-app.js","accounts.js"])
    assert.equal(h.includes(token),true,page+" missing "+token);
  assert.equal(h.includes('id="global-save"'),true,page+" missing Save button");
  assert.equal(h.includes('id="global-download"'),true,page+" missing Download button");
}

const core=read("builder-core.js");
const app=read("builder-app.js");
const exp=read("builder-export-v2.js");
const acc=read("accounts.js");
const css=read("builder.css");

assert.equal((core.match(/const NICHES=\[(.*?)\];/s)?.[1].match(/"[^"]+"/g)||[]).length,12);
assert.equal((core.match(/const STYLES=\[(.*?)\];/s)?.[1].match(/\{id:/g)||[]).length,6);
assert.equal(core.includes("variant:"),true);
assert.equal(core.includes("indexedDB.open"),true);
assert.equal(core.includes('accountId()+":"+id'),true);

assert.equal(acc.includes("dewify:browser-accounts:v1"),true);
assert.equal(acc.includes("activeId"),true);
for(const bad of ['name="email"','type="email"','name="phone"','type="tel"'])assert.equal(acc.includes(bad),false,"Account must not collect "+bad);

assert.equal(app.includes('document.addEventListener("click"'),true);
assert.equal(app.includes('data-action="save"'),true);
assert.equal(app.includes('data-action="download"'),true);
assert.equal(app.includes("data-template-use"),true);
assert.equal(app.includes("data-template-download"),true);
assert.equal(app.includes("Browse before you build"),true);
assert.equal(app.includes("YOUR PRODUCTS"),true);
assert.equal(app.includes("Product added."),true);
assert.equal(app.includes("Dewify is not charging you here."),true);
assert.equal(app.includes("Your customers pay you directly."),true);
assert.equal(app.includes("No keys. No webhooks. No KYC here."),true);
assert.equal(app.includes("previewTemplate"),false);
assert.equal(app.includes("data-template-preview"),false);
assert.equal(/\brender\(\)/.test(app),false);
assert.equal(/id='download-zip'[^>]*disabled/.test(app)||/id="download-zip"[^>]*disabled/.test(app),false);
assert.equal(app.includes('form.dataset.busy==="1"'),true);

assert.equal(exp.includes('window.DEWIFY_DOWNLOAD_STORE_ZIP=()=>makeZip("store","")'),true);
assert.equal(exp.includes("window.DEWIFY_DOWNLOAD_TEMPLATE"),true);
assert.equal(exp.includes('mode==="template"'),true);
assert.equal(exp.includes("SETUP-STATUS.md"),true);
assert.equal(exp.includes("payment-config.js"),true);
assert.equal(exp.includes("PAYMENT-SETUP.md"),true);
assert.equal(exp.includes("if(domain)zip.file(\"CNAME\""),true);
assert.equal(exp.includes('const exportProducts=mode==="template"?[]:s.products'),true);

assert.equal(css.includes("--bg:#050505"),true);
assert.equal(css.includes("--gold:#f0c85a"),true);
for(const v of ["shot-editorial","shot-bento","shot-split","shot-catalog","shot-orbit","shot-story"])assert.equal(css.includes(v),true);
assert.equal(css.includes("@media(max-width:760px)"),true);
assert.equal(css.includes("prefers-reduced-motion"),true);

console.log("PASS 1 — structure and required assets");
console.log("PASS 2 — reliable actions, account privacy, template diversity, products");
console.log("PASS 3 — incomplete ZIPs, template downloads, customer-only checkout, mobile/lightweight UI");
console.log("Templates: 12 niches × 6 variants = 72");
