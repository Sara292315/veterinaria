const formCitas = document.getElementById('form-citas');
const msg = document.getElementById('citas-msg');
document.getElementById('fecha').min = Validators.hoyISO(); // fecha local, no UTC

function mostrarMensaje(tipo, titulo, lista = []) {
  msg.className = 'msg msg-' + tipo;
  msg.hidden = false;
  msg.innerHTML = '';
  const t = document.createElement('strong'); t.textContent = titulo; msg.appendChild(t);
  if (lista.length) {
    const ul = document.createElement('ul');
    lista.forEach(x => { const li = document.createElement('li'); li.textContent = x; ul.appendChild(li); });
    msg.appendChild(ul);
  }
}

function marcarCampos(errores) {
  formCitas.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  Object.keys(errores).forEach(c => { const el = formCitas.elements[c]; if (el) el.setAttribute('aria-invalid', 'true'); });
}

formCitas.addEventListener('submit', async function (e) {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(formCitas).entries());
  datos.recordatorio = new FormData(formCitas).getAll('recordatorio').join(',');
  let errores = Validators.validarCita(datos);
  if (!Object.keys(errores).length) {
    try {
      const r = await fetch('/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
      const cuerpo = await r.json().catch(() => ({})); // p. ej. 413 devuelve HTML
      if (r.ok) { marcarCampos({}); mostrarMensaje('ok', 'Solicitud enviada. La veterinaria confirmará tu cita.'); formCitas.reset(); return; }
      errores = cuerpo.errores || {};
      if (!Object.keys(errores).length) { mostrarMensaje('error', cuerpo.error || 'No se pudo enviar la solicitud.'); return; }
    } catch (err) {
      mostrarMensaje('error', 'No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.');
      return;
    }
  }
  marcarCampos(errores);
  mostrarMensaje('error', 'Revisa los siguientes campos:', Object.values(errores));
  const primero = formCitas.elements[Object.keys(errores)[0]]; if (primero) primero.focus();
});

/* ===== ANIMACIONES GSAP ===== */
(function(){
  const pl=document.getElementById('preloader');
  if(!window.gsap||!window.ScrollTrigger){ if(pl) pl.remove(); return; } // si falla el CDN, la página sigue funcionando
  gsap.registerPlugin(ScrollTrigger);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Preloader */
  const fill=pl.querySelector('.pl-fill'),paw=pl.querySelector('.pl-paw'),pct=pl.querySelector('.pl-pct'),ball=pl.querySelector('.pl-ball');
  const prog={v:0};
  const render=()=>{fill.style.width=prog.v+'%';paw.style.left=prog.v+'%';pct.textContent=Math.round(prog.v)+'%';};
  document.body.style.overflow='hidden';
  const fake=gsap.to(prog,{v:90,duration:1.6,ease:'power1.out',onUpdate:render});
  const bounce=gsap.timeline({repeat:-1})
    .to(ball,{y:-70,duration:.55,ease:'power2.out'})
    .to(ball,{y:0,duration:.55,ease:'bounce.out'});

  const loaded=new Promise(r=>document.readyState==='complete'?r():window.addEventListener('load',r));
  const minTime=new Promise(r=>setTimeout(r,1400));
  Promise.all([loaded,minTime]).then(()=>{
    fake.kill();
    gsap.to(prog,{v:100,duration:.4,onUpdate:render,onComplete:()=>{
      gsap.to(pl,{opacity:0,scale:1.15,duration:.8,ease:'power2.inOut',onComplete:()=>{
        bounce.kill();pl.remove();document.body.style.overflow='';
        ScrollTrigger.refresh();heroIntro();
      }});
    }});
  });

  function heroIntro(){
    if(reduce) return;
    gsap.from('.hero-text > *',{y:30,opacity:0,stagger:.12,duration:.8,ease:'power3.out'});
    gsap.from('.hero-img',{y:80,opacity:0,duration:1,ease:'power3.out'});
    gsap.from('.hero-paw',{scale:0,rotation:-60,duration:1,ease:'back.out(1.6)',delay:.3});
    gsap.to('.hero-paw',{y:-14,rotation:6,duration:2,yoyo:true,repeat:-1,ease:'sine.inOut',delay:1.3}); // flotación idle
  }

  if(reduce) return;

  /* 2. Hero: la huella "se dispara" hacia la pantalla al hacer scroll */
  gsap.timeline({scrollTrigger:{trigger:'.hero',start:'top top',end:'+=110%',scrub:.6,pin:true,anticipatePin:1}})
    .to('.hero-paw',{scale:16,rotation:40,ease:'power2.in',duration:1},0)
    .to('.hero-text,.hero-img',{opacity:0,y:-50,duration:.6},0)
    .to('.hero-paw',{opacity:0,duration:.3},.75);

  /* 3. Servicios: entrada escalonada */
  const cards=gsap.utils.toArray('.servicio-card');
  gsap.set(cards,{opacity:0,y:50});
  ScrollTrigger.batch(cards,{start:'top 88%',once:true,
    onEnter:b=>gsap.to(b,{opacity:1,y:0,stagger:.12,duration:.8,ease:'power3.out'})});

  gsap.utils.toArray('.section-head').forEach(el=>
    gsap.from(el,{y:30,opacity:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}}));

  /* Hover: tilt 3D + reflejo de brillo */
  if(matchMedia('(hover:hover)').matches){
    cards.forEach(c=>{
      c.addEventListener('mousemove',e=>{
        const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
        c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');
        gsap.to(c,{rotationY:(x-.5)*12,rotationX:(.5-y)*12,y:-6,transformPerspective:800,duration:.4,ease:'power2.out',overwrite:'auto'});
      });
      c.addEventListener('mouseleave',()=>gsap.to(c,{rotationX:0,rotationY:0,y:0,duration:.6,ease:'power3.out',overwrite:'auto'}));
    });
  }
})();
