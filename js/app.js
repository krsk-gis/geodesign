const F=MAP.f, KMPX=MAP.kmpx;
const natRate=F.reduce((s,f)=>s+f.uc,0)/F.reduce((s,f)=>s+f.uc/f.u,0)*100;
const natDens=F.reduce((s,f)=>s+f.p,0)/F.reduce((s,f)=>s+f.a,0);
const VARS={
  rate:{name:'Munkanélküliségi ráta',unit:'%',kind:'arány',get:f=>f.u,dec:1,mid:natRate,midName:'országos átlag'},
  count:{name:'Munkanélküliek száma',unit:'ezer fő',kind:'abszolút',get:f=>f.uc,dec:1,mid:null},
  dens:{name:'Népsűrűség',unit:'fő/km²',kind:'arány',get:f=>f.p/f.a,dec:0,mid:natDens,midName:'országos átlag'}
};
const BAD={v:'count',mode:'fill',scheme:'rainbow',method:'equal',k:8,title:'Térkép',legend:true,round:false,units:false,labels:'all',scale:false,north:'huge',deco:true,source:false,bg:'blue',thick:true,size:'area'};
let S={...BAD};
let revealed=false;

/* ---------- osztályozás ---------- */
function equal(vals,k){const mn=Math.min(...vals),mx=Math.max(...vals),b=[mn];for(let i=1;i<k;i++)b.push(mn+(mx-mn)*i/k);b.push(mx);return b}
function quantile(vals,k){const s=[...vals].sort((a,b)=>a-b),b=[s[0]];for(let i=1;i<k;i++){const p=i/k*(s.length-1),lo=Math.floor(p),hi=Math.ceil(p);b.push(s[lo]+(s[hi]-s[lo])*(p-lo))}b.push(s[s.length-1]);return b}
function jenks(vals,k){const d=[...vals].sort((a,b)=>a-b),n=d.length;k=Math.min(k,n);
  const L=[...Array(n+1)].map(()=>Array(k+1).fill(0)),V=[...Array(n+1)].map(()=>Array(k+1).fill(Infinity));
  for(let i=1;i<=k;i++){L[1][i]=1;V[1][i]=0}
  for(let l=2;l<=n;l++){let s1=0,s2=0,w=0,v=0;
    for(let m=1;m<=l;m++){const i3=l-m+1,val=d[i3-1];s2+=val*val;s1+=val;w++;v=s2-s1*s1/w;const i4=i3-1;
      if(i4!==0)for(let j=2;j<=k;j++)if(V[l][j]>=v+V[i4][j-1]){L[l][j]=i3;V[l][j]=v+V[i4][j-1]}}
    L[l][1]=1;V[l][1]=v}
  const b=Array(k+1);b[k]=d[n-1];b[0]=d[0];let c=n;for(let j=k;j>=2;j--){const id=L[c][j]-2;b[j-1]=d[id];c=L[c][j]-1}
  return b}
function breaks(){const vals=F.map(VARS[S.v].get);return S.method==='equal'?equal(vals,S.k):S.method==='quant'?quantile(vals,S.k):jenks(vals,S.k)}
function classOf(v,b){for(let i=1;i<b.length;i++)if(v<=b[i]+1e-9)return i-1;return b.length-2}

/* ---------- színek ---------- */
function lerp(a,b,t){return a+(b-a)*t}
function hex(c){return'#'+c.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('')}
function ramp(stops,t){t=Math.max(0,Math.min(1,t));const n=stops.length-1,i=Math.min(n-1,Math.floor(t*n)),u=t*n-i;const A=stops[i],B=stops[i+1];return hex([0,1,2].map(j=>lerp(A[j],B[j],u)))}
const SEQ=[[239,243,255],[198,219,239],[107,174,214],[33,113,181],[8,48,107]];
const DIV_LO=[[33,102,172],[103,169,207],[209,229,240]],DIV_HI=[[253,219,199],[239,138,98],[178,24,43]];
const CAT=['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffd92f','#a65628','#f781bf','#66c2a5','#8da0cb','#e78ac3','#a6d854','#b3b3b3','#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e','#e6ab02','#17becf'];
function hsl2hex(h,s,l){const f=n=>{const k=(n+h/30)%12,a=s*Math.min(l,1-l);return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))};return hex([f(0),f(8),f(4)])}
function classColors(b){const k=b.length-1,out=[];
  for(let i=0;i<k;i++){const t=k===1?.5:i/(k-1);
    if(S.scheme==='seq')out.push(ramp(SEQ,.08+t*.92));
    else if(S.scheme==='rainbow')out.push(hsl2hex(t*290,.95,.5));
    else if(S.scheme==='div'){const v=VARS[S.v];const mid=v.mid??(b[0]+b[k])/2;const m=(b[i]+b[i+1])/2;const span=Math.max(mid-b[0],b[k]-mid)||1;const r=(m-mid)/span;out.push(r<0?ramp(DIV_LO,1+r):ramp(DIV_HI,r))}
    else out.push(CAT[i%CAT.length])}
  return out}

/* ---------- formázás ---------- */
function fmt(x,dec){return x.toLocaleString('hu-HU',{minimumFractionDigits:dec,maximumFractionDigits:dec})}
function fmtB(x){const v=VARS[S.v];return S.round?fmt(x,v.dec):fmt(x,4)}
function niceStep(mx){const raw=mx/2,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;return(m<1.5?1:m<3.5?2:m<7.5?5:10)*p}
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- rajz ---------- */
function render(target,big){
  const v=VARS[S.v],vals=F.map(v.get),b=breaks(),cols=classColors(b),k=b.length-1;
  const W=640,H=545,OX=40,OY=78;
  const ink='#141414',mut='#5c5c58';
  let s=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(S.title||'Térkép')}" font-family='"Archivo Narrow","Arial Narrow",Arial,sans-serif'>`;
  s+=`<defs><filter id="sh${big?'b':''}" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="7" dy="9" stdDeviation="4" flood-color="#000" flood-opacity=".55"/></filter>
  <linearGradient id="gr${big?'b':''}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffc2e0"/></linearGradient></defs>`;
  s+=`<rect width="${W}" height="${H}" fill="${S.deco?`url(#gr${big?'b':''})`:'#ffffff'}"/>`;
  if(S.deco)s+=`<rect x="8" y="8" width="${W-16}" height="${H-16}" fill="none" stroke="#7a3b00" stroke-width="6"/><rect x="18" y="18" width="${W-36}" height="${H-36}" fill="none" stroke="#7a3b00" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  if(S.bg==='blue')s+=`<rect x="26" y="62" width="${W-52}" height="370" fill="#3aa0e8"/>`;
  // cím
  const t=(S.title||'').trim();
  if(t)s+=`<text x="${S.deco?W/2:OX}" y="44" text-anchor="${S.deco?'middle':'start'}" font-family='${S.deco?'"Comic Sans MS","Chalkboard SE",cursive':'"Archivo",Arial,sans-serif'}' font-size="${S.deco?26:21}" font-weight="700" fill="${S.deco?'#c2185b':ink}">${esc(t)}</text>`;
  // megyék
  const sw=S.thick?3.2:.7, sc=S.thick?'#000':'#ffffff';
  if(S.deco)s+=`<g transform="translate(${OX+8},${OY+10})" opacity=".45">${F.map(f=>`<path d="${f.d}" fill="#000" fill-rule="evenodd"/>`).join('')}</g>`;
  s+=`<g transform="translate(${OX},${OY})">`;
  F.forEach((f,i)=>{let fill;
    if(S.mode==='circ')fill='#ececea';
    else if(S.scheme==='cat')fill=CAT[i%CAT.length];
    else fill=cols[classOf(vals[i],b)];
    s+=`<path d="${f.d}" fill="${fill}" fill-rule="evenodd" stroke="${S.mode==='circ'&&!S.thick?'#b9b9b4':sc}" stroke-width="${sw}" stroke-linejoin="round"/>`});
  s+=`</g><g transform="translate(${OX},${OY})">`;
  // körök
  if(S.mode==='circ'){const mx=Math.max(...vals),R=34;
    const ord=F.map((f,i)=>i).sort((a,c)=>vals[c]-vals[a]);
    ord.forEach(i=>{const f=F[i],r=S.size==='area'?R*Math.sqrt(vals[i]/mx):R*vals[i]/mx;
      s+=`<circle cx="${f.c[0]}" cy="${f.c[1]}" r="${Math.max(r,1.2).toFixed(1)}" fill="#2b2b2b" fill-opacity=".72" stroke="#fff" stroke-width="1"/>`})}
  // feliratok
  if(S.labels!=='none'){let idx=F.map((f,i)=>i);
    if(S.labels==='key'){const o=[...idx].sort((a,c)=>vals[c]-vals[a]);idx=[o[0],o[1],o[o.length-2],o[o.length-1]]}
    const big=S.deco;
    idx.forEach(i=>{const f=F[i];let[x,y]=f.c;if(f.n==='Budapest'){x+=0;y-=14}
      const name=S.labels==='key'?`${f.n} ${fmt(vals[i],v.dec)}${v.unit==='%'?' %':''}`:f.n;
      const fs=big?12.5:S.labels==='key'?10.5:9,hw=name.length*fs*.27;x=Math.max(hw-30,Math.min(MAP.W+30-hw,x));
      const at=`x="${x}" y="${y}" text-anchor="middle" font-size="${fs}" font-weight="${big?700:600}"`;
      if(!big)s+=`<text ${at} fill="#fff" stroke="#fff" stroke-width="2.8" stroke-linejoin="round">${esc(name)}</text>`;
      s+=`<text ${at} fill="${big?'#d50000':ink}">${esc(name)}</text>`})}
  s+=`</g>`;
  // jelmagyarázat
  const LY=446;
  if(S.legend){
    const lt=S.units?`${v.name} (${v.unit})`:(S.v==='count'?'munkanélküliek':S.v==='rate'?'ráta':'sűrűség');
    s+=`<text x="${OX}" y="${LY-6}" font-size="11.5" font-weight="600" fill="${ink}">${esc(lt)}</text>`;
    if(S.mode==='circ'){const mx=Math.max(...vals),R=34,st=niceStep(mx);const refs=[st*2>mx?st:st*2,st/2,st/4].filter((x,i,a)=>a.indexOf(x)===i&&x<=mx*1.01);
      const base=LY+64;let cx=OX+40;
      refs.forEach(rv=>{const r=S.size==='area'?R*Math.sqrt(rv/mx):R*rv/mx;s+=`<circle cx="${cx}" cy="${base-r}" r="${r.toFixed(1)}" fill="none" stroke="${ink}" stroke-width=".8"/><line x1="${cx}" x2="${cx+48}" y1="${base-2*r}" y2="${base-2*r}" stroke="${ink}" stroke-width=".5"/><text x="${cx+50}" y="${base-2*r+3}" font-size="10" fill="${ink}" font-family='"JetBrains Mono",monospace'>${S.round?fmt(rv,rv<1?1:0):fmt(rv,4)}</text>`});
    } else if(S.scheme==='cat'){
      s+=`<text x="${OX}" y="${LY+14}" font-size="10" fill="${mut}">minden megye külön színnel</text>`;
    } else {
      const bw=Math.min(52,520/k),counts=Array(k).fill(0);vals.forEach(x=>counts[classOf(x,b)]++);
      for(let i=0;i<k;i++){s+=`<rect x="${OX+i*bw}" y="${LY}" width="${bw}" height="13" fill="${cols[i]}" stroke="#777" stroke-width=".4"/>`;
        s+=`<text x="${OX+i*bw+bw/2}" y="${LY+44}" text-anchor="middle" font-size="9" fill="${counts[i]?mut:'#b3261e'}" font-family='"JetBrains Mono",monospace'>${counts[i]} db</text>`}
      for(let i=0;i<=k;i++){const x=OX+i*bw;s+=`<line x1="${x}" x2="${x}" y1="${LY+13}" y2="${LY+17}" stroke="${ink}" stroke-width=".6"/><text x="${x}" y="${LY+28}" text-anchor="middle" font-size="${S.round?9.5:8.5}" fill="${ink}" font-family='"JetBrains Mono",monospace' ${!S.round&&i%2?`dy="9"`:''}>${fmtB(b[i])}</text>`}
      if(S.scheme==='div'&&v.mid!=null)s+=`<text x="${OX+k*bw+8}" y="${LY+11}" font-size="9.5" fill="${mut}">közép ${fmt(v.mid,v.dec)} (${v.midName})</text>`;
    }}
  // méretarány
  if(S.scale){const px=100/KMPX,x0=W-40-px,y0=LY+44;
    s+=`<rect x="${x0}" y="${y0}" width="${px/2}" height="4" fill="${ink}"/><rect x="${x0+px/2}" y="${y0}" width="${px/2}" height="4" fill="#fff" stroke="${ink}" stroke-width=".7"/><rect x="${x0}" y="${y0}" width="${px}" height="4" fill="none" stroke="${ink}" stroke-width=".7"/>`;
    [0,50,100].forEach((d,i)=>s+=`<text x="${x0+px*i/2}" y="${y0-4}" text-anchor="middle" font-size="9" fill="${ink}" font-family='"JetBrains Mono",monospace'>${d}${i===2?' km':''}</text>`)}
  // északjel
  if(S.north==='small')s+=`<g transform="translate(${W-46},${OY+6})"><path d="M0,-12 L5,6 L0,2 L-5,6Z" fill="${ink}"/><text y="18" text-anchor="middle" font-size="9" font-weight="600" fill="${ink}">É</text></g>`;
  if(S.north==='huge')s+=`<g transform="translate(540,128)"><circle r="54" fill="#fff8" stroke="#8a5a00" stroke-width="3"/><path d="M0,-70 L12,-12 L70,0 L12,12 L0,70 L-12,12 L-70,0 L-12,-12Z" fill="#d4a017" stroke="#5b3a00" stroke-width="2"/><path d="M0,-70 L12,-12 L0,0Z M70,0 L12,12 L0,0Z M0,70 L-12,12 L0,0Z M-70,0 L-12,-12 L0,0Z" fill="#7a4b00"/><text y="-76" text-anchor="middle" font-size="20" font-weight="700" fill="#5b3a00">N</text></g>`;
  // forrás
  if(S.source)s+=`<text x="${OX}" y="${H-12}" font-size="9.5" fill="${mut}">Forrás: KSH STADAT, ${S.v==='dens'?'lakónépesség 2026. jan. 1. és területadatok':'munkaerő-felmérés 2025'} · Szerkesztette: ${esc(S.author||'hallgató')}</text>`;
  s+='</svg>';
  target.innerHTML=s;
}

/* ---------- ellenőrzés ---------- */
function evaluate(){
  const v=VARS[S.v],out=[];
  const add=(st,h,p)=>out.push({st,h,p});
  // 1 ábrázolási mód
  if(v.kind==='abszolút'&&S.mode==='fill')add('bad','Mutató és jelkulcs','Abszolút számot (munkanélküliek száma) kitöltött felülettel ábrázolsz. A nagy területű vagy népes megye így automatikusan sötét lesz. Abszolút számhoz arányos szimbólum illik, kartogramhoz arány kell.');
  else if(v.kind==='arány'&&S.mode==='circ')add('warn','Mutató és jelkulcs','Arányszámot ábrázolsz körmérettel. A kör „mennyiséget” sugall, pedig a ráta nem adható össze. Aránymutatóhoz a kartogram (felületkitöltés) a megszokott választás.');
  else add('ok','Mutató és jelkulcs',v.kind==='abszolút'?'Abszolút számhoz arányos kör tartozik, a terület nem torzítja az üzenetet.':'Aránymutató kartogrammal. A megye mérete így nem növeli meg az értékét.');
  // 2 körméret
  if(S.mode==='circ'){if(S.size==='radius')add('bad','Körméret skálázása','A sugár arányos az értékkel, ezért a kör területe a négyzetével nő. A kétszer akkora érték négyszer akkora körként jelenik meg. A területnek kell arányosnak lennie.');else add('ok','Körméret skálázása','A kör területe arányos az értékkel, a jelmagyarázat beágyazott körei ugyanazzal a skálával készültek.')}
  // 3 színséma
  if(S.mode==='circ')add('ok','Színséma','Arányos köröknél egyetlen semleges szín elég, a mennyiséget a méret hordozza.');
  else if(S.scheme==='rainbow')add('bad','Színséma','A szivárvány színsornak nincs természetes sorrendje. Nem látszik, hogy a zöld több-e, mint a sárga, és a világos sárga kiugrik, pedig középérték. Rendezett adathoz egyszínű, világostól sötétig tartó sor kell.');
  else if(S.scheme==='cat')add('bad','Színséma','Minden megye más színt kapott, a szín így csak azt mondja, hogy ez egy másik megye. Az érték egyáltalán nem olvasható ki.');
  else if(S.scheme==='div'){if(v.mid==null)add('warn','Színséma','Kétirányú színsor csak akkor indokolt, ha van értelmes középpont (pl. országos átlag, nulla). Az abszolút számnak nincs ilyen.');else add('ok','Színséma',`Kétirányú színsor a ${v.midName} (${fmt(v.mid,v.dec)} ${v.unit}) körül. Akkor jó, ha az üzenet az átlag feletti és alatti megyék szembeállítása.`)}
  else add('ok','Színséma','Egyszínű sorozat, a világosabb kevesebbet, a sötétebb többet jelent. Ez a rendezett adat alapesete.');
  // 4 osztályozás
  if(S.mode==='fill'&&S.scheme!=='cat'){const b=breaks(),vals=F.map(v.get),c=Array(b.length-1).fill(0);vals.forEach(x=>c[classOf(x,b)]++);const empty=c.filter(x=>!x).length;
    if(S.k>7)add('bad','Osztályok száma',`${S.k} osztály túl sok. Az olvasó nagyjából öt-hét árnyalatot tud megbízhatóan elkülöníteni, ennél több esetén a jelmagyarázatot kell bogarásznia.`);
    else if(S.k<3)add('warn','Osztályok száma','Két osztállyal szinte minden különbség eltűnik. Három és hét osztály között maradj.');
    else if(empty)add('warn','Osztályozás',`${empty} üres osztály van. Az egyenlő közű módszer kiugró érték (Budapest) mellett a skála nagy részét kihasználatlanul hagyja. Próbáld a kvantilis vagy a természetes törés módszert.`);
    else add('ok','Osztályozás',`${S.k} osztály, ${S.method==='equal'?'egyenlő közű':S.method==='quant'?'kvantilis':'természetes törés'} módszer, nincs üres osztály. Gondold végig, melyik módszer milyen különbséget nagyít fel.`)}
  else add('ok','Osztályozás',S.mode==='circ'?'Arányos köröknél nincs szükség osztályozásra.':'A kategorikus színezésnél nincs mit osztályozni, ezért ezt a színsémánál kell javítani.');
  // 5 jelmagyarázat
  if(!S.legend)add('bad','Jelmagyarázat','Nincs jelmagyarázat, így a színek és méretek jelentése csak tippelhető.');
  else if(!S.units||!S.round)add('warn','Jelmagyarázat',[!S.units?'Hiányzik a mutató pontos neve és mértékegysége.':'',!S.round?'A határértékek négy tizedesre vannak írva, ez hamis pontosságot sugall és nehezen olvasható.':''].filter(Boolean).join(' '));
  else add('ok','Jelmagyarázat','Pontos mutatónév, mértékegység és kerekített határértékek.');
  // 6 cím
  const t=(S.title||'').trim(),yr=/20\d\d/.test(t),longok=t.length>=18&&!/^térkép/i.test(t);
  if(!t||/^térkép\s*\d*$/i.test(t))add('bad','Cím','A cím nem mond semmit. Egy jó cím megmondja, mit (mutató), hol (terület) és mikor (év) mutat a térkép, vagy egy mondatban kimondja a fő üzenetet.');
  else if(!yr||!longok)add('warn','Cím','Már van cím, de '+(!yr?'hiányzik belőle az időpont.':'túl rövid ahhoz, hogy a mit, hol, mikor kérdésekre feleljen.'));
  else add('ok','Cím','A cím azonosítja a mutatót, a területet és az időpontot.');
  // 7 forrás
  add(S.source?'ok':'bad','Forrás',S.source?'Adatforrás és szerkesztő feltüntetve, a térkép így ellenőrizhető.':'Nincs forrásmegjelölés. Tematikus térképen az adat eredete és éve kötelező elem.');
  // 8 kiegészítő elemek
  if(S.north==='huge')add('bad','Északjel és méretarány','Az óriás díszes szélrózsa a lap legerősebb jele lett, és eltakarja Szabolcs-Szatmár-Bereget. Észak felfelé áll, ez itt magától értetődik, ezért elhagyható vagy kicsi lehet.');
  else if(!S.scale)add('warn','Északjel és méretarány','Hiányzik a méretarányvonalzó. Országos áttekintőn nem létfontosságú, de segít érzékeltetni a távolságokat.');
  else add('ok','Északjel és méretarány','A kiegészítő elemek kicsik, alárendeltek a tematikus tartalomnak.');
  // 9 vizuális hierarchia
  const h=[];if(S.deco)h.push('a díszkeret, az árnyék, a színátmenetes háttér és a dekoratív betűtípus elvonja a figyelmet');if(S.bg==='blue')h.push('a kék háttér vízfelületet jelent, Magyarország viszont nem tengerparti');if(S.thick)h.push('a vastag fekete határvonalak erősebbek a kitöltésnél');if(S.labels==='all')h.push('húsz felirat zsúfolttá teszi a lapot');
  if(h.length>=2||S.deco||S.bg==='blue')add('bad','Vizuális hierarchia','A háttérelemek túl hangosak. '+h.map((x,i)=>i?x:x[0].toUpperCase()+x.slice(1)).join(', ')+'.');
  else if(h.length)add('warn','Vizuális hierarchia',h[0][0].toUpperCase()+h[0].slice(1)+'. Az adatnak kell a legerősebb jelnek lennie.');
  else add('ok','Vizuális hierarchia','A tematikus réteg a legerősebb jel, a határok, feliratok és keretelemek a háttérben maradnak.');
  return out}


/* ---------- vezérlők ---------- */
const C=[
 {g:'Adat és jelkulcs',items:[
  {k:'v',l:'Változó',opts:[['rate','Ráta (%)'],['count','Létszám'],['dens','Népsűrűség']]},
  {k:'mode',l:'Ábrázolási mód',opts:[['fill','Kartogram'],['circ','Arányos kör']]},
  {k:'size',l:'Körméret arányos ezzel',opts:[['area','Terület'],['radius','Sugár']],when:()=>S.mode==='circ'}]},
 {g:'Szín és osztályozás',items:[
  {k:'scheme',l:'Színséma',opts:[['rainbow','Szivárvány'],['cat','Megyénként'],['seq','Egyszínű'],['div','Kétirányú']],when:()=>S.mode==='fill'},
  {k:'method',l:'Osztályozás',opts:[['equal','Egyenlő közű'],['quant','Kvantilis'],['jenks','Term. törés']],when:()=>S.mode==='fill'&&S.scheme!=='cat'},
  {k:'k',l:'Osztályok száma',range:[2,9],when:()=>S.mode==='fill'&&S.scheme!=='cat'}]},
 {g:'Térképelemek',items:[
  {k:'title',l:'Cím',text:true},
  {k:'author',l:'Szerkesztő neve (a forrássorba kerül)',text:true,ph:'Nevek'},
  {k:'legend',l:'Jelmagyarázat',chk:true},
  {k:'units',l:'Mutató neve és mértékegység',chk:true},
  {k:'round',l:'Kerekített határértékek',chk:true},
  {k:'source',l:'Forrás és szerkesztő',chk:true},
  {k:'scale',l:'Méretarányvonalzó',chk:true},
  {k:'north',l:'Északjel',opts:[['none','Nincs'],['small','Kicsi'],['huge','Díszes']]},
  {k:'labels',l:'Feliratok',opts:[['none','Nincs'],['key','Szélsők'],['all','Mind a 20']]}]},
 {g:'Háttér és díszítés',items:[
  {k:'bg',l:'Háttér a térkép mögött',opts:[['white','Fehér'],['blue','Kék']]},
  {k:'thick',l:'Vastag fekete határok',chk:true},
  {k:'deco',l:'Díszkeret, árnyék, színátmenet',chk:true}]}
];
function buildCtrls(){
  const el=document.getElementById('ctrls');let h='';
  C.forEach(g=>{h+=`<fieldset><legend>${g.g}</legend>`;
    g.items.forEach(it=>{const id='c_'+it.k;if(it.when&&!it.when())return;
      if(it.chk)h+=`<label class="chk" for="${id}"><input type="checkbox" id="${id}" data-k="${it.k}" ${S[it.k]?'checked':''}>${it.l}</label>`;
      else if(it.text)h+=`<div class="row"><label for="${id}">${it.l}</label><input type="text" id="${id}" data-k="${it.k}" value="${esc(S[it.k]||'')}" placeholder="${it.ph||''}" autocomplete="off"></div>`;
      else if(it.range)h+=`<div class="row"><label for="${id}">${it.l} <span class="rangeval">${S.k}</span></label><input type="range" id="${id}" data-k="k" min="${it.range[0]}" max="${it.range[1]}" value="${S.k}"></div>`;
      else h+=`<div class="row"><span class="lbl" id="${id}_l">${it.l}</span><div class="seg" role="group" aria-labelledby="${id}_l">${it.opts.map(o=>`<button type="button" data-k="${it.k}" data-v="${o[0]}" aria-pressed="${S[it.k]===o[0]}">${o[1]}</button>`).join('')}</div></div>`});
    h+='</fieldset>'});
  el.innerHTML=h;
}
function update(rebuild){if(rebuild)buildCtrls();render(document.getElementById('sheet'));
  const v=VARS[S.v];document.getElementById('caption').textContent=`${v.name} (${v.unit}) · 19 vármegye és Budapest`}
document.getElementById('ctrls').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;S[b.dataset.k]=b.dataset.v;update(true);const nb=document.querySelector(`button[data-k="${b.dataset.k}"][data-v="${b.dataset.v}"]`);nb&&nb.focus()});
document.getElementById('ctrls').addEventListener('input',e=>{const t=e.target;if(!t.dataset.k)return;
  if(t.type==='checkbox')S[t.dataset.k]=t.checked;else if(t.type==='range'){S.k=+t.value;t.previousElementSibling.querySelector('.rangeval').textContent=S.k}else S[t.dataset.k]=t.value;update(false)});
document.getElementById('resetBtn').onclick=()=>{S={...BAD,author:S.author};update(true)};

/* ---------- 5 mp teszt ---------- */
let timer=null;
document.getElementById('testBtn').onclick=()=>{const ov=document.getElementById('overlay'),big=document.getElementById('big'),cd=document.getElementById('cd'),q=document.getElementById('q'),cl=document.getElementById('closeOv');
  render(big,true);big.hidden=false;q.hidden=true;cl.hidden=true;ov.hidden=false;let n=5;cd.textContent=`${n} mp`;
  clearInterval(timer);timer=setInterval(()=>{n--;if(n>0){cd.textContent=`${n} mp`;return}clearInterval(timer);big.hidden=true;cd.textContent='';q.hidden=false;cl.hidden=false;cl.focus()},1000)};
document.getElementById('closeOv').onclick=()=>{document.getElementById('overlay').hidden=true;clearInterval(timer)};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('overlay').hidden){document.getElementById('overlay').hidden=true;clearInterval(timer)}});


S.author='';update(true);
