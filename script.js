(() => {
  "use strict";

  const participants = [
    "Miguel Olegario", "Pedro Lucas", "Marcos Felipe", "Pedro Nicolas",
    "Arthur Aragão", "Miguel Lucas", "Yann Aragão", "Gabriel Soares",
    "Mateus Alcântara", "Jan Pietro"
  ];
  const biomes = ["Planície", "Picos Congelados", "Floresta Escura", "Deserto",
    "Floresta Pálida", "Savana", "Mesa", "Pinheiro"];

  const $ = (id) => document.getElementById(id);
  const pairCanvas = $("pairWheel"), biomeCanvas = $("biomeWheel");
  const pairCtx = pairCanvas.getContext("2d"), biomeCtx = biomeCanvas.getContext("2d");
  const pairBtn = $("spinPairBtn"), biomeBtn = $("spinBiomeBtn");
  const startBtn = $("startBtn");
  const pairColors = ["#174a39","#8c2932","#245d4b","#5b4425","#183b55"];
  const biomeColors = ["#254d3d","#31566b","#293a30","#8c642d","#657b63","#9a7138","#9a5736","#315744"];
  const state = {
    started:false, spinning:false, remainingParticipants:[], remainingBiomes:[],
    selectedPair:[], results:[], pairAngle:0, biomeAngle:0
  };

  function secureInt(max) {
    if (!Number.isSafeInteger(max) || max < 1) throw new Error("Limite aleatório inválido.");
    const range = 0x100000000, limit = Math.floor(range / max) * max;
    const buffer = new Uint32Array(1);
    let value;
    do { crypto.getRandomValues(buffer); value = buffer[0]; } while (value >= limit);
    return value % max;
  }

  function secureShuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = secureInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function drawWheel(ctx, canvas, labels, colors, angle=0) {
    const w = canvas.width, cx = w/2, cy = w/2, radius = w/2 - 13;
    const slice = Math.PI * 2 / labels.length;
    ctx.clearRect(0,0,w,w);
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
    labels.forEach((label,i) => {
      const start = -Math.PI/2 + i*slice, end = start+slice;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,radius,start,end); ctx.closePath();
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      ctx.strokeStyle = "rgba(226,245,232,.72)"; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.rotate(start+slice/2);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      const maxWidth = radius*.66;
      let text = label;
      ctx.font = `700 ${labels.length > 6 ? 17 : 20}px Rajdhani`;
      while(ctx.measureText(text).width > maxWidth && text.length > 8) text = text.slice(0,-2)+"…";
      ctx.fillStyle = "#f4f8f1"; ctx.shadowColor="#000"; ctx.shadowBlur=5;
      ctx.fillText(text, radius-27, 0, maxWidth);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.strokeStyle="#d6e9dc"; ctx.lineWidth=7; ctx.stroke();
    ctx.restore();
  }

  function renderWheels() {
    const people = state.remainingParticipants;
    drawWheel(pairCtx,pairCanvas,people.length?people:["FIM"],people.length?pairColors:["#26352e"],state.pairAngle);
    drawWheel(biomeCtx,biomeCanvas,state.remainingBiomes.length?state.remainingBiomes:["FIM"],state.remainingBiomes.length?biomeColors:["#26352e"],state.biomeAngle);
    $("pairCount").textContent = `${people.length} PARTICIPANTE${people.length===1?"":"S"} RESTANTE${people.length===1?"":"S"}`;
    $("biomeCount").textContent = `${state.remainingBiomes.length} BIOMA${state.remainingBiomes.length===1?"":"S"} RESTANTE${state.remainingBiomes.length===1?"":"S"}`;
  }

  function renderResults() {
    const grid=$("resultsGrid"); grid.innerHTML="";
    state.results.forEach((r,i)=>{
      const card=document.createElement("article"); card.className="result-card";
      const n=document.createElement("div"); n.className="number"; n.textContent=`DUPLA ${String(i+1).padStart(2,"0")}`;
      const pair=document.createElement("div"); pair.className="pair"; pair.textContent=`${r.pair[0]} & ${r.pair[1]}`;
      const biome=document.createElement("div"); biome.className="biome"; biome.textContent=`✦ ${r.biome.toUpperCase()}`;
      card.append(n,pair,biome); grid.append(card);
    });
    $("waitingState").classList.toggle("hidden",state.results.length>0);
    $("progressText").textContent=state.results.length===5?"SORTEIO CONCLUÍDO":`${state.results.length} DE 5 DUPLAS DEFINIDAS`;
    if(state.results.length===5) $("progressText").textContent="✦ SORTEIO CONCLUÍDO ✦";
  }

  function toast(message) {
    const el=$("toast"); el.textContent=message; el.classList.add("show");
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600);
  }

  function startDraw() {
    if(state.started && !confirm("Isso apagará os resultados e fará um novo sorteio completo. Continuar?")) return;
    try {
      state.remainingParticipants=secureShuffle(participants);
      state.remainingBiomes=secureShuffle(biomes);
      state.selectedPair=[]; state.results=[]; state.started=true; state.spinning=false;
      state.pairAngle=0; state.biomeAngle=0;
      pairBtn.disabled=false; biomeBtn.disabled=true;
      startBtn.innerHTML="<span>↻</span> REINICIAR SORTEIO";
      $("progressText").textContent="AGUARDANDO PRIMEIRA DUPLA";
      renderWheels(); renderResults();
      toast("Sorteio iniciado. Gire para sortear o primeiro nome!");
    } catch(e) { toast("Seu navegador não liberou o gerador seguro de números."); }
  }

  function spinWheel(kind) {
    if(!state.started || state.spinning) return;
    const isPair=kind==="pair";
    const items=isPair?state.remainingParticipants:state.remainingBiomes;
    if(!items.length) return;
    state.spinning=true; pairBtn.disabled=true; biomeBtn.disabled=true; startBtn.disabled=true;
    const chosenIndex=secureInt(items.length);
    const canvas=isPair?pairCanvas:biomeCanvas;
    const ctx=isPair?pairCtx:biomeCtx;
    const labels=items.slice(), colors=isPair?pairColors:biomeColors;
    const slice=2*Math.PI/items.length;
    const current=isPair?state.pairAngle:state.biomeAngle;
    const desired=-chosenIndex*slice-slice/2, fullTurn=2*Math.PI;
    const delta=(((desired-current)%fullTurn)+fullTurn)%fullTurn+fullTurn*(5+secureInt(4));
    const finalAngle=current+delta, duration=4400+secureInt(900), start=performance.now();
    const ease=t=>1-Math.pow(1-t,5);
    function frame(now) {
      const t=Math.min(1,(now-start)/duration);
      drawWheel(ctx,canvas,labels,colors,current+(finalAngle-current)*ease(t));
      if(t<1) requestAnimationFrame(frame);
      else {
        if(isPair) {
          state.pairAngle=finalAngle;
          const name=state.remainingParticipants.splice(chosenIndex,1)[0];
          state.selectedPair.push(name);
          if(state.selectedPair.length===1) {
            toast(`Primeiro nome: ${name}. Gire novamente para sortear o parceiro!`);
            pairBtn.disabled=false;
          } else {
            toast(`Dupla formada: ${state.selectedPair[0]} + ${state.selectedPair[1]}! Agora sorteie o bioma.`);
            pairBtn.disabled=true; biomeBtn.disabled=false;
          }
        } else {
          state.biomeAngle=finalAngle;
          const biome=state.remainingBiomes.splice(chosenIndex,1)[0];
          state.results.push({pair:state.selectedPair.slice(),biome});
          state.selectedPair=[];
          renderResults();
          if(state.results.length===5) {
            pairBtn.disabled=true; biomeBtn.disabled=true;
            toast("TODAS AS CINCO DUPLAS E SEUS BIOMAS FORAM DEFINIDOS!");
          } else {
            pairBtn.disabled=false; biomeBtn.disabled=true;
            toast("Bioma definido! Agora gire duas vezes para formar a próxima dupla.");
          }
        }
        renderWheels(); state.spinning=false; startBtn.disabled=false;
      }
    }
    requestAnimationFrame(frame);
  }

  startBtn.addEventListener("click",startDraw);
  pairBtn.addEventListener("click",()=>spinWheel("pair"));
  biomeBtn.addEventListener("click",()=>spinWheel("biome"));
  $("showRulesBtn").addEventListener("click",()=>{
    const rules=$("rules"); rules.classList.toggle("hidden");
    $("showRulesBtn").textContent=rules.classList.contains("hidden")?"COMO FUNCIONA +":"FECHAR −";
  });

  drawWheel(pairCtx,pairCanvas,["NOMES","SEPARADOS","BOA SORTE","NETHERITE","SQUAD 2"],pairColors);
  drawWheel(biomeCtx,biomeCanvas,biomes,biomeColors);
})();
