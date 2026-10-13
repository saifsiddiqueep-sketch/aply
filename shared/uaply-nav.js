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
 {id:21,type:"parttime",co:"Corner Table Cafe",role:"Weekend Barista Lead",loc:"Philadelphia",mode:"onsite",sal:[30000,36000],yrs:1,edu:"High school",skills:["Customer service","Cash handling","Teamwork"],blurb:"Twenty hours a week, mostly weekends, leading a small morning crew."},
 {id:22,type:"parttime",co:"Brightpath Tutoring",role:"Part-time Math Tutor",loc:"Remote (US)",mode:"remote",sal:[28000,40000],yrs:1,edu:"Associate",skills:["Math","Communication","Teaching"],blurb:"Evening sessions with middle school students, ten to fifteen hours a week."},
 {id:20,type:"coop",co:"Lumen Labs",role:"Web Co-op",loc:"Remote (US)",mode:"remote",sal:[46000,56000],yrs:0,edu:"Associate",skills:["React","TypeScript","CSS","JavaScript"],blurb:"Full-semester co-op building customer-facing pages for a lighting startup."}`;

var API=`
window.__uaply={S:S,JOBS:JOBS,save:save,renderAll:renderAll,show:show,setFilter:setFilter,esc:esc,hue:hue,money:money,tone:tone,cap:cap,evaluate:evaluate,
 setType:function(t){TYPE=t;renderDeck();renderDash()},getType:function(){return TYPE},
 setMin:function(n){MINPCT=n;renderDeck();renderDash()},getMin:function(){return MINPCT},getFilter:function(){return F}};`;

function patch(s){
  s=once(s,'$("pName").value=p.name;$("pTitle").value=p.title;$("pYears").value=p.years;$("pEdu").value=p.edu;',
           'var X=!p.custom;$("pName").value=X?"":p.name;$("pTitle").value=X?"":p.title;$("pYears").value=X?"":p.years;$("pEdu").value=p.edu;');
  s=once(s,'regional cookbooks."}','regional cookbooks."}'+EXTRA);
  s=once(s,'var busy=false,F="all";','var busy=false,F="all",TYPE="job",MINPCT=0;');
  s=once(s,'&&(F==="all"||j.mode===F)}).map(function(j){return {j:j,m:evaluate(j,S.profile)}}).sort(',
           '&&(j.type||"job")===TYPE&&!(window.__uaplyHide&&window.__uaplyHide(j))&&(F==="all"||j.mode===F)}).map(function(j){return {j:j,m:evaluate(j,S.profile)}}).filter(function(x){return x.m.pct>=MINPCT}).sort(');
  s=once(s,'<h2>You have seen every job</h2><p>Jobs you passed on can come back, and your applications are in the Applied tab.</p>',
    `<h2>'+(MINPCT>0?"No jobs at "+MINPCT+"% match or higher":(JOBS.filter(function(j){return (j.type||"job")===TYPE&&(j.live||!window.__uaplyHideSamples)}).length?"You have seen every one of these":"Nothing listed here right now"))+'</h2><p>'+(MINPCT>0?"Lower the minimum match in Profile, then Filters.":(JOBS.filter(function(j){return (j.type||"job")===TYPE&&(j.live||!window.__uaplyHideSamples)}).length?"Jobs you passed on can come back, and your applications are in the Dashboard.":"New postings appear as employers publish them. Try another section or check back soon."))+'</p>`);
  s=once(s,'title:String(x.title||"")};','title:String(x.title||""),st:(x.st==="interview"||x.st==="accepted"||x.st==="rejected")?x.st:"applied",sent:(x.sent&&typeof x.sent==="object")?{at:+x.sent.at||0,to:String(x.sent.to||"").slice(0,120),status:String(x.sent.status||"").slice(0,20)}:undefined};');
  /* profile gets an email so a recruiter can reply */
  s=once(s,'salary:100000,loc:"New York",','salary:100000,loc:"New York",email:"jordan.lee@example.com",');
  s=once(s,'loc:typeof p.loc==="string"?p.loc:"",','loc:typeof p.loc==="string"?p.loc:"",email:typeof p.email==="string"?p.email.slice(0,200):"",');
  s=once(s,'salary:num($("pSalary").value,0,10000000),loc:$("pLoc").value.trim(),','salary:num($("pSalary").value,0,10000000),loc:$("pLoc").value.trim(),email:($("pEmail")?$("pEmail").value.trim():""),');
  s=once(s,'$("pSalary").value=p.salary;$("pLoc").value=p.loc;','$("pSalary").value=p.salary;$("pLoc").value=p.loc;if($("pEmail"))$("pEmail").value=X?"":(p.email||"");if(X){$("pSkills").value="";$("pSalary").value="";$("pLoc").value=""}');
  s=once(s,'title:S.profile.title||""};','title:S.profile.title||"",st:"applied"};');
  s=once(s,"<span>'+cap(j.mode)+'</span>","<span>'+cap(j.mode)+'</span>'+(j.type&&j.type!==\"job\"?'<span>'+({internship:\"Internship\",coop:\"Co-op\",parttime:\"Part-time\"}[j.type]||\"Job\")+'</span>':'')+'");
  /* target titles count toward the match score: Title 15 points, Skills 30, Experience 15 (the total stays 100) */
  s=once(s,'{k:"Skills",w:40,','{k:"Skills",w:30,');
  s=once(s,'{k:"Experience",w:20,','{k:"Experience",w:15,');
  s=once(s,'var pe=LEVELS.indexOf(p.edu),je=LEVELS.indexOf(job.edu);','var tt=window.__uaplyTitle?window.__uaplyTitle(job,p):{s:1,have:"No target titles set"};var pe=LEVELS.indexOf(p.edu),je=LEVELS.indexOf(job.edu);');
  s=once(s,'{k:"Education",w:5,','{k:"Title",w:15,s:tt.s,ask:job.role,have:tt.have},\n   {k:"Education",w:5,');
  /* a new person starts with nothing ticked under "Work style", which means no preference (every style scores full points) */
  s=once(s,'var mo=p.modes[job.mode]?1:((job.mode==="hybrid"&&p.modes.remote)?0.5:0);','var anyM=p.modes.remote||p.modes.hybrid||p.modes.onsite;var mo=!anyM?1:(p.modes[job.mode]?1:((job.mode==="hybrid"&&p.modes.remote)?0.5:0));');
  s=once(s,'have:mo===1?"Accepted":(mo?"Hybrid, you prefer remote":"Not on your list")','have:mo===1?(anyM?"Accepted":"No preference set"):(mo?"Hybrid, you prefer remote":"Not on your list")');
  s=once(s,'$("pm-remote").checked=!!p.modes.remote;$("pm-hybrid").checked=!!p.modes.hybrid;$("pm-onsite").checked=!!p.modes.onsite;$("pReloc").checked=!!p.reloc;','var mm=X?{}:p.modes;$("pm-remote").checked=!!mm.remote;$("pm-hybrid").checked=!!mm.hybrid;$("pm-onsite").checked=!!mm.onsite;$("pReloc").checked=X?false:!!p.reloc;');
  /* skills also count when your headline, About you or major says them (a job asking for "SQL" is met if your summary mentions SQL) */
  s=once(s,'var have=p.skills.map(norm);','var have=p.skills.map(norm).concat(window.__uaplyTextSkills?window.__uaplyTextSkills(job,p).map(norm):[]);');
  s=once(s,'have:matched.length+" of "+job.skills.length+" skills"}','have:matched.length+" of "+job.skills.length+" skills"+(window.__uaplyTextNote?window.__uaplyTextNote(job,p):"")}');
  s=once(s,'var have=S.profile.skills.map(norm);','var have=S.profile.skills.map(norm).concat(window.__uaplyTextSkills?window.__uaplyTextSkills(j,S.profile).map(norm):[]);');
  /* saving inside the guided setup stays on the same screen; saving from anywhere else still shows the matches */
  s=once(s,'save();renderAll();show("swipe");toast("Profile saved. Matches updated.","OK",clearToast);','save();renderAll();if(!(window.__uaplyAfterSave&&window.__uaplyAfterSave()))show("swipe");if(!window.__uaplyAutoSave)toast("Profile saved. Matches updated.","OK",clearToast);');
  /* subscription gate: the page (apply) defines window.__uaplyGate; false means "not allowed, a paywall was shown" */
  s=once(s,'var job=JOB_BY_ID[id];','var job=JOB_BY_ID[id];if(dir==="applied"&&window.__uaplyGate&&window.__uaplyGate(job)===false){busy=false;renderAll();return}');
  s=once(s,'function show(t,focusPane){','function show(t,focusPane){if(window.__uaplyOnShow)window.__uaplyOnShow(t);');
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
#legalbar{flex:none;text-align:center;font-size:12px;color:var(--muted);padding-bottom:2px}#legalbar a{color:inherit;text-underline-offset:2px}
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
.hdrbtn{margin-left:auto;display:flex;align-items:center;gap:8px;min-height:40px;max-width:60vw;padding:5px 14px 5px 5px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink);font-weight:600;font-size:14px}
.hdrbtn:not(:has(.av)){padding:5px 16px}
.hdrbtn .av{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink);font-weight:800}
.hdrbtn .em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hdrbtn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
#pane-track .info>b{display:inline}
#pane-track .info>small{display:block}
.mchip{display:inline-block;margin-left:8px;padding:2px 9px;border-radius:999px;font:600 11px var(--mono,inherit);letter-spacing:.02em;vertical-align:2px;border:1px solid var(--line);white-space:nowrap}
.mchip.m-remote{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);border-color:transparent}
.mchip.m-hybrid{background:color-mix(in srgb,var(--accent2) 18%,transparent);color:var(--ink);border-color:transparent}
.mchip.m-onsite{background:var(--bg);color:var(--muted)}
#aEeo{display:block;border-top:1px solid var(--line);padding-top:6px}
#aElig{display:flex;flex-direction:column;gap:10px}
#tBox{display:flex;flex-direction:column;gap:8px}
#skillList{list-style:none;margin:4px 0 0;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:var(--shadow);max-height:260px;overflow:auto}
#skillList[hidden]{display:none}
#skillList li{display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:40px;padding:8px 12px;border-radius:8px;cursor:pointer;color:var(--ink)}
#skillList li[aria-selected="true"],#skillList li[data-i]:hover{background:var(--bg)}
#skillList li.info{cursor:default;color:var(--muted)}
#skillList small{color:var(--muted)}
.skillfull #skillSug{display:none}
#tChips{display:flex;flex-wrap:wrap;gap:6px}
#tChips span{display:inline-flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:4px 6px 4px 12px}
#tChips button{border:0;background:none;color:var(--muted);min-width:28px;min-height:28px;font-size:16px}
.nomiles{display:none!important}
.px-dup{display:none!important}
.mgr{margin-top:14px;border-top:1px solid var(--line);padding-top:4px}
.mgr summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:var(--muted);font-weight:600;font-size:13.5px}
.mgr summary:focus-visible,.dangerlink:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.dangerlink{color:#B3261E;text-decoration:underline;min-height:44px;font-weight:600;font-size:14px;padding:0}
@media (prefers-color-scheme: dark){.dangerlink{color:#FF8A80}}
.btn.danger{background:#B3261E;color:#fff;border-color:transparent}
.svform{display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--line);padding-top:14px}
.svcol{flex-direction:column;align-items:stretch}
.svcol label{border-radius:12px;min-height:44px}
.nps{display:grid;grid-template-columns:repeat(auto-fit,minmax(44px,1fr));gap:6px}
.npsb{position:relative;display:block}
.npsb input{position:absolute;opacity:0;inset:0;width:100%;height:100%;cursor:pointer;margin:0}
.npsb span{display:grid;place-items:center;min-height:44px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-weight:700}
.npsb input:checked+span{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink);border-color:transparent}
.npsb input:focus-visible+span{outline:3px solid var(--accent);outline-offset:2px}
.npsend{display:flex;justify-content:space-between;gap:10px}
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
/* guided setup: one group of questions per screen. Desktop (960px and wider) also shows what employers will see. */
#form{max-width:640px;padding-bottom:150px}
#form.wz{display:grid;grid-template-columns:minmax(0,1fr);row-gap:0}
#form.wz>*:not(#wzPrev){margin:0 0 14px;min-width:0}
#form:not(.wz) #wzTop,#form:not(.wz) #wzPrev,#form:not(.wz) #wzFoot,#form:not(.wz) #wzUse,#form:not(.wz) #wzMsg{display:none}
#wzMsg:empty{display:none}
.wz-off{display:none!important}
#wzTop{display:flex;flex-direction:column;gap:8px}
.wzRow{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font:600 12.5px var(--mono);color:var(--muted)}
.wzBar{height:8px;border-radius:999px;background:var(--line);overflow:hidden}
.wzBar i{display:block;height:100%;background:linear-gradient(135deg,var(--accent),var(--accent2));transition:width .25s}
.wzDots{list-style:none;margin:0;padding:0;display:flex;gap:6px}
.wzDots li{flex:1;min-width:0}
.wzDots button{width:100%;min-height:44px;border:1px solid var(--line);background:var(--surface);color:var(--muted);border-radius:12px;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;padding:4px 6px}
.wzDots button .t{display:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wzDots button[data-done="true"]::after{content:"\\2713";color:var(--yes)}
.wzDots button[aria-current="step"]{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink);border-color:transparent}
.wzDots button[aria-current="step"]::after{color:var(--accent-ink)}
.wzDots button:focus-visible,.wzFoot .btn:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
@media (min-width:640px){.wzDots button .t{display:inline}}
#form.wz h3#secTitle{font:800 22px var(--display);letter-spacing:-.01em;text-transform:none;color:var(--ink);margin:6px 0 0}
#form.wz p.lead{font-size:15px}
.wzUse{padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);font-size:13px;color:var(--muted)}
.wzUse b{color:var(--ink);font-weight:600}
#wzFoot{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
#wzFoot .btn{min-height:48px;padding:10px 22px}
#wzFoot .grow{flex:1}
#wzPrev{display:none;flex-direction:column;gap:10px}
#wzPrev .pvh{font:800 12px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
#wzPrev .pv{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow)}
#wzPrev .pvTop{display:flex;gap:12px;align-items:center}
#wzPrev .pvAv{flex:none;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink);display:grid;place-items:center;font:800 18px var(--display)}
#wzPrev .pvTop b{display:block;font:800 17px/1.2 var(--display);overflow-wrap:anywhere}
#wzPrev .pvTop span{color:var(--muted);font-size:13.5px;overflow-wrap:anywhere}
#wzPrev .pvMeta{font:500 13px var(--mono);color:var(--muted)}
#wzPrev .chips{gap:6px}
#wzPrev .chip{font-size:12px;padding:3px 10px}
#wzPrev ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;font-size:13.5px}
#wzPrev li{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding-top:7px}
#wzPrev li span:first-child{color:var(--muted);flex:none}
#wzPrev li span:last-child{text-align:right;overflow-wrap:anywhere;min-width:0}
#wzPrev li.no span:last-child{color:var(--muted);font-style:italic}
@media (min-width:960px){
 #form.wz{max-width:1020px;grid-template-columns:minmax(0,1fr) 340px;column-gap:28px;align-items:start}
 #form.wz>*:not(#wzPrev){grid-column:1}
 #form.wz>#wzPrev{display:flex;grid-column:2;grid-row:1 / span 8;position:sticky;top:8px;margin:0}
 #form.wz .grid{grid-template-columns:1fr 1fr}
}
@media (prefers-reduced-motion:reduce){.wzBar i{transition:none}}
/* controls that were left unstyled (password, month, link, file) now match the rest, with 44px targets */
#form input[type=month],#form input[type=url],#form input[type=email],#form textarea,#acctSec input[type=password],#acctSec input[type=email]{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:var(--ink);font:inherit;width:100%;min-height:44px}
#form input[type=text],#form input[type=number],#form input[type=tel],#form select,#acctSec input[type=text],#acctSec input[type=password],#acctSec select{min-height:44px}
#form input[type=file],#acctSec input[type=file]{width:100%;padding:8px;border:1px dashed var(--line);border-radius:12px;background:var(--surface);color:var(--muted)}
#form input[type=file]::file-selector-button,#acctSec input[type=file]::file-selector-button{border:0;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink);border-radius:8px;padding:8px 12px;margin-right:10px;font-weight:600;min-height:36px;cursor:pointer}
input[type=checkbox],input[type=radio]{accent-color:var(--accent);width:20px;height:20px;flex:none}
input[type=range]{accent-color:var(--accent);min-height:44px}
#form .checks label,#acctSec .checks label,#filtersSec .checks label{min-height:44px}
.chip.pick{min-height:40px}
#tChips button{min-width:36px;min-height:36px}
#acctSec{padding-bottom:150px}
#filtersSec{padding-bottom:20px}
#aEeo>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;color:var(--muted)}
#aEeo[open]>summary{color:var(--ink)}
#aEeo>.eeoBody{display:flex;flex-direction:column;gap:10px;padding-top:6px}
#banner:not([hidden]){display:flex!important}
@media (max-width:480px){.hdrbtn .em{display:none}.hdrbtn{padding:5px;max-width:none}}
`;

function apply(w,host){
  var d=w.document,A=w.__uaply;
  if(!A)throw new Error("app hooks missing");
  var OPTS=(host&&host.defaultView&&host.defaultView.UAplyOpts)||{};   /* e.g. dev sets hideServiceCounts */
  var REL=!!OPTS.release;   /* release build: no test controls, no simulated sign-in, no sample data, no paid plans */
  var NK=w.__uaplyKey+".nav";
  var SECS={
    svc:{label:"Services",items:[["job","Full-time"],["parttime","Part-time"],["internship","Internships"],["coop","Co-ops"]]},
    dash:{label:"Dashboard",items:[["overview","Overview"],["applied","Applied"],["accepted","Accepted"],["rejected","Rejected"],["interview","Interviews"]]},
    prof:{label:"Profile",items:[["settings","Profile setup"],["filters","Filters"],["account","Account"],["plan","Plan & billing"],["data","Data & privacy"]]}
  };
  /* Settings, Preferences and Resume are now one guided setup. The old names still work as shortcuts into it. */
  var WIZV={settings:1,preferences:1,resume:1},SUB_ALIAS={preferences:"settings",resume:"settings"};
  if(REL)SECS.prof.items=SECS.prof.items.filter(function(it){return it[0]!=="plan"});
  var ACCT={account:1,plan:1,data:1};
  var LEADS={
    account:"Sign in so your profile and applications follow you to any device.",
    plan:"Choose how you pay for UAply. Sandbox: no real payments happen and no card is needed.",
    data:"Back up, move or delete everything UAply keeps about you.",
    settings:"Your details. Every card is scored against them, and they fill in your application note and the email address recruiters reply to.",
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
  function label(k,v){if(k==="prof"&&SUB_ALIAS[v])v=SUB_ALIAS[v];var r="";SECS[k].items.forEach(function(i){if(i[0]===v)r=i[1]});return r}

  var st=d.createElement("style");st.textContent=CSS;d.head.appendChild(st);

  /* saved preferences (own key, separate from the app data) */
  var prefs={};try{prefs=JSON.parse(w.localStorage.getItem(NK))||{}}catch(e){}
  function savePrefs(){try{w.localStorage.setItem(NK,JSON.stringify({type:sub.svc,min:A.getMin(),mode:A.getFilter()}))}catch(e){}}
  if(label("svc",prefs.type)){sub.svc=prefs.type;A.setType(sub.svc)}
  else{var tc0=typesChosen0();if(tc0.length){sub.svc=tc0[0];A.setType(sub.svc)}}   /* first visit: open the first opportunity type picked in the profile */
  function typesChosen0(){var t=((A.S.profile&&A.S.profile.ext)||{}).types,m={fulltime:"job",parttime:"parttime",internship:"internship",coop:"coop"};return Array.isArray(t)?t.map(function(k){return m[k]}).filter(Boolean):[]}
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
  /* fine print: always one tap away (App Store and Google Play also expect a reachable privacy policy) */
  var lp=(host&&host.defaultView&&host.defaultView.location.pathname)||"/",LB=/\/(sandbox|dev)\/$/.test(lp)?"../legal/":"legal/";
  var legalbar=d.createElement("div");legalbar.id="legalbar";
  legalbar.innerHTML=[["terms.html","Terms"],["privacy.html","Privacy"],["ai-and-employment.html","AI and matching"],["copyright.html","Copyright"]]
    .map(function(l){return '<a href="'+LB+l[0]+'" target="_blank" rel="noopener noreferrer">'+l[1]+'</a>'}).join(" · ");
  nav.after(legalbar);

  function count(k,v){
    var n=0;
    if(k==="prof"||v==="overview"||(k==="svc"&&OPTS.hideServiceCounts))return "";
    A.JOBS.forEach(function(j){
      if(w.__uaplyHideSamples&&!j.live)return;
      if(w.__uaplyHide&&w.__uaplyHide(j))return;
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
    var tc=k==="svc"?typesChosen():[],list0=SECS[k].items.slice();
    if(tc.length)list0.sort(function(a,b){return (tc.indexOf(b[0])>-1)-(tc.indexOf(a[0])>-1)});   /* the types you picked in your profile come first */
    menu.innerHTML=list0.map(function(i){
      var c=count(k,i[0]),off=tc.length&&tc.indexOf(i[0])<0;
      return '<button type="button" class="nitem" role="menuitemradio" aria-checked="'+(sub[k]===i[0])+'" data-v="'+i[0]+'"><span>'+i[1]+(off?' <small class="c">not in your profile</small>':'')+'</span>'+(c===""?"":'<span class="c">'+c+'</span>')+'</button>';
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
  var TYPE_LABEL={job:"Full-time",parttime:"Part-time",internship:"Internship",coop:"Co-op"};
  function renderTrack(){
    var by={applied:[],accepted:[],rejected:[],interview:[],passed:[]};
    A.JOBS.forEach(function(j){
      var x=A.S.decisions[j.id];if(!x)return;
      if(x.s==="passed")by.passed.push({j:j,x:x});else by[by[x.st]&&x.st!=="passed"?x.st:"applied"].push({j:j,x:x});
    });
    function row(o,acts,view){
      var t=A.tone(o.x.pct),e=A.esc;
      return '<div class="row"><div class="logo" aria-hidden="true" style="background:hsl('+A.hue(o.j.id)+' 60% 46%)">'+e(o.j.co.charAt(0))+'</div><div class="info"><b>'+e(o.j.role)+'</b>'+modeChip(o.j)+'<small>'+e(o.j.co)+' · '+e(o.j.loc)+' · '+TYPE_LABEL[o.j.type||"job"]+'</small>'+
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
      if(job&&w.__uaplyOpen)w.__uaplyOpen(job.url);
      return;
    }
    if(act==="details"){OPEN[id]=!OPEN[id];renderTrack();return}
    if(act==="savedet"){saveDet(id,b.closest(".row"));return}
    if(act==="ics"){exportIcs(id);return}
    if(act==="share"){var sj=A.JOBS.filter(function(j){return j.id===id})[0];if(sj)shareJob(sj);return}
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
    if(ph&&!/^[+0-9 ()\-.]{7,20}$/.test(ph)){e.preventDefault();e.stopImmediatePropagation();d.getElementById("pPhoneErr").textContent="Phone numbers can only have digits, spaces, + ( ) - and .";goField("pPhone");return}
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
  /* Profile setup (settings, preferences and resume together) is a guided setup, one group of questions per screen.
     Filters, Account, Plan and Data keep their own screens. */
  function section(v){
    if(SUB_ALIAS[v]){wz.want=v==="resume"?"back":"where";v=sub.prof="settings"}
    var isWiz=!!WIZV[v],grid=form.querySelector(".grid");
    form.hidden=!!ACCT[v];acctSec.hidden=!ACCT[v];
    form.classList.toggle("wz",isWiz);
    d.getElementById("pPhone").value=acct.phone;d.getElementById("pPhoneErr").textContent="";
    meter.hidden=true;   /* the guided setup has its own progress bar */
    if(!isWiz){secTitle.textContent=label("prof",v);lead.textContent=LEADS[v]}
    if(ACCT[v])renderAcct(v);
    if(w.__uaplySyncPrefs)w.__uaplySyncPrefs();
    Object.keys(FIELDS).forEach(function(key){FIELDS[key].forEach(function(id){var e=d.getElementById(id),f=e&&e.closest(".field");if(f)f.hidden=false})});
    d.querySelectorAll("[data-sec]").forEach(function(x){x.hidden=false});   /* fields other experiments add; the guided setup decides what shows */
    grid.hidden=!isWiz;
    fs.hidden=v!=="filters";
    form.querySelector(".formacts").hidden=isWiz;
    d.getElementById("saveBtn").hidden=v==="filters";
    d.getElementById("resetBtn").hidden=v!=="filters";
    syncFilters();
    if(isWiz)wzOpen();
  }

  /* ---------- account: per-application details, preferences/filters, resume, plan, data, dashboard overview ---------- */
  var AK=w.__uaplyKey+".acct",E=A.esc,OPEN={};
  var PLANS={
    /* internal keys stay trial/starter/pro so saved choices keep working; the names and limits are the decided plan */
    trial:{name:"Free",price:0,cap:50,perks:["50 applications a week","Full dashboard and tracking","Core filters"]},
    starter:{name:"Plus",price:9.99,cap:250,perks:["250 applications a week","Benefits, applicant and dealbreaker filters","Message the hiring manager"]},
    pro:{name:"Pro",price:19.99,cap:0,perks:["Unlimited applications (fair use)","Everything in Plus","Priority support"]}
  };
  var PERKS=[["health","Health insurance"],["dental","Dental insurance"],["vision","Vision insurance"],["k401","401(k)"],["match","401(k) with employer match"],["loan","Student loan repayment"],["stock","Stock options"],["pto","Paid time off (PTO)"],["maternity","Paid maternity leave"],["paternity","Paid paternity leave"],["tuition","Tuition assistance"]];
  var PERK_KEYS=PERKS.map(function(p){return p[0]});
  var LEVELS=["High school","Associate","Bachelor","Master","Doctorate"];
  var XP=[["entry","Entry-level (0-2 years)",0,2],["mid","Mid-level (3-5 years)",3,5],["senior","Senior (6-9 years)",6,9],["exec","Lead or executive (10+ years)",10,99]];
  var LEVEL_KEYS=XP.map(function(x){return x[0]});
  function levelOf(y){y=+y||0;for(var i=0;i<XP.length;i++)if(y>=XP[i][2]&&y<=XP[i][3])return XP[i];return XP[XP.length-1]}
  var US_STATES="AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
  /* voluntary questions (US equal-opportunity style). Every list's first item after the blank is a real answer; "Prefer not to say" is always available. */
  var EEO={
    auth:["","US citizen or national","Permanent resident (green card)","Authorized to work in the US (visa or work permit)","Not authorized to work in the US"],
    sponsor:["","No, I will not need sponsorship","Yes, I will need sponsorship now or in the future"],
    veteran:["","I am a protected veteran","I am not a protected veteran","Prefer not to say"],
    hisp:["","Yes","No","Prefer not to say"],
    race:["White","Black or African American","Asian","American Indian or Alaska Native","Native Hawaiian or Other Pacific Islander","Prefer not to say"],
    disability:["","Yes, I have a disability (or have had one)","No, I do not have a disability","Prefer not to say"],
    gender:["","Male","Female","Non-binary","Prefer not to say"]
  };
  var MILES=["any","10","20","50","100"],POSTED=["any","24h","7d","30d"];
  function cleanF(a){
    a.fPerks=Array.isArray(a.fPerks)?a.fPerks.filter(function(k){return PERK_KEYS.indexOf(k)>-1}).slice(0,PERKS.length):[];
    if(MILES.indexOf(String(a.fMiles))<0)a.fMiles="any";a.fMiles=String(a.fMiles);
    if(POSTED.indexOf(a.fPosted)<0)a.fPosted="any";
    a.fApp=!!a.fApp;a.fStrict=!!a.fStrict;a.fAuto=!!a.fAuto;a.fTitleOnly=!!a.fTitleOnly;a.fNoComm=!!a.fNoComm;a.fEdu=!!a.fEdu;a.fWs=a.fWs!==false;
    var seen={};
    a.titles=(Array.isArray(a.titles)?a.titles:[]).filter(function(t){return typeof t==="string"}).map(function(t){return t.trim().replace(/\s+/g," ").slice(0,60)}).filter(function(t){var k=t.toLowerCase();if(!t||seen[k])return false;seen[k]=1;return true}).slice(0,4);
    a.fLevels=(Array.isArray(a.fLevels)?a.fLevels:[]).filter(function(k){return LEVEL_KEYS.indexOf(k)>-1});
    var e=(a.eeo&&typeof a.eeo==="object")?a.eeo:{},ok={};
    Object.keys(EEO).forEach(function(k){var v=e[k];if(k==="race")ok[k]=(Array.isArray(v)?v:[]).filter(function(x){return EEO.race.indexOf(x)>-1});else ok[k]=(typeof v==="string"&&EEO[k].indexOf(v)>-1)?v:""});
    if(!ok.auth&&typeof a.auth==="string"&&EEO.auth.indexOf(a.auth)>-1)ok.auth=a.auth;
    a.eeo=ok;
    var ad=(a.addr&&typeof a.addr==="object")?a.addr:{},str=function(v,n){return typeof v==="string"?v.replace(/[\r\n\t]+/g," ").trim().slice(0,n):""};
    a.addr={street:str(ad.street,120),unit:str(ad.unit,30),state:US_STATES.indexOf(ad.state)>-1?ad.state:"",zip:/^\d{5}(-\d{4})?$/.test(ad.zip||"")?ad.zip:""};
    return a;
  }
  var DAY=864e5,DATA_URL=/^data:[\w\/+.\-]+;base64,[A-Za-z0-9+\/=]+$/,URL_OK=/^https?:\/\//i;
  function defAcct(){return {phone:"",linkedin:"",portfolio:"",summary:"",auth:"",notice:"",cover:"",resumeName:"",resumeSize:0,resumeData:"",plan:"trial",since:Date.now(),renews:0,canceled:false,enforce:false,pay:[],apps:{},fSal:false,fYrs:"any",fCo:"",fKw:"",fPosted:"any",fApp:false,fPerks:[],fMiles:"any",fStrict:false,fAuto:false,titles:[],fTitleOnly:true,fNoComm:false,fLevels:[],fEdu:false,fWs:true,eeo:{auth:"",sponsor:"",veteran:"",hisp:"",race:[],disability:"",gender:""},addr:{street:"",unit:"",state:"",zip:""},resumeUrl:""}}
  function loadA(){
    var a=defAcct();
    try{var r=JSON.parse(w.localStorage.getItem(AK));if(r&&typeof r==="object"){Object.keys(a).forEach(function(k){if(r[k]!==undefined&&typeof r[k]===typeof a[k])a[k]=r[k]})}}catch(e){}
    if(!Array.isArray(a.pay))a.pay=[];
    if(REL){a.enforce=false;a.plan="trial"}
    if(!PLANS[a.plan])a.plan="trial";
    if(!a.resumeName||!DATA_URL.test(a.resumeData)){a.resumeName="";a.resumeData="";a.resumeSize=0}
    ["fCo","fKw","phone","linkedin","portfolio","summary","cover","auth","notice","resumeUrl"].forEach(function(k){a[k]=String(a[k]).slice(0,k==="cover"?1500:600)});
    if(a.resumeUrl&&!/^https:\/\//i.test(a.resumeUrl))a.resumeUrl="";
    if(["any","0","1","2","3"].indexOf(a.fYrs)<0)a.fYrs="any";
    return cleanF(a);
  }
  var acct=loadA();
  function saveA(){try{w.localStorage.setItem(AK,JSON.stringify(acct));return true}catch(e){return false}}
  try{if(!w.localStorage.getItem(AK))saveA()}catch(e){}   /* fix the trial start date on first visit instead of resetting it each reload */
  function list(s){return String(s).split(",").map(function(x){return x.trim().toLowerCase()}).filter(Boolean)}
  w.__uaplyHide=function(j){
    var p=A.S.profile;
    if(acct.fSal&&p.salary&&j.sal&&j.sal.length>1&&j.sal[1]<p.salary)return true;
    if(acct.fYrs!=="any"&&j.yrs>(+p.years||0)+(+acct.fYrs))return true;
    var co=String(j.co).toLowerCase(),hay=(String(j.role)+" "+(j.skills||[]).join(" ")).toLowerCase();
    if(list(acct.fCo).some(function(x){return co.indexOf(x)>-1})||list(acct.fKw).some(function(x){return hay.indexOf(x)>-1}))return true;
    return hideByMeta(j);
  };

  /* posted date, applicant count, benefits and distance. Missing data is "unknown": shown unless "hide listings that don't say" is on. */
  var CITIES=[["philadelphia|philly",39.9526,-75.1652],["camden",39.9259,-75.1196],["wilmington",39.7447,-75.5484],["newark,? de|newark, delaware",39.6837,-75.7497],["trenton",40.2171,-74.7429],["cherry hill",39.9348,-75.0307],["king of prussia",40.1013,-75.3836],["princeton",40.3573,-74.6672],["allentown",40.6084,-75.4902],["reading, pa",40.3356,-75.9269],["lancaster, pa",40.0379,-76.3055],["atlantic city",39.3643,-74.4229],["harrisburg",40.2732,-76.8867],["pittsburgh",40.4406,-79.9959],["new york|nyc|brooklyn|manhattan",40.7128,-74.006],["newark",40.7357,-74.1724],["jersey city",40.7178,-74.0431],["boston",42.3601,-71.0589],["washington,? d\\.?c|washington dc",38.9072,-77.0369],["baltimore",39.2904,-76.6122],["richmond, va",37.5407,-77.436],["charlotte",35.2271,-80.8431],["raleigh",35.7796,-78.6382],["atlanta",33.749,-84.388],["miami",25.7617,-80.1918],["orlando",28.5383,-81.3792],["tampa",27.9506,-82.4572],["chicago",41.8781,-87.6298],["detroit",42.3314,-83.0458],["columbus, oh|columbus, ohio",39.9612,-82.9988],["cleveland",41.4993,-81.6944],["cincinnati",39.1031,-84.512],["indianapolis",39.7684,-86.1581],["minneapolis",44.9778,-93.265],["st\\.? louis",38.627,-90.1994],["kansas city",39.0997,-94.5786],["dallas",32.7767,-96.797],["houston",29.7604,-95.3698],["austin",30.2672,-97.7431],["san antonio",29.4241,-98.4936],["denver",39.7392,-104.9903],["phoenix",33.4484,-112.074],["salt lake city",40.7608,-111.891],["las vegas",36.1699,-115.1398],["los angeles",34.0522,-118.2437],["san diego",32.7157,-117.1611],["san francisco",37.7749,-122.4194],["san jose",37.3382,-121.8863],["oakland",37.8044,-122.2712],["seattle",47.6062,-122.3321],["portland, or|portland, oregon",45.5152,-122.6784],["nashville",36.1627,-86.7816],["new orleans",29.9511,-90.0715],["providence",41.824,-71.4128],["hartford",41.7658,-72.6734],["buffalo",42.8864,-78.8784],["albany, ny",42.6526,-73.7562]].map(function(c){return [new w.RegExp("\\b(?:"+c[0]+")\\b","i"),c[1],c[2]]});
  function geo(text){var s=String(text||"");for(var i=0;i<CITIES.length;i++)if(CITIES[i][0].test(s))return [CITIES[i][1],CITIES[i][2]];return null}
  /* the first three digits of a ZIP code point to a metro area. Used only to find your location for the distance filter. */
  var ZIP3=[["190 191",39.9526,-75.1652],["198",39.7447,-75.5484],["081",39.9259,-75.1196],["086",40.2171,-74.7429],["181",40.6084,-75.4902],["171",40.2732,-76.8867],["100 101 102 103 104 111 112 113 114",40.7128,-74.006],["070 071 072",40.7357,-74.1724],["073",40.7178,-74.0431],["021 022",42.3601,-71.0589],["029",41.824,-71.4128],["060 061",41.7658,-72.6734],["142",42.8864,-78.8784],["200 202 203 204 205",38.9072,-77.0369],["212",39.2904,-76.6122],["232",37.5407,-77.436],["150 151 152",40.4406,-79.9959],["276",35.7796,-78.6382],["282",35.2271,-80.8431],["303",33.749,-84.388],["331",25.7617,-80.1918],["328",28.5383,-81.3792],["336",27.9506,-82.4572],["606",41.8781,-87.6298],["482",42.3314,-83.0458],["432",39.9612,-82.9988],["441",41.4993,-81.6944],["452",39.1031,-84.512],["462",39.7684,-86.1581],["554",44.9778,-93.265],["631",38.627,-90.1994],["641",39.0997,-94.5786],["752",32.7767,-96.797],["770",29.7604,-95.3698],["787",30.2672,-97.7431],["782",29.4241,-98.4936],["802",39.7392,-104.9903],["850",33.4484,-112.074],["841",40.7608,-111.891],["891",36.1699,-115.1398],["900 901",34.0522,-118.2437],["921",32.7157,-117.1611],["941",37.7749,-122.4194],["951",37.3382,-121.8863],["946",37.8044,-122.2712],["981",47.6062,-122.3321],["972",45.5152,-122.6784],["372",36.1627,-86.7816],["701",29.9511,-90.0715]];
  function zipGeo(z){var p=String(z||"").slice(0,3);if(!/^\d{3}$/.test(p))return null;for(var i=0;i<ZIP3.length;i++)if((" "+ZIP3[i][0]+" ").indexOf(" "+p+" ")>-1)return [ZIP3[i][1],ZIP3[i][2]];return null}
  /* where you live: your city plus state (so "Columbus" + OH works), then your ZIP code if the city is not one we know */
  function homeGeo(){var p=A.S.profile,ad=acct.addr||{};return geo((p.loc||"")+(ad.state?", "+ad.state:""))||geo(p.loc)||zipGeo(ad.zip)}
  function miles(a,b){var R=3958.8,r=Math.PI/180,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)*Math.sin(dn/2);return 2*R*Math.asin(Math.sqrt(x))}
  /* target titles: the main title plus up to four more. Words must appear in the job's role name (plurals allowed). */
  function titleList(){return [A.S.profile.title].concat(acct.titles).map(function(t){return String(t||"").trim()}).filter(Boolean)}
  var SALES_RE=/\b(sales|account executive|business development|sdr|bdr|closer|setter)\b/i;
  function isSales(){return titleList().some(function(t){return SALES_RE.test(t)})}
  var SOFT=["remote","hybrid","onsite","virtual","inside","senior","sr","junior","jr","lead","entry","level"];
  /* words that mean the same thing in job titles, so "Frontend Developer" also matches "Front-End Engineer" */
  var SAME={developer:["engineer","programmer","dev"],engineer:["developer","programmer"],programmer:["developer","engineer"],
    representative:["rep","associate","agent"],rep:["representative","associate","agent"],associate:["representative","rep"],
    executive:["exec"],manager:["mgr","lead"],administrator:["admin"],admin:["administrator"],specialist:["analyst"],
    coordinator:["coord"],assistant:["asst"],technician:["tech"],tech:["technician"],marketing:["marketer"],marketer:["marketing"],
    designer:["design"],design:["designer"],sales:["selling"],closer:["closing"]};
  function canon(s){return String(s).toLowerCase().replace(/front[\s-]?end/g,"frontend").replace(/back[\s-]?end/g,"backend").replace(/full[\s-]?stack/g,"fullstack").replace(/e[\s-]?commerce/g,"ecommerce")}
  function tokens(t){var all=canon(t).split(/[^a-z0-9+#.]+/).filter(function(x){return x.length>1}),core=all.filter(function(x){return SOFT.indexOf(x)<0});return core.length?core:all}
  function hasWord(role,x){return [x].concat(SAME[x]||[]).some(function(y){return new w.RegExp("(^|[^a-z0-9])"+y.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"s?([^a-z0-9]|$)").test(role)})}
  function titleBest(job){
    var role=canon(job.role),best=0,name="";
    titleList().forEach(function(t){var tk=tokens(t);if(!tk.length)return;var fr=tk.filter(function(x){return hasWord(role,x)}).length/tk.length;if(fr>best){best=fr;name=t}});
    return {fr:best,name:name};
  }
  /* a short note above the cards when the target-title filter is what is hiding every listing */
  function titleNote(){
    var pane=d.getElementById("pane-swipe");if(!pane)return;
    var n=d.getElementById("titleNote");
    if(!n){n=d.createElement("p");n.id="titleNote";n.className="note";n.setAttribute("role","status");n.style.cssText="margin:0 0 8px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)";var deck=d.getElementById("deck");deck.parentNode.insertBefore(n,deck)}
    var ty=A.getType(),shown=0,byTitle=0,saved=acct.fTitleOnly;
    if(saved&&A.S.profile.custom&&titleList().length){
      A.JOBS.forEach(function(j){
        if((j.type||"job")!==ty||A.S.decisions[j.id]||(w.__uaplyHideSamples&&!j.live))return;
        if(!w.__uaplyHide(j))shown++;else{acct.fTitleOnly=false;if(!w.__uaplyHide(j))byTitle++;acct.fTitleOnly=saved}
      });
    }
    n.hidden=!(shown===0&&byTitle>0);
    if(!n.hidden)n.textContent=byTitle+" listing"+(byTitle===1?" is":"s are")+" hidden because "+(byTitle===1?"it does":"they do")+" not match your target titles. Add more titles in Profile, Settings, or turn off \"Hide roles that do not match my target titles\" in Profile, Filters.";
  }
  /* a short note when you are looking at an opportunity type you did not pick in your profile */
  function typeNote(){
    var n=d.getElementById("typeNote");
    if(!n){n=d.createElement("p");n.id="typeNote";n.className="note";n.setAttribute("role","status");n.style.cssText="margin:0 0 8px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)";var deck=d.getElementById("deck");if(!deck)return;deck.parentNode.insertBefore(n,deck)}
    var tc=typesChosen(),ty=A.getType();
    n.hidden=!(tc.length&&tc.indexOf(ty)<0);
    if(!n.hidden)n.textContent="You did not pick "+label("svc",ty)+" in your profile, so these are extras. Change your picks in Profile setup, under Jobs you want.";
  }
  if(d.getElementById("deck"))new w.MutationObserver(function(){titleNote();typeNote()}).observe(d.getElementById("deck"),{childList:true});
  w.__uaplyTitle=function(job,p){
    if(!p.custom||!titleList().length)return {s:1,have:"No target titles set"};
    var b=titleBest(job);
    return b.fr>=0.99?{s:1,have:'Matches "'+b.name+'"'}:(b.fr>=0.6?{s:0.5,have:'Partly matches "'+b.name+'"'}:{s:0,have:"Not one of your titles"});
  };
  w.__uaplyHome=function(){return homeGeo()};
  /* skills your own words already say: your headline, About you and major count as skills a job asks for (JS counts as JavaScript) */
  var TXT_ALIAS={js:"javascript",ts:"typescript",py:"python",postgres:"postgresql",reactjs:"react","react.js":"react",nodejs:"node","node.js":"node",k8s:"kubernetes",ml:"machine learning"};
  function normTxt(s){return " "+String(s).toLowerCase().replace(/[^a-z0-9+#.\s]/g," ").replace(/\.(?=\s|$)/g,"").replace(/\s+/g," ").trim()+" "}
  var TXT={key:null,hay:" "};
  function textHay(){
    var x=XV(),key=[x.headline,x.major,x.summary,acct.summary].join("|");
    if(TXT.key===key)return TXT.hay;
    var h=normTxt([x.headline,x.major,x.summary,acct.summary].filter(Boolean).join(" . "));
    Object.keys(TXT_ALIAS).forEach(function(k){h=h.split(" "+k+" ").join(" "+TXT_ALIAS[k]+" ")});
    TXT.key=key;TXT.hay=h;return h;
  }
  w.__uaplyTextSkills=function(job,p){
    var h=textHay();if(h.length<4||!job||!job.skills)return [];
    return job.skills.filter(function(s){var n=normTxt(TXT_ALIAS[String(s).toLowerCase()]||s);return n.length>4&&h.indexOf(n)>-1});
  };
  w.__uaplyTextNote=function(job,p){
    var own=(p.skills||[]).map(function(s){return String(s).trim().toLowerCase()});
    var n=w.__uaplyTextSkills(job,p).filter(function(s){return own.indexOf(String(s).toLowerCase())<0}).length;
    return n?" ("+n+" from your summary)":"";
  };
  /* opportunity types picked in Profile setup. They decide which Services section opens first and are marked in the menu. */
  var TYPEMAP={fulltime:"job",parttime:"parttime",internship:"internship",coop:"coop"};
  function typesChosen(){var t=XV().types;return Array.isArray(t)?t.map(function(k){return TYPEMAP[k]}).filter(Boolean):[]}
  function hideByMeta(j){
    var strict=!!acct.fStrict,now=Date.now();
    if(acct.fPosted!=="any"){
      var lim={"24h":DAY,"7d":7*DAY,"30d":30*DAY}[acct.fPosted];
      if(!j.posted){if(strict)return true}else if(now-j.posted>lim)return true;
    }
    if(acct.fApp){
      if(j.applicants==null){if(strict)return true}else if(j.applicants>=10)return true;
    }
    for(var i=0;i<acct.fPerks.length;i++){
      if(!j.perks){if(strict)return true}else if(j.perks.indexOf(acct.fPerks[i])<0)return true;
    }
    if(acct.fTitleOnly&&A.S.profile.custom&&titleList().length&&titleBest(j).fr<0.6)return true;
    if(acct.fNoComm&&isSales()&&j.comm)return true;
    if(acct.fLevels.length&&acct.fLevels.indexOf(levelOf(j.yrs)[0])<0)return true;
    if(acct.fEdu){var je=LEVELS.indexOf(j.edu),pe=LEVELS.indexOf(A.S.profile.edu);if(je>-1&&pe>-1&&je>pe)return true}
    var pm=A.S.profile.modes||{};
    /* work styles you did not pick in your profile (nothing picked means no preference) */
    if(acct.fWs&&A.S.profile.custom&&(pm.remote||pm.hybrid||pm.onsite)&&!pm[j.mode])return true;
    if(acct.fMiles!=="any"&&j.mode!=="remote"&&(pm.hybrid||pm.onsite)){
      var home=homeGeo(),there=geo(j.loc);
      if(!home||!there){if(strict)return true}else if(miles(home,there)>+acct.fMiles)return true;
    }
    return false;
  }
  /* example listings get example metadata so the filters can be tried without the live feeds */
  A.JOBS.forEach(function(j){
    if(j.live)return;
    var h=(Math.imul(j.id,2654435761)>>>0);
    if(!j.posted)j.posted=Date.now()-(h%35)*DAY-((h>>>5)%24)*36e5;
    if(j.applicants==null)j.applicants=h%47;
    if(!j.perks)j.perks=PERK_KEYS.filter(function(k,i){return (h>>>i)&1});
  });

  /* plan and limits (sandbox: simulated, nothing is charged) */
  function tick(){
    var p=PLANS[acct.plan],ch=false;
    if(acct.plan!=="trial"&&!acct.canceled)while(acct.renews&&acct.renews<Date.now()){acct.renews+=30*DAY;acct.pay.push({at:acct.renews-30*DAY,plan:acct.plan,amt:p.price});ch=true}
    if(acct.pay.length>24){acct.pay=acct.pay.slice(-24);ch=true}
    if(ch)saveA();
  }
  /* limits are per rolling week: applications made in the last 7 days */
  function usedCount(){
    var start=Date.now()-7*DAY,n=0;
    Object.keys(A.S.decisions).forEach(function(k){var x=A.S.decisions[k];if(x.s==="applied"&&x.at>=start)n++});
    return n;
  }
  function planState(){
    tick();
    var p=PLANS[acct.plan];
    if(acct.plan!=="trial"&&acct.canceled&&acct.renews<Date.now())p=PLANS.trial;      /* a canceled plan that ran out is back on Free */
    var u=usedCount(),r={plan:p,used:u,cap:p.cap,left:p.cap?Math.max(0,p.cap-u):null,days:null,ok:true,why:""};
    if(p.cap&&u>=p.cap){r.ok=false;r.why="You've used all "+p.cap+" applications this week on "+p.name+". One frees up each time an application turns a week old."}
    return r;
  }
  w.__uaplyGate=function(){
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

  /* When the owner's "Application profile" experiment is on (uaply-profile.js), it owns phone, links, summary, resume
     link, work authorization, sponsorship and start date. These read from whichever place has the answer, and the
     matching fields of this file are hidden (see the de-duplication pass at the end), so nothing is asked twice. */
  function PX(){return !!w.__uaplyExtRead}
  function XV(){return (A.S.profile&&A.S.profile.ext)||{}}
  var X_AUTH={citizen:"US citizen or permanent resident",authorized:"Authorized to work (visa, OPT or similar)",none:"Not currently authorized"};
  var X_SPON={yes:"Yes, I will need sponsorship now or in the future",no:"No, I will not need sponsorship"};
  var X_START={now:"Right away","2w":"Within 2 weeks","1m":"Within a month",grad:"After I graduate",flex:"Flexible"};
  function phoneOf(){return acct.phone||XV().phone||""}
  function linkOf(k){return acct[k]||XV()[k]||""}
  function resumeLinkOf(){return acct.resumeUrl||XV().resume||""}
  function summaryOf(){return acct.summary||XV().summary||""}
  function authOf(){return acct.eeo.auth||X_AUTH[XV().auth]||""}
  function sponsorOf(){return acct.eeo.sponsor||X_SPON[XV().sponsor]||""}
  function startOf(){return acct.notice||X_START[XV().start]||""}

  /* profile completeness */
  function checklist(){
    var p=A.S.profile,a=acct,c=!!p.custom,px=PX(),x=XV();
    /* [what is missing, done, the setup step it lives in, counts toward that step's check mark]. One list feeds the setup bar, the step marks and the Dashboard. */
    var L=[["Your name",c&&!!p.name,"about",true],["An email recruiters can reply to",c&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email||""),"about",true],["Phone number",!!phoneOf(),"about",false],
      ["Job title",c&&!!p.title,"jobs",true],["At least 3 skills",c&&p.skills.length>=3,"jobs",true]];
    if(px)L.push(["Opportunity types",Array.isArray(x.types)&&x.types.length>0,"jobs",false]);
    L.push(["Your city",c&&!!p.loc,"where",true],["Home address",!!(a.addr&&a.addr.street&&a.addr.zip),"where",false],["Earliest start",!!startOf(),"where",false]);
    if(px)L.push(["School",!!x.school,"back",false]);
    L.push(["Resume file or link",!!(a.resumeName||resumeLinkOf()),"back",true],["Short summary (40+ characters)",summaryOf().length>=40,"back",false],["LinkedIn or portfolio link",!!(linkOf("linkedin")||linkOf("portfolio")),"back",false],["Work authorization",!!authOf(),"final",true]);
    return L;
  }

  /* per-application details (interview time, offer, rejection reason, notes) */
  function modeChip(j){var m={remote:"Remote",hybrid:"Hybrid",onsite:"In person"}[j.mode];return m?'<span class="mchip m-'+j.mode+'">'+m+'</span>':""}
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
    r.push(["share","Share"]);
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
    var job=A.JOBS.filter(function(j){return j.id===id})[0];
    if(job)remindInterview(id,job,a.when||"");
  }

  /* ---------- phone-app features (App Store / Google Play build in mobile/). They switch on only when the page runs
     inside the Capacitor app; on the website every helper quietly does nothing or uses the browser equivalent. ---------- */
  function cap(){var c=w.Capacitor||(w.parent&&w.parent!==w&&w.parent.Capacitor);return c&&c.isNativePlatform&&c.isNativePlatform()?c:null}
  function plug(name){var c=cap();return c&&c.Plugins&&c.Plugins[name]||null}
  function noteId(id){return Math.abs(+id)%2000000000||1}
  /* two reminders for each interview: the evening before (6 pm) and one hour before */
  function remindInterview(id,job,when){
    var LN=plug("LocalNotifications");if(!LN)return;
    var base=noteId(id)*2%2000000000,ids=[{id:base},{id:base+1}];
    Promise.resolve(LN.cancel({notifications:ids})).catch(function(){}).then(function(){
      var t=new Date(when);if(!when||isNaN(t))return;
      var eve=new Date(t);eve.setDate(eve.getDate()-1);eve.setHours(18,0,0,0);
      var hour=new Date(t.getTime()-36e5),now=Date.now(),list=[];
      if(eve.getTime()>now)list.push({id:base,title:"Interview tomorrow",body:job.role+" at "+job.co+", "+fmtDT(when),schedule:{at:eve}});
      if(hour.getTime()>now)list.push({id:base+1,title:"Interview in 1 hour",body:job.role+" at "+job.co,schedule:{at:hour}});
      if(!list.length)return;
      return Promise.resolve(LN.requestPermissions()).then(function(p){if(p&&p.display==="granted")return LN.schedule({notifications:list})});
    }).catch(function(){});
  }
  /* share a job: the phone's share sheet in the app, the browser's on phones that have one, else copy the link */
  function shareJob(job){
    var url=job.url||"",text=job.role+" at "+job.co+(url?"":" (on UAply)"),SH=plug("Share");
    if(SH)return SH.share({title:text,text:text,url:url||undefined}).catch(function(){});
    if(w.navigator.share)return w.navigator.share({title:text,text:text,url:url||undefined}).catch(function(){});
    if(w.navigator.clipboard)w.navigator.clipboard.writeText(text+(url?" "+url:"")).then(function(){showToastNote("Copied to share.")}).catch(function(){});
  }
  function showToastNote(m){var t=d.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=m;d.body.appendChild(t);setTimeout(function(){t.remove()},2500)}
  /* a light tap on the phone when a swipe lands */
  setTimeout(function(){
    var prev=w.__uaplyOnDecision;
    w.__uaplyOnDecision=function(dir){
      var H=plug("Haptics");if(H)Promise.resolve(H.impact({style:dir==="applied"?"MEDIUM":"LIGHT"})).catch(function(){});
      return prev?prev.apply(this,arguments):undefined;
    };
  },0);
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
      ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//UAply//EN","BEGIN:VEVENT","UID:aply-"+id+"-"+t.getTime()+"@aply","DTSTAMP:"+icsTime(new Date()),"DTSTART:"+icsTime(t),"DTEND:"+icsTime(new Date(t.getTime()+36e5)),
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
    h+='</div>';
    if(!REL)h+='<div class="plan" style="display:flex;flex-direction:column;gap:6px;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--surface)"><b>'+E(ps.plan.name)+(acct.enforce?"":' <small>(limits off in sandbox)</small>')+'</b><small>'+
      (ps.cap?ps.used+" of "+ps.cap+" applications used this week":ps.used+" applications this week, no limit")+(ps.ok?"":" · "+E(ps.why))+'</small><button type="button" class="btn ghost" data-go="plan" style="align-self:flex-start">Manage plan</button></div>';
    if(!(SRV&&SRV.user)&&!session())h+='<div class="plan" style="display:flex;flex-direction:column;gap:6px;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--surface)"><b>Save your progress</b><small>Sign in so your profile and applications are kept if you switch devices.</small><button type="button" class="btn" data-go="account" style="align-self:flex-start">Sign in or create account</button></div>';
    h+='<h3>Coming up</h3>'+(soon.length?soon.slice(0,6).map(function(s){return '<p class="note" style="margin:0">'+E(s[1])+'</p>'}).join(""):'<p class="note">Nothing scheduled. Open an application, tap Details and add an interview time, offer deadline or follow-up date.</p>');
    h+='<div class="acts"><button type="button" class="btn" data-go="svc">Find opportunities</button><button type="button" class="btn ghost" data-go="dash:interview">Interviews</button><button type="button" class="btn ghost" data-csv="1">Export applications (CSV)</button></div></div>';
    return h;
  }
  tp.addEventListener("click",function(e){
    var g=e.target.closest("[data-go]");
    if(g){var v=g.getAttribute("data-go");if(v==="svc"){cur="svc";go("svc")}else if(v.indexOf("dash:")===0){sub.dash=v.slice(5);cur="dash";go("dash")}else{if(stepIndex(v)>-1){wz.want=v;v="settings"}sub.prof=v;cur="prof";go("prof")}return}
    if(e.target.closest("[data-csv]"))exportCsv();
  });

  /* preferences + filters that really change the feed */
  (function(){
    var f=d.createElement("div");f.className="field full";f.id="aPrefs";
    f.innerHTML='<span class="l">Dealbreakers</span><div class="checks"><label><input type="checkbox" id="aSal"> Hide jobs whose top pay is below my minimum</label><label><input type="checkbox" id="aEdu"> Hide jobs that require more education than I have</label></div>'+
      '<label for="aYrs">Hide jobs asking for more experience than I have by</label><select id="aYrs"><option value="any">Show all</option><option value="0">Any amount</option><option value="1">1+ year</option><option value="2">2+ years</option><option value="3">3+ years</option></select><small>Takes effect right away in Jobs, Internships and Co-ops.</small>';
    fs.insertBefore(f,fs.firstChild);   /* dealbreakers hide jobs, so they live with the other filters */
    var extra=d.createElement("div");extra.className="field";
    extra.innerHTML='<label for="fCo">Hide these companies</label><input type="text" id="fCo" maxlength="200" placeholder="Acme, Globex"><small>Separate with commas.</small>'+
      '<label for="fKw" style="margin-top:8px">Hide roles or skills containing</label><input type="text" id="fKw" maxlength="200" placeholder="sales, php"><small>Matches the job title and its skills.</small>';
    fs.insertBefore(extra,fs.firstChild);
    function sync(){d.getElementById("aSal").checked=!!acct.fSal;d.getElementById("aEdu").checked=!!acct.fEdu;d.getElementById("aYrs").value=acct.fYrs;d.getElementById("fCo").value=acct.fCo;d.getElementById("fKw").value=acct.fKw}
    function changed(){
      acct.fSal=d.getElementById("aSal").checked;acct.fEdu=d.getElementById("aEdu").checked;acct.fYrs=d.getElementById("aYrs").value;
      acct.fCo=d.getElementById("fCo").value.slice(0,200);acct.fKw=d.getElementById("fKw").value.slice(0,200);
      saveA();A.renderAll();
    }
    ["aSal","aEdu","aYrs","fCo","fKw"].forEach(function(id){d.getElementById(id).addEventListener(id==="fCo"||id==="fKw"?"input":"change",changed)});
    w.__uaplySyncPrefs=sync;sync();
  })();

  /* filters: posted date, applicants, distance, benefits */
  (function(){
    var f=d.createElement("div");f.className="field";f.id="fMeta";
    f.innerHTML='<label for="fPosted">Posted</label><select id="fPosted"><option value="any">Any time</option><option value="24h">Past 24 hours</option><option value="7d">Past week</option><option value="30d">Past month</option></select>'+
      '<div class="checks" style="margin-top:8px"><label><input type="checkbox" id="fApp"> Under 10 applicants</label></div><small id="fAppNote">Applicant counts come from UAply. Listings from outside feeds do not have one yet.</small>'+
      '<div id="fMilesWrap"><label for="fMiles">Distance from your city</label><select id="fMiles"><option value="any">Any distance</option><option value="10">Within 10 miles</option><option value="20">Within 20 miles</option><option value="50">Within 50 miles</option><option value="100">Within 100 miles</option></select><small id="fMilesNote"></small></div>'+
      '<div class="checks" style="margin-top:8px"><label><input type="checkbox" id="fTitleOnly"> Hide roles that do not match my target titles</label></div><small>Uses your target titles in Profile setup. Off if you have not set your own details.</small>'+
      '<div class="checks" style="margin-top:8px"><label><input type="checkbox" id="fWsPick"> Hide work styles I did not pick</label></div><small>Uses the work styles ticked in Profile setup, under Where and pay. If none are ticked, every style shows.</small>'+
      '<div id="fCommWrap"><div class="checks" style="margin-top:8px"><label><input type="checkbox" id="fNoComm"> Remove commission-only roles</label></div><small>Shown because your titles are in sales. Based on what the posting says.</small></div>'+
      '<span class="l" style="margin-top:8px;display:block">Experience level</span><div class="checks" id="fLevels">'+XP.map(function(x){return '<label><input type="checkbox" data-lvl="'+x[0]+'"> '+x[1]+'</label>'}).join("")+'</div><small>Pick none to see every level.</small>'+
      '<details id="fPerks" style="margin-top:8px"><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600" id="fPerksSum">Benefits</summary><div class="checks" style="flex-direction:column;align-items:flex-start;gap:6px">'+
      PERKS.map(function(p){return '<label><input type="checkbox" data-perk="'+p[0]+'"> '+p[1]+'</label>'}).join("")+'</div><small>Matches postings that mention the benefit. A posting that says nothing may still offer it.</small></details>'+
      '<div class="checks" style="margin-top:8px"><label><input type="checkbox" id="fStrict"> Hide listings that do not say</label></div>'+
      '<small id="fCount" role="status"></small><div><button type="button" class="btn ghost" id="fClear">Clear all filters</button></div>';
    fs.insertBefore(f,fs.firstChild);
    function count(){
      var ty=A.getType(),tot=0,ok=0;
      A.JOBS.forEach(function(j){if((j.type||"job")!==ty)return;if(w.__uaplyHideSamples&&!j.live)return;tot++;if(!(w.__uaplyHide&&w.__uaplyHide(j)))ok++});
      d.getElementById("fCount").textContent=ok+" of "+tot+" listings in "+label("svc",ty)+" match your filters.";
    }
    function sync(){
      d.getElementById("fPosted").value=acct.fPosted;d.getElementById("fApp").checked=acct.fApp;d.getElementById("fMiles").value=acct.fMiles;d.getElementById("fStrict").checked=acct.fStrict;d.getElementById("fTitleOnly").checked=acct.fTitleOnly;d.getElementById("fWsPick").checked=acct.fWs;d.getElementById("fNoComm").checked=acct.fNoComm;
      d.getElementById("fCommWrap").hidden=!isSales();
      f.querySelectorAll("[data-lvl]").forEach(function(c){c.checked=acct.fLevels.indexOf(c.getAttribute("data-lvl"))>-1});
      f.querySelectorAll("[data-perk]").forEach(function(c){c.checked=acct.fPerks.indexOf(c.getAttribute("data-perk"))>-1});
      d.getElementById("fPerksSum").textContent="Benefits"+(acct.fPerks.length?" ("+acct.fPerks.length+" selected)":"");
      d.getElementById("fMilesNote").textContent=acct.fMiles==="any"||homeGeo()?(acct.fMiles==="any"?"Remote jobs always show.":"Remote jobs always show. Distances are straight-line from "+(A.S.profile.loc||"your ZIP code")+"."+(A.S.profile.reloc?" You said you would relocate: pick Any distance to see far-away jobs too.":"")):"We do not recognize your city yet. Add your state and ZIP code in Profile setup, or use a larger US city.";
      count();
    }
    function changed(){
      acct.fPosted=d.getElementById("fPosted").value;acct.fApp=d.getElementById("fApp").checked;acct.fMiles=d.getElementById("fMiles").value;acct.fStrict=d.getElementById("fStrict").checked;acct.fTitleOnly=d.getElementById("fTitleOnly").checked;acct.fWs=d.getElementById("fWsPick").checked;acct.fNoComm=d.getElementById("fNoComm").checked;
      acct.fLevels=[].slice.call(f.querySelectorAll("[data-lvl]")).filter(function(c){return c.checked}).map(function(c){return c.getAttribute("data-lvl")});
      acct.fPerks=[].slice.call(f.querySelectorAll("[data-perk]")).filter(function(c){return c.checked}).map(function(c){return c.getAttribute("data-perk")});
      cleanF(acct);saveA();A.renderAll();sync();
    }
    f.addEventListener("change",changed);
    d.getElementById("fClear").onclick=function(){
      acct.fPosted="any";acct.fApp=false;acct.fPerks=[];acct.fMiles="any";acct.fStrict=false;acct.fTitleOnly=false;acct.fWs=false;acct.fNoComm=false;acct.fLevels=[];acct.fEdu=false;acct.fSal=false;acct.fYrs="any";acct.fCo="";acct.fKw="";
      saveA();A.setMin(0);A.setFilter("all");A.renderAll();sync();if(w.__uaplySyncPrefsBase)w.__uaplySyncPrefsBase();savePrefs();syncFilters();
    };
    var base=w.__uaplySyncPrefs;w.__uaplySyncPrefsBase=base;
    w.__uaplySyncPrefs=function(){if(base)base();sync()};
    sync();
  })();

  /* Settings: target titles, level readout, voluntary questions. Preferences: distance (only for hybrid or on-site). */
  (function(){
    function syncMeta(){if(w.__uaplySyncPrefs)w.__uaplySyncPrefs()}
    /* target titles: the main title plus up to four more */
    d.querySelector("label[for=pTitle]").textContent="Target titles (up to 5)";
    var box=d.createElement("div");box.id="tBox";
    box.innerHTML='<div id="tChips"></div><div style="display:flex;gap:8px"><input type="text" id="tNew" maxlength="60" placeholder="Add another title, like Account Executive" aria-label="Add another title" style="flex:1"><button type="button" class="btn ghost" id="tAdd">Add</button></div><small id="tNote" role="status"></small>';
    d.getElementById("pTitle").closest(".field").appendChild(box);
    function paintTitles(msg){
      d.getElementById("tChips").innerHTML=acct.titles.map(function(t,i){return '<span>'+E(t)+'<button type="button" data-rm="'+i+'" aria-label="Remove '+E(t)+'">&times;</button></span>'}).join("");
      var full=acct.titles.length>=4;
      d.getElementById("tNew").disabled=full;d.getElementById("tAdd").disabled=full;
      d.getElementById("tNote").textContent=msg||((full?"You have 5 titles (the one above plus four).":"The first title above is your main one. You can add "+(4-acct.titles.length)+" more.")+" Jobs are scored and filtered by how well the role name matches."+(isSales()?" Sales titles found: you can hide commission-only roles in Profile, Filters.":""));
    }
    function addTitle(){
      var inp=d.getElementById("tNew"),t=inp.value.trim().replace(/\s+/g," ").slice(0,60);
      if(!t||acct.titles.length>=4)return;
      if(titleList().some(function(x){return x.toLowerCase()===t.toLowerCase()})){paintTitles("That title is already on your list.");return}
      acct.titles.push(t);saveA();inp.value="";paintTitles();A.renderAll();syncMeta();
    }
    d.getElementById("tAdd").onclick=addTitle;
    d.getElementById("tNew").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();addTitle()}});
    box.addEventListener("click",function(e){var b=e.target.closest("[data-rm]");if(!b)return;acct.titles.splice(+b.getAttribute("data-rm"),1);saveA();paintTitles();A.renderAll();syncMeta()});
    /* home address replaces "City you live in". Only the city is used for matching and distance. */
    var locField=d.getElementById("pLoc").closest(".field");
    var af=d.createElement("div");af.className="field full";af.id="aAddr";
    af.innerHTML='<span class="l">Home address (for job applications)</span><div class="grid">'+
      '<div class="field full"><label for="adStreet">Street address</label><input type="text" id="adStreet" autocomplete="address-line1" maxlength="120" placeholder="123 Market St"></div>'+
      '<div class="field"><label for="adUnit">Apartment or suite (optional)</label><input type="text" id="adUnit" autocomplete="address-line2" maxlength="30"></div>'+
      '<div class="field" id="adCityF"></div>'+
      '<div class="field"><label for="adState">State</label><select id="adState" autocomplete="address-level1"><option value="">Choose</option>'+US_STATES.map(function(s){return '<option>'+s+'</option>'}).join("")+'</select></div>'+
      '<div class="field"><label for="adZip">ZIP code</label><input type="text" id="adZip" inputmode="numeric" autocomplete="postal-code" maxlength="10" placeholder="19103"></div>'+
      '</div><small id="adErr" role="alert"></small><small>Used to fill in employer forms. Your city, state and ZIP code also help find where you live for the distance filter. Your street stays on this device.</small>';
    locField.parentNode.insertBefore(af,locField);
    var cityF=d.getElementById("adCityF");
    while(locField.firstChild)cityF.appendChild(locField.firstChild);
    locField.remove();
    d.querySelector("label[for=pLoc]").textContent="City";
    FIELDS.settings.push("aAddr");
    function fillAddr(){var ad=acct.addr;d.getElementById("adStreet").value=ad.street;d.getElementById("adUnit").value=ad.unit;d.getElementById("adState").value=ad.state;d.getElementById("adZip").value=ad.zip;d.getElementById("adErr").textContent=""}
    form.addEventListener("submit",function(e){
      var z=d.getElementById("adZip").value.trim();
      if(z&&!/^\d{5}(-\d{4})?$/.test(z)){e.preventDefault();e.stopImmediatePropagation();d.getElementById("adErr").textContent="Enter a 5-digit ZIP code (or ZIP+4, like 19103-1234).";goField("adZip");return}
      acct.addr={street:d.getElementById("adStreet").value,unit:d.getElementById("adUnit").value,state:d.getElementById("adState").value,zip:z};
      cleanF(acct);saveA();d.getElementById("adErr").textContent="";
    },true);
    /* experience level readout under years */
    var yf=d.getElementById("pYears").closest(".field"),xl=d.createElement("small");xl.id="xpLevel";yf.appendChild(xl);
    function paintLevel(){var y=+d.getElementById("pYears").value||0;xl.textContent="Your level: "+levelOf(y)[1]}
    d.getElementById("pYears").addEventListener("input",paintLevel);
    /* work eligibility and voluntary self-identification (the questions US employers ask on their forms). Every answer is
       optional and starts as "Not answered". They stay on this device, are never used to score, rank or filter jobs, and
       leave the device only when the person taps "Copy my answers". The owner's legal review advised against collecting
       these; the product owner chose to include them on 2026-10-13, so they need the attorney review before launch. */
    var NAMES={auth:"Work authorization",sponsor:"Visa sponsorship",veteran:"Veteran status",hisp:"Hispanic or Latino",disability:"Disability",gender:"Gender"};
    function eeoSel(k){return '<div class="field"><label for="ev-'+k+'">'+NAMES[k]+'</label><select id="ev-'+k+'" data-eeo="'+k+'"><option value="">Not answered</option>'+EEO[k].filter(Boolean).map(function(o){return '<option>'+E(o)+'</option>'}).join("")+'</select></div>'}
    /* work eligibility: needed to apply, so it sits in the main flow */
    var el=d.createElement("div");el.className="field full";el.id="aElig";
    el.innerHTML='<h3 style="margin:0;font-size:15px">Work eligibility</h3>'+eeoSel("auth")+eeoSel("sponsor")+'<small>Added to the applications you send. It never changes your match score or hides a job.</small>';
    d.querySelector("#form .grid").appendChild(el);
    /* voluntary self-identification: folded shut and clearly optional */
    var ev=d.createElement("details");ev.className="field full";ev.id="aEeo";
    ev.innerHTML='<summary>Optional: voluntary self-identification (veteran, disability, race, gender)</summary><div class="eeoBody"><small>Many employers ask these on their application forms. Skipping this section changes nothing. Every question has "Prefer not to say". Your answers are used only to fill in employer forms for you, never to score, rank or filter jobs, and are shared only when you tap Copy my answers. Stored on this device.</small>'+
      ["veteran","hisp","disability","gender"].map(eeoSel).join("")+
      '<div class="field"><span class="l">Race or ethnicity</span><div class="checks" id="ev-race">'+EEO.race.map(function(o){return '<label><input type="checkbox" data-race="'+E(o)+'"> '+E(o)+'</label>'}).join("")+'</div></div>'+
      '<div><button type="button" class="btn ghost" id="evClear">Clear these answers</button></div><small id="evNote" role="status"></small></div>';
    d.querySelector("#form .grid").appendChild(ev);
    function fillEeo(){
      d.querySelectorAll("#aElig [data-eeo],#aEeo [data-eeo]").forEach(function(s){s.value=acct.eeo[s.getAttribute("data-eeo")]||""});
      d.querySelectorAll("#aEeo [data-race]").forEach(function(c){c.checked=acct.eeo.race.indexOf(c.getAttribute("data-race"))>-1});
    }
    function eeoChanged(e){
      var s=e.target.closest("[data-eeo]"),r=e.target.closest("[data-race]");
      if(s)acct.eeo[s.getAttribute("data-eeo")]=s.value;
      if(r)acct.eeo.race=[].slice.call(ev.querySelectorAll("[data-race]")).filter(function(c){return c.checked}).map(function(c){return c.getAttribute("data-race")});
      cleanF(acct);saveA();d.getElementById("evNote").textContent="Saved on this device.";
    }
    el.addEventListener("change",eeoChanged);ev.addEventListener("change",eeoChanged);
    d.getElementById("evClear").onclick=function(){acct.eeo={auth:acct.eeo.auth,sponsor:acct.eeo.sponsor,veteran:"",hisp:"",race:[],disability:"",gender:""};saveA();fillEeo();d.getElementById("evNote").textContent="Cleared."};
    w.__uaplyAnswers=function(){
      var p=A.S.profile,a=acct,e=a.eeo,L=[];
      function add(k,v){if(v!==""&&v!=null)L.push(k+": "+v)}
      var ad=a.addr||{},line=[ad.street,ad.unit].filter(Boolean).join(", "),tail=[p.loc,[ad.state,ad.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      add("Name",p.name);add("Email",p.email);add("Phone",phoneOf());
      if(line)add("Address",line+(tail?", "+tail:""));else add("City",p.loc);add("LinkedIn",linkOf("linkedin"));add("Portfolio",linkOf("portfolio"));add("Resume link",resumeLinkOf());add("Current title",p.title);
      add("Years of experience",p.years);add("Highest education",p.edu);add("Skills",p.skills.join(", "));add("Can start",startOf());
      add("Work authorization",authOf());add("Visa sponsorship",sponsorOf());
      var vol=[["Veteran status",e.veteran],["Hispanic or Latino",e.hisp],["Race or ethnicity",e.race.join(", ")],["Disability",e.disability],["Gender",e.gender]].filter(function(x){return x[1]});
      if(vol.length){L.push("","Voluntary self-identification:");vol.forEach(function(x){add(x[0],x[1])})}
      return L.join("\n");
    };
    /* distance moves to Preferences and shows only for hybrid or on-site */
    var mf=d.createElement("div");mf.className="field full";mf.id="aMilesF";mf.appendChild(d.getElementById("fMilesWrap"));
    d.querySelector("#form .grid").appendChild(mf);FIELDS.preferences.push("aMilesF");
    d.getElementById("fMiles").addEventListener("change",function(){acct.fMiles=this.value;cleanF(acct);saveA();A.renderAll();syncMeta()});
    function vis(){mf.classList.toggle("nomiles",!(d.getElementById("pm-hybrid").checked||d.getElementById("pm-onsite").checked))}
    ["pm-hybrid","pm-onsite"].forEach(function(id){d.getElementById(id).addEventListener("change",vis)});
    var base=w.__uaplySyncPrefs;
    w.__uaplySyncPrefs=function(){if(base)base();paintTitles();fillEeo();fillAddr();paintLevel();vis();setTimeout(function(){paintLevel();vis()},0)};
    paintTitles();fillEeo();fillAddr();paintLevel();vis();A.renderAll();
  })();

  /* resume file and resume link live in Preferences */
  (function(){
    var rf=d.createElement("div");rf.className="field full";rf.id="aResF";
    rf.innerHTML='<span class="l">Resume</span><div id="resNow"></div>'+
      '<label for="pResFile" style="margin-top:4px">Upload your resume file</label><input type="file" id="pResFile" accept=".pdf,.doc,.docx,.txt,.md"><small>PDF, Word or text, up to 1 MB. Kept on this device.</small>'+
      '<div id="resLinkWrap" style="display:flex;flex-direction:column;gap:5px"><label for="pResUrl" style="margin-top:8px">Or add a link to your resume (optional)</label><input type="text" id="pResUrl" inputmode="url" maxlength="300" placeholder="https://drive.google.com/..."></div><small id="resMsg" role="status"></small>';
    d.querySelector("#form .grid").appendChild(rf);FIELDS.preferences.push("aResF");
    function paintRes(m){
      var a=acct;
      d.getElementById("resNow").innerHTML=a.resumeName
        ?'<div class="todo"><span>'+E(a.resumeName)+' ('+Math.max(1,Math.round(a.resumeSize/1024))+' KB)</span><span class="acts"><a class="btn ghost" download="'+E(a.resumeName)+'" href="'+a.resumeData+'">Download</a><button type="button" class="btn ghost" id="resRm">Remove</button></span></div>'
        :'<small>No resume file yet.</small>';
      d.getElementById("pResUrl").value=a.resumeUrl;
      d.getElementById("resMsg").textContent=m||"";
      var rm=d.getElementById("resRm");if(rm)rm.onclick=function(){acct.resumeName="";acct.resumeData="";acct.resumeSize=0;saveA();paintRes("Resume file removed.")};
    }
    d.getElementById("pResFile").addEventListener("change",function(){
      var f=this.files[0],inp=this;if(!f)return;
      if(f.size>1048576){inp.value="";paintRes("That file is over 1 MB.");return}
      if(!/\.(pdf|docx?|txt|md)$/i.test(f.name)){inp.value="";paintRes("Use a PDF, Word or text file.");return}
      readFile(f,false,function(u){
        inp.value="";
        if(!u||!DATA_URL.test(u)){paintRes("Could not read that file.");return}
        var prev=[acct.resumeName,acct.resumeSize,acct.resumeData];
        acct.resumeName=f.name.slice(0,120);acct.resumeSize=f.size;acct.resumeData=u;
        if(saveA())paintRes("Resume added.");
        else{acct.resumeName=prev[0];acct.resumeSize=prev[1];acct.resumeData=prev[2];paintRes("Not enough browser storage for that file.")}
      });
    });
    var url=d.getElementById("pResUrl");
    url.addEventListener("change",function(){
      var v=url.value.trim();
      if(!v){acct.resumeUrl="";saveA();paintRes("Link removed.");return}
      var u=cleanUrl(v);
      if(!u||!/^https:/i.test(u)){d.getElementById("resMsg").textContent="Use a full https:// link, like a Google Drive or Dropbox share link.";return}
      acct.resumeUrl=u;saveA();paintRes("Link saved.");
    });
    url.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();url.dispatchEvent(new w.Event("change"))}});
    var base=w.__uaplySyncPrefs;w.__uaplySyncPrefs=function(){if(base)base();paintRes()};
    paintRes();
  })();

  /* skills: suggestions while typing (catches typos), and a 25-skill limit */
  (function(){
    var inp=d.getElementById("pSkills"),fld=inp.closest(".field"),MAX=25;
    var COMMON=["Salesforce","HubSpot","CRM","Cold calling","Lead generation","Prospecting","Negotiation","Account management","B2B sales","SaaS sales","Closing","Pipeline management","Customer success","Business development","Sales presentations","Upselling",
      "Communication","Customer service","Microsoft Excel","Microsoft Word","PowerPoint","Google Workspace","Project management","Time management","Teamwork","Leadership","Public speaking","Data entry","Scheduling","Spanish","Problem solving",
      "SEO","Copywriting","Social media marketing","Content marketing","Email marketing","Google Analytics","Canva","Figma","Adobe Photoshop","Adobe Illustrator","User research","Prototyping",
      "JavaScript","TypeScript","Python","Java","C#","C++","Go","SQL","PostgreSQL","React","Node","HTML","CSS","AWS","Docker","Kubernetes","Git","Testing","Linux","Machine learning","Tableau","Power BI","Excel",
      "Patient care","CPR","Electronic medical records","Accounting","QuickBooks","Bookkeeping","Financial analysis","Cash handling","Retail","Inventory management","Food safety","Forklift operation","Teaching","Math","Tutoring"];
    var DICT=[],dictLen=-1;
    function dict(){
      if(dictLen===A.JOBS.length)return DICT;
      var seen={};DICT=[];dictLen=A.JOBS.length;
      COMMON.concat([].concat.apply([],A.JOBS.map(function(j){return j.skills||[]}))).forEach(function(s){var k=String(s).toLowerCase();if(s&&!seen[k]){seen[k]=1;DICT.push(String(s))}});
      return DICT;
    }
    function lev(a,b){
      if(Math.abs(a.length-b.length)>2)return 9;
      var p=[],i,j;for(j=0;j<=b.length;j++)p[j]=j;
      for(i=1;i<=a.length;i++){var c=[i];for(j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}
      return p[b.length];
    }
    function parts(){return inp.value.split(",").map(function(s){return s.trim()})}
    function allSkills(){var seen={};return parts().filter(function(s){var k=s.toLowerCase();if(!s||seen[k])return false;seen[k]=1;return true})}
    function closest(q){var ql=q.toLowerCase(),best=null,bd=9;dict().forEach(function(s){var dd=lev(ql,s.toLowerCase());if(dd<bd){bd=dd;best=s}});return bd<=(ql.length>=6?2:1)?best:null}
    var list=d.createElement("ul");list.id="skillList";list.setAttribute("role","listbox");list.setAttribute("aria-label","Skill suggestions");list.hidden=true;
    inp.after(list);
    inp.setAttribute("role","combobox");inp.setAttribute("aria-autocomplete","list");inp.setAttribute("aria-controls","skillList");inp.setAttribute("aria-expanded","false");
    var count=d.createElement("small");count.id="skillCount";count.setAttribute("role","status");fld.appendChild(count);
    var act=-1,items=[];
    function close(){list.hidden=true;inp.setAttribute("aria-expanded","false");inp.removeAttribute("aria-activedescendant");act=-1}
    function matches(q){
      var ql=q.toLowerCase(),used={};parts().slice(0,-1).forEach(function(s){used[s.toLowerCase()]=1});
      var pre=[],sub=[],fuzzy=[];
      dict().forEach(function(s){
        var l=s.toLowerCase();if(used[l])return;
        if(l.indexOf(ql)===0)pre.push({s:s});
        else if(l.indexOf(ql)>-1)sub.push({s:s});
        else if(ql.length>=3&&(lev(ql,l)<=(ql.length>=6?2:1)||lev(ql,l.slice(0,ql.length))<=1))fuzzy.push({s:s,fix:true});
      });
      pre.sort(function(a,b){return a.s.length-b.s.length});
      return pre.concat(sub,fuzzy).slice(0,8);
    }
    function paintCount(){
      var n=allSkills().length,unknown=allSkills().filter(function(s){var l=s.toLowerCase();return !dict().some(function(x){return x.toLowerCase()===l})}),fixes=[];
      unknown.forEach(function(s){var c=closest(s);if(c)fixes.push('"'+s+'" (did you mean '+c+'?)')});
      fld.classList.toggle("skillfull",n>=MAX);
      count.textContent=n+" of "+MAX+" skills"+(n>MAX?". Remove "+(n-MAX)+" to save.":"")+(fixes.length?" Check spelling: "+fixes.slice(0,3).join(", ")+".":"");
      count.style.color=n>MAX||fixes.length?"var(--no)":"";
    }
    function paint(){
      paintCount();
      var q=parts().slice(-1)[0]||"";
      if(!q||d.activeElement!==inp){close();return}
      if(allSkills().length>MAX||(allSkills().length===MAX&&!dict().some(function(x){return x.toLowerCase()===q.toLowerCase()}))){
        list.innerHTML='<li class="info">You have reached '+MAX+' skills. Remove one to add another.</li>';list.hidden=false;items=[];act=-1;inp.setAttribute("aria-expanded","true");return;
      }
      items=matches(q);
      if(!items.length){list.innerHTML='<li class="info">No match. Check the spelling, or keep it as a new skill.</li>';list.hidden=false;act=-1;inp.setAttribute("aria-expanded","true");return}
      act=Math.min(act,items.length-1);
      list.innerHTML=items.map(function(o,i){return '<li role="option" id="sk-opt-'+i+'" data-i="'+i+'" aria-selected="'+(i===act)+'"><span>'+E(o.s)+'</span>'+(o.fix?'<small>Did you mean this?</small>':'')+'</li>'}).join("");
      list.hidden=false;inp.setAttribute("aria-expanded","true");
      if(act>-1)inp.setAttribute("aria-activedescendant","sk-opt-"+act);else inp.removeAttribute("aria-activedescendant");
    }
    function pick(s){
      var v=inp.value,i=v.lastIndexOf(",");
      inp.value=(i>-1?v.slice(0,i+1)+" ":"")+s+", ";
      close();inp.dispatchEvent(new w.Event("input",{bubbles:true}));inp.focus();
    }
    inp.addEventListener("input",function(){act=-1;paint()});
    inp.addEventListener("focus",paint);
    inp.addEventListener("blur",function(){setTimeout(function(){if(d.activeElement!==inp)close()},120)});
    inp.addEventListener("keydown",function(e){
      if(list.hidden||!items.length){if(e.key==="Escape")close();return}
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();act=(act+(e.key==="ArrowDown"?1:-1)+items.length)%items.length;paint()}
      else if(e.key==="Enter"){if(act>-1){e.preventDefault();pick(items[act].s)}}
      else if(e.key==="Escape"){e.preventDefault();close()}
    });
    list.addEventListener("mousedown",function(e){e.preventDefault()});
    list.addEventListener("click",function(e){var li=e.target.closest("[data-i]");if(li)pick(items[+li.getAttribute("data-i")].s)});
    d.getElementById("skillSug").addEventListener("click",function(e){if(fld.classList.contains("skillfull")&&e.target.closest("[data-add]")){e.stopImmediatePropagation();paintCount()}},true);
    form.addEventListener("submit",function(e){
      if(allSkills().length>MAX){e.preventDefault();e.stopImmediatePropagation();paintCount();goField("pSkills")}
    },true);
    var base=w.__uaplySyncPrefs;
    w.__uaplySyncPrefs=function(){if(base)base();setTimeout(paintCount,0)};
    paintCount();
  })();

  /* message to the hiring manager on swipe right: opt-in (off by default), Plus and Pro only. It goes out with the
     application, so only to employers that agreed to receive applications through UAply (the server decides that).
     The owner's legal review advised against writing messages for recruiters; the product owner chose to include it on
     2026-10-13, so it needs the attorney review before launch. */
  function autoAllowed(){if(REL)return true;var s=planState();return s.plan!==PLANS.trial&&s.ok}
  w.__uaplyAutoMsg=function(){return autoAllowed()&&!!acct.fAuto};
  w.__uaplyMessage=function(job,m,p){
    var skills=(m.matched||[]).slice(0,3),name=p.name||"[Your name]",sumv=summaryOf();
    var fit=skills.length?"My experience with "+skills.join(", ")+" lines up with what the role asks for":"My background lines up well with what the role asks for";
    var yrs=p.years?", and I bring "+p.years+" year"+(+p.years===1?"":"s")+" of experience":"";
    var who=p.title?"I'm a "+p.title+(p.loc?" based in "+p.loc:"")+". ":(p.loc?"I'm based in "+p.loc+". ":"");
    var sum=sumv?sumv.split(/(?<=[.!?])\s/)[0].slice(0,200)+" ":"";
    var where=job.mode==="remote"?"remote":(job.loc||"your team");
    var sign=[name,p.email||"",phoneOf(),linkOf("linkedin")].filter(Boolean).join("\n");
    return "Hi "+job.co+" hiring team,\n\nI just applied for the "+job.role+" role. "+who+sum+fit+yrs+". I'd be glad to work "+(where==="remote"?"remotely":"with "+where)+" and can talk whenever suits you.\n\nThank you for your time,\n"+sign;
  };
  (function(){
    var f=d.createElement("div");f.className="field full";f.id="aAutoF";
    f.innerHTML='<span class="l">Message the hiring manager</span><div class="checks"><label><input type="checkbox" id="aAutoMsg"> Send a personalized message with my application the moment I swipe right</label></div>'+
      '<small id="aAutoNote"></small><div><button type="button" class="btn ghost" id="aAutoPlans" hidden>See plans</button></div>';
    d.querySelector("#form .grid").appendChild(f);
    FIELDS.preferences.push("aAutoF");
    function sync(){
      var ok=autoAllowed(),cb=d.getElementById("aAutoMsg");
      cb.disabled=!ok;cb.checked=ok&&!!acct.fAuto;
      d.getElementById("aAutoPlans").hidden=ok||REL;
      d.getElementById("aAutoNote").textContent=ok
        ?"Off until you turn it on. The message is written from your profile and the job (a template for now) and goes out with your application, only to employers that accept applications through UAply. An application cannot be unsent."
        :"A Plus and Pro feature. Plus and Pro members can turn this on.";
    }
    d.getElementById("aAutoMsg").addEventListener("change",function(e){acct.fAuto=e.target.checked&&autoAllowed();saveA();sync()});
    d.getElementById("aAutoPlans").onclick=function(){sub.prof="plan";cur="prof";go("prof")};
    var base=w.__uaplySyncPrefs;
    w.__uaplySyncPrefs=function(){if(base)base();sync()};
    sync();
  })();

  /* resume, plan and data panels */
  var acctSec=d.createElement("div");acctSec.id="acctSec";acctSec.className="form";acctSec.hidden=true;form.after(acctSec);
  var AUTH=["Authorized to work in the US without sponsorship","Authorized now, will need sponsorship later","Need sponsorship now","Authorized to work outside the US"];
  var NOTICE=["Immediately","2 weeks","1 month","2 months or more"];
  function msg(t){var m=d.getElementById("aMsg");if(!m)return;m.textContent=t;if(t&&m.scrollIntoView)m.scrollIntoView({block:"nearest",behavior:"smooth"})}
  function cleanUrl(u){u=String(u||"").trim();if(!u)return "";if(!URL_OK.test(u))u="https://"+u;try{var x=new w.URL(u);return /^https?:$/.test(x.protocol)?x.href.slice(0,300):null}catch(e){return null}}
  function opts(list,cur){return '<option value="">Choose</option>'+list.map(function(x){return '<option'+(cur===x?" selected":"")+'>'+E(x)+'</option>'}).join("")}
  /* The old "Resume & links" screen is gone: its questions are part of the guided setup. They are built here as ordinary form
     fields, and hidden (see the de-duplication pass at the end) when the Application profile experiment asks the same thing. */
  (function(){
    var g=d.querySelector("#form .grid");
    function mk(id,cls,html){var f=d.createElement("div");f.className="field"+(cls?" "+cls:"");f.id=id;f.innerHTML=html;g.appendChild(f)}
    mk("aNoticeF","",'<label for="aNotice">When can you start?</label><select id="aNotice">'+opts(NOTICE,"")+'</select>');
    mk("aSummaryF","full",'<label for="aSummary">Short summary</label><textarea id="aSummary" maxlength="600" rows="3"></textarea><small>Two or three sentences recruiters read first. Skills you mention here also count toward your match.</small>');
    mk("aLinkedF","",'<label for="aLinked">LinkedIn</label><input type="text" id="aLinked" inputmode="url" maxlength="300" placeholder="linkedin.com/in/you"><small class="err" id="aLinkedErr" role="alert"></small>');
    mk("aSiteF","",'<label for="aSite">Portfolio or website</label><input type="text" id="aSite" inputmode="url" maxlength="300" placeholder="yourname.com"><small class="err" id="aSiteErr" role="alert"></small>');
    mk("aCoverF","full",'<label for="aCover">Cover note template</label><textarea id="aCover" maxlength="1500" rows="4" placeholder="Hi, I am excited about the {role} role at {company}..."></textarea><small>Use {role}, {company} and {name}. Saved for when you write to a recruiter.</small>');
    function fill(){
      d.getElementById("aNotice").innerHTML=opts(NOTICE,acct.notice);
      d.getElementById("aSummary").value=acct.summary;d.getElementById("aLinked").value=acct.linkedin;d.getElementById("aSite").value=acct.portfolio;d.getElementById("aCover").value=acct.cover;
      d.getElementById("aLinkedErr").textContent="";d.getElementById("aSiteErr").textContent="";
    }
    form.addEventListener("submit",function(e){
      var li=cleanUrl(d.getElementById("aLinked").value),si=cleanUrl(d.getElementById("aSite").value);
      if(li===null||si===null){
        e.preventDefault();e.stopImmediatePropagation();
        d.getElementById("aLinkedErr").textContent=li===null?"That is not a valid web address.":"";d.getElementById("aSiteErr").textContent=si===null?"That is not a valid web address.":"";
        goField(li===null?"aLinked":"aSite");return;
      }
      acct.linkedin=li;acct.portfolio=si;acct.notice=d.getElementById("aNotice").value;
      acct.summary=d.getElementById("aSummary").value.trim().slice(0,600);acct.cover=d.getElementById("aCover").value.trim().slice(0,1500);
      saveA();
    },true);
    var base=w.__uaplySyncPrefs;w.__uaplySyncPrefs=function(){if(base)base();fill()};
    fill();
  })();
  function renderAcct(v){
    var h='<h3>'+label("prof",v)+'</h3><p class="lead">'+LEADS[v]+'</p>';
    if(v==="account"){acctSec.innerHTML=h+accountHTML()+'<p class="note" id="aMsg" role="status"></p>';paintHeader();return}
    if(v==="plan"){
      var ps=planState();
      h+='<div class="plan" style="display:flex;flex-direction:column;gap:6px"><span class="tag">SANDBOX · TEST MODE</span><b>Current plan: '+E(ps.plan.name)+(acct.canceled&&acct.plan!=="trial"?" (ends "+new Date(acct.renews).toLocaleDateString()+")":"")+'</b>'+
        '<small>'+(ps.cap?ps.used+" of "+ps.cap+" applications used this week":ps.used+" applications this week, no limit")+(acct.plan!=="trial"&&!acct.canceled?" · renews "+new Date(acct.renews).toLocaleDateString():"")+'</small>'+
        (ps.cap?'<div class="bar"><i style="width:'+Math.min(100,Math.round(ps.used/ps.cap*100))+'%"></i></div>':"")+(ps.ok?"":'<p class="note" style="margin:0">'+E(ps.why)+'</p>')+'</div><div class="plans">';
      Object.keys(PLANS).forEach(function(k){
        var p=PLANS[k],cur=acct.plan===k;
        h+='<div class="plan" data-cur="'+cur+'"><b>'+p.name+'</b><span class="pr">'+(p.price?"$"+p.price.toFixed(2)+'<small>/month</small>':"$0")+'</span><ul>'+p.perks.map(function(x){return '<li>'+E(x)+'</li>'}).join("")+'</ul>'+
          (k==="trial"?(cur?'<small>Your current plan</small>':''):(cur?(acct.canceled?'<button type="button" class="btn" data-a="resub">Resume subscription</button>':'<button type="button" class="btn ghost" data-a="cancel">Cancel plan</button>'):'<button type="button" class="btn" data-plan="'+k+'">'+(acct.plan==="trial"?"Choose ":"Switch to ")+p.name+' (test)</button>'))+'</div>';
      });
      h+='</div><p class="note">In the live app, paid plans open a secure checkout from a payment provider. UAply never sees or stores card numbers. In the sandbox, choosing a plan only records a test payment.</p>'+
        '<h3>Payments</h3>'+(acct.pay.length?acct.pay.slice().reverse().map(function(p){return '<div class="todo"><span>'+new Date(p.at).toLocaleDateString()+' · '+E(PLANS[p.plan]?PLANS[p.plan].name:"Plan")+'</span><span>$'+(+p.amt||0).toFixed(2)+' (test)</span></div>'}).join(""):'<p class="note">No payments yet.</p>')+
        '<h3>Sandbox controls</h3><label class="toggle"><input type="checkbox" id="aEnf"'+(acct.enforce?" checked":"")+'> Enforce plan limits (shows the paywall when the weekly limit runs out)</label><div class="acts"><button type="button" class="btn ghost" data-a="rtrial">Go back to Free</button></div>';
    }else{
      h+='<h3 style="font-size:15px">Back up</h3><p class="note" style="margin:0">Your profile, applications and details in one file you keep.</p><div class="acts"><button type="button" class="btn" data-a="exp">Download backup (JSON)</button><button type="button" class="btn ghost" data-csv="1">Applications (CSV)</button></div>'+
        '<h3 style="font-size:15px">Restore</h3><input type="file" id="aImp" accept=".json,application/json"><small>Replaces what is on this device with the file. Only files made by UAply are accepted.</small>'+
        '<h3 style="font-size:15px">Privacy</h3><p class="note" style="margin:0">'+(REL?"Your profile and swipes are saved on this device. If you make an account, your account and the receipts we email you are also stored on UAply's server. You can delete your data here and your account under Account.":"Everything above is stored in this browser only. In sandbox, applications go to a simulated inbox unless you turned on live sending.")+'</p>'+
        '<h3 style="font-size:15px">Legal</h3><p class="note" style="margin:0">The rules and promises behind UAply. These are drafts that a lawyer has not reviewed yet.</p>'+
        '<div class="legallist" style="display:flex;flex-direction:column;gap:6px">'+[["terms.html","Terms of Service","The rules for using UAply."],["privacy.html","Privacy Policy","What we collect, who sees it, and your rights."],["ai-and-employment.html","AI and matching","How the match score works and what it is not."],["copyright.html","Copyright and content","Ownership, job listing sources, fonts, and takedown requests."],["index.html","All legal pages","Everything in one place."]]
          .map(function(l){return '<a class="btn ghost" data-legal="'+l[0]+'" href="'+LB+l[0]+'" target="_blank" rel="noopener noreferrer" style="display:block;text-align:left;text-decoration:none"><b>'+l[1]+'</b><br><small>'+l[2]+'</small></a>'}).join("")+'</div>'+
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
    else if(t.id==="aImp"&&t.files[0]){
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
    if(a==="cancel"){acct.canceled=true;saveA();renderAcct("plan");msg("Plan canceled. It stays active until the end of the period.")}
    else if(a==="resub"){acct.canceled=false;if(acct.renews<Date.now())acct.renews=Date.now()+30*DAY;saveA();renderAcct("plan");msg("Subscription resumed.")}
    else if(a==="rtrial"){acct.plan="trial";acct.since=Date.now();acct.canceled=false;acct.renews=0;saveA();renderAcct("plan");msg("You're on Free.")}
    else if(a==="exp"){
      download("aply-backup.json","application/json",JSON.stringify({app:"aply",v:1,exported:new Date().toISOString(),profile:A.S.profile,decisions:A.S.decisions,acct:acct}));
    }
    else if(a==="wipe"){
      if(b.getAttribute("data-sure")!=="1"){b.setAttribute("data-sure","1");b.textContent="Click again to delete everything";return}
      [w.__uaplyKey,AK,NK].forEach(function(k){try{w.localStorage.removeItem(k)}catch(x){}});
      w.location.reload();
    }
  });
  function importBackup(txt){
    var o;try{o=JSON.parse(txt)}catch(e){return "That is not a valid backup file."}
    if(!o||o.app!=="aply"||o.v!==1||typeof o.profile!=="object"||o.profile===null)return "That file was not made by UAply.";
    function str(x,n){return typeof x==="string"?x.slice(0,n):""}
    function num(x,lo,hi){x=+x;return isFinite(x)?Math.min(hi,Math.max(lo,x)):lo}
    var p=o.profile,m=(p.modes&&typeof p.modes==="object")?p.modes:{},LV=["High school","Associate","Bachelor","Master","Doctorate"];
    /* the Application profile answers (phone, links, school, work authorization, opportunity types...) come back too */
    var ext={};
    if(p.ext&&typeof p.ext==="object")Object.keys(p.ext).slice(0,30).forEach(function(k){var v=p.ext[k];if(typeof v==="number"&&isFinite(v))ext[k]=v;else if(typeof v==="string")ext[k]=v.slice(0,600);else if(Array.isArray(v))ext[k]=v.filter(function(x){return typeof x==="string"}).slice(0,10).map(function(x){return x.slice(0,40)})});
    var np={name:str(p.name,100),title:str(p.title,100),email:str(p.email,200),ext:ext,years:num(p.years,0,50),edu:LV.indexOf(p.edu)>-1?p.edu:"Bachelor",
      skills:Array.isArray(p.skills)?p.skills.filter(function(s){return typeof s==="string"&&s.trim()}).slice(0,25).map(function(s){return s.slice(0,40)}):[],
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
    cleanF(acct);
    if(!saveA()){acct=keep;return "Not enough browser storage for that backup."}
    A.S.profile=np;A.S.decisions=nd;A.S.history=ids;A.save();A.renderAll();
    if(w.__uaplySyncPrefs)w.__uaplySyncPrefs();
    return true;
  }

  /* ---------- sign-in (SANDBOX TEST MODE: accounts live only in this browser; nothing is sent anywhere) ---------- */
  var AUK=w.__uaplyKey+".auth.accounts",SSK=w.__uaplyKey+".auth.session";
  var AUI={tab:"link",step:"enter",pending:null,pwMode:"in",fails:0,lock:0,delSure:false};
  var VIA={google:"Google",apple:"Apple",link:"Email link",phone:"Phone",password:"Email and password"};
  var EMAIL_RE=/^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
  function accList(){try{var a=JSON.parse(w.localStorage.getItem(AUK));return Array.isArray(a)?a.slice(0,50):[]}catch(e){return[]}}
  function accSave(a){try{w.localStorage.setItem(AUK,JSON.stringify(a));return true}catch(e){return false}}
  function session(){try{var s=JSON.parse(w.localStorage.getItem(SSK));if(!s)return null;return accList().filter(function(x){return x.id===s.id})[0]||null}catch(e){return null}}
  function rnd(n){var u=new Uint8Array(n);w.crypto.getRandomValues(u);return u}
  function b64(u){var s="";u.forEach(function(c){s+=String.fromCharCode(c)});return w.btoa(s)}
  function unb64(s){var b=w.atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
  function hashPw(pw,salt){
    return w.crypto.subtle.importKey("raw",new w.TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"]).then(function(k){
      return w.crypto.subtle.deriveBits({name:"PBKDF2",salt:salt,iterations:150000,hash:"SHA-256"},k,256);
    }).then(function(b){return b64(new Uint8Array(b))});
  }
  function who(u){return u.email||u.phone||u.name||"your account"}
  function signIn(via,match,extra){
    var list=accList(),u=list.filter(function(x){return x.via===via&&(x.email&&match.email?x.email===match.email:x.phone&&match.phone&&x.phone===match.phone)})[0];
    if(!u){u={id:b64(rnd(12)).replace(/[^A-Za-z0-9]/g,"x"),via:via,email:match.email||"",phone:match.phone||"",name:match.name||"",at:Date.now()};Object.keys(extra||{}).forEach(function(k){u[k]=extra[k]});list.push(u);if(!accSave(list)){msg("Could not save: browser storage is full.");return}}
    try{w.localStorage.setItem(SSK,JSON.stringify({id:u.id}))}catch(e){}
    AUI.step="enter";AUI.pending=null;AUI.fails=0;AUI.delSure=false;AUI.pwMode="in";
    var pn=d.getElementById("pName"),pe=d.getElementById("pEmail");
    if(!A.S.profile.custom){if(pn&&!pn.value&&u.name)pn.value=u.name;if(pe&&u.email&&!/example\.com$/.test(u.email))pe.value=u.email}
    renderAcct("account");msg("Signed in with "+VIA[via]+".");
  }
  /* ---------- real accounts on this server (auth_api.py). Used whenever the back end is running. ---------- */
  var SRV={up:false,user:null,mode:"test"};
  function apiPost(path,body){
    return w.fetch(path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}},function(){return {ok:false,j:{error:"The server sent an unexpected reply."}}})})
      .catch(function(){return {ok:false,j:{error:"Could not reach the server."}}});
  }
  var hb=d.createElement("button");hb.type="button";hb.id="hdrAcct";hb.className="hdrbtn";
  (d.querySelector(".bar")||d.body).appendChild(hb);
  function signedWho(){if(SRV.user)return SRV.user.email;var u=session();return u?who(u):""}
  acctSec.addEventListener("keydown",function(e){
    if(e.key==="Enter"&&e.target&&/^s(Email|Pw|Pw2)$/.test(e.target.id)){e.preventDefault();var sb=acctSec.querySelector("[data-auth=ssubmit]");if(sb)sb.click()}
  });
  function paintHeader(){
    if(!hb)return;
    var e=signedWho();
    hb.innerHTML=e?'<span class="av" aria-hidden="true">'+E(e.charAt(0).toUpperCase())+'</span><span class="em">'+E(e)+'</span>':'Sign in';
    hb.setAttribute("aria-label",e?"Account: "+e:"Sign in or create an account");
  }
  hb.onclick=function(){sub.prof="account";cur="prof";go("prof")};
  function afterServerSignIn(){
    var pe=d.getElementById("pEmail");
    if(!A.S.profile.custom&&pe&&SRV.user)pe.value=SRV.user.email;
    paintHeader();
  }
  w.fetch("/api/auth/me",{credentials:"same-origin"}).then(function(r){if(!r.ok)throw new Error("no auth");return r.json()}).then(function(j){
    SRV.up=true;SRV.user=j.user||null;paintHeader();
    if(!acctSec.hidden&&sub.prof==="account")renderAcct("account");
    googleReturn();
  }).catch(function(){SRV.up=false;paintHeader()});
  w.fetch("/api/apply/config").then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.mode)SRV.mode=j.mode}).catch(function(){});
  w.fetch("/api/auth/providers").then(function(r){return r.ok?r.json():null}).then(function(j){
    SRV.google=!!(j&&j.google);SRV.canEmail=!!(j&&j.canEmail);
    if(SRV.google&&!acctSec.hidden&&sub.prof==="account")renderAcct("account");
  }).catch(function(){});
  var GERR={agree:"Tick the box to confirm you are 18 or older and agree to the Terms and Privacy Policy, then try Google again.",cancelled:"Google sign-in was cancelled.",expired:"That Google sign-in expired or could not be checked. Try again.",failed:"Google sign-in did not work. Try again, or use your email and password.",unverified:"Google says that email address is not verified, so UAply cannot use it.",off:"Google sign-in is not switched on."};
  function googleReturn(){
    var tp=null,q=null;
    try{tp=w.top;q=new w.URLSearchParams(tp.location.search)}catch(e){return}
    var er=q.get("auth_error"),ok=q.get("signed_in"),rt=q.get("reset");
    if(rt&&/^[A-Za-z0-9_-]{20,100}$/.test(rt)){
      AUI.reset=rt;
      try{tp.history.replaceState(null,"",tp.location.pathname)}catch(e){}
      sub.prof="account";cur="prof";go("prof");renderAcct("account");
      msg("Choose a new password to finish the reset.");
      return;
    }
    if(!er&&!ok)return;
    try{tp.history.replaceState(null,"",tp.location.pathname)}catch(e){}
    sub.prof="account";cur="prof";go("prof");renderAcct("account");
    msg(er?(GERR[er]||GERR.failed):"Signed in with Google.");
  }
  w.__uaplyAuth=function(){return {up:SRV.up,user:SRV.user}};
  /* Apple (App Store guideline 4.8) requires Sign in with Apple wherever an iPhone app offers Google, so inside the iPhone app Google stays hidden until Apple sign-in exists */
  function iosShell(){try{var c=w.top.Capacitor;return !!(c&&c.getPlatform&&c.getPlatform()==="ios"&&!SRV.apple)}catch(e){return false}}
  function forgotHTML(){
    var box='<div class="plan" style="display:flex;flex-direction:column;gap:10px">';
    if(AUI.forgotSent)return box+'<b>Check your email</b><p class="note" style="margin:0">If that email has an account, a reset link is on its way. It works for one hour.</p>'+
      (SRV.canEmail?'':'<p class="note" style="margin:0">Test mode: no real email is sent. The link is in the <a href="/outbox" target="_blank" rel="noopener noreferrer">test inbox</a>.</p>')+
      '<div class="acts"><button type="button" class="btn ghost" data-auth="sforgotback">Back to log in</button></div></div>';
    return box+'<b>Reset your password</b><div class="field"><label for="sFEmail">Email</label><input type="text" id="sFEmail" inputmode="email" autocomplete="email" maxlength="200" placeholder="you@gmail.com"><small>We email you a link that works for one hour.</small></div>'+
      '<div class="acts"><button type="button" class="btn" data-auth="sforgotgo">Email me a reset link</button><button type="button" class="btn ghost" data-auth="sforgotback">Back to log in</button></div></div>';
  }
  function resetHTML(){
    return '<div class="plan" style="display:flex;flex-direction:column;gap:10px"><b>Choose a new password</b>'+
      '<div class="field"><label for="sRPw">New password</label><input type="password" id="sRPw" autocomplete="new-password" maxlength="128"><small>At least 8 characters.</small></div>'+
      '<div class="field"><label for="sRPw2">Confirm new password</label><input type="password" id="sRPw2" autocomplete="new-password" maxlength="128"></div>'+
      '<div class="acts"><button type="button" class="btn" data-auth="sresetgo">Save new password</button><button type="button" class="btn ghost" data-auth="sresetno">Cancel</button></div></div>';
  }
  function changeHTML(){
    if(!SRV.user||SRV.user.hasPassword===false)return '<p class="note" style="margin:0">You sign in with Google. To also sign in with a password, log out and use Forgot password with this email.</p>';
    if(!AUI.chgOpen)return '<div class="acts"><button type="button" class="btn ghost" data-auth="schg">Change password</button></div>';
    return '<div class="field"><label for="sCur">Current password</label><input type="password" id="sCur" autocomplete="current-password" maxlength="128"></div>'+
      '<div class="field"><label for="sNew">New password</label><input type="password" id="sNew" autocomplete="new-password" maxlength="128"><small>At least 8 characters. Your other devices are signed out.</small></div>'+
      '<div class="field"><label for="sNew2">Confirm new password</label><input type="password" id="sNew2" autocomplete="new-password" maxlength="128"></div>'+
      '<div class="acts"><button type="button" class="btn" data-auth="schgo">Save new password</button><button type="button" class="btn ghost" data-auth="schgno">Cancel</button></div>';
  }
  /* Deleting an account is deliberately three quiet steps away from the main Account screen:
     1) "More account options" (folded shut) > 2) a short, skippable exit survey > 3) password (or typing DELETE) to confirm. */
  var SV_REASONS=[["found_job","I found a job"],["not_looking","I'm not looking right now"],["no_fit","Not enough jobs that fit me"],["hard_to_use","Hard to use or confusing"],["too_expensive","Too expensive"],["privacy","Privacy concerns"],["technical","Technical problems"],["other","Something else"]];
  var SV_OUTCOMES=[["hired_uaply","I got a job through UAply"],["hired_other","I got a job somewhere else"],["still_looking","I'm still looking"],["break","I'm taking a break"]];
  function surveyHTML(){
    var nps="";for(var i=0;i<=10;i++)nps+='<label class="npsb"><input type="radio" name="svNps" value="'+i+'" aria-label="'+i+' out of 10"><span>'+i+'</span></label>';
    return '<div class="svform" role="group" aria-labelledby="svT"><b id="svT">Before you go, help us get better</b>'+
      '<p class="note" style="margin:0">Five quick questions, about a minute. Your answers are anonymous: we do not link them to your account, and deleting your account does not need them. Skip any or all.</p>'+
      '<div class="field"><span class="l" id="svQ1">What is the main reason you are leaving?</span><div class="checks svcol" role="radiogroup" aria-labelledby="svQ1">'+SV_REASONS.map(function(r){return '<label><input type="radio" name="svReason" value="'+r[0]+'"> '+E(r[1])+'</label>'}).join("")+'</div></div>'+
      '<div class="field"><label for="svOutcome">How did your job search go?</label><select id="svOutcome"><option value="">Choose</option>'+SV_OUTCOMES.map(function(r){return '<option value="'+r[0]+'">'+E(r[1])+'</option>'}).join("")+'</select></div>'+
      '<div class="field"><span class="l" id="svQ3">How likely are you to recommend UAply to a friend?</span><div class="nps" role="radiogroup" aria-labelledby="svQ3">'+nps+'</div><div class="npsend"><small>0 = not at all likely</small><small>10 = extremely likely</small></div></div>'+
      '<div class="field"><label for="svBetter">What is one thing we should have done better, or added?</label><textarea id="svBetter" maxlength="1000" rows="3"></textarea></div>'+
      '<div class="field"><label for="svReturn">What, if anything, would bring you back?</label><textarea id="svReturn" maxlength="600" rows="2"></textarea></div>'+
      '<div class="acts"><button type="button" class="btn" data-auth="sdelsend">Send and continue</button><button type="button" class="btn ghost" data-auth="sdelskip">Skip survey</button></div>'+
      '<div class="acts"><button type="button" class="linkbtn" data-auth="sdelno">Keep my account</button></div></div>';
  }
  function deleteHTML(){
    if(AUI.survey)return surveyHTML();
    if(AUI.delOpen){
      var nopw=SRV.user&&SRV.user.hasPassword===false;
      return '<div class="svform"><b>Delete your account</b>'+
        '<div class="field"><label for="sDelPw">'+(nopw?'Type DELETE to confirm':'Enter your password to confirm')+'</label><input type="'+(nopw?'text':'password')+'" id="sDelPw" autocomplete="'+(nopw?'off':'current-password')+'" maxlength="128"></div>'+
        '<p class="note" style="margin:0">This removes your account, your receipts and your application records from UAply\'s server. It cannot be undone. Your profile on this device stays until you delete it in Data and privacy.</p>'+
        '<div class="checks"><label><input type="checkbox" id="sDelAck"> I understand this cannot be undone</label></div>'+
        '<div class="acts"><button type="button" class="btn danger" data-auth="sdelgo">Delete my account</button><button type="button" class="btn ghost" data-auth="sdelno">Keep my account</button></div></div>';
    }
    return '<details class="mgr"><summary>More account options</summary><p class="note" style="margin:6px 0">Closing your account is permanent.</p>'+
      '<button type="button" class="linkbtn dangerlink" data-auth="sdel">Delete my account…</button></details>';
  }
  function serverHTML(){
    if(!SRV.user&&AUI.reset)return resetHTML();
    if(!SRV.user&&AUI.forgot&&AUI.sMode==="in")return forgotHTML();
    if(SRV.user)return '<div class="plan" style="display:flex;flex-direction:column;gap:8px"><span class="tag" style="background:var(--accent);color:var(--accent-ink)">ACCOUNT</span><b>You are signed in</b><small>'+E(SRV.user.email)+' · saved on UAply\'s server</small>'+
      '<p class="note" style="margin:0">Every time you swipe right, a receipt goes to this email'+(SRV.mode==="live"?'':' (test mode: it lands in the <a href="/outbox" target="_blank" rel="noopener noreferrer">test inbox</a> instead)')+'.</p>'+
      (AUI.survey||AUI.delOpen?'':'<div class="acts"><button type="button" class="btn ghost" data-auth="sout">Sign out</button></div>'+changeHTML())+
      deleteHTML()+
      '</div>';
    var up=AUI.sMode!=="in";
    return '<div class="plan" style="display:flex;flex-direction:column;gap:10px"><b>'+(up?"Create your UAply account":"Log in to UAply")+'</b>'+
      '<div class="field"><label for="sEmail">Email</label><input type="text" id="sEmail" inputmode="email" autocomplete="email" maxlength="200" placeholder="you@gmail.com"></div>'+
      '<div class="field"><label for="sPw">Password</label><input type="password" id="sPw" autocomplete="'+(up?"new-password":"current-password")+'" maxlength="128">'+(up?'<small>At least 8 characters.</small>':'')+'</div>'+
      (up?'<div class="field"><label for="sPw2">Confirm password</label><input type="password" id="sPw2" autocomplete="new-password" maxlength="128"></div>'+
        '<div class="checks"><label><input type="checkbox" id="sAgree"> I am 18 or older and agree to the <a href="'+LB+'terms.html" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="'+LB+'privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a></label></div>':'')+
      '<div class="acts"><button type="button" class="btn" data-auth="ssubmit">'+(up?"Create account":"Log in")+'</button><button type="button" class="btn ghost" data-auth="smode">'+(up?"I already have an account":"Create an account")+'</button>'+(up?'':'<button type="button" class="btn ghost" data-auth="sforgot">Forgot password?</button>')+'</div>'+
      '<small>Your account is stored on UAply\'s server. Passwords are scrambled (hashed) and never stored as typed. Once you are signed in, each swipe right emails you a receipt.</small>'+
      (SRV.google&&!iosShell()?'<p class="note" style="text-align:center;margin:0">or</p><div class="checks"><label><input type="checkbox" id="gAgree"> I am 18 or older and agree to the <a href="'+LB+'terms.html" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="'+LB+'privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a> (needed the first time)</label></div><div class="acts"><button type="button" class="btn" data-auth="gsign" style="width:100%">Continue with Google</button></div><small>You sign in on Google\'s own page. UAply never sees your Google password, only your verified email.</small>':'')+'</div>';
  }
  function accountHTML(){
    var u=session(),h="";
    if(REL)return SRV.up?serverHTML():'<div class="plan" style="display:flex;flex-direction:column;gap:10px"><b>Cannot reach UAply</b><p class="note" style="margin:0">Check your internet connection, then try again.</p><div class="acts"><button type="button" class="btn" data-auth="reload">Try again</button></div></div>';
    /* with the real back end running, only real sign-in is shown: no simulated Google, Apple, phone or email-link previews */
    if(SRV.up)return serverHTML();
    if(u){
      return '<div class="plan" style="display:flex;flex-direction:column;gap:8px"><span class="tag">SANDBOX · TEST MODE</span><b>You are signed in</b><small>'+E(who(u))+' · with '+VIA[u.via]+'</small>'+
        '<div class="acts"><button type="button" class="btn ghost" data-auth="out">Sign out</button><button type="button" class="btn ghost" data-auth="del">'+(AUI.delSure?"Click again to delete this account":"Delete account")+'</button></div></div>'+
        '<p class="note">Test accounts exist only in this browser. Deleting one does not remove your profile or applications; use Data and privacy for that.</p>';
    }
    h+='<span class="tag">SANDBOX · TEST MODE</span><p class="note" style="margin:0">No real accounts exist yet. Google, Apple, email and text messages are simulated here so you can see how sign-in will work.</p>'+
      '<div class="acts" style="flex-direction:column"><button type="button" class="btn" data-auth="google" style="width:100%">Continue with Google</button><button type="button" class="btn" data-auth="apple" style="width:100%">Continue with Apple</button></div>'+
      '<p class="note" style="text-align:center;margin:0">or</p>'+
      '<div class="acts" role="group" aria-label="Other ways to sign in">'+[["link","Email link"],["phone","Phone"],["pw","Password"]].filter(function(t){return !(SRV.up&&t[0]==="pw")}).map(function(t){return '<button type="button" class="btn ghost" data-auth-tab="'+t[0]+'" aria-pressed="'+(AUI.tab===t[0])+'">'+t[1]+'</button>'}).join("")+'</div>';
    if(AUI.tab==="link"){
      h+=AUI.step==="sent"
        ?'<p class="note" style="margin:0">Test mode: no email was sent to <b>'+E(AUI.pending.email)+'</b>. In the live app you would open the link from your inbox.</p><div class="acts"><button type="button" class="btn" data-auth="openlink">Open the sign-in link (test)</button><button type="button" class="btn ghost" data-auth="back">Use a different email</button></div>'
        :'<div class="field"><label for="aEmail">Email</label><input type="text" id="aEmail" inputmode="email" autocomplete="email" maxlength="200" placeholder="you@example.com"><small>We email you a link. No password needed.</small></div><div class="acts"><button type="button" class="btn" data-auth="sendlink">Email me a sign-in link</button></div>';
    }else if(AUI.tab==="phone"){
      h+=AUI.step==="sent"
        ?'<p class="note" style="margin:0">Test mode: no text was sent. Your code for <b>'+E(AUI.pending.phone)+'</b> is <b>'+E(AUI.pending.code)+'</b>.</p><div class="field"><label for="aCode">6-digit code</label><input type="text" id="aCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><div class="acts"><button type="button" class="btn" data-auth="verify">Verify and sign in</button><button type="button" class="btn ghost" data-auth="back">Change number</button></div>'
        :'<div class="field"><label for="aPhoneIn">Mobile number</label><input type="tel" id="aPhoneIn" autocomplete="tel" maxlength="20" placeholder="+1 555 123 4567"><small>We text you a 6-digit code. Message and data rates may apply.</small></div><div class="acts"><button type="button" class="btn" data-auth="sendcode">Text me a code</button></div>';
    }else{
      var cr=AUI.pwMode==="up";
      h+='<div class="field"><label for="aPwEmail">Email</label><input type="text" id="aPwEmail" inputmode="email" autocomplete="email" maxlength="200"></div>'+
        '<div class="field"><label for="aPw">Password</label><input type="password" id="aPw" autocomplete="'+(cr?"new-password":"current-password")+'" maxlength="100"><small>'+(cr?"At least 8 characters.":"Forgot it? Use the email link instead.")+'</small></div>'+
        (cr?'<div class="field"><label for="aPw2">Confirm password</label><input type="password" id="aPw2" autocomplete="new-password" maxlength="100"></div>':'')+
        '<div class="acts"><button type="button" class="btn" data-auth="pw">'+(cr?"Create account":"Sign in")+'</button><button type="button" class="btn ghost" data-auth="pwmode">'+(cr?"I already have an account":"Create an account")+'</button></div>';
    }
    return h;
  }
  acctSec.addEventListener("click",function(e){
    var tb=e.target.closest("[data-auth-tab]"),b=e.target.closest("[data-auth]");
    if(tb){AUI.tab=tb.getAttribute("data-auth-tab");AUI.step="enter";AUI.pending=null;renderAcct("account");return}
    if(!b)return;
    var a=b.getAttribute("data-auth"),val=function(id){var el=d.getElementById(id);return el?el.value.trim():""};
    if(a==="smode"){AUI.sMode=AUI.sMode==="in"?"up":"in";renderAcct("account");return}
    if(a==="ssubmit"){
      var sem=val("sEmail").toLowerCase(),spw=(d.getElementById("sPw")||{}).value||"",sup=AUI.sMode!=="in";
      if(!EMAIL_RE.test(sem)){msg("Enter a valid email address.");return}
      if(sup){
        if(spw.length<8){msg("Use at least 8 characters.");return}
        if(spw!==((d.getElementById("sPw2")||{}).value||"")){msg("The passwords do not match.");return}
        if(!(d.getElementById("sAgree")||{}).checked){msg("Confirm you are 18 or older and agree to the Terms and Privacy Policy.");return}
      }else if(!spw){msg("Enter your password.");return}
      b.disabled=true;msg(sup?"Creating your account…":"Logging in…");
      apiPost(sup?"/api/auth/signup":"/api/auth/login",sup?{email:sem,password:spw,agree:true}:{email:sem,password:spw}).then(function(r){
        b.disabled=false;
        if(!r.ok||!r.j.user){msg((r.j&&r.j.error)||"Something went wrong. Try again.");return}
        SRV.user=r.j.user;afterServerSignIn();renderAcct("account");
        msg(sup?"Account created. You are signed in.":"You are logged in.");
      });
      return;
    }
    if(a==="sout"){apiPost("/api/auth/logout",{}).then(function(){SRV.user=null;AUI.delOpen=false;AUI.survey=false;paintHeader();renderAcct("account");msg("Signed out.")});return}
    if(a==="sdel"){AUI.survey=true;AUI.delOpen=false;renderAcct("account");var f1=d.querySelector("#acctSec .svform input");if(f1)f1.focus();return}
    if(a==="sdelno"){AUI.delOpen=false;AUI.survey=false;renderAcct("account");return}
    if(a==="sdelskip"){AUI.survey=false;AUI.delOpen=true;renderAcct("account");var dp=d.getElementById("sDelPw");if(dp)dp.focus();return}
    if(a==="sdelsend"){
      var chk=function(n){var x=d.querySelector('#acctSec input[name="'+n+'"]:checked');return x?x.value:""};
      var sv={reason:chk("svReason"),outcome:val("svOutcome"),better:(d.getElementById("svBetter")||{}).value||"",return:(d.getElementById("svReturn")||{}).value||""};
      var nv=chk("svNps");if(nv!=="")sv.nps=+nv;
      var any=sv.reason||sv.outcome||sv.better.trim()||sv.return.trim()||nv!=="";
      b.disabled=true;
      var go=function(){AUI.survey=false;AUI.delOpen=true;renderAcct("account");var dp2=d.getElementById("sDelPw");if(dp2)dp2.focus();msg(any?"Thank you, that really helps us.":"")};
      if(!any){go();return}
      msg("Sending…");
      /* the survey is sent without waiting on the result: a problem here must never get in the way of deleting an account */
      apiPost("/api/feedback",{topic:"exit",survey:sv,source:"delete",page:"Account"}).then(go,go);
      return;
    }
    if(a==="sdelgo"){
      var dpw=(d.getElementById("sDelPw")||{}).value||"";
      var nopw=SRV.user&&SRV.user.hasPassword===false;
      if(!dpw){msg(nopw?"Type DELETE to confirm.":"Enter your password.");return}
      if(!(d.getElementById("sDelAck")||{}).checked){msg("Tick the box to confirm you understand this cannot be undone.");return}
      b.disabled=true;msg("Deleting your account…");
      apiPost("/api/auth/delete",nopw?{confirm:dpw}:{password:dpw}).then(function(r){
        b.disabled=false;
        if(!r.ok){msg((r.j&&r.j.error)||"Could not delete the account. Try again.");return}
        SRV.user=null;AUI.delOpen=false;AUI.survey=false;paintHeader();renderAcct("account");
        msg("Your account was deleted"+(r.j.applicationsRemoved?", along with "+r.j.applicationsRemoved+" application record"+(r.j.applicationsRemoved===1?"":"s")+" on the server":"")+".");
      });
      return;
    }
    if(a==="sforgot"){AUI.forgot=true;AUI.forgotSent=false;renderAcct("account");return}
    if(a==="sforgotback"){AUI.forgot=false;AUI.forgotSent=false;renderAcct("account");return}
    if(a==="sforgotgo"){
      var fem=val("sFEmail").toLowerCase();
      if(!EMAIL_RE.test(fem)){msg("Enter a valid email address.");return}
      b.disabled=true;msg("Sending…");
      apiPost("/api/auth/forgot",{email:fem}).then(function(r){
        b.disabled=false;
        if(!r.ok){msg((r.j&&r.j.error)||"Something went wrong. Try again.");return}
        AUI.forgotSent=true;renderAcct("account");
      });
      return;
    }
    if(a==="sresetno"){AUI.reset="";renderAcct("account");return}
    if(a==="sresetgo"){
      var rp=(d.getElementById("sRPw")||{}).value||"";
      if(rp.length<8){msg("Use at least 8 characters.");return}
      if(rp!==((d.getElementById("sRPw2")||{}).value||"")){msg("The passwords do not match.");return}
      b.disabled=true;msg("Saving…");
      apiPost("/api/auth/reset",{token:AUI.reset,password:rp}).then(function(r){
        b.disabled=false;
        if(!r.ok){msg((r.j&&r.j.error)||"Could not reset the password. Ask for a new link.");return}
        AUI.reset="";AUI.forgot=false;AUI.sMode="in";SRV.user=null;paintHeader();renderAcct("account");
        msg("Password changed. Log in with your new password.");
      });
      return;
    }
    if(a==="schg"){AUI.chgOpen=true;renderAcct("account");return}
    if(a==="schgno"){AUI.chgOpen=false;renderAcct("account");return}
    if(a==="schgo"){
      var cp=(d.getElementById("sCur")||{}).value||"",np=(d.getElementById("sNew")||{}).value||"";
      if(!cp){msg("Enter your current password.");return}
      if(np.length<8){msg("Use at least 8 characters.");return}
      if(np!==((d.getElementById("sNew2")||{}).value||"")){msg("The new passwords do not match.");return}
      b.disabled=true;msg("Saving…");
      apiPost("/api/auth/change-password",{current:cp,password:np}).then(function(r){
        b.disabled=false;
        if(!r.ok){msg((r.j&&r.j.error)||"Could not change the password.");return}
        AUI.chgOpen=false;renderAcct("account");msg("Password changed.");
      });
      return;
    }
    if(a==="reload"){try{w.top.location.reload()}catch(e){w.location.reload()}return}
    if(a==="gsign"){
      var ga=(d.getElementById("gAgree")||{}).checked;
      b.disabled=true;msg("Opening Google…");
      var gu="/api/auth/google/start"+(ga?"?agree=1":"");
      try{w.top.location.assign(gu)}catch(e){w.location.assign(gu)}
      return;
    }
    if(a==="google"||a==="apple"){signIn(a,{email:"test."+a+"@example.test",name:"Test user"});return}
    if(a==="sendlink"){var em=val("aEmail").toLowerCase();if(!EMAIL_RE.test(em)){msg("Enter a valid email address.");return}AUI.pending={email:em};AUI.step="sent";renderAcct("account");return}
    if(a==="openlink"){if(AUI.pending)signIn("link",{email:AUI.pending.email});return}
    if(a==="back"){AUI.step="enter";AUI.pending=null;renderAcct("account");return}
    if(a==="sendcode"){
      var ph=val("aPhoneIn"),digits=ph.replace(/\D/g,"");
      if(!/^\+?[0-9 ()\-.]{7,20}$/.test(ph)||digits.length<10||digits.length>15){msg("Enter a valid mobile number, including area code.");return}
      var n=rnd(4),code=String(((n[0]<<16|n[1]<<8|n[2])>>>0)%1000000);while(code.length<6)code="0"+code;
      AUI.pending={phone:ph,code:code,exp:Date.now()+300000,tries:0};AUI.step="sent";renderAcct("account");return;
    }
    if(a==="verify"){
      var p=AUI.pending;if(!p)return;
      if(Date.now()>p.exp||p.tries>=5){AUI.step="enter";AUI.pending=null;renderAcct("account");msg("That code expired. Request a new one.");return}
      if(val("aCode")!==p.code){p.tries++;msg("That code is not right. "+(5-p.tries)+" tries left.");return}
      signIn("phone",{phone:p.phone.replace(/[^\d+]/g,"")});return;
    }
    if(a==="pwmode"){AUI.pwMode=AUI.pwMode==="up"?"in":"up";renderAcct("account");return}
    if(a==="pw"){
      var email=val("aPwEmail").toLowerCase(),pw=d.getElementById("aPw").value,up=AUI.pwMode==="up";
      if(!EMAIL_RE.test(email)){msg("Enter a valid email address.");return}
      if(!w.crypto||!w.crypto.subtle){msg("Password sign-in needs a secure (https) page.");return}
      if(Date.now()<AUI.lock){msg("Too many tries. Wait "+Math.ceil((AUI.lock-Date.now())/1000)+" seconds.");return}
      if(up){
        if(pw.length<8){msg("Use at least 8 characters.");return}
        if(pw!==d.getElementById("aPw2").value){msg("The passwords do not match.");return}
        if(accList().some(function(x){return x.via==="password"&&x.email===email})){msg("That email already has an account. Sign in instead.");return}
        var salt=rnd(16);
        hashPw(pw,salt).then(function(hh){signIn("password",{email:email},{salt:b64(salt),hash:hh})});
      }else{
        var u=accList().filter(function(x){return x.via==="password"&&x.email===email})[0];
        var salt2=u?unb64(u.salt):rnd(16);
        hashPw(pw,salt2).then(function(hh){
          if(u&&u.hash===hh){signIn("password",{email:email})}
          else{AUI.fails++;if(AUI.fails>=5){AUI.lock=Date.now()+30000;AUI.fails=0}msg("Wrong email or password.")}
        });
      }
      return;
    }
    if(a==="out"){try{w.localStorage.removeItem(SSK)}catch(x){}AUI.delSure=false;renderAcct("account");msg("Signed out.");return}
    if(a==="del"){
      if(!AUI.delSure){AUI.delSure=true;renderAcct("account");return}
      var cu=session();if(cu)accSave(accList().filter(function(x){return x.id!==cu.id}));
      try{w.localStorage.removeItem(SSK)}catch(x2){}AUI.delSure=false;renderAcct("account");msg("Account deleted.");
    }
  });

  /* ---------- guided setup (Profile setup) ----------
     One group of questions per screen, saved as you go, with the same progress on every screen size. On desktop (960px and
     wider) a live "what employers see" card sits beside the questions. The fields themselves are the ordinary form fields
     built above and by the Application profile experiment; each is assigned to a step by the ids listed in `anchors`. */
  var STEPS=[
    {k:"about",t:"About you",s:"About you",q:"Who should employers contact?",use:"These details go on every application you send, so an employer can reply to you.",anchors:["pName","pEmail","pPhone","px-phone","px-headline"]},
    {k:"jobs",t:"Jobs you want",s:"Jobs",q:"What kind of work are you looking for?",use:"This is the core of your matches. Titles, skills, experience and education change every score and decide which jobs show. The opportunity types you pick open first in Services.",anchors:["pTitle","px-types-fulltime","pSkills","pYears","pEdu"]},
    {k:"where",t:"Where and pay",s:"Where and pay",q:"Where, how, and for how much?",use:"City, work style, distance, willingness to relocate and minimum pay all change your match score and which jobs show. Your state and ZIP code only help find your location for distance. Your street stays on this device.",anchors:["aAddr","pm-remote","aMilesF","pSalary","px-start","aNoticeF"]},
    {k:"back",t:"Background and links",s:"Background",q:"Show employers who you are.",use:"Sent with your applications. Your headline, summary and major also count as skills when a job asks for them. GPA is optional and never changes a match.",anchors:["px-school","px-major","px-grad","px-gpa","px-employer","px-summary","px-resume","px-linkedin","px-portfolio","aResF","aSummaryF","aLinkedF","aSiteF","aCoverF"]},
    {k:"final",t:"Eligibility and extras",s:"Eligibility",q:"Last details.",use:"Work authorization is added to applications only. It never changes a match or hides a job. The optional section at the bottom is yours to skip.",anchors:["px-auth","px-sponsor","aElig","aAutoF","aEeo"]}
  ];
  var wz={i:0,want:null,opened:false,dirty:false,pending:null};
  var wzGrid=form.querySelector(".grid");
  function stepIndex(k){for(var i=0;i<STEPS.length;i++)if(STEPS[i].k===k)return i;return -1}
  function topOf(el){while(el&&el.parentElement!==wzGrid)el=el.parentElement;return el}
  function stepOf(el){
    if(el.classList.contains("px-h")||el.querySelector(".ready"))return -1;   /* the Application profile's own headings and score are replaced by the steps */
    for(var i=0;i<STEPS.length;i++)for(var j=0;j<STEPS[i].anchors.length;j++){var a=d.getElementById(STEPS[i].anchors[j]);if(a&&(a===el||el.contains(a)))return i}
    return STEPS.length-1;   /* anything another experiment adds lands on the last screen so it is never lost */
  }
  var wzTop=d.createElement("div");wzTop.id="wzTop";
  wzTop.innerHTML='<div class="wzRow"><span id="wzCount"></span><span id="wzPct"></span></div>'+
    '<div class="wzBar" role="progressbar" aria-label="Profile completeness" aria-valuemin="0" aria-valuemax="100"><i id="wzFill"></i></div>'+
    '<nav aria-label="Profile steps"><ol class="wzDots">'+STEPS.map(function(s,i){return '<li><button type="button" data-step="'+i+'"><span class="n">'+(i+1)+'</span><span class="t">'+s.s+'</span></button></li>'}).join("")+'</ol></nav>';
  form.insertBefore(wzTop,secTitle);
  var wzUse=d.createElement("p");wzUse.className="wzUse";wzUse.id="wzUse";form.insertBefore(wzUse,wzGrid);
  var wzFoot=d.createElement("div");wzFoot.id="wzFoot";
  wzFoot.innerHTML='<button type="button" class="btn ghost" id="wzBack">Back</button><span class="grow"></span><button type="button" class="btn" id="wzNext">Save and continue</button>';
  wzGrid.after(wzFoot);
  var wzMsgEl=d.createElement("p");wzMsgEl.id="wzMsg";wzMsgEl.className="note";wzMsgEl.setAttribute("role","status");wzFoot.after(wzMsgEl);
  var wzPrev=d.createElement("aside");wzPrev.id="wzPrev";wzPrev.setAttribute("aria-label","What employers see");form.appendChild(wzPrev);
  function wzMsg(t){wzMsgEl.textContent=t;if(t&&wzMsgEl.scrollIntoView)wzMsgEl.scrollIntoView({block:"nearest",behavior:"smooth"})}
  function fv(id){var e=d.getElementById(id);return e?String(e.value||"").trim():""}
  function selText(id){var e=d.getElementById(id);return e&&e.value&&e.selectedIndex>-1?e.options[e.selectedIndex].text:""}
  /* the card mirrors what the server puts in an application (uaply_api.py, _detail_text): nothing more, nothing less */
  function wzPrevPaint(){
    var px=PX(),name=fv("pName"),title=fv("pTitle"),head=(px&&fv("px-headline"))||title,loc=fv("pLoc"),yrs=fv("pYears");
    var skills=fv("pSkills").split(",").map(function(s){return s.trim()}).filter(Boolean);
    var ini=(name||"?").split(/\s+/).slice(0,2).map(function(x){return x.charAt(0).toUpperCase()}).join("");
    var types=px?[["fulltime","Full-time"],["parttime","Part-time"],["internship","Internship"],["coop","Co-op"]].filter(function(t){var e=d.getElementById("px-types-"+t[0]);return e&&e.checked}).map(function(t){return t[1]}).join(", "):"";
    var edu=px?[fv("px-school"),fv("px-major"),fv("px-grad"),fv("px-gpa")?"GPA "+fv("px-gpa"):""].filter(Boolean).join(", "):"";
    var auth=px?[selText("px-auth"),selText("px-sponsor")?"sponsorship: "+selText("px-sponsor").toLowerCase():""].filter(Boolean).join("; "):"";
    var rows=[["Email",fv("pEmail")],["Location",loc],["Experience",yrs?yrs+(+yrs===1?" year":" years"):""]];
    function site(u){try{var x=new w.URL(u);return x.hostname.replace(/^www\./,"")+(x.pathname.length>1?"/…":"")}catch(e){return u}}
    if(px)rows.push(["Phone",fv("px-phone")],["Resume link",fv("px-resume")&&site(fv("px-resume"))],["LinkedIn",fv("px-linkedin")&&site(fv("px-linkedin"))],["Portfolio",fv("px-portfolio")&&site(fv("px-portfolio"))],["Education",edu],["Most recent employer",fv("px-employer")],["Work authorization",auth],["Earliest start",selText("px-start")],["Looking for",types]);
    wzPrev.innerHTML='<div class="pvh">What employers see</div><div class="pv"><div class="pvTop"><span class="pvAv" aria-hidden="true">'+E(ini)+'</span><div><b>'+E(name||"Your name")+'</b><span>'+E(head||"Your title or headline")+'</span></div></div>'+
      (skills.length?'<div class="chips">'+skills.slice(0,8).map(function(s){return '<span class="chip">'+E(s)+'</span>'}).join("")+(skills.length>8?'<span class="chip">+'+(skills.length-8)+' more</span>':"")+'</div>':'<div class="pvMeta">No skills added yet</div>')+
      '<ul>'+rows.map(function(r){return '<li class="'+(r[1]?"":"no")+'"><span>'+r[0]+'</span><span>'+(r[1]?E(r[1]):"Not added yet")+'</span></li>'}).join("")+'</ul></div>'+
      '<p class="note">This is what an employer receives when you swipe right on a listing from an employer that accepts applications through UAply. Never sent: your street address, your resume file (it stays on this device, so add a link above), and your voluntary answers.</p>';
  }
  function wzPaint(){
    var S=STEPS[wz.i],cl=checklist(),done=cl.filter(function(c){return c[1]}).length,pct=Math.round(done/cl.length*100);
    [].slice.call(wzGrid.children).forEach(function(el){el.classList.toggle("wz-off",stepOf(el)!==wz.i)});
    secTitle.textContent=S.t;lead.textContent=S.q;wzUse.innerHTML="<b>How we use this:</b> "+S.use;
    d.getElementById("wzCount").textContent="Step "+(wz.i+1)+" of "+STEPS.length;
    d.getElementById("wzPct").textContent="Profile "+pct+"% complete";
    wzTop.querySelector(".wzBar").setAttribute("aria-valuenow",pct);d.getElementById("wzFill").style.width=pct+"%";
    [].slice.call(wzTop.querySelectorAll(".wzDots button")).forEach(function(b,i){
      var core=cl.filter(function(c){return c[2]===STEPS[i].k&&c[3]}),ok=core.length>0&&core.every(function(c){return c[1]});
      b.setAttribute("data-done",ok?"true":"false");
      if(i===wz.i)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current");
      b.setAttribute("aria-label","Step "+(i+1)+": "+STEPS[i].t+(ok?", done":""));
    });
    d.getElementById("wzBack").hidden=wz.i===0;
    d.getElementById("wzNext").textContent=wz.i===STEPS.length-1?"Finish and see matches":"Save and continue";
    wzPrevPaint();
  }
  function wzOpen(){
    if(wz.want!=null){var k=stepIndex(wz.want);if(k>-1)wz.i=k;wz.want=null;wz.opened=true}
    else if(!wz.opened){
      wz.opened=true;var cl=checklist();
      for(var i=0;i<STEPS.length;i++){if(cl.some(function(c){return c[2]===STEPS[i].k&&c[3]&&!c[1]})){wz.i=i;break}}   /* a returning visitor lands on the first step with something missing */
    }
    wzPaint();
    setTimeout(wzPrevPaint,0);   /* the page fills the fields right after this, so redraw the preview once they hold the saved values */
  }
  function wzSet(i,focus){
    wz.i=Math.max(0,Math.min(STEPS.length-1,i));wzPaint();wzMsg("");main.scrollTop=0;
    if(focus){secTitle.tabIndex=-1;secTitle.focus({preventScroll:true})}
  }
  function wzSave(dir){
    wz.pending=dir;
    if(form.requestSubmit)form.requestSubmit();else form.dispatchEvent(new w.Event("submit",{cancelable:true,bubbles:true}));
    setTimeout(function(){wz.pending=null},0);   /* cleared on the next tick: if a check blocked the save, nothing is left pending */
  }
  /* the page calls this after it saves the profile. true = stay here, false = go to the job cards as before. */
  w.__uaplyAfterSave=function(){
    if(form.hidden||!form.classList.contains("wz"))return false;
    var p=wz.pending;wz.pending=null;wz.dirty=false;
    if(w.__uaplyAutoSave)return true;
    if(p==="next"){wzSet(wz.i+1,true);wzMsg("Saved.")}
    else if(p==="finish"){
      var tc=typesChosen();if(tc.length&&tc.indexOf(sub.svc)<0)sub.svc=tc[0];
      setTimeout(function(){cur="svc";go("svc")},0);
    }else{wzPaint();wzMsg("Saved.")}
    return true;
  };
  /* take a person to a field (even on another step) and focus it */
  function goField(id){
    var el=d.getElementById(id);if(!el)return;
    var top=topOf(el),i=top?stepOf(top):-1;
    if(form.hidden||!form.classList.contains("wz")){wz.want=i>-1?STEPS[i].k:null;sub.prof="settings";cur="prof";go("prof")}
    else if(i>-1&&i!==wz.i){wz.i=i;wzPaint()}
    setTimeout(function(){var t=d.getElementById(id);if(t){if(t.scrollIntoView)t.scrollIntoView({block:"center"});if(t.focus)t.focus()}},30);
    wzMsg("Fix the highlighted field, then save again.");
  }
  w.__uaplyGoField=function(sec,id){goField(id)};
  w.__uaplyOpenProf=function(v){
    if(stepIndex(v)>-1){wz.want=v;v="settings"}   /* "preferences" and "resume" are mapped to their step by section() */
    closeMenus();sub.prof=v;cur="prof";go("prof");
  };
  wzTop.addEventListener("click",function(e){var b=e.target.closest("[data-step]");if(b)wzSet(+b.getAttribute("data-step"),true)});
  d.getElementById("wzBack").onclick=function(){wzSet(wz.i-1,true)};
  d.getElementById("wzNext").onclick=function(){wzSave(wz.i===STEPS.length-1?"finish":"next")};
  form.addEventListener("input",function(){wz.dirty=true;if(form.classList.contains("wz"))wzPrevPaint()});
  form.addEventListener("change",function(){wz.dirty=true;if(form.classList.contains("wz"))wzPrevPaint()});
  d.getElementById("editProfile")&&d.getElementById("editProfile").addEventListener("click",function(){sub.prof="settings";wz.want="about"},true);

  /* routing */
  function go(k){
    going=true;
    if(k==="svc"){A.setType(sub.svc);A.show("swipe");savePrefs()}
    else if(k==="dash"){A.show("apps");d.getElementById("pane-apps").hidden=true;renderTrack();tp.hidden=false}
    else{
      /* Settings, Preferences and Filters are one form. Moving between them must not reload the saved copy,
         or whatever was typed and not yet saved would be thrown away. */
      if(d.getElementById("pane-profile").hidden)A.show("profile");
      section(sub.prof);
    }
    going=false;refresh();main.scrollTop=0;
  }
  w.__uaplyOnShow=function(t){
    tp.hidden=true;
    /* leaving Profile setup with unsaved answers saves them quietly (if they are valid) instead of losing them */
    if(t!=="profile"&&wz.dirty&&!form.hidden&&form.classList.contains("wz")){w.__uaplyAutoSave=true;try{wzSave("quiet")}finally{w.__uaplyAutoSave=false;wz.dirty=false}}
    if(t==="profile")wz.dirty=false;
    if(going)return;
    cur=t==="profile"?"prof":"svc";
    if(t==="profile")section(sub.prof);
    refresh();
  };
  section(sub.prof);
  refresh();
  /* de-duplication: experiments apply one after another in the same turn, so by the next tick we know whether the
     owner's Application profile (uaply-profile.js) is on. If it is, hide this file's copies of the same questions. */
  setTimeout(function(){
    if(!PX())return;
    function dup(el){if(el)el.classList.add("px-dup")}
    dup(d.getElementById("pPhone")&&d.getElementById("pPhone").closest(".field"));
    dup(d.getElementById("resLinkWrap"));
    dup(d.getElementById("setMeter"));
    dup(d.getElementById("aElig"));
    ["aNoticeF","aSummaryF","aLinkedF","aSiteF"].forEach(function(id){dup(d.getElementById(id))});
    wzPaint();
  },0);
}

window.UAplyNav={patch:patch,apply:apply};
})();
