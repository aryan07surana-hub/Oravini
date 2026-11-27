// Commas-style looping demo cards for the landing page bento grid.
// Ported from the dashboard demo system (DashboardDemos) so landing and dashboard match.
// All styles live in index.css, scoped under .oravini-landing.

export function DMDemo() {
  return (
<div className="demo"><div className="bar"><i></i><i></i><i></i><span style={{"marginLeft":"4px"}}>DM Automation</span><span style={{"marginLeft":"auto","display":"inline-flex","alignItems":"center","gap":"4px","color":"#2e78ef"}}><span style={{"width":"6px","height":"6px","borderRadius":"50%","background":"#2e78ef","animation":"lp-d1dot 16s infinite both"}}></span>Live · <b className="cnt" style={{"animation":"lp-d1cnt 16s infinite both"}}></b>&nbsp;leads</span></div>
<div style={{"position":"absolute","left":"12px","top":"40px","borderRadius":"16px","padding":"6px 10px","fontSize":"10.5px","lineHeight":"1.3","background":"#f1f5fb","color":"#141414","animation":"lp-d1a 16s infinite both"}}><span style={{"color":"rgba(0,0,0,.4)","fontSize":"9px"}}>@priya.fit</span><br />Send me the link</div>
<div style={{"position":"absolute","right":"12px","top":"78px","borderRadius":"16px","padding":"6px 10px","background":"#e6f0f9","animation":"lp-d1t 16s infinite both"}}><span style={{"display":"flex","gap":"4px"}}><i style={{"width":"6px","height":"6px","borderRadius":"50%","background":"rgba(46,120,239,.6)","animation":"lp-d1dot 1s 0s infinite"}}></i><i style={{"width":"6px","height":"6px","borderRadius":"50%","background":"rgba(46,120,239,.6)","animation":"lp-d1dot 1s .15s infinite"}}></i><i style={{"width":"6px","height":"6px","borderRadius":"50%","background":"rgba(46,120,239,.6)","animation":"lp-d1dot 1s .3s infinite"}}></i></span></div>
<div style={{"position":"absolute","right":"12px","top":"78px","borderRadius":"16px","padding":"6px 10px","fontSize":"10.5px","lineHeight":"1.3","maxWidth":"62%","background":"#2e78ef","color":"#fff","animation":"lp-d1b 16s infinite both"}}>Hey Priya! Here is the guide you asked for.</div>
</div>
  );
}

export function IdeasDemo() {
  return (
<div className="demo"><div className="bar"><i></i><i></i><i></i><span style={{"marginLeft":"4px"}}>Content Ideas</span></div>
<div style={{"position":"absolute","left":"12px","right":"12px","top":"40px","display":"flex","alignItems":"center","gap":"8px"}}>
<div style={{"flex":"1","borderRadius":"8px","background":"#f7f7f8","padding":"6px 10px","fontSize":"10.5px","color":"rgba(0,0,0,.6)","overflow":"hidden","whiteSpace":"nowrap"}}><div style={{"overflow":"hidden","whiteSpace":"nowrap","animation":"lp-itype 16s infinite both"}}>Fitness coaching</div></div>
<span style={{"borderRadius":"8px","background":"#1d4ba8","color":"#fff","fontSize":"10px","fontWeight":"600","padding":"6px 10px","display":"inline-flex","alignItems":"center","gap":"4px","animation":"lp-ibtn 16s infinite both"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg>Generate</span></div>
<div style={{"position":"absolute","right":"16px","top":"76px","animation":"lp-ispin 16s infinite both"}}><div className="spinner"></div></div>
<div style={{"position":"absolute","left":"12px","right":"12px","top":"74px","display":"flex","flexDirection":"column","gap":"6px"}}>
<div style={{"position":"relative","borderRadius":"8px","background":"#f1f5fb","padding":"6px 10px","fontSize":"10.5px","color":"#141414","fontWeight":"500","animation":"lp-i1 16s infinite both"}}><span style={{"position":"absolute","inset":"0","borderRadius":"8px","animation":"lp-isel 16s infinite both"}}></span><span style={{"position":"relative"}}>Stop doing 100 crunches. Do this.</span></div></div>
<div style={{"position":"absolute","left":"12px","right":"12px","bottom":"12px","borderRadius":"8px","background":"#eff5fb","padding":"8px","animation":"lp-iscript 16s infinite both"}}>
<p style={{"fontSize":"8.5px","textTransform":"uppercase","letterSpacing":".08em","color":"#2e78ef","fontWeight":"600","marginBottom":"6px"}}>Script ready</p>
<div style={{"height":"6px","borderRadius":"4px","background":"rgba(46,120,239,.4)","marginBottom":"4px","animation":"lp-iline 16s infinite both"}}></div><div style={{"height":"6px","borderRadius":"4px","background":"rgba(46,120,239,.25)","width":"75%"}}></div></div>
<svg className="cur" width="16" height="16" viewBox="0 0 24 24" style={{"animation":"lp-icur 16s infinite both"}}><path d="M5 3l14 8-6 1.5L16.2 19l-2.5 1-2.7-6.3L5 16.2z" fill="#2e78ef" stroke="#fff" strokeWidth="1.6"/></svg></div>
  );
}

export function SchedulerDemo() {
  return (
<div className="demo"><div className="bar"><i></i><i></i><i></i><span style={{"marginLeft":"4px"}}>Content Scheduler</span><span style={{"marginLeft":"auto","color":"rgba(0,0,0,.4)"}}>This week</span></div>
<div style={{"position":"absolute","left":"12px","right":"12px","top":"40px","bottom":"34px","display":"grid","gridTemplateColumns":"repeat(7,1fr)","gap":"4px"}}><div style={{"borderRadius":"8px","background":"#f1f5fb","position":"relative","padding":"4px 4px 0"}}><p style={{"fontSize":"8.5px","color":"rgba(0,0,0,.4)"}}>Mon</p></div><div style={{"borderRadius":"8px","background":"#f1f5fb","position":"relative","padding":"4px 4px 0"}}><p style={{"fontSize":"8.5px","color":"rgba(0,0,0,.4)"}}>Tue</p><div style={{"position":"absolute","left":"4px","right":"4px","top":"36px","borderRadius":"6px","color":"#fff","fontSize":"8.5px","fontWeight":"500","padding":"4px 6px","textAlign":"center","background":"#88c0fd","animation":"lp-c2 16s infinite both"}}>Story</div></div><div style={{"borderRadius":"8px","background":"#f1f5fb","position":"relative","padding":"4px 4px 0"}}><p style={{"fontSize":"8.5px","color":"rgba(0,0,0,.4)"}}>Wed</p><div style={{"position":"absolute","left":"0","right":"0","bottom":"4px","textAlign":"center","fontSize":"8px","fontWeight":"600","color":"#2e78ef","animation":"lp-ctag 16s infinite both"}}>7:00 PM</div></div><div style={{"borderRadius":"8px","background":"#f1f5fb","position":"relative","padding":"4px 4px 0"}}><p style={{"fontSize":"8.5px","color":"rgba(0,0,0,.4)"}}>Thu</p></div><div style={{"borderRadius":"8px","background":"#f1f5fb","position":"relative","padding":"4px 4px 0"}}><p style={{"fontSize":"8.5px","color":"rgba(0,0,0,.4)"}}>Fri</p></div><div style={{"borderRadius":"8px","background":"#f1f5fb","position":"relative","padding":"4px 4px 0"}}><p style={{"fontSize":"8.5px","color":"rgba(0,0,0,.4)"}}>Sat</p></div><div style={{"borderRadius":"8px","background":"#f1f5fb","position":"relative","padding":"4px 4px 0"}}><p style={{"fontSize":"8.5px","color":"rgba(0,0,0,.4)"}}>Sun</p></div></div>
<div style={{"position":"absolute","width":"11%","zIndex":"5","borderRadius":"6px","color":"#fff","fontSize":"8.5px","fontWeight":"500","padding":"4px 6px","textAlign":"center","background":"#2e78ef","animation":"lp-cdrag 16s infinite both"}}><span style={{"position":"absolute","inset":"0","borderRadius":"6px","animation":"lp-cpost 16s infinite both"}}></span><span style={{"position":"relative"}}>Reel</span></div>
<div style={{"position":"absolute","left":"50%","transform":"translateX(-50%)","bottom":"8px","borderRadius":"999px","background":"#1d4ba8","color":"#fff","fontSize":"9.5px","fontWeight":"500","padding":"4px 12px","display":"inline-flex","alignItems":"center","gap":"4px","whiteSpace":"nowrap","animation":"lp-cpill 16s infinite both"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"><path d="M20 6L9 17l-5-5"/></svg>2 posts queued</div>
<svg className="cur" width="16" height="16" viewBox="0 0 24 24" style={{"animation":"lp-ccur 16s infinite both"}}><path d="M5 3l14 8-6 1.5L16.2 19l-2.5 1-2.7-6.3L5 16.2z" fill="#2e78ef" stroke="#fff" strokeWidth="1.6"/></svg></div>
  );
}

export function VideoDemo() {
  return (
<div className="demo"><div style={{"position":"absolute","inset":"0","borderRadius":"18px","background":"linear-gradient(160deg,#3b82f0,#1d4ba8)"}}></div>
<div style={{"position":"absolute","inset":"0","display":"flex","alignItems":"center","justifyContent":"center"}}><span style={{"width":"48px","height":"48px","borderRadius":"50%","background":"rgba(255,255,255,.92)","display":"flex","alignItems":"center","justifyContent":"center","animation":"lp-vplay 16s infinite both"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="#141414" style={{"marginLeft":"2px"}}><path d="M6 4l14 8-14 8z"/></svg></span></div>
<div style={{"position":"absolute","left":"16px","right":"16px","bottom":"64px","borderRadius":"12px","background":"#fff","padding":"8px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","animation":"lp-vcta 16s infinite both"}}>
<span style={{"fontSize":"10.5px","fontWeight":"600","color":"#141414"}}>Ready to start?</span>
<span style={{"borderRadius":"8px","background":"#2e78ef","color":"#fff","fontSize":"10px","fontWeight":"600","padding":"6px 10px","animation":"lp-vclick 16s infinite both"}}>Book a call</span></div>
<div style={{"position":"absolute","left":"16px","right":"16px","bottom":"16px"}}>
<div style={{"height":"6px","borderRadius":"99px","background":"rgba(255,255,255,.2)","overflow":"hidden"}}><div style={{"height":"100%","borderRadius":"99px","background":"#2e78ef","animation":"lp-vbar 16s infinite both"}}></div></div>
<div style={{"display":"flex","justifyContent":"space-between","marginTop":"8px","fontSize":"9.5px","color":"rgba(255,255,255,.6)"}}><span>Your VSL</span><span>Plays everywhere</span></div></div>
<svg className="cur" width="16" height="16" viewBox="0 0 24 24" style={{"animation":"lp-vcur 16s infinite both"}}><path d="M5 3l14 8-6 1.5L16.2 19l-2.5 1-2.7-6.3L5 16.2z" fill="#2e78ef" stroke="#fff" strokeWidth="1.6"/></svg></div>
  );
}

export function WebinarDemo() {
  return (
<div className="demo"><div className="bar"><i></i><i></i><i></i><span style={{"marginLeft":"4px"}}>Webinars</span><span style={{"marginLeft":"auto","color":"rgba(0,0,0,.4)"}}>Thu 7:00 PM</span></div>
<div style={{"position":"absolute","left":"16px","right":"16px","top":"40px","animation":"lp-w1 16s infinite both"}}>
<p style={{"fontSize":"12px","fontWeight":"600","color":"#141414","lineHeight":"1.25"}}>How to sell high-ticket offers live</p>
<div style={{"marginTop":"8px","display":"flex","alignItems":"center","gap":"8px"}}>
<span style={{"flex":"1","borderRadius":"8px","background":"#f7f7f8","padding":"6px 8px","fontSize":"10px","color":"rgba(0,0,0,.45)","display":"inline-flex","alignItems":"center","gap":"4px","overflow":"hidden","whiteSpace":"nowrap"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/></svg>oravini.com/w/high-ticket</span>
<span style={{"borderRadius":"8px","background":"#2e78ef","color":"#fff","fontSize":"10px","fontWeight":"600","padding":"6px 10px","animation":"lp-wbtn 16s infinite both"}}>Copy</span>
</div></div>
<div style={{"position":"absolute","right":"16px","top":"40px","borderRadius":"999px","background":"#1d4ba8","color":"#fff","fontSize":"10px","padding":"4px 10px","animation":"lp-wtoast 16s infinite both"}}>Link copied</div>
<div style={{"position":"absolute","left":"16px","right":"16px","top":"96px","animation":"lp-w2 16s infinite both"}}>
<p style={{"fontSize":"9px","textTransform":"uppercase","letterSpacing":".08em","color":"rgba(0,0,0,.4)"}}>Registrations</p>
<p className="cnt" style={{"fontSize":"34px","fontWeight":"500","letterSpacing":"-.02em","lineHeight":"1","color":"#141414","marginTop":"2px","animation":"lp-wcnt 16s infinite both"}}></p>
<div style={{"marginTop":"8px","height":"6px","borderRadius":"99px","background":"#eff5fb","overflow":"hidden"}}><div style={{"height":"100%","borderRadius":"99px","background":"#2e78ef","animation":"lp-wbar 16s infinite both"}}></div></div>
</div>
<svg className="cur" width="16" height="16" viewBox="0 0 24 24" style={{"animation":"lp-wcur 16s infinite both"}}><path d="M5 3l14 8-6 1.5L16.2 19l-2.5 1-2.7-6.3L5 16.2z" fill="#2e78ef" stroke="#fff" strokeWidth="1.6"/></svg></div>
  );
}

export function StreakDemo() {
  return (
<div className="demo"><div className="bar"><i></i><i></i><i></i><span style={{"marginLeft":"4px"}}>Streak and goals</span></div>
<div style={{"position":"absolute","left":"16px","right":"16px","top":"42px"}}>
<div style={{"display":"flex","alignItems":"center","gap":"8px"}}><svg width="24" height="24" viewBox="0 0 24 24" style={{"transformOrigin":"50% 70%","animation":"lp-sfl 16s infinite both"}}><path d="M12 2c1.2 3.2-1.8 4.6-1.8 7 0 1.4 1 2.4 2.3 2.4 1.8 0 2.6-1.6 2.2-3.4 2.3 1.6 3.6 4 3.6 6.3 0 4-3.1 7.2-6.8 7.2s-6.7-3.2-6.7-7.2C4.8 8.9 9.6 6 12 2z" fill="#2e78ef"/></svg><span className="cnt" style={{"fontSize":"30px","fontWeight":"500","letterSpacing":"-.02em","lineHeight":"1","color":"#141414","animation":"lp-scnt 16s infinite both"}}></span><span style={{"fontSize":"11px","color":"rgba(0,0,0,.5)"}}>day streak</span></div>

<div style={{"marginTop":"16px"}}>
<div style={{"display":"flex","justifyContent":"space-between","fontSize":"10px","color":"rgba(0,0,0,.5)","marginBottom":"4px"}}><span>Income goal</span><span className="cnt pc" style={{"fontWeight":"500","color":"#141414","animation":"lp-sgc 16s infinite both"}}></span></div>
<div style={{"height":"8px","borderRadius":"99px","background":"#eff5fb","overflow":"hidden"}}><div style={{"height":"100%","borderRadius":"99px","background":"linear-gradient(90deg,#88c0fd,#2e78ef)","animation":"lp-sgf 16s infinite both"}}></div></div></div>
</div></div>
  );
}
