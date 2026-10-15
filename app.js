(() => {
'use strict';
const mode = document.body.dataset.mode || 'baseline';
const events=[]; let counts={target:0,blocked:0,proxy:0}; let start=performance.now();
const $ = id=>document.getElementById(id);
const emit=(type,details={})=>{const e={time_iso:new Date().toISOString(),elapsed_ms:Math.round(performance.now()-start),mode,event:type,...details};events.push(e); console.log('[QuestLab]',e);render();};
const setText=(id,s)=>$(id).setAttribute('value',s);
function render(){setText('status',`MODE: ${mode.toUpperCase()} | target ${counts.target} | blocked ${counts.blocked} | simulated ${counts.proxy}`);}
function flash(el,color){const original=el.getAttribute('material').color;el.setAttribute('color',color);setTimeout(()=>el.setAttribute('color',original),350);}
function bind(id,fn){$(id).addEventListener('click',fn);}
function success(){counts.target++;flash($('target'),'#34d399');setText('notice','Target activated successfully');emit('target_activated');}
function block(){counts.blocked++;flash($('shield'),'#fb7185');setText('notice','Demo: input intercepted by overlay');emit('input_blocked_by_overlay');}
function proxy(){counts.proxy++;flash($('front'),'#f59e0b');setText('notice','Simulated rear-item attribution (local only)');emit('simulated_blind_spot_attribution',{real_ad_click:false});}
window.addEventListener('DOMContentLoaded',()=>{
 render();
 if(mode==='dos'){
   $('shield').setAttribute('visible','true');
   // A visible, labeled overlay in front of the normal target catches its gaze ray.
   bind('shield',block);
   bind('target',success);
   setText('instructions','Gaze at the pink shield for 1.2s. It blocks clicks on the blue target.');
 } else if(mode==='bst'){
   $('rear').setAttribute('visible','true');
   $('front').setAttribute('visible','true');
   $('target').setAttribute('visible','false');
   bind('front',proxy);
   setText('instructions','Gaze at the FRONT orange button. Demo logs attribution to a REAR item.');
 }else{
   bind('target',success);
   setText('instructions','Gaze at the BLUE target for 1.2 seconds to activate it.');
 }
 bind('reset',()=>{counts={target:0,blocked:0,proxy:0};events.length=0;start=performance.now();setText('notice','Counters reset');emit('reset');});
 $('download').addEventListener('click',download);
 emit('session_start',{user_agent:navigator.userAgent});
 const scene=$('scene');scene.addEventListener('enter-vr',()=>emit('enter_vr'));scene.addEventListener('exit-vr',()=>emit('exit_vr'));
});
function download(){const columns=['time_iso','elapsed_ms','mode','event','real_ad_click','user_agent'];const data=[columns.join(','),...events.map(row=>columns.map(k=>'"'+String(row[k]??'').replaceAll('"','""')+'"').join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'text/csv'}));a.download='quest3-'+mode+'-'+Date.now()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
})();
