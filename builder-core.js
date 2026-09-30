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
  {id:"editorial",name:"Editorial",layout:"Editorial shelf",mark:"EL"},
  {id:"grid",name:"Grid",layout:"Dense catalog",mark:"GR"},
  {id:"split",name:"Split",layout:"Split hero",mark:"SP"},
  {id:"mono",name:"Mono",layout:"Minimal catalog",mark:"MN"},
  {id:"orbit",name:"Orbit",layout:"Featured orbit",mark:"OR"},
  {id:"stack",name:"Stack",layout:"Story stack",mark:"ST"}
];
const TEMPLATES=[];
let tid=1;
NICHES.forEach((n,ni)=>STYLES.forEach((s,si)=>TEMPLATES.push({id:"tpl-"+String(tid++).padStart(3,"0"),name:n+" "+s.name,niche:n,style:s.name,layout:s.layout,mark:s.mark,number:tid-1,accent:["#f0c85a","#e8b955","#ffd978","#ddb24d"][((ni+si)%4)]})));
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
  t=t||templateById(s.templateId)||TEMPLATES[0];s=s||STATE;
  const product=s.products[0];
  const name=esc(s.store.name||"YOUR STORE"),tag=esc(s.store.tagline||"Digital products, made simple."),accent=esc(s.store.accent||t.accent);
  const products=s.products.slice(0,4).map((p,i)=>"<article class='prod'><div class='prod-no'>0"+(i+1)+"</div><div><span>"+esc(p.category||"DIGITAL")+"</span><h3>"+esc(p.title||"Untitled product")+"</h3><p>"+esc(p.description||"Ready to use.")+"</p><strong>"+esc(p.price||"")+"</strong></div></article>").join("");
  const mode=String(t.style||"Editorial").toLowerCase();
  return "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><style>"+
  "*{box-sizing:border-box}body{margin:0;background:#050505;color:#f6f3eb;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}.wrap{min-height:100vh;padding:28px 6vw;position:relative;overflow:hidden}.noise{position:absolute;inset:0;opacity:.12;background-image:radial-gradient(circle at 10% 15%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 75% 30%,#f0c85a 0 1px,transparent 1.5px);background-size:95px 95px,125px 125px}.nav,.hero,.products{position:relative;z-index:1;max-width:1040px;margin:auto}.nav{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #262626;padding-bottom:16px}.brand{font-weight:900;letter-spacing:.12em}.chip{border:1px solid #2f2f2f;padding:7px 9px;font:9px ui-monospace,monospace;color:#97948d}.hero{padding:90px 0 50px}.eyebrow{color:"+accent+";font:9px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}.hero h1{font-size:clamp(48px,8vw,98px);line-height:.86;letter-spacing:-.075em;max-width:850px;margin:14px 0}.hero p{max-width:560px;color:#99958b;line-height:1.7}.cta{display:inline-block;margin-top:20px;background:"+accent+";color:#15110a;padding:12px 15px;font-weight:900;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.products{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.prod{border:1px solid #252525;background:#0c0c0c;padding:16px;min-height:180px;display:flex;gap:18px}.prod-no{color:#5d5a54;font:10px ui-monospace,monospace}.prod span{color:#6f6c64;font:9px ui-monospace,monospace}.prod h3{margin:25px 0 8px;font-size:22px;letter-spacing:-.05em}.prod p{color:#8e8a82;font-size:11px}.prod strong{font-size:11px}.mode-"+mode+" .hero{max-width:"+ (mode==="split"?"580px":mode==="grid"?"720px":mode==="mono"?"650px":mode==="orbit"?"760px":"820px") + "}.mode-"+mode+" .prod{min-height:"+(mode==="stack"?"130":"180")+"px}"+
  "</style></head><body><div class='wrap mode-"+mode+"'><div class='noise'></div><div class='nav'><div class='brand'>"+name+"</div><div class='chip'>DEWIFY TEMPLATE "+esc(t.number)+"</div></div><section class='hero'><div class='eyebrow'>"+esc(t.niche)+" / "+esc(t.style)+"</div><h1>"+tag+"</h1><p>"+esc(s.store.promise)+"</p><span class='cta'>"+esc(s.store.cta)+"</span></section><section class='products'>"+products+(product?"":"<div class='prod'><div class='prod-no'>--</div><div><span>PRODUCTS</span><h3>Your products will appear here.</h3><p>Add your first product from the Products page.</p></div></div>")+"</section></div></body></html>";
}
window.DEWIFY_BUILDER={$, $$, esc, slug, accountId, getState, saveState, patch, readiness, validDomain, setupFields, getTemplates, templateById, templateDoc, putFile, getFile, removeFile, dataUrlFromBlob, key:stateKey};
})();