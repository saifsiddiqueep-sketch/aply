/* "nav" experiment for the sandbox and dev instances (never loaded by prod).
   Bottom navigation with three dropdowns: Services (Jobs, Internships, Co-ops), Dashboard (Applied, Interview, Rejected),
   Profile (Settings, Preferences, Filters). patch() edits an in-memory copy of index.html; apply() builds the UI. */
(function(){
function once(src,a,b){if(src.indexOf(a)<0)throw new Error("patch target not found: "+a.slice(0,40));return src.replace(a,function(){return b})}

var EXTRA=`,
 {id:13,type:"internship",co:"Calloway Studios",role:"Design Intern",loc:"Remote (US)",mode:"remote",sal:[36000,44000],yrs:0,edu:"High school",skills:["Figma","Prototyping","User research"],blurb:"Ten weeks helping a small studio design onboarding screens for a budgeting app."},
 {id:14,type:"internship",co:"Ironbridge Analytics",role:"Data Science Intern",loc:"New York",mode:"hybrid",sal:[42000,52000],yrs:0,edu:"Associate",skills:["Python","SQL","Excel","Tableau"],blurb:"Summer team placement cleaning data and building dashboards for retail clients."},
 {id:15,type:"internship",co:"Seaside Software",role:"Frontend Intern",loc:"Remote (US)",mode:"remote",sal:[38000,46000],yrs:0,edu:"High school",skills:["JavaScript","React","CSS","HTML"],blurb:"Ship real UI changes with a mentor on a product used by 50,000 people."},
 {id:16,type:"internship",co:"Redwood Marketing",role:"Marketing Intern",loc:"Austin",mode:"onsite",sal:[30000,38000],yrs:0,edu:"High school",skills:["SEO","Copywriting","Analytics"],blurb:"Write and test campaigns for local restaurants alongside the content team."},
 {id:17,type:"coop",co:"Atlas Robotics",role:"Software Co-op",loc:"Pittsburgh",mode:"onsite",sal:[52000,62000],yrs:0,edu:"Associate",skills:["Python","Docker","Testing","SQL"],blurb:"Six-month rotation on the fleet software team, testing code on real robots."},
 {id:18,type:"coop",co:"Harbor Bank",role:"Technology Co-op",loc:"Charlotte",mode:"hybrid",sal:[48000,58000],yrs:0,edu:"Associate",skills:["Java","SQL","Testing","Excel"],blurb:"Support the payments team with test automation and reporting for six months."},
 {id:19,type:"coop",co:"Summit Health",role:"Data Co-op",loc:"Boston",mode:"hybrid",sal:[50000,60000],yrs:0,edu:"Associate",skills:["SQL","Python","Tableau","Excel"],blurb:"Build clinic reports and learn healthcare data from a team of analysts."},
 {id:20,type:"coop",co:"Lumen Labs",role:"Web Co-op",loc:"Remote (US)",mode:"remote",sal:[46000,56000],yrs:0,edu:"Associate",skills:["React","TypeScript","CSS","JavaScript"],blurb:"Full-semester co-op building customer-facing pages for a lighting startup."}`;

var API=`
window.__aply={S:S,JOBS:JOBS,save:save,renderAll:renderAll,show:show,setFilter:setFilter,esc:esc,hue:hue,money:money,tone:tone,cap:cap,
 setType:function(t){TYPE=t;renderDeck();renderDash()},getType:function(){return TYPE},
 setMin:function(n){MINPCT=n;renderDeck();renderDash()},getMin:function(){return MINPCT},getFilter:function(){return F}};`;

function patch(s){
  s=once(s,'regional cookbooks."}','regional cookbooks."}'+EXTRA);
  s=once(s,'var busy=false,F="all";','var busy=false,F="all",TYPE="job",MINPCT=0;');
  s=once(s,'&&(F==="all"||j.mode===F)}).map(function(j){return {j:j,m:evaluate(j,S.profile)}}).sort(',
           '&&(j.type||"job")===TYPE&&!(window.__aplyHide&&window.__aplyHide(j))&&(F==="all"||j.mode===F)}).map(function(j){return {j:j,m:evaluate(j,S.profile)}}).filter(function(x){return x.m.pct>=MINPCT}).sort(');
  s=once(s,'<h2>You have seen every job</h2><p>Jobs you passed on can come back, and your applications are in the Applied tab.</p>',
    `<h2>'+(MINPCT>0?"No jobs at "+MINPCT+"% match or higher":(JOBS.filter(function(j){return (j.type||"job")===TYPE&&(j.live||!window.__aplyHideSamples)}).length?"You have seen every one of these":"Nothing listed here right now"))+'</h2><p>'+(MINPCT>0?"Lower the minimum match in Profile, then Filters.":(JOBS.filter(function(j){return (j.type||"job")===TYPE&&(j.live||!window.__aplyHideSamples)}).length?"Jobs you passed on can come back, and your applications are in the Dashboard.":"New postings appear as employers publish them. Try another section or check back soon."))+'</p>`);
  s=once(s,'title:String(x.title||"")};','title:String(x.title||""),st:(x.st==="interview"||x.st==="accepted"||x.st==="rejected")?x.st:"applied",sent:(x.sent&&typeof x.sent==="object")?{at:+x.sent.at||0,to:String(x.sent.to||"").slice(0,120),status:String(x.sent.status||"").slice(0,20)}:undefined};');
  /* profile gets an email so a recruiter can reply */
  s=once(s,'salary:100000,loc:"New York",','salary:100000,loc:"New York",email:"jordan.lee@example.com",');
  s=once(s,'loc:typeof p.loc==="string"?p.loc:"",','loc:typeof p.loc==="string"?p.loc:"",email:typeof p.email==="string"?p.email.slice(0,200):"",');
  s=once(s,'salary:num($("pSalary").value,0,10000000),loc:$("pLoc").value.trim(),','salary:num($("pSalary").value,0,10000000),loc:$("pLoc").value.trim(),email:($("pEmail")?$("pEmail").value.trim():""),');
  s=once(s,'$("pSalary").value=p.salary;$("pLoc").value=p.loc;','$("pSalary").value=p.salary;$("pLoc").value=p.loc;if($("pEmail"))$("pEmail").value=p.email||"";');
  s=once(s,'title:S.profile.title||""};','title:S.profile.title||"",st:"applied"};');
  s=once(s,"<span>'+cap(j.mode)+'</span>","<span>'+cap(j.mode)+'</span>'+(j.type&&j.type!==\"job\"?'<span>'+(j.type===\"internship\"?\"Internship\":\"Co-op\")+'</span>':'')+'");
  /* subscription gate: the page (apply) defines window.__aplyGate; false means "not allowed, a paywall was shown" */
  s=once(s,'var job=JOB_BY_ID[id];','var job=JOB_BY_ID[id];if(dir==="applied"&&window.__aplyGate&&window.__aplyGate(job)===false){busy=false;renderAll();return}');
  s=once(s,'function show(t,focusPane){','function show(t,focusPane){if(window.__aplyOnShow)window.__aplyOnShow(t);');
  s=once(s,'function renderAll(){renderDeck();renderApps();renderDash()}','function renderAll(){renderDeck();renderApps();renderDash()}'+API);
  return s;
}

var CSS=`
.tabs{display:none}
#bnav{display:flex;gap:4px;justify-content:center;flex:none;max-width:1100px;width:100%;margin-inline:auto;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:4px;position:relative}
.nwrap{position:relative;flex:1;display:flex;min-width:0}
.nb{flex:1;border:0;background:none;border-radius:999px;padding:6px 8px;min-height:48px;font-weight:600;color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15;min-width:0}
.nb small{font:500 11px var(--mono);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.nb[aria-current="true"]{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink)}
.nmenu{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);min-width:220px;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:6px;display:flex;flex-direction:column;gap:2px;z-index:20}
.nwrap:first-child .nmenu{left:0;transform:none}
.nwrap:last-child .nmenu{left:auto;right:0;transform:none}
.nitem{display:flex;justify-content:space-between;align-items:center;gap:14px;border:0;background:none;text-align:left;padding:10px 14px;border-radius:10px;font-weight:600;min-height:44px;color:var(--ink)}
.nitem:hover,.nitem:focus-visible{background:var(--bg)}
.nitem[aria-checked="true"]{color:var(--accent);background:var(--bg)}
.nitem .c{font:500 12px var(--mono);color:var(--muted)}
.toast{bottom:calc(88px + env(safe-area-inset-bottom,0px))}
body{padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}
#pane-track .stats{grid-template-columns:repeat(4,1fr)}
#pane-track .row{flex-wrap:wrap}
#pane-track .acts{display:flex;gap:6px;flex-wrap:wrap;flex-basis:100%}
#pane-track .acts .btn{padding:6px 12px;font-size:13px}
#acctSec{display:flex;flex-direction:column;gap:14px}
#acctSec h3{margin:0}
#acctSec textarea{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px;min-height:96px;resize:vertical;width:100%}
#acctSec .bar{height:10px;border-radius:999px;background:var(--line);overflow:hidden}
#acctSec .bar i{display:block;height:100%;background:linear-gradient(135deg,var(--accent),var(--accent2))}
#acctSec .plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
#acctSec .plan{border:1px solid var(--line);background:var(--surface);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px}
#acctSec .plan[data-cur="true"]{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset}
#acctSec .plan b{font-size:16px}#acctSec .plan .pr{font:800 22px var(--display,inherit)}
#acctSec .plan ul{margin:0;padding-left:18px;color:var(--muted)}
#acctSec .todo{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}
#acctSec .tag{font:700 11px ui-monospace,Menlo,monospace;padding:2px 8px;border-radius:6px;background:#E8A317;color:#2A1A00;align-self:flex-start}
#acctSec .toggle{display:flex;gap:10px;align-items:center;min-height:44px}
#acctSec .acts{display:flex;gap:8px;flex-wrap:wrap}
#pane-track .overview{display:flex;flex-direction:column;gap:14px}
#paywall{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.45)}
#paywall>div{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:22px;max-width:400px;width:100%;box-shadow:var(--shadow)}
#form[hidden],#acctSec[hidden]{display:none!important}
/* form polish: labels sit directly on the page (no white boxes), softer inputs, clear focus */
.field label:not(.chip){background:none;color:var(--muted);font-weight:600;font-size:12.5px;letter-spacing:.02em}
.checks label{background:var(--surface)}
.field input[type=text],.field input[type=number],.field input[type=tel],.field select,#acctSec textarea,#acctSec input[type=datetime-local],#acctSec input[type=date]{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:var(--ink);font:inherit;transition:border-color .15s,box-shadow .15s;width:100%}
.field input:focus,.field select:focus,#acctSec textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
#form .grid,#acctSec .grid{gap:16px 14px}
#form .lead,#acctSec .lead{margin:0 0 4px}
#setMeter{display:flex;flex-direction:column;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
#setMeter .bar{height:8px;border-radius:999px;background:var(--line);overflow:hidden}
#setMeter .bar i{display:block;height:100%;background:linear-gradient(135deg,var(--accent),var(--accent2))}
#setMeter[hidden]{display:none!important}
#filtersSec{display:flex;flex-direction:column;gap:14px}
#filtersSec input[type=range]{width:100%;accent-color:var(--accent)}
`;

function apply(w,host){
  var d=w.document,A=w.__aply;
  if(!A)throw new Error("app hooks missing");
  var OPTS=(host&&host.defaultView&&host.defaultView.AplyOpts)||{};   /* e.g. dev sets hideServiceCounts */
  var NK=w.__aplyKey+".nav";
  var SECS={
    svc:{label:"Services",items:[["job","Jobs"],["internship","Internships"],["coop","Co-ops"]]},
    dash:{label:"Dashboard",items:[["overview","Overview"],["applied","Applied"],["accepted","Accepted"],["rejected","Rejected"],["interview","Interviews"]]},
    prof:{label:"Profile",items:[["settings","Settings"],["resume","Resume & links"],["preferences","Preferences"],["filters","Filters"],["plan","Plan & billing"],["data","Data & privacy"]]}
  };
  var ACCT={resume:1,plan:1,data:1};
  var LEADS={
    resume:"What employers ask for besides your skills. Fill these in once; they are saved on this device.",
    plan:"Choose how you pay for Aply. Sandbox: no real payments happen and no card is needed.",
    data:"Back up, move or delete everything Aply keeps about you.",
    settings:"Your details. Every card is scored against them, and they fill in your application note and the email address recruiters reply to.",
    preferences:"What you want in a job. These change every match score.",
    filters:"Choose which opportunities appear in your feed."
  };
  var FIELDS={settings:["pName","pEmail","pTitle","pYears","pEdu","pSkills","pLoc"],preferences:["pSalary","pm-remote"]};
  var nameField=d.getElementById("pName").closest(".field"),emailField=d.createElement("div");
  emailField.className="field";
  emailField.innerHTML='<label for="pEmail">Email (recruiters reply here)</label><input type="text" id="pEmail" inputmode="email" autocomplete="email" placeholder="you@example.com">';
  nameField.after(emailField);
  var phoneField=d.createElement("div");phoneField.className="field";
  phoneField.innerHTML='<label for="pPhone">Phone</label><input type="tel" id="pPhone" autocomplete="tel" maxlength="20" placeholder="+1 555 123 4567"><small id="pPhoneErr" role="alert"></small>';
  emailField.after(phoneField);FIELDS.settings.push("pPhone");
  var cur="svc",sub={svc:"job",dash:"overview",prof:"settings"},going=false;
  function label(k,v){var r="";SECS[k].items.forEach(function(i){if(i[0]===v)r=i[1]});return r}

  var st=d.createElement("style");st.textContent=CSS;d.head.appendChild(st);

  /* saved preferences (own key, separate from the app data) */
  var prefs={};try{prefs=JSON.parse(w.localStorage.getItem(NK))||{}}catch(e){}
  function savePrefs(){try{w.localStorage.setItem(NK,JSON.stringify({type:sub.svc,min:A.getMin(),mode:A.getFilter()}))}catch(e){}}
  if(label("svc",prefs.type)){sub.svc=prefs.type;A.setType(sub.svc)}
  if(prefs.min>0&&prefs.min<=90)A.setMin(+prefs.min);
  if(["remote","hybrid","onsite"].indexOf(prefs.mode)>-1)A.setFilter(prefs.mode);

  /* bottom nav */
  var main=d.getElementById("main"),nav=d.createElement("nav");
  nav.id="bnav";nav.setAttribute("aria-label","Main");
  Object.keys(SECS).forEach(function(k){
    var wrap=d.createElement("div");wrap.className="nwrap";wrap.setAttribute("data-k",k);
    wrap.innerHTML='<button type="button" class="nb" id="nb-'+k+'" aria-haspopup="menu" aria-expanded="false"><span>'+SECS[k].label+'</span><small></small></button><div class="nmenu" role="menu" aria-labelledby="nb-'+k+'" hidden></div>';
    nav.appendChild(wrap);
  });
  main.after(nav);

  function count(k,v){
    var n=0;
    if(k==="prof"||v==="overview"||(k==="svc"&&OPTS.hideServiceCounts))return "";
    A.JOBS.forEach(function(j){
      if(w.__aplyHideSamples&&!j.live)return;
      if(w.__aplyHide&&w.__aplyHide(j))return;
      var x=A.S.decisions[j.id];
      if(k==="svc"){if(!x&&(j.type||"job")===v)n++}
      else if(x&&x.s==="applied"&&(x.st||"applied")===v)n++;
    });
    return n;
  }
  function refresh(){
    Object.keys(SECS).forEach(function(k){
      var b=d.getElementById("nb-"+k);
      b.setAttribute("aria-current",k===cur?"true":"false");
      b.querySelector("small").textContent=label(k,sub[k]);
    });
  }
  function closeMenus(except){
    nav.querySelectorAll(".nwrap").forEach(function(wr){
      if(wr===except)return;
      wr.querySelector(".nmenu").hidden=true;wr.querySelector(".nb").setAttribute("aria-expanded","false");
    });
  }
  function openMenu(wrap,focusLast){
    var k=wrap.getAttribute("data-k"),menu=wrap.querySelector(".nmenu");
    closeMenus(wrap);
    menu.innerHTML=SECS[k].items.map(function(i){
      var c=count(k,i[0]);
      return '<button type="button" class="nitem" role="menuitemradio" aria-checked="'+(sub[k]===i[0])+'" data-v="'+i[0]+'"><span>'+i[1]+'</span>'+(c===""?"":'<span class="c">'+c+'</span>')+'</button>';
    }).join("");
    menu.hidden=false;wrap.querySelector(".nb").setAttribute("aria-expanded","true");
    var items=menu.querySelectorAll(".nitem"),on=menu.querySelector('[aria-checked="true"]');
    (focusLast?items[items.length-1]:on||items[0]).focus();
  }
  nav.addEventListener("click",function(e){
    var item=e.target.closest(".nitem"),wrap=e.target.closest(".nwrap");if(!wrap)return;
    var k=wrap.getAttribute("data-k");
    if(item){sub[k]=item.getAttribute("data-v");cur=k;closeMenus();go(k);wrap.querySelector(".nb").focus();return}
    if(e.target.closest(".nb")){wrap.querySelector(".nmenu").hidden?openMenu(wrap):closeMenus()}
  });
  nav.addEventListener("keydown",function(e){
    var wrap=e.target.closest(".nwrap");if(!wrap)return;
    var key=e.key,menu=wrap.querySelector(".nmenu"),btn=wrap.querySelector(".nb"),onBtn=e.target===btn;
    if(key==="ArrowLeft"||key==="ArrowRight"){
      e.stopPropagation();e.preventDefault();
      if(onBtn){var ws=[].slice.call(nav.querySelectorAll(".nwrap")),i=ws.indexOf(wrap)+(key==="ArrowRight"?1:-1);if(ws[i]){closeMenus();ws[i].querySelector(".nb").focus()}}
    }else if(key==="ArrowDown"||key==="ArrowUp"){
      e.stopPropagation();e.preventDefault();
      if(menu.hidden){openMenu(wrap,key==="ArrowUp");return}
      var items=[].slice.call(menu.querySelectorAll(".nitem")),i2=items.indexOf(d.activeElement)+(key==="ArrowDown"?1:-1);
      items[(i2+items.length)%items.length].focus();
    }else if(key==="Escape"&&!menu.hidden){e.stopPropagation();closeMenus();btn.focus()}
  });
  nav.addEventListener("focusout",function(e){if(!e.relatedTarget||!nav.contains(e.relatedTarget))closeMenus()});
  d.addEventListener("pointerdown",function(e){if(!e.target.closest("#bnav"))closeMenus()},true);

  /* dashboard: applications by status */
  var tp=d.createElement("section");tp.id="pane-track";tp.className="pane list";tp.setAttribute("aria-label","Applications");tp.hidden=true;main.appendChild(tp);
  var ACTS={
    applied:[["interview","Interview"],["accepted","Accepted"],["rejected","Rejected"],["withdraw","Withdraw"]],
    accepted:[["applied","Back to applied"],["withdraw","Remove"]],
    rejected:[["applied","Back to applied"],["withdraw","Remove"]],
    interview:[["accepted","Accepted"],["rejected","Rejected"],["applied","Back to applied"],["withdraw","Withdraw"]]
  };
  var EMPTY={
    applied:"No applications waiting. Swipe right on a job, internship or co-op to apply.",
    accepted:"Nothing here yet. Tap Accepted on an application when you get an offer.",
    rejected:"Nothing here. Tap Rejected on an application when you hear back.",
    interview:"Nothing here yet. Tap Interview on an application when a company invites you."
  };
  var TYPE_LABEL={job:"Job",internship:"Internship",coop:"Co-op"};
  function renderTrack(){
    var by={applied:[],accepted:[],rejected:[],interview:[],passed:[]};
    A.JOBS.forEach(function(j){
      var x=A.S.decisions[j.id];if(!x)return;
      if(x.s==="passed")by.passed.push({j:j,x:x});else by[by[x.st]&&x.st!=="passed"?x.st:"applied"].push({j:j,x:x});
    });
    function row(o,acts,view){
      var t=A.tone(o.x.pct),e=A.esc;
      return '<div class="row"><div class="logo" aria-hidden="true" style="background:hsl('+A.hue(o.j.id)+' 60% 46%)">'+e(o.j.co.charAt(0))+'</div><div class="info"><b>'+e(o.j.role)+'</b><small>'+e(o.j.co)+' · '+e(o.j.loc)+' · '+TYPE_LABEL[o.j.type||"job"]+'</small>'+
        (view!=="passed"?'<small>Applied '+new Date(o.x.at).toLocaleDateString(undefined,{month:"short",day:"numeric"})+'</small>':'')+
        detLine(o,view)+(o.x.sent?'<small>Application sent to '+e(o.x.sent.to||"the company")+(o.x.sent.status==="delivered_test"?" (test inbox)":"")+'</small>':'')+'</div><span class="pill tone-'+t+'">'+o.x.pct+'%</span>'+
        '<div class="acts">'+extraActs(o,acts,view).map(function(a,i){return '<button type="button" class="btn'+(i?' ghost':'')+'" data-act="'+a[0]+'" data-id="'+o.j.id+'" aria-label="'+a[1]+': '+e(o.j.role)+' at '+e(o.j.co)+'">'+a[1]+'</button>'}).join("")+'</div>'+(OPEN[o.j.id]&&view!=="passed"?detForm(o,view):"")+'</div>';
    }
    var v=sub.dash;
    if(v==="overview"){tp.innerHTML=overviewHTML(by);return}
    var h='<div class="stats big">'+[["applied","Applied"],["accepted","Accepted"],["rejected","Rejected"],["interview","Interviews"]].map(function(p){return '<div class="stat"><b>'+by[p[0]].length+'</b><small>'+p[1]+'</small></div>'}).join("")+'</div>';
    h+='<h3>'+label("dash",v)+' ('+by[v].length+')</h3>';
    if(!by[v].length)h+='<p class="note">'+EMPTY[v]+'</p>';
    by[v].sort(function(a,b){return b.x.at-a.x.at}).forEach(function(o){h+=row(o,ACTS[v],v)});
    if(v==="applied"){
      h+='<h3>Passed ('+by.passed.length+')</h3>';
      if(!by.passed.length)h+='<p class="note">Jobs you swipe left on are listed here.</p>';
      by.passed.forEach(function(o){h+=row(o,[["reconsider","Reconsider"]],"passed")});
    }
    tp.innerHTML=h;
  }
  tp.addEventListener("click",function(e){
    var b=e.target.closest("[data-act]");if(!b)return;
    var id=+b.getAttribute("data-id"),act=b.getAttribute("data-act"),x=A.S.decisions[id];if(!x)return;
    if(act==="open"){
      var job=A.JOBS.filter(function(j){return j.id===id})[0];
      if(job&&w.__aplyOpen)w.__aplyOpen(job.url);
      return;
    }
    if(act==="details"){OPEN[id]=!OPEN[id];renderTrack();return}
    if(act==="savedet"){saveDet(id,b.closest(".row"));return}
    if(act==="ics"){exportIcs(id);return}
    if(act==="withdraw"||act==="reconsider"){delete A.S.decisions[id];A.S.history=A.S.history.filter(function(i){return i!==id});delete acct.apps[id];saveA()}
    else{x.st=act;if(act==="interview"||act==="accepted"||act==="rejected")OPEN[id]=true}
    A.save();A.renderAll();renderTrack();
  });

  /* profile: three sections */
  var form=d.getElementById("form"),lead=form.querySelector(".lead"),secTitle=d.createElement("h3");
  secTitle.id="secTitle";form.insertBefore(secTitle,lead);
  var meter=d.createElement("div");meter.id="setMeter";form.insertBefore(meter,lead.nextSibling);
  d.getElementById("saveBtn").textContent="Save changes";
  form.addEventListener("submit",function(e){
    var ph=d.getElementById("pPhone").value.trim();
    if(ph&&!/^[+0-9 ()\-.]{7,20}$/.test(ph)){e.preventDefault();e.stopImmediatePropagation();d.getElementById("pPhoneErr").textContent="Phone numbers can only have digits, spaces, + ( ) - and .";d.getElementById("pPhone").focus();return}
    acct.phone=ph;saveA();
  },true);
  var fs=d.createElement("div");fs.id="filtersSec";fs.hidden=true;
  fs.innerHTML='<div class="field"><label for="fMin"><span class="l">Minimum match</span></label><input type="range" id="fMin" min="0" max="90" step="10" value="0"><small id="fMinV"></small></div>'+
    '<div class="field"><span class="l" id="fWsL">Work style</span><div class="filters" id="fWs" role="group" aria-labelledby="fWsL"><button type="button" data-f="all">All</button><button type="button" data-f="remote">Remote</button><button type="button" data-f="hybrid">Hybrid</button><button type="button" data-f="onsite">On-site</button></div><small>Same as the buttons above the cards.</small></div>'+
    '<div class="field"><span class="l">Jobs you passed on</span><button type="button" class="btn ghost" id="fBack" style="align-self:flex-start">Bring them back</button></div>';
  form.insertBefore(fs,form.querySelector(".formacts"));
  function syncFilters(){
    var m=A.getMin();
    d.getElementById("fMin").value=m;
    d.getElementById("fMinV").textContent=m>0?"Hide anything below "+m+"% match":"Show everything";
    d.querySelectorAll("#fWs button").forEach(function(b){b.setAttribute("aria-pressed",b.getAttribute("data-f")===A.getFilter()?"true":"false")});
  }
  d.getElementById("fMin").addEventListener("input",function(e){A.setMin(+e.target.value);savePrefs();syncFilters()});
  d.querySelectorAll("#fWs button").forEach(function(b){b.onclick=function(){A.setFilter(b.getAttribute("data-f"));savePrefs();syncFilters()}});
  d.querySelectorAll("#filters button").forEach(function(b){b.addEventListener("click",function(){setTimeout(function(){savePrefs();syncFilters()},0)})});
  d.getElementById("fBack").onclick=function(){
    Object.keys(A.S.decisions).forEach(function(k){if(A.S.decisions[k].s==="passed")delete A.S.decisions[k]});
    A.S.history=A.S.history.filter(function(i){return !!A.S.decisions[i]});
    A.save();A.renderAll();this.textContent="Done";var b=this;setTimeout(function(){b.textContent="Bring them back"},1500);
  };
  function section(v){
    secTitle.textContent=label("prof",v);lead.textContent=LEADS[v];
    form.hidden=!!ACCT[v];acctSec.hidden=!ACCT[v];
    d.getElementById("pPhone").value=acct.phone;d.getElementById("pPhoneErr").textContent="";
    meter.hidden=v!=="settings";
    if(v==="settings"){
      var cl=checklist(),dn=cl.filter(function(c){return c[1]}).length,miss=cl.filter(function(c){return !c[1]})[0];
      meter.innerHTML='<b>Profile '+Math.round(dn/cl.length*100)+'% complete</b><div class="bar"><i style="width:'+Math.round(dn/cl.length*100)+'%"></i></div><small>'+(miss?'Next: '+E(miss[0])+(miss[2]==="resume"?' (in Resume &amp; links)':''):'Everything employers usually ask for is filled in.')+'</small>';
    }
    if(ACCT[v])renderAcct(v);
    if(w.__aplySyncPrefs)w.__aplySyncPrefs();
    Object.keys(FIELDS).forEach(function(key){FIELDS[key].forEach(function(id){d.getElementById(id).closest(".field").hidden=(key!==v)})});
    fs.hidden=v!=="filters";
    d.getElementById("saveBtn").hidden=v==="filters";
    d.getElementById("resetBtn").hidden=v!=="filters";
    syncFilters();
  }

  /* ---------- account: per-application details, preferences/filters, resume, plan, data, dashboard overview ---------- */
  var AK=w.__aplyKey+".acct",E=A.esc,OPEN={};
  var PLANS={
    trial:{name:"Free trial",price:0,cap:10,days:14,perks:["10 applications","14 days","Every feature"]},
    starter:{name:"Starter",price:9,cap:30,perks:["30 applications a month","Dashboard and tracking","Resume and links"]},
    pro:{name:"Pro",price:19,cap:0,perks:["Unlimited applications","Interview calendar files","Priority support"]}
  };
  var DAY=864e5,DATA_URL=/^data:[\w\/+.\-]+;base64,[A-Za-z0-9+\/=]+$/,URL_OK=/^https?:\/\//i;
  function defAcct(){return {phone:"",linkedin:"",portfolio:"",summary:"",auth:"",notice:"",cover:"",resumeName:"",resumeSize:0,resumeData:"",plan:"trial",since:Date.now(),renews:0,canceled:false,enforce:false,pay:[],apps:{},fSal:false,fYrs:"any",fCo:"",fKw:""}}
  function loadA(){
    var a=defAcct();
    try{var r=JSON.parse(w.localStorage.getItem(AK));if(r&&typeof r==="object"){Object.keys(a).forEach(function(k){if(r[k]!==undefined&&typeof r[k]===typeof a[k])a[k]=r[k]})}}catch(e){}
    if(!Array.isArray(a.pay))a.pay=[];
    if(!PLANS[a.plan])a.plan="trial";
    if(!a.resumeName||!DATA_URL.test(a.resumeData)){a.resumeName="";a.resumeData="";a.resumeSize=0}
    ["fCo","fKw","phone","linkedin","portfolio","summary","cover","auth","notice"].forEach(function(k){a[k]=String(a[k]).slice(0,k==="cover"?1500:600)});
    if(["any","0","1","2","3"].indexOf(a.fYrs)<0)a.fYrs="any";
    return a;
  }
  var acct=loadA();
  function saveA(){try{w.localStorage.setItem(AK,JSON.stringify(acct));return true}catch(e){return false}}
  function list(s){return String(s).split(",").map(function(x){return x.trim().toLowerCase()}).filter(Boolean)}
  w.__aplyHide=function(j){
    var p=A.S.profile;
    if(acct.fSal&&p.salary&&j.sal&&j.sal.length>1&&j.sal[1]<p.salary)return true;
    if(acct.fYrs!=="any"&&j.yrs>(+p.years||0)+(+acct.fYrs))return true;
    var co=String(j.co).toLowerCase(),hay=(String(j.role)+" "+(j.skills||[]).join(" ")).toLowerCase();
    return list(acct.fCo).some(function(x){return co.indexOf(x)>-1})||list(acct.fKw).some(function(x){return hay.indexOf(x)>-1});
  };

  /* plan and limits (sandbox: simulated, nothing is charged) */
  function tick(){
    var p=PLANS[acct.plan],ch=false;
    if(acct.plan!=="trial"&&!acct.canceled)while(acct.renews&&acct.renews<Date.now()){acct.renews+=30*DAY;acct.pay.push({at:acct.renews-30*DAY,plan:acct.plan,amt:p.price});ch=true}
    if(acct.pay.length>24){acct.pay=acct.pay.slice(-24);ch=true}
    if(ch)saveA();
  }
  function usedCount(){
    var start=acct.plan==="trial"?acct.since:acct.renews-30*DAY,n=0;
    Object.keys(A.S.decisions).forEach(function(k){var x=A.S.decisions[k];if(x.s==="applied"&&x.at>=start)n++});
    return n;
  }
  function planState(){
    tick();
    var p=PLANS[acct.plan],u=usedCount(),r={plan:p,used:u,cap:p.cap,left:p.cap?Math.max(0,p.cap-u):null,days:null,ok:true,why:""};
    if(acct.plan==="trial"){
      var dl=Math.ceil((acct.since+p.days*DAY-Date.now())/DAY);r.days=Math.max(0,dl);
      if(dl<=0){r.ok=false;r.why="Your "+p.days+"-day free trial has ended."}
      else if(u>=p.cap){r.ok=false;r.why="You used all "+p.cap+" free-trial applications."}
    }else if(acct.canceled&&acct.renews<Date.now()){r.ok=false;r.why="Your subscription has ended."}
    else if(p.cap&&u>=p.cap){r.ok=false;r.why="You reached "+p.cap+" applications this month on "+p.name+"."}
    return r;
  }
  w.__aplyGate=function(){
    if(!acct.enforce)return true;
    var s=planState();if(s.ok)return true;
    paywall(s.why);return false;
  };
  function paywall(why){
    if(d.getElementById("paywall"))return;
    var o=d.createElement("div");o.id="paywall";
    o.innerHTML='<div role="dialog" aria-modal="true" aria-label="Plan required"><h2 style="margin:0 0 6px;font:800 20px var(--display)">Choose a plan to keep applying</h2><p style="margin:0 0 16px;color:var(--muted)">'+E(why)+' Passing on jobs and your dashboard still work.</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" id="pwNo" type="button">Not now</button><button class="btn" id="pwYes" type="button">See plans</button></div></div>';
    d.body.appendChild(o);
    var yes=d.getElementById("pwYes");yes.focus();
    function close(){o.remove()}
    d.getElementById("pwNo").onclick=close;
    o.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
    yes.onclick=function(){close();sub.prof="plan";cur="prof";go("prof")};
  }

  /* profile completeness */
  function checklist(){
    var p=A.S.profile,a=acct,c=!!p.custom;
    return [["Your name",c&&!!p.name,"settings"],["An email recruiters can reply to",c&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email||""),"settings"],["Job title",c&&!!p.title,"settings"],["At least 3 skills",c&&p.skills.length>=3,"settings"],["Your city",c&&!!p.loc,"settings"],
      ["Phone number",!!a.phone,"resume"],["Work authorization",!!a.auth,"resume"],["Resume uploaded",!!a.resumeName,"resume"],["Short summary (40+ characters)",a.summary.length>=40,"resume"],["LinkedIn or portfolio link",!!(a.linkedin||a.portfolio),"resume"]];
  }

  /* per-application details (interview time, offer, rejection reason, notes) */
  function ap(id){return acct.apps[id]||{}}
  function fmtD(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||"");return m?new Date(+m[1],m[2]-1,+m[3]).toLocaleDateString(undefined,{month:"short",day:"numeric"}):""}
  function fmtDT(s){var t=new Date(s);return isNaN(t)?"":t.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
  function detLine(o,v){
    var a=ap(o.j.id),b=[];
    if(v==="interview"&&a.when)b.push("Interview "+fmtDT(a.when)+(a.fmt?" · "+a.fmt:"")+(a.who?" · "+a.who:""));
    if(v==="accepted"){if(a.offer)b.push("Offer $"+Number(a.offer).toLocaleString());if(a.deadline)b.push("Reply by "+fmtD(a.deadline));if(a.startd)b.push("Starts "+fmtD(a.startd))}
    if(v==="rejected"){if(a.reason)b.push(a.reason);if(a.again)b.push("Reapply after "+fmtD(a.again))}
    if(v==="applied"&&a.follow)b.push("Follow up "+fmtD(a.follow));
    if(a.note)b.push("Note: "+a.note.slice(0,60)+(a.note.length>60?"…":""));
    return b.length?'<small>'+b.map(E).join(" · ")+'</small>':"";
  }
  function extraActs(o,acts,v){
    var r=acts.slice(),id=o.j.id;
    if(v!=="passed")r.push(["details",OPEN[id]?"Hide details":"Details"]);
    if(v==="interview"&&ap(id).when)r.push(["ics","Add to calendar"]);
    if(o.j.url)r.push(["open","Open posting"]);
    return r;
  }
  function detForm(o,v){
    var a=ap(o.j.id);
    function f(k,l,t,x){return '<div class="field"><label>'+l+'<input data-f="'+k+'" type="'+t+'" value="'+E(a[k]||"")+'" '+(x||"")+'></label></div>'}
    function s(k,l,opts){return '<div class="field"><label>'+l+'<select data-f="'+k+'"><option value="">Choose</option>'+opts.map(function(x){return '<option'+(a[k]===x?" selected":"")+'>'+x+'</option>'}).join("")+'</select></label></div>'}
    var h='<div class="det" style="flex-basis:100%"><div class="grid">';
    if(v==="interview")h+=f("when","Date and time","datetime-local")+s("fmt","Format",["Phone","Video","On-site"])+f("who","Interviewer or contact","text",'maxlength="80"');
    else if(v==="accepted")h+=f("offer","Offer (USD per year)","number",'min="0" max="10000000" step="1000"')+f("deadline","Reply by","date")+f("startd","Start date","date");
    else if(v==="rejected")h+=s("reason","Reason",["No reply","Not a fit","Position filled","Not enough experience","Other"])+f("again","Reapply after","date");
    else h+=f("follow","Follow up on","date");
    h+='<div class="field full"><label>Notes<textarea data-f="note" maxlength="500" style="min-height:70px">'+E(a.note||"")+'</textarea></label></div></div>'+
      '<div class="acts" style="margin-top:8px"><button type="button" class="btn" data-act="savedet" data-id="'+o.j.id+'">Save details</button><button type="button" class="btn ghost" data-act="details" data-id="'+o.j.id+'">Close</button></div></div>';
    return h;
  }
  function saveDet(id,row){
    var a={};
    row.querySelectorAll("[data-f]").forEach(function(el){
      var k=el.getAttribute("data-f"),v=String(el.value||"").trim();
      if(k==="offer"){v=v?String(Math.min(10000000,Math.max(0,Math.round(+v||0)))):""}
      else if(k==="when"){if(v&&isNaN(new Date(v)))v=""}
      else v=v.slice(0,k==="note"?500:80);
      if(v)a[k]=v;
    });
    if(Object.keys(a).length)acct.apps[id]=a;else delete acct.apps[id];
    saveA();renderTrack();
  }
  function icsTime(t){function z(n){return (n<10?"0":"")+n}return t.getUTCFullYear()+z(t.getUTCMonth()+1)+z(t.getUTCDate())+"T"+z(t.getUTCHours())+z(t.getUTCMinutes())+"00Z"}
  function icsText(s){return String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n")}
  function download(name,type,text){
    var b=new w.Blob([text],{type:type}),u=w.URL.createObjectURL(b),a=d.createElement("a");
    a.href=u;a.download=name;d.body.appendChild(a);a.click();a.remove();setTimeout(function(){w.URL.revokeObjectURL(u)},4000);
  }
  function exportIcs(id){
    var job=A.JOBS.filter(function(j){return j.id===id})[0],a=ap(id),t=new Date(a.when);
    if(!job||isNaN(t))return;
    download("interview-"+job.co.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".ics","text/calendar",
      ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aply//EN","BEGIN:VEVENT","UID:aply-"+id+"-"+t.getTime()+"@aply","DTSTAMP:"+icsTime(new Date()),"DTSTART:"+icsTime(t),"DTEND:"+icsTime(new Date(t.getTime()+36e5)),
       "SUMMARY:"+icsText("Interview: "+job.role+" at "+job.co),"DESCRIPTION:"+icsText((a.fmt?a.fmt+". ":"")+(a.who?"With "+a.who+". ":"")+(a.note||"")),"END:VEVENT","END:VCALENDAR"].join("\r\n"));
  }
  function csvCell(v){v=String(v==null?"":v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'}
  function exportCsv(){
    var rows=[["Company","Role","Type","Location","Status","Match %","Applied on","Interview","Offer (USD)","Reply by","Notes","Posting"]];
    A.JOBS.forEach(function(j){
      var x=A.S.decisions[j.id];if(!x||x.s!=="applied")return;var a=ap(j.id);
      rows.push([j.co,j.role,TYPE_LABEL[j.type||"job"],j.loc,x.st||"applied",x.pct,new Date(x.at).toISOString().slice(0,10),a.when||"",a.offer||"",a.deadline||"",a.note||"",j.url||""]);
    });
    download("aply-applications.csv","text/csv",rows.map(function(r){return r.map(csvCell).join(",")}).join("\r\n"));
  }

  /* dashboard overview */
  function overviewHTML(by){
    var n=by.applied.length+by.interview.length+by.accepted.length+by.rejected.length,answered=by.interview.length+by.accepted.length+by.rejected.length,sum=0;
    ["applied","interview","accepted","rejected"].forEach(function(k){by[k].forEach(function(o){sum+=o.x.pct})});
    var cl=checklist(),done=cl.filter(function(c){return c[1]}).length,pct=Math.round(done/cl.length*100),ps=planState(),soon=[];
    by.interview.forEach(function(o){var a=ap(o.j.id);if(a.when&&new Date(a.when)>=new Date(Date.now()-36e5))soon.push([new Date(a.when).getTime(),"Interview with "+o.j.co+" · "+fmtDT(a.when)])});
    by.accepted.forEach(function(o){var a=ap(o.j.id);if(a.deadline)soon.push([new Date(a.deadline+"T12:00").getTime(),"Reply to "+o.j.co+" offer by "+fmtD(a.deadline)])});
    by.applied.forEach(function(o){var a=ap(o.j.id);if(a.follow)soon.push([new Date(a.follow+"T12:00").getTime(),"Follow up with "+o.j.co+" on "+fmtD(a.follow)])});
    soon.sort(function(a,b){return a[0]-b[0]});
    var h='<div class="overview"><div class="stats big">'+[[n,"Applications"],[by.interview.length,"Interviews"],[by.accepted.length,"Offers"],[by.rejected.length,"Rejected"]].map(function(p){return '<div class="stat"><b>'+p[0]+'</b><small>'+p[1]+'</small></div>'}).join("")+'</div>'+
      '<div class="stats big">'+[[by.applied.length,"Waiting"],[n?Math.round(answered/n*100)+"%":"–","Heard back"],[n?Math.round(sum/n)+"%":"–","Avg match"],[by.passed.length,"Passed"]].map(function(p){return '<div class="stat"><b>'+p[0]+'</b><small>'+p[1]+'</small></div>'}).join("")+'</div>'+
      '<div class="plan" style="display:flex;flex-direction:column;gap:8px;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--surface)"><b>Profile '+pct+'% complete</b><div class="bar" style="height:10px;border-radius:999px;background:var(--line);overflow:hidden"><i style="display:block;height:100%;width:'+pct+'%;background:linear-gradient(135deg,var(--accent),var(--accent2))"></i></div>';
    cl.filter(function(c){return !c[1]}).slice(0,4).forEach(function(c){h+='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>'+E(c[0])+'</span><button type="button" class="btn ghost" data-go="'+c[2]+'">Add</button></div>'});
    if(done===cl.length)h+='<small>Everything employers usually ask for is filled in.</small>';
    h+='</div><div class="plan" style="display:flex;flex-direction:column;gap:6px;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--surface)"><b>'+E(ps.plan.name)+(acct.enforce?"":' <small>(limits off in sandbox)</small>')+'</b><small>'+
      (ps.cap?ps.used+" of "+ps.cap+" applications used":ps.used+" applications this month, no limit")+(ps.days!=null?" · "+ps.days+" days left":"")+(ps.ok?"":" · "+E(ps.why))+'</small><button type="button" class="btn ghost" data-go="plan" style="align-self:flex-start">Manage plan</button></div>';
    h+='<h3>Coming up</h3>'+(soon.length?soon.slice(0,6).map(function(s){return '<p class="note" style="margin:0">'+E(s[1])+'</p>'}).join(""):'<p class="note">Nothing scheduled. Open an application, tap Details and add an interview time, offer deadline or follow-up date.</p>');
    h+='<div class="acts"><button type="button" class="btn" data-go="svc">Find opportunities</button><button type="button" class="btn ghost" data-go="dash:interview">Interviews</button><button type="button" class="btn ghost" data-csv="1">Export applications (CSV)</button></div></div>';
    return h;
  }
  tp.addEventListener("click",function(e){
    var g=e.target.closest("[data-go]");
    if(g){var v=g.getAttribute("data-go");if(v==="svc"){cur="svc";go("svc")}else if(v.indexOf("dash:")===0){sub.dash=v.slice(5);cur="dash";go("dash")}else{sub.prof=v;cur="prof";go("prof")}return}
    if(e.target.closest("[data-csv]"))exportCsv();
  });

  /* preferences + filters that really change the feed */
  (function(){
    var f=d.createElement("div");f.className="field full";f.id="aPrefs";
    f.innerHTML='<span class="l">Dealbreakers</span><div class="checks"><label><input type="checkbox" id="aSal"> Hide jobs whose top pay is below my minimum</label></div>'+
      '<label for="aYrs">Hide jobs asking for more experience than I have by</label><select id="aYrs"><option value="any">Show all</option><option value="0">Any amount</option><option value="1">1+ year</option><option value="2">2+ years</option><option value="3">3+ years</option></select><small>Takes effect right away in Jobs, Internships and Co-ops.</small>';
    d.querySelector("#form .grid").appendChild(f);
    FIELDS.preferences.push("aPrefs");
    var extra=d.createElement("div");extra.className="field";
    extra.innerHTML='<label for="fCo">Hide these companies</label><input type="text" id="fCo" maxlength="200" placeholder="Acme, Globex"><small>Separate with commas.</small>'+
      '<label for="fKw" style="margin-top:8px">Hide roles or skills containing</label><input type="text" id="fKw" maxlength="200" placeholder="sales, php"><small>Matches the job title and its skills.</small>';
    fs.insertBefore(extra,fs.firstChild);
    function sync(){d.getElementById("aSal").checked=!!acct.fSal;d.getElementById("aYrs").value=acct.fYrs;d.getElementById("fCo").value=acct.fCo;d.getElementById("fKw").value=acct.fKw}
    function changed(){
      acct.fSal=d.getElementById("aSal").checked;acct.fYrs=d.getElementById("aYrs").value;
      acct.fCo=d.getElementById("fCo").value.slice(0,200);acct.fKw=d.getElementById("fKw").value.slice(0,200);
      saveA();A.renderAll();
    }
    ["aSal","aYrs","fCo","fKw"].forEach(function(id){d.getElementById(id).addEventListener(id==="fCo"||id==="fKw"?"input":"change",changed)});
    w.__aplySyncPrefs=sync;sync();
  })();

  /* resume, plan and data panels */
  var acctSec=d.createElement("div");acctSec.id="acctSec";acctSec.className="form";acctSec.hidden=true;form.after(acctSec);
  var AUTH=["Authorized to work in the US without sponsorship","Authorized now, will need sponsorship later","Need sponsorship now","Authorized to work outside the US"];
  var NOTICE=["Immediately","2 weeks","1 month","2 months or more"];
  function msg(t){var m=d.getElementById("aMsg");if(m)m.textContent=t}
  function cleanUrl(u){u=String(u||"").trim();if(!u)return "";if(!URL_OK.test(u))u="https://"+u;try{var x=new w.URL(u);return /^https?:$/.test(x.protocol)?x.href.slice(0,300):null}catch(e){return null}}
  function opts(list,cur){return '<option value="">Choose</option>'+list.map(function(x){return '<option'+(cur===x?" selected":"")+'>'+E(x)+'</option>'}).join("")}
  function renderAcct(v){
    var h='<h3>'+label("prof",v)+'</h3><p class="lead">'+LEADS[v]+'</p>';
    if(v==="resume"){
      var a=acct;
      h+='<div class="grid"><div class="field"><label for="aPhone">Phone</label><input type="tel" id="aPhone" autocomplete="tel" maxlength="20" value="'+E(a.phone)+'" placeholder="+1 555 123 4567"></div>'+
        '<div class="field"><label for="aLinked">LinkedIn</label><input type="text" id="aLinked" inputmode="url" maxlength="300" value="'+E(a.linkedin)+'" placeholder="linkedin.com/in/you"></div>'+
        '<div class="field"><label for="aSite">Portfolio or website</label><input type="text" id="aSite" inputmode="url" maxlength="300" value="'+E(a.portfolio)+'" placeholder="yourname.com"></div>'+
        '<div class="field"><label for="aAuth">Work authorization</label><select id="aAuth">'+opts(AUTH,a.auth)+'</select></div>'+
        '<div class="field"><label for="aNotice">When can you start?</label><select id="aNotice">'+opts(NOTICE,a.notice)+'</select></div>'+
        '<div class="field full"><label for="aSummary">Short summary</label><textarea id="aSummary" maxlength="600">'+E(a.summary)+'</textarea><small>Two or three sentences recruiters read first.</small></div>'+
        '<div class="field full"><label for="aCover">Cover note template</label><textarea id="aCover" maxlength="1500" placeholder="Hi, I am excited about the {role} role at {company}...">'+E(a.cover)+'</textarea><small>Use {role}, {company} and {name}. Saved for when you write to a recruiter.</small></div>'+
        '<div class="field full"><span class="l">Resume</span>'+
        (a.resumeName?'<div class="todo"><span>'+E(a.resumeName)+' ('+Math.max(1,Math.round(a.resumeSize/1024))+' KB)</span><span class="acts"><a class="btn ghost" download="'+E(a.resumeName)+'" href="'+a.resumeData+'">Download</a><button type="button" class="btn ghost" data-a="rmres">Remove</button></span></div>':'<small>No resume added yet.</small>')+
        '<input type="file" id="aFile" accept=".pdf,.doc,.docx,.txt,.md"><small>PDF, Word or text, up to 1 MB. Stays in this browser.</small></div></div>'+
        '<div class="acts"><button type="button" class="btn" data-a="saveres">Save</button></div>';
    }else if(v==="plan"){
      var ps=planState();
      h+='<div class="plan" style="display:flex;flex-direction:column;gap:6px"><span class="tag">SANDBOX · TEST MODE</span><b>Current plan: '+E(ps.plan.name)+(acct.canceled&&acct.plan!=="trial"?" (ends "+new Date(acct.renews).toLocaleDateString()+")":"")+'</b>'+
        '<small>'+(ps.cap?ps.used+" of "+ps.cap+" applications used":ps.used+" applications this month")+(ps.days!=null?" · "+ps.days+" days left in trial":"")+(acct.plan!=="trial"&&!acct.canceled?" · renews "+new Date(acct.renews).toLocaleDateString():"")+'</small>'+
        (ps.cap?'<div class="bar"><i style="width:'+Math.min(100,Math.round(ps.used/ps.cap*100))+'%"></i></div>':"")+(ps.ok?"":'<p class="note" style="margin:0">'+E(ps.why)+'</p>')+'</div><div class="plans">';
      Object.keys(PLANS).forEach(function(k){
        var p=PLANS[k],cur=acct.plan===k;
        h+='<div class="plan" data-cur="'+cur+'"><b>'+p.name+'</b><span class="pr">'+(p.price?"$"+p.price+'<small>/month</small>':"Free")+'</span><ul>'+p.perks.map(function(x){return '<li>'+E(x)+'</li>'}).join("")+'</ul>'+
          (k==="trial"?'':(cur?(acct.canceled?'<button type="button" class="btn" data-a="resub">Resume subscription</button>':'<button type="button" class="btn ghost" data-a="cancel">Cancel plan</button>'):'<button type="button" class="btn" data-plan="'+k+'">'+(acct.plan==="trial"?"Choose ":"Switch to ")+p.name+' (test)</button>'))+'</div>';
      });
      h+='</div><p class="note">In the live app, paid plans open a secure checkout from a payment provider. Aply never sees or stores card numbers. In the sandbox, choosing a plan only records a test payment.</p>'+
        '<h3>Payments</h3>'+(acct.pay.length?acct.pay.slice().reverse().map(function(p){return '<div class="todo"><span>'+new Date(p.at).toLocaleDateString()+' · '+E(PLANS[p.plan]?PLANS[p.plan].name:"Plan")+'</span><span>$'+(+p.amt||0).toFixed(2)+' (test)</span></div>'}).join(""):'<p class="note">No payments yet.</p>')+
        '<h3>Sandbox controls</h3><label class="toggle"><input type="checkbox" id="aEnf"'+(acct.enforce?" checked":"")+'> Enforce plan limits (shows the paywall when the trial or monthly limit runs out)</label><div class="acts"><button type="button" class="btn ghost" data-a="rtrial">Restart free trial</button></div>';
    }else{
      h+='<h3 style="font-size:15px">Back up</h3><p class="note" style="margin:0">Your profile, applications and details in one file you keep.</p><div class="acts"><button type="button" class="btn" data-a="exp">Download backup (JSON)</button><button type="button" class="btn ghost" data-csv="1">Applications (CSV)</button></div>'+
        '<h3 style="font-size:15px">Restore</h3><input type="file" id="aImp" accept=".json,application/json"><small>Replaces what is on this device with the file. Only files made by Aply are accepted.</small>'+
        '<h3 style="font-size:15px">Privacy</h3><p class="note" style="margin:0">Everything above is stored in this browser only. In sandbox, applications go to a simulated inbox unless you turned on live sending.</p>'+
        '<h3 style="font-size:15px">Delete everything</h3><button type="button" class="btn ghost" data-a="wipe" style="align-self:flex-start">Delete all my data</button>';
    }
    acctSec.innerHTML=h+'<p class="note" id="aMsg" role="status"></p>';
  }
  function readFile(file,asText,cb){
    var r=new w.FileReader();r.onload=function(){cb(r.result)};r.onerror=function(){cb(null)};
    asText?r.readAsText(file):r.readAsDataURL(file);
  }
  acctSec.addEventListener("change",function(e){
    var t=e.target;
    if(t.id==="aEnf"){acct.enforce=t.checked;saveA();msg(acct.enforce?"Limits are now enforced.":"Limits are off.")}
    else if(t.id==="aFile"&&t.files[0]){
      var f=t.files[0];
      if(f.size>1048576){msg("That file is over 1 MB.");t.value="";return}
      if(!/\.(pdf|docx?|txt|md)$/i.test(f.name)){msg("Use a PDF, Word or text file.");t.value="";return}
      readFile(f,false,function(u){
        if(!u||!DATA_URL.test(u)){msg("Could not read that file.");return}
        var prev=[acct.resumeName,acct.resumeSize,acct.resumeData];
        acct.resumeName=f.name.slice(0,120);acct.resumeSize=f.size;acct.resumeData=u;
        if(saveA()){renderAcct("resume");msg("Resume added.")}else{acct.resumeName=prev[0];acct.resumeSize=prev[1];acct.resumeData=prev[2];msg("Not enough browser storage for that file.")}
      });
    }else if(t.id==="aImp"&&t.files[0]){
      var g=t.files[0];if(g.size>3145728){msg("That file is too large.");return}
      readFile(g,true,function(txt){var r=importBackup(txt);msg(r===true?"Restored.":r);if(r===true)renderAcct("data")});
    }
  });
  acctSec.addEventListener("click",function(e){
    var pb=e.target.closest("[data-plan]"),b=e.target.closest("[data-a]");
    if(e.target.closest("[data-csv]"))return exportCsv();
    if(pb){
      var k=pb.getAttribute("data-plan");if(!PLANS[k]||k==="trial")return;
      acct.plan=k;acct.since=Date.now();acct.renews=acct.since+30*DAY;acct.canceled=false;acct.pay.push({at:acct.since,plan:k,amt:PLANS[k].price});
      saveA();renderAcct("plan");msg(PLANS[k].name+" is active (test payment recorded).");return;
    }
    if(!b)return;
    var a=b.getAttribute("data-a");
    if(a==="saveres"){
      var li=cleanUrl(d.getElementById("aLinked").value),si=cleanUrl(d.getElementById("aSite").value),ph=d.getElementById("aPhone").value.trim();
      if(li===null||si===null){msg("One of the links is not a valid web address.");return}
      if(ph&&!/^[+0-9 ()\-.]{7,20}$/.test(ph)){msg("Phone numbers can only have digits, spaces, + ( ) - and .");return}
      acct.phone=ph;acct.linkedin=li;acct.portfolio=si;acct.auth=d.getElementById("aAuth").value;acct.notice=d.getElementById("aNotice").value;
      acct.summary=d.getElementById("aSummary").value.trim().slice(0,600);acct.cover=d.getElementById("aCover").value.trim().slice(0,1500);
      msg(saveA()?"Saved.":"Could not save: browser storage is full.");
    }
    else if(a==="rmres"){acct.resumeName="";acct.resumeData="";acct.resumeSize=0;saveA();renderAcct("resume");msg("Resume removed.")}
    else if(a==="cancel"){acct.canceled=true;saveA();renderAcct("plan");msg("Plan canceled. It stays active until the end of the period.")}
    else if(a==="resub"){acct.canceled=false;if(acct.renews<Date.now())acct.renews=Date.now()+30*DAY;saveA();renderAcct("plan");msg("Subscription resumed.")}
    else if(a==="rtrial"){acct.plan="trial";acct.since=Date.now();acct.canceled=false;acct.renews=0;saveA();renderAcct("plan");msg("Trial restarted.")}
    else if(a==="exp"){
      download("aply-backup.json","application/json",JSON.stringify({app:"aply",v:1,exported:new Date().toISOString(),profile:A.S.profile,decisions:A.S.decisions,acct:acct}));
    }
    else if(a==="wipe"){
      if(b.getAttribute("data-sure")!=="1"){b.setAttribute("data-sure","1");b.textContent="Click again to delete everything";return}
      [w.__aplyKey,AK,NK].forEach(function(k){try{w.localStorage.removeItem(k)}catch(x){}});
      w.location.reload();
    }
  });
  function importBackup(txt){
    var o;try{o=JSON.parse(txt)}catch(e){return "That is not a valid backup file."}
    if(!o||o.app!=="aply"||o.v!==1||typeof o.profile!=="object"||o.profile===null)return "That file was not made by Aply.";
    function str(x,n){return typeof x==="string"?x.slice(0,n):""}
    function num(x,lo,hi){x=+x;return isFinite(x)?Math.min(hi,Math.max(lo,x)):lo}
    var p=o.profile,m=(p.modes&&typeof p.modes==="object")?p.modes:{},LV=["High school","Associate","Bachelor","Master","Doctorate"];
    var np={name:str(p.name,100),title:str(p.title,100),email:str(p.email,200),years:num(p.years,0,50),edu:LV.indexOf(p.edu)>-1?p.edu:"Bachelor",
      skills:Array.isArray(p.skills)?p.skills.filter(function(s){return typeof s==="string"&&s.trim()}).slice(0,40).map(function(s){return s.slice(0,40)}):[],
      salary:num(p.salary,0,10000000),loc:str(p.loc,100),modes:{remote:!!m.remote,hybrid:!!m.hybrid,onsite:!!m.onsite},reloc:!!p.reloc,custom:true};
    var known={};A.JOBS.forEach(function(j){known[j.id]=1});
    var nd={},ids=[];
    if(o.decisions&&typeof o.decisions==="object")Object.keys(o.decisions).forEach(function(k){
      var x=o.decisions[k];if(!known[k]||!x||(x.s!=="applied"&&x.s!=="passed"))return;
      nd[k]={s:x.s,at:num(x.at,0,4e12),pct:num(x.pct,0,100),as:str(x.as,100)||"You",title:str(x.title,100),st:(x.st==="interview"||x.st==="accepted"||x.st==="rejected")?x.st:"applied"};
      ids.push(+k);
    });
    ids.sort(function(a,b){return nd[a].at-nd[b].at});
    var na=defAcct();
    if(o.acct&&typeof o.acct==="object"){
      Object.keys(na).forEach(function(k){if(k!=="apps"&&k!=="pay"&&o.acct[k]!==undefined&&typeof o.acct[k]===typeof na[k])na[k]=o.acct[k]});
      if(o.acct.apps&&typeof o.acct.apps==="object")Object.keys(o.acct.apps).forEach(function(id){
        var s=o.acct.apps[id];if(!known[id]||!s||typeof s!=="object")return;var c={};
        ["when","fmt","who","offer","deadline","startd","reason","again","follow","note"].forEach(function(f){if(typeof s[f]==="string"&&s[f])c[f]=s[f].slice(0,f==="note"?500:80)});
        na.apps[id]=c;
      });
      if(Array.isArray(o.acct.pay))na.pay=o.acct.pay.slice(-24).filter(function(q){return q&&PLANS[q.plan]}).map(function(q){return {at:num(q.at,0,4e12),plan:q.plan,amt:PLANS[q.plan].price}});
    }
    var keep=acct;acct=na;
    if(!PLANS[acct.plan])acct.plan="trial";
    if(!acct.resumeName||!DATA_URL.test(acct.resumeData)){acct.resumeName="";acct.resumeData="";acct.resumeSize=0}
    if(!saveA()){acct=keep;return "Not enough browser storage for that backup."}
    A.S.profile=np;A.S.decisions=nd;A.S.history=ids;A.save();A.renderAll();
    if(w.__aplySyncPrefs)w.__aplySyncPrefs();
    return true;
  }

  /* routing */
  function go(k){
    going=true;
    if(k==="svc"){A.setType(sub.svc);A.show("swipe");savePrefs()}
    else if(k==="dash"){A.show("apps");d.getElementById("pane-apps").hidden=true;renderTrack();tp.hidden=false}
    else{A.show("profile");section(sub.prof)}
    going=false;refresh();main.scrollTop=0;
  }
  w.__aplyOnShow=function(t){
    tp.hidden=true;
    if(going)return;
    cur=t==="profile"?"prof":"svc";
    if(t==="profile")section(sub.prof);
    refresh();
  };
  section(sub.prof);
  refresh();
}

window.AplyNav={patch:patch,apply:apply};
})();
