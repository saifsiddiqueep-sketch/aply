/* "Hiring mode" (sandbox only): the employer side of UAply, reached from a "Switch to hiring" pill in the header.
   An employer sets up the company once (name, logo, industry, size, United States or Canada, About), posts jobs on one page with a live
   preview, and works applicants through a simple pipeline. A posting asks for exactly what a job seeker's Profile setup, application
   details and Filters hold, so cards are scored and filtered on equal terms. Prices are TBD.
   With the UAply server (employers_api.py) postings go into the shared job feed; on a static copy they are kept in this browser and
   added to this browser's own deck, so the whole flow can be tried. Registers itself as an experiment: only pages that load this file
   (the sandbox) have it. */
(function(){
"use strict";
var Env=window.UAplyEnv;if(!Env)return;
function once(src,a,b){if(src.indexOf(a)<0)throw new Error("patch target not found: "+a.slice(0,40));return src.replace(a,function(){return b})}

var TYPES=[["job","Full-time"],["parttime","Part-time"],["internship","Internship"],["coop","Co-op"]];
var MODES=[["remote","Remote"],["hybrid","Hybrid"],["onsite","On-site"]];
var COUNTRIES=[["US","United States"],["CA","Canada"]];
var REGIONS={
  US:[["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],["PR","Puerto Rico"]],
  CA:[["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],["SK","Saskatchewan"],["YT","Yukon"]]
};
var LEVELS=["High school","Associate","Bachelor","Master","Doctorate"];
var PERKS=[["health","Health insurance"],["dental","Dental insurance"],["vision","Vision insurance"],["k401","401(k) or RRSP"],["match","Retirement plan with employer match"],["loan","Student loan repayment"],["stock","Stock options"],["pto","Paid time off (PTO)"],["maternity","Paid maternity leave"],["paternity","Paid paternity leave"],["tuition","Tuition assistance"]];
var START=[["","Not decided"],["now","Right away"],["2w","Within 2 weeks"],["1m","Within a month"],["grad","After graduation"],["flex","Flexible"]];
var INDUSTRIES=["Accounting","Advertising and marketing","Aerospace and defense","Agriculture","Architecture and planning","Arts and design","Biotech and pharmaceuticals","Consulting","Education","Energy and utilities","Engineering","Finance and banking","Government and public sector","Healthcare","Hospitality and food service","Insurance","Law and legal services","Manufacturing","Media and entertainment","Nonprofit and social services","Real estate and construction","Retail and consumer goods","Science and research","Software and technology","Sports and recreation","Telecommunications","Transportation and logistics","Other"];
var SIZES=["1-10","11-50","51-200","201-500","501-1,000","1,001-5,000","5,001-10,000","10,001+"];
var STAGES=[["new","New"],["review","Reviewing"],["interview","Interview"],["offer","Offer"],["hired","Hired"],["no","Not a fit"]];
var AUTH_LBL={citizen:"Citizen or permanent resident",authorized:"Authorized (visa, OPT or similar)",none:"Not currently authorized"};
function lbl(list,k){for(var i=0;i<list.length;i++)if(list[i][0]===k)return list[i][1];return ""}

/* ---------- the job seeker app learns about employer postings ---------- */
function patch(s){
  s=once(s,"function logoHTML(j){return ","function logoHTML(j){if(window.__uaplyLogo){var L=window.__uaplyLogo(j);if(L)return L}return ");
  s=once(s,"<p class=\"blurb\">'+esc(j.blurb)+'</p>","<p class=\"blurb\">'+esc(j.blurb)+'</p>'+(window.__uaplyEmpCard?window.__uaplyEmpCard(j):'')+'");
  /* add, update or drop employer postings in this page's job list (a closed one that someone already swiped stays, marked closed) */
  s=once(s,"var JOB_BY_ID={};JOBS.forEach(function(j){JOB_BY_ID[j.id]=j});",
    "var JOB_BY_ID={};JOBS.forEach(function(j){JOB_BY_ID[j.id]=j});\n"+
    "window.__uaplyEmpJobs={sync:function(list,mine){var ids={};list.forEach(function(j){ids[j.id]=1;var o=JOB_BY_ID[j.id];if(o){Object.keys(o).forEach(function(k){if(!(k in j)&&k!==\"seen\")delete o[k]});Object.assign(o,j)}else{JOBS.push(j);JOB_BY_ID[j.id]=j}});"+
    "for(var i=JOBS.length-1;i>=0;i--){var x=JOBS[i];if(mine(x)&&!ids[x.id]){if(S.decisions[x.id])x.closed=true;else{JOBS.splice(i,1);delete JOB_BY_ID[x.id]}}}renderAll()}};");
  return s;
}

var CSS=[
/* header pill, Fiverr-style */
".modesw{margin-left:auto;display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:6px 15px;border-radius:999px;border:1.5px solid color-mix(in srgb,var(--accent) 45%,var(--line));background:var(--surface);color:var(--ink);font:700 13.5px var(--body);cursor:pointer;white-space:nowrap}",
".modesw:hover{border-color:var(--accent)}.modesw:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.modesw svg{width:16px;height:16px;flex:none;stroke:var(--accent);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
".modesw+.hdrbtn{margin-left:8px}.modetag{font:700 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:7px;background:var(--ink);color:var(--surface)}",
"@media (max-width:520px){.modesw .lg{display:none}.modesw{padding:6px 11px}}",
"body.hire>*:not(.bar):not(#hub){display:none!important}#hub{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;max-width:1180px;width:100%;margin-inline:auto}",
/* job card additions */
".logo.emplogo{background:#fff;border:1px solid var(--line);overflow:hidden;padding:4px}.logo.emplogo img{width:100%;height:100%;object-fit:contain;display:block}",
".empx{display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:12px}.empx-h{margin:0;font:700 12px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}",
".empx .crit{gap:8px}.empx .crit li{grid-template-columns:22px 110px 1fr;font-size:14px}",
".team{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--accent) 8%,var(--surface));border:1px solid var(--line)}.team .tav{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink);font:800 14px var(--display)}.team b{display:block;font-size:14px}.team small{color:var(--muted);font-size:12.5px}",
".empmore summary{cursor:pointer;min-height:40px;display:flex;align-items:center;font-weight:700;font-size:14px}.empmore h4{margin:10px 0 4px;font:700 13px var(--body)}.empmore p{margin:0 0 6px;font-size:14px;white-space:pre-line;color:var(--ink)}.empmore .m{color:var(--muted);font-size:13px}",
/* the hub */
"#hub .hub{display:grid;grid-template-columns:230px minmax(0,1fr);gap:20px;align-items:start;padding-bottom:40px}",
"#hub .hnav{position:sticky;top:0;display:flex;flex-direction:column;gap:4px;padding:14px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}",
"#hub .hco{display:flex;gap:10px;align-items:center;padding:4px 4px 12px;margin-bottom:6px;border-bottom:1px solid var(--line);min-width:0}#hub .hco b{display:block;font:800 15px/1.2 var(--display);overflow-wrap:anywhere}#hub .hco small{color:var(--muted);font-size:12px}",
"#hub .hlogo{width:42px;height:42px;flex:none;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink);font:800 18px var(--display);overflow:hidden}#hub .hlogo img{width:100%;height:100%;object-fit:contain;background:#fff}",
"#hub .hnav button{display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;min-height:42px;padding:8px 12px;border:0;border-radius:11px;background:none;color:var(--ink);font:600 14.5px var(--body);cursor:pointer}",
"#hub .hnav button:hover{background:color-mix(in srgb,var(--accent) 8%,transparent)}#hub .hnav button[aria-current=page]{background:color-mix(in srgb,var(--accent) 14%,var(--surface));color:var(--accent)}",
"#hub .hnav button.post{margin-top:6px;justify-content:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-ink)}#hub .hnav .n{font:600 11.5px var(--mono);padding:2px 8px;border-radius:99px;background:var(--bg);color:var(--muted)}",
"#hub .hmain{display:flex;flex-direction:column;gap:18px;min-width:0}",
"#hub h1{margin:0;font:800 28px/1.15 var(--display);letter-spacing:-.02em;text-wrap:balance}#hub h2{margin:0;font:800 18px/1.2 var(--display)}#hub .lead{margin:4px 0 0;color:var(--muted);max-width:68ch}",
"#hub .box{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:14px;min-width:0}",
"#hub .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}",
"#hub .tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}#hub .tile{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 16px}#hub .tile b{display:block;font:800 28px/1.1 var(--display);font-variant-numeric:tabular-nums}#hub .tile small{color:var(--muted);font-size:12.5px}",
"#hub .steps{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}#hub .steps li{display:flex;gap:10px;align-items:center}#hub .steps .ck{width:24px;height:24px;flex:none;border-radius:50%;display:grid;place-items:center;font:700 12px var(--mono);border:1.5px solid var(--line);color:var(--muted)}#hub .steps .ck.on{background:var(--yes-bg);color:var(--yes);border-color:transparent}#hub .steps button{margin-left:auto}",
"#hub table{width:100%;border-collapse:collapse;font-size:14px}#hub th{text-align:left;font:600 11.5px var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line)}#hub td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle}#hub tr:last-child td{border-bottom:0}#hub .tw{overflow-x:auto}",
"#hub .st{display:inline-block;font:600 11.5px var(--mono);padding:3px 9px;border-radius:99px}#hub .st.open{background:var(--yes-bg);color:var(--yes)}#hub .st.paused{background:var(--mid-bg);color:var(--mid)}#hub .st.closed{background:var(--bg);color:var(--muted);border:1px solid var(--line)}",
"#hub .acts{display:flex;flex-wrap:wrap;gap:6px}#hub .sm{padding:6px 11px;font-size:13px;border-radius:9px}#hub .linkish{border:0;background:none;color:var(--accent);font-weight:600;cursor:pointer;padding:4px}",
"#hub .promise{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}#hub .promise div{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--bg)}#hub .promise b{display:block;font-size:14px;margin-bottom:3px}#hub .promise small{color:var(--muted);font-size:12.5px}",
"#hub .pform{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start}#hub .pside{position:sticky;top:0;display:flex;flex-direction:column;gap:12px}",
"#hub fieldset{border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:16px 18px 18px;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px;min-width:0}#hub legend{padding:0 6px;font:800 16px var(--display)}",
"#hub .match{grid-column:1/-1;margin:-4px 0 2px;font-size:12.5px;color:var(--muted)}#hub .match b{color:var(--accent);font-weight:600}",
"#hub .f{display:flex;flex-direction:column;gap:5px;min-width:0}#hub .f.full{grid-column:1/-1}#hub .f>label,#hub .f>.l{font-weight:600;font-size:13.5px}#hub .f small{color:var(--muted);font-size:12px}#hub .req{color:var(--accent)}",
"#hub .f input[type=text],#hub .f input[type=number],#hub .f input[type=month],#hub .f input[type=email],#hub .f input[type=url],#hub .f select,#hub .f textarea{width:100%;padding:9px 11px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit}",
"#hub .f textarea{resize:vertical;min-height:84px}#hub .f [aria-invalid=true]{border-color:var(--no);box-shadow:0 0 0 3px color-mix(in srgb,var(--no) 18%,transparent)}#hub .err{color:var(--no);font-weight:600;font-size:12.5px;min-height:0}",
"#hub .seg{display:flex;flex-wrap:wrap;gap:6px}#hub .seg label{display:flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:7px 13px;font-weight:600;font-size:13.5px;cursor:pointer}#hub .seg input{accent-color:var(--accent)}#hub .seg label:has(input:checked){border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--surface));color:var(--accent)}",
"#hub .perks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px}#hub .perks label{display:flex;gap:8px;align-items:center;font-size:14px}",
"#hub .ckline{display:flex;gap:9px;align-items:flex-start;font-size:14px}#hub .ckline input{margin-top:3px;accent-color:var(--accent)}",
"#hub .cnt{font:400 11.5px var(--mono);color:var(--muted);align-self:flex-end}",
"#hub .pbar{position:sticky;bottom:0;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--line);border-radius:16px;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(8px)}",
"#hub .price{font:600 13.5px var(--body)}#hub .price b{font:800 15px var(--display)}",
"#hub .pv{border:1px solid var(--line);border-radius:20px;background:var(--surface);padding:16px;display:flex;flex-direction:column;gap:10px;box-shadow:0 10px 30px -18px color-mix(in srgb,var(--accent) 60%,transparent)}",
"#hub .pv-h{display:flex;gap:10px;align-items:center}#hub .pv-h b{display:block;font:800 18px/1.15 var(--display)}#hub .pv-h small{color:var(--muted)}#hub .pv-pay{font:800 24px var(--display)}#hub .pv-pay small{font:500 12px var(--body);color:var(--muted);margin-left:4px}",
"#hub .facts{display:flex;flex-wrap:wrap;gap:6px}#hub .facts span{font-size:12.5px;padding:3px 9px;border-radius:99px;background:var(--bg);border:1px solid var(--line)}#hub .pv p{margin:0;font-size:14px}#hub .pv .chips{display:flex;flex-wrap:wrap;gap:6px}#hub .pv .chip{font-size:12px;padding:3px 9px}",
"#hub .pvlist{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;font-size:13px}#hub .pvlist span{color:var(--muted)}",
"#hub .logoup{display:flex;gap:14px;align-items:center}#hub .logoup .hlogo{width:72px;height:72px;border-radius:16px;font-size:28px}",
"#hub .apps{display:flex;flex-direction:column;gap:12px}#hub .app{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px 14px;align-items:start}",
"#hub .app .av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--bg);border:1px solid var(--line);font:800 15px var(--display)}#hub .app h3{margin:0;font:800 17px var(--display)}#hub .app .sub{color:var(--muted);font-size:13.5px}",
"#hub .mp{font:800 15px var(--display);padding:4px 10px;border-radius:99px}#hub .mp.yes{background:var(--yes-bg);color:var(--yes)}#hub .mp.mid{background:var(--mid-bg);color:var(--mid)}#hub .mp.no{background:var(--no-bg);color:var(--no)}",
"#hub .app .body{grid-column:2/-1;display:flex;flex-direction:column;gap:8px}#hub .kv{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13.5px}#hub .kv span{color:var(--muted)}#hub .flag{font:600 12px var(--body);padding:3px 9px;border-radius:99px}#hub .flag.ok{background:var(--yes-bg);color:var(--yes)}#hub .flag.bad{background:var(--no-bg);color:var(--no)}#hub .flag.unk{background:var(--mid-bg);color:var(--mid)}",
"#hub .app a{color:var(--accent);font-weight:600}#hub .note{color:var(--muted);font-size:13px;margin:0}",
"#hub .empty{text-align:center;padding:30px 16px;color:var(--muted)}#hub .empty b{display:block;color:var(--ink);font:800 18px var(--display);margin-bottom:4px}",
"#hub .msg{min-height:1.4em;margin:0;font-weight:600;font-size:14px}#hub .msg.bad{color:var(--no)}#hub .msg.good{color:var(--yes)}",
"#hub .banner{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:14px;background:var(--mid-bg);color:var(--mid);font-weight:600;font-size:14px}",
"@media (max-width:1100px){#hub .pform{grid-template-columns:minmax(0,1fr)}#hub .pside{position:static;order:-1}}",
"@media (max-width:860px){#hub .hub{grid-template-columns:minmax(0,1fr)}#hub .hnav{position:static;flex-direction:row;flex-wrap:nowrap;overflow-x:auto;padding:8px;border-radius:14px}#hub .hco{display:none}#hub .hnav button{flex:none}#hub .hnav button.post{margin-top:0}#hub .tiles{grid-template-columns:repeat(2,minmax(0,1fr))}#hub .promise{grid-template-columns:minmax(0,1fr)}}",
"@media (max-width:560px){#hub fieldset{grid-template-columns:minmax(0,1fr)}#hub .perks{grid-template-columns:minmax(0,1fr)}#hub .app{grid-template-columns:auto minmax(0,1fr)}#hub .app .mp{grid-column:2;justify-self:start}}"
].join("\n");

function apply(w,host){
  var d=w.document,A=w.__uaply,hdr=d.getElementById("hdrAcct"),bar=d.querySelector(".bar");
  if(!A||!hdr||!bar)throw new Error("needs the Bottom navigation experiment");
  var esc=A.esc,money=A.money;
  var KEY=(w.__uaplyKey||"uaply")+".hiring";
  function lsGet(k,def){try{var v=JSON.parse(w.localStorage.getItem(k));return v==null?def:v}catch(e){return def}}
  function lsSet(k,v){try{w.localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  var st=d.createElement("style");st.textContent=CSS;d.head.appendChild(st);

  /* ================= job seeker side ================= */
  var LOGO_OK=/^(\/api\/employer\/logo\/\d+\?v=[a-f0-9]{6,12}|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+)$/;
  w.__uaplyLogo=function(j){return j&&j.emp&&j.logo&&LOGO_OK.test(j.logo)?'<div class="logo emplogo" aria-hidden="true"><img src="'+j.logo+'" alt=""></div>':""};
  function X(){try{return (w.__uaplyApplyExt?w.__uaplyApplyExt():(A.S.profile.ext||{}))||{}}catch(e){return {}}}
  function fmtMonth(m){if(!/^\d{4}-\d{2}$/.test(m||""))return "";var p=m.split("-");return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1]-1]+" "+p[0]}
  function gradAsk(g){return g[0]&&g[1]?fmtMonth(g[0])+" to "+fmtMonth(g[1]):g[0]?fmtMonth(g[0])+" or later":"By "+fmtMonth(g[1])}
  /* what an employer posting asks for, checked against this person's own answers. st: 2 met, 1 unknown or soft, 0 not met. must: a requirement, not a preference */
  function elig(j){
    var x=X(),rows=[],us=j.country!=="CA";
    if(us){
      var a=x.auth||"",s;
      if(j.auth==="citizen")s=a==="citizen"?2:(a?0:1);
      else s=(a==="citizen"||a==="authorized")?2:(a==="none"?(j.sponsor==="yes"?1:0):1);
      rows.push({k:"Work in the US",ask:j.auth==="citizen"?"Citizens and permanent residents":"Anyone authorized",have:AUTH_LBL[a]||"Not in your profile",st:s,must:true});
    }else rows.push({k:"Work in Canada",ask:"Authorized to work in Canada",have:"Your profile covers US work only",st:1,must:false});
    if(j.sponsor)rows.push({k:"Visa sponsorship",ask:j.sponsor==="yes"?"Offered":"Not offered",have:x.sponsor==="yes"?"You need it":x.sponsor==="no"?"You don't need it":"Not in your profile",st:j.sponsor==="no"&&x.sponsor==="yes"?0:(x.sponsor?2:1),must:true});
    if(j.gpa)rows.push({k:"GPA",ask:(+j.gpa).toFixed(2)+" or higher",have:x.gpa?"Yours: "+x.gpa:"Not in your profile",st:x.gpa?(+x.gpa>=+j.gpa?2:0):1,must:true});
    if(j.grad&&(j.grad[0]||j.grad[1])){var g=x.grad||"";rows.push({k:"Graduation",ask:gradAsk(j.grad),have:g?fmtMonth(g):"Not in your profile",st:g?((!j.grad[0]||g>=j.grad[0])&&(!j.grad[1]||g<=j.grad[1])?2:0):1,must:true})}
    if(j.majors&&j.majors.length){var mj=String(x.major||"").toLowerCase();rows.push({k:"Major",ask:j.majors.join(", ")+" preferred",have:x.major||"Not in your profile",st:mj&&j.majors.some(function(m){m=m.toLowerCase();return mj.indexOf(m)>-1||m.indexOf(mj)>-1})?2:1,must:false})}
    if(j.start)rows.push({k:"Start date",ask:lbl(START,j.start),have:lbl(START,x.start)||"Not in your profile",st:(x.start===j.start||x.start==="flex"||j.start==="flex")?2:1,must:false});
    var tp=Array.isArray(x.types)?x.types:[],tmap={job:"fulltime",parttime:"parttime",internship:"internship",coop:"coop"};
    if(tp.length)rows.push({k:"Job type",ask:lbl(TYPES,j.type),have:tp.indexOf(tmap[j.type])>-1?"On your list":"Not on your list",st:tp.indexOf(tmap[j.type])>-1?2:1,must:false});
    if(j.reloc&&j.mode!=="remote")rows.push({k:"Relocation",ask:"Help offered",have:A.S.profile.reloc?"You would relocate":"",st:2,must:false});
    return rows;
  }
  function eligible(j){return !elig(j).some(function(r){return r.must&&r.st===0})}
  function initials(n){var p=String(n||"?").trim().split(/\s+/);return ((p[0]||"?").charAt(0)+(p[1]?p[1].charAt(0):"")).toUpperCase()}
  w.__uaplyEmpCard=function(j){
    if(!j||!j.emp)return "";
    var rows=elig(j),h='<div class="empx">';
    if(rows.length)h+='<p class="empx-h">What '+esc(j.co)+' asks for</p><ul class="crit">'+rows.map(function(r){var word=r.st===2?"Met":(r.st===1?"Check":"Not met");return '<li><span class="dot s'+r.st+'" role="img" aria-label="'+word+'">'+(r.st===2?"✓":(r.st===1?"?":"✕"))+'</span><span class="lbl">'+esc(r.k)+'</span><span class="val"><span class="ask">'+esc(r.ask)+'</span>'+(r.have?'<span class="sep"> · </span><em>'+esc(r.have)+'</em>':'')+'</span></li>'}).join("")+'</ul>';
    if(j.manager&&j.manager.name)h+='<div class="team"><span class="tav" aria-hidden="true">'+esc(initials(j.manager.name))+'</span><div><b>Meet the hiring team</b><small>'+esc(j.manager.name)+(j.manager.title?" · "+esc(j.manager.title):"")+'</small></div></div>';
    var perks=(j.perks||[]).map(function(k){return lbl(PERKS,k)}).filter(Boolean);
    h+='<details class="empmore"><summary>About the job and '+esc(j.co)+'</summary>'+
      (j.desc?'<h4>About the job</h4><p>'+esc(j.desc)+'</p>':'')+
      (perks.length?'<h4>Benefits</h4><p>'+esc(perks.join(" · "))+'</p>':'')+
      '<h4>About '+esc(j.co)+'</h4><p class="m">'+esc([j.industry,j.size?j.size+" employees":"",j.country==="CA"?"Canada":"United States"].filter(Boolean).join(" · "))+'</p>'+(j.about?'<p>'+esc(j.about)+'</p>':'')+
      '</details></div>';
    return h;
  };
  /* tapping inside the card's extra section must not start a swipe */
  d.addEventListener("pointerdown",function(e){if(e.target.closest&&e.target.closest(".empmore summary,.empmore"))e.stopPropagation()},true);

  var ELIG_K=KEY+".eligOnly";
  w.__uaplyHideMore=function(j){
    if(j.closed)return true;                                  /* a paused or closed posting never shows as a new card */
    return !!(j.emp&&lsGet(ELIG_K,false)&&!eligible(j));
  };
  (function filterBox(){
    var cnt=d.getElementById("fCount");if(!cnt)return;
    var f=d.createElement("div");
    f.innerHTML='<div class="checks" style="margin-top:8px"><label><input type="checkbox" id="fElig"> Hide jobs I\'m not eligible for</label></div><small>For jobs posted on UAply by employers: uses your work authorization, sponsorship, GPA and graduation date from Profile setup.</small>';
    cnt.parentNode.insertBefore(f,cnt);
    var cb=d.getElementById("fElig");cb.checked=!!lsGet(ELIG_K,false);
    cb.addEventListener("change",function(){lsSet(ELIG_K,cb.checked);A.renderAll()});
  })();

  /* ================= mode switch ================= */
  var ICON_HIRE='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>';
  var ICON_SEEK='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  var sw=d.createElement("button");sw.type="button";sw.id="modeSw";sw.className="modesw";bar.insertBefore(sw,hdr);
  var tag=d.createElement("span");tag.className="modetag";tag.textContent="Hiring";tag.hidden=true;
  var brand=bar.querySelector(".brand");if(brand)brand.appendChild(tag);
  var hub=d.createElement("section");hub.id="hub";hub.hidden=true;hub.setAttribute("aria-label","Hiring");bar.parentNode.insertBefore(hub,bar.nextSibling);
  var MODE_K=KEY+".mode";
  function paintSwitch(hire){
    sw.innerHTML=hire?ICON_SEEK+'<span><span class="lg">Switch to </span>job search</span>':ICON_HIRE+'<span><span class="lg">Switch to </span>hiring</span>';
    sw.setAttribute("aria-label",hire?"Switch to job search":"Switch to hiring: post jobs and review applicants");
  }
  function setMode(hire,quiet){
    d.body.classList.toggle("hire",hire);hub.hidden=!hire;tag.hidden=!hire;paintSwitch(hire);lsSet(MODE_K,hire?"hire":"seek");
    if(hire){load().then(function(){render()})}
    else{if(!quiet)syncDeck();if(w.__uaplyAskConsent)w.__uaplyAskConsent()}
  }
  sw.addEventListener("click",function(){setMode(!d.body.classList.contains("hire"))});

  /* ================= data ================= */
  var H={mode:"loading",company:null,jobs:[],apps:[],verified:false,email:"",view:"overview",edit:null,appJob:"all",mustOnly:false,sort:"match",pendingLogo:null,L:null};
  function api(path,body){
    var o=body?{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{credentials:"same-origin"};
    return w.fetch(path,o).then(function(r){return r.json().then(function(j){return {ok:r.ok,status:r.status,j:j||{}}},function(){return {ok:false,status:r.status,j:{}}})},function(){return {ok:false,status:0,j:{}}});
  }
  function load(){
    return api("/api/employer/me").then(function(r){
      if(r.ok){H.mode="server";H.company=r.j.company;H.jobs=r.j.jobs||[];H.apps=r.j.applicants||[];H.verified=!!r.j.verified;H.email=r.j.email||""}
      else if(r.status===401)H.mode="signedout";
      else{H.mode="local";loadLocal()}
    });
  }
  /* ---- this browser only (a static copy has no server) ---- */
  function loadLocal(){
    H.L=lsGet(KEY+".local",null)||{company:null,jobs:[],pipe:{},next:390001};
    H.company=H.L.company;H.jobs=H.L.jobs;H.verified=true;H.email="";H.apps=localApps();
  }
  function saveLocal(){H.L.company=H.company;H.L.jobs=H.jobs;lsSet(KEY+".local",H.L)}
  function localApps(){
    var ids={},out=[];H.jobs.forEach(function(j){ids[j.id]=1});
    var p=A.S.profile,x=X();
    Object.keys(A.S.decisions).forEach(function(id){
      var dd=A.S.decisions[id];if(dd.s!=="applied"||!ids[id])return;
      var pi=(H.L.pipe||{})[id]||{};
      out.push({id:String(id),job:+id,at:Math.round((dd.at||Date.now())/1000),match:dd.pct||0,note:"",name:p.name||"You (test application)",email:x.email||"",phone:x.phone||"",title:p.title||"",loc:p.loc||"",years:p.years||0,edu:p.edu||"",skills:p.skills||[],
        school:x.school||"",major:x.major||"",grad:x.grad||"",gpa:x.gpa||"",auth:x.auth||"",sponsor:x.sponsor||"",start:x.start||"",headline:x.headline||"",summary:x.summary||"",resume:x.resume||"",linkedin:x.linkedin||"",portfolio:x.portfolio||"",stage:pi.stage||"new",private:pi.note||""});
    });
    return out;
  }
  function locOf(j){return j.mode==="remote"?"Remote ("+(j.country==="CA"?"Canada":"US")+")":j.city+", "+j.region+(j.country==="CA"?", Canada":"")}
  function feedOf(j,c){
    return {id:j.id,co:c.name,role:j.role,loc:locOf(j),mode:j.mode,sal:j.sal.slice(),yrs:j.yrs,edu:j.edu,skills:j.skills.slice(),blurb:j.blurb,type:j.type,url:j.url||c.website||"",
      source:"Posted on UAply by "+c.name,apply:"direct",partner:true,live:true,instant:true,local:true,posted:j.posted*1000,perks:j.perks.slice(),comm:j.comm,closed:j.status!=="open",emp:true,
      country:j.country,region:j.region,city:j.city,desc:j.desc,majors:j.majors.slice(),gpa:j.gpa,grad:j.grad.slice(),auth:j.auth,sponsor:j.sponsor,start:j.start,reloc:j.reloc,
      about:c.about||"",industry:c.industry||"",size:c.size||"",website:c.website||"",logo:c.logo||"",manager:j.show_manager&&j.manager.name?{name:j.manager.name,title:j.manager.title}:null};
  }
  /* bring the job seeker deck up to date with what employers posted */
  function syncDeck(){
    if(!w.__uaplyEmpJobs)return;
    if(H.mode==="local"){w.__uaplyEmpJobs.sync(H.company&&H.company.consent?H.jobs.map(function(j){return feedOf(j,H.company)}):[],function(x){return x.emp&&x.local});return}
    if(H.mode!=="server")return;
    w.fetch("/api/jobs").then(function(r){return r.json()}).then(function(data){
      var emp=(data.jobs||[]).filter(function(j){return j.emp});
      w.__uaplyEmpJobs.sync(emp,function(x){return x.emp&&!x.local});
      remember(emp);
    }).catch(function(){});
  }
  /* add employer jobs to the saved copy of the feed that the app reads before it starts, so a swipe on a job posted after the page
     opened is still there after a reload (the app keeps a decision only for a job it knows when it loads) */
  function remember(emp){
    var k=(w.__uaplyKey||"hireswipe")+".live",c=lsGet(k,null);if(!c||!Array.isArray(c.jobs))c={jobs:[]};
    var ids={},now=Date.now();emp.forEach(function(j){ids[j.id]=1});
    c.jobs=c.jobs.filter(function(j){return !(j&&j.emp)||ids[j.id]||A.S.decisions[j.id]}).filter(function(j){return !(j&&ids[j.id])}).concat(emp.map(function(j){return Object.assign({},j,{seen:now})})).slice(-400);
    lsSet(k,c);
  }
  if(lsGet(MODE_K,"seek")!=="hire"){load().then(function(){if(H.mode==="local")syncDeck()})}

  /* ---- the same checks the server makes, so mistakes show at once ---- */
  var EMAIL=/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,HTTPS=/^https:\/\/[^\s\/]+\.[^\s]+$/;
  function listOf(v,n,c){var seen={},out=[];String(v||"").split(",").forEach(function(x){x=x.replace(/\s+/g," ").trim().slice(0,c);if(x&&!seen[x.toLowerCase()]){seen[x.toLowerCase()]=1;out.push(x)}});return out.slice(0,n)}
  function checkCompany(p){
    if(p.name.length<2)return ["Enter your company name.","name"];
    if(INDUSTRIES.indexOf(p.industry)<0)return ["Choose your industry.","industry"];
    if(SIZES.indexOf(p.size)<0)return ["Choose how many people work at your company.","size"];
    if(!p.country)return ["Choose the United States or Canada.","country"];
    if(p.website&&!HTTPS.test(p.website))return ["Use a full website address that starts with https://","website"];
    if(!p.consent)return ["Confirm that you may post jobs for this company and receive applications through UAply.","consent"];
    return null;
  }
  function checkJob(p){
    if(p.role.length<2)return ["Enter the job title.","role"];
    if(!p.mode)return ["Choose remote, hybrid or on-site.","mode"];
    if(p.mode!=="remote"&&!(p.city&&p.region))return ["Enter the city and "+(p.country==="CA"?"province":"state")+" where the job is.","city"];
    if(!(p.sal_min>0)||!(p.sal_max>0)||p.sal_max<p.sal_min)return ["Enter the yearly pay range (the most must be at least the least).","sal_min"];
    if(!p.skills.length)return ["Add at least one skill the job needs.","skills"];
    if(p.blurb.length<20)return ["Write a one-line summary for the job card (20 characters or more).","blurb"];
    if(p.gpa&&!(+p.gpa>0&&+p.gpa<=4))return ["GPA is between 0 and 4.0.","gpa"];
    if(p.grad_from&&p.grad_to&&p.grad_to<p.grad_from)return ["The graduation window ends before it starts.","grad_to"];
    if(p.url&&!HTTPS.test(p.url))return ["Use a full link that starts with https://","url"];
    if(p.manager.email&&!EMAIL.test(p.manager.email))return ["Enter the hiring team email as name@company.com","mgr_email"];
    if(p.manager.linkedin&&!/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/\S+$/.test(p.manager.linkedin))return ["Use the LinkedIn profile link (https://www.linkedin.com/in/...)","mgr_linkedin"];
    return null;
  }

  /* ================= rendering ================= */
  function opt(list,cur,ph){return (ph?'<option value="">'+ph+'</option>':'')+list.map(function(o){var k=Array.isArray(o)?o[0]:o,t=Array.isArray(o)?o[1]:o;return '<option value="'+esc(k)+'"'+(String(cur)===String(k)?" selected":"")+'>'+esc(t)+'</option>'}).join("")}
  function radios(name,list,cur){return '<div class="seg" role="radiogroup">'+list.map(function(o){return '<label><input type="radio" name="'+name+'" value="'+o[0]+'"'+(cur===o[0]?" checked":"")+'> '+esc(o[1])+'</label>'}).join("")+'</div>'}
  function logoBox(c,big){var lg=H.pendingLogo||(c&&c.logo);return '<span class="hlogo"'+(big?' style="width:72px;height:72px;border-radius:16px;font-size:28px"':'')+' aria-hidden="true">'+(lg&&LOGO_OK.test(lg)?'<img src="'+lg+'" alt="">':esc((c&&c.name||"?").charAt(0).toUpperCase()))+'</span>'}
  function tone(p){return p>=80?"yes":(p>=60?"mid":"no")}
  function ago(t){var s=Math.max(0,Date.now()/1000-t);return s<3600?Math.max(1,Math.round(s/60))+" min ago":s<86400?Math.round(s/3600)+" h ago":Math.round(s/86400)+" d ago"}
  function jobById(id){for(var i=0;i<H.jobs.length;i++)if(H.jobs[i].id===+id)return H.jobs[i];return null}
  function counts(){var o={open:0,apps:H.apps.length,week:0,avg:0};H.jobs.forEach(function(j){if(j.status==="open")o.open++});var now=Date.now()/1000,sum=0;H.apps.forEach(function(a){if(now-a.at<7*86400)o.week++;sum+=a.match||0});o.avg=H.apps.length?Math.round(sum/H.apps.length):0;return o}

  function shell(inner){
    var c=H.company,n=counts();
    var nav=[["overview","Overview",""],["jobs","Jobs",H.jobs.length||""],["applicants","Applicants",n.apps||""],["company","Company",""],["billing","Billing",""]];
    return '<div class="hub"><nav class="hnav" aria-label="Hiring sections"><div class="hco">'+logoBox(c)+'<div><b>'+esc(c?c.name:"Your company")+'</b><small>'+(c?esc(c.industry||"Employer"):"Not set up yet")+'</small></div></div>'+
      nav.map(function(x){return '<button type="button" data-view="'+x[0]+'"'+(H.view===x[0]?' aria-current="page"':'')+'>'+x[1]+(x[2]!==""?'<span class="n">'+x[2]+'</span>':'')+'</button>'}).join("")+
      '<button type="button" class="post" data-act="new">+ Post a job</button></nav><div class="hmain">'+banner()+inner+'<p class="msg" id="hMsg" role="status" aria-live="polite"></p></div></div>';
  }
  function banner(){
    if(H.mode==="local")return '<div class="banner"><span>Preview copy: your company and jobs are saved in this browser only, and your jobs appear in this browser\'s own swipe deck. On the UAply server they are published to everyone.</span></div>';
    if(H.mode==="server"&&!H.verified)return '<div class="banner"><span>Verify your email to publish jobs. Applications are sent to '+esc(H.email)+'.</span><button type="button" class="btn sm" data-act="verify">Verify email</button></div>';
    return "";
  }
  function say(m,kind){var e=d.getElementById("hMsg");if(e){e.textContent=m||"";e.className="msg"+(kind?" "+kind:"")}}

  function render(){
    if(H.mode==="loading"){hub.innerHTML='<div class="box empty"><b>Loading…</b></div>';return}
    if(H.mode==="signedout"){hub.innerHTML='<div class="box" style="max-width:640px;margin:24px auto"><h1>Hire on UAply</h1><p class="lead">Post a job in a few minutes and get applicants who already match what you ask for. Every applicant arrives with a match score against your requirements.</p>'+
      '<div class="promise"><div><b>One page to post</b><small>Live preview of the card job seekers see.</small></div><div><b>No surprise bills</b><small>Pricing is TBD. When it starts, you see the price before you publish.</small></div><div><b>Close in one click</b><small>A closed job leaves the feed right away.</small></div></div>'+
      '<div class="row" style="justify-content:flex-start"><button type="button" class="btn" data-act="signin">Sign in or create an account</button><small class="note">Use the same UAply account you use for job search.</small></div></div>';return}
    var v=H.view;
    if(!H.company&&v!=="company"&&v!=="billing")v="welcome";
    var inner=v==="welcome"?welcome():v==="overview"?overview():v==="jobs"?jobsView():v==="post"?postView():v==="applicants"?appsView():v==="company"?companyView():billingView();
    hub.innerHTML=shell(inner);
    if(v==="post")wirePost();
    if(v==="company")wireCompany();
    hub.scrollTop=0;
  }
  function welcome(){
    return '<div class="box"><h1>Welcome to Hiring</h1><p class="lead">Three steps, about five minutes. Your company profile is saved once and shown on every job you post.</p>'+
      '<ol class="steps"><li><span class="ck">1</span>Add your company: name, logo, industry, size and where you are.<button type="button" class="btn sm" data-view="company">Add company</button></li><li><span class="ck">2</span>Post a job on one page, with a live preview of the card job seekers swipe.</li><li><span class="ck">3</span>Review applicants, each with a match score and your must-haves checked.</li></ol></div>';
  }
  function overview(){
    var n=counts(),c=H.company;
    var steps=[[!!c,"Company profile","company"],[H.jobs.length>0,"First job posted","new"],[H.mode!=="server"||H.verified,"Email verified (applications go there)","verify"]];
    var h='<div class="row"><div><h1>'+esc(c.name)+'</h1><p class="lead">Your hiring at a glance.</p></div><button type="button" class="btn" data-act="new">+ Post a job</button></div>';
    if(steps.some(function(s){return !s[0]}))h+='<div class="box"><h2>Finish setting up</h2><ul class="steps">'+steps.map(function(s){return '<li><span class="ck'+(s[0]?" on":"")+'">'+(s[0]?"✓":"")+'</span>'+s[1]+(s[0]?'':'<button type="button" class="btn ghost sm" '+(s[2]==="new"?'data-act="new"':s[2]==="verify"?'data-act="verify"':'data-view="company"')+'>Do it</button>')+'</li>'}).join("")+'</ul></div>';
    h+='<div class="tiles"><div class="tile"><b>'+n.open+'</b><small>Open jobs</small></div><div class="tile"><b>'+n.apps+'</b><small>Applicants</small></div><div class="tile"><b>'+n.week+'</b><small>New this week</small></div><div class="tile"><b>'+(n.apps?n.avg+"%":"–")+'</b><small>Average match</small></div></div>';
    h+='<div class="box"><div class="row"><h2>Your jobs</h2><button type="button" class="linkish" data-view="jobs">See all</button></div>'+jobsTable(H.jobs.slice(0,5))+'</div>';
    var recent=H.apps.slice(0,3);
    h+='<div class="box"><div class="row"><h2>Recent applicants</h2><button type="button" class="linkish" data-view="applicants">See all</button></div>'+(recent.length?'<div class="apps">'+recent.map(appCard).join("")+'</div>':'<p class="note">No applicants yet. When someone swipes right on your job, they show up here with their match score.</p>')+'</div>';
    h+='<div class="promise"><div><b>Pay only what you agree to</b><small>Pricing: TBD. One upfront price per job, shown before you publish. No pay-per-click, no auto-renew.</small></div><div><b>Applicants who fit</b><small>Every applicant has a match score, and job seekers can hide jobs they are not eligible for.</small></div><div><b>No ghost jobs</b><small>Pause or close in one click. Closed jobs leave the feed at once.</small></div></div>';
    return h;
  }
  function jobsTable(list){
    if(!list.length)return '<div class="empty"><b>No jobs yet</b>Post your first job and it appears in the swipe deck right away.<div style="margin-top:12px"><button type="button" class="btn" data-act="new">+ Post a job</button></div></div>';
    return '<div class="tw"><table><thead><tr><th>Job</th><th>Status</th><th>Applicants</th><th>Posted</th><th></th></tr></thead><tbody>'+list.map(function(j){
      var na=H.apps.filter(function(a){return a.job===j.id}).length;
      return '<tr><td><b>'+esc(j.role)+'</b><br><small class="note">'+esc(lbl(TYPES,j.type))+' · '+esc(locOf(j))+'</small></td><td><span class="st '+j.status+'">'+cap(j.status)+'</span></td><td>'+(na?'<button type="button" class="linkish" data-act="apps" data-id="'+j.id+'">'+na+'</button>':'0')+'</td><td><small>'+new Date(j.posted*1000).toLocaleDateString()+'</small></td>'+
        '<td><div class="acts"><button type="button" class="btn ghost sm" data-act="edit" data-id="'+j.id+'">Edit</button>'+
        (j.status==="open"?'<button type="button" class="btn ghost sm" data-act="status" data-st="paused" data-id="'+j.id+'">Pause</button><button type="button" class="btn ghost sm" data-act="status" data-st="closed" data-id="'+j.id+'">Close</button>':'<button type="button" class="btn ghost sm" data-act="status" data-st="open" data-id="'+j.id+'">Reopen</button>')+
        '<button type="button" class="btn ghost sm" data-act="del" data-id="'+j.id+'">Delete</button></div></td></tr>';
    }).join("")+'</tbody></table></div>';
  }
  function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  function jobsView(){return '<div class="row"><div><h1>Jobs</h1><p class="lead">Open jobs show in the swipe deck. Paused and closed jobs are hidden from new job seekers right away.</p></div><button type="button" class="btn" data-act="new">+ Post a job</button></div><div class="box">'+jobsTable(H.jobs)+'</div>'}

  /* ---- post or edit a job ---- */
  function blankJob(){var c=H.company||{};return {role:"",type:"job",mode:"",country:c.country||"US",city:c.city||"",region:c.region||"",sal:[0,0],comm:false,yrs:0,edu:"Bachelor",skills:[],majors:[],gpa:0,grad:["",""],auth:"any",sponsor:"",start:"",reloc:false,perks:[],blurb:"",desc:"",url:"",manager:{name:"",title:"",email:"",linkedin:""},show_manager:true}}
  function F(id,label,inner,o){o=o||{};return '<div class="f'+(o.full?" full":"")+'"><'+(o.group?'span class="l"':'label for="'+id+'"')+'>'+label+(o.req?' <span class="req" aria-hidden="true">*</span>':'')+'</'+(o.group?'span':'label')+'>'+inner+(o.hint?'<small>'+o.hint+'</small>':'')+'<small class="err" id="'+id+'-err" role="alert"></small></div>'}
  function postView(){
    var j=H.edit||blankJob(),editing=!!(H.edit&&H.edit.id);
    var yrs=[[0,"No minimum"]];for(var i=1;i<=15;i++)yrs.push([i,i+"+ years"]);
    var gpa=j.gpa?(+j.gpa).toFixed(2):"";
    return '<div><h1>'+(editing?"Edit job":"Post a job")+'</h1><p class="lead">One page. Each section is matched to what job seekers fill in, so the right people see your job and their match score is fair.</p></div>'+
    '<form id="pForm" class="pform" novalidate><div style="display:flex;flex-direction:column;gap:16px;min-width:0">'+
    '<fieldset><legend>The role</legend><p class="match">Matched to the job seeker\'s <b>target titles</b>, <b>opportunity types</b>, <b>work style</b>, <b>city and commute distance</b> and <b>willingness to relocate</b>.</p>'+
      F("jRole","Job title",'<input type="text" id="jRole" maxlength="120" value="'+esc(j.role)+'" placeholder="Marketing Coordinator">',{req:1,full:1})+
      F("jType","Job type",radios("jType",TYPES,j.type),{req:1,full:1,group:1})+
      F("jMode","Work style",radios("jMode",MODES,j.mode),{req:1,full:1,group:1})+
      F("jCountry","Country",radios("jCountry",COUNTRIES,j.country),{req:1,full:1,group:1})+
      '<div class="f" id="jCityWrap"><label for="jCity">City <span class="req" aria-hidden="true">*</span></label><input type="text" id="jCity" maxlength="60" value="'+esc(j.city)+'" placeholder="Philadelphia"><small class="err" id="jCity-err" role="alert"></small></div>'+
      '<div class="f" id="jRegionWrap"><label for="jRegion" id="jRegionL">State</label><select id="jRegion"></select></div>'+
      '<div class="f full" id="jRelocWrap"><label class="ckline"><input type="checkbox" id="jReloc"'+(j.reloc?" checked":"")+'> We help with relocation</label></div></fieldset>'+
    '<fieldset><legend>Pay</legend><p class="match">Matched to the job seeker\'s <b>minimum salary</b>, the <b>salary dealbreaker</b> and the <b>commission-only</b> filter.</p>'+
      F("jSalMin","Lowest yearly pay (USD)",'<input type="number" id="jSalMin" min="0" step="1000" inputmode="numeric" value="'+(j.sal[0]||"")+'" placeholder="55000">',{req:1})+
      F("jSalMax","Highest yearly pay (USD)",'<input type="number" id="jSalMax" min="0" step="1000" inputmode="numeric" value="'+(j.sal[1]||"")+'" placeholder="70000">',{req:1,hint:"Paid hourly? Multiply by 2,080 (40 hours × 52 weeks)."})+
      '<div class="f full"><label class="ckline"><input type="checkbox" id="jComm"'+(j.comm?" checked":"")+'> This role is paid by commission only</label></div></fieldset>'+
    '<fieldset><legend>Who it\'s for</legend><p class="match">Matched to the job seeker\'s <b>years of experience</b>, <b>experience level</b>, <b>education</b>, <b>skills</b>, <b>major</b>, <b>GPA</b> and <b>graduation date</b>.</p>'+
      F("jYrs","Minimum experience",'<select id="jYrs">'+opt(yrs,j.yrs)+'</select>',{req:1})+
      F("jEdu","Minimum education",'<select id="jEdu">'+opt(LEVELS,j.edu)+'</select>',{req:1})+
      F("jSkills","Skills the job needs",'<input type="text" id="jSkills" maxlength="300" value="'+esc(j.skills.join(", "))+'" placeholder="Excel, Customer service, SQL">',{req:1,full:1,hint:'Up to 6, separated by commas. These drive 40% of the match score. <span id="jSkillsN"></span>'})+
      F("jMajors","Preferred majors",'<input type="text" id="jMajors" maxlength="300" value="'+esc(j.majors.join(", "))+'" placeholder="Marketing, Communications">',{full:1,hint:"Optional. A preference, never a hard rule."})+
      F("jGpa","Minimum GPA",'<input type="number" id="jGpa" min="0" max="4" step="0.1" inputmode="decimal" value="'+gpa+'" placeholder="3.0">',{hint:"Optional, out of 4.0."})+
      '<div class="f"><span class="l">Graduation window</span><div style="display:flex;gap:6px;align-items:center"><input type="month" id="jGradFrom" aria-label="Graduating from" value="'+esc(j.grad[0])+'"><span>to</span><input type="month" id="jGradTo" aria-label="Graduating by" value="'+esc(j.grad[1])+'"></div><small>Optional. Useful for internships and new graduate roles.</small><small class="err" id="jGradTo-err" role="alert"></small></div></fieldset>'+
    '<fieldset><legend>Eligibility</legend><p class="match">Matched to the job seeker\'s <b>work authorization</b>, <b>visa sponsorship</b> and <b>earliest start</b>. Job seekers can hide jobs they are not eligible for.</p>'+
      F("jAuth","Who can apply",radios("jAuth",[["any","Anyone authorized to work here, including visa and OPT holders"],["citizen","Citizens and permanent residents only"]],j.auth),{full:1,group:1})+
      F("jSponsor","Visa sponsorship",radios("jSponsor",[["yes","We sponsor"],["no","We don't sponsor"],["","Not decided"]],j.sponsor),{full:1,group:1})+
      F("jStart","When should the hire start?",'<select id="jStart">'+opt(START,j.start)+'</select>')+'</fieldset>'+
    '<fieldset><legend>Benefits</legend><p class="match">Matched to the job seeker\'s <b>Benefits</b> filter. Tick only what you really offer.</p><div class="perks f full">'+PERKS.map(function(p){return '<label><input type="checkbox" data-perk="'+p[0]+'"'+(j.perks.indexOf(p[0])>-1?" checked":"")+'> '+esc(p[1])+'</label>'}).join("")+'</div></fieldset>'+
    '<fieldset><legend>Describe the job</legend>'+
      F("jBlurb","One-line summary for the card",'<input type="text" id="jBlurb" maxlength="220" value="'+esc(j.blurb)+'" placeholder="Plan and run campaigns for our three Philadelphia stores."><span class="cnt" id="jBlurbN"></span>',{req:1,full:1})+
      F("jDesc","Full description",'<textarea id="jDesc" maxlength="5000" rows="7" placeholder="What the hire will do, who they work with, what success looks like in 90 days.">'+esc(j.desc)+'</textarea><span class="cnt" id="jDescN"></span>',{full:1,hint:"Shown under About the job when a job seeker opens the card."})+
      F("jUrl","Link to this job on your site",'<input type="text" id="jUrl" inputmode="url" maxlength="300" value="'+esc(j.url)+'" placeholder="https://yourcompany.com/careers/...">',{full:1,hint:"Optional. Applications through UAply come to your email either way."})+'</fieldset>'+
    '<fieldset><legend>Meet the hiring team</legend><p class="match">Plus and Pro job seekers can choose to send the hiring team a short message with their application. The email and LinkedIn are never shown publicly.</p>'+
      F("jMgrName","Name",'<input type="text" id="jMgrName" maxlength="80" value="'+esc(j.manager.name)+'" placeholder="Dana Ortiz">')+
      F("jMgrTitle","Title",'<input type="text" id="jMgrTitle" maxlength="80" value="'+esc(j.manager.title)+'" placeholder="Marketing Manager">')+
      F("mgr_email","Email",'<input type="email" id="mgr_email" maxlength="120" value="'+esc(j.manager.email)+'" placeholder="dana@yourcompany.com">')+
      F("mgr_linkedin","LinkedIn",'<input type="text" id="mgr_linkedin" inputmode="url" maxlength="200" value="'+esc(j.manager.linkedin)+'" placeholder="https://www.linkedin.com/in/...">')+
      '<div class="f full"><label class="ckline"><input type="checkbox" id="jShowMgr"'+(j.show_manager?" checked":"")+'> Show the name and title on the job card under "Meet the hiring team"</label></div></fieldset>'+
    '<div class="pbar"><span class="price">Price to post: <b>TBD</b> <small class="note">· no card needed for now</small></span><div class="acts"><button type="button" class="btn ghost" data-view="jobs">Cancel</button><button type="submit" class="btn" id="jSubmit">'+(editing?"Save changes":"Publish job")+'</button></div></div>'+
    '</div><aside class="pside" aria-label="Preview"><div><h2>Preview</h2><p class="note">What job seekers see on the swipe card.</p></div><div id="pPrev"></div></aside></form>';
  }
  function readPost(){
    var f=hub.querySelector("#pForm");function v(id){var e=f.querySelector("#"+id);return e?e.value.trim():""}function r(n){var e=f.querySelector('input[name="'+n+'"]:checked');return e?e.value:""}function c(id){var e=f.querySelector("#"+id);return !!(e&&e.checked)}
    var mode=r("jMode");
    return {id:H.edit&&H.edit.id||undefined,role:v("jRole").replace(/\s+/g," "),type:r("jType")||"job",mode:mode,country:r("jCountry")||"US",city:v("jCity"),region:v("jRegion"),
      sal_min:+v("jSalMin")||0,sal_max:+v("jSalMax")||0,comm:c("jComm"),yrs:+v("jYrs")||0,edu:v("jEdu"),skills:listOf(v("jSkills"),6,40),majors:listOf(v("jMajors"),6,60),
      gpa:v("jGpa"),grad_from:v("jGradFrom"),grad_to:v("jGradTo"),auth:r("jAuth")||"any",sponsor:r("jSponsor"),start:v("jStart"),reloc:mode!=="remote"&&c("jReloc"),
      perks:[].slice.call(f.querySelectorAll("[data-perk]")).filter(function(x){return x.checked}).map(function(x){return x.getAttribute("data-perk")}),
      blurb:v("jBlurb").replace(/\s+/g," "),desc:v("jDesc"),url:v("jUrl"),manager:{name:v("jMgrName"),title:v("jMgrTitle"),email:v("mgr_email").toLowerCase(),linkedin:v("mgr_linkedin")},show_manager:c("jShowMgr")};
  }
  function asJob(p){return {role:p.role,type:p.type,mode:p.mode||"remote",country:p.country,city:p.city,region:p.region,sal:[p.sal_min,p.sal_max],comm:p.comm,yrs:p.yrs,edu:p.edu,skills:p.skills,majors:p.majors,gpa:+p.gpa||0,grad:[p.grad_from,p.grad_to],auth:p.auth,sponsor:p.sponsor,start:p.start,reloc:p.reloc,perks:p.perks,blurb:p.blurb,desc:p.desc,url:p.url,manager:p.manager,show_manager:p.show_manager&&!!p.manager.name}}
  function preview(){
    var p=readPost(),j=asJob(p),c=H.company||{name:"Your company"},box=hub.querySelector("#pPrev");if(!box)return;
    var fj=feedOf(Object.assign({id:0,status:"open",posted:Date.now()/1000},j),c);
    var pay=j.sal[1]>0?money(j.sal[0])+"–"+money(j.sal[1])+"<small>per year</small>":"<small>Add the pay range</small>";
    var req=elig(fj).filter(function(r){return r.must}).map(function(r){return '<li><span>'+esc(r.k)+':</span> '+esc(r.ask)+'</li>'});
    if(j.yrs)req.unshift('<li><span>Experience:</span> '+j.yrs+'+ years</li>');req.unshift('<li><span>Education:</span> '+esc(j.edu)+' or higher</li>');
    box.innerHTML='<div class="pv"><div class="pv-h">'+logoBox(c)+'<div><b>'+esc(j.role||"Job title")+'</b><small>'+esc(c.name)+'</small></div></div><div class="pv-pay">'+pay+'</div>'+
      '<div class="facts"><span>'+esc(j.mode==="remote"||!j.city?locOf(Object.assign({},j,{mode:j.city?j.mode:"remote"})):locOf(j))+'</span><span>'+esc(lbl(MODES,j.mode)||"Work style")+'</span><span>'+esc(lbl(TYPES,j.type))+'</span>'+(j.comm?'<span>Commission only</span>':'')+'</div>'+
      (j.skills.length?'<div class="chips">'+j.skills.map(function(s){return '<span class="chip">'+esc(s)+'</span>'}).join("")+'</div>':'')+
      '<p>'+esc(j.blurb||"Your one-line summary shows here.")+'</p><ul class="pvlist">'+req.join("")+'</ul>'+
      (j.show_manager?'<div class="team"><span class="tav" aria-hidden="true">'+esc(initials(j.manager.name))+'</span><div><b>Meet the hiring team</b><small>'+esc(j.manager.name)+(j.manager.title?" · "+esc(j.manager.title):"")+'</small></div></div>':'')+
      '</div><p class="note">Job seekers also see a match score from 0 to 100% for their own profile, and can open About the job and '+esc(c.name)+'.</p>';
  }
  function wirePost(){
    var f=hub.querySelector("#pForm");
    function regions(){
      var country=(f.querySelector('input[name="jCountry"]:checked')||{}).value||"US",sel=f.querySelector("#jRegion"),cur=sel.value||(H.edit||blankJob()).region;
      sel.innerHTML=opt(REGIONS[country],cur,country==="CA"?"Choose a province":"Choose a state");
      f.querySelector("#jRegionL").innerHTML=(country==="CA"?"Province":"State")+' <span class="req" aria-hidden="true">*</span>';
    }
    function where(){
      var m=(f.querySelector('input[name="jMode"]:checked')||{}).value;
      var remote=m==="remote";f.querySelector("#jRelocWrap").hidden=remote;
      f.querySelector("#jCityWrap").querySelector("label").innerHTML="City"+(remote?' <small>(optional for remote)</small>':' <span class="req" aria-hidden="true">*</span>');
    }
    function counters(){
      f.querySelector("#jBlurbN").textContent=f.querySelector("#jBlurb").value.length+" / 220";
      f.querySelector("#jDescN").textContent=f.querySelector("#jDesc").value.length+" / 5000";
      var n=listOf(f.querySelector("#jSkills").value,99,40).length;f.querySelector("#jSkillsN").textContent=n?"("+Math.min(n,6)+" of 6"+(n>6?", only the first 6 are kept":"")+")":"";
    }
    regions();where();counters();preview();
    var t=null;
    f.addEventListener("input",function(){counters();clearTimeout(t);t=setTimeout(preview,120)});
    f.addEventListener("change",function(e){if(e.target.name==="jCountry")regions();if(e.target.name==="jMode")where();preview()});
    f.addEventListener("submit",function(e){e.preventDefault();submitJob()});
  }
  function showErr(field,msg){
    hub.querySelectorAll("[aria-invalid=true]").forEach(function(x){x.removeAttribute("aria-invalid")});hub.querySelectorAll(".err").forEach(function(x){x.textContent=""});
    var map={role:"jRole",mode:"jMode",city:"jCity",sal_min:"jSalMin",skills:"jSkills",blurb:"jBlurb",gpa:"jGpa",grad_to:"jGradTo",url:"jUrl",name:"cName",industry:"cIndustry",size:"cSize",country:"cCountry",website:"cWebsite",consent:"cConsent",logo:"cLogoF"};
    var id=map[field]||field,el=hub.querySelector("#"+id)||hub.querySelector('input[name="'+id+'"]'),er=hub.querySelector("#"+id+"-err");
    if(er)er.textContent=msg;if(el){el.setAttribute("aria-invalid","true");el.scrollIntoView({block:"center",behavior:"smooth"});try{el.focus({preventScroll:true})}catch(x){}}
    say(msg,"bad");
  }
  function submitJob(){
    var p=readPost(),bad=checkJob(p);if(bad){showErr(bad[1],bad[0]);return}
    var btn=hub.querySelector("#jSubmit");btn.disabled=true;say(p.id?"Saving…":"Publishing…");
    if(H.mode==="server"){
      api("/api/employer/job",p).then(function(r){btn.disabled=false;
        if(!r.ok){if(r.j.code==="company"){H.view="company";render();return}showErr(r.j.field||"",r.j.error||"Could not save. Try again.");return}
        afterSave(p.id?"Saved.":"Published. It is in the swipe deck now.");
      });return;
    }
    var j=asJob(p),now=Math.round(Date.now()/1000);
    if(p.id){var cur=jobById(p.id);Object.assign(cur,j,{updated:now})}
    else{H.jobs.unshift(Object.assign(j,{id:H.L.next++,status:"open",posted:now,updated:now}))}
    saveLocal();afterSave(p.id?"Saved.":"Published. Switch to job search to see it in your deck.");
  }
  function afterSave(m){H.edit=null;H.view="jobs";(H.mode==="server"?load():Promise.resolve()).then(function(){render();say(m,"good");syncDeck()})}

  /* ---- applicants ---- */
  function appFlags(a,j){
    var f=[];if(!j)return f;
    var x={gpa:a.gpa,grad:a.grad};
    if(j.auth==="citizen")f.push(a.auth==="citizen"?["ok","Citizen or permanent resident"]:a.auth?["bad","Not a citizen or permanent resident"]:["unk","Work authorization not given"]);
    else f.push(a.auth==="citizen"||a.auth==="authorized"?["ok","Authorized to work"]:a.auth==="none"?["bad","Not authorized to work"]:["unk","Work authorization not given"]);
    if(a.sponsor==="yes")f.push(j.sponsor==="no"?["bad","Needs sponsorship (you don't sponsor)"]:["unk","Needs sponsorship"]);
    if(j.gpa)f.push(x.gpa?(+x.gpa>=j.gpa?["ok","GPA "+x.gpa]:["bad","GPA "+x.gpa+" (below "+j.gpa+")"]):["unk","GPA not given"]);
    if(j.grad&&(j.grad[0]||j.grad[1]))f.push(x.grad?((!j.grad[0]||x.grad>=j.grad[0])&&(!j.grad[1]||x.grad<=j.grad[1])?["ok","Graduates "+fmtMonth(x.grad)]:["bad","Graduates "+fmtMonth(x.grad)+" (outside your window)"]):["unk","Graduation date not given"]);
    return f;
  }
  function meetsAll(a){return !appFlags(a,jobById(a.job)).some(function(f){return f[0]==="bad"})}
  function appCard(a){
    var j=jobById(a.job),have=(a.skills||[]).map(function(s){return String(s).toLowerCase()});
    var links=[["Resume",a.resume],["LinkedIn",a.linkedin],["Portfolio",a.portfolio]].filter(function(l){return /^https:\/\//.test(l[1]||"")});
    return '<div class="box app" data-app="'+esc(a.id)+'"><span class="av" aria-hidden="true">'+esc(initials(a.name))+'</span><div><h3>'+esc(a.name||"Applicant")+'</h3><div class="sub">'+esc([a.title,a.years?a.years+(+a.years===1?" year":" years"):"",a.edu].filter(Boolean).join(" · "))+(j?' · applied to <b>'+esc(j.role)+'</b>':'')+' · '+ago(a.at)+'</div></div>'+
      '<span class="mp '+tone(a.match)+'" title="Match score against this job">'+(a.match||0)+'%</span><div class="body">'+
      '<div class="kv">'+appFlags(a,j).map(function(f){return '<span class="flag '+f[0]+'">'+esc(f[1])+'</span>'}).join("")+'</div>'+
      ((a.school||a.major||a.grad)?'<div class="kv"><span>Education</span>'+esc([a.school,a.major,a.grad?"class of "+fmtMonth(a.grad):""].filter(Boolean).join(" · "))+'</div>':'')+
      (j&&j.skills.length?'<div class="kv"><span>Skills you asked for</span>'+j.skills.map(function(s){var ok=have.indexOf(s.toLowerCase())>-1;return '<span class="flag '+(ok?"ok":"unk")+'">'+(ok?"✓ ":"")+esc(s)+'</span>'}).join("")+'</div>':'')+
      (a.headline||a.summary?'<p class="note">'+esc(a.headline||a.summary)+'</p>':'')+
      (a.note?'<p class="note"><b>Their message:</b> '+esc(a.note)+'</p>':'')+
      '<div class="kv">'+(a.email?'<span>Email</span><b>'+esc(a.email)+'</b>':'')+(a.phone?'<span>Phone</span><b>'+esc(a.phone)+'</b>':'')+links.map(function(l){return '<a href="'+esc(l[1])+'" target="_blank" rel="noopener noreferrer">'+l[0]+' ↗</a>'}).join("")+'</div>'+
      '<div class="row" style="justify-content:flex-start"><label class="note" for="stg-'+esc(a.id)+'">Stage</label><select id="stg-'+esc(a.id)+'" data-stage="'+esc(a.id)+'" style="padding:7px 10px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--ink)">'+opt(STAGES,a.stage||"new")+'</select>'+
      '<input type="text" data-pnote="'+esc(a.id)+'" maxlength="1000" value="'+esc(a.private||"")+'" placeholder="Private note (only your team sees it)" aria-label="Private note" style="flex:1;min-width:180px;padding:7px 10px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--ink)"></div>'+
      '</div></div>';
  }
  function appsView(){
    var list=H.apps.filter(function(a){return (H.appJob==="all"||a.job===+H.appJob)&&(!H.mustOnly||meetsAll(a))});
    list.sort(H.sort==="match"?function(a,b){return (b.match||0)-(a.match||0)}:function(a,b){return b.at-a.at});
    return '<div><h1>Applicants</h1><p class="lead">Everyone who swiped right on your jobs, with what they agreed to share. Highest match first.</p></div>'+
      '<div class="box"><div class="row" style="justify-content:flex-start"><select id="aJob" aria-label="Job" style="padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink)">'+opt([["all","All jobs"]].concat(H.jobs.map(function(j){return [String(j.id),j.role]})),String(H.appJob))+'</select>'+
      '<select id="aSort" aria-label="Sort" style="padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink)">'+opt([["match","Best match first"],["new","Newest first"]],H.sort)+'</select>'+
      '<label class="ckline"><input type="checkbox" id="aMust"'+(H.mustOnly?" checked":"")+'> Only people who meet every must-have</label></div></div>'+
      (list.length?'<div class="apps">'+list.map(appCard).join("")+'</div>':'<div class="box empty"><b>No applicants '+(H.apps.length?"match these filters":"yet")+'</b>'+(H.mode==="local"?"To try it, switch to job search and swipe right on your own job.":"When someone swipes right on your job, they show up here.")+'</div>');
  }
  function saveStage(id,stage,note){
    var a=H.apps.filter(function(x){return x.id===id})[0];if(!a)return;
    if(stage)a.stage=stage;if(note!=null)a.private=note;
    if(H.mode==="server"){api("/api/employer/applicant",{id:id,stage:stage||undefined,note:note==null?undefined:note}).then(function(r){say(r.ok?"Saved.":(r.j.error||"Could not save."),r.ok?"good":"bad")});return}
    H.L.pipe=H.L.pipe||{};var cur=H.L.pipe[id]||{};if(stage)cur.stage=stage;if(note!=null)cur.note=note;H.L.pipe[id]=cur;saveLocal();say("Saved.","good");
  }

  /* ---- company ---- */
  function companyView(){
    var c=H.company||{country:"US"};
    return '<div><h1>'+(H.company?"Company profile":"Add your company")+'</h1><p class="lead">Shown on every job you post. Job seekers see it under About the company.</p></div>'+
      '<form id="cForm" novalidate style="display:flex;flex-direction:column;gap:16px"><fieldset><legend>Company</legend>'+
      '<div class="f full"><span class="l">Logo</span><div class="logoup">'+logoBox(c,true)+'<div style="display:flex;flex-direction:column;gap:6px"><input type="file" id="cLogoF" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG or WebP. Square works best; it is resized for you.</small>'+(c.logo?'<button type="button" class="linkish" data-act="rmlogo" style="align-self:flex-start">Remove logo</button>':'')+'<small class="err" id="cLogoF-err" role="alert"></small></div></div></div>'+
      F("cName","Company name",'<input type="text" id="cName" maxlength="100" value="'+esc(c.name||"")+'" autocomplete="organization">',{req:1,full:1})+
      F("cIndustry","Industry",'<select id="cIndustry">'+opt(INDUSTRIES,c.industry||"","Choose your industry")+'</select>',{req:1})+
      F("cSize","Number of employees",'<select id="cSize">'+opt(SIZES.map(function(s){return [s,s+" employees"]}),c.size||"","Choose a size")+'</select>',{req:1})+
      F("cCountry","Country",radios("cCountry",COUNTRIES,c.country||"US"),{req:1,full:1,group:1,hint:"UAply lists jobs in the United States and Canada."})+
      F("cRegion",'<span id="cRegionL">State</span>','<select id="cRegion"></select>',{hint:"Where your headquarters is."})+
      F("cCity","City",'<input type="text" id="cCity" maxlength="60" value="'+esc(c.city||"")+'" autocomplete="address-level2">')+
      F("cWebsite","Website",'<input type="text" id="cWebsite" inputmode="url" maxlength="300" value="'+esc(c.website||"")+'" placeholder="https://yourcompany.com">',{full:1})+
      F("cAbout","About the company",'<textarea id="cAbout" maxlength="1500" rows="6" placeholder="What you do, who you serve, and what it is like to work with you.">'+esc(c.about||"")+'</textarea><span class="cnt" id="cAboutN"></span>',{full:1})+
      '</fieldset><fieldset><legend>Applications</legend>'+
      '<div class="f full"><span class="l">Applications are sent to</span><b>'+(H.mode==="server"?esc(H.email)+(H.verified?' <span class="flag ok">Verified</span>':' <span class="flag unk">Not verified yet</span>'):'your account email (on the UAply server)')+'</b><small>Your UAply account email. It cannot be changed here, so applications always reach someone who proved they own the address.</small></div>'+
      '<div class="f full"><label class="ckline"><input type="checkbox" id="cConsent"'+(c.consent||H.company?" checked":"")+'> I may post jobs for this company, and I agree to receive applications through UAply. <span class="req" aria-hidden="true">*</span></label><small class="err" id="cConsent-err" role="alert"></small></div>'+
      '</fieldset><div class="pbar"><span class="note">You can change all of this later.</span><button type="submit" class="btn">Save company</button></div></form>';
  }
  function wireCompany(){
    var f=hub.querySelector("#cForm");
    function regions(){var country=(f.querySelector('input[name="cCountry"]:checked')||{}).value||"US",sel=f.querySelector("#cRegion"),cur=sel.value||(H.company||{}).region||"";sel.innerHTML=opt(REGIONS[country],cur,country==="CA"?"Choose a province":"Choose a state");f.querySelector("#cRegionL").textContent=country==="CA"?"Province":"State"}
    function n(){f.querySelector("#cAboutN").textContent=f.querySelector("#cAbout").value.length+" / 1500"}
    regions();n();
    f.addEventListener("change",function(e){if(e.target.name==="cCountry")regions();if(e.target.id==="cLogoF")readLogo(e.target.files&&e.target.files[0])});
    f.addEventListener("input",n);
    f.addEventListener("submit",function(e){e.preventDefault();saveCompany()});
  }
  function readLogo(file){
    if(!file)return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){showErr("logo","Use a PNG, JPEG or WebP image.");return}
    if(file.size>8*1024*1024){showErr("logo","That image is over 8 MB. Use a smaller one.");return}
    var rd=new w.FileReader();
    rd.onload=function(){
      var img=new w.Image();
      img.onload=function(){
        function shrink(max,type,q){var s=Math.min(1,max/Math.max(img.width,img.height)),cv=d.createElement("canvas");cv.width=Math.max(1,Math.round(img.width*s));cv.height=Math.max(1,Math.round(img.height*s));var cx=cv.getContext("2d");if(type==="image/jpeg"){cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height)}cx.drawImage(img,0,0,cv.width,cv.height);return cv.toDataURL(type,q)}
        var type=file.type==="image/jpeg"?"image/jpeg":"image/png",url=shrink(256,type,0.88);
        if(url.length>155000)url=shrink(160,"image/jpeg",0.85);
        if(url.length>155000){showErr("logo","That logo is too detailed. Try a simpler image.");return}
        H.pendingLogo=url;var box=hub.querySelector(".logoup .hlogo");if(box)box.innerHTML='<img src="'+url+'" alt="">';say("Logo ready. Save company to keep it.");
      };
      img.onerror=function(){showErr("logo","That file could not be read as an image.")};
      img.src=rd.result;
    };
    rd.readAsDataURL(file);
  }
  function saveCompany(){
    var f=hub.querySelector("#cForm");function v(id){return f.querySelector("#"+id).value.trim()}
    var p={name:v("cName").replace(/\s+/g," "),industry:v("cIndustry"),size:v("cSize"),country:(f.querySelector('input[name="cCountry"]:checked')||{}).value||"",region:v("cRegion"),city:v("cCity"),website:v("cWebsite"),about:v("cAbout"),consent:f.querySelector("#cConsent").checked};
    var bad=checkCompany(p);if(bad){showErr(bad[1],bad[0]);return}
    if(H.pendingLogo)p.logo=H.pendingLogo;else if(H.removeLogo)p.logo="remove";
    say("Saving…");
    if(H.mode==="server"){
      api("/api/employer/company",p).then(function(r){
        if(!r.ok){if(r.j.code==="verify"){say(r.j.error,"bad");return}showErr(r.j.field||"",r.j.error||"Could not save. Try again.");return}
        H.pendingLogo=null;H.removeLogo=false;load().then(function(){H.view=H.jobs.length?"overview":"post";H.edit=null;render();say("Company saved.","good");syncDeck()});
      });return;
    }
    var logo=H.pendingLogo||(H.removeLogo?"":(H.company&&H.company.logo)||"");
    H.company=Object.assign({},p,{logo:logo,consent:"Agreed in this browser on "+new Date().toISOString().slice(0,10)});
    H.pendingLogo=null;H.removeLogo=false;saveLocal();H.view=H.jobs.length?"overview":"post";H.edit=null;render();say("Company saved.","good");syncDeck();
  }

  /* ---- billing ---- */
  function billingView(){
    return '<div><h1>Billing</h1><p class="lead">Pricing for employers is TBD. Posting is free while UAply is in testing.</p></div>'+
      '<div class="box"><div class="row"><div><h2>Price to post a job</h2><p class="note">One price per job, shown before you publish.</p></div><span style="font:800 30px var(--display)">TBD</span></div>'+
      '<ul class="steps"><li><span class="ck on">✓</span>You see the exact price on the Publish button before anything is charged.</li><li><span class="ck on">✓</span>You pay once per job on Stripe\'s secure page. UAply never sees or stores your card number.</li><li><span class="ck on">✓</span>No pay-per-click and no automatic renewals: a job never costs more than the price you approved.</li><li><span class="ck on">✓</span>Every receipt is emailed and listed below.</li></ul></div>'+
      '<div class="box"><h2>Receipts</h2><p class="note">No payments yet.</p></div>';
  }

  /* ================= events ================= */
  hub.addEventListener("click",function(e){
    var b=e.target.closest("button,[data-view]");if(!b||!hub.contains(b))return;
    var view=b.getAttribute("data-view"),act=b.getAttribute("data-act"),id=b.getAttribute("data-id");
    if(view){if(view==="post"){H.edit=null}H.view=view;render();return}
    if(act==="signin"||act==="verify"){setMode(false,true);hdr.click();return}
    if(act==="new"){if(!H.company){H.view="company";render();say("Add your company first. It is shown on every job.");return}H.edit=null;H.view="post";render();return}
    if(act==="edit"){var j=jobById(id);H.edit=JSON.parse(JSON.stringify(j));H.view="post";render();return}
    if(act==="apps"){H.appJob=String(id);H.view="applicants";render();return}
    if(act==="rmlogo"){H.pendingLogo=null;H.removeLogo=true;var box=hub.querySelector(".logoup .hlogo");if(box)box.textContent=((H.company||{}).name||"?").charAt(0).toUpperCase();b.remove();say("Logo will be removed when you save.");return}
    if(act==="status"||act==="del"){
      var stt=act==="del"?"deleted":b.getAttribute("data-st"),jj=jobById(id);if(!jj)return;
      if(act==="del"&&b.getAttribute("data-sure")!=="1"){b.setAttribute("data-sure","1");b.textContent="Delete for good?";b.classList.remove("ghost");return}
      if(H.mode==="server"){api("/api/employer/job/status",{id:+id,status:stt}).then(function(r){if(!r.ok){say(r.j.error||"Could not change it.","bad");return}load().then(function(){render();say(stt==="deleted"?"Deleted.":stt==="open"?"Reopened. It is back in the swipe deck.":"Done. It no longer shows to new job seekers.","good");syncDeck()})});return}
      if(stt==="deleted")H.jobs=H.jobs.filter(function(x){return x!==jj});else{if(stt==="open"&&jj.status!=="open")jj.posted=Math.round(Date.now()/1000);jj.status=stt}
      saveLocal();H.apps=localApps();render();say(stt==="deleted"?"Deleted.":stt==="open"?"Reopened.":"Done. It no longer shows to new job seekers.","good");syncDeck();
    }
  });
  hub.addEventListener("change",function(e){
    var t=e.target;
    if(t.id==="aJob"){H.appJob=t.value;render();return}
    if(t.id==="aSort"){H.sort=t.value;render();return}
    if(t.id==="aMust"){H.mustOnly=t.checked;render();return}
    if(t.hasAttribute("data-stage")){saveStage(t.getAttribute("data-stage"),t.value,null);return}
    if(t.hasAttribute("data-pnote")){saveStage(t.getAttribute("data-pnote"),null,t.value.trim().slice(0,1000))}
  });

  paintSwitch(false);
  if(lsGet(MODE_K,"seek")==="hire")setMode(true,true);
}

Env.FEATURES.employers={name:"Hiring mode",note:"A \"Switch to hiring\" pill in the header opens the employer hub: company profile with logo, industry, size and country (United States or Canada), one-page job posting matched field by field to the job seeker's profile and filters, a hiring team contact, and an applicant pipeline. Employer jobs show their requirements and \"Meet the hiring team\" on the card. Prices are TBD. Needs Bottom navigation.",patch:patch,apply:apply};
Env.ORDER.push("employers");
})();
