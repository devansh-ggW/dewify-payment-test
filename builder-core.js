(()=>{"use strict";
const KEY_PREFIX="dewify:builder-workspace:v3",OLD_PREFIX="dewify:builder-workspace:v2",DB_NAME="dewify-builder-files",DB_STORE="files";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const slug=v=>String(v||"dewify-store").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70)||"dewify-store";
const accountId=()=>{try{const x=JSON.parse(localStorage.getItem("dewify:browser-accounts:v1")||"null");return String(x&&x.activeId||"default").replace(/[^a-zA-Z0-9_-]/g,"_")}catch{return"default"}};
const stateKey=()=>KEY_PREFIX+":"+accountId();
const oldStateKey=()=>OLD_PREFIX+":"+accountId();
const DEFAULT={
  store:{name:"",tagline:"",category:"",customer:"",accent:"#f0c85a",style:"Dark editorial",font:"Clean sans",motion:"Subtle",currency:"INR — ₹",cta:"Get it now",layout:"Editorial shelf",delivery:"Instant digital delivery",promise:"Useful digital products, made simple."},
  templateId:"",
  products:[],
  policies:{termsEnabled:true,terms:"Purchases are subject to the product description and store terms shown before checkout.",privacyEnabled:true,privacy:"This store keeps only information needed to operate the storefront, support customers, and complete orders.",refundEnabled:true,refund:"Refund and cancellation terms are shown clearly on each product page before checkout.",cookiesEnabled:false,cookies:"This store uses only necessary browser storage and preferences.",disclaimerEnabled:false,disclaimer:"Digital products are provided as described on their product pages."},
  payment:{provider:""},
  domain:""
};
function clone(x){return typeof structuredClone==="function"?structuredClone(x):JSON.parse(JSON.stringify(x))}
function normalize(base,src){
  const x=clone(base),s=src&&typeof src==="object"?src:{};
  if(s.store)Object.assign(x.store,s.store);
  if(s.survey)Object.assign(x.store,{name:s.survey.storeName,tagline:s.survey.tagline,category:s.survey.category,customer:s.survey.customer,accent:s.survey.accent,font:s.survey.fontTone,motion:s.survey.motion,currency:s.survey.currency,cta:s.survey.cta,layout:s.survey.productStyle,delivery:s.survey.delivery});
  x.templateId=String(s.templateId||"");
  x.products=Array.isArray(s.products)?s.products.map(p=>Object.assign({},p)):[];
  if(s.legal)x.policies=Object.assign({},x.policies,s.legal);
  x.payment=Object.assign({},x.payment,s.payment||{});
  if(s.payments)x.payment.provider=String(s.payments.provider||"");
  x.domain=String(s.domain||"");
  return x;
}
function load(){
  try{
    const direct=JSON.parse(localStorage.getItem(stateKey())||"null");
    if(direct)return normalize(DEFAULT,direct);
    const old=JSON.parse(localStorage.getItem(oldStateKey())||"null");
    if(old){const migrated=normalize(DEFAULT,old);localStorage.setItem(stateKey(),JSON.stringify(migrated));return migrated}
  }catch{}
  return clone(DEFAULT);
}
let STATE=load();
function getState(){return STATE}
function saveState(){try{localStorage.setItem(stateKey(),JSON.stringify(STATE));return true}catch{return false}}
function patch(fn){fn(STATE);saveState();window.dispatchEvent(new CustomEvent("dewify:state",{detail:STATE}));return STATE}
function validDomain(v){const s=String(v||"").trim().replace(/^https?:\/\//i,"").replace(/\/$/,"");return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)&&!s.includes(" ")?s.toLowerCase():""}
const setupFields=[["name","Store name"],["tagline","Tagline"],["category","Category"],["customer","Customer type"],["accent","Accent"],["style","Visual style"],["font","Font style"],["motion","Motion"],["currency","Currency"],["cta","CTA"],["layout","Product layout"],["delivery","Delivery message"],["promise","Store promise"]];
function readiness(){
  const missing=[];
  setupFields.forEach(([k,label])=>{if(!String(STATE.store[k]||"").trim())missing.push(label)});
  if(!STATE.templateId)missing.push("Template");
  if(!STATE.products.length)missing.push("Product");
  if(!STATE.policies.termsEnabled||!STATE.policies.privacyEnabled)missing.push("Terms + Privacy");
  if(!STATE.payment.provider)missing.push("Customer checkout");
  if(!validDomain(STATE.domain))missing.push("Domain");
  return {ready:missing.length===0,missing};
}
const NICHES=["AI","Creators","Design","Business","Education","Ebooks","Productivity","Freelance","Marketing","Wellness","Events","Gaming"];
const STYLES=[
  {id:"editorial",name:"Editorial",layout:"Editorial shelf",mark:"EL",variant:"editorial"},
  {id:"grid",name:"Bento",layout:"Bento grid",mark:"GR",variant:"bento"},
  {id:"split",name:"Split",layout:"Split hero",mark:"SP",variant:"split"},
  {id:"mono",name:"Catalog",layout:"Dense catalog",mark:"MN",variant:"catalog"},
  {id:"orbit",name:"Orbit",layout:"Featured orbit",mark:"OR",variant:"orbit"},
  {id:"stack",name:"Story",layout:"Story stack",mark:"ST",variant:"story"}
];
const TEMPLATES=[];
let tid=1;
NICHES.forEach((n,ni)=>STYLES.forEach((s,si)=>TEMPLATES.push({id:"tpl-"+String(tid++).padStart(3,"0"),name:n+" "+s.name,niche:n,style:s.name,layout:s.layout,mark:s.mark,variant:s.variant,number:tid-1,accent:["#f0c85a","#e8b955","#ffd978","#ddb24d"][(ni+si)%4]})));
function getTemplates(){return TEMPLATES}
function templateById(id){return TEMPLATES.find(t=>t.id===id)||TEMPLATES[0]}
function db(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(DB_STORE))d.createObjectStore(DB_STORE,{keyPath:"key"})};
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)
  })
}
function fileKey(id){return accountId()+":"+id}
async function putFile(id,blob){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(DB_STORE,"readwrite").objectStore(DB_STORE).put({key:fileKey(id),blob});r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error)})}
async function getFile(id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(DB_STORE,"readonly").objectStore(DB_STORE).get(fileKey(id));r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
async function removeFile(id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(DB_STORE,"readwrite").objectStore(DB_STORE).delete(fileKey(id));r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error)})}
async function dataUrlFromBlob(blob){
  if(!blob)return"";
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})
}
function templateDoc(t,s,preview){
  t=t||templateById(s&&s.templateId)||TEMPLATES[0];s=s||STATE;
  const name=esc(s.store.name||"YOUR STORE"),tag=esc(s.store.tagline||"Digital products, made simple."),accent=esc(s.store.accent||t.accent);
  const products=(s.products||[]).slice(0,4).map((p,i)=>"<article class='prod'><span class='prod-no'>0"+(i+1)+"</span><span class='prod-cat'>"+esc(p.category||"DIGITAL")+"</span><h3>"+esc(p.title||"Untitled product")+"</h3><p>"+esc(p.description||"Ready to use.")+"</p><strong>"+esc(p.price||"")+"</strong></article>").join("");
  const fallback="<article class='prod empty'><span class='prod-no'>--</span><span class='prod-cat'>PRODUCT</span><h3>Your product goes here.</h3><p>Add products to populate this section.</p></article>";
  const variant=t.variant||"editorial";
  const shape=variant==="bento"?"<div class='bento'><span></span><span></span><span></span><span></span></div>":variant==="split"?"<div class='split-art'><i></i><i></i></div>":variant==="catalog"?"<div class='catalog-lines'><i></i><i></i><i></i><i></i></div>":variant==="orbit"?"<div class='orbit-art'><i></i><i></i><i></i></div>":variant==="story"?"<div class='story-art'><i></i><i></i><i></i></div>":"<div class='editorial-art'><i></i><i></i></div>";
  const lead=products||fallback;
  return "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><style>"+
  "*{box-sizing:border-box}body{margin:0;background:#050505;color:#f6f3eb;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}.wrap{min-height:100vh;padding:24px 5vw;position:relative;overflow:hidden}.gridbg{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:42px 42px}.nav,.hero,.products{position:relative;z-index:1;max-width:1060px;margin:auto}.nav{display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid #252525}.brand{font-weight:900;letter-spacing:.12em}.chip{border:1px solid #302d26;padding:6px 8px;color:#8d887e;font:8px ui-monospace,monospace}.hero{padding:78px 0 42px}.eyebrow{font:9px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:"+accent+"}.hero h1{font-size:clamp(46px,8vw,100px);line-height:.84;letter-spacing:-.08em;max-width:860px;margin:12px 0}.hero p{max-width:590px;color:#99958c;font-size:12px;line-height:1.75}.cta{display:inline-block;margin-top:18px;background:"+accent+";color:#151108;padding:11px 14px;font:900 9px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em}.products{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.prod{min-height:168px;border:1px solid #262626;background:#0b0b0b;padding:14px;position:relative}.prod-no{display:block;color:#5c5952;font:8px ui-monospace,monospace}.prod-cat{display:block;margin-top:18px;color:#747068;font:8px ui-monospace,monospace;text-transform:uppercase}.prod h3{font-size:20px;line-height:1;margin:8px 0}.prod p{color:#8f8a82;font-size:10px}.prod strong{position:absolute;right:14px;top:14px;color:"+accent+";font-size:10px}.editorial-art,.bento,.split-art,.catalog-lines,.orbit-art,.story-art{position:absolute;right:6%;top:50%;transform:translateY(-50%);opacity:.85}.editorial-art{width:110px;height:110px;border:1px solid #4a3b22}.editorial-art:before{content:'';position:absolute;inset:18px;border:1px solid "+accent+"}.bento{width:140px;height:112px;display:grid;grid-template-columns:1fr 1fr;gap:6px}.bento span{border:1px solid #3e3627}.bento span:nth-child(2){grid-row:span 2;background:"+accent+"22}.split-art{width:140px;height:120px;border-left:1px solid "+accent+"}.split-art i{display:block;height:1px;background:#3a352d;margin:23px 0 0 22px}.split-art i:nth-child(2){width:50%;margin-top:34px;background:"+accent+"}.catalog-lines{width:155px}.catalog-lines i{display:block;height:8px;border-bottom:1px solid #34312c;margin:9px 0}.catalog-lines i:first-child{width:68%;background:"+accent+"44}.orbit-art{width:125px;height:125px;border:1px solid #373029;border-radius:50%}.orbit-art:after{content:'';position:absolute;inset:25px;border:1px solid "+accent+"66;border-radius:50%}.orbit-art i{position:absolute;width:5px;height:5px;border-radius:50%;background:"+accent+"}.orbit-art i:nth-child(1){left:11px;top:28px}.orbit-art i:nth-child(2){right:16px;top:72px}.orbit-art i:nth-child(3){left:48px;bottom:9px}.story-art{width:140px}.story-art i{display:block;height:24px;border:1px solid #302d28;margin:6px 0}.story-art i:nth-child(2){margin-left:20px;border-color:"+accent+"66}.mode-bento .hero{max-width:740px}.mode-split .hero{max-width:620px}.mode-catalog .hero{max-width:680px}.mode-orbit .hero{text-align:center;margin:auto}.mode-story .products{grid-template-columns:1fr}.mode-story .prod{min-height:112px}.empty{opacity:.72}@media(max-width:680px){.products{grid-template-columns:1fr}.hero{padding-top:55px}.hero h1{font-size:16vw}.editorial-art,.bento,.split-art,.catalog-lines,.orbit-art,.story-art{display:none}}</style></head><body><div class='wrap mode-"+variant+"'><div class='gridbg'></div><div class='nav'><div class='brand'>"+name+"</div><div class='chip'>DEWIFY / "+String(t.number).padStart(2,"0")+"</div></div><section class='hero'><div class='eyebrow'>"+esc(t.niche)+" · "+esc(t.style)+"</div><h1>"+tag+"</h1><p>"+esc(s.store.promise||"Digital products, made simple.")+"</p>"+shape+"<span class='cta'>"+esc(s.store.cta||"Get it now")+"</span></section><section class='products'>"+lead+"</section></div></body></html>";
}
window.DEWIFY_BUILDER={$, $$, esc, slug, accountId, getState, saveState, patch, readiness, validDomain, setupFields, getTemplates, templateById, templateDoc, putFile, getFile, removeFile, dataUrlFromBlob, key:stateKey};
})();