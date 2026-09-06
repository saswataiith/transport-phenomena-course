const N=64, L={heat:.02,mass:.002,momentum:.01};
const modes={
 heat:{name:'Temperature',symbol:'T',unit:'K',inventory:'MJ m⁻²',property:'Conductivity, k',propertyUnit:'W m⁻¹ K⁻¹',law:"FOURIER'S LAW",equation:'q = −k ∇T',lawText:'Conductivity connects the temperature gradient to heat flux.',initial:300,min:300,max:800,left:[300,800],sourceMax:2e7,color:['#2457ff','#37d5de','#ffd45b','#ff5b3b']},
 mass:{name:'Concentration',symbol:'c',unit:'mol m⁻³',inventory:'mol m⁻²',property:'Diffusivity, D',propertyUnit:'m² s⁻¹',law:"FICK'S LAW",equation:'J = −D ∇c',lawText:'Diffusivity connects the concentration gradient to species flux.',initial:0,min:0,max:1000,left:[0,1000],sourceMax:2,color:['#081c57','#176ed1','#28d0d0','#d7ff77']},
 momentum:{name:'Velocity',symbol:'u',unit:'m s⁻¹',inventory:'kg m⁻¹ s⁻¹',property:'Viscosity, μ',propertyUnit:'Pa s',law:"NEWTON'S LAW OF VISCOSITY",equation:'τ = μ ∇u',lawText:'Viscosity connects the velocity gradient to momentum flux.',initial:0,min:0,max:2,left:[0,2],sourceMax:2e5,color:['#16133f','#5839a4','#a057ca','#f4a6ff']}
};
let mode='heat',view='field',running=false,layered=false,rightBC='open',time=0,field=[],initialInventory=0,entered=0,leftAmount=0,generated=0,lastFrame=performance.now();
const $=id=>document.getElementById(id);
const controls={property:$('property'),flow:$('flow'),left:$('leftBoundary'),source:$('source')};
function logMap(v,a,b){return 10**(Math.log10(a)+(v/100)*(Math.log10(b)-Math.log10(a)))}
function parameters(){
 const p=+controls.property.value/100, f=+controls.flow.value/100, l=+controls.left.value/100, s=+controls.source.value/100;
 if(mode==='heat')return{gamma:logMap(p*100,.2,200),capacity:3e6,velocity:f*.02,left:300+l*500,source:s*2e7};
 if(mode==='mass')return{gamma:logMap(p*100,1e-12,1e-8),capacity:1,velocity:f*.003,left:l*1000,source:s*2};
 return{gamma:logMap(p*100,1e-3,1),capacity:1000,velocity:0,left:0,source:s*2e5,wallSpeed:l*2};
}
function fmt(v,d=2){if(!isFinite(v))return'—';const a=Math.abs(v);if(a!==0&&(a<.01||a>=1e5))return v.toExponential(2);return v.toFixed(d)}
function propertyProfile(base,i){if(!layered)return base;const x=(i+.5)/N;return x>.4&&x<.6?base*.12:base}
function inventory(){const cap=parameters().capacity,dx=L[mode]/N;return field.reduce((a,b)=>a+b,0)*cap*dx}
function reset(custom=false){
 time=entered=leftAmount=generated=0;
 if(custom){const m=modes[mode],avg=m.initial+(parameters().left-m.initial)*.22;field=Array.from({length:N},(_,i)=>i<N/2?Math.max(m.min,avg-(m.max-m.min)*.18):Math.min(m.max,avg+(m.max-m.min)*.18));}
 else field=Array(N).fill(modes[mode].initial);
 if(mode==='momentum')field=Array(N).fill(0);
 initialInventory=inventory();render();
}
function faceGamma(a,b){return 2*a*b/(a+b||1)}
function advance(mult=1){
 const p=parameters(),dx=L[mode]/N,props=Array.from({length:N},(_,i)=>propertyProfile(p.gamma,i));
 const maxG=Math.max(...props),adv=mode==='momentum'?0:p.velocity;
 let dtDiff=.42*p.capacity*dx*dx/(maxG||1),dtAdv=adv>0?.7*dx/adv:Infinity,dt=Math.min(dtDiff,dtAdv);
 if(mode==='mass')dt=Math.min(dt,120);if(mode==='heat')dt=Math.min(dt,1);if(mode==='momentum')dt=Math.min(dt,.02);dt*=mult;
 const flux=Array(N+1).fill(0),leftVal=mode==='momentum'?p.wallSpeed:p.left;
 flux[0]=-props[0]*(field[0]-leftVal)/(dx/2)+(adv>0?adv*p.capacity*leftVal:0);
 for(let j=1;j<N;j++){const g=faceGamma(props[j-1],props[j]);flux[j]=-g*(field[j]-field[j-1])/dx+(adv>=0?adv*p.capacity*field[j-1]:adv*p.capacity*field[j]);}
 if(rightBC==='fixed'){const fixed=modes[mode].initial;flux[N]=-props[N-1]*(fixed-field[N-1])/(dx/2)+(adv>0?adv*p.capacity*field[N-1]:0)}else flux[N]=adv>0?adv*p.capacity*field[N-1]:0;
 const next=field.map((v,i)=>v+dt*((flux[i]-flux[i+1])/dx+p.source)/p.capacity);
 const eIn=Math.max(flux[0],0)*dt+Math.max(-flux[N],0)*dt;
 const eOut=Math.max(-flux[0],0)*dt+Math.max(flux[N],0)*dt;
 entered+=eIn;leftAmount+=eOut;generated+=p.source*L[mode]*dt;field=next;time+=dt;
}
function setMode(m){mode=m;running=false;$('runBtn').textContent='▶ Run';document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
 controls.property.value=m==='heat'?56:m==='mass'?50:35;controls.flow.value=0;controls.left.value=m==='heat'?72:m==='mass'?80:0;controls.source.value=0;rightBC='open';document.querySelectorAll('#rightBoundary button').forEach(b=>b.classList.toggle('active',b.dataset.bc==='open'));configure();reset();}
function configure(){const m=modes[mode],p=parameters();$('propertyLabel').textContent=m.property;$('propertyValue').textContent=`${fmt(p.gamma,mode==='mass'?3:3)} ${m.propertyUnit}`;$('leftLabel').textContent=mode==='momentum'?'Moving left wall':'Inlet '+m.name.toLowerCase();$('leftValue').textContent=`${fmt(mode==='momentum'?p.wallSpeed:p.left)} ${m.unit}`;$('sourceLabel').textContent=mode==='heat'?'Volumetric heat source':mode==='mass'?'Species generation':'Pressure/body-force drive';$('sourceValue').textContent=`${fmt(p.source)} ${mode==='heat'?'W m⁻³':mode==='mass'?'mol m⁻³ s⁻¹':'N m⁻³'}`;$('flowControl').style.display=mode==='momentum'?'none':'block';$('flowValue').textContent=`${fmt(p.velocity,4)} m s⁻¹`;$('lawName').textContent=m.law;$('lawEquation').textContent=m.equation;$('lawText').textContent=m.lawText;$('profileTitle').textContent=`${m.name} field, ${m.symbol}(x)`;$('leftFaceLabel').textContent=`${fmt(mode==='momentum'?p.wallSpeed:p.left)} ${m.unit}`;$('rightFaceLabel').textContent=rightBC==='open'?'OPEN':`${fmt(m.initial)} ${m.unit}`;$('legendMin').textContent=`${fmt(Math.min(...field,m.min))} ${m.unit}`;$('legendMax').textContent=`${fmt(Math.max(...field,m.max))} ${m.unit}`;$('legendBar').style.background=`linear-gradient(90deg,${m.color.join(',')})`;updateRangeFills();}
function color(v,min,max,palette){let t=Math.max(0,Math.min(.999,(v-min)/(max-min||1))),q=t*(palette.length-1),i=Math.floor(q),z=q-i;const a=palette[i].match(/\w\w/g).map(x=>parseInt(x,16)),b=palette[Math.min(i+1,palette.length-1)].match(/\w\w/g).map(x=>parseInt(x,16));return`rgb(${a.map((x,k)=>Math.round(x+(b[k]-x)*z)).join(',')})`}
function derivatives(){const dx=L[mode]/N,p=parameters(),grad=field.map((v,i)=>(field[Math.min(N-1,i+1)]-field[Math.max(0,i-1)])/(i===0||i===N-1?dx:2*dx)),flux=grad.map((g,i)=>-propertyProfile(p.gamma,i)*g);if(mode==='momentum')flux.forEach((_,i)=>flux[i]=-flux[i]);return{grad,flux};}
function renderCube(){const m=modes[mode],d=derivatives(),vals=view==='gradient'?d.grad:view==='flux'?d.flux:field,min=Math.min(...vals),max=Math.max(...vals);$('fieldCells').innerHTML=vals.map((v,i)=>`<div class="field-cell" style="background:${color(v,min,max,m.color)}"></div>`).join('');$('cube').className=`cube ${view}-view${layered?' layered':''}`;
 document.querySelectorAll('.vector').forEach(x=>x.remove());if(view==='gradient'||view==='flux'){for(let i=4;i<N;i+=8){const v=vals[i],mag=Math.min(34,7+27*Math.abs(v)/(Math.max(Math.abs(min),Math.abs(max))||1)),el=document.createElement('i');el.className='vector';el.style.left=`${i/N*100}%`;el.style.top=`${28+(i%3)*50}px`;el.style.width=`${mag}px`;el.style.transform=v<0?'rotate(180deg)':'none';$('cube').appendChild(el)}}
 $('particles').innerHTML='';if((mode==='heat'||mode==='mass')&&parameters().velocity>0&&view==='field'){for(let i=0;i<13;i++)$('particles').insertAdjacentHTML('beforeend',`<i class="particle" style="top:${20+(i*37)%140}px;left:${(i*47)%80}px;--delay:${-i*.31}s;--speed:${Math.max(.8,5-parameters().velocity*150)}s"></i>`)}
}
function renderPlot(){const svg=$('profilePlot'),d=derivatives(),sec=view==='field'?d.flux:d.grad,primary=view==='gradient'?d.grad:view==='flux'?d.flux:field;const min=Math.min(...primary),max=Math.max(...primary),smin=Math.min(...sec),smax=Math.max(...sec),path=(arr,lo,hi)=>arr.map((v,i)=>`${i?'L':'M'} ${35+i/(N-1)*635} ${160-(v-lo)/(hi-lo||1)*125}`).join(' ');let html='';for(let y=35;y<=160;y+=31.25)html+=`<line class="plot-grid" x1="35" x2="670" y1="${y}" y2="${y}"/>`;html+=`<path class="plot-line" d="${path(primary,min,max)}"/><path class="plot-secondary" d="${path(sec,smin,smax)}"/><text class="plot-label" x="35" y="180">0</text><text class="plot-label" x="650" y="180">${L[mode]} m</text><text class="plot-label" x="42" y="29">${fmt(max)}</text><text class="plot-label" x="42" y="156">${fmt(min)}</text>`;svg.innerHTML=html;}
function displayInventory(v){if(mode==='heat')return`${fmt(v/1e6,4)} MJ m⁻²`;return`${fmt(v,4)} ${modes[mode].inventory}`}
function renderLedger(){const cur=inventory(),expected=initialInventory+entered-leftAmount+generated,error=Math.abs(cur-expected)/(Math.abs(cur)+1e-12)*100,d=derivatives(),maxGrad=Math.max(...d.grad.map(Math.abs)),p=parameters(),dx=L[mode];$('initialInventory').textContent=displayInventory(initialInventory);$('entered').textContent='+'+displayInventory(entered);$('left').textContent='−'+displayInventory(leftAmount);$('generated').textContent='+'+displayInventory(generated);$('currentInventory').textContent=displayInventory(cur);$('balanceEquation').textContent=`= ${displayInventory(expected)}`;$('balanceError').textContent=`${error.toFixed(4)}%`;$('timeValue').textContent=mode==='mass'?(time>3600?`${fmt(time/3600)} h`:`${fmt(time)} s`):`${fmt(time)} s`;$('blindspotValue').textContent=`Maximum gradient: ${fmt(maxGrad)} ${modes[mode].unit} m⁻¹`;$('blindspotText').textContent=mode==='heat'?'The total energy alone cannot reveal hot spots or the gradients that drive heat flow.':mode==='mass'?'The total amount of species alone cannot reveal segregation or diffusion gradients.':'The total flow alone cannot reveal the velocity profile, wall shear or internal momentum transfer.';
 if(mode==='heat'){const alpha=p.gamma/p.capacity;$('numberOne').parentElement.firstChild.textContent='Fourier number';$('numberOne').textContent=fmt(alpha*time/(dx*dx),3);$('numberTwo').parentElement.firstChild.textContent='Péclet number';$('numberTwo').textContent=fmt(p.velocity*dx/alpha,2)}else if(mode==='mass'){$('numberOne').parentElement.firstChild.textContent='Diffusion number';$('numberOne').textContent=fmt(p.gamma*time/(dx*dx),3);$('numberTwo').parentElement.firstChild.textContent='Péclet number';$('numberTwo').textContent=fmt(p.velocity*dx/p.gamma,2)}else{$('numberOne').parentElement.firstChild.textContent='Momentum Fourier no.';$('numberOne').textContent=fmt((p.gamma/p.capacity)*time/(dx*dx),3);$('numberTwo').parentElement.firstChild.textContent='Mean velocity';$('numberTwo').textContent=`${fmt(field.reduce((a,b)=>a+b,0)/N,3)} m/s`}}
function render(){configure();renderCube();renderPlot();renderLedger()}
function updateRangeFills(){Object.values(controls).forEach(el=>el.style.setProperty('--fill',`${el.value}%`))}
Object.values(controls).forEach(el=>el.addEventListener('input',()=>{configure();render()}));
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));document.querySelectorAll('.view').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x===b));render()});document.querySelectorAll('#rightBoundary button').forEach(b=>b.onclick=()=>{rightBC=b.dataset.bc;document.querySelectorAll('#rightBoundary button').forEach(x=>x.classList.toggle('active',x===b));render()});
$('layerToggle').onclick=()=>{layered=!layered;$('layerToggle').setAttribute('aria-checked',layered);$('layerMarker').textContent=mode==='heat'?'low k':mode==='mass'?'low D':'low μ';render()};$('resetBtn').onclick=()=>reset();$('stepBtn').onclick=()=>{advance(1);render()};$('runBtn').onclick=()=>{running=!running;$('runBtn').textContent=running?'Ⅱ Pause':'▶ Run'};$('compareBtn').onclick=()=>reset(true);
function loop(now){if(running&&now-lastFrame>35){for(let i=0;i<4;i++)advance(1);render();lastFrame=now}requestAnimationFrame(loop)}
reset();requestAnimationFrame(loop);
