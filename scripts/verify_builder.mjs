import fs from "node:fs";
import assert from "node:assert/strict";

const read=p=>fs.readFileSync(p,"utf8");
const files=[
  "builder.html","builder-setup.html","builder-templates.html","builder-editor.html",
  "builder-products.html","builder-policies.html","builder-payment.html","builder-publish.html",
  "builder.css","builder-core.js","builder-app.js","builder-export-v2.js","builder-stars.js","accounts.js"
];
for(const f of files)assert.equal(fs.existsSync(f),true,"Missing "+f);

const pages=files.filter(f=>f.endsWith(".html"));
for(const page of pages){
  const h=read(page);
  assert.equal(h.includes("builder.css"),true,page+" missing stylesheet");
  assert.equal(h.includes("builder-core.js"),true,page+" missing core");
  assert.equal(h.includes("builder-stars.js"),true,page+" missing starfield");
  assert.equal(h.includes("builder-export-v2.js"),true,page+" missing exporter");
  assert.equal(h.includes("builder-app.js"),true,page+" missing app");
  assert.equal(h.includes("accounts.js"),true,page+" missing browser accounts");
  assert.equal(h.includes('id="global-save"'),true,page+" missing Save button");
  assert.equal(h.includes('id="global-download"'),true,page+" missing global Download ZIP button");
}
const core=read("builder-core.js"),app=read("builder-app.js"),css=read("builder.css"),accounts=read("accounts.js"),exp=read("builder-export-v2.js");

assert.equal((core.match(/const NICHES=\[(.*?)\];/s)?.[1].match(/"[^"]+"/g)||[]).length,12,"Expected 12 template niches.");
assert.equal((core.match(/const STYLES=\[(.*?)\];/s)?.[1].match(/\{id:/g)||[]).length,6,"Expected 6 visual directions.");
assert.equal(core.includes("variant:"),true,"Template variants missing.");
assert.equal(core.includes("indexedDB.open"),true,"IndexedDB storage missing.");
assert.equal(core.includes("function fileKey"),true,"Account-scoped product key missing.");

assert.equal(accounts.includes("dewify:browser-accounts:v1"),true,"Browser account storage missing.");
assert.equal(accounts.includes("activeId"),true,"Active browser account missing.");
for(const term of ['name="email"','type="email"','name="phone"','type="tel"'])assert.equal(accounts.includes(term),false,"Account UI must not collect "+term);

assert.equal(app.includes("document.addEventListener(\"click\""),true,"Stable delegated click handler missing.");
assert.equal(app.includes("data-action=\"save\""),true,"Save action missing.");
assert.equal(app.includes("data-action=\"download\""),true,"Download action missing.");
assert.equal(app.includes("data-template-download"),true,"Template download action missing.");
assert.equal(app.includes("data-template-use"),true,"Template use action missing.");
assert.equal(app.includes("Browse before you build"),true,"Template browser missing.");
assert.equal(app.includes("YOUR PRODUCTS"),true,"Products page missing.");
assert.equal(app.includes("Product added."),true,"Product add confirmation missing.");
assert.equal(app.includes("Dewify is not charging you here."),true,"Customer-only checkout wording missing.");
assert.equal(app.includes("Your customers pay you directly."),true,"Customer-only checkout wording missing.");
assert.equal(app.includes("No keys. No webhooks. No KYC here."),true,"Secretless checkout messaging missing.");
assert.equal(app.includes('id="download-zip"')||app.includes("id='download-zip'"),true,"Publish download action missing.");
assert.equal(/id='download-zip' class='button button-gold' disabled/.test(app)||/id="download-zip" class="button button-gold" disabled/.test(app),false,"Publish download must not be locked.");
assert.equal(/\brender\(\)/.test(app),false,"Undefined generic render() call remains.");
assert.equal(app.includes("previewTemplate"),false,"Legacy preview modal remains.");
assert.equal(app.includes("data-template-preview"),false,"Per-template preview button remains.");

assert.equal(exp.includes("makeZip(mode"),true,"Export mode missing.");
assert.equal(exp.includes('mode==="template"'),true,"Standalone template export missing.");
assert.equal(exp.includes("window.DEWIFY_DOWNLOAD_TEMPLATE"),true,"Template download function missing.");
assert.equal(exp.includes("SETUP-STATUS.md"),true,"Incomplete export status missing.");
assert.equal(exp.includes("if(domain)zip.file(\"CNAME\""),true,"CNAME should only be emitted for a valid domain.");
assert.equal(exp.includes("payment-config.js"),true,"Payment config export missing.");
assert.equal(exp.includes("PAYMENT-SETUP.md"),true,"Payment setup guide missing.");

assert.equal(css.includes("--bg:#050505"),true,"Black theme missing.");
assert.equal(css.includes("--gold:#f0c85a"),true,"Gold theme missing.");
for(const v of ["shot-editorial","shot-bento","shot-split","shot-catalog","shot-orbit","shot-story"])assert.equal(css.includes(v),true,"Distinct template glimpse missing: "+v);
assert.equal(css.includes("@media(max-width:760px)"),true,"Mobile layout missing.");
assert.equal(css.includes("prefers-reduced-motion"),true,"Reduced motion support missing.");

console.log("PASS 1: structure, storage, actions, template diversity, export behavior.");
console.log("PASS 2: account privacy, no-secret checkout, mobile/lightweight CSS.");
console.log("PASS 3: no legacy builder preview path, no undefined render call, incomplete export remains enabled.");
console.log("Template library: 12 niches × 6 visual directions = 72 templates.");
