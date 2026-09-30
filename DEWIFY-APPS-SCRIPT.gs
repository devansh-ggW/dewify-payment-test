/**
 * DEWIFY — Orders + Products + Admin API
 *
 * Public storefront:
 *   GET ?action=products
 *
 * Customer checkout:
 *   POST { clientRequestId, customer, items, paymentMethod }
 *
 * Admin:
 *   POST { action:"auth"|"listOrders"|"latestOrder"|"listProducts"|"seedProducts"|"saveProduct"|"deleteProduct"|"uploadProductImage"|"updateOrder"|"deleteOrder", token:"..." }
 */

const SPREADSHEET_ID = "1uSjmnq_7uP0y4PlJtmRchtHB7ouzFbIrfp0YuQG5oic";
const SHEET_NAME = "DEWIFY Orders";
const PRODUCTS_SHEET_NAME = "DEWIFY Products";
const ADMIN_TOKEN = "SET_IN_APPS_SCRIPT";
const PRODUCT_IMAGE_FOLDER = "DEWIFY Product Images";

const HEADERS = [
  "Order ID","Date/Time","Customer Name","Phone","Email","Address","City",
  "State","PIN Code","Product(s)","Quantity","Total Amount","Payment Method",
  "Order Status","Payment Status","Payment Reference","Notes","Updated At"
];
const PRODUCT_HEADERS = [
  "Product ID","Name","Category","Price","Badge","SKU","Source URL","Images",
  "Description","Highlights","Active","Created At","Updated At"
];

const MAX_NAME=120, MAX_PHONE=30, MAX_EMAIL=200, MAX_ADDRESS=500;
const MAX_CITY=100, MAX_STATE=100, MAX_PIN=6, MAX_ITEMS=30;
const MAX_PRODUCT_NAME=180, MAX_PRODUCT_URL=2000, MAX_IMAGE_URLS=12, MAX_DESCRIPTION=1200;
const MAX_HIGHLIGHT=220, MAX_HIGHLIGHTS=12, MAX_IMAGE_BYTES=3200000;
const ORDER_STATUSES=["NEW","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED"];
const PAYMENT_STATUSES=["PENDING","PAID","FAILED","REFUNDED","COD_PENDING"];

/* ---------- HTTP ---------- */
function doGet(e){
  const action=clean_(e&&e.parameter?e.parameter.action:"",40);
  if(action==="products") return json_({ok:true,products:listProducts_(true)});
  return json_({ok:true,service:"DEWIFY Orders API",status:"online",version:"3.0"});
}
function doPost(e){
  try{
    if(!e||!e.postData||typeof e.postData.contents!=="string") throw new Error("Missing request body.");
    let input; try{input=JSON.parse(e.postData.contents);}catch(_){throw new Error("Invalid JSON request body.");}
    const action=clean_(input.action,40);

    if(["auth","listOrders","latestOrder","listProducts"].indexOf(action)!==-1){
      requireAdmin_(input.token);
      if(action==="auth") return json_({ok:true,authenticated:true});
      if(action==="listOrders") return json_({ok:true,orders:listOrders_()});
      if(action==="latestOrder") return json_({ok:true,order:latestOrder_()});
      return json_({ok:true,products:listProducts_(false)});
    }

    if(["seedProducts","saveProduct","deleteProduct","uploadProductImage","updateOrder","deleteOrder"].indexOf(action)!==-1){
      const lock=LockService.getScriptLock();
      try{
        lock.waitLock(8000); requireAdmin_(input.token);
        if(action==="seedProducts") return json_({ok:true,seeded:seedProducts_(input.products||[])});
        if(action==="saveProduct") return json_({ok:true,product:saveProduct_(input.product||{})});
        if(action==="deleteProduct") return json_({ok:true,deleted:deleteProduct_(input.productId)});
        if(action==="uploadProductImage") return json_({ok:true,url:uploadProductImage_(input)});
        if(action==="updateOrder") return json_({ok:true,order:updateOrder_(input)});
        return json_({ok:true,deleted:deleteOrder_(input.orderId)});
      } finally { try{lock.releaseLock();}catch(_){} }
    }
    return createOrder_(input);
  }catch(err){
    console.error(err&&err.stack?err.stack:err);
    return json_({ok:false,error:err&&err.message?err.message:String(err)});
  }
}

/* ---------- Customer order ---------- */
function createOrder_(input){
  const order=validateAndNormalize_(input);
  const early=findClientRequestId_(order.clientRequestId);
  if(early) return json_({ok:true,duplicate:true,orderId:early.orderId,createdAt:early.createdAt,orderStatus:early.orderStatus});
  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(8000);
    const existing=findClientRequestId_(order.clientRequestId);
    if(existing) return json_({ok:true,duplicate:true,orderId:existing.orderId,createdAt:existing.createdAt,orderStatus:existing.orderStatus});
    const sheet=getOrdersSheetFast_(), orderId=createUniqueOrderId_(), now=new Date();
    const row=new Array(HEADERS.length).fill("");
    row[0]=orderId; row[1]=now; row[2]=order.customer.name; row[3]=order.customer.phone;
    row[4]=order.customer.email; row[5]=order.customer.address; row[6]=order.customer.city; row[7]=order.customer.state;
    row[8]=order.customer.pincode; row[9]=order.items.map(i=>i.name+" × "+i.qty).join(" | ");
    row[10]=order.items.reduce((s,i)=>s+i.qty,0); row[11]=order.total; row[12]=order.paymentMethod; row[13]="NEW";
    row[14]=order.paymentMethod==="COD"?"COD_PENDING":"PENDING"; row[17]=now;
    sheet.appendRow(row);
    rememberClientRequest_(order.clientRequestId,{orderId:orderId,createdAt:now.toISOString(),orderStatus:"NEW"});
    return json_({ok:true,orderId:orderId,createdAt:now.toISOString(),orderStatus:"NEW",paymentStatus:row[14]});
  }finally{try{lock.releaseLock();}catch(_){}}
}
function validateAndNormalize_(input){
  if(!input||typeof input!=="object") throw new Error("Invalid payload.");
  const clientRequestId=clean_(input.clientRequestId,100); if(!clientRequestId) throw new Error("Missing request ID.");
  const c=input.customer||{}, customer={
    name:clean_(c.name,MAX_NAME),phone:clean_(c.phone,MAX_PHONE),email:clean_(c.email,MAX_EMAIL).toLowerCase(),
    address:clean_(c.address,MAX_ADDRESS),city:clean_(c.city,MAX_CITY),state:clean_(c.state,MAX_STATE),pincode:clean_(c.pincode,MAX_PIN)
  };
  if(!customer.name) throw new Error("Customer name is required.");
  if(!/^\+?[0-9\s()\-]{10,20}$/.test(customer.phone)) throw new Error("Invalid phone number.");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error("Invalid email.");
  if(!customer.address||!customer.city||!customer.state) throw new Error("Complete delivery details are required.");
  if(!/^\d{6}$/.test(customer.pincode)) throw new Error("Invalid PIN code.");
  if(!Array.isArray(input.items)||input.items.length<1||input.items.length>MAX_ITEMS) throw new Error("Invalid items.");
  const items=input.items.map(function(item){
    const name=clean_(item.name,200),id=clean_(item.id,100),qty=Number(item.qty),price=Number(item.price);
    if(!name||!id) throw new Error("Invalid product."); if(!Number.isInteger(qty)||qty<1||qty>99) throw new Error("Invalid quantity.");
    if(!Number.isFinite(price)||price<0||price>100000000) throw new Error("Invalid product price.");
    return {id:id,name:name,qty:qty,price:price};
  });
  const total=items.reduce((s,i)=>s+i.price*i.qty,0); if(!Number.isFinite(total)||total<0) throw new Error("Invalid total.");
  const paymentMethod=clean_(input.paymentMethod,30).toUpperCase();
  if(["ONLINE","UPI","COD"].indexOf(paymentMethod)===-1) throw new Error("Invalid payment method.");
  return {clientRequestId:clientRequestId,customer:customer,items:items,total:Math.round(total),paymentMethod:paymentMethod};
}

/* ---------- Sheets ---------- */
function getOrdersSheetFast_(){
  let ss; try{ss=SpreadsheetApp.openById(SPREADSHEET_ID);}catch(_){throw new Error("Could not open spreadsheet. Check SPREADSHEET_ID and Apps Script authorization.");}
  let sheet=ss.getSheetByName(SHEET_NAME); if(!sheet) sheet=ss.insertSheet(SHEET_NAME);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);sheet.setFrozenRows(1);sheet.getRange(1,1,1,HEADERS.length).setFontWeight("bold");}
  return sheet;
}
function getReadOnlyOrdersSheet_(){
  let ss; try{ss=SpreadsheetApp.openById(SPREADSHEET_ID);}catch(_){throw new Error("Could not open spreadsheet. Check SPREADSHEET_ID and Apps Script authorization.");}
  return ss.getSheetByName(SHEET_NAME);
}
function getOrdersSheet_(){const s=getOrdersSheetFast_();ensureHeaders_(s);return s;}
function ensureHeaders_(sheet){
  const width=Math.max(sheet.getLastColumn(),HEADERS.length),current=sheet.getRange(1,1,1,width).getValues()[0];
  HEADERS.forEach(function(h,i){if(current[i]!==h){if(i<14)throw new Error('The first 14 headers of "'+SHEET_NAME+'" do not match the required order.');sheet.getRange(1,i+1).setValue(h);}});
}

/* ---------- Products ---------- */
function productsSheet_(){
  let ss; try{ss=SpreadsheetApp.openById(SPREADSHEET_ID);}catch(_){throw new Error("Could not open spreadsheet. Check SPREADSHEET_ID and Apps Script authorization.");}
  let sheet=ss.getSheetByName(PRODUCTS_SHEET_NAME); if(!sheet) sheet=ss.insertSheet(PRODUCTS_SHEET_NAME);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,PRODUCT_HEADERS.length).setValues([PRODUCT_HEADERS]);sheet.setFrozenRows(1);sheet.getRange(1,1,1,PRODUCT_HEADERS.length).setFontWeight("bold");}
  return sheet;
}
function seedProducts_(items){
  const sheet=productsSheet_(); if(sheet.getLastRow()>1) return 0;
  if(!Array.isArray(items)||!items.length) return 0;
  const now=new Date(), rows=items.map(function(p){
    const n=normalizeProduct_(p); return [n.id,n.name,n.category,n.price,n.badge,n.sku,n.sourceUrl,n.images.join("\n"),n.description,n.highlights.join("\n"),n.active,now,now];
  });
  sheet.getRange(2,1,rows.length,PRODUCT_HEADERS.length).setValues(rows); return rows.length;
}
function listProducts_(publicOnly){
  const sheet=productsSheet_(),last=sheet.getLastRow(); if(last<2)return [];
  return sheet.getRange(2,1,last-1,PRODUCT_HEADERS.length).getValues()
    .filter(function(r){return String(r[0]||"").trim()&&(!publicOnly||r[10]!==false);})
    .map(productFromRow_);
}
function productFromRow_(r){
  return {
    id:String(r[0]||""),name:String(r[1]||""),category:String(r[2]||"Home"),price:Number(r[3])||0,badge:String(r[4]||""),sku:String(r[5]||""),
    sourceUrl:String(r[6]||""),images:String(r[7]||"").split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean),
    description:String(r[8]||""),highlights:String(r[9]||"").split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean),
    active:r[10]!==false,createdAt:toIso_(r[11]),updatedAt:toIso_(r[12])
  };
}
function normalizeProduct_(p){
  if(!p||typeof p!=="object") throw new Error("Invalid product.");
  const id=clean_(p.id,100),name=clean_(p.name,MAX_PRODUCT_NAME),category=clean_(p.category,30),price=Number(p.price);
  if(!id||!/^[a-z0-9][a-z0-9\-_]{2,99}$/i.test(id)) throw new Error("Invalid product ID.");
  if(!name) throw new Error("Product name is required.");
  if(["Home","Wear","Pet"].indexOf(category)===-1) throw new Error("Invalid product category.");
  if(!Number.isFinite(price)||price<0||price>100000000) throw new Error("Invalid product price.");
  const images=(Array.isArray(p.images)?p.images:[]).map(function(x){return clean_(x,MAX_PRODUCT_URL);}).filter(Boolean).slice(0,MAX_IMAGE_URLS);
  if(!images.length) throw new Error("At least one product image is required.");
  images.forEach(function(u){if(!/^https?:\/\//i.test(u)) throw new Error("Every product image must use http:// or https://.");});
  const highlights=(Array.isArray(p.highlights)?p.highlights:[]).map(function(x){return clean_(x,MAX_HIGHLIGHT);}).filter(Boolean).slice(0,MAX_HIGHLIGHTS);
  return {id:id,name:name,category:category,price:Math.round(price),badge:clean_(p.badge,80),sku:clean_(p.sku,120),sourceUrl:clean_(p.sourceUrl,MAX_PRODUCT_URL),images:images,description:clean_(p.description,MAX_DESCRIPTION),highlights:highlights,active:p.active!==false};
}
function findProductRow_(sheet,id){
  const cleanId=clean_(id,100); if(!cleanId) throw new Error("Product ID is required.");
  const last=sheet.getLastRow(); if(last<2)return -1;
  const ids=sheet.getRange(2,1,last-1,1).getDisplayValues().flat(),i=ids.indexOf(cleanId); return i<0?-1:i+2;
}
function saveProduct_(input){
  const p=normalizeProduct_(input),sheet=productsSheet_(),row=findProductRow_(sheet,p.id),now=new Date();
  const created=row<0?now:sheet.getRange(row,12).getValue();
  const values=[p.id,p.name,p.category,p.price,p.badge,p.sku,p.sourceUrl,p.images.join("\n"),p.description,p.highlights.join("\n"),p.active,created,now];
  if(row<0)sheet.appendRow(values);else sheet.getRange(row,1,1,PRODUCT_HEADERS.length).setValues([values]);
  return Object.assign(p,{createdAt:toIso_(created),updatedAt:now.toISOString()});
}
function deleteProduct_(id){const sheet=productsSheet_(),row=findProductRow_(sheet,id);if(row<0)throw new Error("Product not found.");sheet.deleteRow(row);return true;}
function getImageFolder_(){const fs=DriveApp.getFoldersByName(PRODUCT_IMAGE_FOLDER);return fs.hasNext()?fs.next():DriveApp.createFolder(PRODUCT_IMAGE_FOLDER);}
function uploadProductImage_(input){
  const mime=clean_(input.mimeType,100).toLowerCase(),name=clean_(input.fileName,180)||("product-"+Date.now()+".jpg"),encoded=String(input.dataBase64||"");
  if(!encoded)throw new Error("Image data is missing.");
  if(["image/jpeg","image/png","image/webp","image/gif"].indexOf(mime)===-1)throw new Error("Unsupported image type.");
  let bytes;try{bytes=Utilities.base64Decode(encoded);}catch(_){throw new Error("Invalid image data.");}
  if(bytes.length>MAX_IMAGE_BYTES)throw new Error("Image is too large.");
  const file=getImageFolder_().createFile(Utilities.newBlob(bytes,mime,name));
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(_){}
  return "https://drive.google.com/uc?export=view&id="+file.getId();
}

/* ---------- Admin orders ---------- */
function requireAdmin_(token){
  if(!ADMIN_TOKEN||ADMIN_TOKEN==="SET_IN_APPS_SCRIPT")throw new Error("Admin token is not configured in DEWIFY-APPS-SCRIPT.gs.");
  if(typeof token!=="string"||token.length<5||token!==ADMIN_TOKEN)throw new Error("Unauthorized.");
}
function listOrders_(){
  const sheet=getReadOnlyOrdersSheet_();if(!sheet)return [];
  const last=sheet.getLastRow();if(last<2)return [];
  return sheet.getRange(2,1,last-1,HEADERS.length).getValues().filter(r=>String(r[0]||"").trim()).map(function(r){
    return {id:String(r[0]||""),createdAt:toIso_(r[1]),customer:{name:String(r[2]||""),phone:String(r[3]||""),email:String(r[4]||""),address:String(r[5]||""),city:String(r[6]||""),state:String(r[7]||""),pincode:String(r[8]||"")},products:String(r[9]||""),quantity:Number(r[10])||0,total:Number(r[11])||0,paymentMethod:String(r[12]||""),orderStatus:String(r[13]||"NEW"),paymentStatus:String(r[14]||"PENDING"),paymentReference:String(r[15]||""),notes:String(r[16]||""),updatedAt:toIso_(r[17])};
  });
}
function latestOrder_(){
  const sheet=getReadOnlyOrdersSheet_();if(!sheet)return null;const last=sheet.getLastRow();if(last<2)return null;
  const r=sheet.getRange(last,1,1,HEADERS.length).getValues()[0];if(!String(r[0]||"").trim())return null;
  return {id:String(r[0]||""),createdAt:toIso_(r[1]),updatedAt:toIso_(r[17]),orderStatus:String(r[13]||"NEW"),total:Number(r[11])||0};
}
function findRowByOrderId_(sheet,id){const cleanId=clean_(id,100);if(!cleanId)throw new Error("Order ID is required.");const last=sheet.getLastRow();if(last<2)return -1;const ids=sheet.getRange(2,1,last-1,1).getDisplayValues().flat(),i=ids.indexOf(cleanId);return i<0?-1:i+2;}
function updateOrder_(input){
  const sheet=getOrdersSheet_(),row=findRowByOrderId_(sheet,input.orderId);if(row<0)throw new Error("Order not found.");
  const orderStatus=clean_(input.orderStatus,30).toUpperCase(),paymentStatus=clean_(input.paymentStatus,30).toUpperCase();
  if(ORDER_STATUSES.indexOf(orderStatus)<0)throw new Error("Invalid order status.");if(PAYMENT_STATUSES.indexOf(paymentStatus)<0)throw new Error("Invalid payment status.");
  const now=new Date();sheet.getRange(row,14).setValue(orderStatus);sheet.getRange(row,15).setValue(paymentStatus);sheet.getRange(row,18).setValue(now);
  return {id:String(sheet.getRange(row,1).getDisplayValue()),orderStatus:orderStatus,paymentStatus:paymentStatus,updatedAt:now.toISOString()};
}
function deleteOrder_(id){const sheet=getOrdersSheet_(),row=findRowByOrderId_(sheet,id);if(row<0)throw new Error("Order not found.");sheet.deleteRow(row);return true;}

/* ---------- Idempotency + helpers ---------- */
function findClientRequestId_(id){
  const props=PropertiesService.getScriptProperties(),raw=props.getProperty("DEWIFY_IDEMPOTENCY");if(!raw)return null;
  try{const map=JSON.parse(raw),hit=map[id];if(!hit)return null;if(Date.now()-new Date(hit.createdAt).getTime()>86400000){delete map[id];props.setProperty("DEWIFY_IDEMPOTENCY",JSON.stringify(map));return null;}return hit;}catch(_){return null;}
}
function rememberClientRequest_(id,value){
  const props=PropertiesService.getScriptProperties();let map={};try{map=JSON.parse(props.getProperty("DEWIFY_IDEMPOTENCY")||"{}");}catch(_){map={};}
  const now=Date.now();Object.keys(map).forEach(function(k){if(!map[k]||now-new Date(map[k].createdAt).getTime()>86400000)delete map[k];});map[id]=value;
  const keys=Object.keys(map);if(keys.length>500)keys.sort(function(a,b){return new Date(map[a].createdAt)-new Date(map[b].createdAt);}).slice(0,keys.length-500).forEach(function(k){delete map[k];});
  props.setProperty("DEWIFY_IDEMPOTENCY",JSON.stringify(map));
}
function createUniqueOrderId_(){return "DEWIFY-"+Utilities.getUuid().replace(/-/g,"").slice(0,6).toUpperCase();}
function clean_(value,max){if(value===null||value===undefined)return "";let t=String(value).trim();if(/^[=+\-@]/.test(t))t="'"+t;return t.slice(0,max);}
function toIso_(value){if(!value)return "";const d=value instanceof Date?value:new Date(value);return isNaN(d.getTime())?String(value):d.toISOString();}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
