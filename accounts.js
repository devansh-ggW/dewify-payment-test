(()=>{"use strict";
const AK="dewify:browser-accounts:v1";
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
function clean(a){a=a&&typeof a==="object"?a:{};return{name:String(a.name||"").trim().slice(0,100)}}
function load(){try{const x=JSON.parse(localStorage.getItem(AK)||"null");if(x&&Array.isArray(x.accounts)){return{accounts:x.accounts.map(a=>({id:String(a.id||Date.now()),createdAt:Number(a.createdAt)||Date.now(),...clean(a)})),activeId:x.activeId||x.accounts[0]?.id||null}}}catch{}return{accounts:[],activeId:null}}
function save(x){localStorage.setItem(AK,JSON.stringify(x))}
function initials(a){return String(a.name||"A").trim().slice(0,2).toUpperCase()}
function current(){const s=load();return s.accounts.find(a=>a.id===s.activeId)||null}
function ensureAccount(){let s=load();if(!s.accounts.length){const a={id:"account-"+Date.now().toString(36),createdAt:Date.now(),name:"My Workspace"};s={accounts:[a],activeId:a.id};save(s)}return s}
function mount(){
 if(document.body.dataset.accountsReady==="1")return;
 const slot=$("#builder-account-slot");if(!slot)return;
 document.body.dataset.accountsReady="1";
 let s=ensureAccount();
 const trigger=document.createElement("button");trigger.type="button";trigger.className="dewify-accounts-trigger";trigger.innerHTML="<span class='account-glyph'>◈</span><span>Account</span><span class='dewify-accounts-count'>1</span>";slot.appendChild(trigger);
 const back=document.createElement("div");back.className="dewify-accounts-backdrop";
 const panel=document.createElement("aside");panel.className="dewify-accounts-panel";panel.setAttribute("aria-hidden","true");
 panel.innerHTML="<div class='dewify-accounts-head'><div><p class='dewify-local-profile-kicker'>DEWIFY / BROWSER ACCOUNTS</p><h2>Workspaces</h2></div><button type='button' class='dewify-accounts-close' aria-label='Close accounts'>×</button></div><div class='dewify-accounts-body'><div class='dewify-account-list'></div><div class='dewify-accounts-divider'></div><form class='dewify-accounts-form'><label>New account<input name='name' required maxlength='100' placeholder='e.g. My second store'></label><button class='dewify-accounts-add' type='submit'>Create browser account</button></form><p class='dewify-accounts-note'>Accounts live only in this browser. No email address, phone number or server login is needed. Each account has its own builder workspace and product files.</p></div>";
 document.body.append(back,panel);
 const list=$(".dewify-account-list",panel),form=$(".dewify-accounts-form",panel);
 function render(){
   s=ensureAccount();const count=$(".dewify-accounts-count",trigger);if(count)count.textContent=s.accounts.length;
   list.innerHTML=s.accounts.map(a=>"<article class='dewify-account-card "+(a.id===s.activeId?"active":"")+"'><div class='dewify-account-avatar'>"+esc(initials(a))+"</div><div class='dewify-account-copy'><strong>"+esc(a.name)+"</strong><span>"+(a.id===s.activeId?"Current browser workspace":"Stored locally")+"</span></div><button class='dewify-account-switch' type='button' data-account-id='"+esc(a.id)+"' "+(a.id===s.activeId?"disabled":"")+">"+(a.id===s.activeId?"Active":"Switch")+"</button></article>").join("");
 }
 function open(){render();panel.classList.add("is-open");back.classList.add("is-open");panel.setAttribute("aria-hidden","false")}
 function close(){panel.classList.remove("is-open");back.classList.remove("is-open");panel.setAttribute("aria-hidden","true")}
 trigger.addEventListener("click",open);back.addEventListener("click",close);$(".dewify-accounts-close",panel).addEventListener("click",close);
 list.addEventListener("click",e=>{const b=e.target.closest("[data-account-id]");if(!b||b.disabled)return;s=ensureAccount();s.activeId=b.dataset.accountId;save(s);location.reload()});
 form.addEventListener("submit",e=>{e.preventDefault();const name=String(new FormData(form).get("name")||"").trim();if(!name)return;s=ensureAccount();const a={id:"account-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),createdAt:Date.now(),name};s.accounts.push(a);s.activeId=a.id;save(s);location.reload()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();