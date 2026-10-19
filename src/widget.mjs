import { GAUGE_CSS, gaugeMarkup, needleGeometry, OWL_DATA_URI } from './gauge.mjs';
export const WIDGET_URI = 'ui://nakamotonotes/barometer.html';
export const WIDGET_MIME = 'text/html;profile=mcp-app';
const ZONES = { Chill: '#5dade2', Neutral: '#58d68d', Heated: '#f7dc6f', Euphoric: '#ec7063' };
const CSS = `[hidden]{display:none!important}*{box-sizing:border-box}body{margin:0;background:transparent;font-family:-apple-system,"SF Pro Rounded",system-ui,sans-serif}a{text-decoration:none}
.card{position:relative;width:100%;max-width:380px;margin:0 auto;zoom:.9}.gw{width:100%;height:auto}.gw svg{display:block;width:100%;height:auto}
.zone{text-align:center;margin-top:-18px;font-size:22px;font-weight:700}.date{text-align:center;font-size:12px;opacity:.7;margin-top:2px}.px{text-align:center;font-size:14px;margin-top:6px}
.status{text-align:center;font-size:12px;opacity:.8}.ft{display:block;margin:10px 0 0;text-align:center;font-size:12.5px}.ft a{color:#93c5fd}`;
const SCRIPT = `(function(){
${needleGeometry.toString()}
var Z=${JSON.stringify(ZONES)};var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var q=function(n){return document.querySelector('[data-nn-field="'+n+'"]');};
var pending={},nid=0;
function post(m){window.parent.postMessage(Object.assign({jsonrpc:'2.0'},m),'*');}
function request(method,params){return new Promise(function(res,rej){var id=++nid;pending[id]={res:res,rej:rej};post({id:id,method:method,params:params});});}
function size(){post({method:'ui/notifications/size-changed',params:{width:Math.ceil(document.documentElement.scrollWidth),height:Math.ceil(document.documentElement.getBoundingClientRect().height)}});}
function clear(){q('score').textContent='';q('needle').innerHTML='';q('zone').textContent='';q('zone').style.color='';q('date').textContent='';q('price').textContent='';}
function fail(why){clear();q('status').textContent='Barometer unavailable: '+why;size();}
function fmtPct(v){return (v<0?'\\u2212':'+')+Math.abs(v).toFixed(2)+'%';}
function show(res){
  var s=res&&!res.isError?res.structuredContent:null;
  if(!s||typeof s!=='object')return fail('no reading');
  if(typeof s.score!=='number'||Math.floor(s.score)!==s.score||s.score<0||s.score>100)return fail('bad score');
  if(typeof s.zone!=='string'||!Object.prototype.hasOwnProperty.call(Z,s.zone))return fail('bad zone');
  var d=typeof s.asOf==='string'?s.asOf.match(/^(\\d{4})-(\\d\\d)-(\\d\\d)T/):null;
  clear();
  q('score').textContent=String(s.score);q('needle').innerHTML=needleGeometry(s.score/100);
  q('zone').textContent=s.zone+' Zone';q('zone').style.color=Z[s.zone];
  if(d&&M[Number(d[2])-1])q('date').textContent=Number(d[3])+' '+M[Number(d[2])-1]+' '+d[1];
  var p=s.price,t='';
  if(p&&typeof p==='object'&&typeof p.usd==='number'&&p.usd>0){t='$'+Math.round(p.usd).toLocaleString('en-US');if(typeof p.change24hPct==='number')t+=' \\u00b7 24h '+fmtPct(p.change24hPct);}
  q('price').textContent=t;
  q('status').textContent='';size();
}
window.addEventListener('message',function(ev){
  if(ev.source!==window.parent)return;var m=ev.data;if(!m||m.jsonrpc!=='2.0')return;
  if(m.id!==undefined&&!m.method){var p=pending[m.id];if(p){delete pending[m.id];if(m.error)p.rej(m.error);else p.res(m.result);}return;}
  if(m.method==='ui/notifications/tool-result')show(m.params);
});
document.getElementById('how').addEventListener('click',function(e){e.preventDefault();request('ui/open-link',{url:this.href}).catch(function(){});});
request('ui/initialize',{appInfo:{name:'nakamotonotes-barometer',version:'1'},appCapabilities:{},protocolVersion:'2025-11-21'}).then(function(){post({method:'ui/notifications/initialized',params:{}});size();}).catch(function(){fail('host handshake failed');});
})();`;
export function widgetHtml() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Bitcoin Barometer</title>
<style>${GAUGE_CSS}${CSS}</style></head>
<body><div class="card"><div class="brand">NAKAMOTO NOTES</div>
<img class="owl" src="${OWL_DATA_URI}" alt="">
<div class="t">BITCOIN<br>BAROMETER</div>
${gaugeMarkup('', '')}
<div class="zone" data-nn-field="zone"></div><div class="date" data-nn-field="date"></div><div class="px" data-nn-field="price"></div>
<div class="status" data-nn-field="status">Loading</div>
<div class="ft"><a id="how" href="https://nakamotonotes.com" rel="noopener">nakamotonotes.com</a></div>
<div class="disc">Data and education, not financial advice</div></div>
<script>
${SCRIPT}
</script></body></html>
`;
}
export const WIDGET_DOMAIN = 'bc13a5373bb4fe11761c9bfcbf423447.claudemcpcontent.com';
