(() => {
const c=document.getElementById("builder-stars");if(!c)return;const x=c.getContext("2d");let w=0,h=0,d=1,ss=[],raf=0;
function size(){w=innerWidth;h=innerHeight;d=Math.min(devicePixelRatio||1,1);c.width=w*d;c.height=h*d;c.style.width=w+"px";c.style.height=h+"px";x.setTransform(d,0,0,d,0,0);ss=Array.from({length:Math.max(34,Math.min(90,Math.round(w*h/16000)))},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*.9+.25,a:Math.random()*.55+.16}));}
function draw(){x.clearRect(0,0,w,h);for(const s of ss){x.globalAlpha=s.a;x.fillStyle="#f0c85a";x.fillRect(s.x,s.y,s.r,s.r);}raf=requestAnimationFrame(draw);}
size();draw();addEventListener("resize",size,{passive:true});addEventListener("beforeunload",()=>cancelAnimationFrame(raf));
})();