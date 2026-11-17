// App Store screenshots: the nine slides on white, written to store/screenshots in upload order at both iPhone
// sizes App Store Connect takes (6.9" 1320 x 2868 and 6.3" 1206 x 2622). Pictures come from ./sources (real iPhone
// simulator shots, the owner's own lobby screenshot and the web build's Range training, see ../README.md).
//   node store/scripts/slides.cjs            (CHROMIUM_PATH=/opt/pw-browsers/chromium if Playwright has no browser)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
process.chdir(__dirname);
const tpl = fs.readFileSync('slides.html','utf8');
const games = require('./games-13.json');
const img = f => `data:image/png;base64,${fs.readFileSync(path.join('sources', path.basename(f))).toString('base64')}`;
const R='sources/';
const phone = (f,{x,y,dim=false,island=true}={}) => `<div class="phone" style="left:${x}px;top:${y}px">
 <div class="btn" style="left:-8px;top:420px;height:110px"></div><div class="btn" style="left:-8px;top:580px;height:180px"></div><div class="btn" style="right:-8px;top:620px;height:260px"></div>
 <div class="screen ${dim?'dim':''}"><img src="${img(R+f)}"></div>${island?'<div class="island"></div>':''}</div>`;
const bub = (x,y,e,name,text) => `<div class="bub" style="left:${x}px;top:${y}px"><div class="face"><img src="${img('x-'+e+'.png')}"></div><div><small>${name}</small>${text}</div></div>`;
// The small gold tag on a slide that shows a Premium game, so nobody downloads expecting it free.
const CROWN = '<svg viewBox="0 0 24 24"><path d="M2.5 19.5 1.6 6.5l5.8 4.6L12 2.5l4.6 8.6 5.8-4.6-.9 13Z" fill="#3a2600"/></svg>';
const premium = (label = 'Premium') => `<div class="ptag">${CROWN}${label}</div>`;
const glow = (c1,c2='rgba(245,183,0,.10)') => `<div class="glow" style="background:radial-gradient(1100px 1000px at 50% 58%, ${c1}, transparent 70%),radial-gradient(900px 600px at 50% 105%, ${c2}, transparent 70%)"></div>`;
// 13 tiles: columns of 4, 5, 4, the side columns half a row lower.
const grid = () => { const cols=[[0,1,2,3],[4,5,6,7,8],[9,10,11,12]]; let o='';
  cols.forEach((c,ci)=>c.forEach((gi,ri)=>{const g=games[[1,5,3,7, 0,2,6,9,12, 4,8,10,11][gi]];
   const x=60+ci*440, y=600+ri*450+(ci===1?0:225);
   o+=`<div class="tile" style="left:${x}px;top:${y}px"><div class="sq" style="background:${g.field}">${g.svg.replace('<svg ','<svg ')}</div><div class="nm">${g.name}</div></div>`;})); return o; };
const S = {
 '1-friends': `${glow('rgba(37,87,214,.55)')}<h1 style="top:200px">Your friends.<br><span>One table.</span></h1>
  ${phone('holdem-yourturn.png',{x:155,y:640})}
  ${bub(40,860,'sloth','Wayne','Nice hand!')}${bub(560,1120,'beaver','Rob','Big bet?')}${bub(90,1880,'parrot','Shane','Run it!')}`,
 '2-games': `${glow('rgba(37,87,214,.35)')}${premium('12 with Premium')}<h1 style="top:200px">13 games.<br><span>One app.</span></h1>${grid()}`,
 '3-pineapple': `${glow('rgba(25,179,166,.40)')}${premium()}<h1 style="top:200px">Three cards.<br><span>Throw one away.</span></h1>
  ${phone('pineapple-discard.png',{x:155,y:640,dim:true})}
  <div class="panel" style="left:70px;right:70px;top:1860px;height:760px;padding-top:60px"><div class="lbl">Crazy Pineapple</div><img src="${img('discard-row.png')}" style="width:1000px;margin-top:20px"></div>`,
 '4-dice': `${glow('rgba(245,135,31,.38)','rgba(37,87,214,.2)')}${premium()}<h1 style="top:200px">Roll the die.<br><span>Swap the river.</span></h1>
  ${phone('dice-dice.png',{x:155,y:640,dim:true,island:false})}
  <div class="panel" style="left:70px;right:70px;top:1720px;height:800px;padding-top:60px;background:#090a1a"><div class="lbl">Die on the River</div><img src="${img('rolled.png')}" style="width:1000px;margin-top:20px"></div>`,
 '6-training': `${glow('rgba(245,183,0,.22)','rgba(37,87,214,.35)')}<h1 style="top:200px;font-size:116px">Make the right call.<br><span>Built-in range trainer.</span></h1><div style="position:absolute;left:0;right:0;top:470px;text-align:center;font-size:36px;font-weight:500;letter-spacing:.01em;color:var(--mute);opacity:.85">See why, hand by hand</div>
  ${phone('web-hand-sb.png',{x:155,y:640,dim:true})}
  <div class="panel" style="left:70px;right:70px;top:1660px;padding:50px 0 40px;background:#1c1c1e;border-color:rgba(255,255,255,.08)"><img src="${img('bestplay.png')}" style="width:1060px;display:block;margin:0 auto"><img src="${img('chart.png')}" style="width:1060px;display:block;margin:10px auto 0"></div>`,
 '7-lobby': `${glow('rgba(37,87,214,.55)')}<h1 style="top:200px">Add friends<br>with a code. <span>Free.</span></h1>
  ${phone('lobby-sb.png',{x:155,y:640,dim:true})}
  <img src="${img('codecard.png')}" style="position:absolute;left:60px;width:1200px;top:1500px;border-radius:84px;box-shadow:0 60px 140px var(--shadow)">`,
 '8-power': `${glow('rgba(40,170,235,.35)','rgba(245,183,0,.14)')}${premium()}<h1 style="top:200px">Bend the rules.<br><span>Play a power card.</span></h1>
  ${phone('power-sb.png',{x:155,y:640,dim:true})}
  <div class="panel" style="left:70px;right:70px;top:1800px;padding:56px 0 50px"><img src="${img('power-panel.png')}" style="width:1100px;display:block;margin:0 auto"></div>`,
 '9-replay': `${glow('rgba(37,87,214,.45)')}<h1 style="top:200px">Save any hand.<br><span>Replay every move.</span></h1>
  ${phone('replay-sb.png',{x:155,y:640})}
  <div class="panel" style="left:60px;right:60px;top:2330px;padding:34px 0 30px;background:#080e24;border-color:rgba(255,255,255,.10)"><img src="${img('replay-controls.png')}" style="width:1200px;display:block;margin:0 auto"></div>`,
 '5-bots': `${glow('rgba(37,87,214,.45)')}<h1 style="top:200px">No one around?<br><span>Bots fill the seats.</span></h1>
  ${phone('pineapple-yourturn.png',{x:155,y:640})}`,
};
const ORDER = ['1-friends','7-lobby','2-games','3-pineapple','4-dice','8-power','6-training','9-replay','5-bots'];
const OUT = '../screenshots';
(async()=>{const b=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
for (const [dir, scale, h] of [['6.9in-1320x2868', 1, 2868], ['6.3in-1206x2622', 1206/1320, 2872]]) {
  const p=await b.newPage({viewport:{width:1320,height:h},deviceScaleFactor:scale}); fs.mkdirSync(path.join(OUT,dir),{recursive:true});
  for (const [i,n] of ORDER.entries()) { await p.setContent(tpl.replace('__THEME__','light').replace('__BODY__',S[n])); await p.waitForTimeout(200);
    await p.screenshot({path:path.join(OUT,dir,`${String(i+1).padStart(2,'0')}-${n.split('-')[1]}.jpg`),type:'jpeg',quality:95,clip:{x:0,y:0,width:1320,height:dir.startsWith('6.9')?2868:2870.5}}); }
  await p.close(); }
await b.close();})();
