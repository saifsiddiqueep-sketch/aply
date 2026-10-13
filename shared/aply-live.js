/* "live", "kit" and "submit" experiments for the sandbox and dev instances (never loaded by prod).
   live   : loads real postings from this server's /api/jobs (see jobs_api.py) and links every card to the original.
   kit    : after a swipe right on a real posting, a sheet with a ready-to-send note, Copy, an email draft and the
            employer's application page.
   submit : the sheet also delivers the application through this server (see apply_api.py): in test mode to a
            simulated recruiter inbox, in live mode by email to the recruiter after the user reviews and presses Send.
            Swipes in either direction are logged so you can see whether people actually swipe. */
(function(){
function once(src,a,b){if(src.indexOf(a)<0)throw new Error("patch target not found: "+a.slice(0,40));return src.replace(a,function(){return b})}
var MAX_CACHE=400,MAX_AGE=30*24*3600*1000;

function cacheKey(){return (window.__aplyBuildKey||"hireswipe")+".live"}
function readCache(){
  try{
    var c=JSON.parse(localStorage.getItem(cacheKey()));
    if(!c||!Array.isArray(c.jobs))return [];
    return c.jobs.filter(function(j){return j&&j.id>=100000&&Date.now()-(j.seen||0)<MAX_AGE});
  }catch(e){return []}
}
function writeCache(jobs){try{localStorage.setItem(cacheKey(),JSON.stringify({jobs:jobs.slice(-MAX_CACHE)}))}catch(e){}}

/* ---------------- live ---------------- */
function patch(s){
  var cached=readCache();
  var extra=cached.length?","+JSON.stringify(cached).slice(1,-1).replace(/<\//g,"<\\/"):"";
  s=once(s,'regional cookbooks."}','regional cookbooks."}'+extra);
  s=once(s,"var JOB_BY_ID={};JOBS.forEach(function(j){JOB_BY_ID[j.id]=j});",
    "var JOB_BY_ID={};JOBS.forEach(function(j){JOB_BY_ID[j.id]=j});\nwindow.__aplyJobs={add:function(list){var n=0;list.forEach(function(j){if(!JOB_BY_ID[j.id]){JOBS.push(j);JOB_BY_ID[j.id]=j;n++}else{var o=JOB_BY_ID[j.id];if(j.posted)o.posted=j.posted;if(j.perks)o.perks=j.perks;if(j.type)o.type=j.type;o.comm=!!j.comm}});renderAll();return n}};\n"+
    /* Links open as real anchor clicks (a user gesture), which popup blockers accept; window.open can be refused silently. */
    "window.__aplyOpen=function(u){if(!/^https:\\/\\//.test(u||\"\"))return;var a=document.createElement(\"a\");a.href=u;a.target=\"_blank\";a.rel=\"noopener noreferrer\";document.body.appendChild(a);a.click();a.remove()};");
  s=once(s,"return !S.decisions[j.id]&&","return !S.decisions[j.id]&&(j.live||!window.__aplyHideSamples)&&");
  s=once(s,"'+money(j.sal[0])+'–'+money(j.sal[1])+'<small>per year</small>","'+(j.sal[1]>0?money(j.sal[0])+'–'+money(j.sal[1])+'<small>per year</small>':'Pay not listed')+'");
  s=once(s,"var salOk=job.sal[1]>=p.salary;","var unk=job.sal[1]<=0;var salOk=unk||job.sal[1]>=p.salary;");
  s=once(s,'s:salOk?1:(sa>=0.9?0.5:0),ask:money(job.sal[0])+" to "+money(job.sal[1])','s:unk?0.5:salOk?1:(sa>=0.9?0.5:0),ask:unk?"Not listed":money(job.sal[0])+" to "+money(job.sal[1])');
  s=once(s,"<p class=\"blurb\">'+esc(j.blurb)+'</p>","<p class=\"blurb\">'+esc(j.blurb)+'</p>'+(j.url?'<button type=\"button\" class=\"linkbtn\" data-open=\"'+esc(j.url)+'\">View posting on '+esc(j.source||'the company site')+' ↗</button>':'')+'");
  s=once(s,'toast(dir==="applied"?"Applied to "+job.co+" · "+m.pct+"% match":"Passed on "+job.co,"Undo",undo);',
    'if(dir==="applied"&&job.url&&!window.__aplyOnApplied){toast("Saved "+job.co+" · "+m.pct+"% match. Finish on their site.","Open",function(){window.__aplyOpen(job.url)})}else{toast(dir==="applied"?"Saved "+job.co+" to Applied · "+m.pct+"% match":"Passed on "+job.co,"Undo",undo)}');
  return s;
}

function apply(w,host){
  var d=w.document;
  function open(url){if(w.__aplyOpen)w.__aplyOpen(url)}
  d.addEventListener("pointerdown",function(e){
    var b=e.target.closest&&e.target.closest("[data-open]");
    if(b){e.stopPropagation();e.preventDefault();open(b.getAttribute("data-open"))}
  },true);
  d.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest("[data-open]");
    if(b&&e.detail===0)open(b.getAttribute("data-open"));
  },true);

  var el=host&&(host.getElementById("note")||host.getElementById("what"));
  function say(m){if(el)el.textContent=m}
  say("Loading real postings…");
  return fetch("/api/jobs").then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(data){
    var now=Date.now(),fresh=(data.jobs||[]).map(function(j){j.seen=now;return j});
    if(fresh.length>=5)w.__aplyHideSamples=true;      /* set before adding, so the deck renders once */
    var added=w.__aplyJobs.add(fresh);
    var all=readCache(),ids={};all.forEach(function(j){ids[j.id]=1});
    var byId={};fresh.forEach(function(j){byId[j.id]=j;if(!ids[j.id])all.push(j)});
    all.forEach(function(c){var f=byId[c.id];if(f){c.posted=f.posted;c.perks=f.perks;c.type=f.type;c.comm=!!f.comm}});   /* keep saved copies current */
    writeCache(all);
    var src=Object.keys(data.sources||{}).map(function(k){return k+": "+data.sources[k]}).join(" · ");
    say("Real postings: "+fresh.length+" loaded ("+added+" new). "+src);
  }).catch(function(e){say("Could not load real postings ("+e.message+"). Showing the example jobs.")});
}

/* ---------------- kit + submit ---------------- */
function kitPatch(s){
  if(s.indexOf("__aplyOnDecision")>-1)return s;
  return once(s,"S.history.push(id);S.tips=false;save();busy=false;renderAll();",
    "S.history.push(id);S.tips=false;save();busy=false;renderAll();if(window.__aplyOnDecision)window.__aplyOnDecision(dir,job,m,S.profile,undo,S,save);");
}

function kitApply(w,host){
  var d=w.document;
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  var EMAIL=/^[^@\s]{1,64}@[^@\s]+\.[A-Za-z]{2,}$/;
  function session(){
    try{var k="aply.session",v=w.localStorage.getItem(k);if(!v){v=Math.random().toString(36).slice(2)+Date.now().toString(36);w.localStorage.setItem(k,v)}return v}catch(e){return "anon"}
  }
  function post(path,body){
    return w.fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})});
  }
  function note(job,m,p){
    var skills=(m.matched||[]).slice(0,5).join(", "),name=p.name||"[Your name]";
    var intro="I'm "+(p.title?"a "+p.title:"a candidate")+(p.years?" with "+p.years+" years of experience":"")+(skills?", and my background includes "+skills:"")+".";
    var where=p.loc?" I'm based in "+p.loc+".":"";
    return "Hi "+job.co+" team,\n\nI'm interested in the "+job.role+" role"+(job.loc?" ("+job.loc+")":"")+". "+intro+where+" I'd welcome the chance to talk.\n\nThank you for your time,\n"+name;
  }
  function copy(text,btn){
    function done(){btn.textContent="Copied";setTimeout(function(){btn.textContent="Copy note"},1500)}
    function fallback(){var t=d.getElementById("kitText");t.select();try{d.execCommand("copy");done()}catch(e){}}
    if(w.navigator.clipboard&&w.navigator.clipboard.writeText){w.navigator.clipboard.writeText(text).then(done,fallback)}else fallback();
  }

  function sheet(job,m,p,undo,S,save){
    if(!job.url||d.getElementById("kitSheet"))return;
    var submitOn=!!w.__aplySubmitOn&&!!w.__aplyMode,mode=w.__aplyMode,live=mode==="live";
    var contact=job.contact||"",profileOk=!!(p.name&&EMAIL.test(p.email||"")&&(!live||p.custom));
    var o=d.createElement("div");o.id="kitSheet";
    o.style.cssText="position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.45);overflow:auto";
    var intro=!submitOn
      ?'Saved to your Applied list. Aply does not send applications for you: '+esc(job.co)+' only accepts them on its own page'+(contact?'':', and the posting does not list a recruiter email')+'. Here is a note and the quickest way to finish.'
      :(live
        ?(w.__aplyRedirect
          ?'<b>Test redirect.</b> Pressing Send emails this application to <b>'+esc(w.__aplyRedirect)+'</b> instead of the recruiter. Replies go to your email.'
          :'Review your application. Pressing Send emails it to the recruiter'+(contact?' at <b>'+esc(contact)+'</b>':'')+', and replies go to your email.'+(contact?'':' This posting lists no recruiter email, so Aply cannot email it: use the application page instead.'))
        :'<b>Test mode.</b> Your application was delivered to a simulated recruiter inbox on this computer. Nothing was sent to '+esc(job.co)+'.');
    o.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="kitH" style="background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:20px;max-width:460px;width:100%;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:12px">'+
      '<h2 id="kitH" style="margin:0;font:800 20px var(--display)">'+(submitOn&&!live?'Sending to ':'Finish applying to ')+esc(job.co)+'</h2>'+
      '<p style="margin:0;color:var(--muted);font-size:14px">'+intro+'</p>'+
      (!p.custom?'<p style="margin:0;color:var(--mid);font-size:13px">This uses the example profile. Add your own details in Profile first.</p>':'')+
      (submitOn&&!profileOk?'<p style="margin:0;color:var(--no);font-size:13px">Add your name and a valid email in Profile, Settings so the recruiter can reply.</p>':'')+
      '<textarea id="kitText" rows="7" aria-label="Application note" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font:inherit;resize:vertical"></textarea>'+
      '<p id="kitStatus" role="status" style="margin:0;font-size:13.5px;font-weight:600;min-height:1.3em"></p>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        (submitOn&&live?'<button type="button" class="btn" id="kitSend"'+((!profileOk||!(contact||w.__aplyRedirect))?' disabled':'')+'>Send application</button>':'')+
        (submitOn&&!profileOk?'<button type="button" class="btn" id="kitProfile">Open Profile</button>':'')+
        '<button type="button" class="btn'+(submitOn&&live&&contact?' ghost':'')+'" id="kitOpen">Open application page ↗</button>'+
        '<button type="button" class="btn ghost" id="kitCopy">Copy note</button>'+
        (w.__aplyAnswers?'<button type="button" class="btn ghost" id="kitAnswers">Copy my answers</button>':'')+
        '<button type="button" class="btn ghost" id="kitMail">Email draft</button>'+
        (submitOn&&!live?'<a class="linkbtn" href="/outbox" target="_blank" rel="noopener noreferrer" style="align-self:center">View test inbox ↗</a>':'')+
      '</div>'+
      '<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><button type="button" class="linkbtn" id="kitUndo">Undo, do not save</button><button type="button" class="btn ghost" id="kitDone">Done</button></div></div>';
    d.body.appendChild(o);
    var ta=d.getElementById("kitText"),statusEl=d.getElementById("kitStatus"),undoBtn=d.getElementById("kitUndo");
    ta.value=(w.__aplyAutoMsg&&w.__aplyAutoMsg()&&w.__aplyMessage)?w.__aplyMessage(job,m,p):note(job,m,p);
    var tm=0;
    function close(){clearInterval(tm);o.remove()}
    function setStatus(t,bad){statusEl.textContent=t;statusEl.style.color=bad?"var(--no)":"var(--yes)"}
    function send(){
      clearInterval(tm);
      var sendBtn=d.getElementById("kitSend");if(sendBtn)sendBtn.disabled=true;
      setStatus("Sending…");
      post("/api/apply",{consent:true,confirm_real:live,match:m.pct,note:ta.value,
        job:{id:job.id,co:job.co,role:job.role,url:job.url,source:job.source,loc:job.loc,contact:contact},
        profile:{name:p.name,email:p.email,title:p.title,years:p.years,skills:p.skills,loc:p.loc,edu:p.edu}
      }).then(function(r){
        var j=r.j||{};
        if(!r.ok){setStatus(j.error||"Could not send.",true);if(sendBtn&&live)sendBtn.disabled=false;return}
        var dec=S&&S.decisions&&S.decisions[job.id];
        if(dec&&j.status!=="duplicate"){dec.sent={at:Date.now(),to:j.to||"",status:j.status};if(save)save()}
        if(j.status==="delivered_test")setStatus("Delivered to the test inbox as "+(j.to||"recruiter")+".");
        else if(j.status==="sent")setStatus("Sent to "+j.to+". Replies go to "+p.email+".");
        else if(j.status==="duplicate")setStatus("You already sent this application.");
        else if(j.status==="handoff")setStatus("This employer takes applications on its own page. Use the button below.");
        else if(j.status==="failed"){setStatus(j.error||"The email could not be sent.",true);if(sendBtn)sendBtn.disabled=false;return}
        else setStatus("Done.");
        var rc=j.receipt,au=w.__aplyAuth?w.__aplyAuth():null;
        if(rc)statusEl.textContent+=" "+({sent:"A receipt was emailed to "+rc.to+".",delivered_test:"Your receipt for "+rc.to+" is in the test inbox.",not_configured:"No receipt was emailed: email sending is not set up yet.",failed:"The receipt email to "+rc.to+" could not be sent."}[rc.status]||"");
        else if(au&&au.up&&!au.user)statusEl.textContent+=" Sign in (top right) to get an email receipt.";
        if(j.status!=="handoff")undoBtn.hidden=true;
        if(sendBtn&&(j.status==="sent"||j.status==="duplicate"))sendBtn.hidden=true;
      }).catch(function(){setStatus("Could not reach the server.",true);if(sendBtn)sendBtn.disabled=false});
    }
    var sendBtn=d.getElementById("kitSend");if(sendBtn)sendBtn.onclick=send;
    var pb=d.getElementById("kitProfile");
    if(pb)pb.onclick=function(){close();var b=d.getElementById("nb-prof");if(b){b.click();var it=d.querySelector('.nwrap[data-k=prof] .nitem[data-v=settings]');if(it)it.click()}};
    d.getElementById("kitOpen").onclick=function(){if(w.__aplyOpen)w.__aplyOpen(job.url)};
    d.getElementById("kitCopy").onclick=function(){copy(ta.value,this)};
    var ansBtn=d.getElementById("kitAnswers");
    if(ansBtn)ansBtn.onclick=function(){
      var b=this,t=w.__aplyAnswers();
      function done(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy my answers"},1500)}
      if(w.navigator.clipboard&&w.navigator.clipboard.writeText)w.navigator.clipboard.writeText(t).then(done,function(){setStatus("Copy was blocked by the browser.",true)});else setStatus("Copy is not available here.",true);
    };
    d.getElementById("kitMail").onclick=function(){
      var a=d.createElement("a");a.href="mailto:"+encodeURIComponent(contact).replace("%40","@")+"?subject="+encodeURIComponent("Application: "+job.role)+"&body="+encodeURIComponent(ta.value);
      d.body.appendChild(a);a.click();a.remove();
    };
    d.getElementById("kitDone").onclick=close;
    undoBtn.onclick=function(){close();undo()};
    o.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
    (d.getElementById("kitSend")&&!d.getElementById("kitSend").disabled?d.getElementById("kitSend"):d.getElementById("kitOpen")).focus();
    if(submitOn&&!live&&profileOk)send();   /* test mode: swipe right delivers immediately */
    else if(submitOn&&!live&&!profileOk)setStatus("Not sent yet: your profile needs a name and email.",true);
    else if(submitOn&&live&&profileOk&&(contact||w.__aplyRedirect)&&w.__aplyAutoMsg&&w.__aplyAutoMsg()){
      var left=5;setStatus("Sending your message in "+left+"… tap Undo to stop.");
      tm=setInterval(function(){left--;if(left>0){setStatus("Sending your message in "+left+"… tap Undo to stop.");return}clearInterval(tm);send()},1000);
    }
  }

  w.__aplyOnApplied=sheet;   /* also tells the live patch not to show its own toast */
  w.__aplyOnDecision=function(dir,job,m,p,undo,S,save){
    if(w.__aplySubmitOn&&w.__aplyMode){
      post("/api/decision",{session:session(),dir:dir==="applied"?"apply":"pass",jobId:job.id,co:job.co,role:job.role,pct:m.pct}).catch(function(){});
    }
    if(dir==="applied"&&job.url)sheet(job,m,p,undo,S,save);
  };
}

function submitApply(w){
  w.__aplySubmitOn=true;
  return w.fetch("/api/apply/config").then(function(r){return r.json()}).then(function(c){w.__aplyMode=c.mode==="live"?"live":"test";w.__aplyRedirect=c.redirect||""}).catch(function(){});
}

window.AplyLive={patch:patch,apply:apply,kit:{patch:kitPatch,apply:kitApply},submit:{apply:submitApply}};
})();
