(()=>{"use strict";
const c=document.getElementById("builder-stars");if(!c)return;
const x=c.getContext("2d",{alpha:true});if(!x)return;
let w=0,h=0,dpr=1,hidden=false,raf=0,last=0;const stars=[];
const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(window.devicePixelRatio||1,1);c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.width=w+"px";c.style.height=h+"px";x.setTransform(dpr,0,0,dpr,0,0);stars.length=0;const n=w<650?55:95;for(let i=0;i<n;i++)stars.push({x:Math.random()*w,y:Math.random()*h,r:.45+Math.random()*.8,a:.18+Math.random()*.55,p:Math.random()*6.28,s:.015+Math.random()*.025})}
function draw(t){if(hidden)return;const dt=Math.min(60,t-(last||t-30));last=t;x.clearRect(0,0,w,h);for(const s of stars){if(!reduce)s.x-=dt*s.s;if(s.x<0)s.x=w; x.globalAlpha=s.a*(.88+.12*Math.sin(t*.001+s.p));x.fillStyle="#f1cc67";x.fillRect(s.x,s.y,s.r,s.r)}x.globalAlpha=1;raf=requestAnimationFrame(draw)}
document.addEventListener("visibilitychange",()=>{hidden=document.hidden;if(!hidden){last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(draw)}});addEventListener("resize",resize,{passive:true});resize();raf=requestAnimationFrame(draw);
})();