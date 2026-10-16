'use strict';
if(typeof window!=='undefined'&&window.__jm_loaded){
  console.warn('Game client already initialized, skipping duplicate execution');
}else{
if(typeof window!=='undefined')window.__jm_loaded=true;
(function(){
const Wd=window.World;
const {TAU,clamp,d2,dist,norm,mulberry32,shade,ZONE,JM,WORLD,CP,ROADS,RINGS,PARKS,DEST,METRO,BANGLA,BUILD,TREES,GATE_DEFS,ASSEMBLY,PSTATIONS,riverL,moveBody,SPEED,nearBuildings}=Wd;
const DT=1/30,TICK_MS=1000/30;
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[(Math.random()*a.length)|0];
const store={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};

// =================================================================== canvas
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const vigCache=new Map();let W=0,H=0,DPR=1,quality=store.get('jm_q','hi'),miniDirty=true;
const tiles=new Map();
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(window.devicePixelRatio||1,quality==='hi'?1.25:1);const maxPx=quality==='hi'?2.6e6:1.5e6;if(W*H*DPR*DPR>maxPx)DPR=Math.max(.6,Math.sqrt(maxPx/(W*H)));vigCache.clear();cv.width=Math.floor(W*DPR);cv.height=Math.floor(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';miniDirty=true;tiles.clear();if(net)net.sendView();}
addEventListener('resize',resize);
function circle(x,y,r){if(!(r>0))return;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
function ellC(x,y,rx,ry){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,TAU);ctx.fill();}
function rrect(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function ell(g,x,y,rx,ry,fill,stroke){g.beginPath();g.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,TAU);if(fill){g.fillStyle=fill;g.fill();}if(stroke)g.stroke();}
function rr(g,x,y,w,h,r,fill,stroke){rrect(g,x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill();}if(stroke)g.stroke();}
const LBL=new Map();
function label(t,x,y,s,c,stroke){const k=ctx.getTransform().a,px=Math.max(6,Math.round(s*k)),key=t+'|'+c+'|'+(stroke!==false?1:0)+'|'+px;let cv=LBL.get(key);
 if(!cv){if(LBL.size>700)LBL.clear();cv=document.createElement('canvas');const g=cv.getContext('2d');g.font=`800 ${px}px "Segoe UI",sans-serif`;const w=Math.ceil(g.measureText(t).width+px*.6)+2,h=Math.ceil(px*1.45)+2;cv.width=w;cv.height=h;g.font=`800 ${px}px "Segoe UI",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';if(stroke!==false){g.lineWidth=px*.28;g.strokeStyle='rgba(255,255,255,.8)';g.strokeText(t,w/2,h/2);}g.fillStyle=c;g.fillText(t,w/2,h/2);LBL.set(key,cv);}
 ctx.drawImage(cv,x-cv.width/2/k,y-cv.height/2/k,cv.width/k,cv.height/k);}
function vignette(key,inner,c0,c1){const k=key+W+'x'+H;let v=vigCache.get(k);if(!v){v=document.createElement('canvas');const sc=.5;v.width=Math.ceil(W*sc);v.height=Math.ceil(H*sc);const g=v.getContext('2d');const gr=g.createRadialGradient(v.width/2,v.height/2,inner*sc,v.width/2,v.height/2,Math.max(W,H)*.65*sc);gr.addColorStop(0,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.fillRect(0,0,v.width,v.height);vigCache.set(k,v);}ctx.drawImage(v,0,0,W,H);}

// =================================================================== audio
let AC=null,muted=store.get('jm_mute','0')==='1';
function initAudio(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();}
function tone(f,d,type,v,f2){if(!AC||muted)return;const t=AC.currentTime;const o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v||.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d+.03);}
let NBUF=null;function noise(d,v,f,q){if(!AC||muted)return;if(!NBUF){NBUF=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const ch=NBUF.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;}const s=AC.createBufferSource();s.buffer=NBUF;const fl=AC.createBiquadFilter();fl.type='bandpass';fl.frequency.value=f||1000;fl.Q.value=q||1;const g=AC.createGain();const t=AC.currentTime;g.gain.setValueAtTime(v||.1,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl).connect(g).connect(AC.destination);s.start(t);s.stop(t+d);}
let popT=0;
// a cartoon voice: a gliding buzz through two vowel filters ("aiyo!", "oof!")
function vox(f0,f1,d,vow,v){if(!AC||muted)return;const t=AC.currentTime;const o=AC.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+d);
 const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.09,t+.03);g.gain.setValueAtTime(v||.09,t+d*.7);g.gain.exponentialRampToValueAtTime(.0001,t+d);
 const F={a:[800,1200],e:[500,1800],i:[320,2300],o:[500,900],u:[350,800]};
 for(let k=0;k<2;k++){const f=AC.createBiquadFilter();f.type='bandpass';f.Q.value=7;vow.forEach((ch,i)=>{const at=t+d*i/Math.max(1,vow.length-1)*.85;if(i===0)f.frequency.setValueAtTime(F[ch][k],t);else f.frequency.linearRampToValueAtTime(F[ch][k],at);});o.connect(f).connect(g);}
 g.connect(AC.destination);o.start(t);o.stop(t+d+.05);}
// swelling crowd noise ("yaaay")
function crowd(d,v,f){if(!AC||muted)return;if(!NBUF)noise(.01,.0001);const s=AC.createBufferSource();s.buffer=NBUF;s.loop=true;const fl=AC.createBiquadFilter();fl.type='bandpass';fl.frequency.value=f||1100;fl.Q.value=.7;const g=AC.createGain();const t=AC.currentTime;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.12,t+d*.3);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl).connect(g).connect(AC.destination);s.start(t);s.stop(t+d);}
const LADDER=[523,587,659,784,880,1047,1175,1319,1568,1760,2093];let ladI=0,ladT=0;
// a crowd murmur that grows with your kafila
let murm=null;function murmur(level){if(!AC||muted){if(murm){murm.g.gain.value=0;}return;}if(!murm){if(!NBUF)noise(.01,.0001);const s=AC.createBufferSource();s.buffer=NBUF;s.loop=true;const fl=AC.createBiquadFilter();fl.type='bandpass';fl.frequency.value=650;fl.Q.value=.6;const g=AC.createGain();g.gain.value=0;s.connect(fl).connect(g).connect(AC.destination);s.start();murm={g};}murm.g.gain.setTargetAtTime(level,AC.currentTime,.4);}
let beatT=0,beatN=0;
const SFX={
 whistle(){tone(3000,.12,'square',.022);setTimeout(()=>tone(2800,.35,'square',.022,2500),160);},
 horn(){tone(185,.3,'sawtooth',.03);setTimeout(()=>tone(160,.45,'sawtooth',.03),330);},
 ding(){tone(660,.15,'triangle',.07);setTimeout(()=>tone(990,.35,'triangle',.07),130);},
 metro(){tone(880,.25,'sine',.06);setTimeout(()=>tone(660,.45,'sine',.06),260);},
 chant(){noise(.35,.14,500,.8);tone(330,.14,'sawtooth',.025);setTimeout(()=>{noise(.35,.14,560,.8);tone(392,.14,'sawtooth',.025);},180);setTimeout(()=>{noise(.5,.16,620,.8);tone(440,.3,'sawtooth',.025);},360);},
 alert(){tone(700,.15,'square',.03);setTimeout(()=>tone(500,.25,'square',.03),170);},
 thump(){tone(150,.18,'triangle',.08,55);noise(.25,.06,300);},
 crash(){noise(.6,.25,900,.6);tone(220,.3,'sawtooth',.05,60);setTimeout(()=>noise(.4,.15,2500,1),120);},
 push(){noise(.12,.07,200,.7);},
 pop(){const n=performance.now();if(n-popT<50)return;popT=n;tone(600+Math.random()*300,.08,'sine',.045,1200);},
 join(){const n=performance.now();if(n-popT<70)return;popT=n;if(n-ladT>1600)ladI=0;ladT=n;const f=LADDER[Math.min(LADDER.length-1,ladI++)];tone(f,.12,'triangle',.06);tone(f*2,.08,'sine',.02);},
 ouch(){const r=Math.random();if(r<.4)vox(420,190,.42,['a','i','o'],.1);else if(r<.7)vox(260,150,.22,['u','o'],.11);else vox(380,230,.36,['a','u','e'],.1);},
 land(){tone(120,.2,'triangle',.09,45);noise(.18,.07,250);},
 cheer(big){crowd(big?1.6:1.1,big?.16:.11,1200);crowd(big?1.4:1,.06,600);tone(196,.12,'triangle',.08,90);setTimeout(()=>tone(196,.12,'triangle',.08,90),160);[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.18,'triangle',.05),120+i*90));},
 halla(big){crowd(big?1.2:.9,big?.2:.14,900);crowd(.8,.08,420);[0,110,220].forEach(d=>setTimeout(()=>{tone(90,.2,'sine',.14,50);noise(.1,.07,180,1.2);},d));setTimeout(()=>vox(300,420,.35,['a','o'],.06),60);},
 dha(v){tone(95,.22,'sine',.12*v,55);noise(.08,.05*v,180,1.2);},
 tin(v){tone(240,.08,'triangle',.05*v,200);noise(.05,.03*v,2400,2);},
 flutter(){noise(.5,.06,3500,.5);},
 bark(){tone(480,.07,'square',.025,300);setTimeout(()=>tone(500,.09,'square',.025,280),140);},
 slurp(){noise(.35,.06,1500,2);},
 honk(){tone(430,.12,'square',.018);setTimeout(()=>tone(430,.12,'square',.018),160);},
 rank(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.18,'triangle',.06),i*90));},
 ride(){tone(200,.5,'sawtooth',.02,420);},
 pickup(){tone(880,.08,'triangle',.05);setTimeout(()=>tone(1320,.12,'triangle',.05),70);},
 shutter(){noise(.06,.12,4000,1);setTimeout(()=>noise(.05,.1,3000,1),70);},
 whoosh(){noise(.18,.08,1800,.7);},
 thwack(){tone(180,.08,'square',.05,90);noise(.1,.1,900,1);},
 mega(){tone(520,.12,'square',.03);setTimeout(()=>tone(390,.25,'square',.03),130);noise(.4,.05,2200,.5);},
 monkey(){tone(1400,.08,'square',.025,1900);setTimeout(()=>tone(1500,.1,'square',.025,2100),110);},
 arrive(){[392,523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>tone(f,.25,'triangle',.07),i*110));noise(1.2,.12,700,.5);}
};

// =================================================================== content: jokes & text
const NEWS=['Section 163 imposed around Jantar Mantar; pigeons asked to show permission letter','Mobile internet suspended in central Delhi; WhatsApp uncles report withdrawal symptoms','DMRC shuts 6 stations "for your convenience"; auto fares triple instantly','Paper leak probe report also leaked, officials confirm','Voter roll revision: man finds his name deleted, late grandfather\'s added twice','Gen Z protesters bring power banks; police bring concrete blocks','Concrete block industry reports best quarter since 2020','Detained protesters sing in DTC bus; driver requests encore','Burari Ground now has more detained protesters than residents','Delivery app launches "10-minute delivery to Jantar Mantar"; riders stuck at barricade since Tuesday','Coaching centre launches "Andolan Crash Course": fees ₹1.5 lakh, detention guaranteed','Committee formed to study why the previous committee was formed','Chai at Jantar Mantar now ₹20; protesters demand MSP for chai','Street dogs of Sansad Marg declare neutrality, accept biscuits from both sides','Tear gas shells found past expiry date; protesters file consumer complaint','Two police barricades spotted together; scientists suspect they are breeding','Prime-time anchor shouts so loud that Noida hears it without a TV','Ministry clarifies there is no unemployment, only "pre-employment"','Exam postponed again; students asked to revise their motivation','Uncle explains entire protest on family WhatsApp using one forwarded image','Pigeons at Jantar Mantar unionise, demand MSP on grain','Cow sits on Janpath; traffic police issue challan to the road','Protest allowed 10am to 5pm, with lunch break, in triplicate, with self-attested photocopy','Delhi AQI enters "please leave the city" category; tear gas reportedly an improvement','Startup India unveils new unicorn: a pakoda stall at ITO','Influencer goes live from barricade, gains 2 lakh followers, loses one chappal','Barricades to be painted in tricolour "to boost patriotism"','Auto driver agrees to go by meter; scientists call it a miracle','Protest permission app crashes after 3 users; minister blames Wi-Fi','Constable on 19-hour duty asks protesters to "please finish quickly"','Bunty from Burari detained for the 7th time, now has a DTC loyalty card','Water cannon refilled from the Yamuna; protesters demand a cleaner water cannon','Lutyens\' Delhi residents complain the protest is louder than their generator','Rajpath renamed Kartavya Path; potholes renamed Kartavya Gaddhe','UPSC aspirant reads Laxmikant inside the detention bus, clears prelims mentally','Experts: Delhi now has 3 seasons, summer, smog and Section 163','Chhole kulche vendor near Patel Chowk reports record "law and order" sales','Spokesperson calls protesters "misguided"; spokesperson\'s nephew among them','Netflix announces docu-series "Barricade: The Untold Story"','Delhi Police meme gets more likes than the official statement','Foreign funding probe finds protester\'s mausi in Dubai sent ₹47 via UPI','"Toolkit" seized from protester turns out to be a geometry box','E20 petrol: bikes now get mileage of a bicycle, ministry calls it "fitness drive"','Ethanol blending so good, scooters reportedly asking for chakhna','Sources: Soros personally funds every chai stall near Jantar Mantar (source: a forward)','Pension office window 4 closed since 1998 for "lunch"','Tomato crosses ₹200; housewives declare it a dry fruit','Voter list update: 3 dead people added, 1 living MP removed','Gaddhe on Ring Road now visible from ISRO satellite','Exam leaked so many times, students now study the WhatsApp group instead','Monkeys at North Block steal file on pension reform; reform delayed indefinitely','Delivery apps fight: zomaato vs swiggi riders race to deliver protesters','AQI so bad, tear gas complains about air quality','Government clarifies: barricades are not barricades, they are "pedestrian guidance structures"','Jantar Mantar pigeons demand Z+ security after third tear gas incident this week','IIT study finds 73% of Delhi\'s oxygen now produced by protest slogans','Minister says protest has no public support; protest has 40,000 people','Rajouri uncle forwards video of the protest captioned "Pakistan mein yeh ho raha hai"','News anchor reaches studio by tractor because Kartavya Path is sealed','Delhi Police buy 10,000 new barricades; protesters buy 10,000 new chappals','Detention bus to Burari now has a pantry car and a WhatsApp group','Startup launches "Dharna-as-a-Service": rent a crowd, ₹199/hour','Gen Z protesters ask police for Wi-Fi password; police say "permission chahiye"','Minister calls protest "fake"; Gen Z replies "ok boomer" in 40 languages','Protest delayed 10 minutes: main character\'s phone at 2%','Placard spotted: "Sarkar is lowkey sus, no cap"','Gen Z protester gets detained, posts "detention bus GRWM" reel, 2M views','Delhi Police open Instagram account, get ratioed in 4 minutes',"Rupee hits new low; ministry clarifies the dollar is simply \"rising too much\"","Unemployment at record high; ministry stops publishing the data, unemployment solved","5 trillion economy delayed again; WhatsApp forward says it already happened in 2019","New flyover collapses before inauguration; minister inaugurates the collapse instead","NEET re-exam announced for the re-exam of the re-exam","IT cell trends #ProtestersAreBots; trend powered by 40,000 bots","Sedition case filed against a placard for \"looking at the government in a tone\"","ED raids protester's house, recovers 3 rejected job applications and half a Maggi packet","Electoral bonds stay anonymous; protester's ₹10 chai donation under investigation","Delhi AQI crosses 500; advisory asks citizens to breathe less and protest less","Internet shut down to stop rumours; rumours now travel by aunty at 5G speed","Police grant protest permission: Sunday, 3:00 to 3:15 am, in Haryana","Train delayed 14 hours; railway account posts a photo of a new Vande Bharat","Agniveer applicant asks if 4 years of protesting counts as service experience","Smart City drain overflows; officials blame protesters for \"excessive standing\"","Petrol ₹110, salary ₹11,000; finfluencer says it's a \"mindset problem\"","Toll plaza installed on the road to Jantar Mantar; FASTag for protesters coming soon","Committee to probe why people keep asking questions; questions about the committee banned","UPSC aspirant crosses age limit waiting for the result, now protests full-time","Godi anchor declares protest over; protest continues, anchor declares it over again","Minister says youth should start businesses; youth start selling chai outside his office","Bulldozer seen near Jantar Mantar; officials insist it is \"only here for the photos\"","Pothole on Ring Road gets its own pin code after 3 years of seniority","Exam paper leaked before the exam date was announced; investigation also leaked","Detained protester asks for a lawyer; police offer a WhatsApp forward instead","Viksit Bharat 2047 poster put up on a road that floods every July"];
let ticker=NEWS.slice().sort(()=>Math.random()-.5).join('   ◆   '),tickerX=0,tickerW=0;const TICK={items:null,total:0};
const EVTEXT={
 internet:['📵 INTERNET SHUTDOWN','Mobile internet suspended "to maintain law and order". Map down, Naara range halved. 🔋 Power banks help.'],
 metro:['🚇 DMRC: GATES CLOSED','Patel Chowk, Central Secretariat, Rajiv Chowk, Mandi House, ITO & Vishwavidyalaya shut "for your convenience".'],
 vajra:['🚨 VAJRA: TEAR GAS VOLLEY','An anti-riot vehicle is firing at the biggest crowd. Scatter, or grab a 🧣 wet gamchha!'],
 viral:['📱 VIDEO GOES VIRAL','A lathi-charge video is trending. Supporters are pouring out of every hostel and chai stall!'],
 reinforce:['🛡️ RAF REINFORCEMENTS','Six Rapid Action Force jawans have arrived at Jantar Mantar.'],
};
const CIVIL=['Foreign funding hai sab, mujhe WhatsApp pe pata chala','Mere paas bhi toolkit hai… screwdriver wala','Soros ka paisa? Mujhe bhi dilwao!','E20 daal ke meri scooty ne saans lena band kar diya','Tamatar ₹200, main toh ab sirf dekhta hoon','Pension ke liye 3 saal se line mein hoon','Beta, khana kha ke jaana!','Hamare zamane mein toh…','Sab foreign funded hai! (WhatsApp uncle)','Bhai reel bana le, viral hoga','Yeh sab kab khatam hoga?','Mera bhi vote kat gaya tha','Paper phir leak? Phir se?','Chai peeke jaana beta','Ghar pe bata ke aaye ho?','Main toh bas samosa lene aaya tha'];
const BILLBOARDS=['SWACHH BARRICADE ABHIYAN','HAR GHAR BARRICADE','TOPPER IAS: 100% SELECTION*','AQI 999? BUY AIR PURIFIER','SHANTI · SEWA · NYAYA','DESTINATION WEDDINGS @ BURARI GROUND','PAKODA STARTUP INCUBATOR','LEARN ENGLISH IN 7 DAYS','PERMISSION? APPLY IN TRIPLICATE','FREE WIFI* (*NOT DURING PROTESTS)','VOTE FOR PAPPU','NEW 3BHK NEAR METRO (CLOSED)'];

// =================================================================== sprites
const SC=1.5,SPR=new Map();
function sprite(key,w,h,fn,sc){let c=SPR.get(key);if(c)return c;sc=sc||SC;c=document.createElement('canvas');c.width=Math.ceil(w*sc);c.height=Math.ceil(h*sc);const g=c.getContext('2d');g.scale(sc,sc);g.lineJoin='round';g.lineCap='round';fn(g);c.ww=w;c.hh=h;SPR.set(key,c);return c;}
function flipped(c){if(c._f)return c._f;const f=document.createElement('canvas');f.width=c.width;f.height=c.height;const g=f.getContext('2d');g.translate(f.width,0);g.scale(-1,1);g.drawImage(c,0,0);f.ww=c.ww;f.hh=c.hh;c._f=f;return f;}
function blit(c,x,y,ax,ay,flip,s){if(flip){c=flipped(c);ax=c.ww-ax;}s=s||1;ctx.drawImage(c,x-ax*s,y-ay*s,c.ww*s,c.hh*s);}
const OL='rgba(35,24,15,.62)';
const CW=48,CHH=68,AX=24,AY=62;
const SKINS=['#c98a55','#b8784a','#d9a06b','#a86b40','#e0b084'];
const SLOGANS=['NO CAP|JUST JOBS','DELULU NAHI|NAUKRI DO','RENT FREE?|NAHI, RENT DO','NO PAPER|LEAK!','HUM|DEKHENGE','NAUKRI|DO','MERA VOTE|KAHAN?','SAANS|LENE DO','JUSTICE|NOW','INQUILAB|ZINDABAD','EXAM|BACHAO','SUNO|TOH SAHI','ROTI|ROZGAAR','RESULT|KAB AAYEGA?','DATA|NAHI, JOB DO'];
function makeLook(kind,R){
 const pk=a=>a[(R()*a.length)|0];
 const L={skin:pk(SKINS),shoe:'#3a2c22',hairC:'#1c1814',hair:'short',top:'#888',bottom:'#3b5b8a',hat:null,item:null};
 if(kind==='cop')Object.assign(L,{cop:1,top:'#c4a26c',bottom:'#a8875a',sleeve:'#c4a26c',hat:'cap',item:'lathi'});
 else if(kind==='raf')Object.assign(L,{cop:1,camo:1,top:'#3f6fa8',bottom:'#2f5585',hat:'helmet',item:'shield'});
 else if(kind==='reporter')Object.assign(L,{top:'#f4f1ea',bottom:'#5d4037',kurta:1,hair:'bun',bag:true,bagC:'#6d4c41',item:'mic'});
 else if(kind==='anchor')Object.assign(L,{top:'#0d1b4a',bottom:'#0d1b4a',hair:'short',glasses:true,item:'gmic'});
 else if(kind==='gcam')Object.assign(L,{top:'#ff6f00',bottom:'#212121',hat:'capb',item:'camera'});
 else if(kind==='camera')Object.assign(L,{top:'#5d4037',bottom:'#3b5b8a',hat:'capb',item:'camera'});
 else if(kind==='chaiwala')Object.assign(L,{top:'#f4f1ea',bottom:'#f4f1ea',kurta:1,hair:'short',item:'kettle',hat:'gamchha'});
 else{
  const t=pk(['genz','genz','genz','genzf','genzf','student','kisan','uncle','aunty','worker']);
  if(t==='genz')Object.assign(L,{top:pk(['#e53935','#1e88e5','#212121','#43a047','#fb8c00','#8e24aa','#f4f1ea','#00897b']),bottom:pk(['#3b5b8a','#2c3e50','#4e342e','#212121']),hair:pk(['short','spiky','short']),glasses:R()<.35,bag:R()<.6,bagC:pk(['#263238','#c62828','#1565c0']),hood:R()<.25});
  if(t==='genzf')Object.assign(L,{top:pk(['#ec407a','#ab47bc','#f4f1ea','#26a69a','#ffca28','#5c6bc0']),bottom:pk(['#3b5b8a','#212121','#6d4c41']),hair:pk(['long','bun','long']),glasses:R()<.3,bag:R()<.5,bagC:pk(['#4e342e','#6a1b9a'])});
  if(t==='student')Object.assign(L,{top:pk(['#f4f1ea','#90caf9','#ffe082']),bottom:'#37474f',hair:'short',glasses:R()<.5,bag:true,bagC:'#37474f'});
  if(t==='kisan')Object.assign(L,{top:'#f4f1ea',bottom:'#f4f1ea',kurta:1,hat:'turban',turbanC:pk(['#fdd835','#2e7d32','#ff9933','#1565c0','#f4f1ea']),beard:true,hairC:'#555'});
  if(t==='uncle')Object.assign(L,{top:pk(['#f4f1ea','#d7ccc8','#a5d6a7']),bottom:'#f4f1ea',kurta:1,hair:'short',hairC:'#9e9e9e',hat:R()<.5?'topi':null,glasses:R()<.6});
  if(t==='aunty'){Object.assign(L,{top:pk(['#e91e63','#ff7043','#8e24aa','#00897b','#fbc02d']),saree:1,hair:'bun',dupatta:true});L.bottom=L.top;}
  if(t==='worker')Object.assign(L,{top:pk(['#795548','#607d8b','#9e9d24']),bottom:'#455a64',hair:'short',hat:R()<.4?'gamchha':null});
  const r=R();if(r<.34){L.item='placard';L.text=pk(SLOGANS);}else if(r<.48)L.item='flag';
  if(kind==='leader')L.item='mega';
 }
 L.key=kind+Object.values(L).join('|');return L;
}
function makeMuddaLook(m,k,R){const pk=a=>a[(R()*a.length)|0];const M=Wd.MUDDAS[m];const female=R()<.45;
 const L={skin:pk(SKINS),shoe:'#3a2c22',hairC:'#1c1814',hair:female?pk(['long','bun']):pk(['short','short','spiky']),top:'#888',bottom:'#3b5b8a',hat:null,item:null};let alt='flag';
 switch(M.k){
  case 'paper':Object.assign(L,{top:pk(['#e53935','#1e88e5','#f4f1ea','#43a047','#fb8c00','#ec407a']),bottom:pk(['#3b5b8a','#2c3e50']),glasses:R()<.5,bag:true,bagC:pk(['#263238','#c62828','#1565c0'])});alt='books';break;
  case 'jobs':Object.assign(L,{top:pk(['#f4f1ea','#90caf9','#e0e0e0']),bottom:'#37474f',hat:'grad',tie:female?null:pk(['#c62828','#1565c0','#212121'])});alt='file';break;
  case 'e20':Object.assign(L,{top:pk(['#212121','#455a64','#5d4037']),bottom:'#2c3e50',hat:'bikehelm',helmC:pk(['#d32f2f','#1565c0','#fdd835','#212121','#43a047'])});alt='jerrycan';break;
  case 'vote':Object.assign(L,{top:pk(['#f4f1ea','#ffe082','#a5d6a7','#ce93d8']),bottom:pk(['#f4f1ea','#455a64']),kurta:R()<.5?1:0,hairC:R()<.4?'#9e9e9e':'#1c1814',glasses:R()<.5});if(female){Object.assign(L,{saree:1,hair:'bun',dupatta:true,kurta:0});L.top=L.bottom=pk(['#ad1457','#7b1fa2','#00897b']);}alt='placard';break;
  case 'aqi':Object.assign(L,{top:pk(['#26a69a','#5c6bc0','#212121','#f4f1ea']),bottom:pk(['#3b5b8a','#212121']),hat:'mask',hood:R()<.4,bag:R()<.4,bagC:'#37474f'});break;
  case 'msp':if(female){Object.assign(L,{saree:1,hair:'bun',dupatta:true});L.top=L.bottom=pk(['#fbc02d','#2e7d32']);}else Object.assign(L,{top:'#f4f1ea',bottom:'#f4f1ea',kurta:1,hat:'turban',turbanC:pk(['#fdd835','#2e7d32','#ff9933','#1565c0']),beard:R()<.7,hairC:'#555'});break;
  case 'pension':Object.assign(L,{top:pk(['#8d6e63','#a1887f','#bcaaa4']),bottom:'#5d4037',hairC:'#d6d6d6',glasses:true,hat:R()<.3?'topi':null});if(female){Object.assign(L,{saree:1,hair:'bun',dupatta:true,hat:null});L.top=L.bottom=pk(['#eeeeee','#bcaaa4']);}alt='stick';break;
  case 'roads':Object.assign(L,{top:pk(['#90caf9','#f4f1ea','#ffe082']),bottom:'#455a64',tie:female?null:pk(['#c62828','#1a237e',null]),glasses:R()<.4});alt='umbrella';break;
  case 'price':if(female||R()<.5){Object.assign(L,{top:pk(['#e91e63','#ff7043','#8e24aa','#00897b','#fbc02d']),saree:1,hair:'bun',dupatta:true});L.bottom=L.top;}else Object.assign(L,{kurta:1,top:'#f4f1ea',bottom:'#f4f1ea'});alt=pk(['tomato','cylinder']);break;}
 if(k===8)L.item='mega';else if(k<4){L.item='placard';L.text=M.sl[k%M.sl.length];}else if(k<6)L.item=alt;else if(k===6)L.item='flag';
 if(L.item==='placard'&&!L.text)L.text=M.sl[0];
 L.key='m'+m+'_'+k;return L;}
const LOOKS_M=Wd.MUDDAS.map((_,m)=>Array.from({length:9},(_,k)=>makeMuddaLook(m,k,mulberry32(1000+m*31+k))));
const LR=mulberry32(777);
const LOOKS_P=[];for(let i=0;i<40;i++)LOOKS_P.push(makeLook('p',LR));
const LOOKS_L=[];for(let i=0;i<8;i++)LOOKS_L.push(makeLook('leader',LR));
const LOOK_C=[makeLook('cop',LR),makeLook('raf',LR)];
const LOOK_N=[makeLook('reporter',LR),makeLook('camera',LR),makeLook('chaiwala',LR),makeLook('anchor',LR),makeLook('gcam',LR)];
function lookFor(type,look,mud){if(type===1)return LOOK_C[look]||LOOK_C[0];if(type===2)return LOOK_N[look]||LOOK_N[0];return(LOOKS_M[mud|0]||LOOKS_M[0])[clamp(look|0,0,8)];}
function drawChar(g,L,dir,fr){
 const X=24,Y=62;g.lineWidth=1.1;g.strokeStyle=OL;
 ell(g,X,Y,9.5,3.6,'rgba(0,0,0,.25)');
 const sit=fr===3,st=fr===1?1:fr===2?-1:0,side=dir===2,up=dir===1,front=dir===0;
 let hipY=Y-15,shY=Y-29,hy=Y-37;if(sit){hipY=Y-6;shY=Y-20;hy=Y-28;}
 const hx=X+(side?1:0);
 if(L.hair==='long'&&!up&&L.hat!=='turban')rr(g,X-7.5,hy-1,15,15,5,L.hairC,true);
 if(L.item==='flag'&&up)drawItem(g,L,dir,X,Y,shY,hy,st);
 if(sit){ell(g,X,Y-4,10.5,4.5,L.bottom,true);ell(g,X-6,Y-3,2.5,1.8,L.shoe);ell(g,X+6,Y-3,2.5,1.8,L.shoe);}
 else if(L.saree){g.beginPath();g.moveTo(X-7,hipY-3);g.lineTo(X+7,hipY-3);g.lineTo(X+8.5+(side?st*2:0),Y-1);g.lineTo(X-8.5+(side?st*2:0),Y-1);g.closePath();g.fillStyle=L.bottom;g.fill();g.stroke();g.strokeStyle='rgba(255,215,0,.8)';g.beginPath();g.moveTo(X-8.3,Y-3);g.lineTo(X+8.3,Y-3);g.stroke();g.strokeStyle=OL;ell(g,X-3+st*2,Y-.5,2.4,1.5,L.shoe);ell(g,X+3-st*2,Y-.5,2.4,1.5,L.shoe);}
 else if(!side){const lo=Math.max(0,st)*2,ro=Math.max(0,-st)*2;rr(g,X-6,hipY,5,14-lo,2,L.bottom,true);rr(g,X+1,hipY,5,14-ro,2,L.bottom,true);rr(g,X-6.6,Y-3.5-lo,6.2,3.4,1.5,L.shoe,true);rr(g,X+.4,Y-3.5-ro,6.2,3.4,1.5,L.shoe,true);}
 else{for(const k of[-1,1]){g.save();g.translate(X,hipY);g.rotate(st*.38*k);rr(g,-2.5,0,5,13,2,k<0?shade(L.bottom,-.18):L.bottom,true);rr(g,-2.5,11,7.5,3.4,1.5,L.shoe,true);g.restore();}}
 if(L.bag&&up)rr(g,X-7,shY+1,14,12,3,L.bagC,true);
 if(L.bag&&side)rr(g,X-11,shY+1,6,11,2,L.bagC,true);
 const tl=sit?14:(L.kurta?18:14),tw=side?12:16;
 rr(g,X-tw/2,shY,tw,tl,4,L.top,true);
 if(L.camo){for(const[a,b]of[[-4,3],[3,8],[-2,10],[4,2]])ell(g,X+a*(side?.6:1),shY+b,2.2,1.4,'rgba(15,35,70,.4)');}
 if(L.cop){g.fillStyle='#4e2f12';g.fillRect(X-tw/2,shY+10,tw,2.3);if(front){g.fillStyle='#ffd54f';g.fillRect(X+2.5,shY+3,2.4,2.4);g.fillStyle='#37474f';g.fillRect(X-5,shY+3,3.5,1.3);}}
 if(L.kurta&&front){g.beginPath();g.moveTo(X,shY+1);g.lineTo(X,shY+7);g.stroke();}
 if(L.hood&&!up){g.beginPath();g.arc(X,shY+1,6,0,Math.PI);g.stroke();}
 if(L.saree&&!up){g.fillStyle=shade(L.top,.25);g.beginPath();g.moveTo(X-8,shY+2);g.lineTo(X+8,shY+12);g.lineTo(X+8,shY+15);g.lineTo(X-8,shY+5);g.closePath();g.fill();}
 if(L.bag&&front){g.strokeStyle=L.bagC;g.lineWidth=1.6;g.beginPath();g.moveTo(X-6,shY+1);g.lineTo(X-5,shY+11);g.moveTo(X+6,shY+1);g.lineTo(X+5,shY+11);g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;}
 const sw=st*2.2,slv=L.sleeve||L.top;const holding=L.item==='placard'||L.item==='mega'||L.item==='camera';
 if(!side){for(const k of[-1,1]){const ax=X+k*(tw/2+1.5),ay=shY+1;if(holding&&k===1&&!up){rr(g,ax-2,ay-6,4,9,2,slv,true);ell(g,ax,ay-6,2.2,2.2,L.skin,true);continue;}const dy=k*sw*(up?-1:1);rr(g,ax-2,ay+Math.min(0,dy),4,11,2,slv,true);ell(g,ax,ay+11+dy*.6,2.2,2.2,L.skin,true);}}
 else{g.save();g.translate(X+1,shY+2);g.rotate(holding?-1.3:-st*.55);rr(g,-2,0,4,11,2,slv,true);ell(g,0,11.5,2.2,2.2,L.skin,true);g.restore();}
 ell(g,hx,hy,7.6,7.6,L.skin,true);
 const c=L.hairC;
 if(L.hat!=='turban'&&L.hat!=='helmet'){
  if(up){ell(g,hx,hy,7.7,7.7,c,true);if(L.hair==='bun')ell(g,hx,hy-4,3.6,3.6,c,true);}
  else if(side){g.beginPath();g.arc(hx,hy,7.8,Math.PI*.55,Math.PI*1.9);g.closePath();g.fillStyle=c;g.fill();if(L.hair==='bun')ell(g,hx-6,hy-4,3.4,3.4,c,true);if(L.hair==='long')rr(g,hx-8,hy-1,4,13,2,c);}
  else{g.beginPath();g.arc(hx,hy,7.8,Math.PI*1.03,Math.PI*1.97);g.quadraticCurveTo(hx+4,hy-3,hx,hy-4.5);g.quadraticCurveTo(hx-5,hy-3,hx-7.8,hy-.5);g.closePath();g.fillStyle=c;g.fill();
   if(L.hair==='long'){rr(g,hx-8.4,hy-2,3.2,12,1.5,c);rr(g,hx+5.2,hy-2,3.2,12,1.5,c);}
   if(L.hair==='bun')ell(g,hx,hy-8,3.4,3,c,true);
   if(L.hair==='spiky'){g.fillStyle=c;g.beginPath();g.moveTo(hx-6,hy-5);g.lineTo(hx-3,hy-11);g.lineTo(hx,hy-6);g.lineTo(hx+3,hy-11);g.lineTo(hx+6,hy-5);g.fill();}}}
 if(front&&L.hat!=='helmet'){ell(g,hx-2.8,hy+1,1.1,1.4,'#1a120c');ell(g,hx+2.8,hy+1,1.1,1.4,'#1a120c');
  if(L.beard){g.fillStyle=L.hairC;g.beginPath();g.arc(hx,hy+2,6.6,.15*Math.PI,.85*Math.PI);g.closePath();g.fill();}
  else{g.strokeStyle='rgba(90,40,30,.7)';g.beginPath();g.moveTo(hx-1.5,hy+4.4);g.quadraticCurveTo(hx,hy+5.3,hx+1.5,hy+4.4);g.stroke();g.strokeStyle=OL;}
  if(L.glasses){g.strokeStyle='#111';g.lineWidth=.9;g.beginPath();g.arc(hx-2.8,hy+1,2,0,TAU);g.moveTo(hx+4.8,hy+1);g.arc(hx+2.8,hy+1,2,0,TAU);g.moveTo(hx-.8,hy+1);g.lineTo(hx+.8,hy+1);g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;}}
 if(side&&L.hat!=='helmet'){ell(g,hx+4.4,hy+.5,1,1.3,'#1a120c');if(L.beard){g.fillStyle=L.hairC;g.beginPath();g.arc(hx+2,hy+2.5,5,0,Math.PI*.7);g.closePath();g.fill();}if(L.glasses){g.strokeStyle='#111';g.beginPath();g.arc(hx+4.4,hy+.5,2,0,TAU);g.stroke();g.strokeStyle=OL;}}
 if(L.hat==='turban'){g.fillStyle=L.turbanC;g.beginPath();g.ellipse(hx,hy-3,8.6,6.8,0,Math.PI,TAU);g.lineTo(hx+8.6,hy-1);g.quadraticCurveTo(hx,hy-4,hx-8.6,hy-1);g.closePath();g.fill();g.stroke();g.strokeStyle='rgba(0,0,0,.25)';g.beginPath();g.moveTo(hx-7,hy-5);g.quadraticCurveTo(hx,hy-1,hx+7,hy-7);g.stroke();g.strokeStyle=OL;if(up)ell(g,hx,hy-2,8.4,7.6,L.turbanC,true);}
 if(L.hat==='topi')rr(g,hx-6.5,hy-10,13,4.5,2,'#fafafa',true);
 if(L.hat==='gamchha'){g.fillStyle='#e53935';g.beginPath();g.ellipse(hx,hy-4,8.2,4,0,Math.PI,TAU);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(hx-6,hy-6,12,1);}
 if(L.hat==='capb'){g.fillStyle='#212121';g.beginPath();g.ellipse(hx,hy-4,8,4.5,0,Math.PI,TAU);g.fill();if(front)rr(g,hx-6,hy-4.5,12,2.5,1,'#111');if(side)rr(g,hx+3,hy-5,7,2.5,1,'#111');}
 if(L.hat==='cap'){g.fillStyle='#b0884e';g.beginPath();g.ellipse(hx,hy-5,8.3,4.6,0,Math.PI,TAU);g.lineTo(hx+8.3,hy-4);g.lineTo(hx-8.3,hy-4);g.closePath();g.fill();g.stroke();g.fillStyle='#c62828';g.fillRect(hx-8,hy-5.6,16,1.6);if(front)rr(g,hx-6.5,hy-4.2,13,2.6,1.2,'#3e2a14');if(side)rr(g,hx+3,hy-5,8,2.6,1.2,'#3e2a14');if(front)ell(g,hx,hy-7,1.3,1.3,'#ffd54f');}
 if(L.hat==='helmet'){ell(g,hx,hy-1,9,8.8,'#24456f',true);if(front)rr(g,hx-7,hy-1,14,7,3,'rgba(200,230,255,.55)',true);if(side)rr(g,hx+2,hy-1,6,7,3,'rgba(200,230,255,.55)',true);ell(g,hx-3,hy-5,3,1.6,'rgba(255,255,255,.3)');}
 if(L.dupatta&&!up){g.strokeStyle=shade(L.top,.3);g.lineWidth=2.4;g.beginPath();g.arc(hx,hy,8.2,Math.PI*1.05,Math.PI*1.95);g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;}
 if(L.hat==='grad'){ell(g,hx,hy-6,8,3,'#212121');rr(g,hx-11,hy-11,22,4,1,'#111');g.strokeStyle='#fdd835';g.lineWidth=1;g.beginPath();g.moveTo(hx+8,hy-9);g.lineTo(hx+10,hy-3);g.stroke();g.strokeStyle=OL;g.lineWidth=1.1;}
 if(L.hat==='bikehelm'){ell(g,hx,hy-1,9,8.6,L.helmC,true);if(front)rr(g,hx-6.5,hy-2,13,6,3,'rgba(40,40,40,.75)',true);if(side)rr(g,hx+2,hy-2,6,6,3,'rgba(40,40,40,.75)',true);ell(g,hx-3,hy-5,3,1.5,'rgba(255,255,255,.35)');}
 if(L.hat==='mask'&&!up){if(front)rr(g,hx-5.5,hy+1.5,11,5.5,2.5,'#e3f2fd',true);if(side)rr(g,hx+1,hy+1.5,6.5,5.5,2.5,'#e3f2fd',true);}
 if(L.tie&&front&&!sit){g.fillStyle=L.tie;g.beginPath();g.moveTo(X-1.5,shY+1);g.lineTo(X+1.5,shY+1);g.lineTo(X+2,shY+10);g.lineTo(X,shY+12);g.lineTo(X-2,shY+10);g.closePath();g.fill();}
 if(!(L.item==='flag'&&up))drawItem(g,L,dir,X,Y,shY,hy,st);
}
function drawItem(g,L,dir,X,Y,shY,hy,st){
 const side=dir===2,up=dir===1,b=st*.6;
 if(L.item==='placard'){const px=side?X+5:X+9.5,top=hy-23+b;g.strokeStyle='#6d4c2f';g.lineWidth=1.8;g.beginPath();g.moveTo(px,top+12);g.lineTo(px,shY+(up?6:-4));g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;
  if(side)rr(g,px-1.5,top,3,13,1,'#d7c4a3',true);else{rr(g,px-15,top,30,13,1.5,up?'#c8b28a':'#fffdf5',true);if(!up){const[a,c]=L.text.split('|');g.fillStyle='#c62828';g.font='900 5.2px "Arial Black",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(a,px,top+4);g.fillStyle='#1a237e';g.fillText(c||'',px,top+9.5);}}}
 if(L.item==='flag'){const px=side?X+4:X+9,top=hy-26;g.strokeStyle='#5d4037';g.lineWidth=1.5;g.beginPath();g.moveTo(px,top);g.lineTo(px,shY+12);g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;const w=b*1.5;
  const cols=['#ff9933','#ffffff','#138808'];for(let i=0;i<3;i++){g.fillStyle=cols[i];g.beginPath();g.moveTo(px,top+i*3);g.lineTo(px+14,top+i*3+w);g.lineTo(px+14,top+i*3+3+w);g.lineTo(px,top+i*3+3);g.closePath();g.fill();}ell(g,px+7,top+4.5+w*.5,1.1,1.1,'#1a237e');}
 if(L.item==='mega'&&!up){if(side){g.fillStyle='#eceff1';g.beginPath();g.moveTo(X+6,hy+1);g.lineTo(X+16,hy-3);g.lineTo(X+16,hy+6);g.closePath();g.fill();g.stroke();}else{ell(g,X+10,hy+2,4.5,4.5,'#eceff1',true);ell(g,X+10,hy+2,2.6,2.6,'#90a4ae');}}
 if(L.item==='lathi'){g.strokeStyle='#6d3f1a';g.lineWidth=2.4;g.beginPath();if(side){g.moveTo(X+2,shY+12);g.lineTo(X+15,shY-8);}else{g.moveTo(X+10,shY+12);g.lineTo(X+17,shY-9);}g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;}
 if(L.item==='shield'&&!up){g.strokeStyle='rgba(255,255,255,.9)';if(side)rr(g,X+6,shY-5,4,27,1.5,'rgba(190,225,255,.6)',true);else{rr(g,X-11,shY-4,22,26,3,'rgba(190,225,255,.48)',true);g.fillStyle='rgba(20,40,90,.8)';g.font='bold 3.6px sans-serif';g.textAlign='center';g.fillText('POLICE',X,shY+4);}g.strokeStyle=OL;}
 if((L.item==='mic'||L.item==='gmic')&&!up){const G=L.item==='gmic';ell(g,side?X+8:X+9.5,hy+2,G?2.8:2,G?2.8:2,G?'#ffd600':'#111');g.fillStyle=G?'#ff6f00':'#d32f2f';g.fillRect(side?X+6.5:X+8,hy+3.5,G?4.5:3,G?3.2:2.5);}
 if(L.item==='camera'&&!up){rr(g,side?X-2:X+2,hy-6,side?16:12,9,2,'#263238',true);ell(g,side?X+14:X+8,hy-1.5,2.6,2.6,'#90caf9',true);g.fillStyle='#d32f2f';g.fillRect(side?X:X+3,hy-5,2,2);}
 if(L.item==='books'&&!up){const bx=side?X+3:X-12;rr(g,bx,shY+8,8,3,1,'#c62828',true);rr(g,bx,shY+5,8,3,1,'#1565c0',true);rr(g,bx+1,shY+2,7,3,1,'#2e7d32',true);}
 if(L.item==='file'&&!up){const fx0=side?X+4:X+7;rr(g,fx0,shY+4,9,11,1,'#fff59d',true);g.fillStyle='#795548';g.font='bold 2.6px sans-serif';g.textAlign='left';g.fillText('DEGREE',fx0+.6,shY+9);}
 if(L.item==='stick'){g.strokeStyle='#6d4c41';g.lineWidth=1.8;g.beginPath();g.moveTo(side?X+7:X+11,shY+12);g.lineTo(side?X+9:X+12,Y-1);g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;}
 if(L.item==='jerrycan'&&!up){const jx=side?X-12:X-15;rr(g,jx,shY+9,8,9,1.5,'#2e7d32',true);rr(g,jx+2,shY+7,3,2.5,.8,'#1b5e20',true);}
 if(L.item==='tomato'&&!up){const tx=side?X+8:X+11;ell(g,tx,shY+14,6,3,'#a1887f',true);for(let i=-1;i<=1;i++)ell(g,tx+i*3,shY+11.5,2.2,2.2,'#e53935',true);}
 if(L.item==='cylinder'&&!up){const cx=side?X-12:X-15;rr(g,cx,shY+5,8,14,3,'#d32f2f',true);rr(g,cx+2,shY+3,4,3,1,'#9e9e9e',true);}
 if(L.item==='umbrella'){g.strokeStyle='#424242';g.lineWidth=1.2;g.beginPath();g.moveTo(X+9,shY+10);g.lineTo(X+9,hy-16);g.stroke();g.fillStyle='#263238';g.beginPath();g.arc(X+9,hy-14,11,Math.PI,TAU);g.closePath();g.fill();g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;}
 if(L.item==='kettle'&&!up){ell(g,X-11,shY+13,4,3.5,'#bdbdbd',true);g.beginPath();g.moveTo(X-14,shY+12);g.lineTo(X-17,shY+9);g.stroke();}
}
function charSprite(L,dir,fr){return sprite('c'+L.key+dir+fr,CW,CHH,g=>drawChar(g,L,dir,fr));}
function wheel(g,x,y,r){ell(g,x,y,r,r,'#1b1b1b',true);ell(g,x,y,r*.45,r*.45,'#9e9e9e');}
const VSPR={
  auto_side:()=>sprite('auto_s',60,44,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;
    // Ground shadow
    ell(g,32,41,25,4.5,'rgba(25,18,10,.3)');
    wheel(g,14,36,5);wheel(g,47,36,5);
    // CNG Green body with metallic gradient
    const gr=g.createLinearGradient(6,22,6,34);
    gr.addColorStop(0,'#388e3c');gr.addColorStop(1,'#1b5e20');
    g.fillStyle=gr;g.beginPath();g.moveTo(6,34);g.lineTo(6,22);g.lineTo(44,22);g.quadraticCurveTo(54,22,55,34);g.closePath();g.fill();g.stroke();
    // Yellow midband
    rr(g,6,19,40,4.5,1,'#fbc02d',true);
    // Black canvas hood with ribbed fold highlights
    g.fillStyle='#1c1b1a';g.beginPath();g.moveTo(5,21);g.lineTo(7,6);g.quadraticCurveTo(26,1,44,6);g.lineTo(48,21);g.closePath();g.fill();g.stroke();
    g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;
    for(const fx of[14,24,34]){g.beginPath();g.moveTo(fx,4);g.lineTo(fx+1,20);g.stroke();}
    // Windshield with sky reflection slant
    rr(g,30,8,13,11,2,'#90caf9');
    g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=1.2;g.beginPath();g.moveTo(32,17);g.lineTo(39,9);g.stroke();
    // Driver silhouette
    ell(g,38,12,3.4,3.4,'#c98a55');ell(g,38,10,3.4,2,'#1c1814');
    // Headlight with warm glow
    ell(g,55,28,2.2,2.2,'#fff9c4',true);ell(g,55,28,1.2,1.2,'#fff');
    g.fillStyle='#fff';g.font='900 3.8px sans-serif';g.fillText('DL 1R',16,31);
  }),
  auto_front:()=>sprite('auto_f',36,44,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;
    ell(g,18,41,14,4.5,'rgba(25,18,10,.3)');
    wheel(g,18,37,4.2);
    // Green lower body
    rr(g,5,22,26,13,4,'#2e7d32',true);
    rr(g,5,19,26,5,1,'#fbc02d',true);
    // Black hood
    rr(g,4,4,28,17,6,'#1c1b1a',true);
    // Windscreen with sky reflection
    rr(g,8,8,20,11,3,'#90caf9',true);
    g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=1.2;g.beginPath();g.moveTo(11,17);g.lineTo(22,9);g.stroke();
    // Driver silhouette
    ell(g,18,13,3.5,3.5,'#c98a55');ell(g,18,11,3.5,2,'#1c1814');
    // Front chrome bumper & center round headlight
    rr(g,8,34,20,2.5,1,'#cfd8dc',true);
    ell(g,18,28,2.6,2.6,'#fff9c4',true);ell(g,18,28,1.4,1.4,'#fff');
  }),
  bike_side:(b)=>sprite('bike_s'+b,50,54,g=>{
    const box=b?'#fc8019':'#d32f2f',sh=b?'#fb8c00':'#e53935',hm=b?'#ef6c00':'#c62828';
    g.lineWidth=1.2;g.strokeStyle=OL;
    ell(g,25,50,20,3.5,'rgba(0,0,0,.25)');
    wheel(g,10,45,5.5);wheel(g,40,45,5.5);
    g.fillStyle='#455a64';g.beginPath();g.moveTo(8,42);g.lineTo(14,34);g.lineTo(34,34);g.lineTo(42,42);g.closePath();g.fill();g.stroke();
    g.strokeStyle='#263238';g.lineWidth=2;g.beginPath();g.moveTo(36,34);g.lineTo(40,22);g.stroke();g.lineWidth=1.2;g.strokeStyle=OL;
    rr(g,2,14,15,15,2,box,true);
    g.fillStyle='#fff';g.font='900 4px sans-serif';g.textAlign='center';g.fillText(b?'swiggi':'zomaato',9.5,23);
    rr(g,20,32,7,9,2,'#263238',true);rr(g,19,17,11,16,4,sh,true);
    g.save();g.translate(28,22);g.rotate(-.9);rr(g,-1.8,0,3.6,10,1.6,sh,true);g.restore();
    ell(g,25,12,6.4,6.4,hm,true);rr(g,27,10,5,4,1.5,'#263238');
  }),
  bike_front:(b)=>sprite('bike_f'+b,30,54,g=>{
    const box=b?'#fc8019':'#d32f2f',sh=b?'#fb8c00':'#e53935',hm=b?'#ef6c00':'#c62828';
    g.lineWidth=1.2;g.strokeStyle=OL;
    ell(g,15,50,10,3.5,'rgba(0,0,0,.25)');
    wheel(g,15,46,4.5);
    rr(g,11,30,8,12,3,'#455a64',true);rr(g,3,12,24,15,2,box,true);rr(g,8,20,14,14,4,sh,true);
    ell(g,15,13,6.4,6.4,hm,true);rr(g,11,11,8,5,2,'#263238');rr(g,4,24,22,2,1,'#263238');
  }),
  car_side:(c)=>sprite('car_s'+c,64,38,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;
    ell(g,32,35,28,4,'rgba(0,0,0,.28)');
    wheel(g,15,30,5.5);wheel(g,49,30,5.5);
    rr(g,3,16,58,14,5,c,true);
    g.fillStyle=c;g.beginPath();g.moveTo(14,17);g.lineTo(20,5);g.lineTo(44,5);g.lineTo(52,17);g.closePath();g.fill();g.stroke();
    // Tinted windows with sunlight reflection
    g.fillStyle='#90caf9';
    g.beginPath();g.moveTo(18,16);g.lineTo(22,8);g.lineTo(31,8);g.lineTo(31,16);g.closePath();g.fill();
    g.beginPath();g.moveTo(34,16);g.lineTo(34,8);g.lineTo(42,8);g.lineTo(48,16);g.closePath();g.fill();
    g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=1;
    g.beginPath();g.moveTo(22,15);g.lineTo(29,8.5);g.moveTo(37,15);g.lineTo(45,8.5);g.stroke();
    ell(g,60,21,1.8,1.8,'#fff9c4');
  }),
  car_front:(c)=>sprite('car_f'+c,40,38,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;
    ell(g,20,35,17,4,'rgba(0,0,0,.28)');
    rr(g,4,15,32,15,5,c,true);
    rr(g,9,5,22,12,3,c,true);
    rr(g,11,7,18,8,2,'#90caf9');
    g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=1;
    g.beginPath();g.moveTo(13,14);g.lineTo(25,8);g.stroke();
    ell(g,9,22,2.6,2,'#fff9c4',true);ell(g,31,22,2.6,2,'#fff9c4',true);
    rr(g,6,30,6,4,1,'#1b1b1b');rr(g,28,30,6,4,1,'#1b1b1b');
  }),
  bus_side:(full)=>sprite('bus_s'+full,136,64,g=>{
    const R=mulberry32(3);g.lineWidth=1.3;g.strokeStyle=OL;
    // Ground shadow
    ell(g,68,60,65,5.5,'rgba(25,18,10,.32)');
    // Authentic DTC low-floor bus body (dual tone cream & navy blue)
    rr(g,4,8,128,46,6,'#f5f5f0',true);
    // Roof air conditioner unit
    rr(g,42,4,48,6,2,'#cfd8dc',true);
    // Police blue lower skirt band & upper accent line
    const grB=g.createLinearGradient(0,40,0,48);
    grB.addColorStop(0,'#15438c');grB.addColorStop(1,'#0d2b5c');
    g.fillStyle=grB;g.fillRect(5,40,126,7);
    g.fillStyle='#1f4e9c';g.fillRect(5,10,126,3.5);
    // Tinted glass passenger windows with specular glints
    for(let i=0;i<7;i++){
      const wx=10+i*16;
      rr(g,wx,16,13,15,2,'#81b2d6',true);
      g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=1;
      g.beginPath();g.moveTo(wx+2,30);g.lineTo(wx+10,18);g.stroke();
      if(full){
        ell(g,wx+6.5,25,3.6,3.6,SKINS[(R()*5)|0]);
        ell(g,wx+6.5,23,3.6,2,'#1c1814');
      }
    }
    // Rear engine louvres
    g.fillStyle='#37474f';for(let y=42;y<=45;y+=1.5)g.fillRect(124,y,6,0.8);
    // Front door & windscreen
    rr(g,120,15,9,24,2,'#263238',true);
    wheel(g,26,54,7.5);wheel(g,108,54,7.5);
    g.fillStyle='#ffffff';g.font='900 6.8px sans-serif';g.textAlign='center';
    g.fillText('DELHI POLICE · SPECIAL',62,38);
  }),
  bus_front:(full)=>sprite('bus_f'+full,56,70,g=>{
    g.lineWidth=1.3;g.strokeStyle=OL;
    ell(g,28,66,24,5,'rgba(25,18,10,.32)');
    rr(g,4,8,48,54,6,'#f5f5f0',true);
    // Destination LED matrix board
    rr(g,12,10,32,7,1,'#111',true);
    g.fillStyle='#ff9800';g.font='900 4.5px monospace';g.textAlign='center';g.fillText('JANTAR MANTAR',28,15.5);
    // Windscreen with sky reflection
    rr(g,8,18,40,18,3,'#81b2d6',true);
    g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=1.2;
    g.beginPath();g.moveTo(12,34);g.lineTo(34,20);g.stroke();
    // Steering wheel & passenger
    g.strokeStyle='#212121';g.lineWidth=1.5;g.beginPath();g.arc(16,33,3.5,0,Math.PI);g.stroke();
    if(full)for(let i=0;i<3;i++)ell(g,16+i*12,27,3.6,3.6,SKINS[i]);
    // Blue band & bumper
    g.fillStyle='#1f4e9c';g.fillRect(5,46,46,6);
    rr(g,4,58,48,4,1,'#37474f',true);
    // Headlamps with halogen glow
    ell(g,11,41,3.2,3.2,'#fff9c4',true);ell(g,11,41,1.6,1.6,'#fff');
    ell(g,45,41,3.2,3.2,'#fff9c4',true);ell(g,45,41,1.6,1.6,'#fff');
    g.fillStyle='#ffffff';g.font='900 5.2px sans-serif';g.textAlign='center';g.fillText('POLICE',28,52);
  }),
  vajra:()=>sprite('vajra',116,74,g=>{
    g.lineWidth=1.3;g.strokeStyle=OL;
    ell(g,58,70,54,5,'rgba(0,0,0,.25)');
    rr(g,4,22,84,40,4,'#eceff1',true);
    rr(g,86,30,26,32,5,'#eceff1',true);
    rr(g,96,34,13,13,2,'#2b3a4a',true);
    g.fillStyle='#1f4e9c';g.fillRect(5,48,107,6);
    g.font='900 9px sans-serif';g.fillText('VAJRA',20,42);
    rr(g,30,8,30,16,3,'#90a4ae',true);
    g.fillStyle='#37474f';for(let i=0;i<4;i++)g.fillRect(36+i*6,2,4,9);
    wheel(g,24,62,8);wheel(g,92,62,8);
  }),
  cow:(sit)=>sprite('cow'+sit,50,38,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,25,34,20,4,'rgba(0,0,0,.22)');
    if(!sit){for(const x of[13,18,32,37])rr(g,x-1.6,22,3.2,11,1,'#e8e0d0',true);}
    ell(g,24,sit?26:19,15,8.5,'#f2ece0',true);ell(g,18,sit?22:15,5,3,'#e0d4bd');ell(g,26,sit?18:11,5,3,'#ece2cf',true);
    g.fillStyle='#ccc';g.beginPath();g.ellipse(41,sit?22:15,6,5,.3,0,TAU);g.fill();g.stroke();
    ell(g,45,sit?24:17,3,2.4,'#d7a49b');
    g.strokeStyle='#8d6e63';g.lineWidth=1.6;g.beginPath();g.moveTo(39,sit?18:11);g.lineTo(37,sit?13:6);g.moveTo(43,sit?18:11);g.lineTo(45,sit?13:6);g.stroke();
    ell(g,42,sit?20:13,1,1,'#111');
  }),
  dog:(sit)=>sprite('dog'+sit,34,26,g=>{
    g.lineWidth=1.1;g.strokeStyle=OL;ell(g,17,23,13,3,'rgba(0,0,0,.22)');
    if(!sit)for(const x of[8,12,22,26])rr(g,x-1.2,15,2.4,8,1,'#a1733f',true);
    ell(g,16,sit?19:13,10,5,'#b98446',true);ell(g,27,sit?14:9,4.6,4.2,'#b98446',true);
    g.fillStyle='#8d5e2e';g.beginPath();g.moveTo(25,sit?11:6);g.lineTo(26,sit?6:1);g.lineTo(28,sit?10:5);g.fill();
    ell(g,31,sit?15:10,1.6,1.3,'#111');ell(g,28,sit?13:8,.8,.8,'#111');
    g.strokeStyle='#b98446';g.lineWidth=2;g.beginPath();g.moveTo(6,sit?18:12);g.quadraticCurveTo(2,sit?13:7,4,sit?11:5);g.stroke();
  }),
  chai:()=>sprite('chaicart',64,62,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,32,58,28,4,'rgba(0,0,0,.25)');
    wheel(g,14,52,6);wheel(g,50,52,6);rr(g,4,34,56,16,2,'#8d6e63',true);
    g.fillStyle='#6d4c41';for(let x=8;x<58;x+=8)g.fillRect(x,36,1.5,12);
    rr(g,2,30,60,5,1,'#a1887f',true);rr(g,6,4,52,6,2,'#ffb300',true);
    g.strokeStyle='#5d4037';g.lineWidth=2;g.beginPath();g.moveTo(8,10);g.lineTo(8,30);g.moveTo(56,10);g.lineTo(56,30);g.stroke();g.lineWidth=1.2;g.strokeStyle=OL;
    ell(g,20,26,7,5,'#bdbdbd',true);rr(g,14,18,12,6,2,'#9e9e9e',true);
    for(let i=0;i<5;i++){rr(g,32+i*5,23,3.5,7,1,'rgba(255,255,255,.7)',true);ell(g,33.7+i*5,24.5,1.4,.8,'#a1662f');}
    g.fillStyle='#b71c1c';g.font='900 6px sans-serif';g.textAlign='center';g.fillText('CHAI ₹10',32,9.2);
  }),
  sign:(t,c1,l1,l2)=>sprite('sign'+t,64,62,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,32,58,24,4,'rgba(0,0,0,.2)');
    g.strokeStyle='#5d4037';g.lineWidth=2.5;g.beginPath();g.moveTo(12,28);g.lineTo(12,58);g.moveTo(52,28);g.lineTo(52,58);g.stroke();g.lineWidth=1.2;g.strokeStyle=OL;
    rr(g,2,4,60,26,2,c1,true);g.fillStyle='#fff';g.font='900 6.2px sans-serif';g.textAlign='center';g.fillText(l1,32,14);g.fillStyle='#ffeb3b';g.font='bold 4.6px sans-serif';g.fillText(l2,32,23);
  }),
  busstop:()=>sprite('busstop',84,58,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,42,54,36,4,'rgba(0,0,0,.2)');
    g.strokeStyle='#546e7a';g.lineWidth=2.5;g.beginPath();g.moveTo(8,14);g.lineTo(8,52);g.moveTo(76,14);g.lineTo(76,52);g.stroke();g.lineWidth=1.2;g.strokeStyle=OL;
    rr(g,12,40,60,5,1,'#78909c',true);rr(g,2,6,80,10,2,'#2e7d32',true);g.fillStyle='#fff';g.font='900 6px sans-serif';g.textAlign='center';g.fillText('DTC BUS STOP',42,13.5);
    rr(g,20,20,44,16,2,'rgba(255,255,255,.5)',true);g.fillStyle='#c62828';g.font='bold 4.5px sans-serif';g.fillText('BUS KAB AAYEGI?',42,27);g.fillStyle='#333';g.fillText('Pata nahi.',42,33);
  }),
  dhaba:()=>sprite('dhaba',70,52,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,35,48,30,4,'rgba(0,0,0,.2)');
    for(const x of[6,40]){g.strokeStyle='#5d4037';g.lineWidth=2;g.beginPath();g.moveTo(x+2,40);g.lineTo(x+2,48);g.moveTo(x+24,40);g.lineTo(x+24,48);g.stroke();g.lineWidth=1.2;g.strokeStyle=OL;rr(g,x,32,28,10,1,'#d7b98a',true);}
    rr(g,8,4,54,12,2,'#e65100',true);g.fillStyle='#fff';g.font='900 7px sans-serif';g.textAlign='center';g.fillText('SHIV DHABA',35,13);ell(g,48,26,6,4,'#9e9e9e',true);
  }),
  block:()=>sprite('block',28,30,g=>{
    g.lineWidth=1.1;g.strokeStyle=OL;ell(g,14,27,13,3,'rgba(0,0,0,.22)');
    rr(g,1,12,26,14,1.5,'#a9a9a1',true);rr(g,1,5,26,9,1.5,'#cfcfc7',true);
    g.strokeStyle='rgba(60,60,60,.7)';g.lineWidth=.9;for(let i=0;i<4;i++){g.beginPath();g.arc(4+i*7,4,3.6,0,TAU);g.stroke();}
  }),
  // --- REALISTIC STEEL POLICE BARRICADES ---
  bar_front:()=>sprite('barf',30,26,g=>{
    g.lineWidth=1.1;g.strokeStyle=OL;
    // Ground cast shadow
    ell(g,15,24,15,3.2,'rgba(25,18,10,.3)');
    // Heavy tubular steel A-frame legs
    g.strokeStyle='#37474f';g.lineWidth=2.2;
    g.beginPath();
    g.moveTo(5,5);g.lineTo(4,23);
    g.moveTo(25,5);g.lineTo(26,23);
    g.moveTo(1,23);g.lineTo(8,23);
    g.moveTo(22,23);g.lineTo(29,23);
    g.stroke();
    // Caster feet
    g.fillStyle='#212121';
    g.fillRect(2,22,3,2.5);g.fillRect(25,22,3,2.5);
    // Tubular top pipe with metallic sheen
    const grPipe=g.createLinearGradient(3,4,3,7);
    grPipe.addColorStop(0,'#f9a825');grPipe.addColorStop(0.5,'#fff59d');grPipe.addColorStop(1,'#c17900');
    g.fillStyle=grPipe;g.fillRect(3,4.5,24,2.5);
    // Heavy steel warning board with diagonal hazard chevrons
    g.save();
    rrect(g,3,7,24,12,1);g.clip();
    g.fillStyle='#fdd835';g.fillRect(3,7,24,12);
    g.fillStyle='#b71c1c';
    for(let x=-10;x<32;x+=7){
      g.beginPath();g.moveTo(x,19);g.lineTo(x+4,19);g.lineTo(x+11,7);g.lineTo(x+7,7);g.closePath();g.fill();
    }
    g.restore();
    g.strokeStyle='rgba(30,20,10,.65)';g.lineWidth=1.2;
    rrect(g,3,7,24,12,1);g.stroke();
    // Center stencil label
    rr(g,6,10,18,6,1,'rgba(255,255,255,.9)',true);
    g.fillStyle='#1a237e';g.font='900 3.8px sans-serif';g.textAlign='center';g.fillText('DELHI POLICE',15,14.5);
  }),
  bar_side:()=>sprite('bars',12,26,g=>{
    g.lineWidth=1.1;g.strokeStyle=OL;
    ell(g,6,24,6,3,'rgba(25,18,10,.3)');
    // Slanted tubular A-frame profile
    g.strokeStyle='#37474f';g.lineWidth=2;
    g.beginPath();g.moveTo(6,5);g.lineTo(2,23);g.moveTo(6,5);g.lineTo(10,23);g.moveTo(1,23);g.lineTo(11,23);g.stroke();
    // Warning plate side thickness
    rr(g,4,7,4,12,1,'#fdd835',true);
    g.fillStyle='#b71c1c';g.fillRect(4,10,4,3);g.fillRect(4,15,4,3);
    g.fillStyle='#212121';g.fillRect(1,22,2.5,2.5);g.fillRect(8.5,22,2.5,2.5);
  }),
  fallen:()=>sprite('fallen',30,18,g=>{
    g.save();g.translate(15,10);g.rotate(.28);g.scale(1,.55);g.translate(-15,-13);
    g.drawImage(VSPR.bar_front(),0,0,30,26);g.restore();
  }),
  tent:(c)=>sprite('tent'+c,110,74,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;
    ell(g,55,70,50,5,'rgba(0,0,0,.18)');
    g.strokeStyle='#8d6e63';g.lineWidth=2.4;
    for(const x of[10,100,30,80]){g.beginPath();g.moveTo(x,24);g.lineTo(x,70);g.stroke();}
    g.lineWidth=1.2;g.strokeStyle=OL;g.save();
    g.beginPath();g.moveTo(4,26);g.lineTo(55,4);g.lineTo(106,26);g.lineTo(106,32);g.lineTo(4,32);g.closePath();g.clip();
    for(let i=0;i<12;i++){g.fillStyle=i%2?c:'#fafafa';g.fillRect(i*10-4,0,10,40);}
    g.restore();
    g.beginPath();g.moveTo(4,26);g.lineTo(55,4);g.lineTo(106,26);g.lineTo(106,32);g.lineTo(4,32);g.closePath();g.stroke();
  }),
  // --- REALISTIC DELHI STREET TREE ---
  tree:(v)=>sprite('tree'+v,64,76,g=>{
    g.lineWidth=1.2;
    // Ground shadow with soft edge
    ell(g,34,70,22,6.5,'rgba(22,16,10,.32)');
    // Gnarled organic bark trunk with root flares
    const grTrunk=g.createLinearGradient(26,44,36,70);
    grTrunk.addColorStop(0,'#4e342e');grTrunk.addColorStop(0.5,'#6d4c41');grTrunk.addColorStop(1,'#3e2723');
    g.fillStyle=grTrunk;
    g.beginPath();g.moveTo(27,44);g.lineTo(35,44);g.lineTo(37,68);g.lineTo(41,71);g.lineTo(23,71);g.lineTo(27,68);g.closePath();g.fill();
    g.strokeStyle='#2e1c14';g.lineWidth=1.2;g.stroke();
    // Trunk bark vertical grain lines
    g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=.8;
    g.beginPath();g.moveTo(30,46);g.lineTo(29,68);g.moveTo(33,46);g.lineTo(34,67);g.stroke();
    // Multi-tiered foliage clusters (deep shadow, midtone foliage, sunlit golden highlights)
    const cs=[
      ['#1e3810','#3d6824','#76a832','#9ccc65'],
      ['#243d14','#467329','#84b83b','#add96b'],
      ['#1b3a20','#356b3a','#66a654','#8ecb7c']
    ][v];
    const blobs=[[32,32,20],[20,38,13],[44,38,13],[26,22,13],[39,22,13],[32,14,11],[23,30,10],[41,30,10]];
    // 1. Deep shadow understory
    for(const[x,y,r]of blobs)ell(g,x,y+2,r,r,cs[0]);
    // 2. Midtone foliage
    for(const[x,y,r]of blobs)ell(g,x-1.5,y,r*.85,r*.85,cs[1]);
    // 3. Sun-facing highlight (West/South-West afternoon sun)
    for(const[x,y,r]of blobs)ell(g,x-3.5,y-2.5,r*.52,r*.52,cs[2]);
    // 4. Fine sunlit leaf tips
    for(const[x,y,r]of blobs)ell(g,x-4.5,y-3.5,r*.25,r*.25,cs[3]);
  }),
  billboard:(t)=>sprite('bb'+t,96,74,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,48,70,30,4,'rgba(0,0,0,.2)');
    g.strokeStyle='#546e7a';g.lineWidth=3;g.beginPath();g.moveTo(30,36);g.lineTo(30,70);g.moveTo(66,36);g.lineTo(66,70);g.stroke();g.lineWidth=1.2;g.strokeStyle=OL;
    rr(g,2,4,92,34,2,'#fffde7',true);g.fillStyle='#c62828';g.fillRect(2,4,92,6);
    g.fillStyle='#1a237e';g.font='900 7.4px "Arial Black",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';
    const words=t.split(' ');let l1='',l2='';
    for(const w of words){if((l1+' '+w).length<=18&&!l2)l1=(l1?l1+' ':'')+w;else l2=(l2?l2+' ':'')+w;}
    g.fillText(l1,48,19);g.fillText(l2,48,29);
  }),
  station:()=>sprite('pstation',90,64,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,45,60,42,4,'rgba(0,0,0,.2)');
    rr(g,4,18,82,42,3,'#e3e8ef',true);rr(g,4,10,82,12,2,'#1f4e9c',true);
    g.fillStyle='#fff';g.font='900 7px sans-serif';g.textAlign='center';g.fillText('POLICE STATION',45,18.5);
    rr(g,38,36,14,24,1,'#5d4037',true);for(const x of[12,62])rr(g,x,30,16,12,1,'#8fb3cc',true);ell(g,45,8,4,4,'#d32f2f');
  }),
  banner:(t)=>sprite('ban'+t,120,70,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,60,66,50,4,'rgba(0,0,0,.18)');
    g.strokeStyle='#5d4037';g.lineWidth=2.6;g.beginPath();g.moveTo(8,10);g.lineTo(8,66);g.moveTo(112,10);g.lineTo(112,66);g.stroke();g.lineWidth=1.2;g.strokeStyle=OL;
    g.fillStyle='#fff8e1';g.beginPath();g.moveTo(8,12);g.quadraticCurveTo(60,18,112,12);g.lineTo(112,38);g.quadraticCurveTo(60,44,8,38);g.closePath();g.fill();g.stroke();
    g.fillStyle='#c62828';g.font='900 8px "Arial Black",Arial,sans-serif';g.textAlign='center';g.fillText(t.toUpperCase(),60,25);
    g.fillStyle='#2e7d32';g.font='bold 6px sans-serif';g.fillText('CHALO JANTAR MANTAR ✊',60,35);
  }),
  varun:()=>sprite('varun',118,70,g=>{
    g.lineWidth=1.3;g.strokeStyle=OL;ell(g,58,66,54,5,'rgba(0,0,0,.25)');
    rr(g,4,22,82,36,5,'#eceff1',true);rr(g,86,30,26,32,5,'#eceff1',true);rr(g,96,34,13,13,2,'#2b3a4a',true);
    g.fillStyle='#1565c0';g.fillRect(5,44,107,6);g.font='900 9px sans-serif';g.fillText('VARUN',16,40);
    ell(g,44,20,12,6,'#90a4ae',true);
    g.strokeStyle='#546e7a';g.lineWidth=4;g.beginPath();g.moveTo(48,18);g.lineTo(70,6);g.stroke();
    g.lineWidth=1.3;g.strokeStyle=OL;wheel(g,24,60,8);wheel(g,92,60,8);ell(g,30,10,3,3,'#ff1744');
  }),
  varun_f:()=>sprite('varunf',56,70,g=>{
    g.lineWidth=1.3;g.strokeStyle=OL;ell(g,28,66,24,5,'rgba(0,0,0,.25)');
    rr(g,4,14,48,48,6,'#eceff1',true);rr(g,9,20,38,16,3,'#2b3a4a',true);
    g.fillStyle='#1565c0';g.fillRect(5,44,46,5);ell(g,28,10,9,5,'#90a4ae',true);
    ell(g,12,40,3,3,'#fff59d',true);ell(g,44,40,3,3,'#fff59d',true);
  }),
  dustbin:()=>sprite('dustbin',48,44,g=>{
    g.lineWidth=1.1;g.strokeStyle=OL;ell(g,24,40,22,4,'rgba(0,0,0,.18)');
    const R=mulberry32(5);
    for(let i=0;i<16;i++){const x=6+R()*36,y=30+R()*12;g.fillStyle=['#eceff1','#ffca28','#e53935','#4fc3f7','#a1887f','#fff'][(R()*6)|0];g.fillRect(x,y,3+R()*4,2+R()*3);}
    rr(g,16,14,14,22,2,'#2e7d32',true);rr(g,14,11,18,5,2,'#1b5e20',true);
    g.fillStyle='#fff';g.font='900 3.6px sans-serif';g.textAlign='center';g.fillText('USE ME',23,26);
    rr(g,30,2,18,10,1,'#fff59d',true);g.fillStyle='#b71c1c';g.font='900 3.2px sans-serif';g.fillText('SWACHH',39,6.5);g.fillText('BHARAT',39,10.5);
  }),
  spitwall:()=>sprite('spitwall',80,46,g=>{
    g.lineWidth=1.1;g.strokeStyle=OL;rr(g,2,8,76,32,1,'#e8d9c0',true);
    g.fillStyle='#c62828';g.font='900 6.4px sans-serif';g.textAlign='center';g.fillText('YAHAN THOOKNA',40,19);g.fillText('MANA HAI',40,27);
    const R=mulberry32(9);for(let i=0;i<7;i++){ell(g,8+R()*64,22+R()*16,2+R()*4,1.5+R()*3,'rgba(150,25,20,.65)');}
  }),
  pole:()=>sprite('pole',90,100,g=>{
    g.lineWidth=1.1;g.strokeStyle=OL;ell(g,10,96,6,2,'rgba(0,0,0,.2)');
    rr(g,8,6,4,90,1,'#757575',true);rr(g,2,10,16,3,1,'#616161',true);
    g.strokeStyle='#1b1b1b';g.lineWidth=.9;const R=mulberry32(13);
    for(let i=0;i<9;i++){g.beginPath();g.moveTo(3+R()*14,11);g.bezierCurveTo(30,20+R()*40,60,R()*50,90,8+R()*30);g.stroke();}
    for(let i=0;i<5;i++){g.beginPath();g.ellipse(10+R()*8,20+R()*30,4+R()*5,3+R()*4,R()*3,0,TAU);g.stroke();}
    ell(g,10,40,3,4,'#424242',true);
  }),
  golgappa:()=>sprite('golgappa',60,58,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,30,54,24,4,'rgba(0,0,0,.22)');
    wheel(g,14,48,6);wheel(g,46,48,6);rr(g,6,30,48,14,2,'#d84315',true);
    rr(g,10,14,40,17,3,'rgba(220,240,255,.75)',true);
    for(let i=0;i<9;i++)ell(g,15+(i%5)*7.5,19+((i/5)|0)*7,3.2,3,'#e0b060',true);
    ell(g,48,26,6,5,'#9e9e9e',true);rr(g,6,4,48,8,2,'#fdd835',true);
    g.fillStyle='#b71c1c';g.font='900 5.6px sans-serif';g.textAlign='center';g.fillText('GOLGAPPE ₹30',30,10);
  }),
  tanker:()=>sprite('tanker',100,60,g=>{
    g.lineWidth=1.3;g.strokeStyle=OL;ell(g,50,56,46,5,'rgba(0,0,0,.25)');
    rr(g,4,18,70,30,13,'#1e88e5',true);rr(g,74,22,22,26,4,'#eceff1',true);rr(g,80,26,12,10,2,'#2b3a4a',true);
    g.fillStyle='#fff';g.font='900 6.5px sans-serif';g.textAlign='center';g.fillText('DELHI JAL BOARD',39,32);
    g.font='bold 5px sans-serif';g.fillText('PEENE KA PAANI',39,40);wheel(g,20,50,6);wheel(g,58,50,6);wheel(g,86,50,6);
    for(let i=0;i<3;i++)ell(g,10+i*5,49,1.5,2.5,'#90caf9');
  }),
  selfie:()=>sprite('selfie',96,60,g=>{
    g.lineWidth=1.3;g.strokeStyle=OL;ell(g,48,56,42,4,'rgba(0,0,0,.2)');
    rr(g,4,40,88,10,2,'#9e9e9e',true);
    const lt=[['I','#ff9933'],['❤','#e53935'],['D','#1565c0'],['E','#2e7d32'],['L','#ff9933'],['H','#6a1b9a'],['I','#00838f']];
    g.font='900 20px "Arial Black",Arial,sans-serif';g.textAlign='center';g.textBaseline='alphabetic';
    lt.forEach(([t,col],i)=>{g.fillStyle=col;g.fillText(t,10+i*12.5,39);g.strokeText(t,10+i*12.5,39);});
  }),
  sulabh:()=>sprite('sulabh',70,66,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,35,62,30,4,'rgba(0,0,0,.2)');
    rr(g,6,24,58,36,2,'#e0e0e0',true);rr(g,4,18,62,8,1,'#00695c',true);
    g.fillStyle='#fff';g.font='900 5px sans-serif';g.textAlign='center';g.fillText('SULABH SHAUCHALAYA',35,24);
    rr(g,12,34,16,26,1,'#5d4037',true);rr(g,42,34,16,26,1,'#5d4037',true);
    g.fillStyle='#1565c0';g.font='900 7px sans-serif';g.fillText('🚹',20,32);g.fillText('🚺',50,32);
    g.fillStyle='#b71c1c';g.font='900 6px sans-serif';g.fillText('₹5',35,46);
  }),
  paan:()=>sprite('paan',58,62,g=>{
    g.lineWidth=1.2;g.strokeStyle=OL;ell(g,29,58,24,4,'rgba(0,0,0,.2)');
    rr(g,6,22,46,34,2,'#2e7d32',true);rr(g,10,26,38,16,1,'#a5d6a7',true);
    for(let i=0;i<5;i++)ell(g,15+i*7,34,3,2,'#388e3c',true);
    rr(g,4,10,50,12,2,'#c62828',true);g.fillStyle='#fff';g.font='900 6px sans-serif';g.textAlign='center';g.fillText('PAAN BHANDAR',29,18);
    ell(g,29,48,5,5,'#c98a55',true);ell(g,29,46,5,2.4,'#1c1814');
  }),
  site:()=>sprite('site',190,120,g=>{
    g.lineWidth=1.3;g.strokeStyle=OL;ell(g,95,98,90,18,'rgba(110,80,40,.35)');
    ell(g,60,90,26,10,'#c9a36b',true);ell(g,130,94,30,11,'#c9a36b',true);
    for(let i=0;i<8;i++){const x=10+i*24;rr(g,x,96,20,14,1,i%2?'#fff':'#ff6d00',true);}
    g.strokeStyle='#fdd835';g.lineWidth=4;g.beginPath();g.moveTo(150,96);g.lineTo(150,14);g.lineTo(60,14);g.stroke();
    g.lineWidth=1.3;g.strokeStyle='#424242';g.beginPath();g.moveTo(90,14);g.lineTo(90,50);g.stroke();
    rr(g,84,50,12,10,1,'#9e9e9e',true);rr(g,6,40,64,30,2,'#1565c0',true);
    g.fillStyle='#fff';g.font='900 5.6px sans-serif';g.textAlign='center';g.fillText('DELHI METRO PHASE 4',38,50);
    g.fillStyle='#ffeb3b';g.font='bold 4.6px sans-serif';g.fillText('INCONVENIENCE REGRETTED',38,58);g.fillText('SINCE 2019',38,65);
  }),
  monkey:()=>sprite('monkey',30,30,g=>{
    g.lineWidth=1.1;g.strokeStyle=OL;ell(g,15,27,10,3,'rgba(0,0,0,.2)');
    g.strokeStyle='#6d4c41';g.lineWidth=2;g.beginPath();g.moveTo(6,22);g.quadraticCurveTo(0,14,4,8);g.stroke();g.lineWidth=1.1;g.strokeStyle=OL;
    ell(g,15,19,7,6,'#8d6e63',true);ell(g,16,10,6,5.5,'#8d6e63',true);ell(g,17,11,4,3.5,'#d7a98a');
    ell(g,15,10,.9,.9,'#111');ell(g,19,10,.9,.9,'#111');ell(g,11,8,2,2,'#d7a98a',true);ell(g,22,8,2,2,'#d7a98a',true);
    for(const x of[10,20])rr(g,x-1.5,22,3,5,1,'#6d4c41',true);
  }),
  cap:()=>sprite('cap',20,12,g=>{
    g.lineWidth=1;g.strokeStyle=OL;g.fillStyle='#b0884e';g.beginPath();g.ellipse(10,7,8.3,4.6,0,Math.PI,TAU);g.closePath();g.fill();g.stroke();
    g.fillStyle='#c62828';g.fillRect(2,6,16,1.6);rr(g,3,7,14,2.6,1.2,'#3e2a14');
  }),
  emoji:(e)=>sprite('em'+e,28,28,g=>{
    g.font='20px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(e,14,15);
  },2),
};
// buildings: footprint (x,y,w,h), drawn as a box H tall covering y-H .. y+h
// Enhanced with 3D parapet rim, architectural lighting, realistic windows & rooftop detail
const BCACHE=new Map();
function buildingSprite(b){let c=BCACHE.get(b);if(c)return c;
 if(BCACHE.size>220)BCACHE.delete(BCACHE.keys().next().value);
 const R=mulberry32(b.seed),w=b.w,roofH=b.h,fh=b.H,d=roofH+fh,sc=1.5;
 c=document.createElement('canvas');c.width=Math.ceil((w+4)*sc);c.height=Math.ceil((d+4)*sc);
 const g=c.getContext('2d');g.scale(sc,sc);g.translate(2,2);g.lineJoin='round';
 
 // 1. Roof base with rich material tone
 g.fillStyle=b.roof;g.fillRect(0,0,w,roofH);
 // 3D raised parapet boundary casting interior shadow on roof
 g.fillStyle='rgba(25,18,12,.22)';
 g.fillRect(2,2,w-4,3.5);g.fillRect(2,2,3.5,roofH-4);
 g.strokeStyle='rgba(40,25,10,.35)';g.lineWidth=2.5;g.strokeRect(1.2,1.2,w-2.4,roofH-2.4);
 // Sunlit upper edge of parapet
 g.fillStyle='rgba(255,255,255,.22)';g.fillRect(2,2,w-4,2);

 // Solar panels
 if(b.solar){
   g.fillStyle='#102a45';
   for(let i=0;i<3;i++){
     g.fillRect(8+i*13,6,11,8);
     g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.7;
     g.strokeRect(8+i*13,6,11,8);
     g.beginPath();g.moveTo(8+i*13+5.5,6);g.lineTo(8+i*13+5.5,14);g.stroke();
   }
 }
 // Clotheslines
 if(b.laundry&&roofH>22){
   g.strokeStyle='#666';g.lineWidth=.7;g.beginPath();g.moveTo(6,roofH*.6);g.lineTo(w-6,roofH*.5);g.stroke();
   for(let i=0;i<5;i++){
     g.fillStyle=['#e53935','#1e88e5','#fdd835','#fafafa','#8e24aa'][(R()*5)|0];
     g.fillRect(10+i*(w-20)/5,roofH*.6-(i*(roofH*.1)/5),5,6);
   }
 }
 // Sintex Black Water Tank with ribbed texture and lid
 if(b.tank){
   const tx=8+b.tx*(w-24),ty=4+b.ty*Math.max(1,roofH-22);
   // Tank shadow on roof
   ell(g,tx+6,ty+13,7,3,'rgba(20,15,10,.35)');
   // Ribbed black cylindrical body
   const grTank=g.createLinearGradient(tx,0,tx+12,0);
   grTank.addColorStop(0,'#111');grTank.addColorStop(0.4,'#444');grTank.addColorStop(1,'#1a1a1a');
   g.fillStyle=grTank;g.fillRect(tx,ty+3,12,10);
   // Horizontal ribs
   g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=.8;
   g.beginPath();g.moveTo(tx,ty+6);g.lineTo(tx+12,ty+6);g.moveTo(tx,ty+9);g.lineTo(tx+12,ty+9);g.stroke();
   // Top lid
   ell(g,tx+6,ty+3,6,2.4,'#2b2b2b');ell(g,tx+6,ty+2.2,2.5,1,'#fff');
 }
 // Dish antenna with feed arm
 if(b.dish){
   ell(g,w-12,9,5.5,3.6,'#eceff1');
   g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;ell(g,w-12,9,5.5,3.6,null,true);
   g.strokeStyle='#455a64';g.lineWidth=1;g.beginPath();g.moveTo(w-12,9);g.lineTo(w-9,4);g.stroke();
   ell(g,w-9,4,1.2,1.2,'#111');
 }

 // 2. Facade Wall with 3D directional sun illumination
 const fy=roofH;
 g.fillStyle=b.wall;g.fillRect(0,fy,w,fh);
 // Subtle afternoon sun gradient across facade (West sun illuminates left, shadow on right)
 const grWall=g.createLinearGradient(0,0,w,0);
 grWall.addColorStop(0,'rgba(255,240,210,.14)');
 grWall.addColorStop(0.6,'rgba(255,240,210,0)');
 grWall.addColorStop(1,'rgba(20,15,10,.18)');
 g.fillStyle=grWall;g.fillRect(0,fy,w,fh);
 // Overhang shadow beneath roof
 g.fillStyle='rgba(20,15,10,.32)';g.fillRect(0,fy,w,3.5);

 // Floors and realistic windows
 const floors=Math.max(1,Math.floor((fh-16)/14)),cols=Math.max(1,Math.floor((w-6)/15));
 for(let f=0;f<floors;f++){
   const y=fy+4+f*14;
   // Floor divider cornice
   g.fillStyle='rgba(30,20,10,.25)';g.fillRect(0,y+10,w,1.5);
   g.fillStyle='rgba(255,255,255,.15)';g.fillRect(0,y+11.5,w,0.8);
   for(let i=0;i<cols;i++){
     const x=5+i*((w-10)/cols)+((w-10)/cols-8)/2;
     // Window sill & frame
     g.fillStyle='rgba(30,20,10,.45)';g.fillRect(x-0.5,y+1,9,8.5);
     // Glass with sky reflection gradient
     const lit=R()<.18; // warm interior light
     if(lit){
       g.fillStyle='#ffca28';g.fillRect(x,y+1.5,8,7.5);
     } else {
       const grWin=g.createLinearGradient(x,y,x,y+8);
       grWin.addColorStop(0,'#4a6f8a');grWin.addColorStop(1,'#7ea6c2');
       g.fillStyle=grWin;g.fillRect(x,y+1.5,8,7.5);
     }
     // Specular diagonal sunlight gleam
     g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=.9;
     g.beginPath();g.moveTo(x+1,y+7.5);g.lineTo(x+6.5,y+2);g.stroke();
     // AC Compressor Unit
     if(R()<b.ac*.5){
       rr(g,x+8.5,y+4.5,5.5,4.5,1,'#eceff1',true);
       g.fillStyle='#37474f';g.beginPath();g.arc(x+11.2,y+6.8,1.6,0,TAU);g.fill();
     }
   }
 }
 // Billboards/Posters on building
 if(b.poster&&floors>=1){
   const px=4+R()*(w-40),py=fy+5;
   rr(g,px,py,34,9.5,1,'#fffde7',true);
   g.fillStyle='#b71c1c';g.font='900 3.6px Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';
   g.fillText(b.poster,px+17,py+5);
 }
 const gy=fy+fh-15;
 // Street level shopfront
 if(b.shop){
   rr(g,1,gy-1,w-2,7.5,1,b.sign,true);
   g.fillStyle='#fff';g.font=`900 ${Math.min(5.5,(w-6)/b.shop.length*1.7)}px "Arial Black",Arial,sans-serif`;
   g.textAlign='center';g.textBaseline='middle';g.fillText(b.shop,w/2,gy+2.8);
   const n=Math.max(1,Math.floor(w/32));
   for(let i=0;i<n;i++){
     const sx=3+i*(w-6)/n,sw=(w-6)/n-3;
     g.fillStyle=R()<.5?'#8d99ae':'#5d4037';g.fillRect(sx,gy+7,sw,8);
     // Shutter grooves
     g.fillStyle='rgba(0,0,0,.22)';for(let y=gy+8;y<gy+15;y+=2)g.fillRect(sx,y,sw,.7);
     if(R()<.5){
       g.fillStyle=['#ffcc80','#c5e1a5','#ef9a9a','#fff59d'][(R()*4)|0];
       g.fillRect(sx+2,gy+9,sw-4,5);
     }
   }
 } else {
   g.fillStyle='#4e342e';g.fillRect(w/2-4,gy+4,8,11);
   g.fillStyle='#7ea6c2';g.fillRect(6,gy+5,8,6);g.fillRect(w-14,gy+5,8,6);
 }
 if(b.paan){ell(g,4+R()*6,fy+fh-3,3,2,'rgba(150,30,20,.45)');ell(g,w-6,fy+fh-2,2,1.5,'rgba(150,30,20,.4)');}
 g.strokeStyle='rgba(35,20,10,.55)';g.lineWidth=1.2;g.strokeRect(0,0,w,d);
 c.ww=w+4;c.hh=d+4;BCACHE.set(b,c);return c;
}
let PUFF=null;
function gasPuff(){
  if(PUFF)return PUFF;
  const c=document.createElement('canvas');c.width=c.height=110;
  const g=c.getContext('2d');
  // Multi-layered volumetric smoke billow with warm sunlight highlight
  const gr=g.createRadialGradient(52,48,6,55,55,52);
  gr.addColorStop(0,'rgba(255,250,240,.92)');
  gr.addColorStop(0.35,'rgba(235,238,230,.72)');
  gr.addColorStop(0.7,'rgba(210,215,205,.35)');
  gr.addColorStop(1,'rgba(190,195,185,0)');
  g.fillStyle=gr;g.fillRect(0,0,110,110);
  // Secondary billow puff
  const gr2=g.createRadialGradient(42,40,2,42,40,32);
  gr2.addColorStop(0,'rgba(255,255,250,.65)');gr2.addColorStop(1,'rgba(255,255,250,0)');
  g.fillStyle=gr2;g.beginPath();g.arc(42,40,32,0,TAU);g.fill();
  PUFF=c;return c;
}

// =================================================================== ground: pre-rendered tiles (high fidelity & realism)
const TS=384;let tileScale=1;
function makePatterns(g){
  const mk=(sz,fn)=>{
    const c=document.createElement('canvas');c.width=c.height=sz;
    fn(c.getContext('2d'),sz);
    return g.createPattern(c,'repeat');
  };
  return{
    // 1. Realistic Warm Delhi Alluvial Earth / Soil
    ground:mk(128,(q,s)=>{
      q.fillStyle='#decca6';q.fillRect(0,0,s,s);
      const R=mulberry32(3);
      for(let i=0;i<340;i++){
        const c=R()<.38?'160,132,85':R()<.72?'255,248,228':'115,92,62';
        q.fillStyle=`rgba(${c},${.09+R()*.2})`;
        q.fillRect(R()*s,R()*s,1+R()*2.5,1+R()*2.5);
      }
      // Small gravel pebbles with contact shadow
      for(let i=0;i<24;i++){
        const px=R()*s,py=R()*s;
        q.fillStyle='rgba(50,35,20,0.25)';q.fillRect(px+1,py+1,2.8,2);
        q.fillStyle='rgba(215,200,180,0.75)';q.fillRect(px,py,2.5,1.8);
      }
    }),
    // 2. Realistic Multi-layered Natural Grass with Sunlit Blades & Thatch
    grass:mk(96,(q,s)=>{
      q.fillStyle='#729944';q.fillRect(0,0,s,s);
      const R=mulberry32(5);
      // Soft organic density patches
      for(let i=0;i<45;i++){
        q.fillStyle='rgba(55,85,28,0.25)';
        q.beginPath();q.arc(R()*s,R()*s,4+R()*9,0,TAU);q.fill();
      }
      // Individual natural grass blade strokes angled towards sunlight
      for(let i=0;i<300;i++){
        const sun=R()<.48;
        q.strokeStyle=sun?`rgba(185,230,110,${.32+R()*.35})`:`rgba(45,80,22,${.35+R()*.35})`;
        q.lineWidth=1+R()*.8;
        const x=R()*s,y=R()*s;
        q.beginPath();q.moveTo(x,y);q.lineTo(x+R()*2-0.5,y-3-R()*4.5);q.stroke();
      }
      // Dry golden thatch flecks
      for(let i=0;i<22;i++){
        q.fillStyle='rgba(220,200,125,0.4)';q.fillRect(R()*s,R()*s,2.2,1.6);
      }
    }),
    // 3. Realistic Delhi Road Asphalt with Bitumen, Mineral Aggregate & Hairline Cracks
    asphalt:mk(64,(q,s)=>{
      q.fillStyle='#36363c';q.fillRect(0,0,s,s);
      const R=mulberry32(9);
      // Aggregate mineral stones
      for(let i=0;i<280;i++){
        const gr=R()<.33?'20,20,24':R()<.66?'85,85,92':'140,140,148';
        q.fillStyle=`rgba(${gr},${.22+R()*.38})`;
        q.fillRect(R()*s,R()*s,1+R()*1.5,1+R()*1.5);
      }
      // Fine tar sealant crack veins
      q.strokeStyle='rgba(18,18,22,0.45)';q.lineWidth=1;
      for(let i=0;i<3;i++){
        let cx=R()*s,cy=R()*s;
        q.beginPath();q.moveTo(cx,cy);
        for(let j=0;j<4;j++){cx+=(R()-.5)*12;cy+=(R()-.5)*12;q.lineTo(cx,cy);}
        q.stroke();
      }
    }),
    // 4. Interlocking Terracotta and Sandstone Pavement Pavers
    tiles:mk(32,(q)=>{
      q.fillStyle='#d68a68';q.fillRect(0,0,32,32);
      q.fillStyle='#e2c0a0';q.fillRect(0,0,16,16);q.fillRect(16,16,16,16);
      q.strokeStyle='rgba(75,40,25,.48)';q.lineWidth=1.2;
      q.strokeRect(.5,.5,15,15);q.strokeRect(16.5,16.5,15,15);
      q.strokeRect(16.5,.5,15,15);q.strokeRect(.5,16.5,15,15);
      // Bevel highlights
      q.strokeStyle='rgba(255,255,255,.28)';q.lineWidth=1;
      q.beginPath();q.moveTo(1,15);q.lineTo(1,1);q.lineTo(15,1);
      q.moveTo(17,31);q.lineTo(17,17);q.lineTo(31,17);q.stroke();
    }),
    // 5. Agricultural & Cultivated Fields with Furrow Grooves
    fields:mk(40,(q)=>{
      q.fillStyle='#7b9a4c';q.fillRect(0,0,40,40);
      q.fillStyle='rgba(55,80,28,.38)';q.fillRect(0,0,8,40);
      q.fillStyle='rgba(255,255,255,.14)';q.fillRect(8,0,3,40);
    }),
  };
}
function tileLabel(g,t,x,y,s,c){
  g.font=`800 ${s}px "Segoe UI",sans-serif`;g.textAlign='center';g.textBaseline='middle';
  g.lineWidth=s*.28;g.strokeStyle='rgba(255,255,255,.85)';g.strokeText(t,x,y);
  g.fillStyle=c;g.fillText(t,x,y);
}
function renderTile(i,j){
  const c=document.createElement('canvas');c.width=c.height=Math.ceil(TS*tileScale);
  const g=c.getContext('2d');g.scale(tileScale,tileScale);g.translate(-i*TS,-j*TS);
  const x0=i*TS,y0=j*TS,x1=x0+TS,y1=y0+TS,inT=(x,y,r)=>x+r>x0&&x-r<x1&&y+r>y0&&y-r<y1;
  const P=makePatterns(g);
  const cir=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fill();};
  
  // Base land
  g.fillStyle=P.fields;g.fillRect(x0,y0,TS,TS);
  g.fillStyle=P.ground;g.fillRect(Math.max(0,x0),Math.max(0,y0),Math.max(0,Math.min(WORLD,x1)-Math.max(0,x0)),Math.max(0,Math.min(WORLD,y1)-Math.max(0,y0)));
  
  // Parks with organic grass & tree foliage borders
  for(const p of PARKS){
    if(p.t==='c'){
      if(!inT(p.x,p.y,p.r))continue;
      g.fillStyle=P.grass;cir(p.x,p.y,p.r);
    } else {
      if(!inT(p.x+p.w/2,p.y+p.h/2,Math.max(p.w,p.h)))continue;
      g.fillStyle=p.ground?'#cbb184':P.grass;
      rrect(g,p.x,p.y,p.w,p.h,18);g.fill();
      if(p.forest){g.fillStyle='rgba(30,65,20,.22)';g.fill();}
    }
  }
  
  // Section 163 Zone base
  if(inT(ZONE.x,ZONE.y,ZONE.R+80)){
    g.fillStyle='#e6d6bc';cir(ZONE.x,ZONE.y,ZONE.R);
    g.fillStyle=P.grass;
    for(const a of[.6,2.2,3.9,5.3]){
      g.beginPath();g.ellipse(ZONE.x+Math.cos(a)*240,ZONE.y+Math.sin(a)*240,60,38,a,0,TAU);g.fill();
    }
  }
  
  // --- REALISTIC RIVER YAMUNA (Gradient depth, ripples & specular shimmer) ---
  if(x1>5200){
    const ya=y0-60,yb=y1+60;
    // Sandy floodplain shore
    g.fillStyle='#cbb88a';g.beginPath();g.moveTo(riverL(ya)+300,ya);
    for(let y=ya;y<=yb;y+=30)g.lineTo(riverL(y)+300,y);
    g.lineTo(WORLD,yb);g.lineTo(WORLD,ya);g.fill();
    // Flowing deep water channel with gradient depth
    const grWater=g.createLinearGradient(5200,0,5500,0);
    grWater.addColorStop(0,'#505f42');grWater.addColorStop(0.35,'#344436');grWater.addColorStop(1,'#2c3a2f');
    g.fillStyle=grWater;
    g.beginPath();for(let y=ya;y<=yb;y+=30)g.lineTo(riverL(y),y);
    for(let y=yb;y>=ya;y-=30)g.lineTo(riverL(y)+300,y);g.fill();
    // Specular sunlight waves and foam ripples
    for(let y=Math.floor(ya/35)*35;y<yb;y+=35){
      const h=(y*2654435761>>>0)%1000;
      g.fillStyle='rgba(255,255,230,.35)';
      g.fillRect(riverL(y)+30+(h%220),y,35+h%60,2);
      g.fillStyle='rgba(25,25,18,.35)';
      g.fillRect(riverL(y)+20+((h*3)%220),y+8,40+h%40,3);
    }
    // Foam clusters
    g.fillStyle='rgba(250,248,238,.75)';
    for(let y=Math.floor(ya/85)*85;y<yb;y+=85){
      const h=(y*2654435761>>>0)%1000;if(h<500)continue;
      const x=riverL(y)+45+(h%210);cir(x,y,8+h%12);cir(x+11,y+5,6);cir(x-8,y+4,5);
    }
    for(let y=Math.floor(ya/700)*700+300;y<yb;y+=700)tileLabel(g,'YAMUNA RIVER',riverL(y)+150,y,16,'#3d472c');
  }
  
  // --- CONNAUGHT PLACE (Classical Georgian Colonnade Layout) ---
  if(inT(CP.x,CP.y,600)){
    // White Georgian classical arcade ring
    g.strokeStyle='#f8f6f0';g.lineWidth=114;g.beginPath();g.arc(CP.x,CP.y,304,0,TAU);g.stroke();
    g.lineWidth=120;g.beginPath();g.arc(CP.x,CP.y,469,0,TAU);g.stroke();
    // Inner/Outer ring shadow bevels
    g.strokeStyle='rgba(50,35,20,.18)';g.lineWidth=4;
    g.beginPath();g.arc(CP.x,CP.y,247,0,TAU);g.arc(CP.x,CP.y,361,0,TAU);
    g.arc(CP.x,CP.y,409,0,TAU);g.arc(CP.x,CP.y,529,0,TAU);g.stroke();
    // Radial colonnade block divisions
    g.strokeStyle='rgba(150,135,115,.45)';g.lineWidth=2.2;
    for(let k=0;k<64;k++){
      const a=k*TAU/64;
      g.beginPath();
      g.moveTo(CP.x+Math.cos(a)*250,CP.y+Math.sin(a)*250);g.lineTo(CP.x+Math.cos(a)*357,CP.y+Math.sin(a)*357);
      g.moveTo(CP.x+Math.cos(a)*412,CP.y+Math.sin(a)*412);g.lineTo(CP.x+Math.cos(a)*527,CP.y+Math.sin(a)*527);
      g.stroke();
    }
  }
  
  // --- ROADS WITH 3D RAISED KERBSTONES, AUTHENTIC ASPHALT & STIPPLED MARKINGS ---
  const vis=ROADS.filter(r=>r.bb[2]>x0&&r.bb[0]<x1&&r.bb[3]>y0&&r.bb[1]<y1);
  const visR=RINGS.filter(q=>inT(q.x,q.y,q.r+q.w));
  g.lineCap='butt';g.lineJoin='round';
  const path=r=>{g.beginPath();r.p.forEach(([x,y],k)=>k?g.lineTo(x,y):g.moveTo(x,y));};
  const both=fn=>{for(const r of vis){path(r);fn(r.w);}for(const q of visR){g.beginPath();g.arc(q.x,q.y,q.r,0,TAU);fn(q.w);}};
  
  // 1. Sidewalk foundation
  both(w=>{g.strokeStyle='#c2b396';g.lineWidth=w+18;g.stroke();});
  // 2. 3D Kerbstones: Sunlit bevel rim
  g.strokeStyle='rgba(255,250,235,0.7)';both(w=>{g.lineWidth=w+14;g.stroke();});
  // 3. Street-side kerb drop shadow
  g.strokeStyle='rgba(30,25,18,0.48)';both(w=>{g.lineWidth=w+2;g.stroke();});
  // 4. Authentic Delhi Yellow/Black painted curb stripes
  g.globalAlpha=.6;g.setLineDash([12,12]);
  both(w=>{g.strokeStyle='#fdd835';g.lineWidth=w+5;g.stroke();});
  g.lineDashOffset=12;both(w=>{g.strokeStyle='#212121';g.lineWidth=w+5;g.stroke();});
  g.setLineDash([]);g.lineDashOffset=0;g.globalAlpha=1;
  // 5. Deep textured asphalt carriageway
  both(w=>{g.strokeStyle=P.asphalt;g.lineWidth=w;g.stroke();});
  // 6. Realistic stippled road lane markings
  g.setLineDash([18,18]);g.strokeStyle='rgba(255,248,228,.82)';g.lineWidth=2.4;
  for(const r of vis){if(r.w<44)continue;path(r);g.stroke();}
  g.setLineDash([]);
  // 7. Road wear & tyre rubber patina
  g.fillStyle='rgba(20,20,25,.32)';
  for(const r of vis){
    for(let k=0;k<r.L.length;k++){
      const n=Math.floor(r.L[k]/220);
      for(let m=1;m<=n;m++){
        const h=((m*7919+k*104729+r.w*31)>>>0)%100;if(h>40)continue;
        const t=m/(n+1),[ax,ay]=r.p[k],[bx,by]=r.p[k+1];
        const x=ax+(bx-ax)*t+(h%20-10),y=ay+(by-ay)*t+((h*3)%20-10);
        g.beginPath();g.ellipse(x,y,5+h%6,3+h%3,h,0,TAU);g.fill();
      }
    }
  }
  
  if(x1>5300)for(const by of[2650,4000]){g.fillStyle='#8a8a8a';g.fillRect(5250,by-36,700,5);g.fillRect(5250,by+31,700,5);}
  // Jantar Mantar inner circle tiles & red border
  if(inT(JM.x,JM.y,JM.r+30)){
    g.fillStyle=P.tiles;cir(JM.x,JM.y,JM.r);
    g.setLineDash([16,10]);g.strokeStyle='#b03a2e';g.lineWidth=4;
    g.beginPath();g.arc(JM.x,JM.y,JM.r,0,TAU);g.stroke();g.setLineDash([]);
  }
  for(const s of Wd.SITES){
    if(!inT(s.x,s.y,120))continue;
    g.fillStyle='rgba(140,100,55,.85)';g.beginPath();g.ellipse(s.x,s.y,78,40,s.ang,0,TAU);g.fill();
    g.fillStyle='rgba(90,60,30,.6)';g.beginPath();g.ellipse(s.x,s.y,48,22,s.ang,0,TAU);g.fill();
  }
  for(const d of DEST){
    if(!inT(d.x,d.y,120))continue;
    g.fillStyle='#cdb991';cir(d.x,d.y,95);
    g.setLineDash([12,10]);g.strokeStyle='#8d7b5a';g.lineWidth=4;
    g.beginPath();g.arc(d.x,d.y,95,0,TAU);g.stroke();g.setLineDash([]);
    tileLabel(g,d.n.toUpperCase(),d.x,d.y+5,15,'#4e3d22');
    tileLabel(g,'(temporary detention centre)',d.x,d.y+24,11,'#4e3d22');
  }
  if(inT(BANGLA.x,BANGLA.y,140)){
    g.fillStyle='#f6f3ea';g.fillRect(BANGLA.x-70,BANGLA.y-60,140,110);
    g.fillStyle='#5a8fb0';g.fillRect(BANGLA.x-55,BANGLA.y+60,110,30);
    g.fillStyle='#e8c34a';cir(BANGLA.x,BANGLA.y-10,30);
    g.fillStyle='#d4a72c';cir(BANGLA.x,BANGLA.y-14,14);g.fillRect(BANGLA.x-2,BANGLA.y-40,4,10);
    tileLabel(g,'GURUDWARA BANGLA SAHIB',BANGLA.x,BANGLA.y-74,13,'#5a4320');
  }
  if(inT(1400,3900,260)){
    g.fillStyle='#d9a57a';g.fillRect(1260,3600,280,600);
    g.fillStyle='#e9c9a3';for(const[x,y]of[[1300,3650],[1420,3650],[1300,4030],[1420,4030]])g.fillRect(x,y,80,120);
    g.fillStyle='#b97a55';cir(1400,3900,62);g.fillStyle='#8e5a3a';cir(1400,3900,34);
    tileLabel(g,'RASHTRAPATI BHAVAN',1400,3560,22,'#5a3d22');
  }
  for(const y of[3700,4100])if(inT(1900,y,200)){
    g.fillStyle='#d9a57a';g.fillRect(1730,y-70,340,140);g.fillStyle='#b97a55';cir(1900,y,26);
  }
  if(inT(3400,3470,220)){
    g.fillStyle='#d9b48c';cir(3400,3480,140);g.fillStyle='#f0e1c6';cir(3400,3480,104);
    g.fillStyle=P.grass;cir(3400,3480,52);tileLabel(g,'SANSAD BHAVAN',3400,3480,18,'#5a3d22');
  }
  if(inT(4560,650,300)){
    g.fillStyle='#b5462f';g.fillRect(4340,500,440,300);g.fillStyle='#a8b86a';g.fillRect(4370,530,380,240);
    tileLabel(g,'LAL QILA',4560,650,26,'#5a1d10');
  }
  if(inT(4300,3900,80)){
    g.fillStyle='#d6b88a';g.fillRect(4256,3870,88,40);g.fillStyle='#a6845a';g.fillRect(4286,3870,28,40);
    tileLabel(g,'INDIA GATE',4300,3850,16,'#5a3d22');
  }
  for(const p of PARKS)if(p.n&&inT(p.x+p.w/2,p.y+p.h/2,300))tileLabel(g,p.n,p.x+p.w/2,p.y+16,16,'#2d4a20');
  if(x0<40||y0<40||x1>WORLD-40||y1>WORLD-40){
    g.strokeStyle='#9e9e9e';g.lineWidth=30;g.strokeRect(0,0,WORLD,WORLD);
    g.strokeStyle='#fdd835';g.lineWidth=12;g.setLineDash([30,30]);g.strokeRect(0,0,WORLD,WORLD);g.setLineDash([]);
  }
  return c;
}
function getTile(i,j){const k=i*1000+j;let t=tiles.get(k);if(t){tiles.delete(k);tiles.set(k,t);return t;}t=renderTile(i,j);{const g=t.getContext('2d');g.save();g.setTransform(1,0,0,1,0,0);g.fillStyle='rgba(238,230,212,.16)';g.fillRect(0,0,t.width,t.height);g.restore();}tiles.set(k,t);if(tiles.size>56)tiles.delete(tiles.keys().next().value);return t;}

// =================================================================== state
const S={myId:0,info:null,snaps:[],names:new Map(),gates:GATE_DEFS.map(()=>[1,100,0,0,0,0]),bars:[],barsAll:[],picks:[],vip:[],vj:null,rd:[480,0,8,0,0,'',0,1],ev:[],closed:[],lb:[],mm:[],me:null,conn:'',ping:0,offset:null,walk:new Map()};
let renderA=1;
const PX=()=>P.px+(P.x-P.px)*renderA+P.ox,PY=()=>P.py+(P.y-P.py)*renderA+P.oy;
const P={px:ZONE.x,py:ZONE.y,x:ZONE.x,y:ZONE.y,vx:0,vy:0,r:10,team:'P',sx:0,sy:0,ox:0,oy:0,face:Math.PI/2,moving:false,walk:0};
let pending=[],seq=0,net=null,playing=false;
const particles=[],confetti=[],bubbles=[],toasts=[],feed=[];let banner=null,shakeT=0,flashT=0,hurtT=0,celebrate=null,camPunch=0;
const ROOFMK=(()=>{const R=mulberry32(99),out=[];const bs=BUILD.filter(b=>b.H&&b.w>=60&&dist(b.x+b.w/2,b.y,ZONE.x,ZONE.y)<2600);for(let i=0;i<60&&out.length<14;i++){const b=bs[(R()*bs.length)|0];if(!b||out.some(o=>o.b===b))continue;out.push({b,x:b.x+12+R()*(b.w-24),y:b.y-b.H+8+R()*Math.max(4,b.h-16),k:b.y+b.h+1,s:R()*9});}return out;})();
const m0=o=>o.s;
const KTIER=k=>k>=25?['SAILAAB 🌊','#ff1744']:k>=18?['KAFILA','#ff6d00']:k>=10?['JATTHA','#ffab00']:k>=5?['TOLI','#8d6e63']:['',''];
const MATS=[0,1,2,3,4].map(i=>{const a=i/5*TAU-Math.PI/2;return{x:JM.x+Math.cos(a)*JM.r*.55,y:JM.y+Math.sin(a)*JM.r*.55};});
let petalT=0,dholT=0;
const SWINGS=new Map(),HITS=new Map(),THROWN=new Map(),CHEERS=new Map(),FACES=new Map();let misFlash=0,firPulse=0,godiT=0,cctvT=0;
const angDiffC=(a,b)=>{let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;};
const FACE_TAGS=['FACE MATCHED ✅ 98%','Aadhaar linked ✅','MATCH: Shah Rukh Khan (61%)','MATCH: same guy from 2020','ERROR: gamchha detected','MATCH: your mausi','Score: 42% anti-national','Facial recognition: "probably"','SUSPECT: looks thirsty'];
const CHEER_TXT=['ZINDABAD!','INQUILAB!','HUM DEKHENGE!','AWAAZ DO!','✊ JOSH!'];
function cctvSprite(){return sprite('cctv',30,64,g=>{g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(8,61,6,2,0,0,TAU);g.fill();g.fillStyle='#6d6d6d';g.fillRect(6.5,12,3,50);g.fillStyle='#4f4f4f';g.fillRect(6,12,14,2.5);},2);}
function hideSprite(gur){return sprite('hide'+gur,46,56,g=>{g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(23,53,14,3,0,0,TAU);g.fill();g.fillStyle='#6d4c41';g.fillRect(21.5,24,3,30);
 g.fillStyle=gur?'#ff8f00':'#2e7d32';g.beginPath();g.roundRect?g.roundRect(4,4,38,22,4):g.rect(4,4,38,22);g.fill();g.strokeStyle='#fff';g.lineWidth=1.3;g.stroke();
 g.fillStyle='#fff';g.font='900 9px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(gur?'LANGAR':'HIDE',23,11);g.font='8px sans-serif';g.fillText(gur?'🙏':'🙈 🏠',23,20);
 if(gur){g.fillStyle='#ff8f00';g.fillRect(40,0,2,30);g.beginPath();g.moveTo(42,1);g.lineTo(46,4);g.lineTo(42,7);g.fill();}},2);}
function starPath(x,y,r){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();}let mouseHeld=false,lastJoinT=0,lastShoveT=0,actLabel='';
const CTX_TXT={10:'✊ CLICK: HALLA BOL! (charge the police)',9:'🙏 CLICK: Start anshan (hunger strike)',8:'🙈 CLICK: Hide inside',1:'🎤 CLICK: TV interview',2:'🚇 CLICK: Ride the metro (kafila comes along)',3:'🛵 CLICK: Hitch a ride',4:'🚧 HOLD CLICK: Push!',5:'🚇 Station closed today',6:'📺 Crew is on an ad break',7:'🚇 E: Ride the metro'};
const CTX_BTN={10:'HALLA BOL',9:'ANSHAN',8:'HIDE',0:'NAARA',1:'INTERVIEW',2:'METRO',3:'RIDE',4:'PUSH!',5:'NAARA',6:'NAARA'};
const POWW=['DHISHOOM!','THAK!','DHAD!','PATAAK!','DHAPP!'];
function powSprite(w){return sprite('pow'+w,92,54,g=>{const pts=14;g.beginPath();for(let i=0;i<pts*2;i++){const a=i/(pts*2)*TAU,r=i%2?17:27;g.lineTo(46+Math.cos(a)*r*1.65,27+Math.sin(a)*r);}g.closePath();g.fillStyle='#ffeb3b';g.fill();g.lineWidth=2.5;g.strokeStyle='#d32f2f';g.stroke();g.fillStyle='#d32f2f';g.font='900 13px "Arial Black",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(w,46,28);},2);}
function flashOf(cn){if(cn._w)return cn._w;const f=document.createElement('canvas');f.width=cn.width;f.height=cn.height;const g=f.getContext('2d');g.drawImage(cn,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(255,255,255,.9)';g.fillRect(0,0,f.width,f.height);f.ww=cn.ww;f.hh=cn.hh;cn._w=f;return f;}
function metroSprite(cl){return sprite('metro'+(cl?1:0),84,62,g=>{g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(42,58,40,6,0,0,TAU);g.fill();
 g.fillStyle='#b0bec5';g.fillRect(6,36,72,22);g.strokeStyle='#546e7a';g.lineWidth=1.2;g.strokeRect(6,36,72,22);
 g.fillStyle='#263238';g.fillRect(28,38,28,20);g.strokeStyle='#607d8b';for(let i=0;i<5;i++){g.beginPath();g.moveTo(29,42+i*3.6);g.lineTo(55,42+i*3.6);g.stroke();}
 if(cl){g.fillStyle='#78909c';g.fillRect(28,38,28,20);g.strokeStyle='#546e7a';for(let i=0;i<6;i++){g.beginPath();g.moveTo(28,40+i*3);g.lineTo(56,40+i*3);g.stroke();}}
 g.fillStyle='#78909c';g.fillRect(10,26,5,12);g.fillRect(69,26,5,12);
 g.fillStyle='#eceff1';g.beginPath();g.moveTo(2,28);g.lineTo(10,18);g.lineTo(74,18);g.lineTo(82,28);g.closePath();g.fill();g.strokeStyle='#90a4ae';g.lineWidth=1.5;g.stroke();g.fillStyle='#90a4ae';g.fillRect(2,28,80,3);
 g.fillStyle=cl?'#757575':'#0d47a1';g.beginPath();g.roundRect?g.roundRect(22,1,40,16,3):g.rect(22,1,40,16);g.fill();
 g.fillStyle='#fff';g.beginPath();g.arc(30,9,5.5,0,TAU);g.fill();g.fillStyle=cl?'#757575':'#c62828';g.font='900 8px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('M',30,9.5);
 g.fillStyle='#fff';g.font='800 7px Arial';g.fillText(cl?'BAND':'METRO',47,9.5);
 if(cl){g.strokeStyle='#d32f2f';g.lineWidth=3;g.beginPath();g.moveTo(30,40);g.lineTo(54,56);g.moveTo(54,40);g.lineTo(30,56);g.stroke();}},2);}
function drawLathi(o,dirCode,el){// el: ms since swing start
 const base=[Math.PI/2,-Math.PI/2,0,Math.PI][dirCode]||0,side=dirCode===3?-1:1;let a,trail=0;
 if(el<90){a=base-side*(.5+1.8*(el/90));}else if(el<170){const k=(el-90)/80;a=base-side*2.3+side*3.6*(k*k*(3-2*k));trail=1-Math.abs(.5-k)*1.2;}else{a=base+side*1.3-side*.2*Math.min(1,(el-170)/210);}
 const sx=o.x+Math.cos(base)*5,sy=o.y-36;
 if(el>=90&&el<230){const k=Math.min(1,(el-90)/80),a0=base-side*2.3,a1=a0+side*3.6*k;ctx.save();ctx.globalAlpha=Math.max(0,1-(el-170)/60);ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.arc(sx,sy,44,Math.min(a0,a1),Math.max(a0,a1));ctx.arc(sx,sy,18,Math.max(a0,a1),Math.min(a0,a1),true);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,236,179,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,46,Math.min(a0,a1),Math.max(a0,a1));ctx.stroke();ctx.restore();}
 ctx.lineCap='round';ctx.strokeStyle='#4e2c10';ctx.lineWidth=5.5;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*40,sy+Math.sin(a)*40);ctx.stroke();ctx.strokeStyle='#8d5a2b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx+Math.cos(a)*4,sy+Math.sin(a)*4);ctx.lineTo(sx+Math.cos(a)*38,sy+Math.sin(a)*38);ctx.stroke();ctx.strokeStyle='#212121';ctx.lineWidth=5.5;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*8,sy+Math.sin(a)*8);ctx.stroke();}
function toast(txt,c,big){if(toasts.length&&toasts[toasts.length-1].txt===txt){toasts[toasts.length-1].life=big?4.5:2.6;return;}toasts.push({txt,c:c||'#fff',life:big?4.5:2.6,big:!!big});if(toasts.length>2)toasts.shift();}
function addFeed(txt,c){feed.push({txt,c:c||'#fff',life:6});if(feed.length>3)feed.shift();}
function floatText(x,y,txt,c,s){if(particles.filter(q=>q.txt).length>8)return;particles.push({x,y,vx:0,vy:-38,life:1.4,max:1.4,txt,c:c||'#fff',s:s||15});}
function burst(x,y,n){const cols=['#ff9933','#ffffff','#138808','#ffd54f'];for(let i=0;i<n;i++){const a=rand(-Math.PI,0),s=rand(120,360);confetti.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,rot:Math.random()*TAU,vr:rand(-8,8),c:pick(cols),life:rand(1.2,2)});}if(confetti.length>400)confetti.splice(0,confetti.length-400);}
const nearMe=(x,y,r)=>d2(P.x,P.y,x,y)<(r||700)**2;

// =================================================================== networking
function inputMsg(o){return{s:o.s|0,x:+o.x||0,y:+o.y||0,sp:o.sp?1:0,a:o.a?1:0,e:o.e?1:0,g:Array.isArray(o.g)?[+o.g[0]||0,+o.g[1]||0]:0,q:Number.isInteger(o.q)?o.q:-1,ff:o.ff?1:0,f:o.f?1:0,r:o.r?1:0,aim:Number.isFinite(+o.aim)?+o.aim:undefined};}
class Online{
 constructor(name,team,room){this.name=name;this.team=team;this.room=room||'main';this.backoff=600;
  const isProd = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
  if(window.__JM_WS_URL__ && (!isProd || (!window.__JM_WS_URL__.includes('localhost') && !window.__JM_WS_URL__.includes('127.0.0.1')))){
    this.url=window.__JM_WS_URL__;
  }else if(isProd){
    this.url='wss://kafila-server.vercel.app/ws';
  }else{
    const wsPort = window.__JM_SERVER_PORT__ || '4000';
    const host = location.port === wsPort ? location.host : (location.hostname || 'localhost') + ':' + wsPort;
    this.url=(location.protocol==='https:'?'wss://':'ws://')+host+'/ws';
  }
  try{const r=JSON.parse(sessionStorage.getItem('jm_resume')||'null');if(r&&Date.now()-r.t<22000&&r.team===team)this.token=r.tok;}catch(e){}this.open();}
 open(){S.conn='connecting';const ws=this.ws=new WebSocket(this.url+(this.token?'?r='+encodeURIComponent(this.token):''));
  ws.onopen=()=>{this.backoff=600;S.conn='ok';this.send({t:'join',name:this.name,team:this.team,mud:mudda,room:this.room,resume:this.token||undefined});this.sendView();};
  ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;}onMsg(m);};
  ws.onclose=ev=>{if(this.closed)return;S.conn='lost';if(ev.code===4000){this.closed=true;showMenu('😴 You were idle for a while, so we freed your spot for someone in the queue. Press PLAY to come back!');return;}if(ev.code===1008){this.closed=true;showMenu('🚫 Too many connections from your network. Close some tabs and try again.');return;}if(ev.code===1013){showMenu('😬 Server is full right now. Try again in a minute, or practice offline.');return;}setTimeout(()=>{if(!this.closed)this.open();},this.backoff);this.backoff=Math.min(8000,this.backoff*1.7);};
  ws.onerror=()=>{};}
 send(o){if(this.ws&&this.ws.readyState===1)this.ws.send(JSON.stringify(o));}
 sendView(){this.send({t:'view',w:Math.round(W/cam.z),h:Math.round(H/cam.z)});}
 close(){this.closed=true;try{this.ws.close();}catch(e){}}
}
class Local{
 constructor(name,team){this.sim=window.Sim.createSim({roundTime:480,minP:5,minC:4});this.e=this.sim.addPlayer(name,team,false,mudda);this.cl={fxTick:0};this.view={w:1200,h:900};this.acc=0;this.last=performance.now();this.n=0;S.conn='ok';
  setTimeout(()=>onMsg({t:'welcome',id:this.e.id,room:'offline',info:this.sim.staticInfo(),spawn:{x:this.e.x,y:this.e.y,team:this.e.team,mud:this.e.mud}}),0);this.timer=setInterval(()=>this.pump(),1000/60);}
 pump(){const now=performance.now();this.acc+=Math.min(200,now-this.last);this.last=now;while(this.acc>=TICK_MS){this.acc-=TICK_MS;this.sim.step();if(++this.n%2===0){const s=this.sim.snapshot(this.e.id,this.view,this.cl);s.t='s';s.tk=this.sim.S.tick;onMsg(s);}}}
 send(o){if(o.t==='in')this.sim.input(this.e.id,inputMsg(o));else if(o.t==='team')this.sim.setTeam(this.e.id,o.team==='C'?'C':'P',o.mud);else if(o.t==='view')this.view={w:o.w,h:o.h};else if(o.t==='ping')setTimeout(()=>onMsg({t:'pong',c:o.c}),0);}
 sendView(){this.send({t:'view',w:Math.round(W/cam.z),h:Math.round(H/cam.z)});}
 close(){clearInterval(this.timer);}
}
function onMsg(m){
 if(m.t==='idlewarn'){toast('😴 Still there? Move the mouse or you will be removed in ~25s to free your spot','#ffcc80',true);SFX.alert();return;}
 if(m.t==='welcome'){if(net&&m.token){net.token=m.token;try{sessionStorage.setItem('jm_resume',JSON.stringify({tok:m.token,t:Date.now(),team:P.team,room:m.room}));}catch(e){}}if(m.resumed)setTimeout(()=>toast('✅ Reconnected, back in the game!','#a5d6a7'),300);S.myId=m.id;S.info=m.info;S.room=m.room||'main';if(m.spawn){P.x=P.px=m.spawn.x;P.y=P.py=m.spawn.y;cam.x=m.spawn.x;cam.y=m.spawn.y;if(m.spawn.team)P.team=m.spawn.team;}S.snaps=[];S.offset=null;pending=[];playing=true;menu.classList.add('hide');document.getElementById('mob').classList.toggle('on',isTouch);return;}
 if(m.t==='pong'){S.ping=Math.round(performance.now()-m.c);return;}
 if(m.t==='queue'){statusEl.innerHTML=`⏳ Server busy. You are <b>#${m.pos}</b> of ${m.total} in the queue. Hang tight, the game starts automatically.`;return;}
 if(m.t==='full'){if(m.alt&&m.alt.length){statusEl.innerHTML=`😬 This server is full. Taking you to another server…`;setTimeout(()=>{location.href=m.alt[0];},1500);return;}showMenu('😬 Server is full right now. Try again in a minute, or practice offline.');return;}
 if(m.t==='s')onSnap(m);
}
function onSnap(s){
 const now=performance.now();
 const off=s.tk-now/TICK_MS;if(S.offset===null||Math.abs(off-S.offset)>15){S.offset=off;S.jit=0;S.delay=3.2;}else{const dv=off-S.offset;S.offset+=dv*.05;S.jit=S.jit*.94+Math.abs(dv)*.06;const want=clamp(2.6+S.jit*2.4,3,10);S.delay+=(want-S.delay)*(want>S.delay?.25:.03);}
 const snap={tk:s.tk,ents:new Map(),riders:new Map(),buses:new Map(),cans:new Map()};
 for(const e of s.e)snap.ents.set(e[0],e);for(const r of s.r)snap.riders.set(r[0],r);for(const b of s.bus)snap.buses.set(b[0],b);for(const c of s.c)snap.cans.set(c[0],c);
 S.snaps.push(snap);if(S.snaps.length>12)S.snaps.shift();
 S.gates=s.g;S.bars=s.b.map(a=>{const ang=a[3]/1000,tx=Math.cos(ang),ty=Math.sin(ang),len=a[4];return{id:a[0],x:a[1],y:a[2],ang,tx,ty,nx:-ty,ny:tx,len,x1:a[1]-tx*len/2,y1:a[2]-ty*len/2,up:!!a[5],hp:a[6],max:a[7],push:a[8]/10,hold:a[9]/10,check:a[10],armor:a[11]};});
 if(s.bm)S.barsAll=s.bm;S.picks=s.k;S.mk=s.mk||[];S.wc=s.wc||[];S.vip=s.vip||[];S.vj=s.vj||null;S.ev=s.ev;S.closed=s.cl||[];
 const prevOver=S.rd[4];S.rd=s.rd;if(s.lb)S.lb=s.lb;if(s.mm)S.mm=s.mm;
 if(s.names){S.names.clear();for(const n of s.names)S.names.set(n[0],{n:n[1],team:n[2],kind:n[3],mud:n[4]});}
 for(const f of s.fx)handleFx(f);
 if(s.pf)for(const f of s.pf)handlePf(f);
 if(s.me)reconcile(s.me);
 if(S.rd[4]&&!prevOver)SFX[S.me&&S.rd[5]===S.me.team?'rank':'horn']();
}
let lastK=0;
function reconcile(me){
 const prev=S.me;S.me=me;P.team=me.team;
 if(me.team==='P'){for(const m of[5,10,15,18,20,25])if(lastK<m&&me.k>=m){const t=KTIER(m),tierUp=[5,10,18,25].includes(m);if(tierUp)S.tierBan={t:t[0],c:t[1],k:m,life:2.4};toast(tierUp?`🔥 ${t[0]}! ${m} log saath hain. ${['','Chhota sa jhund ban gaya','Dilli hil rahi hai!','Ab koi nahi rok sakta!','JAN SAILAAB! Sarkar dekh rahi hai!'][[5,10,18,25].indexOf(m)+1]}`:`✊ ${m} log! Aur aao!`,'#ffab40',true);burst(PX(),PY()-40,40+m*3);SFX.cheer(m>=18);shakeT=Math.max(shakeT,.2+m/100);camPunch=Math.max(camPunch,.05);}lastK=me.k;}
 if(me.st!=='active'){P.x=P.px=me.x;P.y=P.py=me.y;P.vx=0;P.vy=0;pending=[];P.ox=P.oy=0;return;}
 if(!prev||prev.st!=='active'){P.x=P.px=me.x;P.y=P.py=me.y;P.vx=me.vx;P.vy=me.vy;pending=[];P.ox=P.oy=0;cam.x=me.x;cam.y=me.y;return;}
 const oldX=PX(),oldY=PY(),bx=P.x,by=P.y;
 P.x=me.x;P.y=me.y;P.vx=me.vx;P.vy=me.vy;P.sx=P.sy=0;
 pending=pending.filter(p=>p.s>me.ack);const gd=S.gates.map(g=>!g[0]);
 for(const p of pending)moveBody(P,p.x,p.y,p.spd,DT,gd,S.bars);
 P.px+=P.x-bx;P.py+=P.y-by;P.ox+=oldX-PX();P.oy+=oldY-PY();if(P.ox*P.ox+P.oy*P.oy>60*60){P.ox=P.oy=0;}
}
function handleFx(f){const[k,x,y,a,b]=f;
 if(k==='say'){bubbles.push({id:a,txt:b,life:2.8,x,y});if(bubbles.length>6)bubbles.shift();return;}
 if(k==='feed'){addFeed(a,b);return;}
 if(k==='event'){const M=Wd.MUDDAS[b|0];const t=a==='wave'?[`🚨 RAF WAVE ${b}!`,`${Math.min(10,2+(b|0))} jawans are charging into the plaza. Hold the dharna, keep your kafila tight!`]:a==='trend'?[`📈 #${M.n.replace(/[^A-Za-z0-9]/g,'')} TRENDING`,`${M.e} ${M.n} supporters are pouring out of every corner! ${M.n} protesters earn ×1.5 points for 30s.`]:(EVTEXT[a]||[a,'']);banner={t:t[0],d:t[1],life:5.5};SFX.alert();return;}
 if(k==='round'){toast(`Round ${a}: Dilli Chalo! ✊`,'#ffd54f',true);celebrate=null;return;}
 if(k==='over')return;
 if(k==='pop'){particles.push({x,y:y-50,vx:0,vy:-30,life:.9,max:.9,txt:'+1',c:'#a5d6a7',s:14});if(nearMe(x,y,260))SFX.join();else SFX.pop();for(let i=0;i<5;i++){const an=Math.random()*TAU;particles.push({x,y:y-30,vx:Math.cos(an)*60,vy:Math.sin(an)*60-30,life:.45,max:.45,c:i%2?'#ffcc80':'#fff59d',s:3});}return;}
 if(k==='ring'){particles.push({ring:1,x,y,life:.8,max:.8,c:'rgba(255,153,51,',R:a});return;}
 if(k==='thump'){if(nearMe(x,y,500))SFX.thump();return;}
 if(k==='horn'){if(nearMe(x,y,600))SFX.horn();return;}
 if(k==='swing'){const s=SWINGS.get(b);if(!s||performance.now()-s.t0>250)SWINGS.set(b,{t0:performance.now()});if(b!==S.myId&&nearMe(x,y,500))SFX.whoosh();return;}
 if(k==='hit'){HITS.set(a,{t0:performance.now(),ang:(b|0)/100});if(!nearMe(x,y,700))return;{const now=performance.now();if(now-(handleFx.lp||0)>120){handleFx.lp=now;particles.push({pow:pick(POWW),x,y:y-48,life:.6,max:.6});}}for(let i=0;i<5;i++)particles.push({x:x+rand(-10,10),y:y-2,vx:rand(-50,50),vy:rand(-30,-5),life:.5,max:.5,c:'rgba(160,140,110,.55)',s:rand(4,8)});if(Math.random()<.6){const an=rand(-2.6,-.5);particles.push({emo:'🩴',x,y:y-30,vx:Math.cos(an)*rand(80,180),vy:Math.sin(an)*rand(160,260),g:520,rot:0,vr:rand(-12,12),life:1.1,max:1.1});}if(Math.random()<.5)floatText(x,y-60,pick(['DHISHOOM!','THAK!','DHAD!','AAYEE!']),'#ffeb3b',16);SFX.thwack();return;}
 if(k==='mega'){particles.push({ring:1,x,y,life:1,max:1,c:'rgba(66,165,245,',R:260});if(nearMe(x,y,700))SFX.mega();return;}
 if(k==='gherao'){THROWN.set(a,{t0:performance.now(),ang:(b|0)/100});if(nearMe(x,y,700)){SFX.ouch();setTimeout(SFX.land,560);particles.push({pow:pick(['FEK DIYA!','UTHA KE!','DHADAAM!']),x,y:y-70,life:.8,max:.8,big:1.15});shakeT=Math.max(shakeT,.18);}particles.push({cap:1,x,y:y-44,vx:rand(-60,60),vy:-220,g:500,rot:0,vr:rand(-10,10),life:1.3,max:1.3});if(nearMe(x,y,600))SFX.ding();return;}
 if(k==='interview'){for(let i=0;i<10;i++)particles.push({x:x+rand(-40,40),y:y-30+rand(-30,20),vx:0,vy:0,life:.35,max:.35,c:'rgba(255,255,255,.95)',s:rand(4,9)});if(nearMe(x,y,500))SFX.shutter();return;}
 if(k==='steal'){if(nearMe(x,y,500))SFX.monkey();return;}
 if(k==='dash'){if(a!==S.myId&&nearMe(x,y,600)){const an=(b|0)/100;for(let i=0;i<6;i++)particles.push({x:x-Math.cos(an)*rand(5,25),y:y-2+rand(-4,4),vx:-Math.cos(an)*rand(30,80),vy:-Math.sin(an)*rand(30,80)-10,life:.4,max:.4,c:'rgba(170,150,120,.55)',s:rand(4,7)});}return;}
 if(k==='cheer'){const now=performance.now();const s=CHEERS.get(a);if(!s||now-s.t0>250){CHEERS.set(a,{t0:now});if(nearMe(x,y,600)){if(a!==S.myId)particles.push({x,y:y-70,vx:0,vy:-24,life:.8,max:.8,txt:pick(CHEER_TXT),c:'#ffcc80',s:11});let n=0;for(const o of VIEW){if(o.type!==0||o.id===a||n>=8)continue;if(d2(o.x,o.y,x,y)<150*150){CHEERS.set(o.id,{t0:now+rand(60,280)});n++;}}}}return;}
 if(k==='cctv'){FACES.set(a,{t0:performance.now(),txt:pick(FACE_TAGS)});if(a===S.myId)SFX.shutter();return;}
 if(k==='hide'||k==='unhide'||k==='door'){if(nearMe(x,y,700)){for(let i=0;i<10;i++){const an=Math.random()*TAU;particles.push({x:x+rand(-8,8),y:y-15,vx:Math.cos(an)*rand(30,80),vy:Math.sin(an)*rand(20,50)-20,life:.6,max:.6,c:'rgba(230,230,230,.8)',s:rand(5,9)});}SFX.pop();}return;}
 if(k==='goback'){if(nearMe(x,y,800)){particles.push({pow:'GO BACK!',x,y:y-80,life:1.1,max:1.1,big:1.4});burst(x,y-40,60);SFX.rank();shakeT=Math.max(shakeT,.25);}return;}
 if(k==='hallabol'){const near=nearMe(x,y,800);if(near){particles.push({pow:'HALLA BOL!',x,y:y-90,life:1,max:1,big:1.25+Math.min(.5,(b|0)/40)});particles.push({ring:1,x,y,life:.6,max:.6,c:'rgba(255,87,34,',R:170});SFX.halla((b|0)>=8);shakeT=Math.max(shakeT,.25);if(a===S.myId)camPunch=Math.max(camPunch,.07);
  const now=performance.now();for(const o of VIEW)if(o.type===0&&d2(o.x,o.y,x,y)<190*190)CHEERS.set(o.id,{t0:now+Math.random()*120});}return;}
 if(k==='confused'){if(nearMe(x,y,700))particles.push({x,y:y-70,vx:0,vy:-12,life:2.2,max:2.2,txt:'❓',c:'#fff',s:18});return;}
 if(k==='offwall'){if(nearMe(x,y,600))particles.push({pow:'GIRA!',x,y:y-60,life:.6,max:.6,big:.8});return;}
 if(k==='nograb'){if(nearMe(x,y,400))particles.push({pow:'TOO TIGHT!',x,y:y-70,life:.6,max:.6,big:.7});return;}
 if(k==='grab'){if(nearMe(x,y,700)){particles.push({pow:'UTHA LIYA!',x,y:y-80,life:.8,max:.8});SFX.whistle();}return;}
 if(k==='free'){if(nearMe(x,y,700)){particles.push({pow:'AZAAD!',x,y:y-70,life:.8,max:.8});burst(x,y-30,30);SFX.ding();}return;}
 if(k==='shove'){if(!nearMe(x,y,600))return;const now=performance.now();if(now-lastShoveT>260){lastShoveT=now;particles.push({pow:pick(['DHAKKA!','HAIYA!','ZOR!']),x:a+rand(-20,20),y:b-40,life:.45,max:.45,big:.7});SFX.thump();for(let i=0;i<4;i++)particles.push({x:a+rand(-25,25),y:b,vx:rand(-60,60),vy:rand(-50,-10),life:.4,max:.4,c:'rgba(160,140,110,.55)',s:rand(3,6)});if(nearMe(x,y,120))shakeT=Math.max(shakeT,.08);}return;}
 if(k==='break'){if(nearMe(x,y,900))particles.push({pow:'DHADAAM!',x,y:y-50,life:1,max:1,big:1.5});for(let i=0;i<28;i++){const an=Math.random()*TAU,s=rand(80,280);particles.push({x,y:y-10,vx:Math.cos(an)*s,vy:Math.sin(an)*s-60,life:.9,max:.9,c:i%2?'#fdd835':'#212121',s:rand(3,6)});}if(nearMe(x,y,900)){SFX.crash();shakeT=.4;if(P.team==='P')burst(x,y-20,a?90:40);flashT=.15;}return;}
 if(k==='arrive'){burst(x,y-30,a===S.myId?160:50);if(nearMe(x,y,800)&&a!==S.myId)SFX.ding();return;}
}
function handlePf(f){const[k,a,b,c]=f;
 if(k==='toast')toast(a,b,c);
 else if(k==='score'){const now=performance.now(),sp=S.sp;if(sp&&now-sp.t<2200){sp.sum+=a;if(b&&(a>=sp.top||!sp.label)){sp.label=b;sp.top=a;}sp.t=now;sp.bump=1;}else S.sp={sum:a,label:b||'',top:a,t:now,bump:1};}

 else if(k==='chant')SFX.chant();else if(k==='slurp')SFX.slurp();else if(k==='metro')SFX.metro();else if(k==='ride')SFX.ride();else if(k==='pickup')SFX.pickup();
 else if(k==='detained'){SFX.whistle();setTimeout(SFX.horn,600);S.detained={dest:a,by:b};}
 else if(k==='busgo'){S.detained=Object.assign(S.detained||{},{dest:a});}
 else if(k==='spawn'){S.detained=null;if(!store.get('jm_mouse_tip4','')){store.set('jm_mouse_tip4','1');setTimeout(()=>toast(P.team==='P'?'🖱️ Point the mouse to walk · click to act (the label under you says what)':'🖱️ Point the mouse to walk · click = lathi (your constables lift whoever you expose) · right-click = tear gas','#fff',true),2500);}toast(`📍 You start at ${a}. ${P.team==='P'?'Chalo Jantar Mantar! ➜':'Hunt the protesters!'}`,'#fff',true);}
 else if(k==='fir'){firPulse=1;SFX.alert();}
 else if(k==='godi'){const now=performance.now();if(now-godiT>900){godiT=now;floatText(PX(),PY()-84,'-1 📺 brainwashed','#ff8a80',14);}}
 else if(k==='hidden'){SFX.pop();}
 else if(k==='mission'){toast(`✅ MISSION DONE: ${a}  +${b}`,'#a5d6a7',true);burst(PX(),PY()-50,60);SFX.rank();misFlash=1;}
 else if(k==='roundend'){S.result={d:a,life:10};const won=a[0]===P.team;setTimeout(won?SFX.arrive:SFX.horn,50);if(won)burst(PX(),PY()-40,90);}
 else if(k==='hospital'){toast('🏥 ANSHAN SAFAL! You fainted and were rushed to AIIMS. +300, and the whole of Delhi is talking','#ffab40',true);burst(PX(),PY()-40,120);SFX.rank();}
 else if(k==='join'){}
 else if(k==='grabbed'){hurtT=.7;shakeT=Math.max(shakeT,.4);SFX.thwack();}
 else if(k==='wriggle'){shakeT=Math.max(shakeT,.1);}
 else if(k==='hurt'){hurtT=.45;shakeT=Math.max(shakeT,.35);floatText(PX(),PY()-90,a?'LATHI PADA! 😵':'THAK! Crowd held 💪',a?'#ff5252':'#ffcc80',22);SFX.thwack();}
 else if(k==='combo'){camPunch=.06+Math.min(.06,a*.012);const big=a>=3;floatText(P.x,P.y-90,a>1?`COMBO ×${a}! (${b} hit)`:`${b} HIT!`,a>=4?'#ff5252':big?'#ffab40':'#fff59d',big?22:17);shakeT=Math.max(shakeT,.12+Math.min(.25,a*.04));SFX.thwack();}
 else if(k==='hold'){const q={15:'Dharna shuru!',30:'Anshan level!',60:'Sarkar ko sunna padega!',90:'Ramlila Maidan jaisa!',120:'Legend! Chai on the house ☕',180:'Itihaas ban gaya!',240:'Textbook mein naam aayega!'}[a]||'Unstoppable!';toast(`🔥 ${a}s DHARNA! ${q}`,'#ffab40',true);burst(PX(),PY()-40,50+a/2);SFX.rank();shakeT=.25;}
 else if(k==='runover'){const[hold,peak,brk,gained]=a;const bh=+store.get('jm_best_hold','0'),br=+store.get('jm_best_run','0');S.runCard={hold,peak,brk,gained,newHold:hold>bh&&hold>=10,newRun:gained>br&&gained>=200,life:8};if(hold>bh)store.set('jm_best_hold',String(hold));if(gained>br)store.set('jm_best_run',String(gained));if(S.runCard.newHold||S.runCard.newRun)setTimeout(SFX.rank,400);}
 else if(k==='arrived'){SFX.arrive();celebrate={life:4,bonus:a};shakeT=.3;}
}

// =================================================================== input & tactical map
let bigMap=false;
function toggleBigMap(){
 bigMap=!bigMap;
 miniDirty=true;
 if(bigMap){if(SFX.ding)SFX.ding();}else{if(SFX.pop)SFX.pop();}
}
const keys={};const input={mx:0,my:0,a:false,e:false,g:null,q:-1,joy:null};
const isTouch='ontouchstart'in window||navigator.maxTouchPoints>0;
let mouseOn=false,lastActT=performance.now();cv.style.cursor='none';for(const ev of['keydown','mousedown','touchstart','wheel'])addEventListener(ev,()=>{lastActT=performance.now();},{passive:true});cv.addEventListener('pointermove',e=>{lastActT=performance.now();if(e.pointerType!=='mouse')return;input.mx=e.clientX;input.my=e.clientY;mouseOn=true;});cv.addEventListener('mouseleave',()=>{mouseOn=false;});addEventListener('blur',()=>{mouseOn=false;});
const mouseWorld=()=>[cam.x+(input.mx-W/2)/cam.z,cam.y+(input.my-H/2)/cam.z];
cv.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mouseup',e=>{if(e.button===0)mouseHeld=false;});
cv.addEventListener('mousedown',e=>{input.mx=e.clientX;input.my=e.clientY;
 if(bigMap){
  const bw=Math.min(W-24,960),bh=Math.min(H-36,700),bx=W/2-bw/2,by=H/2-bh/2;
  const cbw=130,cbh=26,cbx=bx+bw-cbw-14,cby=by+14;
  if(e.clientX>=cbx&&e.clientX<=cbx+cbw&&e.clientY>=cby&&e.clientY<=cby+cbh){toggleBigMap();return;}
  if(e.clientX<bx||e.clientX>bx+bw||e.clientY<by||e.clientY>by+bh){toggleBigMap();return;}
  return;
 }
 if(!playing)return;
 const M=miniM,mmx=W-M-12,mmy=H-38-M-12;
 if(e.clientX>=mmx-8&&e.clientX<=mmx+M+8&&e.clientY>=mmy-26&&e.clientY<=mmy+M+8){toggleBigMap();return;}
 if(e.button===0)mouseHeld=true;if(P.team==='C'){if(e.button===2)input.g=mouseWorld();else if(e.button===0){const[wx,wy]=mouseWorld();input.aim=Math.atan2(wy-PY(),wx-PX());P.face=input.aim;input.a=true;const me=S.me;if(me&&me.cd[3]<=0&&!me.carry&&!SWINGS.has(S.myId)){SWINGS.set(S.myId,{t0:performance.now()});SFX.whoosh();}}}else{input.a=true;const me=S.me;if(me&&me.st==='active'&&!me.ctx){const now=performance.now(),s=CHEERS.get(S.myId);if(!s||now-s.t0>250){CHEERS.set(S.myId,{t0:now});floatText(PX(),PY()-96,pick(CHEER_TXT),'#ffcc80',16);if(now-cheerSnd>900){cheerSnd=now;SFX.chant();}}}}});
let cheerSnd=0;
addEventListener('keydown',e=>{if(document.activeElement&&(document.activeElement.id==='name'||document.activeElement.id==='room-custom'))return;keys[e.code]=true;
 if(e.code==='Tab'){e.preventDefault();if(playing)toggleBigMap();return;}
 if(e.code==='KeyM'){if(playing){toggleBigMap();}else{muted=!muted;store.set('jm_mute',muted?'1':'0');toast(muted?'🔇 Muted':'🔊 Sound on');}}
 if(e.code==='KeyU'){muted=!muted;store.set('jm_mute',muted?'1':'0');toast(muted?'🔇 Muted':'🔊 Sound on');}
 if(e.code==='Space'){if(!e.repeat)input.a=true;e.preventDefault();}
 if(e.code.startsWith('Arrow'))e.preventDefault();
 if(e.code==='KeyQ'){quality=quality==='hi'?'lo':'hi';store.set('jm_q',quality);resize();toast(`Graphics: ${quality==='hi'?'HIGH':'FAST'}`);}
 if(e.code==='KeyT'&&playing&&net){net.send({t:'team',team:P.team==='P'?'C':'P',mud:mudda});toast('Switching team…');}
 if(e.code==='Escape'){if(bigMap){bigMap=false;}else if(playing)showMenu();}});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
let joyId=null,joyO=null;
cv.addEventListener('touchstart',e=>{for(const t of e.changedTouches){if(joyId===null){joyId=t.identifier;joyO={x:t.clientX,y:t.clientY};input.joy={dx:0,dy:0};}}e.preventDefault();},{passive:false});
cv.addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===joyId){const dx=t.clientX-joyO.x,dy=t.clientY-joyO.y,m=Math.hypot(dx,dy);input.joy=m<8?{dx:0,dy:0}:{dx:dx/Math.max(m,50),dy:dy/Math.max(m,50)};}}e.preventDefault();},{passive:false});
cv.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===joyId){joyId=null;input.joy=null;}});
const btn=(id,down,up)=>{const b=document.getElementById(id);if(!b)return null;b.addEventListener('pointerdown',e=>{down();e.preventDefault();});if(up){b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);}return b;};
const bAct=btn('bAct',()=>{input.a=true;keys.Space=true;},()=>{keys.Space=false;});
const bE=document.getElementById('bE');if(bE)bE.style.display='none';
const bGas=btn('bGas',()=>{input.g=[P.x+Math.cos(P.face)*300,P.y+Math.sin(P.face)*300];});
const bRun=document.getElementById('bRun');if(bRun)bRun.style.display='none';
const bMap=btn('bMap',()=>{toggleBigMap();});
let inAcc=0;
function sampleInput(){
 if(bigMap)return;
 let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
 let w=norm(mx,my);if(input.joy)w={x:clamp(input.joy.dx,-1,1),y:clamp(input.joy.dy,-1,1)};
 else if(!mx&&!my&&mouseOn){const sx=W/2+(PX()-cam.x)*cam.z,sy=H/2+(PY()-cam.y)*cam.z,dx=input.mx-sx,dy=input.my-sy,d=Math.hypot(dx,dy);if(d>30){const f=Math.min(1,(d-30)/130);w={x:dx/d*f,y:dy/d*f};}else w={x:0,y:0};}
 const sp=false;
 const msg={t:'in',s:++seq,x:+w.x.toFixed(3),y:+w.y.toFixed(3),sp:0,m:performance.now()-lastActT<1500?1:0,a:input.a?1:0,e:input.e?1:0,g:input.g?[Math.round(input.g[0]),Math.round(input.g[1])]:0,q:input.q,ff:keys.Space||mouseHeld?1:0,f:input.f?1:0,r:input.r?1:0,aim:input.aim!=null?+input.aim.toFixed(3):undefined};input.f=false;input.r=false;input.aim=null;
 input.a=false;input.e=false;input.g=null;input.q=-1;net.send(msg);
 const me=S.me;if(me&&me.st==='active'&&!S.rd[4]){let spd=(SPEED[me.team]||150)*(me.team==='P'?1.06:1)*me.sm;
  const gd=S.gates.map(g=>!g[0]);const px=P.x,py=P.y;P.px=P.x;P.py=P.y;moveBody(P,w.x,w.y,spd,DT,gd,S.bars);pending.push({s:seq,x:w.x,y:w.y,spd});if(pending.length>90)pending.shift();
  const mv=Math.hypot(P.x-px,P.y-py);P.moving=mv>DT*25;P.walk+=mv;if(P.moving&&(w.x||w.y))P.face=Math.atan2(w.y,w.x);}
}

// =================================================================== interpolation
const cam={x:ZONE.x,y:ZONE.y,z:1};
let V={x0:0,y0:0,x1:0,y1:0};
const inV=(x,y,r)=>x+r>V.x0&&x-r<V.x1&&y+r>V.y0&&y-r<V.y1;
let VIEW=[];const VBYID=new Map();
function interp(){
 VIEW.length=0;VBYID.clear();const sn=S.snaps;if(!sn.length)return{riders:[],buses:[],cans:[]};
 const rt=performance.now()/TICK_MS+S.offset-(S.delay||3.2);
 let s0=sn[0],s1=sn[sn.length-1];for(let i=0;i<sn.length-1;i++){if(sn[i].tk<=rt&&sn[i+1].tk>=rt){s0=sn[i];s1=sn[i+1];break;}}
 // late snapshot: keep people moving briefly (extrapolate up to ~130 ms) instead of freezing them
 if(rt>s1.tk){if(sn.length>=2){s0=sn[sn.length-2];}else s0=s1;}const span=s1.tk-s0.tk;const a=span>0?clamp((rt-s0.tk)/span,0,1+4/span):1;
 const L=(m0,m1,fn)=>{const out=[];for(const[id,e1]of m1){const e0=m0.get(id);if(e0&&a!==1){out.push(fn(e0,e1,Math.min(a,1)));}else out.push(fn(e1,e1,1));}return out;};
 for(const[id,e1]of s1.ents){if(id===S.myId&&!(S.me&&S.me.st==='carried'))continue;const e0=s0.ents.get(id);const x=e0?e0[2]+(e1[2]-e0[2])*a:e1[2],y=e0?e0[3]+(e1[3]-e0[3])*a:e1[3];
  const w=S.walk.get(id);let walk=0;if(w){walk=w.walk+((e1[5]&1)?Math.hypot(x-w.x,y-w.y):0);w.walk=walk;w.x=x;w.y=y;w.seen=s1.tk;}else S.walk.set(id,{walk:0,x,y,seen:s1.tk});
  const o={id,type:e1[1],x,y,dir:e1[4],fl:e1[5],look:e1[6],wl:e1[7],mud:e1[8]||0,esc:e1[9]||0,sw:e1[10]||0,k:e1[11]||0,walk};VIEW.push(o);VBYID.set(id,o);}
 if(S.walk.size>800)for(const[id,w]of S.walk)if(s1.tk-w.seen>300)S.walk.delete(id);
 return{riders:L(s0.riders,s1.riders,(r0,r1,k)=>[r1[0],r0[1]+(r1[1]-r0[1])*k,r0[2]+(r1[2]-r0[2])*k,r1[3],r1[4]]),
  buses:L(s0.buses,s1.buses,(b0,b1,k)=>[b1[0],b0[1]+(b1[1]-b0[1])*k,b0[2]+(b1[2]-b0[2])*k,b1[3],b1[4],b1[5]]),
  cans:L(s0.cans,s1.cans,(c0,c1,k)=>[c1[0],c0[1]+(c1[1]-c0[1])*k,c0[2]+(c1[2]-c0[2])*k,c1[3],c1[4],c1[5]])};
}

// =================================================================== client-only ambient life (autos, cows, dogs, pigeons, billboards)
const AMB={autos:[],cows:[],dogs:[],pigeons:[],boards:[],decor:[]};
(function(){const R=mulberry32(42);const rp=f=>Wd.randomRoadPos(R,f);const near=r=>r.bb[0]<ZONE.x+2600&&r.bb[2]>ZONE.x-2600&&r.bb[1]<ZONE.y+2400&&r.bb[3]>ZONE.y-2400&&!r.spoke;
 for(let i=0;i<34;i++){const p=rp(near);AMB.autos.push({road:p.road,i:p.i,t:p.t,dir:R()<.5?1:-1,sp:60+R()*60,x:p.x,y:p.y,vx:1,vy:0,kind:R()<.65?'auto':R()<.5?'car':'carw',honk:R()*10});}
 for(let i=0;i<16;i++){const p=rp(near);AMB.cows.push({x:p.x+(R()-.5)*30,y:p.y+(R()-.5)*30,sit:R()<.6,flip:R()<.5});}
 for(let i=0;i<14;i++){const p=rp(near);const x=p.x+(R()<.5?1:-1)*(p.w/2+14),y=p.y+(R()-.5)*20;AMB.dogs.push({x,y,hx:x,hy:y,sit:true,flip:R()<.5,vx:0,vy:0,t:0,bark:0,chase:0});}
 const homes=[[JM.x+120,JM.y-40],[3000,2060],[4300,3820],[BANGLA.x+10,BANGLA.y+90],[2990,2770],[3560,1300],[2350,640],[1500,5080]];for(const[hx,hy]of homes)for(let i=0;i<12;i++){const a=R()*TAU,r=Math.sqrt(R())*45;AMB.pigeons.push({hx,hy,x:hx+Math.cos(a)*r,y:hy+Math.sin(a)*r,h:0,vx:0,vy:0,vh:0,fly:0,land:0,peck:R()*TAU,c:['#8a8f99','#9aa0a8','#7b818a','#c5c8cc'][(R()*4)|0]});}
 for(let i=0;i<900&&AMB.decor.length<60;i++){const p=rp(r=>!r.spoke);const nx=-Math.sin(p.ang),ny=Math.cos(p.ang),s=R()<.5?1:-1;const t=['bin','bin','wall','pole'][(R()*4)|0];const off=p.w/2+(t==='pole'?20:30);const x=p.x+nx*s*off,y=p.y+ny*s*off;if(Wd.pointInBuilding(x,y,t==='wall'?30:14)||dist(x,y,ZONE.x,ZONE.y)<ZONE.R+120||AMB.decor.some(d=>dist(d.x,d.y,x,y)<180))continue;AMB.decor.push({x,y,t});}
 {const cols=['#c62828','#eceff1','#1565c0','#212121','#f9a825','#6d4c41'];let n=0;
 for(let i=0;i<2500&&n<130;i++){const p=rp(r=>!r.spoke);const dz=dist(p.x,p.y,ZONE.x,ZONE.y);if(dz<ZONE.R+220||dz>3600)continue;const nx=-Math.sin(p.ang),ny=Math.cos(p.ang),s=R()<.5?1:-1;const roll=R();
  if(roll<.3){const x=p.x+nx*s*(p.w/2-12),y=p.y+ny*s*(p.w/2-12);if(Math.abs(Math.cos(p.ang))<.75||Wd.pointInBuilding(x,y,20)||AMB.decor.some(d=>dist(d.x,d.y,x,y)<90))continue;AMB.decor.push({x,y,t:'pcar',c:cols[(R()*cols.length)|0],f:R()<.5});n++;}
  else if(roll<.55){const x=p.x+nx*(R()-.5)*p.w*.6,y=p.y+ny*(R()-.5)*p.w*.6;AMB.decor.push({x,y,t:'hole',r:5+R()*8});n++;}
  else if(roll<.7){AMB.decor.push({x:p.x+nx*(R()-.5)*p.w*.4,y:p.y+ny*(R()-.5)*p.w*.4,t:'manhole'});n++;}
  else{const x=p.x+nx*s*(p.w/2+26),y=p.y+ny*s*(p.w/2+26);if(Wd.pointInBuilding(x,y,22)||AMB.decor.some(d=>dist(d.x,d.y,x,y)<120)||Wd.CCTV.some(q=>dist(q.x,q.y,x,y)<60))continue;AMB.decor.push({x,y,t:'rtree',v:(R()*3)|0,s:.75+R()*.3});n++;}}}
 let k=0;for(let i=0;i<400&&AMB.boards.length<16;i++){const p=rp(r=>!r.spoke);const nx=-Math.sin(p.ang),ny=Math.cos(p.ang),s=R()<.5?1:-1;const x=p.x+nx*s*(p.w/2+40),y=p.y+ny*s*(p.w/2+40);if(Wd.pointInBuilding(x,y,30)||dist(x,y,ZONE.x,ZONE.y)<ZONE.R+150||AMB.boards.some(b=>dist(b.x,b.y,x,y)<500))continue;AMB.boards.push({x,y,t:BILLBOARDS[k++%BILLBOARDS.length]});}})();
function stepAlong(o,dt){const r=o.road;let rem=o.sp*dt,guard=0;const ox=o.x,oy=o.y;while(rem>0&&guard++<20){const L=r.L[o.i];if(o.dir>0){const left=(1-o.t)*L;if(rem<left){o.t+=rem/L;rem=0;}else{rem-=left;o.i++;o.t=0;if(o.i>=r.L.length){o.i=r.L.length-1;o.t=1;o.dir=-1;}}}else{const left=o.t*L;if(rem<left){o.t-=rem/L;rem=0;}else{rem-=left;o.i--;o.t=1;if(o.i<0){o.i=0;o.t=0;o.dir=1;}}}}
 const[ax,ay]=r.p[o.i],[bx,by]=r.p[o.i+1];const L=r.L[o.i];const nx=-(by-ay)/L,ny=(bx-ax)/L,lane=r.w*.25*o.dir;o.x=ax+(bx-ax)*o.t+nx*lane;o.y=ay+(by-ay)*o.t+ny*lane;if(dt>0){o.vx=(o.x-ox)/dt;o.vy=(o.y-oy)/dt;}}
let ambFlT=0,civT=4;
function updateAmbient(dt){
 const jam=false;
 for(const a of AMB.autos){const slow=jam&&(d2(a.x,a.y,4600,2650)<300*300||d2(a.x,a.y,3000,2000)<650*650);if(!inV(a.x,a.y,900)&&Math.random()>.2)continue;stepAlong(a,slow?dt*.08:dt);a.honk-=dt;if(a.honk<=0){a.honk=rand(6,14);if(nearMe(a.x,a.y,280)){SFX.honk();if(Math.random()<.4)bubbles.push({lx:a,txt:pick(['Peeeep!','Side do bhaiya!','Meter se nahi chalega','Kahan jaana hai?']),life:2.4});}}}
 for(const d of AMB.dogs){if(!inV(d.x,d.y,400))continue;d.t-=dt;d.bark-=dt;
  if(S.me&&S.me.st==='active'&&d2(d.x,d.y,P.x,P.y)<85*85&&d.bark<=0){d.bark=rand(6,10);d.sit=false;d.chase=2.2;bubbles.push({lx:d,txt:pick(['Bhow bhow!','Grrr… woof!']),life:2});SFX.bark();}
  if(d.chase>0){d.chase-=dt;const n=norm(P.x-d.x,P.y-d.y);const close=d2(d.x,d.y,P.x,P.y)<40*40;d.vx=n.x*(close?20:120);d.vy=n.y*(close?20:120);}
  else if(d.t<=0){d.t=rand(2,6);d.sit=Math.random()<.6;const an=Math.random()*TAU;d.vx=d.sit?0:Math.cos(an)*35;d.vy=d.sit?0:Math.sin(an)*35;if(d2(d.x,d.y,d.hx,d.hy)>120*120){const n=norm(d.hx-d.x,d.hy-d.y);d.vx=n.x*40;d.vy=n.y*40;d.sit=false;}}
  d.x+=d.vx*dt;d.y+=d.vy*dt;if(Math.abs(d.vx)>2)d.flip=d.vx<0;if(Wd.pointInBuilding(d.x,d.y,4)){d.x-=d.vx*dt;d.y-=d.vy*dt;d.vx=-d.vx;d.vy=-d.vy;}}
 let fl=false;
 for(const g of AMB.pigeons){if(!inV(g.x,g.y,300))continue;
  if(g.fly>0){g.fly-=dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.h=Math.max(0,g.h+g.vh*dt);g.vh-=40*dt;if(g.fly<=0){g.tx=g.hx+rand(-45,45);g.ty=g.hy+rand(-45,45);g.land=1.5;}continue;}
  if(g.land>0){g.land-=dt;const k=Math.min(1,dt*2.5);g.x+=(g.tx-g.x)*k;g.y+=(g.ty-g.y)*k;g.h=Math.max(0,g.h-dt*60);continue;}
  g.peck+=dt*3;
  const scare=(x,y,mine)=>{if(d2(x,y,g.x,g.y)<55*55){const n=norm(g.x-x,g.y-y);g.fly=rand(1.4,2.4);g.vx=n.x*rand(110,190)+rand(-40,40);g.vy=n.y*rand(110,190)+rand(-40,40);g.vh=rand(70,110);g.h=2;if(mine)fl=true;return true;}return false;};
  if(P.moving&&scare(P.x,P.y,true))continue;for(const o of VIEW)if(o.fl&1&&scare(o.x,o.y,false))break;}
 if(fl&&performance.now()-ambFlT>1200){ambFlT=performance.now();SFX.flutter();}
 civT-=dt;if(civT<=0){civT=rand(5,9);const idle=VIEW.filter(o=>o.type===0&&(o.fl&4096)&&nearMe(o.x,o.y,420));if(idle.length){const o=pick(idle);const M=Wd.MUDDAS[o.mud|0];bubbles.push({id:o.id,txt:Math.random()<.5?pick(M.ch):pick(CIVIL),life:2.8});}}
 for(let i=bubbles.length-1;i>=0;i--){bubbles[i].life-=dt;if(bubbles[i].life<=0)bubbles.splice(i,1);}
 if(particles.length>260)particles.splice(0,particles.length-260);if(confetti.length>180)confetti.splice(0,confetti.length-180);
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}if(!p.ring){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.g){p.vy+=p.g*dt;p.rot+=p.vr*dt;}}}
 for(let i=confetti.length-1;i>=0;i--){const c=confetti[i];c.life-=dt;c.vy+=420*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.rot+=c.vr*dt;if(c.life<=0)confetti.splice(i,1);}
 for(let i=toasts.length-1;i>=0;i--){toasts[i].life-=dt;if(toasts[i].life<=0)toasts.splice(i,1);}
 for(let i=feed.length-1;i>=0;i--){feed[i].life-=dt;if(feed[i].life<=0)feed.splice(i,1);}
 if(banner){banner.life-=dt;if(banner.life<=0)banner=null;}if(celebrate){celebrate.life-=dt;if(celebrate.life<=0)celebrate=null;}
 if(shakeT>0)shakeT-=dt;if(flashT>0)flashT-=dt;
}

// =================================================================== scene drawing
const PK_SPR={chai:()=>[VSPR.chai(),32,58],busstop:()=>[VSPR.busstop(),42,54],coaching:()=>[VSPR.sign('coach','#1565c0','TOPPER IAS','Fees ₹1.5 lakh only*'),32,58],hostel:()=>[VSPR.sign('pg','#6a1b9a','BOYS & GIRLS PG','WiFi • AC • Maggi'),32,58],dhaba:()=>[VSPR.dhaba(),35,48],college:()=>[VSPR.sign('coll','#00695c','GOVT. COLLEGE','Attendance 75% compulsory'),32,58]};
const DIRMAP=[[0,false],[1,false],[2,false],[2,true]];
function personFrame(o){if(o.fl&16)return 3;if(!(o.fl&1))return 0;const ph=Math.floor(o.walk/9)%4;return ph===1?1:ph===3?2:0;}
function drawPersonV(o,L,dirCode,frame,isMe){
 let al=1;if(o.fl&128)al=Math.max(0,1-(o.esc||0)/80);else if(o.fl&8)al=.55+.3*Math.sin(performance.now()/55);
 if(al<1)ctx.globalAlpha=al;
 const human=o.fl&256,bot=o.fl&512;
 if(o.type===1&&S.me&&S.me.hunt&&S.me.hunt[0]===o.id){const pu=.6+.4*Math.sin(performance.now()/120);ctx.strokeStyle=`rgba(229,30,30,${pu})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(o.x,o.y,17,7,0,0,TAU);ctx.stroke();}
 if(isMe){ctx.strokeStyle=P.team==='P'?'#ff6d00':'#1565c0';ctx.lineWidth=2.6;ctx.beginPath();ctx.ellipse(o.x,o.y,15,6,0,0,TAU);ctx.stroke();}
 else if(human||bot){ctx.strokeStyle=o.type===0?'rgba(255,109,0,.8)':'rgba(21,101,192,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(o.x,o.y,14,5.5,0,0,TAU);ctx.stroke();}
 else if(o.fl&32){ctx.strokeStyle='rgba(255,152,0,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(o.x,o.y,14,5.5,0,0,TAU);ctx.stroke();}
 const SC_P=isMe?1.3:(o.fl&256)?1.2:(o.fl&512)?1.1:1;
 const [d,flip]=DIRMAP[dirCode]||DIRMAP[0];let c=charSprite(L,d,frame);
 ctx.fillStyle = 'rgba(25, 18, 12, 0.28)';
 ctx.beginPath();
 ctx.ellipse(o.x, o.y, 8.5 * SC_P, 3.5 * SC_P, 0, 0, TAU);
 ctx.fill();

 let bob=(o.fl&1)?-Math.abs(Math.sin(o.walk/9*Math.PI/2))*1.2:0;
 const chr=CHEERS.get(o.id);if(chr){const el=performance.now()-chr.t0;if(el>420)CHEERS.delete(o.id);else if(el>0)bob-=Math.sin(Math.PI*el/420)*8;}
 if(o.type===2&&o.look===3){ctx.save();ctx.setLineDash([7,6]);ctx.strokeStyle='rgba(255,87,34,.45)';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(o.x,o.y,150,62,0,0,TAU);ctx.stroke();ctx.restore();}
 const hit=o.type===0?HITS.get(o.id):null;let tilt=0;
 if(hit){const el=performance.now()-hit.t0;if(el>650)HITS.delete(o.id);else{const sgn=Math.cos(hit.ang)>=0?1:-1;tilt=sgn*(el<110?el/110*1.25:1.25*Math.max(0,1-(el-110)/540));if(el<90)c=flashOf(c);}}
 const thr=o.type===1?THROWN.get(o.id):null;
 if(o.fl&1048576){ctx.save();ctx.translate(o.x,o.y-6);ctx.rotate(-Math.PI/2);blit(c,0,AY/2,AX,AY,flip);ctx.restore();if(((performance.now()/600+o.id)|0)%3===0)label('🙏',o.x+18,o.y-20,12,'#fff',false);}
 else if(o.fl&262144){const t=performance.now();const sgn=dirCode===3?-1:1,kick=Math.sin(t/70)*.22,lift=Math.abs(Math.sin(t/140))*3;ctx.save();ctx.translate(o.x,o.y-50-lift);ctx.rotate(sgn*Math.PI/2+kick);blit(c,0,AY/2,AX,AY,flip);ctx.restore();if(((t/400)|0)%2)label('😱',o.x+sgn*30,o.y-72,13,'#fff',false);}
 else if(thr){const el=performance.now()-thr.t0,sgn=Math.cos(thr.ang)>=0?1:-1;if(el>2200)THROWN.delete(o.id);
  if(el<600){const k=el/600,h=Math.sin(Math.PI*k)*42;ctx.fillStyle='rgba(0,0,0,.18)';ellC(o.x,o.y,12*(1-h/80),4);ctx.save();ctx.translate(o.x,o.y-h-AY/2);ctx.rotate(sgn*k*TAU*1.25);blit(c,0,AY/2,AX,AY,flip);ctx.restore();}
  else{const k=Math.min(1,Math.max(0,(el-1500)/700)),r=sgn*Math.PI/2*(1-k*k);ctx.save();ctx.translate(o.x,o.y);ctx.rotate(r);blit(c,0,0,AX,AY,flip);ctx.restore();}}
 else if(tilt){ctx.save();ctx.translate(o.x,o.y+bob);ctx.rotate(tilt);blit(c,0,0,AX,AY,flip,SC_P);ctx.restore();}
 else blit(c,o.x,o.y+bob,AX,AY,flip,SC_P);
 if(o.fl&2097152){label('🧗',o.x+10,o.y-64,12,'#fff',false);}
 if(o.fl&131072&&((o.id+((performance.now()/250)|0))%3===0))label('😱',o.x,o.y-62,11,'#fff',false);
 if(chr&&performance.now()-chr.t0>0&&performance.now()-chr.t0<420)label('✊',o.x+8,o.y-66+bob,11,'#fff',false);
 const fc=FACES.get(o.id);if(fc){const el=performance.now()-fc.t0;if(el>1600)FACES.delete(o.id);else{const k=Math.min(1,el/180),s=16+(1-k)*14,cx=o.x,cy=o.y-52+bob;ctx.strokeStyle=el<500&&((el/90)|0)%2?'#fff':'#00e676';ctx.lineWidth=2;const L=6;ctx.beginPath();for(const[sx,sy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){ctx.moveTo(cx+sx*s,cy+sy*s+(-sy)*L);ctx.lineTo(cx+sx*s,cy+sy*s);ctx.lineTo(cx+sx*s+(-sx)*L,cy+sy*s);}ctx.stroke();
  if(el>250){ctx.font='800 9px Consolas,monospace';const w=ctx.measureText(fc.txt).width+8;ctx.fillStyle='rgba(0,40,20,.82)';ctx.fillRect(cx-w/2,cy-s-17,w,13);ctx.fillStyle='#69f0ae';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fc.txt,cx,cy-s-10);}}}
 if(o.type===1){const s=SWINGS.get(o.id);if(s){const el=performance.now()-s.t0;if(el<400)drawLathi(o,dirCode,el);else SWINGS.delete(o.id);}}
 if(o.fl&16384&&o.type===0){ctx.fillStyle='rgba(255,82,82,.9)';ctx.font='900 9px sans-serif';ctx.textAlign='center';ctx.fillText('!!',o.x,o.y-62);}
 if(o.fl&2){const t=performance.now();if(((t/320+o.id)|0)%4===0)label('😵',o.x+9,o.y-62,11,'#fff',false);ctx.fillStyle='rgba(110,180,255,.85)';circle(o.x-4,o.y-47+((t/90+o.id)%9),1.5);circle(o.x+4,o.y-47+((t/115+o.id*3)%9),1.5);if(Math.random()<.05)particles.push({x:o.x+7,y:o.y-46,vx:rand(10,25),vy:rand(-14,-4),life:.45,max:.45,c:'rgba(235,235,230,.8)',s:rand(2,4)});}
 if(o.fl&8192){ctx.fillStyle='#43a047';ctx.fillRect(o.x-8,o.y-41,16,3);}
 if(o.fl&4)label('💫',o.x+Math.sin(performance.now()/90)*4,o.y-60,isMe?20:14,'#fff',false);
 if(o.fl&32768){ctx.fillStyle='rgba(120,190,255,.6)';for(let i=0;i<3;i++)circle(o.x-6+i*6,o.y-50+((performance.now()/80+i*7)%14),1.8);}
 if(al<1)ctx.globalAlpha=1;
}
function vehView(dc){return dc===2?['side',false]:dc===3?['side',true]:dc===0?['front',false]:['back',false];}
function drawScene(dyn){
 const DL=[];const push=(y,k,o,a,b)=>DL.push([y,k,o,a,b]);
 for(const b of BUILD){if(b.x>V.x1||b.x+b.w<V.x0||b.y-b.H>V.y1||b.y+b.h<V.y0)continue;push(b.y+b.h,1,b);}
 for(const t of TREES)if(inV(t.x,t.y-30,60))push(t.y,2,t);
 if(inV(ZONE.x,ZONE.y,ZONE.R+60))for(const f of FENCE)if(inV(f.x,f.y,30))push(f.y,3,f);
 GATE_DEFS.forEach((g,gi)=>{if(!inV(g.x,g.y,140))return;const G=S.gates[gi],up=G[0],hp=G[1],n=Math.ceil(g.w/24),frontV=Math.abs(g.tx)>Math.abs(g.ty),sh=G[2]>0?2.5:0;
  if(up){if(G[4]>0)for(let k=0;k<n;k++){const t=(k-(n-1)/2)*24;push(g.y+g.ty*t+g.ny*14,6,{x:g.x+g.tx*t+g.nx*14,y:g.y+g.ty*t+g.ny*14});}
   const rows=hp>45?2:1;for(let r=0;r<rows;r++)for(let k=0;k<n;k++){const t=(k-(n-1)/2)*24;push(g.y+g.ty*t-g.ny*r*12,4,{x:g.x+g.tx*t-g.nx*r*12,y:g.y+g.ty*t-g.nx*r*12},frontV,sh);}}
  else for(let k=0;k<n*2;k++){const h=Math.sin(k*12.9898+g.ang*78.233)*43758.5453,fr=h-Math.floor(h);const t=(fr-.5)*g.w*1.4,o=(Math.sin(k*3.1)*.5)*70;push(g.y+g.ty*t+g.ny*o-8,5,{x:g.x+g.tx*t+g.nx*o,y:g.y+g.ty*t+g.ny*o},fr);}});
 for(const b of S.bars){const n=Math.max(2,Math.round(b.len/26)),frontV=Math.abs(b.tx)>Math.abs(b.ty),sh=b.push>0?2.5:0;for(let k=0;k<n;k++){const t=(k-(n-1)/2)*(b.len/n),x=b.x+b.tx*t,y=b.y+b.ty*t;if(!inV(x,y,30))continue;if(b.up){push(y,4,{x,y},frontV,sh);if(b.armor>0&&k%2===0)push(y+8,6,{x:x+b.nx*12,y:y+b.ny*12});}else{const h=Math.sin(k*9.1+b.x)*43758.5,fr=h-Math.floor(h);push(y-8,5,{x:x+(fr-.5)*30,y:y+(fr-.5)*24},fr);}}}
 if(inV(JM.x,JM.y,220)){push(JM.y+56,7);push(JM.y-20,8);for(const t of TENTS)push(t.y,9,t);}
 if(S.info)for(const p of S.info.pockets){if(!inV(p[0],p[1],90))continue;push(p[1],10,p);}
 for(const s of ASSEMBLY)if(inV(s.x,s.y-70,90))push(s.y-70,21,s);
 for(const s of PSTATIONS)if(inV(s.x,s.y,90))push(s.y-20,20,s);
 for(const b of AMB.boards)if(inV(b.x,b.y,80))push(b.y,19,b);
 for(const s of Wd.STALLS)if(inV(s.x,s.y,80))push(s.y,25,s);
 for(const s of Wd.SITES)if(inV(s.x,s.y,140))push(s.y+10,26,s);
 for(const m of ROOFMK)if(inV(m.x,m.y,40))push(m.k,32,m);
 for(const w of S.wc||[])if(inV(w[1],w[2],140))push(w[2],28,w);
 for(const d of AMB.decor)if(inV(d.x,d.y,70))push(d.t==='hole'||d.t==='manhole'?d.y-30:d.y,29,d);
 for(const q of Wd.CCTV)if(inV(q.x,q.y-40,60))push(q.y,30,q);
 for(const h of Wd.HIDES)if(inV(h.x,h.y-30,60))push(h.y-2,31,h);
 const zr=(ZONE.R+200)**2;for(const a of AMB.autos)if(inV(a.x,a.y,40)&&d2(a.x,a.y,ZONE.x,ZONE.y)>zr)push(a.y,12,a);
 for(const c of AMB.cows)if(inV(c.x,c.y,40)&&d2(c.x,c.y,ZONE.x,ZONE.y)>zr)push(c.y,15,c);
 for(const d of AMB.dogs)if(inV(d.x,d.y,30))push(d.y,16,d);
 for(const g of AMB.pigeons)if(g.h<1&&inV(g.x,g.y,20))push(g.y,17,g);
 for(const k of S.picks)if(inV(k[1],k[2],30))push(k[2],18,k);
 for(const r of dyn.riders)if(inV(r[1],r[2],50))push(r[2],13,r);
 for(const b of dyn.buses)if(inV(b[1],b[2],100))push(b[2],14,b);
 for(const v of S.vip)if(inV(v[0],v[1],50))push(v[1],22,v);
 if(S.vj&&inV(S.vj[0],S.vj[1],80))push(S.vj[1],23,S.vj);
 for(const o of VIEW)if(inV(o.x,o.y-30,50))push(o.y,11,o);
 const me=S.me;let meObj=null;
 if(me&&(me.st==='active'||me.st==='arrived')){meObj={id:S.myId,type:me.team==='P'?0:1,x:PX(),y:PY(),fl:(P.moving?1:0)|(me.st==='arrived'?16:0),walk:P.walk};const mine=S.snaps.length?S.snaps[S.snaps.length-1].ents.get(S.myId):null;if(mine){meObj.fl|=mine[5]&(2|4|8|8192|16384|1048576);meObj.sw=mine[10]||0;}push(meObj.y,24,meObj);}
 const meX=meObj?meObj.x:-1e9,meY=meObj?meObj.y:-1e9;
 if(meObj)blit(sprite('spot'+P.team,150,70,g=>{const gr=g.createRadialGradient(75,35,3,75,35,74);gr.addColorStop(0,P.team==='P'?'rgba(255,214,120,.42)':'rgba(140,190,255,.42)');gr.addColorStop(1,'rgba(255,214,120,0)');g.fillStyle=gr;g.save();g.scale(1,34/74);g.beginPath();g.arc(75,35*74/34,74,0,TAU);g.restore();g.fill();},1),meX,meY,75,35);
 DL.sort((a,b)=>a[0]-b[0]);
 for(const it of DL){const k=it[1],o=it[2];
  switch(k){
   case 1:{
     const c=buildingSprite(o);
     ctx.fillStyle='rgba(35,22,12,0.22)';
     ctx.fillRect(o.x+2,o.y+o.h-3,o.w-2,6);
     ctx.drawImage(c,o.x-2,o.y-o.H-2,c.ww,c.hh);
     break;
   }
   case 2:blit(VSPR.tree(o.v),o.x,o.y,32,70,false,o.s);break;
   case 3:blit(VSPR.block(),o.x,o.y,14,27);break;
   case 4:{const j=it[4]?rand(-it[4],it[4]):0;if(it[3])blit(VSPR.bar_front(),o.x+j,o.y,15,23);else blit(VSPR.bar_side(),o.x+j,o.y,6,23);break;}
   case 5:blit(VSPR.fallen(),o.x,o.y,15,10,it[3]>.5);break;
   case 6:blit(VSPR.block(),o.x,o.y,14,27);break;
   case 7:drawJMMonument();break;case 8:drawJaiPrakash();break;
   case 9:blit(VSPR.tent(o.c),o.x,o.y,55,70);break;
   case 10:{const f=PK_SPR[o[2]]||PK_SPR.dhaba;const[c,ax,ay]=f();blit(c,o[0],o[1],ax,ay);if(o[2]==='chai'&&Math.random()<.25)particles.push({x:o[0]-12+rand(-3,3),y:o[1]-36,vx:rand(-4,4),vy:-18,life:1,max:1,c:'rgba(255,255,255,.55)',s:3});break;}
   case 11:{drawPersonV(o,lookFor(o.type,o.look,o.mud),o.dir,personFrame(o),false);break;}
   case 12:{const[v,fl]=vehView(Math.abs(o.vx)>=Math.abs(o.vy)*.8?(o.vx<0?3:2):(o.vy>0?0:1));const col=o.kind==='carw'?'#eceff1':'#c62828';if(o.kind==='auto'){if(v==='side')blit(VSPR.auto_side(),o.x,o.y,30,40,fl);else blit(VSPR.auto_front(),o.x,o.y,18,40);}else{if(v==='side')blit(VSPR.car_side(col),o.x,o.y,32,34,fl);else blit(VSPR.car_front(col),o.x,o.y,20,34);}break;}
   case 13:{const[v,fl]=vehView(o[3]);if(v==='side')blit(VSPR.bike_side(o[5]||0),o[1],o[2],25,50,fl);else blit(VSPR.bike_front(o[5]||0),o[1],o[2],15,50);if(o[4]>=0){const L=lookFor(0,o[4],o[6]);blit(charSprite(L,v==='side'?2:0,3),o[1]+(v==='side'?(fl?8:-8):0),o[2]-14,AX,AY,fl);}break;}
   case 14:{if(o[5]){const pu=.75+.25*Math.sin(performance.now()/400);ctx.globalAlpha=pu;blit(sprite('busglow',240,110,g=>{const gr=g.createRadialGradient(120,55,10,120,55,118);gr.addColorStop(0,'rgba(229,57,53,.42)');gr.addColorStop(.7,'rgba(229,57,53,.18)');gr.addColorStop(1,'rgba(229,57,53,0)');g.fillStyle=gr;g.save();g.scale(1,110/240);g.beginPath();g.arc(120,120,118,0,TAU);g.restore();g.fill();},1),o[1],o[2]+2,120,55);ctx.globalAlpha=1;if(!o[4])label('🚌 DETENTION BUS',o[1],o[2]-82,11,'#c62828');}const[v,fl]=vehView(o[3]);const full=o[4]>0?1:0;if(v==='side')blit(VSPR.bus_side(full),o[1],o[2],68,60,fl);else blit(VSPR.bus_front(full),o[1],o[2],28,66);const on=((performance.now()/160)|0)%2,ty=o[2]-(v==='side'?58:70);ctx.fillStyle=on?'#ff1744':'#2979ff';circle(o[1]-8,ty,4);ctx.fillStyle=on?'#2979ff':'#ff1744';circle(o[1]+8,ty,4);if(o[5]&&o[4]>0)label(`🚌 ${o[4]} detained`,o[1],o[2]-80,12,'#1f4e9c');break;}
   case 15:blit(VSPR.cow(o.sit?1:0),o.x,o.y,25,34,o.flip);break;
   case 16:blit(VSPR.dog(o.sit&&!(o.chase>0)?1:0),o.x,o.y,17,23,o.flip);break;
   case 17:drawPigeon(o);break;
   case 18:{const em={chai:'☕',samosa:'🥟',gamchha:'🧣',powerbank:'🔋',reel:'📱',funding:'💌'}[o[3]]||'⭐';const bob=Math.sin(performance.now()/300+o[0])*3;ctx.fillStyle='rgba(255,245,157,.35)';ellC(o[1],o[2],16,7);ctx.fillStyle='rgba(255,255,200,.25)';circle(o[1],o[2]-14+bob,14);blit(VSPR.emoji(em),o[1],o[2]-14+bob,14,15);break;}
   case 19:blit(VSPR.billboard(o.t),o.x,o.y,48,70);break;
   case 20:blit(VSPR.station(),o.x,o.y+20,45,60);label(o.n,o.x,o.y+32,11,'#1f4e9c');break;
   case 21:blit(VSPR.banner(o.n),o.x,o.y-70,60,66);break;
   case 22:{blit(VSPR.car_side('#fafafa'),o[0],o[1],32,34,o[2]<0);ctx.fillStyle=((performance.now()/120)|0)%2?'#ff1744':'#ffeb3b';circle(o[0],o[1]-34,4);break;}
   case 23:blit(VSPR.vajra(),o[0],o[1],58,70,false);label('VAJRA',o[0],o[1]+12,12,'#0d47a1');break;
   case 25:{const ST={golgappa:[VSPR.golgappa(),30,54],tanker:[VSPR.tanker(),50,56],selfie:[VSPR.selfie(),48,56],sulabh:[VSPR.sulabh(),35,62],paan:[VSPR.paan(),29,58]}[o.type];if(ST)blit(ST[0],o.x,o.y,ST[1],ST[2]);break;}
   case 26:blit(VSPR.site(),o.x,o.y+10,95,110);break;
   case 27:{const run=o[2];blit(VSPR.monkey(),o[0],o[1]-(run?Math.abs(Math.sin(performance.now()/60))*4:0),15,27,o[4]<0);if(o[3]){const em={chaiT:'☕',reelT:'📱',gamT:'🧣',pbT:'🔋'}[o[3]];if(em)blit(VSPR.emoji(em),o[0]+6,o[1]-30,14,15,false,.7);}break;}
   case 28:{const a=o[3]/100,side=Math.abs(Math.cos(a))>=Math.abs(Math.sin(a))*.8;if(side)blit(VSPR.varun(),o[1],o[2],58,64,Math.cos(a)<0);else blit(VSPR.varun_f(),o[1],o[2],28,64);
    if(o[4]){const sa=o[5]/100,nx=o[1]+Math.cos(sa)*20,ny=o[2]-42;ctx.fillStyle='rgba(120,190,255,.22)';ctx.beginPath();ctx.moveTo(nx,ny);ctx.arc(nx,ny,260,sa-.38,sa+.38);ctx.closePath();ctx.fill();for(let i=0;i<5;i++){const r=Math.random()*250,aa=sa+rand(-.3,.3);particles.push({x:nx+Math.cos(aa)*r,y:ny+Math.sin(aa)*r+30,vx:Math.cos(aa)*80,vy:Math.sin(aa)*80,life:.35,max:.35,c:'rgba(170,215,255,.85)',s:rand(2,4.5)});}}
    label('VARUN',o[1],o[2]+8,10,'#0d47a1');break;}
   case 32:{const t=performance.now()/1000+m0(o);const sc=Math.sin(t*1.3)>.6;blit(VSPR.monkey(),o.x,o.y-(sc?1.5:0),15,27,Math.sin(t*.3)>0);if(sc&&Math.sin(t*7)>0){ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(o.x+4,o.y-20,2,2);}break;}
   case 30:{blit(cctvSprite(),o.x,o.y,8,62);let tgt=null,bd=260*260;for(const v of VIEW){if(v.type!==0)continue;const dd=d2(v.x,v.y,o.x,o.y);if(dd<bd){bd=dd;tgt=v;}}if(meObj&&P.team==='P'&&d2(meObj.x,meObj.y,o.x,o.y)<bd)tgt=meObj;
    const want=tgt?Math.atan2(tgt.y-30-(o.y-48),tgt.x-o.x):Math.sin(performance.now()/1800+o.i)*1.2+Math.PI/2;o.a=o.a===undefined?want:o.a+angDiffC(want,o.a)*.12;const cx=o.x+14,cy=o.y-48,ca=o.a;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(ca);ctx.fillStyle='#eceff1';ctx.strokeStyle='#37474f';ctx.lineWidth=1.2;ctx.beginPath();ctx.rect(-7,-4.5,15,9);ctx.fill();ctx.stroke();ctx.fillStyle='#263238';ctx.fillRect(8,-3.5,3,7);ctx.restore();
    if(((performance.now()/500+o.i)|0)%2){ctx.fillStyle='#ff1744';circle(cx-4,cy-6,2);}break;}
   case 31:{if(P.team==='P'&&meObj&&d2(meObj.x,meObj.y,o.x,o.y)<450*450)blit(sprite('safeglow',120,56,g=>{const gr=g.createRadialGradient(60,28,4,60,28,58);gr.addColorStop(0,'rgba(76,175,80,.4)');gr.addColorStop(1,'rgba(76,175,80,0)');g.fillStyle=gr;g.save();g.scale(1,56/120);g.beginPath();g.arc(60,60,58,0,TAU);g.restore();g.fill();},1),o.x,o.y+6,60,28);blit(hideSprite(o.g?1:0),o.x,o.y,23,54);if(meObj&&d2(meObj.x,meObj.y,o.x,o.y)<300*300)label(o.n,o.x,o.y+14,10,o.g?'#e65100':'#1b5e20');break;}
   case 29:{if(o.t==='hole'){ctx.fillStyle='rgba(60,45,30,.55)';ctx.beginPath();ctx.ellipse(o.x,o.y,o.r,o.r*.45,0,0,TAU);ctx.fill();ctx.strokeStyle='rgba(120,110,95,.6)';ctx.lineWidth=1.5;ctx.stroke();break;}if(o.t==='manhole'){ctx.fillStyle='#5f5f5f';ctx.beginPath();ctx.ellipse(o.x,o.y,9,4.5,0,0,TAU);ctx.fill();ctx.strokeStyle='#3e3e3e';ctx.lineWidth=1;ctx.stroke();break;}if(o.t==='pcar'){blit(VSPR.car_side(o.c),o.x,o.y,32,36,o.f);break;}if(o.t==='rtree'){blit(VSPR.tree(o.v),o.x,o.y,32,70,false,o.s);break;}const f={bin:[VSPR.dustbin(),24,40],wall:[VSPR.spitwall(),40,44],pole:[VSPR.pole(),10,96]}[o.t];if(f)blit(f[0],o.x,o.y,f[1],f[2]);break;}
   case 24:{const me2=S.me;const look=lookFor(me2.team==='P'?0:1,me2.look,me2.mud);const dc=(()=>{const c=Math.cos(P.face),s=Math.sin(P.face);if(Math.abs(c)>Math.abs(s)*1.05)return c<0?3:2;return s>0?0:1;})();drawPersonV(o,look,dc,personFrame(o),true);break;}
  }}
 for(const g of AMB.pigeons)if(g.h>=1&&inV(g.x,g.y,40)){
   const shScale = Math.max(0.4, 1 - g.h / 120);
   ctx.fillStyle='rgba(22,16,10,0.22)';
   ellC(g.x + 8 * (1 - shScale), g.y + 4, 3.8 * shScale, 1.6 * shScale);
   drawPigeon(g);
 }
 if(meObj){// always on top, with a glow
  const me2=S.me;const L=lookFor(me2.team==='P'?0:1,me2.look,me2.mud);const c2=Math.cos(P.face),s2=Math.sin(P.face);const dc=Math.abs(c2)>Math.abs(s2)*1.05?(c2<0?3:2):(s2>0?0:1);
  const cy=meObj.y-124+Math.sin(performance.now()/170)*3.5;ctx.fillStyle=me2.team==='P'?'#ff6d00':'#1565c0';ctx.strokeStyle='#fff';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(meObj.x-10,cy-9);ctx.lineTo(meObj.x+10,cy-9);ctx.lineTo(meObj.x,cy+3);ctx.closePath();ctx.fill();ctx.stroke();}
 // show yourself through buildings
 if(meObj){for(const b of nearBuildings(meObj.x,meObj.y)){if(meObj.x>b.x-6&&meObj.x<b.x+b.w+6&&meObj.y<b.y-2&&meObj.y>b.y-b.H-10){ctx.globalAlpha=.5;const me2=S.me;drawPersonV(meObj,lookFor(me2.team==='P'?0:1,me2.look,me2.mud),0,0,true);ctx.globalAlpha=1;break;}}}
}
const FENCE=[];{const st=24/ZONE.R;for(let a=0;a<TAU;a+=st){if(Wd.gateAtAngle(a,-.03)>=0)continue;FENCE.push({x:ZONE.x+Math.cos(a)*ZONE.R,y:ZONE.y+Math.sin(a)*ZONE.R});}}
const TENTS=[{x:JM.x-95,y:JM.y+95,c:'#c62828'},{x:JM.x+100,y:JM.y+92,c:'#1565c0'},{x:JM.x+20,y:JM.y-120,c:'#ef6c00'}];
function drawPigeon(g){const y=g.y-g.h,flap=g.h>0?Math.sin(performance.now()/33+g.peck)*3:0;ctx.fillStyle=g.c;ellC(g.x,y-3,4,2.6);ctx.fillStyle='#6e737c';circle(g.x+3,y-5-(g.h>0?0:Math.max(0,Math.sin(g.peck))*1.5),1.8);if(g.h>0){ctx.fillStyle=g.c;ctx.beginPath();ctx.moveTo(g.x-1,y-4);ctx.lineTo(g.x-6,y-6-flap);ctx.lineTo(g.x+2,y-4);ctx.fill();ctx.beginPath();ctx.moveTo(g.x-1,y-3);ctx.lineTo(g.x+4,y-7+flap);ctx.lineTo(g.x+2,y-3);ctx.fill();}}
function drawJMMonument(){const x=JM.x,y=JM.y;
 ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.moveTo(x-14,y+60);ctx.lineTo(x+46,y+60);ctx.lineTo(x+26,y-60);ctx.lineTo(x-14,y-40);ctx.fill();
 ctx.strokeStyle='#c0513a';ctx.lineWidth=10;ctx.beginPath();ctx.arc(x,y+10,58,Math.PI*.05,Math.PI*.95);ctx.stroke();ctx.strokeStyle='#e08a6c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y+6,58,Math.PI*.05,Math.PI*.95);ctx.stroke();
 ctx.fillStyle='#d4664c';ctx.beginPath();ctx.moveTo(x-12,y+56);ctx.lineTo(x+12,y+56);ctx.lineTo(x+12,y-96);ctx.lineTo(x-12,y-40);ctx.closePath();ctx.fill();
 ctx.fillStyle='#b9503a';ctx.beginPath();ctx.moveTo(x+12,y+56);ctx.lineTo(x+20,y+50);ctx.lineTo(x+20,y-100);ctx.lineTo(x+12,y-96);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(255,220,200,.6)';ctx.lineWidth=1.5;for(let k=0;k<14;k++){const yy=y+52-k*10;ctx.beginPath();ctx.moveTo(x-12,yy);ctx.lineTo(x+12,yy);ctx.stroke();}
 ctx.fillStyle='#f4d8c8';ctx.fillRect(x-5,y-30,10,10);}
function drawJaiPrakash(){for(const[ox,oy]of[[-88,-30],[-88,30]]){const x=JM.x+ox,y=JM.y+oy;ctx.fillStyle='rgba(0,0,0,.15)';ellC(x+3,y+6,26,12);ctx.fillStyle='#c0513a';ctx.fillRect(x-24,y-6,48,10);ctx.fillStyle='#d97c5d';ellC(x,y-6,24,10);ctx.fillStyle='#a8452f';ellC(x,y-5,18,7);}
 const x=JM.x+90,y=JM.y+16;ctx.fillStyle='rgba(0,0,0,.15)';ellC(x+3,y+12,32,12);ctx.fillStyle='#c0513a';ctx.fillRect(x-30,y-22,60,30);ctx.fillStyle='#d4664c';ellC(x,y+8,30,11);ctx.fillStyle='#e4a088';ellC(x,y-22,30,11);ctx.fillStyle='#f0d6c6';ellC(x,y-22,20,7);ctx.fillStyle='#8d3a28';for(let i=-2;i<=2;i++)ctx.fillRect(x+i*11-3,y-14,6,14);}
function drawDynamicGround(){
 const aura=sprite('aura',200,100,g=>{const gr=g.createRadialGradient(100,50,4,100,50,98);gr.addColorStop(0,'rgba(255,152,0,.30)');gr.addColorStop(.75,'rgba(255,152,0,.12)');gr.addColorStop(1,'rgba(255,152,0,0)');g.fillStyle=gr;g.save();g.scale(1,.5);g.beginPath();g.arc(100,100,98,0,TAU);g.restore();g.fill();},1);
 {const t=performance.now();for(const o of VIEW)if(o.type===0&&o.k>=3&&inV(o.x,o.y,140)){const rr=34+Math.sqrt(o.k)*17,s=rr/100;if(o.k>=5)ctx.drawImage(aura,o.x-100*s,o.y-50*s,200*s,100*s);const hot=S.me&&S.me.team==='C';ctx.save();ctx.setLineDash([10,6]);ctx.lineDashOffset=-t/60;ctx.strokeStyle=hot?'rgba(229,57,53,.75)':'rgba(255,109,0,.6)';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(o.x,o.y,rr,rr*.5,0,0,TAU);ctx.stroke();ctx.restore();}}
 if(S.me&&S.me.team==='P'&&S.me.k>=3&&S.me.st==='active'){const rr=34+Math.sqrt(S.me.k)*17,s=rr/100;ctx.drawImage(aura,PX()-100*s,PY()-50*s,200*s,100*s);ctx.save();ctx.setLineDash([10,6]);ctx.lineDashOffset=-performance.now()/60;ctx.strokeStyle='rgba(255,109,0,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(PX(),PY(),rr,rr*.5,0,0,TAU);ctx.stroke();ctx.restore();}
 {const RC=ZONE.R+230;if(inV(ZONE.x,ZONE.y,RC+40)){ctx.save();ctx.setLineDash([14,12]);ctx.strokeStyle='rgba(211,47,47,.35)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ZONE.x,ZONE.y,RC,0,TAU);ctx.stroke();ctx.restore();label('SECTION 163 ZONE · LAYER 1',ZONE.x,ZONE.y-RC-14,13,'#b71c1c');label('LAYER 2 · GATES',ZONE.x,ZONE.y-ZONE.R-22,11,'#8e1b10');}}
 if(inV(JM.x,JM.y,JM.r+80)){const n=S.rd[15]|0,t=performance.now(),pulse=.5+.5*Math.sin(t/330),heat=Math.min(1,n/40);
  ctx.globalAlpha=.25+heat*.55;ctx.drawImage(aura,JM.x-JM.r*1.35,JM.y-JM.r*.95,JM.r*2.7,JM.r*1.9);ctx.globalAlpha=1;
  ctx.strokeStyle=`rgba(255,${153-heat*90|0},51,${.35+.3*pulse+heat*.3})`;ctx.lineWidth=6+heat*6;ctx.beginPath();ctx.arc(JM.x,JM.y,JM.r+6+pulse*6,0,TAU);ctx.stroke();
  for(const m of MATS){ctx.fillStyle='#f5efdc';ctx.strokeStyle='#bfa874';ctx.lineWidth=1.5;ctx.beginPath();ctx.rect(m.x-18,m.y-8,36,16);ctx.fill();ctx.stroke();ctx.fillStyle='#e0d3ad';ctx.fillRect(m.x-18,m.y-2,36,3);}
  if(P.team==='P'&&nearMe(JM.x,JM.y,JM.r+60))for(const m of MATS)label('🙏 ANSHAN',m.x,m.y+16,9,'#6d4c41');
  const nf=Math.min(24,Math.floor(n/3));for(let i=0;i<nf;i++){const a=i/nf*TAU,fx0=JM.x+Math.cos(a)*(JM.r+16),fy0=JM.y+Math.sin(a)*(JM.r+16)*.92,w=Math.sin(t/180+i)*2;ctx.fillStyle='#795548';ctx.fillRect(fx0-.8,fy0-30,1.6,30);ctx.fillStyle='#ff9933';ctx.fillRect(fx0+1,fy0-30+w*.3,12,3);ctx.fillStyle='#fff';ctx.fillRect(fx0+1,fy0-27+w*.3,12,3);ctx.fillStyle='#138808';ctx.fillRect(fx0+1,fy0-24+w*.3,12,3);}
  if(n>=12){petalT-=1/60;if(petalT<=0){petalT=.35-heat*.25;for(let i=0;i<1+heat*3;i++){const a=Math.random()*TAU,r=Math.random()*JM.r;particles.push({x:JM.x+Math.cos(a)*r,y:JM.y+Math.sin(a)*r-140,vx:rand(-15,15),vy:rand(35,60),life:2.6,max:2.6,c:Math.random()<.5?'#ff9800':'#ffd600',s:rand(2.5,4)});}}
   if(nearMe(JM.x,JM.y,700)&&t-dholT>2600-heat*1400){dholT=t;SFX.chant();}}}
 for(const m of METRO){if(!inV(m.x,m.y,60))continue;const cl=S.closed.includes(m.n);blit(metroSprite(cl),m.x,m.y+18,42,62);label(m.n+(cl?' (CLOSED)':''),m.x,m.y+32,12,'#4a148c');}
 if(S.info)for(const p of S.info.pockets)if(inV(p[0],p[1],80)){ctx.fillStyle='rgba(255,153,51,.13)';ellC(p[0],p[1]+20,62,38);}
}
function drawGas(dyn){const puff=gasPuff();
 for(const c of dyn.cans){const[id,x,y,h,r,fresh]=c;
  if(r<1){if(!inV(x,y,60))continue;ctx.fillStyle='rgba(0,0,0,.25)';ellC(x,y,4,2);ctx.fillStyle='#555';ctx.fillRect(x-5,y-h-2.5,10,5);for(let q=0;q<2;q++)particles.push({x:x+rand(-3,3),y:y-h+rand(-3,3),vx:rand(-8,8),vy:rand(-14,-4),life:.9,max:.9,c:'rgba(230,230,226,.75)',s:rand(4,8)});continue;}
  if(!inV(x,y,r+60))continue;const tt=performance.now()/2600,dr=(performance.now()/1000+id)%40*1.2;for(let k=0;k<11;k++){const a=k*TAU/11+tt*(k%2?1:-1)+id,r2=r*(.25+.35*((k*7)%3)/2),s=r*(1+.35*Math.sin(tt*2+k)),dx=Math.cos(a)*r2+dr*.6,dy=Math.sin(a)*r2*.7-14-k*1.5;ctx.globalAlpha=.42+.12*Math.sin(tt*3+k);ctx.drawImage(puff,x+dx-s/2,y+dy-s/2,s,s);}ctx.globalAlpha=1;
  ctx.fillStyle=fresh?'#ff7043':'#666';ctx.fillRect(x-6,y-3,12,6);if(fresh&&P.team==='P'){ctx.strokeStyle='rgba(255,112,67,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,12+Math.sin(performance.now()/80)*3,6,0,0,TAU);ctx.stroke();}}}
function drawFx(){
 for(const p of particles){const al=clamp(p.life/p.max,0,1);if(p.pow){let k=1-al,sc=k<.2?.5+k/.2*.75:1.25-.25*Math.min(1,(k-.2)/.3);const cs=powSprite(p.pow);const bg=p.big||1;sc*=bg;ctx.globalAlpha=al<.3?al/.3:1;ctx.drawImage(cs,p.x-cs.ww*sc/2,p.y-cs.hh*sc/2-k*10,cs.ww*sc,cs.hh*sc);ctx.globalAlpha=1;continue;}if(p.emo||p.cap){ctx.save();ctx.globalAlpha=al;ctx.translate(p.x,p.y);ctx.rotate(p.rot);if(p.cap)ctx.drawImage(VSPR.cap(),-10,-6,20,12);else ctx.drawImage(VSPR.emoji(p.emo),-9,-9,18,18);ctx.restore();continue;}if(p.ring){ctx.strokeStyle=p.c+al*.7+')';ctx.lineWidth=5/cam.z;ctx.beginPath();ctx.ellipse(p.x,p.y,p.R*(1-al),p.R*(1-al)*.6,0,0,TAU);ctx.stroke();}else if(p.txt){ctx.globalAlpha=al;otext(p.txt,p.x,p.y,p.s/cam.z,p.c,'rgba(0,0,0,.65)',4/p.s);ctx.globalAlpha=1;}else{ctx.globalAlpha=al;ctx.fillStyle=p.c;circle(p.x,p.y,p.s);ctx.globalAlpha=1;}}
 for(const c of confetti){ctx.fillStyle=c.c;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.rot);ctx.fillRect(-3,-1.5,6,3);ctx.restore();}
 const s=12/cam.z;ctx.font=`700 ${s}px "Segoe UI",sans-serif`;
 const near3=new Set(bubbles.filter(b=>b.id!==S.myId&&!b.lx).map(b=>{const o=VBYID.get(b.id);const x=o?o.x:b.x,y=o?o.y:b.y;return[b,x===undefined?1e12:d2(x,y,PX(),PY())];}).sort((a,b)=>a[1]-b[1]).slice(0,3).map(q=>q[0]));
 for(const b of bubbles){if(b.id!==S.myId&&!b.lx&&!near3.has(b))continue;let x,y;if(b.lx){x=b.lx.x;y=b.lx.y-48;}else if(b.id===S.myId){x=PX();y=PY()-128;}else{const o=VBYID.get(b.id);if(o){x=o.x;y=o.y-(o.k>=3?124:104);}else if(b.x!==undefined){x=b.x;y=b.y-100;}else continue;}if(!inV(x,y,100))continue;
  const w=(textW(b.txt,'700 12px "Segoe UI",sans-serif')+12)/cam.z,h=s*1.6;ctx.globalAlpha=Math.min(1,b.life*3);ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.5/cam.z;rrect(ctx,x-w/2,y-h,w,h,6/cam.z);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-4/cam.z,y);ctx.lineTo(x,y+6/cam.z);ctx.lineTo(x+4/cam.z,y);ctx.fill();ctx.fillStyle='#222';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.txt,x,y-h/2);ctx.globalAlpha=1;}
}
function drawWorldUI(){
 const fs=12/cam.z,z=cam.z;
 const bar=(x,y,hp,max,push,hold,armor,title)=>{const bw=92/z*.9,bh=8/z*.9;ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x-bw/2-2,y-bh/2-2,bw+4,bh+4);const f=clamp(hp/max,0,1);ctx.fillStyle=f>.6?'#66bb6a':f>.3?'#ffa726':'#ef5350';ctx.fillRect(x-bw/2,y-bh/2,bw*f,bh);if(armor>0){ctx.fillStyle='#bdbdbd';ctx.fillRect(x-bw/2,y-bh/2-bh-3/z,bw*Math.min(1,armor/90),bh*.7);}
  const t=push>0?`👊 ${Math.round(push)} vs 🛡 ${Math.round(hold)}`:title;if(t)otext(t,x,y+bh+fs*.8,fs,push>hold*.7&&push>0?'#ffcc80':'#fff','rgba(0,0,0,.6)',.3);};
 GATE_DEFS.forEach((g,gi)=>{if(!inV(g.x,g.y,160))return;const G=S.gates[gi];const x=g.x+g.nx*62,y=g.y+g.ny*62-34;if(G[0])bar(x,y,G[1],100,G[2]/10,G[3]/10,G[4],`${g.name.toUpperCase()} GATE`);else{label(`${g.name.toUpperCase()} GATE OPEN!`,x,y,fs,'#e65100');if(G[5]>0){const bw=92/z*.9,bh=8/z*.9;ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x-bw/2-2,y+fs-2,bw+4,bh+4);ctx.fillStyle='#64b5f6';ctx.fillRect(x-bw/2,y+fs,bw*G[5]/100,bh);}}});
 for(const b of S.bars)if(b.up&&inV(b.x,b.y,160)&&(b.hp<b.max||b.push>0||nearMe(b.x,b.y,300)))bar(b.x,b.y-46,b.hp,b.max,b.push,b.hold,b.armor,b.check===2?'SECTION 163 CORDON':b.check?'POLICE CHECKPOINT':'BARRICADE');
 if(inV(JM.x,JM.y,260))label('JANTAR MANTAR',JM.x,JM.y-JM.r-36,16/z,'#8e1b10');
 if(S.info)for(const p of S.info.pockets)if(inV(p[0],p[1],100)&&nearMe(p[0],p[1],520))label(p[3],p[0],p[1]-76,10/z,'#e65100');
 // names & wanted stars
 for(const o of VIEW){if(!inV(o.x,o.y,60))continue;const nm=S.names.get(o.id);const stars=o.wl>0?'⭐'.repeat(o.wl):'';if(!nm&&!stars)continue;if(nm&&nm.kind===0&&!(o.fl&32))continue;label((stars?stars+' ':'')+(nm?(o.type===0&&nm.kind?(Wd.MUDDAS[nm.mud|0]||{e:''}).e+' ':'')+nm.n:''),o.x,o.y-88,11/z,o.type===0?'#7a3300':'#0d2f6b');if(o.type===0&&o.k>=3){const t=KTIER(o.k);label(`✊ ${o.k}${t[0]?' '+t[0]:''}`,o.x,o.y-104,(o.k>=10?13:11)/z,t[1]||'#7a3300');}}
 if(S.me&&(S.me.st==='active')){const me=S.me;const x=PX(),y=PY();label((me.wl?'⭐'.repeat(me.wl)+' ':'')+(S.names.get(S.myId)||{n:'You'}).n,x,y-90,13/z,'#5d2a00');if(me.team==='P'&&me.k>=3){const t=KTIER(me.k);label(`✊ ${me.k}${t[0]?' '+t[0]:''}`,x,y-108,(me.k>=10?15:12)/z,t[1]||'#7a3300');}
  for(const o of VIEW)if(o.type===2&&o.look===0&&nearMe(o.x,o.y,260)){const nm=S.names.get(o.id);label((nm?nm.n:'📺 TV')+(o.wl?' · click: interview 🎤':' · ad break…'),o.x,o.y-78,11/z,o.wl?'#ad1457':'#777');}
  for(const s of Wd.STALLS)if(nearMe(s.x,s.y,160)){const t={golgappa:'🌶️ Golgappe: full stamina',tanker:'💦 Jal Board: wash off gas',selfie:'🤳 Selfie point: LIVE ×2',sulabh:'🚻 Sulabh ₹5: stamina',paan:'🍃 Paanwala: rumours'}[s.type];if(t)label(t+' (walk in)',s.x,s.y-74,11/z,'#4e342e');}
  if(me.team==='P'){let r=null,bd=65*65;for(const q of S.snaps.length?S.snaps[S.snaps.length-1].riders.values():[]){if(q[4]>=0)continue;const dd=d2(q[1],q[2],P.x,P.y);if(dd<bd){bd=dd;r=q;}}if(r&&me.cd[1]<=0)label('[E] Lift lo! 🛵',r[1],r[2]-64,12/z,'#c62828');
}
  else{let t=null,bd=50*50;for(const o of VIEW){if(o.type!==0||(o.fl&(4096|16|8)))continue;const dd=d2(o.x,o.y,P.x,P.y);if(dd<bd){bd=dd;t=o;}}if(t){ctx.strokeStyle='#ff1744';ctx.lineWidth=3/z;ctx.setLineDash([5/z,4/z]);ctx.beginPath();ctx.ellipse(t.x,t.y,16,7,0,0,TAU);ctx.stroke();ctx.setLineDash([]);}
   if(me.cd[2]<=0&&!isTouch){const wx=cam.x+(input.mx-W/2)/z,wy=cam.y+(input.my-H/2)/z,d=dist(P.x,P.y,wx,wy);const k=Math.min(1,470/Math.max(1,d));ctx.strokeStyle='rgba(255,255,255,.7)';ctx.setLineDash([6/z,6/z]);ctx.lineWidth=2/z;ctx.beginPath();ctx.ellipse(P.x+(wx-P.x)*k,P.y+(wy-P.y)*k,30,18,0,0,TAU);ctx.stroke();ctx.setLineDash([]);}}}
}

// =================================================================== HUD
let miniC=null,miniM=0;
function buildMini(){miniM=Math.round(clamp(Math.min(W,H)*.28,140,230));miniC=document.createElement('canvas');miniC.width=miniC.height=Math.round(miniM*DPR);const g=miniC.getContext('2d');const k=miniM*DPR/WORLD;g.scale(k,k);
 g.fillStyle='#efe2c4';g.fillRect(0,0,WORLD,WORLD);for(const p of PARKS){g.fillStyle=p.ground?'#c9ad80':'#a9c98a';if(p.t==='c'){g.beginPath();g.arc(p.x,p.y,p.r,0,TAU);g.fill();}else g.fillRect(p.x,p.y,p.w,p.h);}
 g.fillStyle='#7d8458';g.beginPath();for(let y=0;y<=WORLD;y+=60)g.lineTo(riverL(y),y);for(let y=WORLD;y>=0;y-=60)g.lineTo(riverL(y)+300,y);g.fill();
 g.strokeStyle='#8d8577';g.lineCap='round';g.lineJoin='round';const mw=WORLD/miniM*1.4;for(const r of ROADS){g.lineWidth=Math.max(r.w,mw);g.beginPath();r.p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}for(const c of RINGS){g.lineWidth=Math.max(c.w,mw);g.beginPath();g.arc(c.x,c.y,c.r,0,TAU);g.stroke();}
 g.fillStyle='#9e8a66';for(const d of DEST)g.fillRect(d.x-80,d.y-80,160,160);g.strokeStyle='#c0392b';g.lineWidth=40;g.beginPath();g.arc(ZONE.x,ZONE.y,ZONE.R,0,TAU);g.stroke();miniDirty=false;}
function panel(x,y,w,h,a){ctx.fillStyle=`rgba(25,18,10,${a||.62})`;rrect(ctx,x,y,w,h,10);ctx.fill();}
const OTX=new Map();
function otext(t,x,y,s,fill,stroke,lwr){const k=ctx.getTransform().a,px=Math.max(6,Math.round(s*k)),key=t+'|'+fill+'|'+stroke+'|'+px;let cv=OTX.get(key);
 if(!cv){if(OTX.size>800)OTX.clear();cv=document.createElement('canvas');const g=cv.getContext('2d'),f=`900 ${px}px "Segoe UI",sans-serif`,lw=px*lwr;g.font=f;const w=Math.ceil(g.measureText(t).width+lw*2)+4,h=Math.ceil(px*1.5+lw)+2;cv.width=w;cv.height=h;g.font=f;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=lw;g.strokeStyle=stroke;g.strokeText(t,w/2,h/2);g.fillStyle=fill;g.fillText(t,w/2,h/2);OTX.set(key,cv);}
 ctx.drawImage(cv,x-cv.width/2/k,y-cv.height/2/k,cv.width/k,cv.height/k);}
const MWC=new Map(),MCX=document.createElement('canvas').getContext('2d');
function textW(t,font){const key=font+'|'+t;let w=MWC.get(key);if(w===undefined){if(MWC.size>2500)MWC.clear();MCX.font=font;w=MCX.measureText(t).width;MWC.set(key,w);}return w;}
const TXC=new Map(),TXN=new Map();
function txt(t,x,y,font,c,al,bl){ctx.font=font;if((bl&&bl!=='middle')||typeof c!=='string'){ctx.fillStyle=c;ctx.textAlign=al||'left';ctx.textBaseline=bl||'middle';ctx.fillText(t,x,y);return;}
 const k=ctx.getTransform().a,key=t+'|'+font+'|'+c+'|'+k.toFixed(2);let cv=TXC.get(key);
 if(!cv){const n=(TXN.get(key)||0)+1;if(n<30){TXN.set(key,n);if(TXN.size>4000)TXN.clear();ctx.fillStyle=c;ctx.textAlign=al||'left';ctx.textBaseline='middle';ctx.fillText(t,x,y);return;}
  TXN.delete(key);const m=/(\d+(?:\.\d+)?)px/.exec(font),size=m?+m[1]:12,f2=m?font.replace(m[0],(size*k).toFixed(2)+'px'):font;cv=document.createElement('canvas');const g=cv.getContext('2d');g.font=f2;const w=Math.ceil(g.measureText(t).width)+4,h=Math.ceil(size*k*1.6)+2;cv.width=w;cv.height=h;g.font=f2;g.fillStyle=c;g.textBaseline='middle';g.fillText(t,2,h/2);cv.k=k;if(TXC.size>1200)TXC.clear();TXC.set(key,cv);}
 const kk=cv.k,w=cv.width/kk,h=cv.height/kk,A=al||'left';const dx=A==='center'?x-w/2:A==='right'?x-w+2/kk:x-2/kk;ctx.drawImage(cv,dx,y-h/2,w,h);}
const fmtT=s=>{s=Math.max(0,Math.ceil(s));return`${(s/60)|0}:${String(s%60).padStart(2,'0')}`;};
const cut=(s,n)=>{const a=Array.from(String(s));return a.length>n?a.slice(0,n).join('')+'…':a.join('');};
const km=px=>(px*0.004).toFixed(1);
function objective(me){
 if(me.st==='hidden')return['🙈 Hiding… the police lost your trail','#c5e1a5'];
 if(me.fast!==undefined)return['🙏 Anshan: stay down! Your kafila must protect you from the RAF','#ffcc80'];
 if(me.st==='carried')return['😱 UTHA LIYA! Keep clicking to wriggle free, or get rescued!','#ef9a9a'];
 if(me.st==='bus'||me.st==='escort')return['🚌 Detained…','#90caf9'];if(me.st==='riding')return['🛵 Riding towards Jantar Mantar…','#ffcc80'];if(me.st==='arrived')return['✊ PAHUNCH GAYE! Next run starts soon…','#ffcc80'];
 if(me.team==='P'){
  if(me.push){const[pu,ho]=me.push.map(v=>v/10);return pu>ho*.7?[`👊 PUSH! ${Math.round(pu)} vs ${Math.round(ho)}, it's breaking!`,'#ffcc80']:[`👊 ${Math.round(pu)} vs ${Math.round(ho)}: not enough! Hold click to push harder, bring more people`,'#ef9a9a'];}
  const dz=dist(P.x,P.y,ZONE.x,ZONE.y);const open=GATE_DEFS.findIndex((g,i)=>!S.gates[i][0]);
  if(me.inP)return[`✊ HOLD THE DHARNA! ×${me.mult} points · keep your kafila around you`,'#ffcc80'];
  if(dz<ZONE.R)return[me.hold>0?'➜ Get back into the plaza circle! Your dharna is paused':'➜ Into the plaza circle! Almost there!','#ffcc80'];
  if(dz<ZONE.R+500)return open>=0?[`🚧 ${GATE_DEFS[open].name} gate is OPEN. Run in!`,'#a5d6a7']:['🚧 Gates are locked. Push one with your kafila (you need more pushers than cops)','#fff'];
  if(me.k<4)return[`🙋 Build a kafila (${me.k}): walk into 🙋 people to grow it, then head for Jantar Mantar`,'#fff'];
  return[`✊ Kafila of ${me.k}. Reach Jantar Mantar, ${km(dz-ZONE.R)} km to the police ring. Avoid ⭐ hunters!`,'#fff'];}
 if(me.carry)return['🚌 Carry them to the detention bus! Follow the arrow ➜','#90caf9'];
 const wanted=S.lb.filter(l=>l[3]==='P'&&l[5]>0).sort((a,b)=>b[5]-a[5])[0];
 const atk=GATE_DEFS.findIndex((g,i)=>S.gates[i][0]&&S.gates[i][2]>15);const open=GATE_DEFS.findIndex((g,i)=>!S.gates[i][0]);
 if(open>=0)return[`🚨 ${GATE_DEFS[open].name} gate broken! It repairs itself once protesters clear out, so push them back!`,'#ef9a9a'];
 if(atk>=0)return[`🚨 ${GATE_DEFS[atk].name} gate under attack! Defend it`,'#ef9a9a'];
 if(wanted)return[`📄 ${wanted[1]} has ${wanted[5]} FIR${wanted[5]>1?'s':''}! Catch them for a bounty`,'#ffd54f'];
 return['👮 Hunt protesters across Delhi. Detain leaders 📣 to scatter crowds','#90caf9'];
}
function crowdEnergy(dt){const me=S.me;const k=me&&me.team==='P'&&me.st==='active'&&playing?me.k:0;murmur(Math.min(.05,k*.0022));
 if(k>=8){beatT-=dt;if(beatT<=0){const v=Math.min(1,.45+k/40);beatT=Math.max(.3,.62-k*.012);beatN++;if(beatN%4===2)SFX.tin(v);else SFX.dha(v);
  if(beatN%2===0){const now=performance.now();let n=0;for(const o of VIEW){if(o.type!==0||n>=Math.min(14,k))continue;if(d2(o.x,o.y,PX(),PY())<170*170){CHEERS.set(o.id,{t0:now+Math.random()*90});n++;}}}}}else beatN=0;}
function drawCursor(){if(!playing||!mouseOn)return;const me=S.me;const x=input.mx,y=input.my,col=P.team==='P'?'#ff6d00':'#1e88e5',t=performance.now();
 if(me&&me.st==='active'){const sx=W/2+(PX()-cam.x)*cam.z,sy=H/2+(PY()-cam.y)*cam.z,d=Math.hypot(x-sx,y-sy);if(d>34){ctx.save();ctx.setLineDash([5,7]);ctx.lineDashOffset=-t/40;ctx.strokeStyle=P.team==='P'?'rgba(255,109,0,.45)':'rgba(30,136,229,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx+(x-sx)/d*20,sy+(y-sy)/d*20);ctx.lineTo(x-(x-sx)/d*14,y-(y-sy)/d*14);ctx.stroke();ctx.restore();}}
 const r=10+Math.sin(t/180)*1.5;ctx.lineWidth=6;ctx.strokeStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
 if(P.team==='C'){ctx.lineWidth=2.5;for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*(r+3),y+Math.sin(a)*(r+3));ctx.lineTo(x+Math.cos(a)*(r+9),y+Math.sin(a)*(r+9));ctx.stroke();}}
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,2.6,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=1;ctx.stroke();}
function drawHUD(dt){crowdEnergy(dt);
 ctx.setTransform(DPR,0,0,DPR,0,0);
 const me=S.me;if(me&&isTouch){const lab=me.team==='P'?(me.st==='carried'?'WRIGGLE!':CTX_BTN[me.ctx|0]||'NAARA'):'LATHI';if(lab!==actLabel){actLabel=lab;bAct.textContent=lab;}}
 if(me&&me.team==='P'&&S.snaps.length){const mine=S.snaps[S.snaps.length-1].ents.get(S.myId);if(mine&&(mine[5]&2))vignette('gas',80,'rgba(200,220,150,0)','rgba(140,175,80,.42)');}
 if(flashT>0){ctx.fillStyle=`rgba(255,255,255,${flashT*2})`;ctx.fillRect(0,0,W,H);}
 if(hurtT>0){hurtT-=dt;ctx.globalAlpha=Math.min(1,hurtT*2.4);vignette('hurt',Math.min(W,H)*.2,'rgba(255,0,0,0)','rgba(220,20,20,.6)');ctx.globalAlpha=1;}
 const th=28;ctx.fillStyle='#111';ctx.fillRect(0,H-th,W,th);ctx.font='600 13.5px "Segoe UI",sans-serif';ctx.textBaseline='middle';ctx.textAlign='left';
 if(!TICK.items){TICK.items=ticker.split('   ◆   ').map(s=>{const t=s+'   ◆   ';return{t,w:ctx.measureText(t).width,cv:null};});TICK.total=TICK.items.reduce((a,b)=>a+b.w,0);}
 tickerX-=80*dt;if(tickerX<-TICK.total)tickerX+=TICK.total;
 ctx.save();ctx.beginPath();ctx.rect(104,H-th,W-104,th);ctx.clip();{let x=104+tickerX;for(let lap=0;lap<2&&x<W;lap++)for(const it of TICK.items){if(x>=W)break;if(x+it.w>104){if(!it.cv||it.cv.k!==DPR){const cv=document.createElement('canvas');cv.width=Math.ceil(it.w*DPR)+2;cv.height=Math.ceil(th*DPR);const g=cv.getContext('2d');g.scale(DPR,DPR);g.font='600 13.5px "Segoe UI",sans-serif';g.fillStyle='#ffeb3b';g.textBaseline='middle';g.fillText(it.t,0,th/2);cv.k=DPR;it.cv=cv;}ctx.drawImage(it.cv,x,H-th,it.cv.width/DPR,th);}else if(it.cv)it.cv=null;x+=it.w;}}ctx.restore();
 ctx.fillStyle='#d32f2f';ctx.fillRect(0,H-th,98,th);txt('BREAKING',12,H-th/2,'900 13.5px "Segoe UI",sans-serif','#fff');
 if(!me||!playing)return;
 const P_=me.team==='P',R=S.rd;
 // top centre: round + team race
 const tw=Math.min(W-24,480),tx=W/2-tw/2;panel(tx,10,tw,82,.76);
 txt(`⏱ ${fmtT(R[0])}`,tx+14,27,'900 18px "Segoe UI",sans-serif',R[0]<60?'#ff8a80':'#fff');txt(`Round ${R[7]} · ✊${R[13]|0}–${R[14]|0}👮`,tx+tw-14,27,'700 12px "Segoe UI",sans-serif','#bbb','right');
 const mx=tx+14,mw=tw-28,my=40;ctx.fillStyle='rgba(255,255,255,.15)';rrect(ctx,mx,my,mw,14,7);ctx.fill();const f=clamp(R[1]/R[2],0,1);ctx.fillStyle='#ff9933';rrect(ctx,mx,my,Math.max(14,mw*f),14,7);ctx.fill();
 txt(`✊ DHARNA ${R[15]|0} log · POWER ${R[1]}/${R[2]}   ·   👮 DETAINED ${R[3]}${R[11]>=0?'   ·   🚨 RAF wave '+((R[10]|0)+1)+' in '+R[11]+'s':''}`,W/2,my+7,'900 10.5px "Segoe UI",sans-serif','#fff','center');
 const[ob,oc]=objective(me);txt(ob,W/2,74,'800 12.5px "Segoe UI",sans-serif',oc,'center');
 // player panel
 panel(12,12,236,128);
 txt(P_?`${Wd.MUDDAS[me.mud|0].e} ${Wd.MUDDAS[me.mud|0].n.toUpperCase()}`:'👮 DILLI POLICE',24,28,'900 13px "Segoe UI",sans-serif',P_?'#ffb74d':'#90caf9');txt(P_?`✊ ${me.k}`:`🚌 ${me.stats.det}`,238,30,'900 18px "Segoe UI",sans-serif',P_?'#ffcc80':'#90caf9','right');
 const scs=`${me.sc}`;txt(scs,24,52,'900 24px "Segoe UI",sans-serif','#fff');txt('pts',24+textW(scs,'900 24px "Segoe UI",sans-serif')+5,56,'700 11px "Segoe UI",sans-serif','#bbb');
 if(me.live){ctx.fillStyle=((performance.now()/333)|0)%2?'#d32f2f':'#b71c1c';rrect(ctx,170,42,68,20,4);ctx.fill();txt('● LIVE ×2',204,52,'900 11px "Segoe UI",sans-serif','#fff','center');}
 if(P_&&me.k>=5){const t=KTIER(me.k);txt(t[0],238,48,'900 11px "Segoe UI",sans-serif',t[1],'right');}
 if(P_)txt(`Kafila ${me.k} (${me.ks||0} ${Wd.MUDDAS[me.mud|0].e})  ·  Streak ${me.stk}`,24,76,'700 12px "Segoe UI",sans-serif','#ffe0b2');else txt(`Detained ${me.stats.det}  ·  Gas ${me.stats.gas}`,24,76,'700 12px "Segoe UI",sans-serif','#bbdefb');
 if(P_){firPulse=Math.max(0,firPulse-dt*1.5);const fx0=258,fy0=12;panel(fx0,fy0,132,44,.62);txt(me.wl?['','Suspicious','Urban Naxal','Toolkit gang','Tukde tukde','100% ANTI-NATIONAL'][me.wl]:'📄 FIR: clean (for now)',fx0+10,fy0+11,'900 10px "Segoe UI",sans-serif',me.wl>=5?'#ff5252':me.wl?'#ffab40':'#888');
  for(let i=0;i<5;i++){const on=i<me.wl,sx=fx0+16+i*25,sy=fy0+29,pul=on&&i===me.wl-1?1+firPulse*.6:1;starPath(sx,sy,9*pul);ctx.fillStyle=on?'#ffd54f':'rgba(255,255,255,.08)';ctx.fill();ctx.lineWidth=1.6;ctx.strokeStyle=on?'#5d4037':'rgba(255,255,255,.35)';ctx.stroke();}}
 if(me.fast!==undefined){const f=me.fast/40;ctx.globalAlpha=Math.min(.75,f*.8);vignette('hunger',Math.min(W,H)*.25,'rgba(0,0,0,0)','rgba(20,10,0,.75)');ctx.globalAlpha=1;const ay=H-210;panel(W/2-160,ay-26,320,54,.85);txt(`🙏 ANSHAN ${Math.floor(me.fast)}s / 40s · ×2 dharna points`,W/2,ay-10,'900 14px "Segoe UI",sans-serif','#ffcc80','center');ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(W/2-140,ay+6,280,6);ctx.fillStyle='#ffab40';ctx.fillRect(W/2-140,ay+6,280*Math.min(1,f),6);txt('Click to get up · police can lift you while you lie here',W/2,ay+20,'700 10px "Segoe UI",sans-serif','#ddd','center');}
 if(me.st==='hidden'&&me.hide){const sx=W/2+(PX()-cam.x)*cam.z,sy=H/2+(PY()-cam.y)*cam.z;label('👀',sx+Math.sin(performance.now()/300)*6,sy-30,22,'#fff',false);panel(W/2-150,H*.62-24,300,50,.82);txt(`🙈 Hidden in ${me.hide[1]} · ${me.hide[0]}s`,W/2,H*.62-8,'900 14px "Segoe UI",sans-serif','#c5e1a5','center');txt('Police lost track of you · click to come out',W/2,H*.62+12,'700 11px "Segoe UI",sans-serif','#ddd','center');}

 const cd=me.cd.map(v=>v/10);const cdt=(n,v,lab)=>[`${n} ${lab} ${v>0?v.toFixed(0)+'s':'✓'}`,v>0?'#aaa':'#a5d6a7'];
 const rows=P_?[[`🖱️ Click: ${(CTX_TXT[me.ctx]||'✊ Naara').replace(/^\S+ (CLICK: |HOLD CLICK: )?/,'')}`,'#ffcc80'],cdt('🛵',cd[1],'Ride')]:[cdt('🖱️ Click',cd[3],'Lathi'),cdt('Right-click',cd[2],'Tear gas')];
 txt(rows[0][0],24,98,'800 11.5px "Segoe UI",sans-serif',rows[0][1]);txt(rows[1][0],P_?160:130,98,'800 11.5px "Segoe UI",sans-serif',rows[1][1]);
 const iconY=118;const bf=me.bf,icons=[['☕',bf[0]],['🧣',bf[1]],['🔋',bf[2]],['📱',bf[3]]].filter(b=>b[1]>0);let bx=24;for(const[e,t]of icons){txt(`${e}${t}s`,bx,iconY,'800 12px "Segoe UI",sans-serif','#fff');bx+=52;}
 if(!icons.length)txt(P_?'Point the mouse to walk · walk into people to recruit':'Point the mouse to walk · cursor on you = stop',24,iconY,'600 10.5px "Segoe UI",sans-serif','#999');
 if(me.st==='active'&&me.ctx&&CTX_TXT[me.ctx]){const T=me.ctx===2&&me.metroTo?`🚇 CLICK: Metro to ${me.metroTo} (kafila comes along)`:CTX_TXT[me.ctx],sx=W/2+(PX()-cam.x)*cam.z,sy=H/2+(PY()-cam.y)*cam.z+30;const w=textW(T,'800 13px "Segoe UI",sans-serif')+20;panel(sx-w/2,sy-12,w,24,.78);txt(T,sx,sy,'800 13px "Segoe UI",sans-serif',me.ctx===4?'#ffcc80':me.ctx>=5?'#bbb':'#fff','center');}
 if(me.hunt&&me.st==='active'){const hx=W/2+(me.hunt[1]-cam.x)*cam.z,hy=H/2+(me.hunt[2]-cam.y)*cam.z,dd=Math.hypot(me.hunt[1]-PX(),me.hunt[2]-PY());
  if(hx<20||hy<20||hx>W-20||hy>H-20){const a=Math.atan2(hy-H/2,hx-W/2),ex=clamp(W/2+Math.cos(a)*W,26,W-26),ey=clamp(H/2+Math.sin(a)*H,26,H-26);ctx.save();ctx.translate(ex,ey);ctx.rotate(a);ctx.fillStyle='rgba(229,30,30,.85)';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-8,-10);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.restore();txt('👮',ex-Math.cos(a)*22,ey-Math.sin(a)*22,'14px sans-serif','#fff','center');}
  if(dd<170){ctx.globalAlpha=Math.min(.8,(170-dd)/120)*(.6+.4*Math.sin(performance.now()/110));vignette('danger',Math.min(W,H)*.3,'rgba(255,0,0,0)','rgba(220,20,20,.38)');ctx.globalAlpha=1;}}
 if(me.hunt&&me.st==='active'&&me.team==='P'){let hs=null,hd=330*330;for(const h of Wd.HIDES){const d=d2(h.x,h.y,PX(),PY());if(d<hd){hd=d;hs=h;}}if(hs){const hx=W/2+(hs.x-cam.x)*cam.z,hy=H/2+(hs.y-cam.y)*cam.z,pu=1+.15*Math.sin(performance.now()/150);ctx.strokeStyle='rgba(76,175,80,.95)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(hx,hy-10,26*pu,0,TAU);ctx.stroke();txt('🙈 HIDE HERE · lose the cop',hx,hy-48,'900 12px "Segoe UI",sans-serif','#2e7d32','center');}}
 if(me.lag&&me.st==='active'){const sx=W/2+(PX()-cam.x)*cam.z,sy=H/2+(PY()-cam.y)*cam.z,a=Math.atan2(me.lag[1]-PY(),me.lag[0]-PX()),ax=sx+Math.cos(a)*64,ay=sy+Math.sin(a)*64-20;ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.fillStyle='rgba(255,152,0,.9)';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-8,-10);ctx.lineTo(-3,0);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();txt('kafila',ax,ay+20,'800 10px "Segoe UI",sans-serif','#ffcc80','center');}
 if(me.carry){const sx=W/2+(PX()-cam.x)*cam.z,sy=H/2+(PY()-cam.y)*cam.z-30,a=Math.atan2(me.carry[1]-PY(),me.carry[0]-PX()),r=78,ax=sx+Math.cos(a)*r,ay=sy+Math.sin(a)*r,pul=1+Math.sin(performance.now()/120)*.12;ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.scale(pul,pul);ctx.fillStyle='#1565c0';ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-13);ctx.lineTo(-4,0);ctx.lineTo(-10,13);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();txt(`🚌 ${Math.round(Math.hypot(me.carry[0]-PX(),me.carry[1]-PY())/10)}m`,ax,ay+24,'900 12px "Segoe UI",sans-serif','#fff','center');}
 if(me.st==='carried'){const f=Math.min(1,(me.strg||0)/10),bw=260,bx=W/2-bw/2,by=H*.62;panel(bx-10,by-30,bw+20,58,.82);txt('😱 KEEP CLICKING TO WRIGGLE FREE!',W/2,by-14,'900 13px "Segoe UI",sans-serif','#ff8a80','center');ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(bx,by,bw,12);ctx.fillStyle=f>.7?'#69f0ae':'#ffab40';ctx.fillRect(bx,by,bw*f,12);if(me.resc>0){ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(bx,by+16,bw,6);ctx.fillStyle='#ffcc80';ctx.fillRect(bx,by+16,bw*Math.min(1,me.resc),6);txt('✊ kafila rescue',bx+bw,by+30,'800 10px "Segoe UI",sans-serif','#ffcc80','right');}}
 if(me.mis&&me.mis.length){misFlash=Math.max(0,misFlash-dt);const my=148,mh=24+me.mis.length*26;panel(12,my,236,mh,.62);txt('📋 AAJ KA KAAM',24,my+12,'900 10.5px "Segoe UI",sans-serif',misFlash>0?'#a5d6a7':'#ffe0b2');
  me.mis.forEach((m,i)=>{const y=my+28+i*26,f=m[2]?m[1]/m[2]:0;txt(cut(m[0],27),24,y,'700 11.5px "Segoe UI",sans-serif','#fff');txt(`${m[1]}/${m[2]}`,236,y,'800 11px "Segoe UI",sans-serif','#bbb','right');ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(24,y+7,212,4);ctx.fillStyle=f>=1?'#69f0ae':'#ffab40';ctx.fillRect(24,y+7,212*f,4);});}
 {const sx=W/2+(PX()-cam.x)*cam.z,sy=H/2+(PY()-cam.y)*cam.z;const sp=S.sp,now=performance.now();
  if(sp){const age=now-sp.t;if(age>3000)S.sp=null;else{sp.bump=Math.max(0,sp.bump-dt*5);const al=age<2200?1:1-(age-2200)/800,sc=1+sp.bump*.35;ctx.save();ctx.globalAlpha=al;ctx.translate(sx,sy+58);ctx.scale(sc,sc);ctx.lineJoin='round';ctx.font='900 22px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=5;ctx.strokeStyle='rgba(40,20,0,.85)';const s1='+'+Math.round(sp.sum);ctx.strokeText(s1,0,0);ctx.fillStyle='#ffd54f';ctx.fillText(s1,0,0);if(sp.label){ctx.font='800 11px "Segoe UI",sans-serif';ctx.lineWidth=3.5;ctx.strokeText(sp.label,0,17);ctx.fillStyle='#fff';ctx.fillText(sp.label,0,17);}ctx.restore();ctx.globalAlpha=1;}}
  const rk=S.lb.findIndex(l=>l[0]===S.myId)+1;if(rk&&S.lastRank&&rk!==S.lastRank)S.rankChip={up:rk<S.lastRank,rk,life:2.6};if(rk)S.lastRank=rk;
  if(S.rankChip){const r=S.rankChip;r.life-=dt;if(r.life<=0)S.rankChip=null;else{ctx.globalAlpha=Math.min(1,r.life/.5);const tx=sx+(S.sp?62:0),ty=sy+58;panel(tx-26,ty-11,52,22,.8);txt((r.up?'⬆ #':'⬇ #')+r.rk,tx,ty,'900 12px "Segoe UI",sans-serif',r.up?'#69f0ae':'#ff8a80','center');ctx.globalAlpha=1;}}}
 if(S.tierBan){const b=S.tierBan;b.life-=dt;if(b.life<=0)S.tierBan=null;else{const k=Math.min(1,(2.4-b.life)/.25),sc=k<1?.4+k*.8:1.2-.2*Math.min(1,(2.4-b.life-.25)/.4),al=Math.min(1,b.life/.5);ctx.save();ctx.globalAlpha=al;ctx.translate(W/2,H*.33);ctx.scale(sc,sc);txt(`✊ ${b.k}`,0,-34,'900 26px "Segoe UI",sans-serif','#fff','center');txt(b.t,0,6,'900 54px "Segoe UI",sans-serif',b.c,'center');ctx.restore();ctx.globalAlpha=1;}}
 if(S.result){S.result.life-=dt;const r=S.result.d;if(S.result.life<=0)S.result=null;else{const al=Math.min(1,S.result.life/.6,(10-S.result.life)/.3),bw=Math.min(W-30,460),bx=W/2-bw/2,by=104,won=r[0]===P.team;ctx.globalAlpha=al;panel(bx,by,bw,112,.88);ctx.fillStyle=r[0]==='P'?'#ff9933':'#1f4e9c';ctx.fillRect(bx,by,bw,5);
  txt(r[0]==='P'?`✊ ROUND ${r[1]}: DHARNA SAFAL!`:`👮 ROUND ${r[1]}: POLICE HELD THE LINE`,W/2,by+22,'900 18px "Segoe UI",sans-serif',r[0]==='P'?'#ffb74d':'#90caf9','center');
  txt(`Session score  ✊ ${r[9]} – ${r[10]} 👮   ·   ${won?'your team won 🎉':'your team lost, get them next round!'}`,W/2,by+46,'700 12.5px "Segoe UI",sans-serif',won?'#a5d6a7':'#ef9a9a','center');
  txt(`You: +${r[2]} this round · #${r[3]} of ${r[4]} on your team`,W/2,by+68,'900 14px "Segoe UI",sans-serif','#fff59d','center');
  txt(`MVP ✊ ${cut(r[5]||'-',14)} (${r[6]})   ·   MVP 👮 ${cut(r[7]||'-',14)} (${r[8]})   ·   next round is ON, keep going!`,W/2,by+92,'700 11px "Segoe UI",sans-serif','#ddd','center');ctx.globalAlpha=1;}}
 // leaderboard
 const lw=210,lx=W-lw-12;const lb=S.lb.slice(0,8);panel(lx,12,lw,30+lb.length*18);txt(`TOP PLAYERS · ping ${S.ping}ms`,lx+12,24,'900 11px "Segoe UI",sans-serif','#fff');
 lb.forEach((l,i)=>{const y=44+i*18;const mine=l[0]===S.myId;txt(`${i+1}. ${l[3]==='P'?(Wd.MUDDAS[l[6]|0]||{e:'✊'}).e:'👮'} ${cut(l[1],13)}${l[3]==='P'&&l[7]>=3?' ✊'+l[7]:''}${l[5]?' '+'⭐'.repeat(l[5]):''}`,lx+12,y,`${mine?900:600} 12px "Segoe UI",sans-serif`,mine?'#fff59d':l[3]==='P'?'#ffcc80':'#90caf9');txt(String(l[2]),lx+lw-12,y,'700 12px "Segoe UI",sans-serif','#fff','right');});
 // minimap
 if(miniDirty||!miniC)buildMini();const M=miniM,mmx=W-M-12,mmy=H-th-M-12;
 panel(mmx-6,mmy-24,M+12,M+30,.78);txt('DILLI MAP [M]',mmx,mmy-12,'900 11px "Segoe UI",sans-serif','#fff');txt('🔍 EXPAND',mmx+M,mmy-12,'800 10px "Segoe UI",sans-serif','#ffb74d','right');
 const blind=S.ev.some(e=>e[0]==='internet')&&!(me.bf[2]>0);
 if(blind){for(let i=0;i<200;i++){const gg=(Math.random()*255)|0;ctx.fillStyle=`rgb(${gg},${gg},${gg})`;ctx.fillRect(mmx+Math.random()*M,mmy+Math.random()*M,6,3);}ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(mmx,mmy+M/2-26,M,52);txt('NO SIGNAL',mmx+M/2,mmy+M/2-10,'900 14px sans-serif','#ff5252','center');txt('Internet suspended u/s 163',mmx+M/2,mmy+M/2+10,'600 11px sans-serif','#fff','center');}
 else{ctx.drawImage(miniC,mmx,mmy,M,M);const k=M/WORLD;
  for(const b of S.barsAll){ctx.fillStyle=b[3]?'#fdd835':'#ff1744';ctx.fillRect(mmx+b[1]*k-2,mmy+b[2]*k-2,4,4);}
  GATE_DEFS.forEach((g,i)=>{ctx.fillStyle=S.gates[i][0]?'#fdd835':'#ff1744';circle(mmx+g.x*k,mmy+g.y*k,3);});
  if(P_&&S.info)for(const p of S.info.pockets){ctx.fillStyle='#2e7d32';circle(mmx+p[0]*k,mmy+p[1]*k,2.2);}
  for(const m of S.mm){if(m[4])continue;ctx.fillStyle=m[2]===0?'#ff6d00':'#1565c0';const s=m[3]?3.4:2.4;ctx.fillRect(mmx+m[0]*4*k-s/2,mmy+m[1]*4*k-s/2,s,s);if(m[5]){ctx.strokeStyle='#ffd54f';ctx.lineWidth=1;ctx.strokeRect(mmx+m[0]*4*k-3,mmy+m[1]*4*k-3,6,6);}}
  ctx.save();ctx.setLineDash([3,3]);ctx.strokeStyle='rgba(211,47,47,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mmx+ZONE.x*k,mmy+ZONE.y*k,(ZONE.R+230)*k,0,TAU);ctx.stroke();ctx.restore();
  {const n=S.rd[15]|0;if(n>0){const pu=1+.25*Math.sin(performance.now()/250);ctx.fillStyle=`rgba(255,109,0,${Math.min(.55,.15+n/80)})`;circle(mmx+JM.x*k,mmy+JM.y*k,(5+Math.min(14,n/3))*pu);txt(`✊${n}`,mmx+JM.x*k,mmy+JM.y*k+16,'900 11px "Segoe UI",sans-serif','#ff6d00','center');}}
  txt('★',mmx+JM.x*k,mmy+JM.y*k,'900 14px sans-serif','#d50000','center');
  if(me.bus){ctx.setLineDash([4,3]);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(mmx+P.x*k,mmy+P.y*k);ctx.lineTo(mmx+me.bus[1]*k,mmy+me.bus[2]*k);ctx.stroke();ctx.setLineDash([]);}
  const pu=.5+.5*Math.sin(performance.now()/200);ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.beginPath();ctx.arc(mmx+(PX())*k,mmy+(PY())*k,4+pu,0,TAU);ctx.fill();ctx.stroke();}
 // edge arrows
 const arrow=(tx2,ty2,col,t)=>{const sx=W/2+(tx2-cam.x)*cam.z,sy=H/2+(ty2-cam.y)*cam.z;if(sx>30&&sx<W-30&&sy>110&&sy<H-th-30)return;const a=Math.atan2(ty2-(PY()),tx2-(PX())),ex=clamp(W/2+Math.cos(a)*(W/2-70),130,W-130);let ey=clamp(H/2+Math.sin(a)*(H/2-90),170,H-th-60);if(ex>W-M-70&&ey>H-th-M-80)ey=H-th-M-85;if(ex<270&&ey<175)ey=180;if(ex>W-240&&ey<200)ey=205;
  ctx.save();ctx.translate(ex,ey);ctx.rotate(a);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-10,-14);ctx.lineTo(-4,0);ctx.lineTo(-10,14);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  otext(t,ex,ey+28,12.5,'#fff','rgba(0,0,0,.6)',.32);};
 if(!blind&&me.st==='active'){if(P_){if(me.k<4&&S.info){let best=null,bd=1e12;for(const p of S.info.pockets){const dd=d2(p[0],p[1],P.x,P.y);if(dd<bd){bd=dd;best=p;}}if(best&&bd>160*160)arrow(best[0],best[1],'#43a047',`🙋 ${best[3]}`);}arrow(JM.x,JM.y,'#ff6d00',`Jantar Mantar · ${km(dist(P.x,P.y,JM.x,JM.y))} km`);}
  else{const w=S.mm.filter(m=>m[2]===0&&m[5]>0).sort((a,b)=>b[5]-a[5])[0];if(w)arrow(w[0]*4,w[1]*4,'#ffb300',`⭐ Wanted · ${km(dist(P.x,P.y,w[0]*4,w[1]*4))} km`);GATE_DEFS.forEach((g,i)=>{const G=S.gates[i];if(!G[0]||G[2]>15)arrow(g.x,g.y,'#e53935',`${g.name} gate ${G[0]?'👊':'BROKEN'}`);});}}
 if(banner){const al=Math.min(1,banner.life*1.5),bw=Math.min(W-30,600),bx=W/2-bw/2,by=100;ctx.globalAlpha=al;ctx.fillStyle='rgba(183,28,28,.93)';rrect(ctx,bx,by,bw,58,10);ctx.fill();txt(banner.t,W/2,by+18,'900 19px "Segoe UI",sans-serif','#fff','center');txt(banner.d,W/2,by+42,'600 12px "Segoe UI",sans-serif','#fff','center');ctx.globalAlpha=1;}
 else if(S.ev.length){ctx.font='700 12px "Segoe UI",sans-serif';const chips=S.ev.filter(e=>e[0]!=='wave').map(e=>`${e[0]==='trend'?'📈 '+Wd.MUDDAS[e[2]|0].e+' TRENDING':(EVTEXT[e[0]]||[e[0]])[0]}  ${e[1]}s`);const cf=ctx.font;let cw=chips.reduce((s,c)=>s+textW(c,cf)+28,0),cx=W/2-cw/2;for(const c of chips){const w=ctx.measureText(c).width+20;panel(cx,98,w,22,.7);txt(c,cx+10,109,'700 12px "Segoe UI",sans-serif','#ffd54f');cx+=w+8;}}
 if(!R[4])toasts.forEach((t,i)=>{ctx.globalAlpha=Math.min(1,t.life*2);const y=H*.3+i*30;otext(t.txt,W/2,y,t.big?19:15,t.c,'rgba(0,0,0,.65)',5/(t.big?19:15));ctx.globalAlpha=1;});
 ctx.font='600 12.5px "Segoe UI",sans-serif';const fb=H-th-12;feed.forEach((f,i)=>{const y=fb-(feed.length-i)*21;ctx.globalAlpha=Math.min(1,f.life);const w=Math.min(W*.55,textW(f.txt,'600 12.5px "Segoe UI",sans-serif')+14);panel(12,y-9,w,19,.6);txt(f.txt,19,y+.5,'600 12.5px "Segoe UI",sans-serif',f.c);ctx.globalAlpha=1;});
 if((me.st==='bus'||me.st==='escort')&&!R[4]){const bw=Math.min(W-30,520),bx=W/2-bw/2,y0=H*.22;panel(bx,y0,bw,110,.84);txt('🚌 DETAINED!',W/2,y0+26,'900 28px "Segoe UI",sans-serif','#90caf9','center');
  const d=S.detained;txt(d&&d.dest?`${d.by?'By '+d.by+' · ':''}Off to ${d.dest}${me.bus?' · '+km(dist(JM.x,JM.y,me.bus[1],me.bus[2]))+' km from Jantar Mantar':''}`:'Being loaded into the bus…',W/2,y0+60,'600 14px "Segoe UI",sans-serif','#fff','center');
  txt(isTouch?'Hold NAARA to fast-forward the ride':'Hold the mouse button to fast-forward the ride · your streak is reset',W/2,y0+88,'600 12.5px "Segoe UI",sans-serif','#ffd54f','center');}
 if(celebrate&&!R[4]){const al=Math.min(1,celebrate.life);ctx.globalAlpha=al;txt('✊ PAHUNCH GAYE!',W/2,H*.5,'900 54px "Segoe UI",sans-serif','#ff9933','center');txt(`+${celebrate.bonus} · Now HOLD the plaza as long as you can!`,W/2,H*.5+44,'800 18px "Segoe UI",sans-serif','#fff','center');ctx.globalAlpha=1;}
 if(me.st==='active'&&me.hold>0&&!R[4]){const best=+store.get('jm_best_hold','0');const ms=[15,30,60,90,120,180,240,300];const next=ms.find(m=>m>me.hold)||me.hold+60,prevM=[0,...ms].filter(m=>m<=me.hold).pop();const f=(me.hold-prevM)/(next-prevM);const cx=W/2,cy=H-th-70;
  panel(cx-150,cy-42,300,74,.8);ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=7;ctx.beginPath();ctx.arc(cx-112,cy-5,26,0,TAU);ctx.stroke();ctx.strokeStyle=me.inP?'#ff9933':'#777';ctx.beginPath();ctx.arc(cx-112,cy-5,26,-Math.PI/2,-Math.PI/2+TAU*f);ctx.stroke();txt(`×${me.mult}`,cx-112,cy-5,'900 15px "Segoe UI",sans-serif','#fff','center');
  txt(me.inP?'✊ DHARNA':'⏸ DHARNA PAUSED',cx-72,cy-24,'900 12px "Segoe UI",sans-serif',me.inP?'#ffcc80':'#aaa');txt(fmtT(me.hold),cx-72,cy+2,'900 30px "Segoe UI",sans-serif','#fff');txt(`next 🔥 at ${fmtT(next)} · best ${fmtT(best)}`,cx-72,cy+23,'700 11px "Segoe UI",sans-serif','#bbb');}
 if(S.runCard){const r=S.runCard;r.life-=dt;if(r.life<=0)S.runCard=null;else{const bw=Math.min(W-30,420),bx=W/2-bw/2,y0=H*.22+124;ctx.globalAlpha=Math.min(1,r.life);panel(bx,y0,bw,104,.86);txt('RUN SUMMARY',W/2,y0+18,'900 12px "Segoe UI",sans-serif','#bbb','center');
  txt(`✊ Dharna ${fmtT(r.hold)}   ·   👥 Peak kafila ${r.peak}   ·   🚧 ${r.brk} broken`,W/2,y0+44,'800 14px "Segoe UI",sans-serif','#fff','center');txt(`+${r.gained} pts this run`,W/2,y0+66,'900 16px "Segoe UI",sans-serif','#fff59d','center');
  if(r.newHold||r.newRun)txt(r.newHold?'🏆 NEW PERSONAL BEST DHARNA!':'🏆 NEW BEST RUN SCORE!',W/2,y0+90,'900 15px "Segoe UI",sans-serif','#ffab40','center');else txt(`Best dharna ${fmtT(+store.get('jm_best_hold','0'))} · one more run?`,W/2,y0+90,'700 12px "Segoe UI",sans-serif','#aaa','center');ctx.globalAlpha=1;}}
 if(S.conn==='lost'||S.conn==='connecting'&&S.snaps.length){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,H/2-30,W,60);txt('📡 Connection lost, reconnecting…',W/2,H/2,'900 20px "Segoe UI",sans-serif','#fff','center');}
 if(R[4])drawEnd();
}
function drawEnd(){
 const R=S.rd,me=S.me,P_=R[5]==='P',won=me&&me.team===R[5];
 ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,W,H);
 const bw=Math.min(W-30,620),bx=W/2-bw/2,bh=Math.min(H-60,430),by=H/2-bh/2;panel(bx,by,bw,bh,.94);ctx.fillStyle=P_?'#ff9933':'#1f4e9c';ctx.fillRect(bx,by,bw,8);
 txt(P_?'✊ DHARNA SAFAL!':'👮 DILLI POLICE HELD THE LINE!',W/2,by+44,'900 30px "Segoe UI",sans-serif',P_?'#ffb74d':'#90caf9','center');
 txt(P_?`Dharna power ${R[1]}/${R[2]}: ${R[12]} reached Jantar Mantar and held it!`:`Dharna power only ${R[1]}/${R[2]}. ${R[3]} detained, and Burari Ground is full.`,W/2,by+78,'600 14.5px "Segoe UI",sans-serif','#fff','center');
 if(R[8]>=0){const M=Wd.MUDDAS[R[8]];txt(`📈 Trending mudda of the round: ${M.e} ${M.n}`,W/2,by+bh-48,'800 13px "Segoe UI",sans-serif','#f8bbd0','center');}
 txt(won?'YOUR TEAM WINS 🎉':'Your team lost this round…',W/2,by+108,'900 18px "Segoe UI",sans-serif',won?'#a5d6a7':'#ef9a9a','center');
 if(me)txt(`You: ${me.sc} pts${me.team==='P'?` · ${me.stats.arr} arrivals · best dharna ${fmtT(+store.get('jm_best_hold','0'))}`:` · ${me.stats.det} detentions`}`,W/2,by+136,'900 17px "Segoe UI",sans-serif','#ffd54f','center');
 const col=(team,x,title)=>{txt(title,x,by+170,'900 13px "Segoe UI",sans-serif',team==='P'?'#ffcc80':'#90caf9','center');S.lb.filter(l=>l[3]===team).slice(0,7).forEach((l,i)=>txt(`${i+1}. ${cut(l[1],15)}  ${l[2]}`,x,by+194+i*20,`${l[0]===S.myId?900:600} 13px "Segoe UI",sans-serif`,l[0]===S.myId?'#fff59d':'#ddd','center'));};
 col('P',W/2-bw/4,'✊ TOP PROTESTERS');col('C',W/2+bw/4,'👮 TOP POLICE');
 txt(`Next round in ${R[6]}s · [T] switch team · [Esc] menu`,W/2,by+bh-22,'800 14px "Segoe UI",sans-serif','#ffd54f','center');
}

function drawBigMap(){
 ctx.setTransform(DPR,0,0,DPR,0,0);
 ctx.fillStyle='rgba(10,14,22,.88)';
 ctx.fillRect(0,0,W,H);
 const bw=Math.min(W-24,960),bh=Math.min(H-36,700),bx=W/2-bw/2,by=H/2-bh/2;
 panel(bx,by,bw,bh,.96);
 ctx.fillStyle='#ff9933';ctx.fillRect(bx,by,bw/3,5);
 ctx.fillStyle='#ffffff';ctx.fillRect(bx+bw/3,by,bw/3,5);
 ctx.fillStyle='#138808';ctx.fillRect(bx+2*bw/3,by,bw/3,5);
 txt('🗺️ DILLI TACTICAL MAP',bx+18,by+24,'900 18px "Segoe UI",sans-serif','#ffd54f');
 const me=S.me;
 const pCount=S.rd[13]||0,cCount=S.rd[14]||0;
 txt(`Room: ${S.room||'main'}  ·  ⏱️ ${fmtT(S.rd[0])} left  ·  ✊ ${pCount} Protesters  ·  👮 ${cCount} Police  ·  Dharna Power ${S.rd[1]}/${S.rd[2]}`,bx+18,by+44,'700 11.5px "Segoe UI",sans-serif','#bbb');
 const cbw=130,cbh=26,cbx=bx+bw-cbw-14,cby=by+14;
 panel(cbx,cby,cbw,cbh,.8);
 txt('✕ CLOSE (M / Esc)',cbx+cbw/2,cby+cbh/2,'900 11px "Segoe UI",sans-serif','#ffcc80','center');
 const mx=bx+14,my=by+58,mw=bw-28,mh=bh-96;
 ctx.fillStyle='#1e1c18';
 rrect(ctx,mx,my,mw,mh,8);
 ctx.fill();
 ctx.strokeStyle='#4a3f33';
 ctx.lineWidth=1.5;
 ctx.stroke();
 ctx.save();
 rrect(ctx,mx,my,mw,mh,8);
 ctx.clip();
 const k=Math.min(mw,mh)/WORLD;
 const ox=mx+(mw-WORLD*k)/2,oy=my+(mh-WORLD*k)/2;
 ctx.fillStyle='#ede2c8';
 ctx.fillRect(ox,oy,WORLD*k,WORLD*k);
 ctx.fillStyle='#a5c285';
 for(const p of PARKS){
  if(p.t==='c'){ctx.beginPath();ctx.arc(ox+p.x*k,oy+p.y*k,p.r*k,0,TAU);ctx.fill();}
  else ctx.fillRect(ox+p.x*k,oy+p.y*k,p.w*k,p.h*k);
 }
 ctx.fillStyle='#5c8ca8';
 ctx.beginPath();
 for(let y=0;y<=WORLD;y+=60)ctx.lineTo(ox+riverL(y)*k,oy+y*k);
 for(let y=WORLD;y>=0;y-=60)ctx.lineTo(ox+(riverL(y)+300)*k,oy+y*k);
 ctx.closePath();
 ctx.fill();
 txt('YAMUNA RIVER',ox+(riverL(WORLD*.4)+150)*k,oy+WORLD*.4*k,'900 10px "Segoe UI",sans-serif','rgba(255,255,255,.7)','center');
 ctx.strokeStyle='#7c7468';
 ctx.lineCap='round';
 ctx.lineJoin='round';
 for(const r of ROADS){
  ctx.lineWidth=Math.max(1.8,r.w*k*.9);
  ctx.beginPath();
  r.p.forEach(([x,y],i)=>i?ctx.lineTo(ox+x*k,oy+y*k):ctx.moveTo(ox+x*k,oy+y*k));
  ctx.stroke();
 }
 for(const c of RINGS){
  ctx.lineWidth=Math.max(2,c.w*k*.9);
  ctx.beginPath();
  ctx.arc(ox+c.x*k,oy+c.y*k,c.r*k,0,TAU);
  ctx.stroke();
 }
 txt('CONNAUGHT PLACE',ox+CP.x*k,oy+(CP.y-CP.r2-10)*k,'800 9px "Segoe UI",sans-serif','#5d4037','center');
 for(const b of S.barsAll){
  ctx.fillStyle=b[3]?'#fdd835':'#e53935';
  ctx.fillRect(ox+b[1]*k-2,oy+b[2]*k-2,4,4);
 }
 GATE_DEFS.forEach((g,i)=>{
  const up=S.gates[i]&&S.gates[i][0];
  ctx.fillStyle=up?'#fdd835':'#e53935';
  circle(ox+g.x*k,oy+g.y*k,3.5);
 });
 for(const m of METRO){
  ctx.fillStyle='#2e7d32';
  circle(ox+m.x*k,oy+m.y*k,2.5);
  txt('🚇 '+m.n,ox+m.x*k,oy+m.y*k-7,'700 8.5px "Segoe UI",sans-serif','#1b5e20','center');
 }
 for(const a of ASSEMBLY){
  ctx.fillStyle='#2e7d32';
  circle(ox+a.x*k,oy+a.y*k,4);
  ctx.fillStyle='#fff';
  circle(ox+a.x*k,oy+a.y*k,1.5);
  txt('🟢 '+a.n,ox+a.x*k,oy+a.y*k+9,'800 9px "Segoe UI",sans-serif','#1b5e20','center');
 }
 for(const ps of PSTATIONS){
  ctx.fillStyle='#1565c0';
  circle(ox+ps.x*k,oy+ps.y*k,4);
  ctx.fillStyle='#fff';
  circle(ox+ps.x*k,oy+ps.y*k,1.5);
  txt('👮 '+ps.n,ox+ps.x*k,oy+ps.y*k+9,'800 9px "Segoe UI",sans-serif','#0d47a1','center');
 }
 const jx=ox+ZONE.x*k,jy=oy+ZONE.y*k,jr=ZONE.R*k;
 const pulse=Math.sin(performance.now()/250)*3;
 ctx.save();
 ctx.strokeStyle='rgba(211,47,47,.8)';
 ctx.setLineDash([4,3]);
 ctx.lineWidth=1.5;
 ctx.beginPath();
 ctx.arc(jx,jy,(ZONE.R+180)*k,0,TAU);
 ctx.stroke();
 ctx.restore();
 ctx.fillStyle='rgba(255,153,51,.25)';
 circle(jx,jy,jr+pulse);
 ctx.fillStyle='#c0392b';
 circle(jx,jy,jr);
 txt('★ JANTAR MANTAR (DHARNA PLAZA)',jx,jy-14,'900 12px "Segoe UI",sans-serif','#ffd54f','center');
 const jmCrowd=S.rd[15]||0;
 txt(`✊ ${jmCrowd} in plaza`,jx,jy+14,'900 10.5px "Segoe UI",sans-serif','#fff','center');
 for(const m of S.mm){
  if(m[4])continue;
  const mx4=ox+m[0]*4*k,my4=oy+m[1]*4*k;
  const isP=m[2]===0,isH=!!m[3];
  ctx.fillStyle=isP?'#ff6d00':'#1565c0';
  if(isH){circle(mx4,my4,4);ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();}
  else circle(mx4,my4,2.5);
  if(m[5]){ctx.strokeStyle='#ffd54f';ctx.lineWidth=1.2;circle(mx4,my4,6);}
 }
 const px=ox+PX()*k,py=oy+PY()*k;
 const myP=Math.sin(performance.now()/200)*3;
 ctx.save();
 ctx.setLineDash([5,4]);
 ctx.strokeStyle=P.team==='P'?'rgba(255,153,51,.85)':'rgba(33,150,243,.85)';
 ctx.lineWidth=2;
 ctx.beginPath();
 ctx.moveTo(px,py);
 ctx.lineTo(jx,jy);
 ctx.stroke();
 ctx.restore();
 const midX=(px+jx)/2,midY=(py+jy)/2;
 panel(midX-50,midY-11,100,20,.85);
 txt(`➜ ${km(dist(P.x,P.y,ZONE.x,ZONE.y))} km`,midX,midY,'900 10.5px "Segoe UI",sans-serif','#fff','center');
 ctx.strokeStyle=P.team==='P'?'#ff9933':'#2196f3';
 ctx.lineWidth=2.5;
 ctx.beginPath();
 ctx.arc(px,py,8+myP,0,TAU);
 ctx.stroke();
 ctx.fillStyle='#ffffff';
 circle(px,py,4.5);
 ctx.fillStyle=P.team==='P'?'#ff6d00':'#1565c0';
 circle(px,py,3);
 panel(px-50,py-28,100,20,.9);
 txt(`★ YOU (${P.team==='P'?'Protester':'Police'})`,px,py-18,'900 10px "Segoe UI",sans-serif','#fff59d','center');
 ctx.restore();
 txt('✊ Protester  ·  👮 Police  ·  ★ Jantar Mantar  ·  🟢 Assembly Point  ·  🔵 Police Station  ·  🚇 Metro  ·  🚧 Barricade',bx+18,by+bh-18,'700 11px "Segoe UI",sans-serif','#ddd');
 txt('Press [M], [Tab], or [Esc] to return to action',bx+bw-18,by+bh-18,'800 11.5px "Segoe UI",sans-serif','#ffb74d','right');
}

// =================================================================== main loop
function updateCam(dt){const fade=Math.exp(-dt*12);P.ox*=fade;P.oy*=fade;if(Math.abs(P.ox)<.05)P.ox=0;if(Math.abs(P.oy)<.05)P.oy=0;const base=clamp(Math.min(W,H)/800,.7,1.35)*1.12;let tx=PX(),ty=PY()-20,tz=base;const me=S.me;if(me&&me.st!=='active'&&me.st!=='arrived'){tx=me.x;ty=me.y;tz=base*(me.st==='bus'?.62:1);}if(!playing){const a=performance.now()/12000;tx=ZONE.x+Math.cos(a)*220;ty=ZONE.y+Math.sin(a)*220;tz=base*.95;}
 const k=1-Math.exp(-dt*14);cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;const oz=cam.z;cam.z+=(tz*(1+camPunch)-cam.z)*Math.min(1,dt*(camPunch>0?14:2));camPunch=Math.max(0,camPunch-dt*.5);
 const ts=Math.min(2,Math.max(.5,Math.round(base*DPR*4)/4));if(ts!==tileScale){tileScale=ts;tiles.clear();}
 if(net&&Math.abs(oz-cam.z)>.01&&Math.random()<.1)net.sendView();}
// --- Atmospheric Golden Hour Screen Pass & Sunlit Dust Motes ---
const DUST_MOTES = Array.from({length: 46}, () => ({
  x: Math.random(),
  y: Math.random(),
  sz: 0.8 + Math.random() * 1.8,
  sp: 0.012 + Math.random() * 0.022,
  shimmer: Math.random() * Math.PI * 2,
  sway: Math.random() * 2
}));

function drawAtmosphere(dt){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 1. Warm Golden Hour Sunlight Tint
  ctx.fillStyle = 'rgba(255, 185, 95, 0.055)';
  ctx.fillRect(0, 0, W, H);

  // 2. Drifting sunlit dust motes in the Delhi afternoon air
  const t = performance.now() * 0.001;
  ctx.fillStyle = 'rgba(255, 235, 190, 0.38)';
  for (const m of DUST_MOTES) {
    m.y -= m.sp * dt * 25;
    m.x += Math.sin(t + m.sway) * 0.0003;
    if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
    if (m.x < -0.05) m.x = 1.05;
    if (m.x > 1.05) m.x = -0.05;

    const pulse = 0.5 + 0.5 * Math.sin(t * 3.2 + m.shimmer);
    ctx.globalAlpha = 0.25 + 0.55 * pulse;
    ctx.beginPath();
    ctx.arc(m.x * W, m.y * H, m.sz, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 3. Cinematic Subtle Lens Vignette (warm sepia edges, clear center)
  vignette('goldenVig', Math.min(W, H) * 0.35, 'rgba(0,0,0,0)', 'rgba(38, 22, 10, 0.22)');
}

function render(dt){
 const dyn=interp();updateAmbient(dt);updateCam(dt);
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#8fae63';ctx.fillRect(0,0,W,H);
 const z=cam.z,sx=shakeT>0?rand(-5,5):0,sy=shakeT>0?rand(-5,5):0;V={x0:cam.x-W/2/z,y0:cam.y-H/2/z,x1:cam.x+W/2/z,y1:cam.y+H/2/z+120};
 ctx.setTransform(DPR*z,0,0,DPR*z,DPR*(W/2-cam.x*z+sx),DPR*(H/2-cam.y*z+sy));
 const i0=Math.floor(V.x0/TS),i1=Math.floor(V.x1/TS),j0=Math.floor(V.y0/TS),j1=Math.floor((V.y1-120)/TS);{let tb=2;for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const key=i*1000+j;let t=tiles.get(key);if(t){tiles.delete(key);tiles.set(key,t);}else if(tb>0){tb--;t=getTile(i,j);}if(t)ctx.drawImage(t,i*TS,j*TS,TS+.6,TS+.6);else{ctx.fillStyle='#d6c79f';ctx.fillRect(i*TS,j*TS,TS+.6,TS+.6);}}
  if(tb>0)ring:for(let i=i0-1;i<=i1+1;i++)for(let j=j0-1;j<=j1+1;j++){if(!tiles.has(i*1000+j)){getTile(i,j);if(--tb<=0)break ring;}}}
 drawDynamicGround();drawScene(dyn);drawGas(dyn);drawFx();drawWorldUI();drawHUD(dt);
 if(bigMap)drawBigMap();
}
let last=performance.now(),fpsT=0,fpsN=0,fps=60,pingT=0,slowSecs=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;
 try{if(playing&&net){inAcc+=dt;let n=0;while(inAcc>=DT&&n<4){inAcc-=DT;n++;sampleInput();}if(inAcc>DT*4)inAcc=0;renderA=clamp(inAcc/DT,0,1);pingT-=dt;if(pingT<=0){pingT=2;net.send({t:'ping',c:performance.now()});if(net.token)try{sessionStorage.setItem('jm_resume',JSON.stringify({tok:net.token,t:Date.now(),team:P.team}));}catch(e){}}}
  render(dt);try{ctx.setTransform(DPR,0,0,DPR,0,0);drawCursor();}catch(e){}fpsN++;fpsT+=dt;if(fpsT>=1){fps=fpsN;fpsN=0;fpsT=0;if(playing&&fps<48&&quality==='hi'){slowSecs=(slowSecs||0)+1;if(slowSecs>=3){quality='lo';store.set('jm_q','lo');resize();toast('⚡ Switched to FAST graphics for smoother play (press Q to change)','#fff');}}else slowSecs=0;}
  if(playing){ctx.setTransform(DPR,0,0,DPR,0,0);txt(`${fps} fps`,W-12,H-40,'600 10px sans-serif','rgba(255,255,255,.6)','right');}
 }catch(e){console.error(e);}}

// =================================================================== menu
const menu=document.getElementById('menu'),nameIn=document.getElementById('name'),statusEl=document.getElementById('status'),playBtn=document.getElementById('play'),pracBtn=document.getElementById('practice');
const roomSelect=document.getElementById('room-select'),roomCustom=document.getElementById('room-custom'),roomBadge=document.getElementById('room-badge');
let selectedRoom=store.get('jm_room','main');
if(roomSelect){
 if(['main','north-campus','border-morcha'].includes(selectedRoom)){roomSelect.value=selectedRoom;}
 else{roomSelect.value='custom';if(roomCustom){roomCustom.style.display='';roomCustom.value=selectedRoom;}}
 if(roomBadge)roomBadge.textContent=selectedRoom==='main'?'Main Dharna':selectedRoom;
 roomSelect.addEventListener('change',()=>{
  if(roomSelect.value==='custom'){if(roomCustom){roomCustom.style.display='';roomCustom.focus();selectedRoom=roomCustom.value.trim().toLowerCase().slice(0,24)||'custom';}}
  else{if(roomCustom)roomCustom.style.display='none';selectedRoom=roomSelect.value;}
  store.set('jm_room',selectedRoom);if(roomBadge)roomBadge.textContent=selectedRoom==='main'?'Main Dharna':selectedRoom;
 });
 if(roomCustom){roomCustom.addEventListener('input',()=>{selectedRoom=roomCustom.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,24)||'custom';store.set('jm_room',selectedRoom);if(roomBadge)roomBadge.textContent=selectedRoom;});}
}
let role=store.get('jm_role','P');let mudda=+store.get('jm_mud',String((Math.random()*Wd.MUDDAS.length)|0))||0;
const mudEl=document.getElementById('muddas');
function renderMuddas(){mudEl.style.display=role==='P'?'flex':'none';mudEl.innerHTML='<div class="mlab">Choose your mudda:</div>'+Wd.MUDDAS.map((m,i)=>`<button class="mchip${i===mudda?' sel':''}" data-i="${i}" style="--mc:${m.c}">${m.e} ${m.n}</button>`).join('');mudEl.querySelectorAll('.mchip').forEach(b=>b.addEventListener('click',()=>{mudda=+b.dataset.i;store.set('jm_mud',String(mudda));renderMuddas();}));}
document.querySelectorAll('.role').forEach(el=>{el.classList.toggle('sel',el.dataset.r===role);el.addEventListener('click',()=>{document.querySelectorAll('.role').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');role=el.dataset.r;store.set('jm_role',role);renderMuddas();});});renderMuddas();
nameIn.value=store.get('jm_name','');
const online=location.protocol==='http:'||location.protocol==='https:';
// online play is enabled
const ONLINE_DOWN=false;
function refreshStatus(){if(ONLINE_DOWN){statusEl.innerHTML='🟠 Online play is temporarily down due to massive load. <b>Play offline</b> meanwhile, it is the full game with bots!';playBtn.disabled=true;return;}
 if(!online){statusEl.innerHTML='Opened as a file, so online play needs the server: run <kbd>npm start</kbd> and open <b>http://localhost:3001</b>. Practice offline works right here.';playBtn.disabled=true;return;}
 const isProd = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
 const serverBase = (window.__JM_SERVER_URL__ && (!isProd || (!window.__JM_SERVER_URL__.includes('localhost') && !window.__JM_SERVER_URL__.includes('127.0.0.1'))))
  ? window.__JM_SERVER_URL__.replace(/\/$/, '')
  : (isProd ? 'https://kafila-server.vercel.app' : '');
 const stUrl = serverBase ? `${serverBase}/status` : (location.port === '4000' || location.port === '3001' ? '/status' : `http://${location.hostname||'localhost'}:4000/status`);
 const applyStatus=(s)=>{
  statusEl.innerHTML=`🟢 Server online · <b>${s.players||0}</b> player${s.players===1?'':'s'} in ${s.rooms||0} room${s.rooms===1?'':'s'}`;
  playBtn.disabled=false;
  if(s.roomList&&roomSelect){
   const defaultOptions=[{id:'main',n:'Main Dharna (Jantar Mantar)'},{id:'north-campus',n:'DU North Campus Rally'},{id:'border-morcha',n:'Border Morcha (Singhu / Ghazipur)'}];
   const counts={};for(const r of s.roomList)counts[r.id]=r.players;
   for(const opt of roomSelect.options){
    if(opt.value==='custom')continue;
    const base=defaultOptions.find(d=>d.id===opt.value);
    const n=counts[opt.value]||0;
    opt.textContent=(base?base.n:opt.value)+(n>0?` (${n} online)`:'');
   }
  }
 };
 fetch(stUrl,{cache:'no-store'}).then(r=>r.json()).then(applyStatus).catch(()=>{
  fetch('/status',{cache:'no-store'}).then(r=>r.json()).then(applyStatus).catch(()=>{
   fetch(`http://${location.hostname||'localhost'}:4000/status`,{cache:'no-store'}).then(r=>r.json()).then(applyStatus).catch(()=>{statusEl.innerHTML='🟢 Practice offline is available (Full game with AI bots).';playBtn.disabled=false;});
  });
 });}
function start(mode){initAudio();if(mudda===undefined||isNaN(mudda))mudda=(Math.random()*Wd.MUDDAS.length)|0;const name=nameIn.value.trim().slice(0,18)||(role==='P'?'Aam Aadmi':'Const. Rookie');store.set('jm_name',name);if(net)net.close();
 S.snaps=[];S.me=null;S.lb=[];S.mm=[];S.names.clear();pending=[];P.team=role;particles.length=0;confetti.length=0;bubbles.length=0;toasts.length=0;feed.length=0;banner=null;celebrate=null;S.detained=null;
 net=mode==='online'?new Online(name,role,selectedRoom):new Local(name,role);
 bAct.textContent=role==='P'?'NAARA':'LATHI';bGas.style.display=role==='C'?'':'none';}
function showMenu(msg){playing=false;if(net){net.close();net=null;}S.me=null;menu.classList.remove('hide');document.getElementById('mob').classList.remove('on');if(msg)statusEl.innerHTML=msg;else refreshStatus();}
playBtn.addEventListener('click',()=>{if(!ONLINE_DOWN)start('online');});pracBtn.addEventListener('click',()=>start('offline'));
nameIn.addEventListener('keydown',e=>{if(e.key==='Enter')(playBtn.disabled?pracBtn:playBtn).click();});
resize();refreshStatus();setInterval(()=>{if(!playing)refreshStatus();},8000);requestAnimationFrame(frame);
// for automated tests
window.__jm={SWINGS,HITS,get fps(){return fps;},VBYID,S,P,PX,PY,start,showMenu,keys,input,cam,get net(){return net;},get playing(){return playing;},toggleBigMap,get bigMap(){return bigMap;},get room(){return S.room;}};
})();
}


