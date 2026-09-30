(() => {
"use strict";
const STATE_KEY="dewify:builder:v4",DB_NAME="dewify-builder-v4",STORE="thumbs";
const TEMPLATES=[
{id:"noir",name:"Noir Dew",desc:"The closest match to the DEWIFY storefront.",tone:"noir"},
{id:"paper",name:"Paper Studio",desc:"Warm editorial pages with a printed-store feel.",tone:"paper"},
{id:"gallery",name:"Gallery",desc:"Image-led layouts built around product visuals.",tone:"gallery"},
{id:"signal",name:"Signal",desc:"Sharp, technical, high-contrast commerce.",tone:"signal"},
{id:"archive",name:"Archive",desc:"Rich, earthy editorial commerce with strong type.",tone:"archive"},
{id:"studio",name:"Studio",desc:"Light, minimal and product-first.",tone:"studio"}];
const DEFAULT={store:{name:"",email:"",phone:"",location:"",description:"",domain:"",currency:"INR"},template:"noir",products:[],cookies:false,payment:"razorpay"};
let state=load();
function load(){try{const p=JSON.parse(localStorage.getItem(STATE_KEY)||"null");if(!p)return JSON.parse(JSON.stringify(DEFAULT));return Object.assign({},DEFAULT,p,{store:Object.assign({},DEFAULT.store,p.store||{}),products:Array.isArray(p.products)?p.products:[]});}catch{return JSON.parse(JSON.stringify(DEFAULT));}}
function save(){try{localStorage.setItem(STATE_KEY,JSON.stringify(state));document.dispatchEvent(new Event("dewify:state-saved"));return true;}catch{document.dispatchEvent(new Event("dewify:state-save-failed"));return false;}}
function getState(){return JSON.parse(JSON.stringify(state));}
function updateStore(k,v){state.store[k]=v;save();}
function selectTemplate(id){if(TEMPLATES.some(t=>t.id===id)){state.template=id;save();}}
function setCookies(v){state.cookies=!!v;save();}
function setPayment(v){if(["razorpay","stripe","custom"].includes(v)){state.payment=v;save();}}
function db(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function putThumb(id,blob){const d=await db();await new Promise((res,rej)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(blob,id);t.oncomplete=res;t.onerror=()=>rej(t.error);});d.close();}
async function getThumb(id){const d=await db();const b=await new Promise((res,rej)=>{const t=d.transaction(STORE,"readonly"),r=t.objectStore(STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error);});d.close();return b;}
async function deleteThumb(id){if(!id)return;const d=await db();await new Promise((res,rej)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).delete(id);t.oncomplete=res;t.onerror=()=>rej(t.error);});d.close();}
async function addProduct(p,blob){const id="p_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);const item={id,name:String(p.name||"Untitled product").trim()||"Untitled product",price:String(p.price||"0").trim()||"0",currency:String(p.currency||state.store.currency||"INR"),category:String(p.category||"General").trim()||"General",description:String(p.description||"").trim(),buyUrl:String(p.buyUrl||"").trim(),thumbKey:blob?id:null};if(blob)await putThumb(id,blob);state.products.push(item);save();return item;}
async function removeProduct(id){const p=state.products.find(x=>x.id===id);state.products=state.products.filter(x=>x.id!==id);await deleteThumb(p&&p.thumbKey?p.thumbKey:id);save();}
function findTemplate(id){return TEMPLATES.find(t=>t.id===id)||TEMPLATES[0];}
window.DEWIFY_BUILDER={getState,save,updateStore,selectTemplate,setCookies,setPayment,addProduct,removeProduct,getThumb,findTemplate,listTemplates:()=>JSON.parse(JSON.stringify(TEMPLATES))};
})();