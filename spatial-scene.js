import * as THREE from './assets/vendor/three.module.js';

const data = window.RESUME;
const canvas = document.querySelector('#resume-scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
} catch {
  document.dispatchEvent(new CustomEvent('spatial-renderer-fallback'));
}
if (renderer) {
  await document.fonts.ready;
  await initScene(renderer);
}
async function initScene(renderer) {
  const paperGrain = new Image(); paperGrain.src = new URL('./assets/paper-grain.png', import.meta.url).href;
  await paperGrain.decode();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  const main = new THREE.Group(); scene.add(main);
  const groups = Array.from({ length: 6 }, () => { const group = new THREE.Group(); main.add(group); return group; });
  const white = new THREE.MeshStandardMaterial({ color: '#eeeee0', roughness: .52, metalness: .05 });
  const green = new THREE.MeshStandardMaterial({ color: '#245c4e', roughness: .44, metalness: .16 });
  const lightGreen = new THREE.MeshStandardMaterial({ color: '#a2bca7', roughness: .66, metalness: .04 });
  const gold = new THREE.MeshStandardMaterial({ color: '#b79362', roughness: .53, metalness: .18 });
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#c3cbb9', transparent: true, opacity: .62 });
  scene.add(new THREE.HemisphereLight('#ffffff', '#b4b4a0', 2.7));
  const light = new THREE.DirectionalLight('#fff4de', 3.3); light.position.set(-4, 7, 9); scene.add(light);
  const fill = new THREE.DirectionalLight('#d7eee6', 1.4); fill.position.set(5, 0, 4); scene.add(fill);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  let width = innerWidth, height = innerHeight, mobile = width <= 700;
  let chapter = window.HYTEX_SPATIAL.state.chapter, transition = 1, previousChapter = chapter;
  let paused = window.HYTEX_SPATIAL.state.paused, modal = false, lost = false, preparing = true, frame = 0, lastTime = 0, clock = 0, queryStarted = 0;
  let selectedSkill = 1, selectedProject = 0, selectedCareer = 0, scrollProgress = 0;
  let interactionFrames = 0, manualQueryUntil = 0;
  let skillReturnAt = 0;
  let skillTransfer = null, projectIndices = data.projects.map((_, i) => i);
  let projectPresentation = null;
  const pointer = new THREE.Vector2(), pointerTarget = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  const projected = new THREE.Vector3(), world = new THREE.Vector3();
  const labels = document.querySelector('#scene-labels');
  const caption = document.querySelector('#scene-caption');
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  const ease = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  const clamp = t => Math.min(1, Math.max(0, t));
  const resources = new Set();
  const blendScene = new THREE.Scene();
  const blendCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blendMaterial = new THREE.ShaderMaterial({
    uniforms: { uFrom: { value: null }, uTo: { value: null }, uMix: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D uFrom,uTo;uniform float uMix;varying vec2 vUv;
      void main(){vec4 color=mix(texture2D(uFrom,vUv),texture2D(uTo,vUv),uMix);
        gl_FragColor=vec4(color.rgb/max(color.a,.00001),color.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthTest: false, depthWrite: false
  });
  const blendGeometry = new THREE.PlaneGeometry(2, 2);
  blendScene.add(new THREE.Mesh(blendGeometry, blendMaterial));
  resources.add(blendGeometry); resources.add(blendMaterial);
  // Lighting exceeds 1.0 in linear space. An 8-bit snapshot clips those values
  // before tone mapping and makes white surfaces suddenly appear gray.
  const hdr = renderer.extensions.has('EXT_color_buffer_float');
  const targetOptions = { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType };
  if (!hdr) renderer.toneMapping = THREE.NoToneMapping;
  let fromTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const liveTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  let spareTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  [fromTarget, liveTarget, spareTarget].forEach(target => resources.add(target));
  let lastBlend = 1, labelOpacity = chapter === 1 ? 1 : 0, labelOpacityFrom = labelOpacity;
  const sceneEase = t => (1 - Math.cos(Math.PI * t)) / 2;

  function outputTo(target) {
    renderer.setRenderTarget(target);
    // setRenderTarget applies the target's physical-pixel viewport. setViewport
    // would multiply it by DPR again and magnify snapshots on Retina screens.
    if (target) renderer.setScissorTest(false);
    else {
      const r = scene.userData.region;
      renderer.setViewport(r.x, height - r.y - r.h, r.w, r.h);
      renderer.setScissor(r.x, height - r.y - r.h, r.w, r.h); renderer.setScissorTest(true);
    }
    renderer.clear();
  }
  function drawScene(target) { outputTo(target); renderer.render(scene, camera); }
  function drawBlend(target, mix) {
    blendMaterial.uniforms.uFrom.value = fromTarget.texture;
    blendMaterial.uniforms.uTo.value = liveTarget.texture;
    blendMaterial.uniforms.uMix.value = mix;
    outputTo(target); renderer.render(blendScene, blendCamera);
  }
  // Capture the image already on screen. Retargeting mid-fade starts from this
  // mixture, so rapid scrolling never restores an old scene or restarts its pose.
  function captureDisplay() {
    if (transition < 1) drawBlend(spareTarget, lastBlend);
    else drawScene(spareTarget);
    const previous = fromTarget; fromTarget = spareTarget; spareTarget = previous;
    renderer.setRenderTarget(null);
  }
  function mesh(geometry, material, parent, position = [0, 0, 0]) {
    resources.add(geometry); const item = new THREE.Mesh(geometry, material); item.position.set(...position); parent.add(item); return item;
  }
  function roundedGeometry(w, h, depth, radius = .1) {
    const shape = new THREE.Shape(), x = -w / 2, y = -h / 2;
    shape.moveTo(x + radius, y); shape.lineTo(x + w - radius, y); shape.quadraticCurveTo(x + w, y, x + w, y + radius);
    shape.lineTo(x + w, y + h - radius); shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    shape.lineTo(x + radius, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - radius);
    shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025, curveSegments: 6 });
    geometry.translate(0, 0, -depth / 2); return geometry;
  }
  function stroke(points, parent, material = lineMaterial) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    resources.add(geometry); const item = new THREE.Line(geometry, material); parent.add(item); return item;
  }
  function circle(radius, parent, position, material = lineMaterial) {
    const points = Array.from({ length: 97 }, (_, i) => [Math.cos(i / 96 * Math.PI * 2) * radius, Math.sin(i / 96 * Math.PI * 2) * radius, 0]);
    const ring = stroke(points, parent, material); ring.position.set(...position); return ring;
  }
  function texture(draw, w = 1024, h = 768) {
    const surface = document.createElement('canvas'); surface.width = w; surface.height = h;
    draw(surface.getContext('2d'), w, h); const result = new THREE.CanvasTexture(surface); result.colorSpace = THREE.SRGBColorSpace; resources.add(result); return result;
  }
  function writing(parent, w, h, draw, position) {
    const map = texture(draw, 1024, Math.round(1024 * h / w)), material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
    resources.add(material); return mesh(new THREE.PlaneGeometry(w, h), material, parent, position);
  }
  // A constructed H is the front cover; independent layers reveal the depth of the mark.
  const cover = new THREE.Group(); groups[0].add(cover);
  for (let i = 0; i < 3; i++) {
    const sheet = mesh(roundedGeometry(3.55, 4.2, .11, .12), i === 2 ? lightGreen : white, cover, [.13 * i, -.1 * i, -.16 * i]);
    sheet.rotation.z = -.09 + i * .04;
  }
  const mark = new THREE.Group(); cover.add(mark); mark.position.z = .3;
  mesh(roundedGeometry(.46, 2.45, .31, .035), green, mark, [-.77, .15, 0]);
  mesh(roundedGeometry(.46, 2.45, .31, .035), green, mark, [.77, .15, 0]);
  mesh(roundedGeometry(1.15, .42, .31, .025), green, mark, [0, .15, 0]);
  mesh(new THREE.SphereGeometry(.13, 16, 12), gold, mark, [1.2, -.96, .1]);
  writing(cover, 2.8, .7, (p, w, h) => { p.fillStyle = '#637767'; p.font = '42px Archivo'; p.fillText('H Y T E X   /   D E V E L O P E R', 65, h * .6); }, [0, -1.63, .095]);
  cover.rotation.set(-.12, -.38, -.07);
  const coverRing = circle(3.1, groups[0], [0, -.4, -.8]); coverRing.rotation.x = 1.2;
  const orbit = mesh(new THREE.SphereGeometry(.065, 12, 8), gold, groups[0]);

  // Every skill is a GPU point cloud. A staggered shader transfer gathers the same points.
  const skillHomes = [ [1.9, 1.3, 0], [-.75, .45, .5], [-1.9, 1.9, -.1], [-2, -.9, .3], [.5, -1.55, .5], [2.1, -.55, -.2], [.1, 2.35, -.5], [-2.4, .6, -.6], [1.4, 2.8, -.9], [-1.2, -2.2, -.5], [2, -2.1, -.8] ];
  const skillPalette = { lime: '#a4814c', green: '#3c836a', warm: '#9b815a', rose: '#b47b65', blue: '#58898c', neutral: '#7c917b' };
  const pointFragment = `uniform vec3 uColor; uniform float uAlpha; varying float vDepth;
    void main(){ float d=length(gl_PointCoord-.5)*2.; if(d>1.)discard;
      float soft=1.-smoothstep(.45,1.,d); gl_FragColor=vec4(uColor,uAlpha*soft*vDepth);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const pointVertex = `uniform float uTime,uRadius,uSize,uDpr,uElapsed,uFlying,uRecycle; uniform vec3 uFrom,uTo; attribute float aDelay; varying float vDepth;
    float ease(float t){return t<.5?4.*t*t*t:1.-pow(-2.*t+2.,3.)/2.;}
    void main(){float angle=uTime*.17; float c=cos(angle),s=sin(angle); vec3 p=position;
      p=vec3(p.x*c+p.z*s,p.y,p.z*c-p.x*s);p=vec3(p.x,p.y*cos(.22)-p.z*sin(.22),p.y*sin(.22)+p.z*cos(.22));
      vDepth=.4+(p.z+1.)*.3;
      float t=ease(clamp((uElapsed-aDelay)/.72,0.,1.));vec3 center=mix(uFrom,uTo,t*uFlying);
      p*=uRadius; p.xy*=1.+position.z*.08;
      if(uFlying>.5)p.y+=sin(t*3.14159265)*position.z*.22;
      if(uRecycle>.5){float age=uElapsed-aDelay;
        if(age<.45){float q=ease(clamp(age/.34,0.,1.));center=mix(uFrom,vec3(3.8,uFrom.y,.4),q);p*=1.-q;}
        else{float q=ease(clamp((age-.45)/.4,0.,1.));center=uTo;p*=q+sin(q*3.14159265)*.18;}
      }
      vec4 mv=modelViewMatrix*vec4(center+p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=uSize*uDpr*(.7+vDepth*.6);
    }`;
  const skillObjects = data.skills.map((skill, index) => {
    const count = mobile ? (skill.size > 140 ? 170 : 90) : (skill.size > 140 ? 280 : 150);
    const positions = new Float32Array(count * 3), delays = new Float32Array(count);
    for (let i = 0; i < count; i++) { const y = 1 - 2 * i / (count - 1), radius = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5)); positions.set([Math.cos(a) * radius, y, Math.sin(a) * radius], i * 3); delays[i] = i / (count - 1) * .24; }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1)); resources.add(geometry);
    const material = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(skillPalette[skill.color]) }, uAlpha: { value: .8 }, uTime: { value: index }, uRadius: { value: skill.size / 180 }, uSize: { value: mobile ? 2.5 : 3 }, uDpr: { value: renderer.getPixelRatio() }, uElapsed: { value: 0 }, uFlying: { value: 0 }, uRecycle: { value: 0 }, uFrom: { value: new THREE.Vector3(...skillHomes[index]) }, uTo: { value: new THREE.Vector3(...skillHomes[index]) } }, vertexShader: pointVertex, fragmentShader: pointFragment, transparent: true, depthWrite: false }); resources.add(material);
    const object = new THREE.Points(geometry, material); object.frustumCulled = false; groups[1].add(object);
    const hit = mesh(new THREE.SphereGeometry(skill.size / 180, 12, 8), new THREE.MeshBasicMaterial({ visible: false }), groups[1], skillHomes[index]); resources.add(hit.material); hit.userData.skillIndex = index;
    const label = document.createElement('button'); label.type = 'button'; label.className = `scene-label${skill.size > 140 ? ' core' : ''}`; label.textContent = skill.name; label.setAttribute('aria-label', `查看 ${skill.name} 技术说明`); label.addEventListener('click', () => pickSkill(index)); labels.append(label);
    return { object, hit, home: new THREE.Vector3(...skillHomes[index]), center: new THREE.Vector3(...skillHomes[index]), resting: new THREE.Vector3(...skillHomes[index]), label, material };
  });
  const skillLinks = [[1, 0], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10]];
  const linksGeometry = new THREE.BufferGeometry(); linksGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(skillLinks.length * 6), 3)); resources.add(linksGeometry);
  const skillLines = new THREE.LineSegments(linksGeometry, new THREE.LineBasicMaterial({ color: '#aebfae', transparent: true, opacity: .35 })); resources.add(skillLines.material); groups[1].add(skillLines);
  function pickSkill(index) {
    if (skillTransfer) return;
    if (index === selectedSkill && skillObjects[index].center.distanceTo(skillObjects[index].home) > .2) recycleSkill(index);
    else emit('spatial-pick-skill', { index });
  }
  function recycleSkill(index) {
    const item = skillObjects[index], u = item.material.uniforms;
    let target = item.home.clone(), clearance = -Infinity;
    for (let i = 0; i < 30; i++) {
      const candidate = new THREE.Vector3(Math.random() * 4.5 - 2.25, Math.random() * 4.4 - 2.2, -.1);
      const gap = Math.min(...skillObjects.filter((_, j) => j !== index).map(other => candidate.distanceTo(other.center) - other.material.uniforms.uRadius.value));
      if (gap > clearance) { clearance = gap; target = candidate; }
    }
    u.uFrom.value.copy(item.center); u.uTo.value.copy(target); u.uFlying.value = 1; u.uRecycle.value = 1; u.uElapsed.value = 0;
    skillReturnAt = 0; skillTransfer = { index, started: clock, mode: 'recycle' }; emit('spatial-skill-released', { index }); requestFrame();
  }
  function transferSkill(index) {
    if (skillTransfer && skillTransfer.index !== index) resetSkill(skillTransfer.index);
    if (selectedSkill !== index) resetSkill(selectedSkill);
    selectedSkill = index;
    skillReturnAt = 0;
    const item = skillObjects[index], uniforms = item.material.uniforms;
    uniforms.uFrom.value.copy(item.center); uniforms.uTo.value.set(.15, -.15, 1.6); uniforms.uFlying.value = 1; uniforms.uRecycle.value = 0; uniforms.uElapsed.value = 0;
    skillTransfer = { index, started: clock, mode: 'focus' }; item.label.hidden = true;
    if (reduced.matches) finishSkill();
    requestFrame();
  }
  function resetSkill(index) { const item = skillObjects[index]; item.center.copy(item.home); item.material.uniforms.uFrom.value.copy(item.home); item.material.uniforms.uTo.value.copy(item.home); item.material.uniforms.uFlying.value = 0; item.material.uniforms.uRecycle.value = 0; }
  function finishSkill() {
    if (!skillTransfer) return;
    const index = skillTransfer.index, mode = skillTransfer.mode, item = skillObjects[index];
    item.center.copy(item.material.uniforms.uTo.value); item.material.uniforms.uFrom.value.copy(item.center); item.material.uniforms.uFlying.value = 0;
    if (mode === 'recycle') {
      item.home.copy(item.center);
      skillObjects.forEach((other, j) => {
        if (j === index) return;
        const dx = other.home.x - item.home.x, dy = other.home.y - item.home.y, distance = Math.hypot(dx, dy) || .01;
        const overlap = item.material.uniforms.uRadius.value + other.material.uniforms.uRadius.value + .12 - distance;
        if (overlap > 0) { other.home.x += dx / distance * overlap; other.home.y += dy / distance * overlap; }
      });
    }
    item.material.uniforms.uRecycle.value = 0; skillTransfer = null; item.label.hidden = false;
    if (mode === 'focus') emit('spatial-skill-arrived', { index });
  }

  // The archive is seven physical sheets, selected from either the scene or the reading list.
  const archive = new THREE.Group(); groups[2].add(archive); archive.rotation.set(-.12, -.16, -.045);
  const projectCards = data.projects.map((project, index) => {
    const card = new THREE.Group(); archive.add(card);
    const sheet = mesh(roundedGeometry(3.5, 4.65, .07, .055), index === 0 ? white : lightGreen, card); sheet.userData.projectIndex = index;
    const draw = (p, w, h) => {
      p.fillStyle = '#f6f3e9'; p.fillRect(0, 0, w, h);
      p.fillStyle = p.createPattern(paperGrain, 'repeat'); p.fillRect(0, 0, w, h);
      p.fillStyle = '#ad8457'; p.font = '24px Archivo'; p.fillText('P R O J E C T   A R C H I V E', 70, 72);
      p.strokeStyle = '#bcc9b9'; p.lineWidth = 2; p.beginPath(); p.moveTo(70, 110); p.lineTo(w - 70, 110); p.stroke();
      p.fillStyle = '#3d6d58'; p.font = '330px Archivo'; p.fillText(project.number, 55, h * .4);
      p.fillStyle = '#2a4037'; p.font = '38px Archivo, sans-serif';
      const chars = Array.from(project.title); let line = '', lines = []; chars.forEach(char => { if (p.measureText(line + char).width > w - 140) { lines.push(line); line = ''; } line += char; }); lines.push(line);
      lines.slice(0, 2).forEach((value, i) => p.fillText(value, 70, h * .53 + i * 70));
      p.fillStyle = '#6e7e6d'; p.font = '24px Archivo'; p.fillText(project.period, 70, h * .7);
      p.strokeStyle = '#bfd0bd'; p.beginPath(); p.moveTo(70, h * .76); p.lineTo(w - 70, h * .76); p.stroke();
      p.font = '22px Archivo'; p.fillText(project.label, 70, h * .83); p.fillText('查看项目描述与工作内容  ↗', 70, h * .91);
    };
    const face = writing(card, 3.4, 4.55, draw, [0, 0, .065]); face.userData.projectIndex = index;
    return { card, sheet, face };
  });

  // Four milestones form a vertical path; real company names stay in the reading column.
  const career = new THREE.Group(); groups[3].add(career); career.rotation.set(0, -.14, -.035);
  stroke([[0, -3, -.35], [0, 3, -.35]], career);
  const careerMarkers = data.experience.map((job, index) => {
    const y = 2.2 - index * 1.5, group = new THREE.Group(); group.userData.careerIndex = index; group.position.set(index % 2 ? .7 : -.7, y, 0); career.add(group);
    const sheet = mesh(roundedGeometry(2.35, .95, .1, .08), index === 0 ? green : white, group);
    writing(group, 2.15, .72, (p, w, h) => { p.fillStyle = index === 0 ? '#f8f7ed' : '#3f6554'; p.font = '140px Archivo'; p.fillText(job.period.slice(0, 4), 65, h * .5); p.font = '36px Archivo'; p.fillText(job.role, 65, h * .83); }, [0, 0, .085]);
    stroke([[group.position.x > 0 ? -1.15 : 1.15, 0, -.1], [-group.position.x, 0, -.3]], group);
    mesh(new THREE.SphereGeometry(.085, 12, 8), index === 0 ? gold : lightGreen, career, [0, y, -.25]);
    return { group, sheet };
  });

  // Both boards use the same task durations; only their start times differ.
  const query = new THREE.Group(); groups[4].add(query);
  const queryPaths = [], queryBoards = [], queryCycle = 6.2;
  const queryNames = ['用户资料', '订单列表', '账户信息'];
  function queryText(text, color = '#496758') {
    return texture((p, w, h) => { p.fillStyle = color; p.font = '88px Archivo, sans-serif'; p.textAlign = 'center'; p.textBaseline = 'middle'; p.fillText(text, w / 2, h / 2); }, 512, 128);
  }
  const statusMaps = [queryText('等待', '#839083'), queryText('查询中', '#a77739'), queryText('已返回', '#277967')];
  const resultMaps = [queryText('等待结果', '#839083'), queryText('汇总返回  ✓', '#277967')];
  ['逐个查询', '同时查询'].forEach((name, mode) => {
    const board = new THREE.Group(); board.position.y = mode === 0 ? 1.62 : -1.62; query.add(board);
    mesh(roundedGeometry(5.3, 2.9, .075, .09), white, board);
    writing(board, 4.85, .45, (p, w, h) => {
      p.fillStyle = mode ? '#277967' : '#4d6156'; p.font = '64px Archivo, sans-serif'; p.fillText(name, 10, h * .72);
      p.fillStyle = '#9d8156'; p.font = '30px Archivo, sans-serif'; p.textAlign = 'right'; p.fillText(mode ? 'parallel_query' : '完成一项，再开始下一项', w - 10, h * .65);
    }, [0, 1.01, .075]);
    const rows = queryNames.map((label, index) => {
      const y = .45 - index * .57;
      writing(board, 1.3, .33, (p, w, h) => { p.fillStyle = '#496758'; p.font = '155px Archivo, sans-serif'; p.textBaseline = 'middle'; p.fillText(label, 8, h / 2); }, [-1.75, y, .08]);
      mesh(roundedGeometry(2.03, .10, .015, .04), lightGreen, board, [.02, y, .085]);
      const fillMaterial = new THREE.MeshBasicMaterial({ color: '#b79362' }); resources.add(fillMaterial);
      const fill = mesh(new THREE.PlaneGeometry(2.03, .10), fillMaterial, board, [.02, y, .13]);
      const head = mesh(new THREE.SphereGeometry(.075, 12, 8), gold, board, [-.99, y, .16]);
      const statusMaterial = new THREE.MeshBasicMaterial({ map: statusMaps[0], transparent: true, depthWrite: false }); resources.add(statusMaterial);
      const status = mesh(new THREE.PlaneGeometry(1.12, .28), statusMaterial, board, [1.84, y, .10]);
      const row = { fill, head, status, y, duration: [1.24, 1.52, 1.24][index], start: mode ? 0 : [0, 1.24, 2.76][index], progress: 0, state: 0 };
      queryPaths.push(row); return row;
    });
    const resultMaterial = new THREE.MeshBasicMaterial({ map: resultMaps[0], transparent: true, depthWrite: false }); resources.add(resultMaterial);
    const result = mesh(new THREE.PlaneGeometry(1.65, .41), resultMaterial, board, [1.61, -1.04, .1]);
    writing(board, 2.9, .30, (p, w, h) => { p.fillStyle = '#81907f'; p.font = '75px Archivo, sans-serif'; p.textBaseline = 'middle'; p.fillText(mode ? '三项任务一起开始' : '三项任务依次开始', 10, h / 2); }, [-.97, -1.04, .1]);
    queryBoards.push({ rows, result, done: false });
  });

  // The closing scene is a letter, rather than another unrelated decorative object.
  const letter = new THREE.Group(); groups[5].add(letter); letter.rotation.set(-.14, -.27, -.12);
  mesh(roundedGeometry(3.75, 2.55, .13, .055), white, letter);
  const fold = new THREE.Shape(); fold.moveTo(-1.83, 1.2); fold.lineTo(0, -.13); fold.lineTo(1.83, 1.2); fold.closePath();
  mesh(new THREE.ShapeGeometry(fold), new THREE.MeshStandardMaterial({ color: '#c4d1bc', side: THREE.DoubleSide, roughness: .8 }), letter, [0, 0, .09]);
  stroke([[-1.85, -1.2, .095], [-.4, -.12, .11], [0, -.34, .12], [.4, -.12, .11], [1.85, -1.2, .095]], letter);
  const seal = mesh(new THREE.CylinderGeometry(.3, .3, .08, 32), green, letter, [0, -.22, .17]); seal.rotation.x = Math.PI / 2;
  writing(letter, 1.1, .4, (p, w, h) => { p.fillStyle = '#e5efde'; p.font = '180px Archivo'; p.textAlign = 'center'; p.fillText('H.', w / 2, h * .74); }, [0, -.22, .23]);
  const letterPaper = mesh(roundedGeometry(3.1, 2.7, .03, .03), white, letter, [0, .9, -.1]);
  letterPaper.rotation.z = .02;
  writing(letterPaper, 2.7, 1.4, (p, w, h) => { p.fillStyle = '#64836e'; p.font = '100px Archivo'; p.fillText('HELLO,', 40, 220); p.font = '42px Archivo'; p.fillText('68449317@qq.com', 40, 380); }, [0, .4, .065]);

  function resize() {
    width = innerWidth; height = innerHeight; mobile = width <= 700;
    const region = mobile ? { x: 0, y: 76, w: width, h: 254 } : { x: width * .53, y: 102, w: width * .45, h: height - 185 };
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5)); renderer.setSize(width, height, false);
    camera.aspect = region.w / region.h; camera.position.set(0, 0, mobile ? 9.2 : 12.2); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    renderer.setViewport(region.x, height - region.y - region.h, region.w, region.h); renderer.setScissor(region.x, height - region.y - region.h, region.w, region.h); renderer.setScissorTest(true);
    scene.userData.region = region;
    if (projectPresentation) expandProjectViewport();
    const ratio = renderer.getPixelRatio();
    [fromTarget, liveTarget, spareTarget].forEach(target => target.setSize(Math.round(region.w * ratio), Math.round(region.h * ratio)));
    transition = 1; labelOpacity = chapter === 1 ? 1 : 0; labelOpacityFrom = labelOpacity;
    skillObjects.forEach(item => { item.material.uniforms.uDpr.value = renderer.getPixelRatio(); item.material.uniforms.uSize.value = mobile ? 2.5 : 3; });
    requestFrame();
  }
  function updateLabels() {
    const region = scene.userData.region;
    groups[1].updateMatrixWorld(true);
    skillObjects.forEach((item, index) => {
      const visible = labelOpacity > .01 && (!skillTransfer || skillTransfer.index !== index);
      item.label.hidden = !visible;
      item.label.classList.toggle('selected', index === selectedSkill);
      item.label.style.opacity = String(labelOpacity);
      item.label.style.pointerEvents = chapter === 1 && labelOpacity > .95 ? 'auto' : 'none';
      item.label.tabIndex = chapter === 1 && labelOpacity > .95 ? 0 : -1;
      if (!visible) return;
      world.copy(item.center); groups[1].localToWorld(world); projected.copy(world).project(camera);
      item.label.style.left = `${region.x + (projected.x + 1) * .5 * region.w}px`;
      item.label.style.top = `${region.y + (1 - projected.y) * .5 * region.h}px`;
    });
  }
  function updateSkills(dt) {
    if (skillReturnAt && clock >= skillReturnAt && !skillTransfer) {
      const item = skillObjects[selectedSkill], u = item.material.uniforms;
      u.uFrom.value.copy(item.center); u.uTo.value.copy(item.home); u.uFlying.value = 1; u.uRecycle.value = 0; u.uElapsed.value = 0;
      skillReturnAt = 0; skillTransfer = { index: selectedSkill, started: clock, mode: 'return' };
    }
    skillObjects.forEach((item, index) => {
      const u = item.material.uniforms; u.uTime.value = clock + index * 2;
      if (!skillTransfer || skillTransfer.index !== index) {
        if (index !== selectedSkill || item.center.distanceTo(item.home) < .01) {
          item.resting.copy(item.home); item.resting.y += Math.sin(clock * .4 + index) * .07;
          const focus = skillObjects[selectedSkill];
          if (index !== selectedSkill && focus.center.distanceTo(focus.home) > .15) {
            const dx = item.resting.x - focus.center.x, dy = item.resting.y - focus.center.y, distance = Math.hypot(dx, dy) || .01;
            const overlap = u.uRadius.value + focus.material.uniforms.uRadius.value + .12 - distance;
            if (overlap > 0) { item.resting.x += dx / distance * overlap; item.resting.y += dy / distance * overlap; }
          }
          item.center.lerp(item.resting, 1 - Math.exp(-dt * 9)); u.uFrom.value.copy(item.center);
        }
      }
      u.uAlpha.value = index === selectedSkill ? .95 : .68;
      item.hit.position.copy(item.center);
    });
    if (skillTransfer) {
      const item = skillObjects[skillTransfer.index], elapsed = clock - skillTransfer.started;
      item.material.uniforms.uElapsed.value = elapsed;
      item.center.lerpVectors(item.material.uniforms.uFrom.value, item.material.uniforms.uTo.value, ease(clamp(elapsed / 1.2)));
      if (elapsed >= 1.2) finishSkill();
    }
    const positions = linksGeometry.attributes.position;
    skillLinks.forEach(([a, b], i) => { positions.setXYZ(i * 2, ...skillObjects[a].center.toArray()); positions.setXYZ(i * 2 + 1, ...skillObjects[b].center.toArray()); }); positions.needsUpdate = true;
    skillLines.visible = !skillTransfer;
  }
  function updateArchive(dt) {
    projectCards.forEach(({ card }, index) => {
      if (card.parent !== archive) return;
      const inFilter = projectIndices.includes(index); card.visible = inFilter;
      const rank = projectIndices.indexOf(index), chosen = projectIndices.indexOf(selectedProject), relative = (rank - chosen + projectIndices.length) % projectIndices.length;
      const target = index === selectedProject ? new THREE.Vector3(-.2, .08, .6) : new THREE.Vector3(.25 + relative * .15, relative * .1, -.13 * relative);
      card.position.lerp(target, (reduced.matches ? 1 : 1 - Math.exp(-dt * 9)));
      card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, index === selectedProject ? -.055 : .025 + relative * .038, (reduced.matches ? 1 : 1 - Math.exp(-dt * 9)));
    });
  }
  function expandProjectViewport() {
    const p = projectPresentation, r = scene.userData.region;
    p.region = { ...r }; p.projection = camera.projectionMatrix.clone();
    // Remap the existing regional projection into the full canvas. The archive
    // keeps its exact screen position while the extracted sheet crosses columns.
    const remap = new THREE.Matrix4().makeScale(r.w / width, r.h / height, 1);
    remap.elements[12] = (2 * r.x + r.w) / width - 1;
    remap.elements[13] = 1 - (2 * r.y + r.h) / height;
    camera.projectionMatrix.premultiply(remap);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    scene.userData.region = { x: 0, y: 0, w: width, h: height };
    const rect = document.querySelector('#project-dialog').getBoundingClientRect();
    const center = new THREE.Vector3((rect.left + rect.width / 2) / width * 2 - 1, 1 - (rect.top + rect.height / 2) / height * 2, p.depth);
    p.destination = center.clone().unproject(camera);
    const dx = center.clone(); dx.x += 2 / width;
    const dy = center.clone(); dy.y += 2 / height;
    p.destinationScale = new THREE.Vector3(rect.width * dx.unproject(camera).distanceTo(p.destination) / 3.55, rect.height * dy.unproject(camera).distanceTo(p.destination) / 4.70, p.sourceScale.z);
    if (p.phase === 'hold') { p.card.position.copy(p.destination); p.card.scale.copy(p.destinationScale); }
    if (p.phase === 'closing') {
      new THREE.Matrix4().compose(p.localPosition, p.localQuaternion, p.localScale).premultiply(archive.matrixWorld).decompose(p.destination, p.destinationQuaternion, p.destinationScale);
    }
  }
  function openProjectPresentation(index) {
    if (projectPresentation) return;
    transition = 1; scene.updateMatrixWorld(true);
    const { card, face } = projectCards[index];
    const localPosition = card.position.clone(), localQuaternion = card.quaternion.clone(), localScale = card.scale.clone();
    const depth = card.getWorldPosition(new THREE.Vector3()).project(camera).z;
    scene.attach(card);
    projectPresentation = { card, face, localPosition, localQuaternion, localScale, depth,
      source: card.position.clone(), sourceQuaternion: card.quaternion.clone(), sourceScale: card.scale.clone(),
      destinationQuaternion: camera.getWorldQuaternion(new THREE.Quaternion()), elapsed: 0, phase: 'opening', announced: false };
    document.querySelector('.scene-stage').classList.add('project-presenting');
    expandProjectViewport(); requestFrame();
  }
  function restoreProjectPresentation(announce = true) {
    const p = projectPresentation; if (!p) return;
    archive.add(p.card); p.card.position.copy(p.localPosition); p.card.quaternion.copy(p.localQuaternion); p.card.scale.copy(p.localScale); p.face.material.opacity = 1;
    camera.projectionMatrix.copy(p.projection); camera.projectionMatrixInverse.copy(p.projection).invert(); scene.userData.region = p.region;
    projectPresentation = null; document.querySelector('.scene-stage').classList.remove('project-presenting');
    renderer.setRenderTarget(null); renderer.setScissorTest(false); renderer.clear();
    if (announce) emit('spatial-project-returned');
  }
  function closeProjectPresentation() {
    const p = projectPresentation; if (!p) { emit('spatial-project-returned'); return; }
    p.source.copy(p.card.position); p.sourceQuaternion.copy(p.card.quaternion); p.sourceScale.copy(p.card.scale);
    const slot = new THREE.Matrix4().compose(p.localPosition, p.localQuaternion, p.localScale).premultiply(archive.matrixWorld);
    slot.decompose(p.destination, p.destinationQuaternion, p.destinationScale);
    p.elapsed = 0; p.phase = 'closing'; requestFrame();
  }
  function updateProjectPresentation(dt) {
    const p = projectPresentation; if (p.phase === 'hold') return;
    p.elapsed += dt; const progress = clamp(p.elapsed / (p.phase === 'opening' ? .65 : .5)), t = ease(progress);
    p.card.position.lerpVectors(p.source, p.destination, t);
    p.card.quaternion.slerpQuaternions(p.sourceQuaternion, p.destinationQuaternion, t);
    p.card.scale.lerpVectors(p.sourceScale, p.destinationScale, t);
    p.face.material.opacity = p.phase === 'opening' ? 1 - clamp((progress - .8) / .2) : clamp(progress / .25);
    if (p.phase === 'opening' && progress >= .85 && !p.announced) { p.announced = true; emit('spatial-project-ready'); }
    if (progress === 1) { if (p.phase === 'closing') restoreProjectPresentation(); else p.phase = 'hold'; }
  }
  let queryCodeSignature = '';
  function updateQuery() {
    const elapsed = clock - queryStarted;
    const t = reduced.matches ? 5 : paused && manualQueryUntil > queryStarted && clock >= manualQueryUntil ? Math.min(elapsed, queryCycle - .01) : elapsed % queryCycle;
    queryBoards.forEach(board => {
      board.rows.forEach(row => {
        const elapsed = t - .6 - row.start, progress = clamp(elapsed / row.duration);
        const state = elapsed < 0 ? 0 : progress < 1 ? 1 : 2;
        row.progress = progress; row.state = state;
        row.fill.visible = progress > 0; row.fill.scale.x = Math.max(.001, progress);
        row.fill.position.x = -.995 + 2.03 * progress / 2;
        row.fill.material.color.set(state === 2 ? '#277967' : '#b79362');
        row.head.visible = state === 1; row.head.position.x = -.995 + 2.03 * progress;
        row.status.material.map = statusMaps[state];
      });
      board.done = board.rows.every(row => row.state === 2);
      board.result.material.map = resultMaps[board.done ? 1 : 0];
    });
    const serialTask = queryBoards[0].rows.findIndex(row => row.state === 1);
    const parallelTask = queryBoards[1].rows.findIndex(row => row.state !== 2);
    const serialLine = t < .6 ? 0 : serialTask < 0 ? 4 : serialTask + 1;
    const parallelLine = t < .6 ? 2 + Math.min(2, Math.floor(t / .2)) : parallelTask < 0 ? 5 : parallelTask + 6;
    const signature = `${serialLine}:${parallelLine}:${queryPaths.map(row => row.state).join('')}`;
    if (signature !== queryCodeSignature) {
      queryCodeSignature = signature;
      emit('spatial-query-step', { serialLine, parallelLine, submitting: t < .6, serialStates: queryBoards[0].rows.map(row => row.state), parallelStates: queryBoards[1].rows.map(row => row.state) });
    }
  }
  function render(dt) {
    transition = reduced.matches ? 1 : Math.min(1, transition + dt / .7);
    const t = sceneEase(transition);
    labelOpacity = THREE.MathUtils.lerp(labelOpacityFrom, chapter === 1 ? 1 : 0, t);
    groups.forEach((group, index) => {
      group.visible = index === chapter;
      if (group.visible) {
        group.position.y = (1 - t) * -.18;
        group.scale.setScalar((mobile && (index === 1 || index === 3 || index === 4) ? .82 : 1) * (.98 + .02 * t));
      }
    });
    if (!modal) pointer.lerp(pointerTarget, 1 - Math.exp(-dt * 4));
    main.rotation.x = reduced.matches ? 0 : pointer.y * .035;
    main.rotation.y = reduced.matches ? 0 : pointer.x * .07;
    if (chapter === 0) { cover.position.y = Math.sin(clock * .6) * .085; cover.rotation.y = -.38 + Math.sin(clock * .2) * .08 + scrollProgress * .22; orbit.position.set(Math.cos(clock * .3) * 3.1, -.4 + Math.sin(clock * .3) * 1.05, Math.sin(clock * .3) * 2.8); }
    if (chapter === 1 || skillTransfer) updateSkills(dt);
    if (chapter === 2) updateArchive(dt);
    if (chapter === 3) careerMarkers.forEach(({ group }, i) => { group.position.z = THREE.MathUtils.lerp(group.position.z, i === selectedCareer ? .4 : 0, 1 - Math.exp(-dt * 7)); });
    if (chapter === 4) updateQuery();
    if (chapter === 5) { letter.position.y = Math.sin(clock * .5) * .07; letterPaper.position.y = .9 + Math.sin(clock * .35) * .12; }
    if (projectPresentation) updateProjectPresentation(dt);
    updateLabels();
    if (transition < 1) { drawScene(liveTarget); drawBlend(null, t); }
    else drawScene(null);
    lastBlend = t;
    caption.style.opacity = projectPresentation ? '0' : String(t);
  }
  function tick(now) {
    frame = 0;
    if (document.hidden || (modal && !projectPresentation) || lost) { lastTime = 0; return; }
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60; lastTime = now;
    // Pausing ambient motion still permits chapter transitions and a user-triggered transfer.
    if (!modal && (!paused || skillTransfer || clock < manualQueryUntil)) clock += dt;
    render(dt); interactionFrames = Math.max(0, interactionFrames - 1);
    if (modal ? projectPresentation && projectPresentation.phase !== 'hold' : !paused || transition < 1 || skillTransfer || interactionFrames || clock < manualQueryUntil) requestFrame();
    else lastTime = 0;
  }
  function requestFrame() { if (!preparing && !frame && !document.hidden && (!modal || projectPresentation) && !lost) frame = requestAnimationFrame(tick); }
  function setChapter(index) {
    if (chapter === index) { requestFrame(); return; }
    if (!preparing && !lost && !reduced.matches) captureDisplay();
    labelOpacityFrom = labelOpacity;
    previousChapter = chapter; chapter = index; transition = reduced.matches ? 1 : 0;
    lastBlend = reduced.matches ? 1 : 0;
    if (chapter === 4) queryStarted = clock;
    if (previousChapter === 1 && skillTransfer) finishSkill();
    requestFrame();
  }
  document.addEventListener('spatial-chapter', e => setChapter(e.detail.index));
  document.addEventListener('spatial-scroll', e => { scrollProgress = e.detail.progress; requestFrame(); });
  document.addEventListener('spatial-select-skill', e => transferSkill(e.detail.index));
  document.addEventListener('spatial-description-complete', e => { if (e.detail.index === selectedSkill && !skillTransfer) skillReturnAt = clock + 10; });
  document.addEventListener('spatial-select-project', e => { selectedProject = e.detail.index; interactionFrames = 45; requestFrame(); });
  document.addEventListener('spatial-project-open', e => openProjectPresentation(e.detail.index));
  document.addEventListener('spatial-project-close', () => closeProjectPresentation());
  document.addEventListener('spatial-filter-projects', e => { projectIndices = e.detail.indices; requestFrame(); });
  document.addEventListener('spatial-select-career', e => { selectedCareer = e.detail.index; interactionFrames = 30; requestFrame(); });
  document.addEventListener('spatial-replay-query', () => { queryStarted = clock; manualQueryUntil = reduced.matches ? 0 : clock + queryCycle; requestFrame(); });
  document.addEventListener('spatial-pause', e => { paused = e.detail; requestFrame(); });
  document.addEventListener('spatial-modal', e => { modal = e.detail; if (modal) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; } else { restoreProjectPresentation(false); requestFrame(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; } else requestFrame(); });
  document.addEventListener('pointermove', e => { const r = scene.userData.region; pointerTarget.set(clamp((e.clientX - r.x) / r.w) * 2 - 1, 1 - clamp((e.clientY - r.y) / r.h) * 2); if (!paused) requestFrame(); }, { passive: true });
  document.addEventListener('click', e => {
    if (modal || e.target.closest('a,button,input,select,dialog')) return;
    const r = scene.userData.region;
    if (e.clientX < r.x || e.clientX > r.x + r.w || e.clientY < r.y || e.clientY > r.y + r.h) return;
    const mouse = new THREE.Vector2((e.clientX - r.x) / r.w * 2 - 1, 1 - (e.clientY - r.y) / r.h * 2);
    raycaster.setFromCamera(mouse, camera);
    if (chapter === 1) { const hit = raycaster.intersectObjects(skillObjects.map(i => i.hit))[0]; if (hit) pickSkill(hit.object.userData.skillIndex); }
    if (chapter === 2) { const hit = raycaster.intersectObjects(projectCards.filter((_, i) => projectIndices.includes(i)).flatMap(p => [p.sheet, p.face]))[0]; if (hit) emit('spatial-pick-project', { index: hit.object.userData.projectIndex }); }
    if (chapter === 3) {
      const hit = raycaster.intersectObject(career, true)[0];
      if (hit) { let item = hit.object; while (item && item.userData.careerIndex === undefined) item = item.parent;
        if (item) { selectedCareer = item.userData.careerIndex; document.querySelectorAll('.career-item')[selectedCareer].scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'center' }); }
      }
    }
    if (chapter === 4 && raycaster.intersectObject(query, true).length) { queryStarted = clock; manualQueryUntil = reduced.matches ? 0 : clock + queryCycle; requestFrame(); }
    if (chapter === 5 && raycaster.intersectObject(letter, true).length) window.location.href = 'mailto:68449317@qq.com';
  });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; restoreProjectPresentation(); labels.hidden = true; emit('spatial-renderer-fallback'); });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; labels.hidden = false; document.body.classList.remove('no-webgl'); window.HYTEX_SCENE_READY = true; resize(); });
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', event => {
    cancelAnimationFrame(frame); frame = 0;
    if (event.persisted) return;
    scene.traverse(object => { if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material); });
    resources.forEach(resource => resource.dispose()); renderer.dispose();
  });
  window.addEventListener('pageshow', () => requestFrame());
  // Expose renderer statistics for local verification, without adding implementation details to the page.
  window.HYTEX_SCENE = { renderer, scene, camera, groups, skillObjects, projectCards, queryPaths, get queryTime() { return { clock, queryStarted, modal, frame }; }, get presentation() { return projectPresentation; }, get chapter() { return chapter; }, get transfer() { return skillTransfer; }, get fade() { return { progress: transition, mix: lastBlend, labelOpacity }; } };
  // Upload every chapter's textures and compile the offscreen materials before
  // enabling navigation-driven fades; the first switch uses complete imagery.
  resources.forEach(resource => { if (resource.isTexture) renderer.initTexture(resource); });
  renderer.setRenderTarget(liveTarget);
  await renderer.compileAsync(scene, camera);
  await renderer.compileAsync(blendScene, blendCamera);
  renderer.setRenderTarget(null);
  preparing = false;
  selectedSkill = window.HYTEX_SPATIAL.state.skill; selectedProject = window.HYTEX_SPATIAL.state.project;
  window.HYTEX_SCENE_READY = !lost;
  if (!lost) { resize(); render(1); requestFrame(); }
}
