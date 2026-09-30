from __future__ import annotations
import hashlib, re, shutil, zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
TMP = REPO / ".webble-build-tmp"
BATCHES = (100, 300, 500, 700)

ADJ = ["Obsidian","Velvet","Signal","Afterglow","Ritual","North","Static","Silver","Fever","Monument","Noir","Cinder","Orbit","Axiom","Lucid","Arc","Rare","Morrow","Echo","Vanta","Kindred","Halo","Field","Mosaic","Wild","Local","Future","Tonic","Quiet","Analog","Golden","Feral","Sunday","Electric","Midnight","Sable","Open","Prime","Tide","Copper"]
NOUN = ["Studio","Supply","House","Works","Club","Atelier","Collective","Lab","Co.","Foundry","Bureau","Office","Society","Workshop","Journal","Market","Archive","Kitchen","Gallery","Practice","Dept.","Union","Press","Objects","Systems","Signal","Motion","Rooms","Fieldnotes","Projects"]
NICHES = [
("creative studio","portfolio","Work","Brand systems, campaigns and visual identities."),
("architecture practice","business","Projects","Spaces, plans and future-facing places."),
("interior studio","portfolio","Spaces","Rooms designed to feel inevitable, not decorated."),
("fashion label","commerce","Collection","Cut, texture and attitude in equal measure."),
("jewelry label","commerce","Objects","Small objects with a strong point of view."),
("furniture brand","commerce","Objects","Furniture for rooms that refuse to look generic."),
("coffee house","hospitality","Menu","Coffee, food and a room worth lingering in."),
("restaurant","hospitality","Menu","A sharp menu, a warm room, zero filler."),
("bakery","hospitality","Menu","Long-fermented, oven-hot and slightly obsessive."),
("hotel","hospitality","Stay","A quieter kind of luxury, built around details."),
("barber studio","business","Services","Classic cuts, precise grooming, modern atmosphere."),
("tattoo studio","portfolio","Artists","Custom work, clean process and real artists."),
("photographer","portfolio","Archive","Frames from people, places and strange little moments."),
("film director","portfolio","Films","Stories built from atmosphere, rhythm and restraint."),
("music artist","creator","Releases","New work, live dates and the archive behind it."),
("creative director","portfolio","Case studies","Ideas that survive contact with the real world."),
("branding agency","agency","Capabilities","Strategy and identity for brands with somewhere to go."),
("marketing agency","agency","Services","Sharp campaigns, clear positioning and measurable motion."),
("product studio","agency","Products","Digital products designed around actual behavior."),
("web developer","creator","Builds","Fast, tactile websites with code you can understand."),
("saas startup","startup","Product","A calm interface for a complicated job."),
("mobile app","startup","Features","A focused product with less friction between thought and action."),
("fintech startup","startup","Platform","Money tools designed to make decisions legible."),
("consultant","business","Practice","Research, clarity and execution without consultant theater."),
("career coach","creator","Programs","A practical reset for people ready to move."),
("online course","education","Curriculum","Lessons designed to turn curiosity into capability."),
("newsletter","editorial","Issues","One strong idea every week."),
("magazine","editorial","Stories","Culture, craft, people and the things between the lines."),
("book publisher","editorial","Titles","Books for readers who underline sentences."),
("author","creator","Books","Writing, notes and the work around the work."),
("art gallery","culture","Exhibitions","Contemporary work in a room built for attention."),
("artist portfolio","culture","Works","Paint, pixels, paper, process."),
("event collective","events","Calendar","Gatherings with better energy than the average conference."),
("wedding planner","events","Weddings","Beautifully run days without visible machinery."),
("festival","events","Lineup","Three days. One site. A lot to remember."),
("travel studio","travel","Journeys","Routes worth taking slowly."),
("tour operator","travel","Trips","Thoughtful itineraries with room for surprise."),
("real estate studio","property","Listings","Homes presented with architecture-level attention."),
("property developer","property","Projects","Places that make a neighborhood more useful."),
("construction company","business","Capabilities","Build cleanly. Communicate clearly. Deliver properly."),
("landscape studio","business","Gardens","Outdoor spaces designed as places, not leftovers."),
("wellness studio","wellness","Classes","Movement, recovery and a slower nervous system."),
("fitness club","wellness","Training","Training that respects consistency over theatrics."),
("skincare brand","commerce","Products","A considered routine with no noise around it."),
("home fragrance","commerce","Collection","Atmosphere, bottled."),
("pet brand","commerce","Collection","Better objects for the animals that run the house."),
("nonprofit","organization","Impact","Useful work, clearly explained."),
("community club","organization","Gather","A place for people who make things happen.")
]
PALETTES = [
("#080808","#101010","#F5F1E8","#ADA69A","#D7B56D","#7E2144","#2A2927"),
("#190D12","#251019","#F7EEE8","#C6ABB5","#F0C38A","#7E3048","#4B2633"),
("#0A1110","#101B18","#EFF6F0","#A7B7AD","#B9D8B5","#5B867B","#24332E"),
("#09101B","#0F1928","#F0F4FB","#A7B2C3","#A6C7FF","#574DA0","#253147"),
("#EEE7DE","#F7F2EB","#1C1716","#72675F","#7E1F3A","#D1A26C","#D5CDC2"),
("#101010","#171717","#F4F0E8","#B4B0A7","#FF6A2A","#D4FF48","#2F2E2A"),
("#0A0A0A","#111111","#F5F5F0","#A9A99F","#D8FF42","#A05DFF","#2B2B2A"),
("#07121E","#0D1D2D","#F4F8FC","#A9B9C8","#62A7FF","#F3B15B","#22384C"),
("#161113","#21191C","#F6F0F1","#B9AAAE","#F08DAA","#CDA56F","#38292D"),
("#0C0C0C","#141414","#F4F4F4","#A5A5A5","#FFFFFF","#777777","#292929")
]
LAYOUTS = ("split","editorial","bento","poster","rail","cards","manifesto","asym","grid","story","dashboard","minimal")

def hv(s): return int(hashlib.sha256(s.encode()).hexdigest()[:12], 16)
def pick(a,s): return a[hv(s) % len(a)]
def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")
def slug(s): return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")

def brand(i,n):
    return f"{pick(ADJ,str(i)+n)} {pick(NOUN,'x'+str(i)+n)}"

def svg_art(accent,accent2,kind):
    if kind=="circle":
        return f'<svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="110" fill="none" stroke="{accent}" stroke-width="2"/><circle cx="150" cy="150" r="62" fill="none" stroke="{accent2}" stroke-width="1"/><path d="M150 18v54M150 228v54M18 150h54M228 150h54" stroke="{accent}" stroke-width="2"/></svg>'
    if kind=="square":
        return f'<svg viewBox="0 0 300 300" aria-hidden="true"><rect x="28" y="28" width="244" height="244" fill="none" stroke="{accent}" stroke-width="3"/><rect x="72" y="72" width="156" height="156" fill="none" stroke="{accent2}" stroke-width="1"/><path d="M28 90h44M228 90h44M28 210h44M228 210h44" stroke="{accent}" stroke-width="3"/></svg>'
    return f'<svg viewBox="0 0 300 300" aria-hidden="true"><path d="M150 18 188 112 282 150 188 188 150 282 112 188 18 150 112 112Z" fill="none" stroke="{accent}" stroke-width="3"/><circle cx="150" cy="150" r="18" fill="{accent2}" opacity=".45"/></svg>'

def css(p,layout):
    bg,surf,ink,muted,acc,acc2,line=p
    radius={"editorial":"0","poster":"0","brutalist":"0","minimal":"2"}.get(layout,["8","14","20"][hv(layout)%3])
    return f"""<style>
:root{{--bg:{bg};--surface:{surf};--ink:{ink};--muted:{muted};--accent:{acc};--accent2:{acc2};--line:{line};--radius:{radius}px;--max:{1040+hv(layout)%380}px}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;overflow-x:hidden}}a{{color:inherit;text-decoration:none}}button,input,textarea{{font:inherit}}button{{color:inherit}}.wrap{{width:min(var(--max),calc(100% - 32px));margin:auto}}nav{{position:sticky;top:0;z-index:50;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(14px)}}.navin{{min-height:74px;display:flex;align-items:center;justify-content:space-between;gap:18px;width:min(var(--max),calc(100% - 32px));margin:auto}}.brand{{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:800;letter-spacing:-.03em}}.brandmark{{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--accent);color:var(--accent)}}.menu{{display:none;border:1px solid var(--line);background:transparent;padding:9px 12px;cursor:pointer}}.navlinks{{display:flex;gap:22px;font-size:12px;color:var(--muted)}}.navlinks a.active,.navlinks a:hover{{color:var(--ink)}}.hero{{padding:86px 0 90px}}.hero-grid{{display:grid;grid-template-columns:1.25fr .75fr;gap:60px;align-items:center}}.eyebrow,.meta,.num{{font:10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;text-transform:uppercase;color:var(--muted)}}h1{{font-size:clamp(54px,8vw,112px);line-height:.86;letter-spacing:-.085em;margin:14px 0 22px;max-width:900px}}h2{{font-size:clamp(30px,4vw,56px);line-height:.94;letter-spacing:-.06em;margin:0 0 18px}}h3{{font-size:20px;line-height:1.05;letter-spacing:-.04em;margin:10px 0}}p{{margin:0;color:var(--muted);font-size:14px}}.lede{{max-width:680px;font-size:17px;line-height:1.75}}.actions{{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}}.btn{{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line);padding:11px 15px;border-radius:var(--radius);background:transparent;cursor:pointer;transition:transform .2s,border-color .2s,background .2s}}.btn:hover{{transform:translateY(-2px);border-color:var(--accent)}}.btn.primary{{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:800}}.hero-art{{min-height:390px;display:grid;place-items:center;border:1px solid var(--line);background:linear-gradient(145deg,var(--surface),transparent);position:relative;overflow:hidden}}.hero-art svg{{width:66%;height:auto;filter:drop-shadow(0 30px 60px rgba(0,0,0,.25))}}.hero-note{{position:absolute;left:16px;top:14px;color:var(--muted);font:9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.09em;text-transform:uppercase}}.hero-note.bottom{{left:auto;right:16px;top:auto;bottom:14px}}.ticker{{overflow:hidden;border-block:1px solid var(--line);white-space:nowrap;color:var(--muted);font:10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;text-transform:uppercase;padding:10px 0}}.ticker span{{display:inline-block;animation:marquee 22s linear infinite}}@keyframes marquee{{to{{transform:translateX(-50%)}}}}.section{{padding:86px 0}}.section-head{{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-bottom:24px}}.grid{{display:grid;gap:1px;background:var(--line);border:1px solid var(--line)}}.cols-3{{grid-template-columns:repeat(3,minmax(0,1fr))}}.cols-4{{grid-template-columns:repeat(4,minmax(0,1fr))}}.split{{display:grid;grid-template-columns:1fr 1fr;gap:40px}}.card{{background:var(--surface);padding:24px;min-height:170px}}.card.wide{{grid-column:span 2}}.card.tall{{min-height:340px}}.kpi{{font-size:64px;line-height:.9;letter-spacing:-.08em;color:var(--accent);margin:10px 0 18px}}.quote{{border-left:2px solid var(--accent);padding-left:18px;font-size:21px;line-height:1.35}}.list{{border-top:1px solid var(--line)}}.list-row{{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid var(--line)}}.list-row>div{{flex:1}}.filterbar,.tabs{{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px}}.filter,.tab{{border:1px solid var(--line);background:transparent;padding:9px 12px;cursor:pointer;font:9px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.1em}}.filter.active,.tab.active{{background:var(--ink);border-color:var(--ink);color:var(--bg)}}.hidden{{display:none!important}}details{{border-top:1px solid var(--line);padding:16px 0}}summary{{cursor:pointer;font-weight:700}}form label{{display:grid;gap:7px;color:var(--muted);font-size:11px}}input,textarea{{width:100%;background:transparent;color:var(--ink);border:1px solid var(--line);padding:12px;border-radius:var(--radius);outline:none}}input:focus,textarea:focus{{border-color:var(--accent)}}textarea{{min-height:140px;resize:vertical}}dialog{{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:var(--radius);padding:26px;max-width:560px;width:calc(100% - 28px)}}dialog::backdrop{{background:rgba(0,0,0,.68)}}footer{{padding:46px 0;border-top:1px solid var(--line);margin-top:30px}}.footerline{{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}}.reveal{{animation:rise .7s ease both}}@keyframes rise{{from{{opacity:0;transform:translateY(15px)}}to{{opacity:1;transform:none}}}}
.layout-poster h1{{max-width:600px}}.layout-poster .hero-art{{min-height:500px}}.layout-rail .hero-grid{{grid-template-columns:.6fr 1.4fr}}.layout-rail .hero-copy{{order:2}}.layout-rail .hero-art{{order:1}}.layout-asym .hero-grid{{grid-template-columns:1fr 1.2fr}}.layout-asym .hero-copy{{padding-top:70px}}.layout-manifesto h1{{font-size:clamp(70px,12vw,160px)}}.layout-dashboard .card{{min-height:140px}}@media(max-width:820px){{.hero-grid,.split{{grid-template-columns:1fr}}.cols-3,.cols-4{{grid-template-columns:1fr 1fr}}.card.wide{{grid-column:span 2}}.menu{{display:block}}.navlinks{{display:none;position:absolute;left:16px;right:16px;top:66px;padding:14px;flex-direction:column;background:var(--surface);border:1px solid var(--line)}}.navlinks.open{{display:flex}}.section-head{{align-items:start;flex-direction:column}}}}@media(max-width:540px){{.hero{{padding-top:58px}}.cols-3,.cols-4{{grid-template-columns:1fr}}.card.wide{{grid-column:auto}}h1{{font-size:clamp(48px,16vw,88px)}}}}
</style>"""

def js():
    return """<script>
(()=>{const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const menu=$('.menu'), nav=$('.navlinks'); menu?.addEventListener('click',()=>nav?.classList.toggle('open'));
$$('nav a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
$$('.reveal').forEach((x,i)=>x.style.animationDelay=(Math.min(i,8)*55)+'ms');
$$('.filterbar').forEach(bar=>{const target=bar.dataset.target,grid=target&&document.getElementById(target);if(!grid)return;$$('.filter',bar).forEach(b=>b.addEventListener('click',()=>{$$('.filter',bar).forEach(x=>x.classList.remove('active'));b.classList.add('active');const f=b.dataset.filter;$$('.filter-item',grid).forEach(x=>x.classList.toggle('hidden',f!=='all'&&x.dataset.group!==f))}))});
$$('.tabs').forEach(tabbar=>$$('.tab',tabbar).forEach(b=>b.addEventListener('click',()=>{const host=tabbar.parentElement;$$('.tab',tabbar).forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.tabpanel',host).forEach(x=>x.classList.toggle('active',x.id===b.dataset.target))})));
$$('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1100)}catch(e){b.textContent='Select manually';setTimeout(()=>b.textContent='Copy',1100)}}));
$$('[data-count]').forEach(el=>{const target=Number(el.dataset.count)||0;let n=0;const step=Math.max(1,Math.ceil(target/40));const tick=()=>{n=Math.min(target,n+step);el.textContent=n.toLocaleString();if(n<target)requestAnimationFrame(tick)};if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){tick();io.unobserve(e.target)}}),{threshold:.2});io.observe(el)}else tick()});
$$('form[data-demo]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const b=$('button[type=submit]',f);if(b){b.textContent='Sent — we will be in touch';b.disabled=true}}));
$$('[data-modal]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.modal)?.showModal()));
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
})();
</script>"""

def nav(brand,pages,active):
    links="".join(f'<a class="{"active" if h==active else ""}" href="{h}">{esc(label)}</a>' for label,h in pages)
    return f'<nav><div class="navin"><a class="brand" href="index.html"><span class="brandmark">+</span>{esc(brand)}</a><button class="menu" type="button" aria-label="Open menu">Menu</button><div class="navlinks">{links}</div></div></nav>'

def frame(brand,niche,sub,p,layout,title,pages,active,body):
    ac=p[4]; ac2=p[5]
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{esc(title)} — {esc(sub)}"><title>{esc(title)} — {esc(brand)}</title>{css(p,layout)}</head><body class="layout-{layout}"><div class="site">{nav(brand,pages,active)}<main>{body}</main><footer><div class="wrap footerline"><div><strong>{esc(brand)}</strong><div class="meta">{esc(niche.title())} / edit the copy, keep the structure.</div></div><div><a href="about.html">About</a> · <a href="contact.html">Contact</a></div></div></footer></div>{js()}</body></html>'

def hero(brand,niche,sub,p,layout,seed,title,kicker):
    art=svg_art(p[4],p[5],pick(("circle","square","diamond"),seed+"art"))
    lede=pick([f"Built for the {niche} world — with enough edge to feel like yours.",f"{sub} without the usual template voice.","A sharper digital front door for a brand that has something to say.","Quietly engineered structure. Loud visual point of view."],seed+"lede")
    return f'<section class="hero"><div class="wrap"><div class="hero-grid"><div class="hero-copy reveal"><div class="eyebrow">{esc(kicker)}</div><h1>{esc(title)}</h1><p class="lede">{esc(lede)}</p><div class="actions"><a class="btn primary" href="#work">Explore</a><a class="btn" href="contact.html">Contact</a></div></div><div class="hero-art reveal"><div class="hero-note">{esc(brand)} / {esc(sub)}</div>{art}<div class="hero-note bottom">edit / publish / repeat</div></div></div></div></section>'

def cards(items,cols="cols-3"):
    return '<div class="grid '+cols+'">'+''.join(f'<article class="card reveal">{x}</article>' for x in items)+'</div>'

def about(brand,niche,sub,p,layout,seed,pages):
    body=hero(brand,niche,sub,p,layout,seed+"a","Inside the practice","THE STORY")
    body+=f'<section class="section"><div class="wrap split"><div class="reveal"><div class="eyebrow">The premise</div><h2>Make the digital place feel like the real place.</h2></div><div class="reveal"><p class="lede">The grid is strong, the type is calm, and the interactive moments reward curiosity instead of shouting for attention.</p><div class="quote" style="margin-top:20px">A stronger decision beats another component.</div></div></div></section>'
    body+=f'<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Method</div><h2>Simple code. Strong surface.</h2></div></div>{cards(["<div class=\"num\">01 / POSITION</div><h3>Lead with the difference.</h3><p>Make the first sentence do useful work.</p>","<div class=\"num\">02 / COMPOSE</div><h3>Build a rhythm.</h3><p>Use contrast and whitespace to make the page feel edited.</p>","<div class=\"num\">03 / REFINE</div><h3>Remove the filler.</h3><p>Keep only sections that help the visitor move.</p>"],"cols-3")}</div></section>'
    return frame(brand,niche,sub,p,layout,"About",pages,"about.html",body)

def contact(brand,niche,sub,p,layout,seed,pages):
    email="hello@"+slug(brand)+".example"
    body=f'<section class="hero"><div class="wrap"><div class="eyebrow">Contact</div><h1>Make the next page matter.</h1><p class="lede">Tell us what you are building, where it is stuck, and what finished should feel like.</p></div></section><section class="section"><div class="wrap split"><div class="card reveal"><div class="eyebrow">Studio notes</div><h3>Open, edit, send.</h3><p>{esc(email)}</p><button class="btn" data-copy="{esc(email)}">Copy</button><div style="height:18px"></div><p>Remote / Worldwide<br>Mon — Fri / 09:00 — 18:00</p></div><form class="card reveal" data-demo><label>Name<input required name="name" placeholder="Your name"></label><div style="height:12px"></div><label>Email<input required type="email" name="email" placeholder="you@example.com"></label><div style="height:12px"></div><label>Project<textarea name="message" placeholder="A sentence or two is enough."></textarea></label><div style="height:14px"></div><button class="btn primary" type="submit">Send enquiry</button></form></div></section><section class="section"><div class="wrap"><details><summary>Do I need a framework?</summary><p>No. Every page keeps its CSS and JavaScript inline.</p></details><details><summary>Can I delete sections?</summary><p>Yes. Each section is independent and named by purpose.</p></details></div></section>'
    return frame(brand,niche,sub,p,layout,"Contact",pages,"contact.html",body)

def work(brand,niche,sub,p,layout,seed,pages):
    items=[]
    for i in range(6):
        group=("digital","identity","launch")[i%3]
        items.append(f'<div class="num">0{i+1}</div><div class="meta">{group}</div><h3>{esc(pick(["A deliberate launch.","A system with teeth.","The shape of momentum.","Built for repeat use.","A quieter kind of loud.","The better default."],seed+str(i)))}</h3><p>Replace this case-study copy with the real project outcome.</p><a class="btn" href="#case">Open case</a>')
    body=hero(brand,niche,sub,p,layout,seed+"w","Selected work","CASEWORK")
    body+=f'<section class="section" id="work"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Archive</div><h2>The work, without the fog.</h2></div><p>Use the filter to make one page feel deeper.</p></div><div class="filterbar" data-target="cases"><button class="filter active" data-filter="all">All</button><button class="filter" data-filter="launch">Launch</button><button class="filter" data-filter="identity">Identity</button><button class="filter" data-filter="digital">Digital</button></div><div class="grid cols-3" id="cases">'
    for i,x in enumerate(items): body+=f'<article class="card reveal filter-item" data-group="{("launch","identity","launch","digital","identity","digital")[i]}">{x}</article>'
    body+='</div></div></section><section class="section" id="case"><div class="wrap split"><div><div class="eyebrow">Case rhythm</div><h2>Show the thinking, not just the trophy shot.</h2></div><div><div class="quote">Make the before, the decision and the after easy to scan.</div></div></div></section>'
    return frame(brand,niche,sub,p,layout,"Work",pages,"work.html",body)

def shop(brand,niche,sub,p,layout,seed,pages):
    body=hero(brand,niche,sub,p,layout,seed+"s","Objects worth choosing.","COLLECTION")
    body+=f'<section class="section" id="work"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Collection</div><h2>Choose by instinct. Decide by detail.</h2></div></div>{cards(["<div class=\"num\">01 / OBJECT</div><h3>Edition One</h3><p>A compact product card. Edit the title, price and details.</p><button class=\"btn primary\" data-modal=\"m1\">View details</button>","<div class=\"num\">02 / OBJECT</div><h3>Edition Two</h3><p>Use this space for specs, a short promise or a product story.</p><button class=\"btn primary\" data-modal=\"m2\">View details</button>","<div class=\"num\">03 / OBJECT</div><h3>Edition Three</h3><p>Keep the card useful and the next move visible.</p><button class=\"btn primary\" data-modal=\"m3\">View details</button>"],"cols-3")} </div></section>'
    for x in range(1,4): body+=f'<dialog id="m{x}"><div class="eyebrow">Edition {x}</div><h3>Product detail</h3><p>Replace with materials, dimensions, shipping or booking details.</p><button class="btn primary" onclick="this.closest(&quot;dialog&quot;).close()">Close</button></dialog>'
    return frame(brand,niche,sub,p,layout,"Shop",pages,"shop.html",body)

def menu_page(brand,niche,sub,p,layout,seed,pages):
    body=hero(brand,niche,sub,p,layout,seed+"m","A menu with a pulse.","MENU")
    body+=f'<section class="section"><div class="wrap"><div class="tabs"><button class="tab active" data-target="t1">Signature</button><button class="tab" data-target="t2">Classics</button><button class="tab" data-target="t3">Seasonal</button></div><div id="t1" class="tabpanel active card"><h3>Signature</h3><p>Put the strongest items, prices and descriptions here.</p></div><div id="t2" class="tabpanel card"><h3>Classics</h3><p>Keep the familiar choices easy to scan.</p></div><div id="t3" class="tabpanel card"><h3>Seasonal</h3><p>Rotate this panel without changing the structure.</p></div></div></section>'
    body+=f'<section class="section"><div class="wrap"><div class="list">{"".join(f"<div class=\"list-row\"><span class=\"num\">0{i+1}</span><div><strong>{n}</strong><div class=\"meta\">A useful description / ₹{(240+i*70):,}</div></div><span>↗</span></div>" for i,n in enumerate(["House special","Slow roast","Night plate","Final pour"]))}</div></div></section>'
    return frame(brand,niche,sub,p,layout,"Menu",pages,"menu.html",body)

def creator(brand,niche,sub,p,layout,seed,pages):
    body=hero(brand,niche,sub,p,layout,seed+"c","Publish something worth returning to.","ARCHIVE")
    body+=f'<section class="section"><div class="wrap split"><div><div class="eyebrow">Archive</div><h2>Keep the catalogue alive.</h2></div><div class="quote"><div class="kpi" data-count="{12+hv(seed)%41}">0</div><strong>issues / releases / stories</strong><p>One strong update beats ten filler posts.</p></div></div></section>'
    body+=f'<section class="section"><div class="wrap"><div class="list">{"".join(f"<div class=\"list-row\"><span class=\"num\">0{i+1}</span><div><strong>{t}</strong><div class=\"meta\">Replace with your archive item.</div></div><a class=\"btn\" href=\"#\">Read ↗</a></div>" for i,t in enumerate(["The first idea","The useful middle","The field note","The next release"]))}</div></div></section>'
    return frame(brand,niche,sub,p,layout,"Archive",pages,"archive.html",body)

def startup(brand,niche,sub,p,layout,seed,pages):
    body=hero(brand,niche,sub,p,layout,seed+"st","One interface. Less friction.","PRODUCT")
    body+=f'<section class="section"><div class="wrap"><div class="card wide"><div class="eyebrow">Core product</div><div class="kpi" data-count="42">0</div><h3>Minutes of friction removed.</h3><p>Replace the metric with a real product signal.</p></div></div></section>'
    body+=f'<section class="section"><div class="wrap">{cards(["<div class=\"num\">01</div><h3>Capture</h3><p>Make the first action obvious.</p>","<div class=\"num\">02</div><h3>Route</h3><p>Move information to the right place.</p>","<div class=\"num\">03</div><h3>Resolve</h3><p>Get the visitor to an outcome.</p>"],"cols-3")}</div></section>'
    return frame(brand,niche,sub,p,layout,"Product",pages,"product.html",body)

def property_page(brand,niche,sub,p,layout,seed,pages):
    body=hero(brand,niche,sub,p,layout,seed+"pr","Places with a point of view.","LISTINGS")
    body+=f'<section class="section"><div class="wrap">{cards(["<div style=\"height:140px;background:linear-gradient(135deg,var(--surface) 20%,var(--accent2) 20% 48%,var(--accent) 48% 50%,var(--surface) 50%)\"></div><div class=\"num\" style=\"margin-top:18px\">HOUSE 01</div><h3>Light, volume, silence.</h3><p>3 bed · 2 bath · 2,120 sq ft</p><a class=\"btn\" href=\"#details\">View details</a>","<div style=\"height:140px;background:linear-gradient(135deg,var(--surface),var(--accent))\"></div><div class=\"num\" style=\"margin-top:18px\">LOFT 02</div><h3>A little more room to think.</h3><p>2 bed · 2 bath · 1,640 sq ft</p><a class=\"btn\" href=\"#details\">View details</a>","<div style=\"height:140px;background:linear-gradient(135deg,var(--accent2),var(--surface))\"></div><div class=\"num\" style=\"margin-top:18px\">VILLA 03</div><h3>Old bones. New rhythm.</h3><p>4 bed · 3 bath · 2,980 sq ft</p><a class=\"btn\" href=\"#details\">View details</a>"],"cols-3")}</div></section><section class="section" id="details"><div class="wrap split"><div><div class="eyebrow">Project notes</div><h2>Let the architecture do the selling.</h2></div><div class="quote">Replace with location, material, floorplan and availability details.</div></div></section>'
    return frame(brand,niche,sub,p,layout,"Projects",pages,"projects.html",body)

def education(brand,niche,sub,p,layout,seed,pages):
    body=hero(brand,niche,sub,p,layout,seed+"ed","Learn by shipping.","CURRICULUM")
    body+=f'<section class="section"><div class="wrap"><div class="tabs"><button class="tab active" data-target="lesson1">Module 01</button><button class="tab" data-target="lesson2">Module 02</button><button class="tab" data-target="lesson3">Module 03</button></div><div id="lesson1" class="tabpanel active card"><div class="num">45 MIN</div><h3>Start with the problem.</h3><p>Use this panel to introduce the first lesson or assignment.</p></div><div id="lesson2" class="tabpanel card"><div class="num">55 MIN</div><h3>Build the smallest useful thing.</h3><p>Replace this copy with the practical core of the module.</p></div><div id="lesson3" class="tabpanel card"><div class="num">40 MIN</div><h3>Ship and review.</h3><p>Keep the final module focused on action and feedback.</p></div></div></section><section class="section"><div class="wrap">{cards(["<h3>Clarity</h3><p>Know what to focus on next.</p>","<h3>Capability</h3><p>Build a repeatable skill.</p>","<h3>Evidence</h3><p>Finish with something real.</p>"],"cols-3")}</div></section>'
    return frame(brand,niche,sub,p,layout,"Curriculum",pages,"curriculum.html",body)

def events(brand,niche,sub,p,layout,seed,pages):
    slots=[("09:30","Doors / coffee"),("11:00","Opening note"),("13:15","Main session"),("16:00","Break / studio"),("19:30","Night set")]
    rows=[]
    for i,(t,n) in enumerate(slots):
        rows.append(f'<div class="list-row"><span class="num">{t}</span><div><strong>{n}</strong><div class="meta">Main room · replace the details.</div></div><button class="btn" data-modal="e{i}">Info</button></div>')
    dialogs=[]
    for i,(t,n) in enumerate(slots):
        dialogs.append(f'<dialog id="e{i}"><div class="eyebrow">{t}</div><h3>{n}</h3><p>Add speaker notes, access info or room details here.</p><button class="btn primary" onclick="this.closest(\'dialog\').close()">Close</button></dialog>')
    body=hero(brand,niche,sub,p,layout,seed+"ev","One calendar. No clutter.","SCHEDULE")
    body+=f'<section class="section"><div class="wrap"><div class="list">{"".join(rows)}</div>{"".join(dialogs)}</div></section><section class="section"><div class="wrap split"><div class="card"><div class="eyebrow">Tickets</div><div class="kpi">₹1,990</div><p>Change the price and the destination.</p></div><div><div class="eyebrow">Venue</div><h2>A room that can handle a little energy.</h2><p>Add your address, accessibility notes and parking details.</p></div></div></section>'
    return frame(brand,niche,sub,p,layout,"Schedule",pages,"schedule.html",body)
def business(brand,niche,sub,p,layout,seed,pages):
    body=hero(brand,niche,sub,p,layout,seed+"b","Make the useful obvious.","SERVICES")
    body+=f'<section class="section" id="work"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Capabilities</div><h2>What happens next.</h2></div><p>Rename the cards without changing the structure.</p></div>{cards(["<div class=\"num\">01</div><h3>Strategy</h3><p>Clarify the offer and the one decision that matters.</p>","<div class=\"num\">02</div><h3>Direction</h3><p>Give the visual system a point of view.</p>","<div class=\"num\">03</div><h3>Execution</h3><p>Ship the thing and keep the code readable.</p>","<div class=\"num\">04</div><h3>Iteration</h3><p>Measure the signal and keep what works.</p>"],"cols-4")}</div></section><section class="section"><div class="wrap"><div class="list">{"".join(f"<div class=\"list-row\"><span class=\"num\">0{i+1}</span><div><strong>{x}</strong><div class=\"meta\">Define → build → test → launch.</div></div><span>↗</span></div>" for i,x in enumerate(["Brief","Build","Test","Launch"]))}</div></div></section>'
    return frame(brand,niche,sub,p,layout,"Services",pages,"services.html",body)

def build_site(i):
    niche,stype,sub,desc=NICHES[i%len(NICHES)]
    p=PALETTES[hv("p"+str(i))%len(PALETTES)]
    layout=LAYOUTS[hv("l"+str(i))%len(LAYOUTS)]
    b=brand(i,niche)
    seed=f"{i+1:04d}-{slug(b)}"
    home_title=pick(["Make the first impression impossible to ignore.","A sharper way to show up.","Make the useful look unforgettable.","Give the work a room worth entering.","More signal. Less filler.","A digital front door with a point of view.","Built to be edited. Designed to be kept."],seed+"title")
    if stype in ("portfolio","agency","culture"): subpages=[("Work","work.html",work)]
    elif stype=="commerce": subpages=[("Shop","shop.html",shop)]
    elif stype=="hospitality": subpages=[("Menu","menu.html",menu_page)]
    elif stype=="creator": subpages=[("Archive","archive.html",creator)]
    elif stype=="startup": subpages=[("Product","product.html",startup)]
    elif stype=="property": subpages=[("Projects","projects.html",property_page)]
    elif stype=="education": subpages=[("Curriculum","curriculum.html",education)]
    elif stype=="events": subpages=[("Schedule","schedule.html",events)]
    else: subpages=[("Services","services.html",business)]
    pages=[(subpages[0][0],subpages[0][1]),("About","about.html"),("Contact","contact.html")]
    body=hero(b,niche,desc,p,layout,seed+"h",home_title,f"{niche.upper()} / {sub.upper()}")
    body+=f'<div class="ticker"><span>{esc(b)} / {esc(desc)} / {esc(pick(["Make it useful. Make it memorable.","Less decoration. More direction.","Built to be edited. Designed to be kept."],seed+"tick"))} / </span><span aria-hidden="true">{esc(b)} / {esc(desc)} / </span></div>'
    body+=f'<section class="section" id="work"><div class="wrap"><div class="section-head"><div><div class="eyebrow">The system</div><h2>Three moves carry the whole site.</h2></div><p>Keep the content concrete. The layout does the atmosphere.</p></div>{cards(["<div class=\"num\">01</div><h3>Position</h3><p>Lead with the difference, then make the next action obvious.</p>","<div class=\"num\">02</div><h3>Compose</h3><p>Use rhythm, contrast and whitespace to make the page feel edited.</p>","<div class=\"num\">03</div><h3>Invite</h3><p>End each section with a useful move: read, view, book, shop or contact.</p>"],"cols-3")}</div></section>'
    body+=f'<section class="section"><div class="wrap split"><div class="reveal"><div class="eyebrow">A little proof</div><h2>Keep the evidence above the fold.</h2></div><div class="quote reveal"><div class="kpi" data-count="{12+hv(seed)%39}">0</div><strong>projects / releases / rooms / launches</strong><p>One metric is often enough. Make it real, then stop.</p></div></div></section>'
    folder=TMP/f"{i+1:03d}-{slug(b)}"; folder.mkdir(parents=True,exist_ok=True)
    (folder/"index.html").write_text(frame(b,niche,desc,p,layout,"Home",pages,pages[0][1],body),encoding="utf-8")
    for label,path,builder in subpages: (folder/path).write_text(builder(b,niche,desc,p,layout,seed,pages),encoding="utf-8")
    (folder/"about.html").write_text(about(b,niche,desc,p,layout,seed,pages),encoding="utf-8")
    (folder/"contact.html").write_text(contact(b,niche,desc,p,layout,seed,pages),encoding="utf-8")
    return folder

def validate():
    folders=sorted(x for x in TMP.iterdir() if x.is_dir())
    if len(folders)!=1600: raise AssertionError(f"expected 1600 folders, got {len(folders)}")
    external=re.compile(r'<(?:script|link)\b[^>]+(?:src|href)=["\'](?:https?:)?//',re.I)
    for f in folders:
        pages=sorted(f.glob("*.html"))
        if len(pages)!=4: raise AssertionError(f"{f.name}: expected 4 html pages, got {len(pages)}")
        if (f/"index.html") not in pages: raise AssertionError(f"{f.name}: no index")
        for page in pages:
            s=page.read_text(encoding="utf-8")
            if external.search(s): raise AssertionError(f"{page}: external dependency")
            if "<style>" not in s or "<script>" not in s: raise AssertionError(f"{page}: missing inline css/js")
            for href in re.findall(r'href=["\']([^#"\']+)',s):
                if href.startswith(("http:","https:","mailto:","tel:","javascript:")): continue
                if not (page.parent/href.split("#",1)[0]).exists(): raise AssertionError(f"{page}: missing {href}")
            for src in re.findall(r'src=["\']([^"\']+)',s):
                if not src.startswith(("data:","http:","https:")): raise AssertionError(f"{page}: external/local src {src}")
    return folders

def zip_batch(n,folders):
    out=REPO/f"WEBBLE {n}.zip"
    if out.exists(): out.unlink()
    with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for folder in folders[:n]:
            for page in sorted(folder.glob("*.html")):
                z.write(page,f"{folder.name}/{page.name}")
    with zipfile.ZipFile(out) as z:
        members=z.namelist()
        if any(not m.endswith(".html") for m in members): raise AssertionError(f"{out}: non-html member")
        roots={m.split("/",1)[0] for m in members}
        if len(roots)!=n: raise AssertionError(f"{out}: expected {n} roots, got {len(roots)}")
        if len(members)!=n*4: raise AssertionError(f"{out}: expected {n*4} html files, got {len(members)}")
    return out

def main():
    shutil.rmtree(TMP,ignore_errors=True); TMP.mkdir(parents=True)
    for i in range(1600):
        build_site(i)
    folders=validate()
    outs=[zip_batch(n,folders) for n in BATCHES]
    shutil.rmtree(TMP,ignore_errors=True)
    for o in outs: print(o.name,o.stat().st_size)

if __name__=="__main__": main()
