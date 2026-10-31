const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function harness(file, extra={}) {
  let now=0, id=0;const tasks=new Map();
  const sandbox={exports:{},AbortController,console,...extra,
    setTimeout(fn,delay){const key=++id;tasks.set(key,{fn,at:now+delay});return key;},
    clearTimeout(key){tasks.delete(key);}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,sandbox);
  return {...sandbox.exports,tasks,tick(ms){const end=now+ms;for(;;){let next=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;tasks.delete(next[0]);next[1].fn();}now=end;}};
}
function location(){const h=harness('lib/mobileLocation.ts'),calls=[],success=[],errors=[];let current=true;const geo={getCurrentPosition(ok,fail,options){calls.push({ok,fail,options});}};const start=()=>h.requestMobilePosition(geo,x=>success.push(x),x=>errors.push(x),()=>current);return {h,calls,success,errors,geo,start,invalidate(){current=false;}};}
test('silent mobile browser exits loading after two bounded attempts',()=>{const c=location();c.start();c.h.tick(10000);assert.equal(c.calls.length,2);assert.equal(c.calls[1].options.enableHighAccuracy,true);c.h.tick(12000);assert.equal(c.errors[0].code,3);assert.equal(c.h.tasks.size,0);c.calls[0].ok({late:true});c.calls[1].ok({late:true});assert.equal(c.success.length,0);});
test('permission denial reports once without requesting GPS again',()=>{const c=location();c.start();c.calls[0].fail({code:1,message:'denied'});c.h.tick(60000);assert.equal(c.calls.length,1);assert.equal(c.errors.length,1);assert.equal(c.errors[0].code,1);});
test('unavailable coarse fix retries GPS and ignores the late coarse result',()=>{const c=location();c.start();c.calls[0].fail({code:2});c.calls[0].ok({old:true});c.calls[1].ok({lat:51.5});assert.equal(c.success.length,1);assert.equal(c.success[0].lat,51.5);assert.equal(c.errors.length,0);assert.equal(c.h.tasks.size,0);});
test('closing or selecting an area cancels callbacks and retry timers',()=>{const c=location();const cancel=c.start();cancel();c.calls[0].ok({});c.calls[0].fail({code:2});c.h.tick(60000);assert.equal(c.calls.length,1);assert.equal(c.success.length,0);assert.equal(c.errors.length,0);});
test('an obsolete request cannot replace a newer request',()=>{const c=location();c.start();c.invalidate();c.calls[0].ok({});c.calls[0].fail({code:1});c.h.tick(60000);assert.equal(c.success.length+c.errors.length,0);});
test('restricted webview throwing synchronously produces a usable error',()=>{const h=harness('lib/mobileLocation.ts'),errors=[];h.requestMobilePosition({getCurrentPosition(){throw new Error('restricted');}},()=>assert.fail(),e=>errors.push(e),()=>true);assert.equal(errors[0].code,2);assert.equal(h.tasks.size,0);});
test('unsupported device reports immediately',()=>{const h=harness('lib/mobileLocation.ts');let code;h.requestMobilePosition(undefined,()=>assert.fail(),e=>code=e.code,()=>true);assert.equal(code,2);assert.equal(h.tasks.size,0);});
function blockedFetch(_,options){return new Promise((resolve,reject)=>{const fail=()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}));if(options.signal.aborted)fail();else options.signal.addEventListener('abort',fail,{once:true});});}
test('hung listings request aborts rather than loading forever',async()=>{const h=harness('lib/nearbyRequest.ts',{fetch:blockedFetch});let p=h.loadNearbyArea('food','soho',new AbortController().signal);h.tick(12000);await assert.rejects(p,{name:'AbortError'});assert.equal(h.tasks.size,0);});
test('category change or close aborts a pending listings request',async()=>{const h=harness('lib/nearbyRequest.ts',{fetch:blockedFetch});let outer=new AbortController(),p=h.loadNearbyArea('places','soho',outer.signal);outer.abort();await assert.rejects(p,{name:'AbortError'});assert.equal(h.tasks.size,0);});
test('successful listings clear timer and detach cancellation',async()=>{let signal,url;const h=harness('lib/nearbyRequest.ts',{fetch:async(u,o)=>{url=u;signal=o.signal;return {ok:true,json:async()=>({items:[{id:'venue'}]})};}});let outer=new AbortController(),items=await h.loadNearbyArea('food','covent garden',outer.signal);assert.equal(items[0].id,'venue');assert.match(url,/q=covent%20garden/);outer.abort();assert.equal(signal.aborted,false);assert.equal(h.tasks.size,0);});
test('invalid or unavailable listing responses remain errors',async()=>{for(let result of [{ok:false},{ok:true,json:async()=>({error:'unavailable'})}]){let h=harness('lib/nearbyRequest.ts',{fetch:async()=>result});await assert.rejects(h.loadNearbyArea('food','soho',new AbortController().signal));assert.equal(h.tasks.size,0);}});
test('events and hidden gems cannot wait indefinitely',async()=>{let h=harness('lib/nearbyRequest.ts'),p=h.withNearbyDeadline(new Promise(()=>{}));h.tick(15000);await assert.rejects(p,/timed out/);assert.equal(h.tasks.size,0);});
test('quick event responses clear the deadline',async()=>{let h=harness('lib/nearbyRequest.ts');assert.equal(await h.withNearbyDeadline(Promise.resolve('events')),'events');assert.equal(h.tasks.size,0);});
