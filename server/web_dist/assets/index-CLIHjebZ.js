var v=Object.defineProperty;var y=(d,e,t)=>e in d?v(d,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):d[e]=t;var o=(d,e,t)=>y(d,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function t(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(i){if(i.ep)return;i.ep=!0;const n=t(i);fetch(i.href,n)}})();class u{constructor(){o(this,"bits",[])}writeBit(e){this.bits.push(e&1)}write_method_15(e){this.write_method_11(e?1:0,1)}write_method_11(e,t){for(let s=t-1;s>=0;s--)this.bits.push(e>>>s&1)}write_method_6(e,t){this.write_method_11(e,t)}write_method_20(e,t){this.write_method_11(t,e)}write_method_26(e){const s=new TextEncoder().encode(e||""),i=Math.min(s.length,65535);this.write_method_11(i,16);for(let n=0;n<i;n++)this.write_method_11(s[n],8)}write_method_13(...e){const t=e.join(" ");this.write_method_26(t)}write_method_4(e){const t=e>0?32-Math.clz32(e):1,s=Math.max(2,t+1&-2),i=Math.floor(s/2)-1;this.write_method_11(i,4),this.write_method_11(e,s)}write_method_9(e){let t=e>0?32-Math.clz32(e):1;t%2!==0&&(t+=1);const s=Math.floor(t/2)-1;this.write_method_11(s,4),this.write_method_11(e,t)}write_method_91(e){const t=e>0?32-Math.clz32(e):1,s=Math.max(2,t+1&-2),i=Math.floor(s/2)-1;this.write_method_11(i,3),this.write_method_11(e,s)}write_method_45(e){e<0?(this.write_method_11(1,1),this.write_method_4(-e)):(this.write_method_11(0,1),this.write_method_4(e))}write_method_739(e){e<0?(this.write_method_11(1,1),this.write_method_91(-e)):(this.write_method_11(0,1),this.write_method_91(e))}toUint8Array(){for(;this.bits.length%8!==0;)this.bits.push(0);const e=this.bits.length/8,t=new Uint8Array(e);for(let s=0;s<e;s++){let i=0;for(let n=0;n<8;n++)i=i<<1|this.bits[s*8+n];t[s]=i}return t}toPacket(e){const t=this.toUint8Array(),s=new Uint8Array(4+t.length);return s[0]=e>>>8&255,s[1]=e&255,s[2]=t.length>>>8&255,s[3]=t.length&255,s.set(t,4),s}}class p{constructor(e){o(this,"data");o(this,"bitIndex",0);this.data=e instanceof Uint8Array?e:new Uint8Array(e),this.bitIndex=0}readBit(){const e=Math.floor(this.bitIndex/8),t=this.bitIndex&7;if(e>=this.data.length)return 0;const s=this.data[e]>>>7-t&1;return this.bitIndex++,s}read_method_15(){return this.readBit()===1}read_method_20(e){let t=0;for(;e>0;){const s=Math.floor(this.bitIndex/8),n=8-(this.bitIndex&7),a=Math.min(e,n),r=(1<<a)-1,l=n-a,m=(s<this.data.length?this.data[s]:0)>>>l&r;t=t<<a|m,this.bitIndex+=a,e-=a}return t}read_method_6(e){return this.read_method_20(e)}read_method_26(){const e=this.read_method_20(16),t=new Uint8Array(e);for(let i=0;i<e;i++)t[i]=this.read_method_20(8);return new TextDecoder("utf-8").decode(t)}read_method_4(){const t=(this.read_method_20(4)+1)*2;return this.read_method_20(t)}read_method_9(){const t=(this.read_method_20(4)+1)*2;return this.read_method_20(t)}read_method_45(){const e=this.readBit()===1,t=this.read_method_4();return e?-t:t}read_method_706(){const e=this.readBit()===1,s=(this.read_method_20(3)+1)*2,i=this.read_method_20(s);return e?-i:i}read_method_739(){const e=this.readBit()===1,s=(this.read_method_20(3)+1)*2,i=this.read_method_20(s);return e?-i:i}remainingBits(){return Math.max(0,this.data.length*8-this.bitIndex)}}const h={GAMESERVER_LOGIN:31,LOGIN_VERSION:17,LOGIN_CHALLENGE:18,LOGIN_CREATE:19,LOGIN_AUTHENTICATE:20,LOGIN_CHARACTER_LIST:21,CHARACTER_SELECT:22,CHARACTER_CREATE:23,ENTER_WORLD:33,PAPERDOLL:26,POPUP:27,ENTITY_DATA:32,ENTITY_INCREMENTAL_UPDATE:33,POWER_USE:34,POWER_HIT:36,RESPAWN:40,CHAT_PUBLIC:64,CHAT_STATUS:68,CHAT_PRIVATE:71,GOLD_UPDATE:53,RECEIVE_REWARD:43,TALENT_CLAIM:214};class _{constructor(e){o(this,"ws",null);o(this,"url");o(this,"listeners",new Map);o(this,"anyListeners",[]);o(this,"isConnected",!1);o(this,"challenge","");o(this,"transferToken",0);o(this,"currentLevel","CraftTown");if(e)this.url=e;else{const t=window.location,s=t.protocol==="https:"?"wss:":"ws:",i=t.hostname;(t.port?t.port:t.protocol==="https:"?"443":"80")==="3000"?this.url=`${s}//${i}:8080/ws`:this.url=`${s}//${t.host}/ws`}}connect(){return new Promise((e,t)=>{try{console.log(`[Net] Connecting to ${this.url}...`),this.ws=new WebSocket(this.url),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>{this.isConnected=!0,console.log("[Net] Connected to Dungeon Blitz WebSocket Gateway"),this.sendVersionHandshake(),e()},this.ws.onmessage=s=>{s.data instanceof ArrayBuffer&&this.handleBinaryMessage(new Uint8Array(s.data))},this.ws.onclose=()=>{this.isConnected=!1,console.log("[Net] Disconnected from server")},this.ws.onerror=s=>{console.error("[Net] WebSocket Error:",s),t(s)}}catch(s){t(s)}})}on(e,t){this.listeners.has(e)||this.listeners.set(e,[]),this.listeners.get(e).push(t)}onAny(e){this.anyListeners.push(e)}handleBinaryMessage(e){let t=0;for(;t+4<=e.length;){const s=e[t]<<8|e[t+1],n=4+(e[t+2]<<8|e[t+3]);if(t+n>e.length)break;const a=e.slice(t+4,t+n);t+=n;const r=new p(a);s===h.LOGIN_CHALLENGE?this.handleVersionChallenge(r):s===h.ENTER_WORLD&&this.handleEnterWorld(r);for(const c of this.anyListeners)c(s,a,new p(a));const l=this.listeners.get(s);if(l)for(const c of l)c(s,a,new p(a))}}handleVersionChallenge(e){try{this.challenge=e.read_method_26(),console.log(`[Net] Received login challenge: ${this.challenge}`)}catch(t){console.warn("[Net] Failed to read version challenge",t)}}handleEnterWorld(e){try{this.transferToken=e.read_method_20(16),e.read_method_9(),e.read_method_26(),e.read_method_15()&&(e.read_method_20(16),e.read_method_20(16)),e.read_method_26(),e.read_method_20(16),e.read_method_26(),e.read_method_20(16),e.read_method_20(16),this.currentLevel=e.read_method_26(),console.log(`[Net] Entering level ${this.currentLevel} (Token: ${this.transferToken})`),this.sendGameServerLogin(this.transferToken)}catch(t){console.warn("[Net] Error parsing enter world packet",t)}}sendPacket(e,t){if(!this.ws||this.ws.readyState!==WebSocket.OPEN){console.warn("[Net] Cannot send packet: WebSocket is closed");return}const s=e.toPacket(t);this.ws.send(s)}sendVersionHandshake(){const e=new u;e.write_method_9(200),this.sendPacket(e,h.LOGIN_VERSION)}login(e,t){const s=new u;s.write_method_26(""),s.write_method_26(""),s.write_method_26(e.trim().toLowerCase()),s.write_method_26(t),s.write_method_26(""),this.sendPacket(s,h.LOGIN_AUTHENTICATE)}register(e,t){const s=new u;s.write_method_26(""),s.write_method_26(""),s.write_method_26(e.trim().toLowerCase()),s.write_method_26(t),s.write_method_26(""),this.sendPacket(s,h.LOGIN_CREATE)}selectCharacter(e){const t=new u;t.write_method_26(e),this.sendPacket(t,h.CHARACTER_SELECT)}createCharacter(e){const t=new u;t.write_method_26(e.name),t.write_method_26(e.className),t.write_method_26(e.gender),t.write_method_26(e.head),t.write_method_26(e.hair),t.write_method_26(e.mouth),t.write_method_26(e.face),t.write_method_20(24,e.hairColor),t.write_method_20(24,e.skinColor),t.write_method_20(24,e.shirtColor),t.write_method_20(24,e.pantColor),this.sendPacket(t,h.CHARACTER_CREATE)}sendGameServerLogin(e){const t=new u;t.write_method_9(e),t.write_method_26(""),t.write_method_15(!1),this.sendPacket(t,h.GAMESERVER_LOGIN)}sendChat(e){const t=new u;t.write_method_26(e),this.sendPacket(t,h.CHAT_PUBLIC)}sendMovement(e,t,s,i,n){const a=new u;a.write_method_9(this.transferToken),a.write_method_4(Math.round(e)),a.write_method_4(Math.round(t)),a.write_method_45(Math.round(s)),a.write_method_45(Math.round(i)),a.write_method_15(n),this.sendPacket(a,h.ENTITY_INCREMENTAL_UPDATE)}}class b{constructor(e){o(this,"canvas");o(this,"ctx");o(this,"cameraX",0);o(this,"cameraY",0);o(this,"floatingTexts",[]);o(this,"animTime",0);this.canvas=e,this.ctx=e.getContext("2d"),this.resize(),window.addEventListener("resize",()=>this.resize())}resize(){var e,t;this.canvas.width=((e=this.canvas.parentElement)==null?void 0:e.clientWidth)||window.innerWidth,this.canvas.height=((t=this.canvas.parentElement)==null?void 0:t.clientHeight)||window.innerHeight}addFloatingText(e,t,s,i="#ffcc00"){this.floatingTexts.push({text:e,x:t,y:s,color:i,alpha:1,vy:-1.2})}render(e,t,s){const i=this.ctx,n=this.canvas.width,a=this.canvas.height;this.animTime+=.03;const r=e.x-n/2,l=e.y-a/2-50;this.cameraX+=(r-this.cameraX)*.1,this.cameraY+=(l-this.cameraY)*.1,this.renderBackground(n,a,s),i.save(),i.translate(-this.cameraX,-this.cameraY),this.renderEnvironment(s);for(const c of t)this.renderEntity(c);this.renderPlayer(e),this.renderFloatingText(),i.restore()}renderBackground(e,t,s){const i=this.ctx,n=i.createLinearGradient(0,0,0,t);s.toLowerCase().includes("dungeon")||s.toLowerCase().includes("crypt")?(n.addColorStop(0,"#0b0c10"),n.addColorStop(.5,"#1f2833"),n.addColorStop(1,"#121820")):(n.addColorStop(0,"#1a2a44"),n.addColorStop(.5,"#2a3d58"),n.addColorStop(1,"#443a32")),i.fillStyle=n,i.fillRect(0,0,e,t);const a=-(this.cameraX*.15)%e;i.fillStyle="rgba(10, 15, 25, 0.4)",i.beginPath(),i.moveTo(0,t);for(let r=-e;r<e*2;r+=120)i.lineTo(r+a,t-160-Math.sin((r+100)*.02)*50),i.lineTo(r+60+a,t-200-Math.sin(r*.02)*40);i.lineTo(e*2,t),i.closePath(),i.fill()}renderEnvironment(e){const t=this.ctx,s=450;t.fillStyle="#2c2621",t.fillRect(-2e3,s,6e3,500),t.fillStyle="#4a423b",t.fillRect(-2e3,s,6e3,12),t.strokeStyle="#38312b",t.lineWidth=2;for(let i=-2e3;i<4e3;i+=80)t.strokeRect(i,s+12,78,30);this.renderPlatform(200,340,220,20),this.renderPlatform(550,260,260,20),this.renderPlatform(900,320,200,20),this.renderPlatform(-300,320,220,20),this.renderPortal(50,s-110,"Port CraftTown","#33ccff"),this.renderPortal(1100,s-110,"Newbie Road","#ffaa33")}renderPlatform(e,t,s,i){const n=this.ctx;n.fillStyle="#3e3731",n.fillRect(e,t,s,i),n.fillStyle="#5a5048",n.fillRect(e,t,s,4),n.strokeStyle="#25211d",n.strokeRect(e,t,s,i)}renderPortal(e,t,s,i){const n=this.ctx,a=Math.sin(this.animTime*3)*6;n.save(),n.shadowColor=i,n.shadowBlur=15,n.fillStyle="rgba(20, 25, 40, 0.8)",n.beginPath(),n.arc(e+40,t+40,36+a*.2,Math.PI,0,!1),n.lineTo(e+76,t+110),n.lineTo(e+4,t+110),n.closePath(),n.fill(),n.strokeStyle=i,n.lineWidth=4,n.stroke(),n.fillStyle="#ffffff",n.font="bold 12px sans-serif",n.textAlign="center",n.fillText(s,e+40,t-10),n.restore()}renderPlayer(e){const t=this.ctx;t.save(),t.translate(e.x,e.y),e.facingLeft&&t.scale(-1,1);const s=Math.abs(e.vx)>.5,i=s?Math.sin(this.animTime*12)*4:Math.sin(this.animTime*3)*1.5,n=s?Math.sin(this.animTime*12)*12:0;t.fillStyle="rgba(0, 0, 0, 0.35)",t.beginPath(),t.ellipse(0,0,18,6,0,0,Math.PI*2),t.fill(),t.fillStyle="#2c3e50",t.fillRect(-8,-22+i,6,22+n*.3),t.fillRect(2,-22+i,6,22-n*.3);const a=e.type.toLowerCase().includes("paladin")?"#95a5a6":e.type.toLowerCase().includes("mage")?"#8e44ad":"#27ae60";t.fillStyle=a,t.fillRect(-12,-48+i,24,28),t.strokeStyle="#1a1a1a",t.lineWidth=1.5,t.strokeRect(-12,-48+i,24,28),t.fillStyle="#f1c40f",t.beginPath(),t.arc(0,-58+i,12,0,Math.PI*2),t.fill(),t.stroke(),e.type.toLowerCase().includes("paladin")?(t.fillStyle="#bdc3c7",t.fillRect(-16,-42+i,8,18),t.fillStyle="#e0e0e0",t.fillRect(12,-54+i,4,32)):e.type.toLowerCase().includes("mage")?(t.fillStyle="#795548",t.fillRect(14,-65+i,4,45),t.fillStyle="#00e5ff",t.beginPath(),t.arc(16,-68+i,6,0,Math.PI*2),t.fill()):(t.fillStyle="#bdc3c7",t.fillRect(10,-36+i,3,16),t.fillRect(-14,-36+i,3,16)),t.restore(),this.renderEntityOverhead(e.x,e.y-78,e.name,e.hp,e.maxHp,e.level,"#4cd137")}renderEntity(e){const t=this.ctx;t.save(),t.translate(e.x,e.y),e.facingLeft&&t.scale(-1,1);const s=Math.sin(this.animTime*4+e.id)*2;t.fillStyle="rgba(0, 0, 0, 0.3)",t.beginPath(),t.ellipse(0,0,16,5,0,0,Math.PI*2),t.fill(),e.isMonster?(t.fillStyle="#c0392b",t.fillRect(-12,-42+s,24,26),t.fillStyle="#962d22",t.beginPath(),t.arc(0,-52+s,10,0,Math.PI*2),t.fill()):(t.fillStyle="#f39c12",t.fillRect(-10,-44+s,20,26),t.fillStyle="#d35400",t.beginPath(),t.arc(0,-54+s,10,0,Math.PI*2),t.fill()),t.restore();const i=e.isMonster?"#e74c3c":"#f1c40f";this.renderEntityOverhead(e.x,e.y-72,e.name,e.hp,e.maxHp,e.level,i)}renderEntityOverhead(e,t,s,i,n,a,r){const l=this.ctx;l.font="bold 12px sans-serif",l.textAlign="center",l.fillStyle=r,l.shadowColor="rgba(0,0,0,0.8)",l.shadowBlur=4,l.fillText(`Lv.${a||1} ${s}`,e,t),l.shadowBlur=0;const c=44,m=5,f=Math.max(0,Math.min(1,n>0?i/n:1));l.fillStyle="rgba(0, 0, 0, 0.7)",l.fillRect(e-c/2,t+4,c,m),l.fillStyle=f>.3?"#2ecc71":"#e74c3c",l.fillRect(e-c/2,t+4,c*f,m),l.strokeStyle="#111",l.lineWidth=1,l.strokeRect(e-c/2,t+4,c,m)}renderFloatingText(){const e=this.ctx;e.font="bold 14px sans-serif",e.textAlign="center";for(let t=this.floatingTexts.length-1;t>=0;t--){const s=this.floatingTexts[t];if(s.y+=s.vy,s.alpha-=.018,s.alpha<=0){this.floatingTexts.splice(t,1);continue}e.save(),e.globalAlpha=s.alpha,e.fillStyle=s.color,e.shadowColor="#000000",e.shadowBlur=4,e.fillText(s.text,s.x,s.y),e.restore()}}}class w{constructor(){o(this,"left",!1);o(this,"right",!1);o(this,"jump",!1);o(this,"attack",!1);o(this,"skill1",!1);o(this,"skill2",!1);o(this,"skill3",!1);o(this,"skill4",!1);o(this,"potion",!1);o(this,"isChatFocused",!1);window.addEventListener("keydown",e=>this.onKeyDown(e)),window.addEventListener("keyup",e=>this.onKeyUp(e))}onKeyDown(e){if(!(this.isChatFocused&&e.code!=="Enter"))switch(e.code){case"KeyA":case"ArrowLeft":this.left=!0;break;case"KeyD":case"ArrowRight":this.right=!0;break;case"KeyW":case"ArrowUp":case"Space":this.jump=!0;break;case"Digit1":this.skill1=!0;break;case"Digit2":this.skill2=!0;break;case"Digit3":this.skill3=!0;break;case"Digit4":this.skill4=!0;break;case"KeyP":this.potion=!0;break}}onKeyUp(e){switch(e.code){case"KeyA":case"ArrowLeft":this.left=!1;break;case"KeyD":case"ArrowRight":this.right=!1;break;case"KeyW":case"ArrowUp":case"Space":this.jump=!1;break;case"Digit1":this.skill1=!1;break;case"Digit2":this.skill2=!1;break;case"Digit3":this.skill3=!1;break;case"Digit4":this.skill4=!1;break;case"KeyP":this.potion=!1;break}}}class x{constructor(){o(this,"player",{id:1,name:"Hero",type:"Paladin",x:400,y:450,vx:0,vy:0,hp:500,maxHp:500,facingLeft:!1,isPlayer:!0,isMonster:!1,level:1});o(this,"entities",new Map);this.entities.set(101,{id:101,name:"Captain Douglas",type:"NPC",x:350,y:450,vx:0,vy:0,hp:1e3,maxHp:1e3,facingLeft:!0,isPlayer:!1,isMonster:!1,level:10}),this.entities.set(102,{id:102,name:"Training Dummy",type:"Monster",x:750,y:450,vx:0,vy:0,hp:250,maxHp:250,facingLeft:!0,isPlayer:!1,isMonster:!0,level:1})}handleEntityPacket(e,t){try{if(e===h.ENTITY_DATA){const s=t.read_method_9(),i=t.read_method_26(),n=t.read_method_4(),a=t.read_method_4();if(s!==this.player.id){const r=i.toLowerCase().includes("monster")||i.toLowerCase().includes("goblin")||i.toLowerCase().includes("brute");this.entities.set(s,{id:s,name:i,type:i,x:n,y:a,vx:0,vy:0,hp:200,maxHp:200,facingLeft:!1,isPlayer:!1,isMonster:r,level:1})}}else if(e===h.ENTITY_INCREMENTAL_UPDATE){const s=t.read_method_9(),i=t.read_method_4(),n=t.read_method_4(),a=t.read_method_45(),r=t.read_method_45(),l=t.read_method_15(),c=this.entities.get(s);c&&(c.x=i,c.y=n,c.vx=a,c.vy=r,c.facingLeft=l)}}catch(s){console.warn("[EntityManager] Error parsing entity packet",s)}}getAll(){return Array.from(this.entities.values())}}class E{constructor(e,t){o(this,"net");o(this,"renderer");o(this,"input");o(this,"entities");o(this,"isRunning",!1);o(this,"lastSyncTime",0);o(this,"currentLevel","CraftTown");o(this,"gold",100);o(this,"idols",15);o(this,"mp",200);o(this,"maxMp",200);o(this,"xp",120);o(this,"maxXp",500);o(this,"attackCooldown",0);this.net=t,this.renderer=new b(e),this.input=new w,this.entities=new x,this.net.on(h.ENTITY_DATA,(s,i,n)=>{this.entities.handleEntityPacket(s,n)}),this.net.on(h.ENTITY_INCREMENTAL_UPDATE,(s,i,n)=>{this.entities.handleEntityPacket(s,n)})}start(){this.isRunning=!0,requestAnimationFrame(e=>this.loop(e))}loop(e){this.isRunning&&(this.update(),this.renderer.render(this.entities.player,this.entities.getAll(),this.currentLevel),requestAnimationFrame(t=>this.loop(t)))}update(){const e=this.entities.player,t=this.input,s=5;t.left&&!t.right?(e.vx=-s,e.facingLeft=!0):t.right&&!t.left?(e.vx=s,e.facingLeft=!1):e.vx*=.7,e.x+=e.vx,e.vy+=.65,e.y+=e.vy;const i=450;let n=!1;e.y>=i&&(e.y=i,e.vy=0,n=!0);const a=[{x:200,y:340,w:220},{x:550,y:260,w:260},{x:900,y:320,w:200},{x:-300,y:320,w:220}];for(const l of a)e.x>=l.x&&e.x<=l.x+l.w&&e.y>=l.y&&e.y-e.vy<=l.y+12&&e.vy>=0&&(e.y=l.y,e.vy=0,n=!0);if(t.jump&&n&&(e.vy=-13.5),this.attackCooldown>0&&this.attackCooldown--,t.skill1&&this.attackCooldown===0&&(this.attackCooldown=20,this.executePlayerAttack()),t.potion&&e.hp<e.maxHp){t.potion=!1;const l=150;e.hp=Math.min(e.maxHp,e.hp+l),this.renderer.addFloatingText(`+${l} HP`,e.x,e.y-60,"#2ecc71")}const r=performance.now();r-this.lastSyncTime>80&&this.net.isConnected&&(this.lastSyncTime=r,(Math.abs(e.vx)>.05||Math.abs(e.vy)>.05)&&this.net.sendMovement(e.x,e.y,e.vx,e.vy,e.facingLeft))}executePlayerAttack(){const e=this.entities.player;for(const t of this.entities.getAll())if(t.isMonster){const s=t.x-e.x,i=t.y-e.y,n=Math.sqrt(s*s+i*i),a=e.facingLeft?s<0:s>0;if(n<110&&a){const r=Math.floor(45+Math.random()*35);t.hp=Math.max(0,t.hp-r),t.vx=e.facingLeft?-4:4,this.renderer.addFloatingText(`-${r}`,t.x,t.y-50,"#ff4757"),t.hp<=0&&(this.renderer.addFloatingText("+85 XP",t.x,t.y-70,"#fbc531"),this.xp+=85,this.gold+=12,this.xp>=this.maxXp&&(e.level++,this.xp=0,this.maxXp=Math.floor(this.maxXp*1.5),e.maxHp+=80,e.hp=e.maxHp,this.renderer.addFloatingText(`LEVEL UP! Lv.${e.level}`,e.x,e.y-90,"#00d2d3")),setTimeout(()=>{t.hp=t.maxHp,t.x=750,t.y=450},3e3));break}}}}class C{constructor(e,t){o(this,"container");o(this,"net");o(this,"onLoginSuccess");this.container=e,this.net=t}render(){this.container.innerHTML=`
      <div class="auth-overlay">
        <div class="auth-modal">
          <div class="modal-header">
            <div class="game-logo">⚔️ DUNGEON BLITZ</div>
            <div class="badge-tag">WEB REVIVAL</div>
          </div>

          <div class="server-status">
            <span class="status-dot ${this.net.isConnected?"online":"offline"}"></span>
            <span>Server: ${this.net.isConnected?"Online & Ready":"Connecting to Gateway..."}</span>
          </div>

          <div class="auth-tabs">
            <button id="tab-login" class="tab-btn active">Sign In</button>
            <button id="tab-register" class="tab-btn">Create Account</button>
          </div>

          <form id="auth-form" class="auth-form">
            <div class="form-group">
              <label for="auth-email">Account Email</label>
              <input type="email" id="auth-email" placeholder="hero@dungeonblitz.com" value="hero@dungeonblitz.com" required autocomplete="username" />
            </div>

            <div class="form-group">
              <label for="auth-pass">Password</label>
              <input type="password" id="auth-pass" placeholder="••••••••" value="password123" required autocomplete="current-password" />
            </div>

            <button type="submit" id="auth-submit-btn" class="primary-btn">
              Enter The Realm
            </button>
          </form>

          <div class="auth-footer">
            <button id="quick-demo-btn" class="secondary-btn">⚡ Instant Guest Play</button>
            <p class="archival-notice">Preservation Project • Modern HTML5 / WebAssembly Architecture</p>
          </div>
        </div>
      </div>
    `,this.bindEvents()}bindEvents(){let e="login";const t=document.getElementById("tab-login"),s=document.getElementById("tab-register"),i=document.getElementById("auth-submit-btn"),n=document.getElementById("auth-form"),a=document.getElementById("quick-demo-btn");t.onclick=()=>{e="login",t.classList.add("active"),s.classList.remove("active"),i.textContent="Enter The Realm"},s.onclick=()=>{e="register",s.classList.add("active"),t.classList.remove("active"),i.textContent="Register & Play"},n.onsubmit=r=>{r.preventDefault();const l=document.getElementById("auth-email").value,c=document.getElementById("auth-pass").value;e==="login"?this.net.login(l,c):this.net.register(l,c),i.disabled=!0,i.textContent="Connecting to World..."},a.onclick=()=>{const r=`adventurer_${Math.floor(Math.random()*9e3+1e3)}@dungeonblitz.com`;this.net.register(r,"demo123"),a.disabled=!0,a.textContent="Spawning Guest..."}}hide(){this.container.innerHTML=""}}class k{constructor(e,t){o(this,"container");o(this,"net");o(this,"onCharacterChosen");this.container=e,this.net=t}render(e){e.length>0?this.renderList(e):this.renderCreate()}renderList(e){var r;const t=e.map((l,c)=>{var m;return`
        <div class="char-card ${c===0?"selected":""}" data-name="${l.name}">
          <div class="char-avatar ${l.class.toLowerCase()}"></div>
          <div class="char-details">
            <div class="char-name">${l.name}</div>
            <div class="char-class-badge">Lv.${l.level||1} ${l.class}</div>
            <div class="char-location">📍 ${((m=l.CurrentLevel)==null?void 0:m.name)||"CraftTown"}</div>
          </div>
          <button class="play-char-btn" data-name="${l.name}">Select</button>
        </div>
      `}).join("");this.container.innerHTML=`
      <div class="auth-overlay">
        <div class="auth-modal wide-modal">
          <div class="modal-header">
            <div class="game-logo">⚔️ CHOOSE YOUR HERO</div>
            <button id="create-new-char-btn" class="secondary-btn small-btn">+ Create New Hero</button>
          </div>

          <div class="char-grid">
            ${t}
          </div>

          <div class="auth-footer">
            <button id="enter-world-btn" class="primary-btn pulse-glow">Enter Dungeon Blitz</button>
          </div>
        </div>
      </div>
    `;let s=((r=e[0])==null?void 0:r.name)||"";const i=this.container.querySelectorAll(".char-card");i.forEach(l=>{l.addEventListener("click",()=>{i.forEach(c=>c.classList.remove("selected")),l.classList.add("selected"),s=l.getAttribute("data-name")||""})});const n=document.getElementById("enter-world-btn");n.onclick=()=>{if(s){const l=e.find(c=>c.name===s);l&&this.onCharacterChosen&&this.onCharacterChosen(l),this.net.selectCharacter(s),this.hide()}};const a=document.getElementById("create-new-char-btn");a.onclick=()=>this.renderCreate()}renderCreate(){this.container.innerHTML=`
      <div class="auth-overlay">
        <div class="auth-modal wide-modal">
          <div class="modal-header">
            <div class="game-logo">⚔️ FORGE YOUR HERO</div>
            <p class="subtitle">Select your combat discipline and customize your appearance</p>
          </div>

          <div class="create-hero-layout">
            <div class="class-selection">
              <label>Select Discipline</label>
              <div class="class-cards">
                <div class="class-card selected" data-class="Paladin">
                  <div class="class-icon paladin">🛡️</div>
                  <div class="class-title">Paladin</div>
                  <div class="class-desc">Heavy armor, shields, sword mastery, and righteous defense.</div>
                </div>
                <div class="class-card" data-class="Rogue">
                  <div class="class-icon rogue">🗡️</div>
                  <div class="class-title">Rogue</div>
                  <div class="class-desc">High mobility, rapid dual daggers, and critical strikes.</div>
                </div>
                <div class="class-card" data-class="Mage">
                  <div class="class-icon mage">🔮</div>
                  <div class="class-title">Mage</div>
                  <div class="class-desc">Elemental devastation, arcane spells, and ranged area control.</div>
                </div>
              </div>
            </div>

            <div class="customization-panel">
              <div class="form-group">
                <label for="hero-name-input">Hero Name</label>
                <input type="text" id="hero-name-input" placeholder="Sir Lancelot" value="Hero_${Math.floor(Math.random()*899+100)}" maxlength="16" required />
              </div>

              <div class="form-group">
                <label>Gender</label>
                <div class="gender-toggle">
                  <button type="button" class="gender-btn active" data-gender="male">Male</button>
                  <button type="button" class="gender-btn" data-gender="female">Female</button>
                </div>
              </div>

              <div class="color-pickers-row">
                <div class="color-picker-item">
                  <label>Hair Color</label>
                  <input type="color" id="hair-color-input" value="#e67e22" />
                </div>
                <div class="color-picker-item">
                  <label>Skin Tone</label>
                  <input type="color" id="skin-color-input" value="#f1c40f" />
                </div>
                <div class="color-picker-item">
                  <label>Tunic / Plate</label>
                  <input type="color" id="tunic-color-input" value="#3498db" />
                </div>
              </div>
            </div>
          </div>

          <div class="auth-footer">
            <button id="finish-create-btn" class="primary-btn">Begin Journey</button>
          </div>
        </div>
      </div>
    `;let e="Paladin",t="male";const s=this.container.querySelectorAll(".class-card");s.forEach(a=>{a.addEventListener("click",()=>{s.forEach(r=>r.classList.remove("selected")),a.classList.add("selected"),e=a.getAttribute("data-class")||"Paladin"})});const i=this.container.querySelectorAll(".gender-btn");i.forEach(a=>{a.addEventListener("click",()=>{i.forEach(r=>r.classList.remove("active")),a.classList.add("active"),t=a.getAttribute("data-gender")||"male"})});const n=document.getElementById("finish-create-btn");n.onclick=()=>{const a=document.getElementById("hero-name-input").value.trim(),r=document.getElementById("hair-color-input").value,l=document.getElementById("skin-color-input").value,c=document.getElementById("tunic-color-input").value,m=parseInt(r.replace("#",""),16),f=parseInt(l.replace("#",""),16),g=parseInt(c.replace("#",""),16);a&&(this.net.createCharacter({name:a,className:e,gender:t,head:"Head1",hair:"Hair1",mouth:"Mouth1",face:"Face1",hairColor:m,skinColor:f,shirtColor:g,pantColor:2899536}),this.onCharacterChosen&&this.onCharacterChosen({name:a,class:e,gender:t,level:1}),this.hide())}}hide(){this.container.innerHTML=""}}class T{constructor(e,t){o(this,"container");o(this,"engine");o(this,"chatMessages",[]);this.container=e,this.engine=t}render(){const e=this.engine.entities.player;this.container.innerHTML=`
      <div class="hud-layer">
        <!-- Top Left: Player Status Bar -->
        <div class="hud-player-frame">
          <div class="portrait-box ${e.type.toLowerCase()}">
            <span class="player-lvl" id="hud-level">${e.level}</span>
          </div>
          <div class="bars-container">
            <div class="player-name-row">
              <span id="hud-name">${e.name}</span>
              <span class="class-tag" id="hud-class">${e.type}</span>
            </div>
            <!-- HP Bar -->
            <div class="bar hp-bar">
              <div class="bar-fill" id="hud-hp-fill" style="width: 100%;"></div>
              <span class="bar-text" id="hud-hp-text">${e.hp} / ${e.maxHp}</span>
            </div>
            <!-- MP Bar -->
            <div class="bar mp-bar">
              <div class="bar-fill" id="hud-mp-fill" style="width: 100%;"></div>
              <span class="bar-text" id="hud-mp-text">${this.engine.mp} / ${this.engine.maxMp}</span>
            </div>
          </div>
        </div>

        <!-- Top Right: Currencies & Mode Toggle -->
        <div class="hud-top-right">
          <div class="currency-pill">
            <span class="coin-icon gold">🪙</span>
            <span id="hud-gold">${this.engine.gold}</span>
          </div>
          <div class="currency-pill">
            <span class="coin-icon idols">🦣</span>
            <span id="hud-idols">${this.engine.idols}</span>
          </div>
          <button id="toggle-flash-mode-btn" class="mode-pill-btn" title="Switch to Classic Flash Projector (Wasm Ruffle)">
            🏛️ Flash (Wasm)
          </button>
          <button id="btn-fullscreen" class="icon-btn" title="Toggle Fullscreen">⛶</button>
        </div>

        <!-- Bottom Center: Skill / Action Bar -->
        <div class="hud-action-bar">
          <div class="skill-slot" data-key="1">
            <span class="skill-key">1</span>
            <div class="skill-icon attack-icon">⚔️</div>
            <span class="skill-name">Strike</span>
          </div>
          <div class="skill-slot" data-key="2">
            <span class="skill-key">2</span>
            <div class="skill-icon whirlwind-icon">🌪️</div>
            <span class="skill-name">Whirl</span>
          </div>
          <div class="skill-slot" data-key="3">
            <span class="skill-key">3</span>
            <div class="skill-icon bash-icon">🛡️</div>
            <span class="skill-name">Slam</span>
          </div>
          <div class="skill-slot" data-key="4">
            <span class="skill-key">4</span>
            <div class="skill-icon blast-icon">💥</div>
            <span class="skill-name">Burst</span>
          </div>
          <div class="skill-slot potion-slot" data-key="P">
            <span class="skill-key">P</span>
            <div class="skill-icon potion-icon">🧪</div>
            <span class="skill-name">Potion</span>
          </div>
        </div>

        <!-- Bottom Left: Chat Box -->
        <div class="hud-chat-box">
          <div class="chat-tabs">
            <button class="chat-tab active">All</button>
            <button class="chat-tab">World</button>
            <button class="chat-tab">Guild</button>
          </div>
          <div class="chat-log" id="chat-log">
            <div class="chat-msg system">⚔️ Welcome to Dungeon Blitz Web Revival!</div>
            <div class="chat-msg system">💡 Use A/D or Arrow keys to move, Space to Jump, 1 to Attack.</div>
          </div>
          <form id="chat-form" class="chat-input-row">
            <input type="text" id="chat-input" placeholder="Press Enter to chat..." autocomplete="off" />
            <button type="submit" id="chat-send-btn">Send</button>
          </form>
        </div>

        <!-- Bottom XP Bar -->
        <div class="hud-xp-bar">
          <div class="xp-fill" id="hud-xp-fill" style="width: 24%;"></div>
        </div>
      </div>
    `,this.bindEvents(),this.startHudTicker()}bindEvents(){const e=document.getElementById("chat-form"),t=document.getElementById("chat-input");t.onfocus=()=>{this.engine.input.isChatFocused=!0},t.onblur=()=>{this.engine.input.isChatFocused=!1},e.onsubmit=i=>{i.preventDefault();const n=t.value.trim();n&&(this.engine.net.sendChat(n),this.addChatMessage(this.engine.entities.player.name,n,"all"),t.value=""),t.blur()},window.addEventListener("keydown",i=>{i.key==="Enter"&&document.activeElement!==t&&t.focus()});const s=document.getElementById("btn-fullscreen");s.onclick=()=>{document.fullscreenElement?document.exitFullscreen().catch(()=>{}):document.documentElement.requestFullscreen().catch(()=>{})}}addChatMessage(e,t,s="all"){const i=document.getElementById("chat-log");if(!i)return;const n=document.createElement("div");n.className=`chat-msg ${s}`,n.innerHTML=`<span class="sender">[${e}]:</span> <span class="content">${t}</span>`,i.appendChild(n),i.scrollTop=i.scrollHeight}startHudTicker(){setInterval(()=>{const e=this.engine.entities.player,t=document.getElementById("hud-hp-fill"),s=document.getElementById("hud-hp-text"),i=document.getElementById("hud-mp-fill"),n=document.getElementById("hud-mp-text"),a=document.getElementById("hud-gold"),r=document.getElementById("hud-idols"),l=document.getElementById("hud-xp-fill"),c=document.getElementById("hud-level");if(t&&s){const m=Math.max(0,Math.min(100,e.hp/e.maxHp*100));t.style.width=`${m}%`,s.textContent=`${Math.round(e.hp)} / ${e.maxHp}`}if(i&&n){const m=Math.max(0,Math.min(100,this.engine.mp/this.engine.maxMp*100));i.style.width=`${m}%`,n.textContent=`${this.engine.mp} / ${this.engine.maxMp}`}if(a&&(a.textContent=`${this.engine.gold}`),r&&(r.textContent=`${this.engine.idols}`),c&&(c.textContent=`${e.level}`),l){const m=Math.max(0,Math.min(100,this.engine.xp/this.engine.maxXp*100));l.style.width=`${m}%`}},100)}}class L{constructor(e){o(this,"container");o(this,"onClose");this.container=e}show(){this.container.innerHTML=`
      <div class="flash-modal-overlay">
        <div class="flash-header">
          <div class="flash-title">
            <span>🏛️ DUNGEON BLITZ • CLASSIC FLASH WEBASSEMBLY (RUFFLE)</span>
          </div>
          <div class="flash-actions">
            <a href="/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv" target="_blank" class="download-btn">⬇ Open Direct SWF</a>
            <button id="close-flash-btn" class="close-btn">✖ Return to Modern Client</button>
          </div>
        </div>
        <div id="ruffle-container" class="ruffle-container">
          <div id="ruffle-loading" class="ruffle-loading">
            <div class="spinner"></div>
            <p>Initializing WebAssembly Flash Engine (Ruffle)...</p>
          </div>
        </div>
      </div>
    `;const e=document.getElementById("close-flash-btn");e.onclick=()=>{this.hide(),this.onClose&&this.onClose()},this.mountRuffle()}mountRuffle(){const e="/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv";if(window.RufflePlayer)this.injectPlayer(e);else{const t=document.createElement("script");t.src="https://unpkg.com/@ruffle-rs/ruffle",t.onload=()=>this.injectPlayer(e),t.onerror=()=>{const s=document.getElementById("ruffle-loading");s&&(s.innerHTML=`
            <p style="color: #e74c3c;">Failed to load online Ruffle Wasm script.</p>
            <p>You can still open the SWF directly in Flash Projector at: <a href="${e}" style="color: #3498db;">${e}</a></p>
          `)},document.head.appendChild(t)}}injectPlayer(e){const t=document.getElementById("ruffle-container");if(t)try{const i=window.RufflePlayer.newest().createPlayer();i.style.width="100%",i.style.height="100%",t.innerHTML="",t.appendChild(i),i.load({url:e,parameters:{fv:"cbq",gv:"cbv"},allowScriptAccess:!0,letterbox:"on"})}catch(s){console.error("Error creating Ruffle player:",s)}}hide(){this.container.innerHTML=""}}class M{constructor(){o(this,"net");o(this,"engine");o(this,"loginView");o(this,"charSelectView");o(this,"hudView");o(this,"flashModal");o(this,"uiContainer");o(this,"modalContainer");const e=document.getElementById("game-canvas");this.uiContainer=document.getElementById("ui-container"),this.modalContainer=document.getElementById("modal-container"),this.net=new _,this.engine=new E(e,this.net),this.loginView=new C(this.uiContainer,this.net),this.charSelectView=new k(this.uiContainer,this.net),this.hudView=new T(this.uiContainer,this.engine),this.flashModal=new L(this.modalContainer),this.init()}async init(){this.loginView.render();try{await this.net.connect()}catch(e){console.warn("[App] Gateway connection deferred or pending:",e)}this.net.on(h.LOGIN_CHARACTER_LIST,(e,t,s)=>{this.handleLoginResult(s)}),this.net.on(h.ENTER_WORLD,()=>{this.launchGame()}),this.net.on(h.CHAT_PUBLIC,(e,t,s)=>{try{const i=s.read_method_26();this.hudView.addChatMessage("World",i,"world")}catch{}}),this.net.on(h.CHAT_STATUS,(e,t,s)=>{try{const i=s.read_method_26();this.hudView.addChatMessage("System",i,"system")}catch{}}),this.charSelectView.onCharacterChosen=e=>{this.engine.entities.player.name=e.name,this.engine.entities.player.type=e.class}}handleLoginResult(e){const t=[];try{const s=e.read_method_6(4);for(let i=0;i<s;i++){const n=e.read_method_26(),a=e.read_method_26(),r=e.read_method_26(),l=e.read_method_9();t.push({name:n,class:a,gender:r,level:Math.max(1,l)})}}catch(s){console.warn("[App] Character list reading notice:",s)}this.loginView.hide(),this.charSelectView.render(t)}launchGame(){this.charSelectView.hide(),this.hudView.render(),this.engine.start();const e=document.getElementById("toggle-flash-mode-btn");e&&(e.onclick=()=>{this.flashModal.show()})}}window.addEventListener("DOMContentLoaded",()=>{new M});
//# sourceMappingURL=index-CLIHjebZ.js.map
