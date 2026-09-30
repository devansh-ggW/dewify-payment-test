(()=>{"use strict";
const B=window.DEWIFY_BUILDER, {$, $$, esc, patch, getState, getTemplates, templateById, templateDoc, readiness, validDomain, setupFields, putFile, getFile, removeFile, dataUrlFromBlob, slug}=B;
if(!B)return;
const page=document.body.dataset.page, root=$("#builder-root");
const state=()=>getState();
const navReady=()=>{$$("[data-nav]").forEach(a=>a.classList.toggle("active",a.dataset.nav===page))};
const saveMessage=()=>{const e=$("#save-state");if(e)e.textContent="Saved locally in this browser."};
function layout(title,kicker,lead,body,actions=""){return "<div class='page-head'><div><p class='eyebrow'>"+esc(kicker)+"</p><h1>"+title+"</h1><p class='page-lead'>"+esc(lead)+"</p></div>"+(actions?"<div class='page-head-actions'>"+actions+"</div>":"")+"</div>"+body}
function field(name,label,type,value,options=[],hint=""){const v=String(value??"");let control="";
 if(type==="textarea")control="<textarea data-field='"+name+"' rows='4'>"+esc(v)+"</textarea>";
 else if(type==="select")control="<select data-field='"+name+"'>"+options.map(o=>"<option "+(o===v?"selected":"")+">"+esc(o)+"</option>").join("")+"</select>";
 else if(type==="color")control="<div class='color-input'><input data-field='"+name+"' type='color' value='"+esc(v||"#f0c85a")+"'><code>"+esc(v||"#f0c85a")+"</code></div>";
 else control="<input data-field='"+name+"' type='"+type+"' value='"+esc(v)+"'>";
 return "<label class='form-field'><span>"+esc(label)+"</span>"+control+(hint?"<small>"+esc(hint)+"</small>":"")+"</label>"
}
function setField(name,value){patch(s=>{if(name in s.store)s.store[name]=value;else if(name==="domain")s.domain=value});saveMessage();refreshConditional()}
function bindFields(){}
let downloadBusy=false;
function setSaveStatus(text){
 const e=$("#save-state");
 if(e){e.textContent=text;window.clearTimeout(setSaveStatus.timer);setSaveStatus.timer=window.setTimeout(()=>e.textContent="Autosaved",1800)}
}
async function handleDownload(fn,id){
 if(downloadBusy)return;
 downloadBusy=true;
 const buttons=$("[data-action='download'],[data-template-download]");
 buttons.forEach(b=>{b.disabled=true;b.dataset.originalText=b.textContent;b.textContent="Building…"});
 try{
   if(typeof fn!=="function")throw new Error("Export module is not loaded.");
   await fn(id);
   setSaveStatus("Download started");
 }catch(e){
   console.error(e);setSaveStatus("Download failed");alert(e&&e.message?e.message:"Could not build the ZIP.");
 }finally{
   buttons.forEach(b=>{b.disabled=false;if(b.dataset.originalText)b.textContent=b.dataset.originalText});
   downloadBusy=false;
 }
}
document.addEventListener("click",async e=>{
 const b=e.target.closest("[data-action], [data-template-use], [data-template-download], [data-policy-toggle], [data-provider], [data-wizard]");
 if(!b)return;
 if(b.matches("[data-action='save']")){setSaveStatus(B.saveState()?"Saved":"Save failed — browser storage may be full");return}
 if(b.matches("[data-action='download']")){await handleDownload(window.DEWIFY_DOWNLOAD_STORE_ZIP);return}
 if(b.matches("[data-template-use]")){patch(s=>s.templateId=b.dataset.templateUse);setSaveStatus("Template selected");if(page==="templates")renderTemplates();else location.href="builder-editor.html";return}
 if(b.matches("[data-template-download]")){await handleDownload(window.DEWIFY_DOWNLOAD_TEMPLATE,b.dataset.templateDownload);return}
 if(b.matches("[data-provider]")){patch(s=>s.payment.provider=b.dataset.provider);renderPayment();setSaveStatus("Checkout saved");return}
});
document.addEventListener("input",e=>{
 const el=e.target;
 if(el.matches("[data-field]")){
   let v=el.value;
   if(el.type==="color"){const c=el.parentElement.querySelector("code");if(c)c.textContent=v}
   if(el.dataset.field in state().store)patch(s=>s.store[el.dataset.field]=v);
   setSaveStatus("Saving…");
 }
 if(el.matches("[data-policy]")){patch(s=>s.policies[el.dataset.policy]=el.value);setSaveStatus("Saving…")}
});
document.addEventListener("change",async e=>{
 const el=e.target;
 if(el.matches("[data-field]") && el.dataset.field in state().store)patch(s=>s.store[el.dataset.field]=el.value);
 if(el.matches("[data-policy-toggle]")){patch(s=>s.policies[el.dataset.policyToggle]=el.checked);if(page==="policies")renderPolicies();else location.reload()}
 if(el.matches("[data-policy]"))patch(s=>s.policies[el.dataset.policy]=el.value);
});
function renderHome(){
 const s=state(),r=readiness(),t=templateById(s.templateId);
 const productWord=s.products.length+" product"+(s.products.length===1?"":"s");
 root.innerHTML=layout("Build it once. Ship it clean.","DEWIFY / OVERVIEW","A browser-local builder for fast storefront creation. No account email, phone number or payment credentials required.",
 "<section class='hero-dashboard'><div class='dashboard-copy'><div class='live-line'><span></span> LOCAL WORKSPACE</div><h2>"+esc(s.store.name||"Your store starts here.")+"</h2><p>"+esc(s.store.tagline||"Set up the essentials, pick a template, add products, then export the storefront.")+"</p><div class='dashboard-actions'><a class='button button-gold' href='builder-setup.html'>Start / resume setup</a><a class='button' href='builder-templates.html'>Browse templates</a><a class='button' href='builder-products.html'>Open products</a></div></div><div class='dashboard-status'><div class='status-top'><span>BUILD STATUS</span><strong>"+(r.ready?"READY":"IN PROGRESS")+"</strong></div><div class='status-meter'><i style='width:"+Math.round(((setupFields.length-(r.missing.length))/Math.max(1,setupFields.length))*100)+"%'></i></div><p id='ready-copy'>"+(r.ready?"Everything needed for export is ready.":r.missing.length+" item"+(r.missing.length===1?"":"s")+" still needed: "+esc(r.missing.join(", ")))+"</p></div></section>"+
 "<section class='metric-grid'><article><span>PRODUCTS</span><strong>"+productWord+"</strong><a href='builder-products.html'>Manage ↗</a></article><article><span>TEMPLATE</span><strong>"+esc(t?t.name:"Not selected")+"</strong><a href='builder-templates.html'>Browse ↗</a></article><article><span>CHECKOUT</span><strong>"+esc(s.payment.provider||"Not selected")+"</strong><a href='builder-payment.html'>Set up ↗</a></article><article><span>DOMAIN</span><strong>"+esc(s.domain||"Not set")+"</strong><a href='builder-publish.html'>Publish ↗</a></article></section>"+
 "<section class='next-grid'><a class='next-card' href='builder-editor.html'><span>01 / EDITOR</span><h3>See the site live.</h3><p>Change the core copy and visual direction while the preview updates beside it.</p></a><a class='next-card' href='builder-products.html'><span>02 / PRODUCTS</span><h3>Your products actually appear.</h3><p>Add files, thumbnails and details once. The Products page becomes the source of truth.</p></a><a class='next-card' href='builder-publish.html'><span>03 / EXPORT</span><h3>Download whenever you need a draft.</h3><p>Draft ZIPs are allowed while you are still building. Finish the checklist before publishing.</p></a></section>");
}
const setupScreens=[
 {k:"01",title:"Name the store.",lead:"Keep it direct. This becomes the storefront identity.",fields:[["name","Store name","text",""],["tagline","Tagline","text",""],["category","What are you selling?","select",["Digital products","AI resources","Design assets","Education","Creator tools","Other"]],["customer","Who is it for?","text","Creators, freelancers, businesses…"]]},
 {k:"02",title:"Give it a visual system.",lead:"Black canvas first. Golden stars and one controlled accent.",fields:[["accent","Accent","color","#f0c85a"],["style","Visual style","select",["Dark editorial","Sharp studio","Minimal catalog","Dark boutique"]],["font","Font style","select",["Clean sans","Technical mono","Editorial sans"]],["motion","Motion","select",["Subtle","Standard","Reduced"]]]},
 {k:"03",title:"Shape the shopping flow.",lead:"Choose how the storefront speaks and how products are laid out.",fields:[["currency","Currency","select",["INR — ₹","USD — $","EUR — €","GBP — £"]],["cta","Primary CTA","select",["Get it now","Buy the drop","Get access","Start creating"]],["layout","Product layout","select",["Editorial shelf","Dense catalog","Split hero","Minimal catalog"]],["delivery","Delivery message","text","Instant digital delivery"]]},
 {k:"04",title:"Set the promise.",lead:"One useful sentence is enough. Avoid a wall of copy.",fields:[["promise","Store promise","textarea","Useful digital products, made simple."]]},
 {k:"05",title:"Setup complete.",lead:"Now choose a storefront template. You can come back and edit the setup later.",fields:[]}
];
let setupPage=Number(sessionStorage.getItem("dewify-setup-page")||0);setupPage=Math.min(4,Math.max(0,setupPage));
function renderSetup(){
 const s=state(),screen=setupScreens[setupPage];
 const controls=screen.fields.map(f=>field(f[0],f[1],f[2],s.store[f[0]],f[3]||[])).join("");
 root.innerHTML=layout("Your storefront, one decision at a time.","DEWIFY / SETUP",screen.lead,
 "<section class='wizard'><div class='wizard-rail'>"+setupScreens.map((x,i)=>"<button type='button' class='"+(i===setupPage?"active ":"")+(i<setupPage?"done":"")+"' data-wizard='"+i+"'><span>"+x.k+"</span><b>"+esc(x.title.replace(".",""))+"</b></button>").join("")+"</div><div class='wizard-main'><p class='wizard-count'>STEP "+screen.k+" / 05</p><h2>"+esc(screen.title)+"</h2>"+(controls?"<div class='field-grid'>"+controls+"</div>":"<div class='complete-box'><span class='complete-icon'>✓</span><strong>Setup is ready for the next step.</strong><p>Go browse templates, choose one, then edit it with your own products.</p></div>")+"<div class='wizard-actions'><button type='button' class='button' id='wizard-back' "+(setupPage===0?"disabled":"")+">Back</button><span></span><button type='button' class='button button-gold' id='wizard-next'>"+(setupPage===4?"Browse templates":"Continue")+"</button></div></div></section>");
 bindFields();
 $$("[data-wizard]").forEach(b=>b.onclick=()=>{setupPage=Number(b.dataset.wizard);sessionStorage.setItem("dewify-setup-page",String(setupPage));renderSetup()});
 $("#wizard-back").onclick=()=>{if(setupPage>0){setupPage--;sessionStorage.setItem("dewify-setup-page",String(setupPage));renderSetup()}};
 $("#wizard-next").onclick=()=>{if(setupPage===4){nextPage("builder-templates.html");return}const missing=setupScreens[setupPage].fields.filter(f=>String(state().store[f[0]]||"").trim()==="");if(missing.length){const first=$("[data-field='"+missing[0][0]+"']");if(first)first.focus();return}setupPage++;sessionStorage.setItem("dewify-setup-page",String(setupPage));renderSetup()};
}
function renderTemplates(){
 const ts=getTemplates(),categories=["All"].concat(Array.from(new Set(ts.map(t=>t.niche)))),q=String(sessionStorage.getItem("dewify-template-q")||""),cat=sessionStorage.getItem("dewify-template-cat")||"All";
 root.innerHTML=layout("Browse before you build.","DEWIFY / TEMPLATES","Pick a direction visually first. Every template keeps the black + golden-star system so the brand stays recognisable.",
 "<section class='template-toolbar'><label class='search-box'><span>SEARCH</span><input id='template-search' value='"+esc(q)+"' placeholder='Search AI, creator, business…'></label><div class='filter-row'>"+categories.map(c=>"<button type='button' data-template-cat='"+esc(c)+"' class='"+(c===cat?"active":"")+"'>"+esc(c)+"</button>").join("")+"</div></section><section id='template-grid' class='template-grid'></section>");
 const draw=()=>{const query=String($("#template-search").value||"").toLowerCase().trim();const filtered=ts.filter(t=>(sessionStorage.getItem("dewify-template-cat")||"All")==="All"||t.niche===(sessionStorage.getItem("dewify-template-cat")||"All")).filter(t=>!query||t.name.toLowerCase().includes(query)||t.niche.toLowerCase().includes(query)||t.style.toLowerCase().includes(query));$("#template-grid").innerHTML=filtered.length?filtered.map(miniCard).join(""):"<div class='empty-box'><strong>No templates found.</strong><p>Try a broader search.</p></div>"};
 $("#template-search").addEventListener("input",()=>{sessionStorage.setItem("dewify-template-q",$("#template-search").value);draw()});
 $("[data-template-cat]").forEach(b=>b.onclick=()=>{sessionStorage.setItem("dewify-template-cat",b.dataset.templateCat);renderTemplates()});draw();
}
function renderEditor(){
 const s=state(),t=templateById(s.templateId);
 root.innerHTML=layout("Edit the direction.","DEWIFY / EDITOR","Keep the controls small. The preview is the product, not a dashboard full of settings.",
 "<section class='editor-layout'><aside class='editor-controls'><div class='editor-selected'><span>SELECTED TEMPLATE</span><strong>"+esc(t?t.name:"Choose a template first")+"</strong><a href='builder-templates.html'>Change template ↗</a></div>"+field("name","Store name","text",s.store.name)+field("tagline","Tagline","text",s.store.tagline)+field("accent","Accent","color",s.store.accent)+field("cta","CTA","select",s.store.cta,["Get it now","Buy the drop","Get access","Start creating"])+field("promise","Store promise","textarea",s.store.promise)+"<p class='edit-note'>Changes save automatically to this browser workspace.</p></aside><div class='editor-preview'><div class='preview-bar'><span>LIVE PREVIEW</span><span>"+(t?"TEMPLATE "+String(t.number).padStart(2,"0"):"NO TEMPLATE")+"</span></div><iframe id='live-preview' title='Live storefront preview'></iframe></div></section>");
 bindFields();const frame=$("#live-preview");frame.srcdoc=t?templateDoc(t,state(),true):templateDoc(getTemplates()[0],state(),true);
}
async function productThumb(id){
 const f=await getFile(id+":thumb");return f&&f.blob?URL.createObjectURL(f.blob):"";
}
function renderProductCard(p,i,container){
 productThumb(p.id).then(url=>{const box=container.querySelector("[data-thumb='"+p.id+"']");if(box&&url)box.innerHTML="<img src='"+url+"' alt='' loading='lazy'>"});
 return "<article class='product-manage'><div class='manage-thumb' data-thumb='"+esc(p.id)+"'><span>"+String(i+1).padStart(2,"0")+"</span></div><div class='manage-copy'><div class='manage-meta'><span>"+esc(p.category||"DIGITAL")+"</span><span>"+esc(p.fileName||"File")+"</span></div><h3>"+esc(p.title)+"</h3><p>"+esc(p.description||"No description.")+"</p><strong>"+esc(p.price||"")+"</strong></div><button class='icon-button danger' type='button' data-remove-product='"+esc(p.id)+"' aria-label='Remove "+esc(p.title)+"'>×</button></article>"
}
async function renderProducts(){
 const s=state();
 root.innerHTML=layout("Products, visible.","DEWIFY / PRODUCTS","This is the source of truth for what appears in the storefront export. Add a file, save it, and it shows below immediately.",
 "<section class='products-layout'><aside class='add-product-panel'><div class='panel-label'>ADD PRODUCT</div><form id='product-form' class='product-form'>"+field("p-title","Title","text","")+field("p-category","Category","select","Digital product",["Digital product","Ebook","Template","Bundle","AI resource","Other"])+field("p-price","Price","text","₹299")+field("p-description","Description","textarea","")+field("p-file","Product file","file","","")+field("p-thumbnail","Thumbnail (optional)","file","","")+ "<button class='button button-gold full' type='submit'>Add product</button><p id='product-status' class='form-status'></p></form></aside><section class='product-list-panel'><div class='panel-row'><div><div class='panel-label'>YOUR PRODUCTS</div><h2>"+s.products.length+" item"+(s.products.length===1?"":"s")+"</h2></div><a class='button' href='builder-publish.html'>Check export ↗</a></div><div id='product-list' class='product-list'></div></section></section>");
 const list=$("#product-list");
 list.innerHTML=s.products.length?s.products.map((p,i)=>renderProductCard(p,i,list)).join(""):"<div class='empty-box'><strong>No products yet.</strong><p>Add your first digital product on the left. It will appear here immediately.</p></div>";
 $$("[data-remove-product]").forEach(b=>b.onclick=async()=>{const id=b.dataset.removeProduct;const p=state().products.find(x=>x.id===id);if(!p)return;patch(s2=>{s2.products=s2.products.filter(x=>x.id!==id)});await removeFile(id);await removeFile(id+":thumb");renderProducts()});
 $("#product-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,submit=form.querySelector("button[type=submit]");if(form.dataset.busy==="1")return;form.dataset.busy="1";if(submit)submit.disabled=true;const fd=new FormData(form),title=String(fd.get("p-title")||"").trim(),file=fd.get("p-file"),thumb=fd.get("p-thumbnail");if(!title||!file||!(file instanceof File)||!file.size){$("#product-status").textContent="Add a title and choose the product file.";return}const id="prod-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);$("#product-status").textContent="Saving product…";try{await putFile(id,file);if(thumb instanceof File&&thumb.size)await putFile(id+":thumb",thumb);patch(s2=>s2.products.push({id,title,category:String(fd.get("p-category")||"Digital product"),price:String(fd.get("p-price")||"").trim(),description:String(fd.get("p-description")||"").trim(),fileName:file.name,fileSize:file.size,thumbnailKey:thumb instanceof File&&thumb.size?"thumb":"",thumbnailExt:thumb instanceof File&&thumb.size?(String(thumb.name||"").split(".").pop()||"bin").toLowerCase():""}));form.reset();form.dataset.busy="";if(submit)submit.disabled=false;$("#product-status").textContent="Product added.";setSaveStatus("Product saved");renderProducts()}catch(err){console.error(err);form.dataset.busy="";if(submit)submit.disabled=false;$("#product-status").textContent="Could not save that file in this browser."}});
}
function renderPolicies(){
 const s=state(),items=[["termsEnabled","terms","Terms & Conditions","Shown before checkout and in the exported storefront."],["privacyEnabled","privacy","Privacy Policy","Keep this plain and specific to the store."],["refundEnabled","refund","Refund / Cancellation","Set expectations for digital purchases."],["cookiesEnabled","cookies","Cookie note","Optional. Enable only when needed."],["disclaimerEnabled","disclaimer","General disclaimer","Optional."]];
 root.innerHTML=layout("Policies without the wall of text.","DEWIFY / POLICIES","Toggle only the pages you actually need. Edit the copy here and the export uses the same text.",
 "<section class='policy-list'>"+items.map(([toggle,key,title,hint])=>"<article class='policy-row'><label class='switch-line'><input type='checkbox' data-policy-toggle='"+toggle+"' "+(s.policies[toggle]?"checked":"")+"><span></span><b>"+esc(title)+"</b></label><p>"+esc(hint)+"</p><textarea data-policy='"+key+"' "+(s.policies[toggle]?"":"disabled")+">"+esc(s.policies[key])+"</textarea></article>").join("")+"</section>");
 
}
function renderPayment(){
 const s=state();
 const options=[["razorpay","Razorpay","Hosted payment links for your customers."],["stripe","Stripe","Hosted payment links for your customers."]];
 root.innerHTML=layout("Customer checkout, not Dewify billing.","DEWIFY / CHECKOUT","Dewify is not charging you here. This choice only tells the exported store which provider your customers will pay.",
 "<section class='checkout-grid'><div><div class='checkout-choice-list'>"+options.map(x=>"<button type='button' class='checkout-choice "+(s.payment.provider===x[0]?"selected":"")+"' data-provider='"+x[0]+"'><span class='provider-icon'>"+(x[0]==="stripe"?"S":"R")+"</span><span><b>"+x[1]+"</b><small>"+x[2]+"</small></span><em>"+(s.payment.provider===x[0]?"SELECTED":"SELECT")+"</em></button>").join("")+"</div><div class='no-secret-box'><strong>No keys. No webhooks. No KYC here.</strong><p>After export, you create hosted payment links inside your own provider account and paste those public URLs into the exported payment config. Your customers pay you directly.</p></div></div><aside class='checkout-side'><span>SELECTED</span><strong>"+esc(s.payment.provider?s.payment.provider.toUpperCase():"NOT SET")+"</strong><p>This is a customer checkout setting, not a Dewify subscription.</p><a class='button' href='builder-publish.html'>Continue to publish ↗</a></aside></section>");
}
function checklistRow(label,ok,href){return "<div class='check-row "+(ok?"ok":"missing")+"'><span>"+(ok?"✓":"—")+"</span><div><b>"+esc(label)+"</b><small>"+(ok?"Ready":"Needs setup")+"</small></div>"+(href?"<a href='"+href+"'>Open ↗</a>":"")+"</div>"}
function renderPublish(){
 const s=state(),r=readiness(),t=templateById(s.templateId);
 const checks=[
  ["Store setup",setupFields.every(f=>String(s.store[f[0]]||"").trim()),"builder-setup.html"],
  ["Template selected",!!t,"builder-templates.html"],
  ["Products added",s.products.length>0,"builder-products.html"],
  ["Terms + privacy enabled",!!s.policies.termsEnabled&&!!s.policies.privacyEnabled,"builder-policies.html"],
  ["Customer checkout selected",!!s.payment.provider,"builder-payment.html"],
  ["Custom domain",!!validDomain(s.domain),"builder-publish.html"]
 ];
 root.innerHTML=layout("Export whenever you need it.","DEWIFY / PUBLISH","You can export a working draft at any point. Finish the missing items before publishing the store.",
 "<section class='publish-top'><div class='publish-meter'><span>"+(r.ready?"READY TO EXPORT":"NOT READY")+"</span><strong>"+(r.ready?"100":"")+ (r.ready?"%":"")+"</strong><i><b style='width:"+Math.max(4,Math.round((checks.filter(x=>x[1]).length/checks.length)*100))+"%'></b></i><p id='ready-copy'>"+(r.ready?"All required pieces are present.":r.missing.length+" item"+(r.missing.length===1?"":"s")+" still needed: "+esc(r.missing.join(", ")))+"</p></div><div class='publish-actions'><button type='button' id='download-zip' class='button button-gold' "+(r.ready?"":"disabled")+">Download ZIP</button><a class='button' href='builder-editor.html'>Review editor ↗</a></div></section><section class='checklist'>"+checks.map(x=>checklistRow(x[0],x[1],x[2])).join("")+"</section><section class='domain-box'><div><span>DOMAIN</span><strong>"+esc(s.domain||"Not set")+"</strong></div><label>Store domain<input id='domain-input' value='"+esc(s.domain)+"' placeholder='shop.example.com'></label><button id='domain-save' class='button button-gold' type='button'>Save domain</button></section><section class='export-note'><strong>What the ZIP contains</strong><p>Storefront pages, your product files, enabled policy pages, a public hosted-payment-link placeholder config, CNAME, and setup instructions. Secret keys are never collected.</p></section>");
 $("#domain-save").onclick=()=>{const v=validDomain($("#domain-input").value);if(!v){$("#domain-input").focus();return}patch(x=>x.domain=v);renderPublish()};
 $("#download-zip").onclick=()=>handleDownload(window.DEWIFY_DOWNLOAD_STORE_ZIP);
}
async function boot(){navReady();if(page==="home")renderHome();else if(page==="setup")renderSetup();else if(page==="templates")renderTemplates();else if(page==="editor")renderEditor();else if(page==="products")await renderProducts();else if(page==="policies")renderPolicies();else if(page==="payment")renderPayment();else if(page==="publish"){const sc=document.createElement("script");sc.src="builder-export-v2.js";sc.onload=renderPublish;sc.onerror=renderPublish;document.body.appendChild(sc)}}
window.addEventListener("dewify:state",()=>{
 const frame=$("#live-preview");if(frame){const tt=templateById(state().templateId);frame.srcdoc=tt?templateDoc(tt,state(),true):templateDoc(getTemplates()[0],state(),true)}
 refreshConditional?.();
});
window.addEventListener("storage",()=>location.reload());
boot();
})();