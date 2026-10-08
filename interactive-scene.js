import * as THREE from './assets/vendor/three.module.js';

/* One renderer, seven independent interaction grammars. Resources are created once
   and reused across visits; particles morph on the GPU rather than in JS loops. */
export function createExhibition(renderer) {
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100),root=new THREE.Group();scene.add(root);
  const rooms=Array.from({length:7},(_,i)=>{const g=new THREE.Group();g.position.y=-i*14;root.add(g);return g;});
  const resources=new Set(),targets=Array.from({length:7},()=>[]),ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,chapter=0,selected=0,time=0,age=0,entrance=0,yaw=0,pitch=0,zoom=1,action=null,gather=0,introStarted=false,introNotified=false,introAge=0,dissolve=0,travel=0,travelFrom=0,travelTo=0,travelAge=1,timeline=3,timelineDisplay=3,region={},mobile=false;
  const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
  const wake=()=>emit('exhibition-wake');
  const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>1-(1-clamp(t))**4;
  const colors=['#e2e2e2','#bcbcbc','#909090','#dedede','#a0a0a0','#c6c6c6','#777777'];
  const own=r=>{resources.add(r);return r;};
  const mat=(color,extra={})=>own(new THREE.MeshStandardMaterial({color,roughness:.25,metalness:.28,...extra}));
  const white=mat('#202020'),glass=mat('#d8d4cb',{transparent:true,opacity:.27,depthWrite:false}),ink=mat('#514735');
  scene.add(new THREE.HemisphereLight('#ffffff','#b6ae9e',3));
  const light=new THREE.DirectionalLight('#fff5ee',4);light.position.set(-3,6,8);scene.add(light);
  const fill=new THREE.DirectionalLight('#e9ede6',3);fill.position.set(5,-3,4);scene.add(fill);
  function boxGeometry(){const vertices=[];const faces=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]];for(const [n,u,v] of faces){const p=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>n.map((c,k)=>(c+a*u[k]+b*v[k])*.5));for(const i of [0,1,2,0,2,3])vertices.push(...p[i]);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices),3));g.computeVertexNormals();return g;}
  function curveThrough(points){return {getPoint(t){const segment=Math.min(points.length-2,Math.floor(t*(points.length-1))),u=t*(points.length-1)-segment;return points[segment].clone().lerp(points[segment+1],u);},getPoints(count){return Array.from({length:count+1},(_,i)=>this.getPoint(i/count));}};}
  const orbGeo=own(new THREE.SphereGeometry(1,32,24)),boxGeo=own(boxGeometry()),planeGeo=own(new THREE.PlaneGeometry(1,1));
  let glowMat;
  function mesh(geo,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);if(geo===orbGeo&&glowMat){const glow=new THREE.Mesh(planeGeo,glowMat);glow.scale.set(3.7,3.7,1);glow.position.z=-.12;m.add(glow);}return m;}
  function ring(parent,r,color,rotation=0){const pts=Array.from({length:128},(_,i)=>new THREE.Vector3(Math.cos(i/128*Math.PI*2)*r,Math.sin(i/128*Math.PI*2)*r,0));pts.push(pts[0].clone());const l=new THREE.Line(own(new THREE.BufferGeometry().setFromPoints(pts)),own(new THREE.LineBasicMaterial({color,transparent:true,opacity:.45})));l.rotation.x=rotation;parent.add(l);return l;}
  function line(parent,points,color,opacity=.5){const l=new THREE.Line(own(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)))),own(new THREE.LineBasicMaterial({color,transparent:true,opacity})));parent.add(l);return l;}
  function text(parent,words,w=2,h=.5,color='#514b40',font=36){const c=document.createElement('canvas');c.width=1536;c.height=Math.round(1536*h/w);const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.font=`500 ${Math.min(c.height*.68,font*6)}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(words,768,c.height/2,1470);const texture=own(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());const m=mesh(planeGeo,own(new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide})),parent);m.scale.set(w,h,1);return m;}
  function selectable(object,index,room){object.userData.index=index;targets[room].push(object);return object;}
  function halo(parent,r,color){return ring(parent,r,color);}

  glowMat=own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uColor:{value:new THREE.Color('#ffffff')}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 uColor;varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float a=exp(-r*r*5.)*.25*smoothstep(1.,.65,r);gl_FragColor=vec4(uColor,a);}' }));

  // 01 — Free particles retain their identity while finding the sampled glyph.
  const glyph=document.createElement('canvas');glyph.width=1200;glyph.height=300;const ctx=glyph.getContext('2d');ctx.fillStyle='#fff';ctx.font='700 255px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('HYTEX',600,158);
  const pixels=ctx.getImageData(0,0,1200,300).data,samples=[];
  for(let y=20;y<280;y+=3)for(let x=20;x<1180;x+=3)if(pixels[(y*1200+x)*4+3]>160)samples.push([(x-600)/110,(150-y)/110]);
  const count=innerWidth<=700?8000:14000,pos=new Float32Array(count*3),goal=new Float32Array(count*3),seed=new Float32Array(count),paths=new Float32Array(count*4);
  function scatterIdentity(source=null){
    for(let i=0;i<count;i++){
      // Start on the button glyphs; flight paths are randomized once per entry.
      const angle=Math.random()*Math.PI*2,radius=Math.sqrt(-2*Math.log(Math.max(.0001,Math.random())))*.6;
      if(source)pos.set(source.subarray(i*3,i*3+3),i*3);else pos.set([Math.cos(angle)*radius*.06,Math.sin(angle)*radius*.06,0],i*3);
      seed[i]=Math.random();paths.set([Math.random(),Math.random(),Math.random(),Math.random()],i*4);
    }
  }
  scatterIdentity();
  for(let i=0;i<count;i++){const p=samples[Math.floor(Math.random()*samples.length)];goal.set([p[0]+(Math.random()-.5)*.022,p[1]+(Math.random()-.5)*.022,(Math.random()-.5)*.035],i*3);}
  const particleGeo=own(new THREE.BufferGeometry());particleGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));particleGeo.setAttribute('aGoal',new THREE.BufferAttribute(goal,3));particleGeo.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));particleGeo.setAttribute('aPath',new THREE.BufferAttribute(paths,4));
  const techGoals=new Float32Array(count*3),textSource=new Float32Array(goal);particleGeo.setAttribute('aTechGoal',new THREE.BufferAttribute(techGoals,3));particleGeo.setAttribute('aTextSource',new THREE.BufferAttribute(textSource,3));
  let techAge=0,techLayoutReady=false,techNotified=false,textRevision=0,textDirection=0,textSourceIndex=0,textFlight=false,textPending=false;
  const particleMat=own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uMorph:{value:0},uTech:{value:0},uTextMode:{value:0},uDirection:{value:0},uHandoff:{value:0},uDisperse:{value:0},uDpr:{value:1},uField:{value:new THREE.Vector2(8,5)}},vertexShader:`
    attribute vec3 aGoal,aTechGoal,aTextSource;
    attribute float aSeed;
    attribute vec4 aPath;
    uniform float uTime,uMorph,uDisperse,uDpr,uTech,uHandoff,uTextMode,uDirection;
    uniform vec2 uField;
    varying float vSeed,vFade;
    void main(){
      vSeed=aSeed;vFade=(1.-uDisperse)*(1.-uHandoff);
      float born=aPath.w*.08;
      float progress=clamp((uMorph-born)/(1.-born),0.,1.);
      float angle=aPath.x*6.2831853;
      float reach=.3+aPath.y*.55;
      vec3 start=position;
      vec3 spread=start+vec3(cos(angle)*uField.x*reach,sin(angle)*uField.y*reach,(aSeed-.5)*3.);
      float outward=clamp(progress/.32,0.,1.);
      float burstEase=1.-pow(1.-outward,3.);
      vec3 p=mix(start,spread,burstEase);
      p.xy+=vec2(-sin(angle),cos(angle))*sin(outward*3.14159265)*aPath.z*.6;
      float phase=clamp((progress-.32)/.68,0.,1.);
      float t=phase*phase*(3.-2.*phase),r=1.-t;
      vec3 bendA=spread+vec3((aPath.yz-.5)*uField*.65,(aSeed-.5)*2.);
      vec3 bendB=aGoal+vec3((aPath.zy-.5)*uField*.5,(aPath.x-.5)*2.);
      if(progress>.32)p=r*r*r*spread+3.*r*r*t*bendA+3.*r*t*t*bendB+t*t*t*aGoal;
      vFade*=mix(smoothstep(born,born+.025,uMorph),1.,uTextMode);
      float flight=clamp((uTech-aPath.w*.16)/.84,0.,1.);
      float q=flight*flight*(3.-2.*flight),v=1.-q;
      vec3 turnA=aTextSource+vec3((aPath.xy-.5)*uField*.9,1.+aPath.z*2.);turnA.y+=uDirection*uField.y*.35;
      vec3 turnB=aTechGoal+vec3((aPath.yz-.5)*uField*.6,-aSeed);turnB.y-=uDirection*uField.y*.2;
      vec3 tech=v*v*v*aTextSource+3.*v*v*q*turnA+3.*v*q*q*turnB+q*q*q*aTechGoal;
      p=mix(p,tech,uTextMode);
      p.xy+=position.xy*uField*uDisperse;p.z+=aSeed*uDisperse*3.;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      gl_PointSize=(1.05+aSeed*.9)*uDpr;
    }`,fragmentShader:`varying float vSeed,vFade;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float alpha=1.-smoothstep(.2,.5,d);gl_FragColor=vec4(vec3(1.),alpha*(.62+vSeed*.32)*vFade);}`}));
  const particles=new THREE.Points(particleGeo,particleMat);particles.frustumCulled=false;scene.add(particles);const identityRings=[];


  function rasterText(labels){
    const canvas=document.createElement('canvas');canvas.width=innerWidth;canvas.height=innerHeight;
    const context=canvas.getContext('2d');context.fillStyle='#fff';context.textBaseline='middle';
    labels.forEach(label=>{context.font=label.font;if('letterSpacing' in context)context.letterSpacing=label.spacing==='normal'?'0px':label.spacing||'0px';context.fillText(label.text,label.x,label.y+label.height/2);});
    const data=context.getImageData(0,0,canvas.width,canvas.height).data,points=[];
    for(let y=0;y<canvas.height;y+=2)for(let x=0;x<canvas.width;x+=2)if(data[(y*canvas.width+x)*4+3]>100)points.push([x,y]);
    if(!points.length)return null;
    const z=mobile?Math.max(13,17/camera.aspect):13,halfY=Math.tan(THREE.MathUtils.degToRad(19))*z,halfX=halfY*camera.aspect,result=new Float32Array(count*3);
    for(let i=0;i<count;i++){const point=points[i%points.length];result.set([(point[0]/innerWidth*2-1)*halfX,(1-point[1]/innerHeight*2)*halfY,0],i*3);}return result;
  }
  // Evaluate the same curve as the vertex shader only when a flight is interrupted.
  // Reusing its current positions avoids snapping back to an earlier page.
  function snapshotFlight(){
    if(!textFlight)return new Float32Array(goal);
    const result=new Float32Array(count*3),progress=particleMat.uniforms.uTech.value,field=particleMat.uniforms.uField.value;
    for(let i=0;i<count;i++){
      const phase=clamp((progress-paths[i*4+3]*.16)/.84),t=phase*phase*(3-2*phase),v=1-t;
      for(let axis=0;axis<3;axis++){
        const k=i*3+axis,start=textSource[k],end=techGoals[k];
        const bendA=start+(axis===0?(paths[i*4]-.5)*field.x*.9:axis===1?(paths[i*4+1]-.5)*field.y*.9+textDirection*field.y*.35:1+paths[i*4+2]*2);
        const bendB=end+(axis===0?(paths[i*4+1]-.5)*field.x*.6:axis===1?(paths[i*4+2]-.5)*field.y*.6-textDirection*field.y*.2:-seed[i]);
        result[k]=v*v*v*start+3*v*v*t*bendA+3*v*t*t*bendB+t*t*t*end;
      }
    }return result;
  }
  document.addEventListener('exhibition-text-source',e=>{
    const source=textFlight&&techAge<2.6?snapshotFlight():e.detail.index===0?new Float32Array(goal):rasterText(e.detail.labels)||snapshotFlight();
    textSource.set(source);particleGeo.attributes.aTextSource.needsUpdate=true;textSourceIndex=e.detail.index;textPending=true;textFlight=true;techLayoutReady=false;
    particleMat.uniforms.uTextMode.value=1;particleMat.uniforms.uTech.value=0;particleMat.uniforms.uHandoff.value=0;
  });
  document.addEventListener('exhibition-text-target',e=>{
    if(e.detail.index!==chapter)return;
    if(!textPending){textSourceIndex=chapter;textSource.set(snapshotFlight());particleGeo.attributes.aTextSource.needsUpdate=true;}
    textDirection=Math.sign(textSourceIndex-chapter);particleMat.uniforms.uDirection.value=textDirection;
    const destination=chapter===0?goal:rasterText(e.detail.labels);
    textRevision=e.detail.revision;techAge=0;techNotified=false;textFlight=true;textPending=false;
    if(!destination){techLayoutReady=false;particleMat.uniforms.uHandoff.value=1;emit('exhibition-text-ready',{index:chapter,revision:textRevision});return;}
    techGoals.set(destination);particleGeo.attributes.aTechGoal.needsUpdate=true;techLayoutReady=true;particleMat.uniforms.uTextMode.value=1;particleMat.uniforms.uTech.value=0;wake();
  });
  const nodes=[];

  // 03 — Project numbers arrive in order and hand over to the HTML list.
  function slab(parent,w,h,color){const g=new THREE.Group();parent.add(g);mesh(boxGeo,mat(color),g).scale.set(w,h,.1);const edge=mesh(boxGeo,white,g,0,0,.058);edge.scale.set(w-.09,h-.09,.025);return g;}
  const files=window.RESUME.projects.map((p,i)=>{const g=new THREE.Group();rooms[2].add(g);const face=text(g,p.number,2,2.55,'#eeeeee',100);selectable(face,i,2);return g;});
  let projectClock=0,projectRects=[],projectFlights=[];
  function planProjectFlights(){
    const halfY=Math.tan(THREE.MathUtils.degToRad(19))*camera.position.z,halfX=halfY*camera.aspect;
    projectFlights=files.map((file,i)=>{const rect=projectRects[i]||{x:innerWidth*.12,y:innerHeight*.28+i*60,height:38},target=new THREE.Vector3((rect.x/innerWidth*2-1)*halfX,(1-rect.y/innerHeight*2)*halfY,0),angle=-Math.PI/2+i*Math.PI*2/files.length;
      const radius=Math.hypot(halfX,halfY)*1.5,start=new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,(i%3-1)*5),distance=start.distanceTo(target),duration=Math.min(1.8,Math.max(.85,distance/15)),arrival=2.05+i*.19;
      return {start,target,duration,arrival,delay:arrival-duration,angle,scale:rect.height/innerHeight*halfY*2/2.55,arrived:false};});
  }
  document.addEventListener('exhibition-project-layout',e=>{projectRects=e.detail;planProjectFlights();wake();});
  // 04 — One continuous time strip. No cards: the working history is read by scrubbing.
  const jobs=window.RESUME.experience.map((e,i)=>{const g=new THREE.Group();rooms[3].add(g);text(g,e.period.slice(0,4),2.8,1.05,'#e3e3e3',100).position.y=.65;text(g,e.shortCompany,3,.4,'#a1a1a1',35).position.y=-.65;text(g,e.role,3,.3,'#777777',25).position.y=-1.15;return g;});
  let careerRailY=null;
  document.addEventListener('exhibition-career-layout',e=>{careerRailY=e.detail.railY;wake();});
  const timelineRail=new THREE.Group();rooms[3].add(timelineRail);line(timelineRail,[[-1.8,0,0],[13,0,0]],'#666666',.6);
  for(let i=0;i<65;i++)line(timelineRail,[[i*.2-.8,-.05,0],[i*.2-.8,i%5===0?.18:.08,0]],'#555555',.7);
  const timeNeedle=mesh(orbGeo,mat('#dddddd',{emissive:'#aaaaaa',emissiveIntensity:.35}),rooms[3],0,.02,.3);timeNeedle.scale.setScalar(.065);
  // The query execution view uses crisp DOM lines and code, sharing the page layout.

  // Contact is a static, accessible typographic page.

  // 07 — Photo negatives float in a spatial contact sheet and develop on selection.
  const photos=window.HYTEX_HOBBIES.photos.map((p,i)=>{const g=slab(rooms[6],2.55,2.1,colors[i]);const placeholder=mesh(planeGeo,mat('#d6d0c3'),g,0,.08,.08);placeholder.scale.set(2.32,1.6,1);selectable(g.children[0],i,6);selectable(placeholder,i,6);return {g,placeholder,p};});let photosLoaded=false;
  async function loadPhotos(){if(photosLoaded)return;photosLoaded=true;await Promise.all(photos.map(async({p,placeholder})=>{try{const im=new Image();im.src=p.src;await im.decode();const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024/1.45);const ct=c.getContext('2d');const scale=Math.max(c.width/im.width,c.height/im.height);ct.drawImage(im,(c.width-im.width*scale)/2,(c.height-im.height*scale)/2,im.width*scale,im.height*scale);const texture=own(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());placeholder.material=own(new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{uMap:{value:texture},uDevelop:{value:1},uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D uMap;uniform float uDevelop;uniform float uTime;varying vec2 vUv;void main(){vec3 col=texture2D(uMap,vUv).rgb;float gray=dot(col,vec3(.299,.587,.114));float edge=smoothstep(uDevelop-.1,uDevelop+.1,vUv.y);vec3 developed=mix(col,vec3(gray*.75+.13),edge);float scan=exp(-pow((vUv.y-uDevelop)*32.,2.));gl_FragColor=vec4(developed+vec3(.12,.1,.06)*scan,1.);\n#include <colorspace_fragment>\n}' }));if(!active)return;wake();}catch{emit('exhibition-photo-error',{src:p.src});}}));}
  const eggPosition=new THREE.Vector3(),eggScreen=new THREE.Vector3();
  const photoOrbit=line(rooms[6],[[-18,1.35,-.1],[18,1.35,-.1]],'#b6ac97',.7);

  // A soft field of shards provides depth without post-processing passes.
  const dustPos=new Float32Array(520*3);for(let i=0;i<520;i++)dustPos.set([(Math.random()-.5)*24,5-Math.random()*100,-4-Math.random()*7],i*3);
  const dustGeo=own(new THREE.BufferGeometry());dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=2.;}',fragmentShader:'void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.8,.8,.8,.22);}' })));scene.add(dust);
  const burstPos=new Float32Array(180*3);for(let i=0;i<180;i++)burstPos.set([Math.random(),Math.random(),Math.random()],i*3);
  const burstGeo=own(new THREE.BufferGeometry());burstGeo.setAttribute('position',new THREE.BufferAttribute(burstPos,3));const burstMat=own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uProgress:{value:0},uCenter:{value:new THREE.Vector3()},uDpr:{value:1}},vertexShader:'uniform float uProgress;uniform vec3 uCenter;uniform float uDpr;varying float vFade;varying float vHue;void main(){float angle=position.x*6.28318+uProgress*3.;float radius=(.3+position.y*2.8)*sin(uProgress*3.14159);vec3 p=uCenter+vec3(cos(angle)*radius,sin(angle)*radius,(position.z-.5)*radius);vFade=sin(uProgress*3.14159);vHue=position.z;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=(1.5+position.z*2.)*uDpr;}',fragmentShader:'varying float vFade;varying float vHue;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(mix(vec3(.95),vec3(.65),vHue),vFade*smoothstep(.5,.12,d));}'}));const burst=new THREE.Points(burstGeo,burstMat);burst.frustumCulled=false;scene.add(burst);
  const guide=mesh(orbGeo,mat('#eeeeee',{emissive:'#dddddd',emissiveIntensity:.45}),scene);guide.scale.setScalar(.06);guide.visible=false;
  const threadPoints=[];for(let i=0;i<=140;i++){const y=-i*.6;threadPoints.push([Math.sin(y*.14)*.32-6,y,-1.5]);}
  const burstCenter=new THREE.Vector3(),targetPosition=new THREE.Vector3();
  function resize(){mobile=innerWidth<=700;const w=innerWidth,h=innerHeight;region={x:0,y:0,w,h};renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2,Math.sqrt(4500000/(w*h))));renderer.setSize(w,h,false);camera.aspect=region.w/region.h;camera.updateProjectionMatrix();particleMat.uniforms.uDpr.value=renderer.getPixelRatio();burstMat.uniforms.uDpr.value=renderer.getPixelRatio();wake();}
  function setActive(value){active=value;action=null;if(value){renderer.setClearColor('#090909',1);introStarted=false;introAge=0;dissolve=0;textFlight=false;textPending=false;techLayoutReady=false;particleMat.uniforms.uTextMode.value=0;travel=travelFrom=travelTo=0;travelAge=1;resize();loadPhotos();}else{renderer.setClearColor(0x000000,0);renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.clear();}}
  function choose(index){selected=index;if(chapter===3)timeline=index;action=null;wake();}
  function change(index){if(index===6)eggPosition.set(100,0,-12);travel=travelFrom=travelTo=-index*14;travelAge=1;chapter=index;selected=index===1?1:index===3?3:0;timeline=timelineDisplay=3;age=0;entrance=0;action=null;gather=0;techAge=0;techLayoutReady=false;techNotified=false;if(index===2){projectClock=0;projectFlights=[];}yaw=pitch=0;zoom=1;particleMat.uniforms.uMorph.value=0;wake();}
  function trigger(){if(chapter===6&&selected===photos.length)return;if(!active||action||chapter===1||chapter===4||chapter===5)return;if(chapter===0&&gather<1)return;if(chapter===1){const n=nodes[selected];if(n.pop>0)return;n.g.getWorldPosition(burstCenter);n.pop=2.2;}action={age:0,duration:chapter===0?.5:chapter===1?.65:chapter===4?3.4:1.15,index:selected};wake();}
  document.addEventListener('exhibition-intro',e=>{scatterIdentity(rasterText(e.detail?.labels||[]));['position','aSeed','aPath'].forEach(key=>particleGeo.attributes[key].needsUpdate=true);introStarted=true;introNotified=false;introAge=0;wake();});
  document.addEventListener('exhibition-hover',e=>{nodes.forEach((n,i)=>n.hover=i===e.detail.index);});
  document.addEventListener('exhibition-gather',e=>{gather=e.detail.value;wake();});
  document.addEventListener('exhibition-chapter',e=>change(e.detail.index));document.addEventListener('exhibition-select',e=>choose(e.detail.index));document.addEventListener('exhibition-action',trigger);document.addEventListener('exhibition-cancel',()=>{action=null;});
  document.addEventListener('exhibition-view',e=>{const previous=yaw;({yaw,pitch,zoom}=e.detail);if(chapter===3){timeline=Math.max(0,Math.min(3,timeline+(yaw-previous)*2));const i=Math.round(timeline);if(selected!==i){selected=i;emit('exhibition-preview',{index:i});}}wake();});
  document.addEventListener('exhibition-timeline',e=>{timeline=3-e.detail.value*3;selected=Math.round(timeline);emit('exhibition-preview',{index:selected});wake();});
  document.addEventListener('exhibition-snap',()=>{if(chapter===3){timeline=Math.round(timeline);selected=timeline;yaw=0;emit('exhibition-preview',{index:selected});wake();return;}if(chapter!==2&&chapter!==6)return;const spacing=chapter===2?2.6:3,max=chapter===2?files.length:photos.length+1;selected=Math.max(0,Math.min(max-1,Math.round(selected-yaw*2/spacing)));yaw=0;emit('exhibition-preview',{index:selected});wake();});
  document.addEventListener('exhibition-hit',e=>{if(!active||chapter===1)return;if(chapter===0||chapter===3||chapter===4||chapter===5){trigger();return;}mouse.set((e.detail.x-region.x)/region.w*2-1,1-(e.detail.y-region.y)/region.h*2);scene.updateMatrixWorld(true);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(targets[chapter],false)[0];if(hit&&(chapter!==2||projectFlights[hit.object.userData.index]?.arrived))emit('exhibition-picked',{index:hit.object.userData.index,hold:!!e.detail.hold});});
  const temp=new THREE.Vector3();
  function render(dt,paused){
    if(!active)return;const motion=!paused;age+=dt;if(motion)time+=dt;entrance=Math.min(1,entrance+dt/1.15);if(action)action.age=reduced.matches?action.duration:action.age+dt;
    const u=action?(reduced.matches?1:ease(action.age/action.duration)):0;
    renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.clear();renderer.setViewport(region.x,innerHeight-region.y-region.h,region.w,region.h);renderer.setScissor(region.x,innerHeight-region.y-region.h,region.w,region.h);renderer.setScissorTest(true);
    travelAge=Math.min(1,travelAge+dt/1.2);travel=reduced.matches?travelTo:THREE.MathUtils.lerp(travel,travelTo,1-Math.exp(-dt*11));
    camera.position.set(0,travel,(mobile?Math.max(13,17/camera.aspect):13)*zoom);camera.lookAt(0,travel,0);
    rooms.forEach((g,i)=>{g.visible=Math.abs(g.position.y-travel)<12;g.rotation.x=0;g.rotation.y=i===chapter&&chapter===0?yaw*.1:0;});
    guide.position.set(-5.8,travel+2.8+Math.sin(time*.5)*.04,0);
    if(introStarted)introAge+=dt;
    const morph=(reduced.matches?1:clamp(Math.max(0,introAge-.12)/4.2));
    if(textFlight&&techLayoutReady)techAge+=dt;
    const techProgress=textFlight?(reduced.matches?1:clamp(techAge/2.6)):0;
    particleMat.uniforms.uTech.value=techProgress;
    particleMat.uniforms.uHandoff.value=textFlight&&chapter!==0?(reduced.matches?1:clamp((techAge-2.6)/.35)):0;
    particles.position.y=travel;particles.visible=chapter===0||textPending||textFlight&&techAge<3;
    if(textFlight&&techLayoutReady&&!techNotified&&(techAge>=2.6||reduced.matches)){techNotified=true;emit('exhibition-text-ready',{index:chapter,revision:textRevision});}
    particleMat.uniforms.uMorph.value=morph;particleMat.uniforms.uDisperse.value=dissolve;particleMat.uniforms.uTime.value=time;
    particleMat.uniforms.uField.value.set(Math.tan(THREE.MathUtils.degToRad(19))*camera.position.z*camera.aspect*1.08,Math.tan(THREE.MathUtils.degToRad(19))*camera.position.z*1.08);
    rooms[1].visible=false;rooms[4].visible=false;rooms[5].visible=false;
    if(chapter===2){
      projectClock+=dt;
      if(!projectFlights.length)planProjectFlights();
      files.forEach((g,i)=>{const f=projectFlights[i],raw=clamp((projectClock-f.delay)/f.duration),t=reduced.matches?1:raw<.5?4*raw**3:1-(-2*raw+2)**3/2;
        g.visible=false;g.position.lerpVectors(f.start,f.target,t);g.position.y+=(travel+28)*t;g.position.z+=Math.sin(Math.PI*t)*2;
        g.rotation.set((1-t)*.8,(1-t)*(i%2?1:-1)*1.6,(1-t)*f.angle);g.scale.setScalar(THREE.MathUtils.lerp(.65,f.scale,t));
        if((raw>=1||reduced.matches)&&!f.arrived){f.arrived=true;emit('exhibition-project-arrived',{index:i,arrival:f.arrival});}
      });
    }
    if(chapter===3){jobs.forEach(job=>job.visible=false);timelineDisplay=reduced.matches?timeline:THREE.MathUtils.lerp(timelineDisplay,timeline,1-Math.exp(-dt*14));timelineRail.position.x=-(jobs.length-1-timelineDisplay)*3.7;jobs.forEach((g,i)=>{g.position.set((timelineDisplay-i)*3.7,0,0);const distance=Math.abs(i-timelineDisplay);g.scale.setScalar(1-Math.min(.16,distance*.07));g.children.forEach(m=>{if(m.material?.transparent)m.material.opacity=Math.max(.2,1-distance*.45);});});if(mobile&&careerRailY!==null){const screenY=1-careerRailY/innerHeight*2,offset=travel-rooms[3].position.y;timelineRail.position.y=screenY*Math.tan(THREE.MathUtils.degToRad(19))*camera.position.z+offset;timeNeedle.position.y=screenY*Math.tan(THREE.MathUtils.degToRad(19))*(camera.position.z-.3)+offset;}else{timelineRail.position.y=0;timeNeedle.position.y=.02;}emit('exhibition-career-position',{value:timelineDisplay});}
    if(chapter===6){photos.forEach(({g,placeholder},i)=>{if(placeholder.material.uniforms){placeholder.material.uniforms.uDevelop.value=action&&i===selected?1:(i===selected?gather:0);placeholder.material.uniforms.uTime.value=time;}const a=(i-selected)*3+yaw*2;const target=new THREE.Vector3(a,Math.sin(time*.2+i)*.07,-Math.abs(a)*.12);if(i===selected&&action){target.lerp(new THREE.Vector3(0,0,3.5),u);g.rotation.y=(1-u)*Math.sin(a)*-.3+Math.sin(Math.PI*u)*.8;g.scale.setScalar((mobile?2*Math.tan(THREE.MathUtils.degToRad(19))*camera.position.z*camera.aspect*.62/2.55:1.3)*(1+u*.1));}else{g.rotation.y=Math.max(-.2,Math.min(.2,a*-.02));g.scale.setScalar(i===selected?(mobile?2*Math.tan(THREE.MathUtils.degToRad(19))*camera.position.z*camera.aspect*.62/2.55:1.3):.85);}g.position.lerp(target,Math.min(1,dt*7));g.rotation.z=Math.sin(time*.3+i)*.045*(1-u);});photoOrbit.rotation.z=0;
      // Project the extra carousel slot into an accessible DOM menu, after the last photo.
      const eggSpacing=mobile?2*Math.tan(THREE.MathUtils.degToRad(19))*camera.position.z*camera.aspect*.8:3;
      const eggX=(photos.length-selected)*eggSpacing+yaw*2;
      eggPosition.lerp(new THREE.Vector3(eggX,0,-Math.abs(eggX)*.12),Math.min(1,dt*7));
      camera.updateMatrixWorld();
      eggScreen.copy(eggPosition);eggScreen.y+=rooms[6].position.y;eggScreen.project(camera);
      const x=(eggScreen.x+1)*region.w/2,y=(1-eggScreen.y)*region.h/2;
      emit('exhibition-egg-position',{x,y,scale:(mobile?.75:1)*Math.max(.6,1-Math.abs(eggX)*.045),visible:eggScreen.z<1&&x>-110&&x<region.w+110&&y>0&&y<region.h,paused:!motion});
    }
    burst.visible=!!action&&chapter===1;
    if(action&&chapter===1){burstMat.uniforms.uProgress.value=clamp(action.age/action.duration);burstMat.uniforms.uCenter.value.copy(burstCenter);}
    dust.rotation.z=time*.007;
    renderer.render(scene,camera);
    if(introStarted&&!introNotified&&morph>=1){introNotified=true;emit('exhibition-intro-ready');}
    if(action&&(reduced.matches||action.age>=action.duration)){const completed=action;action=null;emit('exhibition-complete',{chapter,index:completed.index,message:chapter===4?'三路查询完成，Future 汇总返回。':''});}
  }
  async function prepare(){resources.forEach(r=>{if(r.isTexture)renderer.initTexture(r);});const previous=rooms.map(g=>g.visible);rooms.forEach(g=>g.visible=true);await renderer.compileAsync(scene,camera);rooms.forEach((g,i)=>g.visible=previous[i]);}
  function dispose(){resources.forEach(r=>r.dispose());}
  window.HYTEX_EXHIBITION={scene,camera,rooms,targets,get state(){return {active,chapter,selected,age,travel,timeline,techAge,techLayoutReady,textSourceIndex,textDirection,textRevision,textFlight,projectClock,projectFlights:projectFlights.map(f=>({arrival:f.arrival,duration:f.duration,delay:f.delay,arrived:f.arrived})),action:action?{...action}:null,region:{...region},morph:particleMat.uniforms.uMorph.value};},projectTarget(index){const o=targets[chapter].find(o=>o.userData.index===index);if(!o)return null;o.getWorldPosition(temp);temp.project(camera);return {x:region.x+(temp.x+1)*region.w/2,y:region.y+(1-temp.y)*region.h/2};}};
  rooms.forEach((g,i)=>g.visible=i===0);
  return {render,resize,setActive,dispose,prepare,get ambient(){return chapter===0||chapter===6;},get busy(){return textFlight&&techLayoutReady&&techAge<3||chapter===3&&Math.abs(timelineDisplay-timeline)>.001||chapter===2&&projectFlights.some(f=>!f.arrived)||Math.abs(travel-travelTo)>.01||introStarted&&introAge<4.4||entrance<1||!!action||nodes.some(n=>n.pop>0);}};
}
