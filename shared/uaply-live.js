/* "live", "kit" and "submit" experiments for the sandbox and dev instances (never loaded by prod).
   live   : loads real postings from this server's /api/jobs (see jobs_api.py) and links every card to the original.
   kit    : after a swipe right on a real posting, a sheet with a ready-to-send note, Copy, an email draft and the
            employer's application page.
   submit : the sheet also delivers the application through this server (see uaply_api.py): in test mode to a
            simulated recruiter inbox, in live mode by email to the recruiter after the user reviews and presses Send.
            Swipes in either direction are logged so you can see whether people actually swipe. */
(function(){
function once(src,a,b){if(src.indexOf(a)<0)throw new Error("patch target not found: "+a.slice(0,40));return src.replace(a,function(){return b})}
var MAX_CACHE=400,MAX_AGE=30*24*3600*1000;

function cacheKey(){return (window.__uaplyBuildKey||"hireswipe")+".live"}
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
    "var JOB_BY_ID={};JOBS.forEach(function(j){JOB_BY_ID[j.id]=j});\nwindow.__uaplyJobs={add:function(list){var n=0;list.forEach(function(j){if(!JOB_BY_ID[j.id]){JOBS.push(j);JOB_BY_ID[j.id]=j;n++}else{var o=JOB_BY_ID[j.id];if(j.posted)o.posted=j.posted;if(j.perks)o.perks=j.perks;if(j.type)o.type=j.type;o.comm=!!j.comm}});renderAll();return n}};\n"+
    /* Links open as real anchor clicks (a user gesture), which popup blockers accept; window.open can be refused silently. */
    "window.__uaplyOpen=function(u){if(!/^https:\\/\\//.test(u||\"\"))return;var a=document.createElement(\"a\");a.href=u;a.target=\"_blank\";a.rel=\"noopener noreferrer\";document.body.appendChild(a);a.click();a.remove()};");
  s=once(s,"return !S.decisions[j.id]&&","return !S.decisions[j.id]&&(j.live||!window.__uaplyHideSamples)&&");
  s=once(s,"'+money(j.sal[0])+'–'+money(j.sal[1])+'<small>per year</small>","'+(j.sal[1]>0?money(j.sal[0])+'–'+money(j.sal[1])+'<small>per year</small>':'Pay not listed')+'");
  s=once(s,"var salOk=job.sal[1]>=p.salary;","var unk=job.sal[1]<=0;var salOk=unk||job.sal[1]>=p.salary;");
  s=once(s,'s:salOk?1:(sa>=0.9?0.5:0),ask:money(job.sal[0])+" to "+money(job.sal[1])','s:unk?0.5:salOk?1:(sa>=0.9?0.5:0),ask:unk?"Not listed":money(job.sal[0])+" to "+money(job.sal[1])');
  /* every real listing names its source and links to the original; example listings say they are examples */
  s=once(s,"<p class=\"blurb\">'+esc(j.blurb)+'</p>","<p class=\"blurb\">'+esc(j.blurb)+'</p>'+(j.url?'<button type=\"button\" class=\"linkbtn\" data-open=\"'+esc(j.url)+'\">View original posting ↗</button>':'')+(j.live?'<small class=\"note\">Source: '+esc(j.source||'the employer')+'</small>':'<small class=\"note\">Example listing, not a real opening.</small>')+'");
  s=once(s,'toast(dir==="applied"?"Applied to "+job.co+" · "+m.pct+"% match":"Passed on "+job.co,"Undo",undo);',
    'if(dir==="applied"&&(job.live||window.__uaplyMode==="test")&&window.__uaplyQuiet&&window.__uaplySubmitOn){}else if(dir==="applied"&&job.url&&!window.__uaplyOnApplied){toast("Saved "+job.co+" · "+m.pct+"% match. Finish on their site.","Open",function(){window.__uaplyOpen(job.url)})}else{toast(dir==="applied"?"Saved "+job.co+" to Applied · "+m.pct+"% match":"Passed on "+job.co,"Undo",undo)}');
  return s;
}

function apply(w,host){
  var d=w.document;
  function open(url){if(w.__uaplyOpen)w.__uaplyOpen(url)}
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
  var REL=!!((host&&host.defaultView&&host.defaultView.UAplyOpts)||{}).release;
  if(REL){            /* a release build never shows the made-up example listings, not even while the real ones load or if they fail to */
    w.__uaplyHideSamples=true;w.__uaplyLoadingJobs=true;
    try{w.__uaply.renderAll()}catch(e){}
  }
  say("Loading real postings…");
  return fetch("/api/jobs").then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(data){
    w.__uaplyLoadingJobs=false;
    var now=Date.now(),fresh=(data.jobs||[]).map(function(j){j.seen=now;return j});
    if(fresh.length>=5)w.__uaplyHideSamples=true;      /* set before adding, so the deck renders once */
    var added=w.__uaplyJobs.add(fresh);
    var all=readCache(),ids={};all.forEach(function(j){ids[j.id]=1});
    var byId={};fresh.forEach(function(j){byId[j.id]=j;if(!ids[j.id])all.push(j)});
    all.forEach(function(c){var f=byId[c.id];if(f){c.posted=f.posted;c.perks=f.perks;c.type=f.type;c.comm=!!f.comm}});   /* keep saved copies current */
    writeCache(all);
    var src=Object.keys(data.sources||{}).map(function(k){return k+": "+data.sources[k]}).join(" · ");
    say("Real postings: "+fresh.length+" loaded ("+added+" new). "+src);
  }).catch(function(e){w.__uaplyLoadingJobs=false;if(REL)w.__uaplyJobsFailed=true;if(REL){try{w.__uaply.renderAll()}catch(x){}}say(REL?"Could not load jobs ("+e.message+"). Check your connection and try again.":"Could not load real postings ("+e.message+"). Showing the example jobs.")});
}

/* ---------------- kit + submit ---------------- */
function kitPatch(s){
  if(s.indexOf("__uaplyOnDecision")>-1)return s;
  return once(s,"S.history.push(id);S.tips=false;save();busy=false;renderAll();",
    "S.history.push(id);S.tips=false;save();busy=false;renderAll();if(window.__uaplyOnDecision)window.__uaplyOnDecision(dir,job,m,S.profile,undo,S,save);");
}

function kitApply(w,host){
  var d=w.document;
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  var EMAIL=/^[^@\s]{1,64}@[^@\s]+\.[A-Za-z]{2,}$/;
  function session(){
    try{var k="uaply.session",v=w.localStorage.getItem(k);if(!v){v=Math.random().toString(36).slice(2)+Date.now().toString(36);w.localStorage.setItem(k,v)}return v}catch(e){return "anon"}
  }
  function post(path,body){
    return w.fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})});
  }
  /* contact lines under the note, from the Application profile experiment (empty if it is off) */
  function signature(p){
    var x=p.ext||{},rows=[];
    if(x.phone)rows.push("Phone: "+x.phone);
    if(p.email)rows.push("Email: "+p.email);
    if(x.linkedin)rows.push("LinkedIn: "+x.linkedin);
    if(x.portfolio)rows.push("Portfolio: "+x.portfolio);
    if(x.resume)rows.push("Resume: "+x.resume);
    return rows.length?"\n\n"+rows.join("\n"):"";
  }
  function note(job,m,p){
    var skills=(m.matched||[]).slice(0,5).join(", "),name=p.name||"[Your name]";
    var tpl=p.ext&&typeof p.ext.noteTpl==="string"?p.ext.noteTpl.trim():"";
    if(tpl){
      var vals={company:job.co,role:job.role,name:name,title:p.title||"candidate",years:p.years||0,skills:skills||(p.skills||[]).slice(0,5).join(", "),city:p.loc||""};
      return tpl.replace(/\{(company|role|name|title|years|skills|city)\}/g,function(_,k){return vals[k]})+"\n\n"+name+signature(p);
    }
    var intro="I'm "+(p.title?"a "+p.title:"a candidate")+(p.years?" with "+p.years+" years of experience":"")+(skills?", and my background includes "+skills:"")+".";
    var where=p.loc?" I'm based in "+p.loc+".":"";
    return "Hi "+job.co+" team,\n\nI'm interested in the "+job.role+" role"+(job.loc?" ("+job.loc+")":"")+". "+intro+where+" I'd welcome the chance to talk.\n\nThank you for your time,\n"+name+signature(p);
  }
  function copy(text,btn){
    function done(){btn.textContent="Copied";setTimeout(function(){btn.textContent="Copy note"},1500)}
    function fallback(){var t=d.getElementById("kitText");t.select();try{d.execCommand("copy");done()}catch(e){}}
    if(w.navigator.clipboard&&w.navigator.clipboard.writeText){w.navigator.clipboard.writeText(text).then(done,fallback)}else fallback();
  }

  function sheet(job,m,p,undo,S,save){
    if(!job.url||d.getElementById("kitSheet"))return;
    var submitOn=!!w.__uaplySubmitOn&&!!w.__uaplyMode,mode=w.__uaplyMode,live=mode==="live";
    /* ask = show a review screen with a Send button first. Always in live mode; in test mode only where the page opts in (sandbox). */
    var auto=live&&w.__uaplyAuto!==false;     /* live + auto_send (the default): swipe right sends by itself after a short undo window */
    var ask=(live&&!auto)||!!((host&&host.defaultView&&host.defaultView.UAplyOpts)||{}).reviewBeforeSend;
    var target=(live&&w.__uaplyRedirect)||job.contact||"";
    var contact=job.contact||"",profileOk=!!(p.name&&EMAIL.test(p.email||"")&&(!live||p.custom));
    var o=d.createElement("div");o.id="kitSheet";
    o.style.cssText="position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.45);overflow:auto";
    var intro=!submitOn
      ?'Saved to your Applied list. UAply does not send applications for you: '+esc(job.co)+' only accepts them on its own page'+(contact?'':', and the posting does not list a recruiter email')+'. Here is a note and the quickest way to finish.'
      :(live&&auto
        ?(target
          ?'<b>'+(w.__uaplyRedirect?'Test redirect. ':'')+'Applying automatically.</b> Your application will be emailed to <b>'+esc(target)+'</b> in a few seconds. Press Undo to cancel. Replies go to your email.'
          :'This posting lists no recruiter email, so UAply cannot email it. Use the application page below to apply on the employer\'s site.')
      :(live
        ?(w.__uaplyRedirect
          ?'<b>Test redirect.</b> Pressing Send emails this application to <b>'+esc(w.__uaplyRedirect)+'</b> instead of the recruiter. Replies go to your email.'
          :'Review your application. Pressing Send emails it to the recruiter'+(contact?' at <b>'+esc(contact)+'</b>':'')+', and replies go to your email.'+(contact?'':' This posting lists no recruiter email, so UAply cannot email it: use the application page instead.'))
        :(ask
          ?'<b>Test mode.</b> Review the note, then press Send. It goes to a simulated recruiter inbox on this computer; nothing is sent to '+esc(job.co)+'.'
          :'<b>Test mode.</b> Your application was delivered to a simulated recruiter inbox on this computer. Nothing was sent to '+esc(job.co)+'.')));
    o.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="kitH" style="background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:20px;max-width:460px;width:100%;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:12px">'+
      '<h2 id="kitH" style="margin:0;font:800 20px var(--display)">'+(submitOn&&!ask?'Sending to ':'Finish applying to ')+esc(job.co)+'</h2>'+
      '<p style="margin:0;color:var(--muted);font-size:14px">'+intro+'</p>'+
      (!p.custom?'<p style="margin:0;color:var(--mid);font-size:13px">This uses the example profile. Add your own details in Profile first.</p>':'')+
      (submitOn&&!profileOk?'<p style="margin:0;color:var(--no);font-size:13px">Add your name and a valid email in Profile, Settings so the recruiter can reply.</p>':'')+
      '<textarea id="kitText" rows="7" aria-label="Application note" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font:inherit;resize:vertical"></textarea>'+
      '<p id="kitStatus" role="status" style="margin:0;font-size:13.5px;font-weight:600;min-height:1.3em"></p>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        (submitOn&&ask?'<button type="button" class="btn" id="kitSend"'+((!profileOk||(live&&!(contact||w.__uaplyRedirect)))?' disabled':'')+'>Send application</button>':'')+
        (submitOn&&!profileOk?'<button type="button" class="btn" id="kitProfile">Open Profile</button>':'')+
        '<button type="button" class="btn'+(submitOn&&ask?' ghost':'')+'" id="kitOpen">Open application page ↗</button>'+
        '<button type="button" class="btn ghost" id="kitCopy">Copy note</button>'+
        (w.__uaplyAnswers?'<button type="button" class="btn ghost" id="kitAnswers">Copy my answers</button>':'')+
        '<button type="button" class="btn ghost" id="kitMail">Email draft</button>'+
        (submitOn&&!live?'<a class="linkbtn" href="/outbox" target="_blank" rel="noopener noreferrer" style="align-self:center">View test inbox ↗</a>':'')+
      '</div>'+
      '<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><button type="button" class="linkbtn" id="kitUndo">Undo, do not save</button><button type="button" class="btn ghost" id="kitDone">Done</button></div></div>';
    d.body.appendChild(o);
    var ta=d.getElementById("kitText"),statusEl=d.getElementById("kitStatus"),undoBtn=d.getElementById("kitUndo");
    ta.value=(w.__uaplyAutoMsg&&w.__uaplyAutoMsg()&&w.__uaplyMessage)?w.__uaplyMessage(job,m,p):note(job,m,p);
    var cancelled=false,tm=0;
    function close(){clearInterval(tm);o.remove()}
    function setStatus(t,bad){statusEl.textContent=t;statusEl.style.color=bad?"var(--no)":"var(--yes)"}
    function send(){
      clearInterval(tm);
      var sendBtn=d.getElementById("kitSend");if(sendBtn)sendBtn.disabled=true;
      setStatus("Sending…");
      post("/api/apply",{consent:true,confirm_real:live,match:m.pct,note:ta.value,
        job:{id:job.id,co:job.co,role:job.role,url:job.url,source:job.source,loc:job.loc,contact:contact,mode:job.mode,type:job.type||"job",sal:job.sal,blurb:job.blurb},
        profile:{name:p.name,email:p.email,title:p.title,years:p.years,skills:p.skills,loc:p.loc,edu:p.edu,ext:(w.__uaplyApplyExt?w.__uaplyApplyExt():(p.ext||{}))},
        resume:(w.__uaplyResume?w.__uaplyResume():null)
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
        var rc=j.receipt,au=w.__uaplyAuth?w.__uaplyAuth():null;
        if(rc)statusEl.textContent+=" "+({sent:"Confirmation emailed to "+rc.to+".",delivered_test:testInboxNote(),not_configured:(isRelease?"":"No confirmation email: email sending is not set up yet."),failed:"The confirmation email to "+rc.to+" could not be sent."}[rc.status]||"");
        else if(au&&au.up&&!au.user)statusEl.textContent+=" Sign in to get a confirmation email.";
        if(j.status!=="handoff")undoBtn.hidden=true;
        if(sendBtn&&(j.status==="sent"||j.status==="delivered_test"||j.status==="duplicate"))sendBtn.hidden=true;
      }).catch(function(){setStatus("Could not reach the server.",true);if(sendBtn)sendBtn.disabled=false});
    }
    var sendBtn=d.getElementById("kitSend");if(sendBtn)sendBtn.onclick=send;
    var pb=d.getElementById("kitProfile");
    if(pb)pb.onclick=function(){close();var b=d.getElementById("nb-prof");if(b){b.click();var it=d.querySelector('.nwrap[data-k=prof] .nitem[data-v=settings]');if(it)it.click()}};
    d.getElementById("kitOpen").onclick=function(){if(w.__uaplyOpen)w.__uaplyOpen(job.url)};
    d.getElementById("kitCopy").onclick=function(){copy(ta.value,this)};
    var ansBtn=d.getElementById("kitAnswers");
    if(ansBtn)ansBtn.onclick=function(){
      var b=this,t=w.__uaplyAnswers();
      function done(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy my answers"},1500)}
      if(w.navigator.clipboard&&w.navigator.clipboard.writeText)w.navigator.clipboard.writeText(t).then(done,function(){setStatus("Copy was blocked by the browser.",true)});else setStatus("Copy is not available here.",true);
    };
    d.getElementById("kitMail").onclick=function(){
      var a=d.createElement("a");a.href="mailto:"+encodeURIComponent(contact).replace("%40","@")+"?subject="+encodeURIComponent("Application: "+job.role)+"&body="+encodeURIComponent(ta.value);
      d.body.appendChild(a);a.click();a.remove();
    };
    d.getElementById("kitDone").onclick=close;
    undoBtn.onclick=function(){cancelled=true;close();undo()};
    o.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
    (d.getElementById("kitSend")&&!d.getElementById("kitSend").disabled?d.getElementById("kitSend"):d.getElementById("kitOpen")).focus();
    if(submitOn&&!ask&&profileOk){
      if(!live||!target)send();          /* test mode, or nothing to email: record it now */
      else{                              /* live: send by itself after a short window in which Undo cancels it */
        var left=Math.max(0,w.__uaplyGrace||0),timer=null;
        var tick=function(){
          if(cancelled){clearInterval(timer);return}
          if(left<=0){clearInterval(timer);send();return}
          setStatus("Sending to "+target+" in "+left+" second"+(left===1?"":"s")+". Press Undo to cancel.");left--;
        };
        timer=setInterval(tick,1000);tick();
      }
    }
    else if(submitOn&&!ask&&!profileOk)setStatus("Not sent yet: your profile needs a name and email.",true);
  }

  /* ---- quiet apply: a swipe right is the whole action, like pressing Submit application ---- */
  var isRelease=!!((host&&host.defaultView&&host.defaultView.UAplyOpts)||{}).release;
  /* with no real email connected yet, a confirmation is only saved in the test inbox page of the owner's own server: say where. A hosted server has none, so say nothing. */
  function testInboxNote(){
    if(!w.__uaplyTestInbox)return isRelease?"":"Confirmation saved in the test inbox.";
    var origin="";try{origin=host.defaultView.location.origin}catch(e){}
    return "Confirmation is in the test inbox: "+origin+w.__uaplyTestInbox;
  }
  var showSheet=!!((host&&host.defaultView&&host.defaultView.UAplyOpts)||{}).showSheet;   /* opt back in to the full sheet */
  function toast(msg,action,fn,ms){
    var old=d.getElementById("kitToast");if(old)old.remove();
    w.clearTimeout(w.__kitToastT);
    var t=d.createElement("div");t.id="kitToast";t.className="toast";t.setAttribute("role","status");
    var s=d.createElement("span");s.textContent=msg;t.appendChild(s);
    if(action){var b=d.createElement("button");b.type="button";b.textContent=action;b.onclick=fn;t.appendChild(b)}
    d.body.appendChild(t);
    if(ms!==0)w.__kitToastT=w.setTimeout(function(){t.remove()},ms||6000);
    return {el:t,set:function(x){s.textContent=x}};
  }
  /* first application only: say plainly what a swipe right does with the person's details, and get agreement */
  var CONSENT_V=2;   /* 2: also explains the optional hiring-manager message and that voluntary answers are never sent */
  function legalBase(){var p=(host&&host.defaultView&&host.defaultView.location.pathname)||"/";return /\/(sandbox|dev)\/$/.test(p)?"../legal/":"legal/"}
  function consentKey(){return (w.__uaplyKey||"uaply")+".consent"}
  function ensureConsent(go,cancel){
    try{var c=JSON.parse(w.localStorage.getItem(consentKey()));if(c&&c.v===CONSENT_V){go();return}}catch(e){}
    var b=legalBase(),o=d.createElement("div");o.id="kitConsent";
    o.style.cssText="position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.45);overflow:auto";
    o.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="kcH" style="background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:20px;max-width:460px;width:100%;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:10px;font-size:14px">'+
      '<h2 id="kcH" style="margin:0;font:800 20px var(--display)">Before your first application</h2>'+
      '<p style="margin:0">When you swipe right, UAply applies for you. It sends the details in your profile (your name, email, and anything else you filled in, such as phone, resume link, education or work authorization) to the employer, plus a short message if you turned on "Message the hiring manager", but only if that employer has agreed to receive applications through UAply. Otherwise it sends you to the employer\'s own application page. UAply never emails a company that has not agreed.</p>'+
      '<p style="margin:0">Your voluntary answers (such as race, gender, veteran or disability status) are never sent. They stay on your device unless you copy them yourself.</p>'+
      '<p style="margin:0">The match percentage is worked out automatically from your profile to help order jobs. It never rejects you, and employers make every hiring decision. <a href="'+b+'ai-and-employment.html" target="_blank" rel="noopener noreferrer">How matching works</a></p>'+
      '<p style="margin:0">By continuing you confirm you are 18 or older and agree to the <a href="'+b+'terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="'+b+'privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn ghost" id="kcNo">Cancel</button><button type="button" class="btn" id="kcYes">Agree and continue</button></div></div>';
    d.body.appendChild(o);
    d.getElementById("kcYes").focus();
    d.getElementById("kcYes").onclick=function(){try{w.localStorage.setItem(consentKey(),JSON.stringify({v:CONSENT_V,at:Date.now()}))}catch(e){}o.remove();go()};
    d.getElementById("kcNo").onclick=function(){o.remove();cancel()};
    o.addEventListener("keydown",function(e){if(e.key==="Escape"){o.remove();cancel()}});
  }
  function openProfile(){var b=d.getElementById("nb-prof");if(b){b.click();var it=d.querySelector('.nwrap[data-k=prof] .nitem[data-v=settings]');if(it)it.click()}}
  function quietApply(job,m,p,undo,S,save){
    var live=w.__uaplyMode==="live",auto=w.__uaplyAuto!==false;
    var target=(live&&w.__uaplyRedirect)||job.contact||"";
    if(!(p.name&&EMAIL.test(p.email||"")&&(!live||p.custom))){
      toast("Add your name and email in Profile so recruiters can reply.","Open Profile",openProfile,9000);return;
    }
    if(live&&!auto){sheet(job,m,p,undo,S,save);return}           /* auto_send is off in the config: show the review screen */
    /* what happened to the applicant's own email receipt (signed-in accounts only) */
    function receiptNote(j){
      var rc=j.receipt,au=w.__uaplyAuth?w.__uaplyAuth():null;
      if(rc)return " "+({sent:"Confirmation emailed to "+rc.to+".",delivered_test:testInboxNote(),not_configured:(isRelease?"":"No confirmation email: email sending is not set up yet."),failed:"The confirmation email could not be sent."}[rc.status]||"");
      return au&&au.up&&!au.user?" Sign in to get a confirmation email.":"";
    }
    function deliver(){
      /* the application is the profile itself: no cover note or message is written for the recruiter, unless the person
         turned on the opt-in "Message the hiring manager" preference (Plus and Pro; off by default) */
      var msgOn=!!(w.__uaplyAutoMsg&&w.__uaplyAutoMsg()&&w.__uaplyMessage);
      post("/api/apply",{consent:true,confirm_real:live,match:m.pct,note:msgOn?w.__uaplyMessage(job,m,p):"",
        job:{id:job.id,co:job.co,role:job.role,url:job.url||"https://example.com/example-listing",source:job.source,loc:job.loc,contact:job.contact||"",mode:job.mode,type:job.type||"job",sal:job.sal,blurb:job.blurb},
        profile:{name:p.name,email:p.email,title:p.title,years:p.years,skills:p.skills,loc:p.loc,edu:p.edu,ext:(w.__uaplyApplyExt?w.__uaplyApplyExt():(p.ext||{}))},
        resume:(w.__uaplyResume?w.__uaplyResume():null)
      }).then(function(r){
        var j=r.j||{};
        if(!r.ok){toast(j.error||"Could not send your application.","Try again",deliver,9000);return}
        var dec=S&&S.decisions&&S.decisions[job.id];
        if(dec&&j.status!=="duplicate"){dec.sent={at:Date.now(),to:j.to||"",status:j.status};if(save)save()}
        var cp=receiptNote(j);
        if(j.status==="delivered_test")toast("Applied to "+job.co+" (test)."+cp,"","",9000);
        else if(j.status==="sent")toast("Applied to "+job.co+"."+cp,"","",9000);
        else if(j.status==="duplicate")toast("Already applied to "+job.co+".");
        else if(j.status==="handoff")toast("Saved. Finish applying at "+job.co+"."+cp,job.url?"Open":"",function(){if(w.__uaplyOpen)w.__uaplyOpen(job.url)},12000);
        else if(j.status==="failed")toast(j.error||"The email could not be sent.","Try again",deliver,9000);
        else toast("Done.");
      }).catch(function(){toast("Could not reach the server.","Try again",deliver,9000)});
    }
    var grace=Math.max(0,w.__uaplyGrace||0);
    if(!live||!target||grace===0){deliver();return}              /* test mode, or nothing to email: nothing to wait for */
    var left=grace,cancelled=false,timer=null,t=null;            /* live: send by itself, with a short window for Undo */
    function tick(){
      if(cancelled)return;
      if(left<=0){clearInterval(timer);deliver();return}
      var msg="Applying to "+job.co+" in "+left+"…";
      if(t)t.set(msg);else t=toast(msg,"Undo",function(){cancelled=true;clearInterval(timer);undo();toast("Cancelled. Nothing was sent.")},0);
      left--;
    }
    timer=setInterval(tick,1000);tick();
  }

  w.__uaplyOnApplied=sheet;   /* tells the live patch the apply assistant is on */
  w.__uaplyOnDecision=function(dir,job,m,p,undo,S,save){
    var ready=!!(w.__uaplySubmitOn&&w.__uaplyMode);
    if(ready){
      post("/api/decision",{session:session(),dir:dir==="applied"?"apply":"pass",jobId:job.id,co:job.co,role:job.role,pct:m.pct}).catch(function(){});
    }
    /* real listings always go through the apply flow; the made-up example listings only do so in test mode,
       where "sending" means the simulated inbox (and your own copy), never a real company */
    if(dir!=="applied"||(!job.live&&w.__uaplyMode!=="test"))return;
    if(ready&&!showSheet)ensureConsent(function(){quietApply(job,m,p,undo,S,save)},undo);
    else if(job.url)sheet(job,m,p,undo,S,save);
  };
  w.__uaplyQuiet=!showSheet;
}

function submitApply(w){
  w.__uaplySubmitOn=true;   /* from here on a swipe right applies by itself (see quietApply) */
  return w.fetch("/api/apply/config").then(function(r){return r.json()}).then(function(c){w.__uaplyMode=c.mode==="live"?"live":"test";w.__uaplyRedirect=c.redirect||"";w.__uaplyAuto=c.autoSend!==false;w.__uaplyTestInbox=c.testInbox||"";w.__uaplyGrace=typeof c.graceSeconds==="number"?c.graceSeconds:5}).catch(function(){});
}

window.UAplyLive={patch:patch,apply:apply,kit:{patch:kitPatch,apply:kitApply},submit:{apply:submitApply}};
})();
