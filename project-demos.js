'use strict';
(() => {
  const host = document.querySelector('#project-demo'), dialog = document.querySelector('#project-dialog');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let data, mode = 'optimization', step = 0, playing = false, visible = false, timer = 0, observer, generation = 0;
  const make = (tag, cls, text) => { const node = document.createElement(tag); node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  const count = () => mode === 'optimization' ? 6 : data[mode].nodes.length;
  function cancelTick() { clearTimeout(timer); timer = 0; }
  function canPlay() { return playing && visible && dialog.open && dialog.classList.contains('detail-ready') && !dialog.classList.contains('detail-leaving') && !document.hidden && !reduced.matches; }
  function schedule() {
    cancelTick();
    if (!canPlay()) return;
    const version = generation;
    timer = setTimeout(() => { if (version !== generation) return; timer = 0; if (!canPlay()) return; if (step < count() - 1) { step++; renderStep(); schedule(); } else { playing = false; renderStep(); } }, 3400);
  }
  function codePanel(label, lines, side) {
    const panel = make('section', `demo-code ${side}`); panel.append(make('p', 'demo-code-label', label));
    const pre = make('pre', ''), code = make('code', '');
    lines.forEach((text, index) => {
      const line = make('span', 'demo-code-line'); line.dataset.line = index;
      line.append(make('i', 'demo-line-number', String(index + 1)));
      const source = make('span', 'demo-source');
      text.split(/(\/\/.*|\b(?:var|return|if|for|while|try|catch|true|false|new)\b)/g).forEach((token, i) => source.append(make(i % 2 ? 'b' : 'span', token.startsWith('//') ? 'demo-comment' : i % 2 ? 'demo-keyword' : '', token)));
      line.append(source); code.append(line);
    });
    pre.append(code); panel.append(pre); return panel;
  }
  function architectureDiagram() {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.classList.add('demo-diagram', 'pangu-architecture'); svg.setAttribute('viewBox', '0 0 600 330'); svg.setAttribute('aria-hidden', 'true');
    const shape = (tag, attrs, parent = svg) => { const node = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value)); parent.append(node); return node; };
    const label = (parent, x, y, value, cls = '') => { const node = shape('text', { x, y, 'text-anchor': 'middle', class: cls }, parent); node.textContent = value; };
    const group = stage => shape('g', { class: 'architecture-group', 'data-station': stage });
    const mobile = innerWidth <= 700;
    if (mobile) svg.setAttribute('viewBox', '0 0 320 460');
    const apps = group(0), centers = mobile ? [85,235] : [160,440];
    centers.forEach((x, i) => { const w = mobile ? 135 : 150; shape('rect', { x: x - w / 2, y: 10, width: w, height: 37, rx: 3 }, apps); label(apps, x, 34, i ? '全能扫描王' : '爱提词'); });
    const wires = group(2);
    const segments = mobile ? [[85,47,8,70],[235,47,8,70],[8,70,8,278],[8,131,14,131],[8,203,14,203],[8,275,14,275]] : [[160,47,150,100],[160,47,300,100],[440,47,300,100],[440,47,450,100],[150,180,300,180],[300,180,450,180]];
    segments.forEach(([x,y,xx,yy]) => shape('path', { d: `M${x},${y} L${xx},${yy}`, class:'demo-wire' }, wires));
    const services = group(1);
    ['用户与交易','内容处理','公共基础服务'].forEach((name, i) => {
      const x = mobile ? 14 : 75 + i * 150, y = mobile ? 100 + i * 72 : 100;
      shape('rect', { x, y, width:mobile ? 292 : 150, height:mobile ? 62 : 106, rx:3 }, services);
      label(services, mobile ? 78 : x + 75, y + (mobile ? 35 : 25), name);
      for(let j=0;j<12;j++) shape('rect',{x:(mobile ? 170 : x+19)+(j%4)*29,y:y+(mobile ? 9 : 40)+Math.floor(j/4)*18,width:21,height:11,rx:1,class:'architecture-service'},services);
    });
    label(services,mobile ? 160 : 300,84,'50+ 微服务', 'architecture-count');
    const async = group(3);
    [['Redis',mobile ? 85 : 180],['RabbitMQ',mobile ? 235 : 420]].forEach(([name,x]) => { const y=mobile ? 337 : 240; shape('path', {d:`M${x},${mobile ? 306 : 206} V${y}`,class:'demo-wire'},async); shape('rect',{x:x-65,y,width:130,height:33,rx:3},async);label(async,x,y+22,name); });
    const governance = group(4); shape('rect',{x:mobile ? 14 : 75,y:mobile ? 397 : 292,width:mobile ? 292 : 450,height:mobile ? 47 : 28,rx:3},governance);
    if(mobile) {label(governance,160,417,'Spring Cloud Alibaba');label(governance,160,435,'注册 / 配置 / 服务协作');}
    else label(governance,300,312,'Spring Cloud Alibaba · 注册 / 配置 / 服务协作');
    // This is a responsibility map, rather than an invented production topology.
    const packet=shape('g',{class:'demo-packet'}); shape('circle',{r:5,fill:'#bd8841'},packet);
    svg.flowPoints=mobile ? [[85,47],[158,132],[8,203],[235,337],[160,397]] : [[160,47],[150,150],[300,190],[420,240],[300,292]]; packet.style.transform=`translate(${svg.flowPoints[0][0]}px,${svg.flowPoints[0][1]}px)`;
    const wrap=make('div','demo-diagram-wrap');wrap.append(svg,make('p','demo-diagram-caption','按服务职责归类展示，省略完整部署拓扑。'));return wrap;
  }
  function flowDiagram() {
    if (data.architecture) return architectureDiagram();
    const layouts = [
      [[60,100],[170,100],[300,55],[430,100],[540,100]],
      [[60,100],[180,100],[300,55],[420,100],[540,100]],
      [[60,130],[180,85],[300,45],[420,85],[540,130]],
      [[60,55],[180,100],[300,55],[420,100],[540,55]],
      [[60,100],[180,55],[300,100],[420,55],[540,100]],
      [[60,55],[180,100],[300,100],[420,55],[540,100]],
      [[60,100],[180,100],[300,55],[420,100],[540,100]]
    ];
    const index = window.HYTEX_PROJECT_DEMOS.indexOf(data), points = layouts[index];
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.classList.add('demo-diagram'); svg.setAttribute('viewBox', '0 0 600 180'); svg.setAttribute('aria-hidden', 'true');
    const shape = (tag, attributes, parent = svg) => { const n = document.createElementNS(ns, tag); Object.entries(attributes).forEach(([key, value]) => n.setAttribute(key, value)); parent.append(n); return n; };
    points.slice(1).forEach(([x, y], i) => { const [px, py] = points[i]; shape('path', { d: `M${px},${py} C${px + 65},${py} ${x - 65},${y} ${x},${y}`, class: 'demo-wire', 'data-edge': i }); });
    points.forEach(([x, y], i) => { const g = shape('g', { class: 'demo-station', 'data-station': i }); shape('circle', { cx: x, cy: y, r: 24 }, g); const text = shape('text', { x, y: y + 4, 'text-anchor': 'middle' }, g); text.textContent = String(i + 1).padStart(2, '0'); const name=shape('text',{x,y:y+41,'text-anchor':'middle'},g);name.textContent=data.flow.nodes[i]; });
    const packet = shape('g', { class: 'demo-packet' }); packet.style.transform = `translate(${points[0][0]}px,${points[0][1]}px)`;
    shape('rect', { x: -17, y: -21, width: 34, height: 42, rx: 3 }, packet);
    [-8,0,8].forEach(y => shape('path', { d: `M-9,${y} H9` }, packet));
    svg.flowPoints = points;
    const caption = make('p', 'demo-diagram-caption', ['文档按任务进入模型链路','申请资料进入审批流程','用户条件逐步匹配产品','内容与互动经过统一业务接口','约课订单连接档期与在线课堂','客资进入分配与跟进流程','订单连接资源安排与岗位交接'][index]);
    const wrap = make('div', 'demo-diagram-wrap'); wrap.append(svg, caption); return wrap;
  }
  let indexFilters = { platform: 'Android', version: '1.1' };
  function postings(field) {
    const groups = new Map();
    data.index.records.forEach(record => { if (!groups.has(record[field])) groups.set(record[field], []); groups.get(record[field]).push(record.id); });
    return groups;
  }
  function indexCandidates() {
    const platform = postings('platform').get(indexFilters.platform) || [], version = postings('version').get(indexFilters.version) || [];
    const result = platform.filter(id => version.includes(id));
    return { platform, version, result };
  }
  function buildIndex(body) {
    body.append(make('p', 'demo-basis', '负责发布包信息的索引写入与查询接口；查询条件为平台、版本。'), make('p', 'index-example-note', '以下包信息为示例数据，版本按相等条件演示。'));
    const filters = make('div', 'index-filters');
    ['platform', 'version'].forEach(field => {
      const label = make('label', '', field === 'platform' ? '平台' : '版本'), select = make('select', ''); select.dataset.indexFilter = field;
      [...postings(field).keys()].forEach(value => { const option = make('option', '', value); option.value = value; select.append(option); }); select.value = indexFilters[field];
      select.addEventListener('change', () => { indexFilters[field] = select.value; seek(3); }); label.append(select); filters.append(label);
    }); body.append(filters);
    const grid = make('div', 'index-grid'), records = make('section', 'index-records');
    records.append(make('h5', '', '包信息'));
    data.index.records.forEach((record, i) => {
      const row = make('div', 'index-record'); row.dataset.packageId = record.id; row.style.setProperty('--row', i);
      row.append(make('span', 'index-record-id', record.id), make('strong', '', record.name), make('span', '', `${record.platform} / ${record.version}`)); records.append(row);
    }); grid.append(records);
    ['platform', 'version'].forEach(field => {
      const table = make('section', `index-postings ${field}`); table.append(make('h5', '', field === 'platform' ? '平台 → 包 ID' : '版本 → 包 ID'));
      for (const [value, ids] of postings(field)) {
        const row = make('div', 'index-row'); row.dataset.indexValue = value;
        row.append(make('strong', '', value)); const list = make('div', 'index-id-list');
        ids.forEach(id => { const chip = make('span', 'index-id', id); chip.dataset.id = id; list.append(chip); }); row.append(list); table.append(row);
      } grid.append(table);
    }); body.append(grid);
    const merge = make('div', 'index-merge'); merge.append(make('span', '', '平台候选'), make('strong', 'index-platform-candidates'), make('span', '', '∩'), make('span', '', '版本候选'), make('strong', 'index-version-candidates'), make('span', '', '→'), make('strong', 'index-result-ids')); body.append(merge);
    const results = make('section', 'index-results'); results.append(make('h5', '', '返回包信息'), make('div', 'index-result-list')); body.append(results);
    const steps = make('div', 'demo-flow index-steps'); data.index.nodes.forEach((name, i) => { const node = make('button', 'demo-node'); node.type = 'button'; node.dataset.stage = i; node.append(make('span', 'demo-flow-number', String(i + 1).padStart(2, '0')), make('strong', '', name)); node.addEventListener('click', () => seek(i)); steps.append(node); }); body.append(steps);
  }
  function renderIndex() {
    const hits = indexCandidates();
    host.querySelector('.demo-body').dataset.indexStage = step;
    host.querySelectorAll('[data-index-filter]').forEach(select => { select.disabled = step < 3; });
    ['platform', 'version'].forEach(field => {
      const table = host.querySelector(`.index-postings.${field}`); table.classList.toggle('built', step >= (field === 'platform' ? 1 : 2));
      table.querySelectorAll('.index-row').forEach(row => row.classList.toggle('selected', step >= 3 && row.dataset.indexValue === indexFilters[field]));
      table.querySelectorAll('.index-id').forEach(chip => { chip.classList.toggle('candidate', step >= 3 && hits[field].includes(chip.dataset.id)); chip.classList.toggle('hit', step >= 4 && hits.result.includes(chip.dataset.id)); });
    });
    host.querySelectorAll('.index-record').forEach(row => row.classList.toggle('matched', step >= 4 && hits.result.includes(row.dataset.packageId)));
    host.querySelector('.index-merge').classList.toggle('revealed', step >= 4);
    host.querySelector('.index-platform-candidates').textContent = hits.platform.join(', ') || '∅';
    host.querySelector('.index-version-candidates').textContent = hits.version.join(', ') || '∅';
    host.querySelector('.index-result-ids').textContent = hits.result.join(', ') || '无匹配包';
    const list = host.querySelector('.index-result-list'); list.replaceChildren();
    if (step < 5) list.append(make('p', 'index-waiting', '查询完成后显示包信息。'));
    else if (!hits.result.length) list.append(make('p', 'index-empty', '没有同时满足平台和版本的发布包。'));
    else data.index.records.filter(record => hits.result.includes(record.id)).forEach(record => {
      const row = make('div', 'index-result'); row.dataset.resultId = record.id; row.append(make('strong', '', `${record.id} / ${record.name}`), make('span', '', `${record.platform} · ${record.version}`)); list.append(row);
    });
    host.querySelector('.demo-reading-note').textContent = step>=4?`平台 ${indexFilters.platform} 的 ID 集合，与版本 ${indexFilters.version} 的 ID 集合取交集：${hits.result.join('、')||'无匹配'}。${step===5?'用这些 ID 返回完整包信息。':''}`:data.index.notes[step];
  }
  let whitelistExisting = new Map(), whitelistReplay = false;
  function whitelistClassification() {
    const bits = new Set([...whitelistExisting.values()].flat());
    return data.whitelist.records.map(record => ({ ...record, possible: record.bits.every(bit => bits.has(bit)), existing: whitelistExisting.has(record.id) }));
  }
  function buildWhitelist(body) {
    body.append(make('p', 'demo-basis', data.focus.context), make('p', 'index-example-note', '名单和位图为原理示例，非真实名单或业务统计。'));
    const grid = make('div', 'whitelist-grid'), incoming = make('section', 'whitelist-input'); incoming.append(make('h5', '', '待导入名单'));
    data.whitelist.records.forEach(record => { const row = make('div', 'whitelist-record'); row.dataset.whitelistId = record.id; row.append(make('strong', '', record.id), make('span', 'whitelist-status', '等待筛查')); incoming.append(row); }); grid.append(incoming);
    const filter = make('section', 'whitelist-filter'); filter.append(make('h5', '', '布隆过滤器 + Redis'), make('p', '', '① 快速筛查 → 整理候选记录'));
    const bitmap = make('div', 'whitelist-bitmap'); for (let i=0;i<16;i++) { const cell=make('span','',String(i));cell.dataset.bit=i;bitmap.append(cell); } filter.append(bitmap);
    const candidates = make('div', 'whitelist-candidates'); candidates.append(make('p', 'whitelist-possible'), make('p', 'whitelist-negative')); filter.append(candidates,make('p','whitelist-filter-note','命中表示可能存在；记录标记以实际确认结果为准。')); grid.append(filter);
    const database = make('section', 'whitelist-batch'); database.append(make('h5', '', '② MySQL 批量确认与导入'),make('p','whitelist-confirmed'),make('p','whitelist-new'),make('p','whitelist-collision')); grid.append(database); body.append(grid);
    const trace=make('div','whitelist-trace');trace.append(make('strong','','跟随一条记录 · W04'),make('p','whitelist-trace-note'));body.append(trace);
    const summary = make('div', 'whitelist-summary'); summary.append(make('strong', 'whitelist-summary-text'),make('p','whitelist-summary-note'));
    const again=make('button','whitelist-again','再次导入同一份名单');again.type='button';again.addEventListener('click',()=>{
      data.whitelist.records.forEach(record=>whitelistExisting.set(record.id,record.bits));whitelistReplay=true;step=0;playing=!reduced.matches&&!window.HYTEX_SPATIAL?.state.paused;renderStep();schedule();
    });summary.append(again);body.append(summary);
    const stages=make('div','demo-flow index-steps');data.whitelist.nodes.forEach((name,i)=>{const node=make('button','demo-node');node.type='button';node.dataset.stage=i;node.append(make('span','demo-flow-number',String(i+1).padStart(2,'0')),make('strong','',name));node.addEventListener('click',()=>seek(i));stages.append(node);});body.append(stages);
  }
  function renderWhitelist() {
    const rows=whitelistClassification(), existing=rows.filter(r=>r.existing), fresh=rows.filter(r=>!r.existing), possible=rows.filter(r=>r.possible), negatives=rows.filter(r=>!r.possible), collisions=possible.filter(r=>!r.existing);
    const bits=new Set([...whitelistExisting.values()].flat());
    host.querySelectorAll('[data-bit]').forEach(cell=>cell.classList.toggle('set',step>=1&&bits.has(Number(cell.dataset.bit))));
    host.querySelectorAll('.whitelist-record').forEach(node=>{const record=rows.find(r=>r.id===node.dataset.whitelistId);
      let text='等待筛查';if(step>=1)text=record.possible?'可能已存在':'未命中';if(step>=3)text=record.existing?'已存在':'待导入';if(step>=4&&!record.existing)text='已导入';
      node.querySelector('.whitelist-status').textContent=text;node.classList.toggle('possible',step>=1&&step<3&&record.possible);node.classList.toggle('existing',step>=3&&record.existing);node.classList.toggle('inserted',step>=4&&!record.existing);
    });
    const ids=list=>list.map(r=>r.id).join('、')||'无';
    host.querySelector('.whitelist-possible').textContent=step>=2?`待确认：${ids(possible)}`:'候选记录将在筛查后显示。';
    host.querySelector('.whitelist-negative').textContent=step>=2?`未命中：${ids(negatives)}`:'';
    host.querySelector('.whitelist-confirmed').textContent=step>=3?`实际已存在：${ids(existing)}`:'等待批量确认。';
    host.querySelector('.whitelist-new').textContent=step>=3?`${step>=4?'本次导入':'待导入'}：${ids(fresh)}`:'';
    host.querySelector('.whitelist-collision').textContent=step>=3&&collisions.length?`${ids(collisions)} 虽然命中布隆位图，实际并未存在，仍需导入。`:'';
    host.querySelector('.whitelist-summary-text').textContent=step>=5?`已有 ${existing.length} 条 · 新增 ${fresh.length} 条`:'完成后显示导入结果';
    host.querySelector('.whitelist-summary-note').textContent=whitelistReplay?'再次导入相同名单，已有记录不再重复写入。':'确认已有数据，批量写入新增数据，并逐条标记结果。';
    host.querySelector('.whitelist-again').disabled=step<5;
    host.querySelector('.whitelist-trace-note').textContent=whitelistReplay?'W04 已在上次导入中写入；再次导入时，确认存在并标记已有。':['W04 随名单进入筛查。','W04 命中位图：只表示可能存在。','W04 进入待确认的候选名单。','批量确认：W04 实际不存在，应作为新增记录。','W04 与其他新增记录批量写入。','W04 标记为已导入，已有记录分别标记。'][step];
    host.querySelectorAll('[data-bit]').forEach(cell=>cell.classList.toggle('checked',step===1&&[1,4,9].includes(Number(cell.dataset.bit))));
    host.querySelector('.demo-reading-note').textContent=whitelistReplay&&step===3?'再次确认时，这六条记录均已存在。':data.whitelist.notes[step];
  }
  function buildFunnel(body) {
    body.append(make('p','demo-basis',data.focus.context),make('p','demo-contribution',data.focus.contribution),make('p','index-example-note','以下数量为示例数据，不代表真实业务成绩。'));
    const funnel=make('div','loan-funnel');
    data.funnel.nodes.forEach((label,i)=>{
      const row=make('button','funnel-stage');row.type='button';row.dataset.stage=i;row.style.setProperty('--funnel-ratio',data.funnel.values[i]/data.funnel.values[0]);
      row.append(make('span','funnel-label',label));const track=make('span','funnel-track'),bar=make('span','funnel-bar');track.append(bar);row.append(track);
      const stats=make('span','funnel-stats');stats.append(make('strong','',data.funnel.values[i].toLocaleString()),make('span','',i?`上一步 ${(data.funnel.values[i]/data.funnel.values[i-1]*100).toFixed(1)}%`:'起始数量'));row.append(stats);row.addEventListener('click',()=>seek(i));funnel.append(row);
    });body.append(funnel);
    const summary=make('div','funnel-summary');summary.append(make('strong','funnel-summary-title'),make('p','funnel-summary-note'));body.append(summary);
  }
  function renderFunnel() {
    host.querySelectorAll('.funnel-stage').forEach((row,i)=>{row.classList.toggle('revealed',i<=step);});
    const current=data.funnel.values[step],prior=step?data.funnel.values[step-1]:current;
    host.querySelector('.funnel-summary-title').textContent=step?`${data.funnel.nodes[step-1]} → ${data.funnel.nodes[step]}`:'注册数 · 漏斗起点';
    host.querySelector('.funnel-summary-note').textContent=step?`示例数量 ${current.toLocaleString()}，与上一步相差 ${(prior-current).toLocaleString()}，相邻节点比例 ${(current/prior*100).toFixed(1)}%。`:'从注册开始，逐级查看各环节的业务数据。';
    host.querySelector('.demo-reading-note').textContent=data.funnel.notes[step]+(step?` 示例 ${prior.toLocaleString()} → ${current.toLocaleString()}，相邻节点比例 ${(current/prior*100).toFixed(1)}%。`:' 示例起点：1,000。');
  }
  function buildFullstack(body) {
    body.append(make('p','demo-basis',data.focus.context),make('p','demo-contribution',data.focus.contribution));
    const wrap=make('div','fullstack-demo'),screens=make('div','fullstack-screens');wrap.dataset.screenSize='0';
    const sizes=make('div','fullstack-size-controls');sizes.setAttribute('aria-label','预览屏幕尺寸');
    ['窄屏','中屏','宽屏'].forEach((label,i)=>{const button=make('button','',label);button.type='button';button.setAttribute('aria-pressed',String(i===0));button.addEventListener('click',()=>{wrap.dataset.screenSize=i;sizes.querySelectorAll('button').forEach((node,j)=>node.setAttribute('aria-pressed',String(i===j)));});sizes.append(button);});wrap.append(sizes);
    ['窄屏','中屏','宽屏'].forEach((name,i)=>{
      const frame=make('div',`fullstack-device device-${i}`);frame.append(make('span','fullstack-device-label',name));
      const screen=make('div','fullstack-screen');screen.append(make('strong','fullstack-brand','牛圈'),make('span','fullstack-screen-heading','课程 / 资讯'));
      screen.append(make('span','fullstack-screen-state'));const cards=make('div','fullstack-cards');['课程内容','社区资讯'].forEach((label,j)=>{const card=make('div','fullstack-card');card.style.setProperty('--card-delay',`${i*70+j*60}ms`);card.append(make('span','fullstack-cover'),make('span','',label));cards.append(card);});screen.append(cards);frame.append(screen);screens.append(frame);
    });wrap.append(screens);
    const request=make('div','fullstack-transfer');request.append(make('span','fullstack-transfer-label'),make('span','fullstack-transfer-track'));wrap.append(request);
    const frontend=make('div','fullstack-layer');frontend.dataset.stage=1;frontend.append(make('strong','','Flutter'),make('span','','页面布局 / 业务请求 / 内容回显'));wrap.append(frontend);
    const api=make('div','fullstack-layer');api.dataset.stage=2;api.append(make('strong','','Spring Boot'),make('span','','业务接口 / 课程与社区功能'));wrap.append(api);
    const services=make('div','fullstack-services');services.dataset.stage=3;
    [['MyBatis','数据访问'],['Redis','缓存'],['RabbitMQ','非即时通知']].forEach(([name,role])=>{const service=make('div','fullstack-service');service.append(make('strong','',name),make('span','',role));services.append(service);});wrap.append(services);
    wrap.append(make('p','demo-diagram-caption','不同屏幕尺寸的布局示意；后端组件按职责展示。'));body.append(wrap);
    const path=make('div','demo-flow');data.fullstack.nodes.forEach((label,i)=>{const button=make('button','demo-node');button.type='button';button.dataset.stage=i;button.append(make('span','demo-flow-number',String(i+1).padStart(2,'0')),make('strong','',label));button.addEventListener('click',()=>seek(i));path.append(button);});body.append(path);
  }
  function renderFullstack() {
    const wrap=host.querySelector('.fullstack-demo');wrap.dataset.phase=step;
    wrap.classList.toggle('content-ready',step===0||step===4);
    wrap.querySelectorAll('.fullstack-screen-state').forEach(node=>node.textContent=['同一份内容 · 布局适配','发起请求…','接口接收请求…','处理课程数据…','内容已返回'][step]);
    host.querySelector('.fullstack-transfer-label').textContent=step===4?'内容返回 → 多端回显':step===0?'Flutter · 按屏幕尺寸调整布局':'Flutter → Spring Boot · 业务请求';
    host.querySelector('.demo-reading-note').textContent=data.fullstack.notes[step];
  }
  function buildWebsocket(body) {
    body.append(make('p','demo-basis',data.focus.context),make('p','demo-contribution',data.focus.contribution));
    const scene=make('div','socket-demo');scene.append(make('p','socket-user','同一用户 · userId = U01'));
    const queue=make('div','socket-queue');queue.append(make('strong','','RabbitMQ'),make('span','','同一条消息 → 各实例'));scene.append(queue);
    const lanes=make('div','socket-lanes');
    ['A','B','C'].forEach((letter,i)=>{
      const lane=make('div','socket-lane');lane.dataset.socketLane=i;
      const server=make('div','socket-server');server.append(make('strong','',`实例 ${letter}`),make('span','','Netty WebSocket'));lane.append(server,make('span','socket-wire'));
      const window=make('div','socket-window');window.append(make('strong','socket-window-name',`窗口 ${letter}`),make('span','socket-window-status'),make('span','socket-notice','收到通知 M01'));lane.append(window);lanes.append(lane);
    });scene.append(lanes);
    const cache=make('div','socket-cache');cache.append(make('span','','用户连接缓存'),make('strong','socket-cache-value'),make('span','socket-cache-note'));scene.append(cache);
    const result=make('div','socket-result');result.setAttribute('aria-live','polite');scene.append(result,make('p','demo-diagram-caption','三实例、三窗口为场景示意。连接登记规则依据实际项目描述。'));body.append(scene);
    const path=make('div','demo-flow socket-steps');data.websocket.nodes.forEach((label,i)=>{const button=make('button','demo-node');button.type='button';button.dataset.stage=i;button.append(make('span','demo-flow-number',String(i+1).padStart(2,'0')),make('strong','',label));button.addEventListener('click',()=>seek(i));path.append(button);});body.append(path);
    const details=make('details','socket-code-details');details.append(make('summary','','查看连接登记代码示意'));const codes=make('div','demo-code-pair');codes.append(codePanel('01 / 连接登记前',data.websocket.before,'before'),codePanel('02 / 增加缓存标识后',data.websocket.after,'after'));details.append(make('p','demo-disclosure','伪代码展示连接登记和清理规则，非项目历史源码。'),codes);body.append(details);
  }
  function renderWebsocket() {
    const scene=host.querySelector('.socket-demo');scene.dataset.phase=step;
    const admitted=step>=2&&step<=4?0:step===6?1:-1;
    host.querySelectorAll('.socket-lane').forEach((lane,i)=>{
      const registered=step<2||i===admitted,delivered=step===1||(step===4&&i===0),closed=step>=5&&i===0;
      lane.classList.toggle('registered',registered);lane.classList.toggle('delivered',delivered);lane.classList.toggle('closed',closed);lane.classList.toggle('ignored',step>=3&&i!==admitted&&!closed);
      lane.querySelector('.socket-window-name').textContent=step===6&&i===1?'新窗口 D':`窗口 ${'ABC'[i]}`;
      lane.querySelector('.socket-window-status').textContent=closed?'连接已失效':step<2?'已登记':i===admitted?'已登记推送连接':step===2?'尚未登记':step===6&&i===1?'已登记推送连接':'静默跳过登记';
    });
    host.querySelector('.socket-cache-value').textContent=step<2?'尚未加入连接标识规则':admitted<0?'U01 → 无连接标识':`U01 → ${admitted===0?'窗口 A / 实例 A':'新窗口 D / 实例 B'}`;
    host.querySelector('.socket-cache-note').textContent=step<2?'多窗口均参与推送':step===5?'已登记连接失效，清除标识':step===6?'后续新连接重新登记':'用户已有标识，后续连接不重复登记';
    host.querySelector('.socket-result').textContent=['多个窗口连接不同实例','同一条消息 · 用户收到 3 份','首个连接登记成功','后续连接静默跳过','同一条消息 · 用户收到 1 份','原连接失效 · 标识已清除','新建连接 · 登记成功'][step];
    host.querySelector('.demo-reading-note').textContent=data.websocket.notes[step];
    const highlights=step<2?(step===0?[1,2]:[4,5]):[[],[],[3,4],[2],[9,10],[6,7],[2,3,4]][step];
    host.querySelectorAll('.demo-code').forEach(panel=>{const active=panel.classList.contains(step<2?'before':'after');panel.classList.toggle('active',active);panel.querySelectorAll('.demo-code-line').forEach((line,i)=>line.classList.toggle('executing',active&&highlights.includes(i)));});
  }
  function buildSms(body) {
    body.append(make('p','demo-basis',data.focus.context),make('p','demo-contribution',data.focus.contribution),make('p','index-example-note','令牌容量与窗口上限均以 3 次示意，非线上配置；时间推进仅用于说明两种规则。'));
    const scene=make('div','sms-demo'),clock=make('p','sms-time');scene.append(clock);
    const guards=make('div','sms-guards'),bucket=make('section','sms-guard sms-bucket');
    bucket.append(make('h5','','① 令牌桶 · 控制突发'),make('p','sms-token-count'));
    const tokens=make('div','sms-tokens');for(let i=0;i<3;i++){const token=make('span','sms-token',String(i+1));token.dataset.token=i;tokens.append(token);}bucket.append(tokens,make('p','sms-guard-description','每次放行消耗令牌，令牌随时间补充。'));guards.append(bucket);
    const window=make('section','sms-guard sms-window');window.append(make('h5','','② 时间窗口 · 限制累计'),make('p','sms-window-count'));
    const track=make('div','sms-window-track');track.append(make('span','sms-window-fill'));window.append(track,make('p','sms-guard-description','即使有令牌，窗口累计达到上限时仍限制发送。'));guards.append(window);scene.append(guards);
    const decision=make('div','sms-decision');decision.append(make('strong','sms-decision-status'),make('p','sms-decision-reason'));scene.insertBefore(decision,guards);
    const delivery=make('div','sms-delivery');delivery.append(make('span','sms-request-label','短信请求'),make('span','sms-delivery-route'),make('span','sms-send-label'));scene.append(delivery);
    const totals=make('div','sms-totals');totals.append(make('span','sms-sent'),make('span','sms-blocked'));scene.append(totals);body.append(scene);
    const path=make('div','demo-flow');data.sms.nodes.forEach((label,i)=>{const button=make('button','demo-node');button.type='button';button.dataset.stage=i;button.append(make('span','demo-flow-number',String(i+1).padStart(2,'0')),make('strong','',label));button.addEventListener('click',()=>seek(i));path.append(button);});body.append(path);
  }
  function renderSms() {
    const frame=data.sms.frames[step],scene=host.querySelector('.sms-demo');scene.dataset.phase=step;
    scene.classList.toggle('blocked',step===2||step===3);scene.classList.toggle('sent',step===1||step===4);
    host.querySelector('.sms-time').textContent=`示例进度 · ${frame.time}`;
    host.querySelectorAll('.sms-token').forEach((node,i)=>node.classList.toggle('available',i<frame.tokens));
    host.querySelector('.sms-token-count').textContent=`可用令牌 ${frame.tokens} / 3`;
    host.querySelector('.sms-window-count').textContent=`窗口内已放行 ${frame.count} / 3`;
    host.querySelector('.sms-window-fill').style.transform=`scaleX(${frame.count/3})`;
    host.querySelector('.sms-bucket').classList.toggle('limiting',step===2);host.querySelector('.sms-window').classList.toggle('limiting',step===3);
    host.querySelector('.sms-decision-status').textContent=frame.status;host.querySelector('.sms-decision-reason').textContent=frame.reason;
    host.querySelector('.sms-send-label').textContent=step===2||step===3?'未调用短信发送':step===0?'短信服务':'短信服务 · 已发送';
    host.querySelector('.sms-sent').textContent=`累计发送 ${frame.sent} 次`;host.querySelector('.sms-blocked').textContent=`累计拦截 ${frame.blocked} 次`;
    host.querySelector('.demo-reading-note').textContent=data.sms.notes[step];
  }
  function buildMode() {
    const body = host.querySelector('.demo-body'); body.replaceChildren();
    const content = data[mode];
    body.append(make('h4', 'demo-title', content.title));
    if (mode === 'sms') { buildSms(body); }
    else if (mode === 'websocket') { buildWebsocket(body); }
    else if (mode === 'fullstack') { buildFullstack(body); }
    else if (mode === 'funnel') { buildFunnel(body); }
    else if (mode === 'whitelist') { buildWhitelist(body); }
    else if (mode === 'index') { buildIndex(body); }
    else if (mode === 'optimization') {
      body.append(make('p', 'demo-basis', content.basis), make('p', 'demo-intro', content.change));
      const codes = make('div', 'demo-code-pair'); codes.append(codePanel('01 / 优化前 · 流程示例', content.before, 'before'), codePanel('02 / 优化后 · 流程示例', content.after, 'after')); body.append(codes);
      const lanes = make('div', 'demo-lanes');
      ['before', 'after'].forEach((side, i) => {
        const lane = make('div', `demo-lane ${side}`); lane.append(make('span', 'demo-lane-label', i ? '优化后' : '优化前'));
        content.steps.forEach((item, index) => { const node = make('button', 'demo-node', item[side]); node.type = 'button'; node.dataset.stage = i * 3 + index; node.addEventListener('click', () => seek(i * 3 + index)); lane.append(node); });
        lanes.append(lane);
      }); body.append(lanes);
      if (content.boundary) body.append(make('p', 'demo-boundary', content.boundary));

    } else {
      body.append(make('p', 'demo-basis', data.architecture ? data.focus.context : '项目中的业务处理流程。'));
      body.append(flowDiagram());
      const path = make('div', 'demo-flow');
      content.nodes.forEach((name, i) => { const node = make('button', 'demo-node'); node.type = 'button'; node.dataset.stage = i; node.append(make('span', 'demo-flow-number', String(i + 1).padStart(2, '0')), make('strong', '', name)); node.addEventListener('click', () => seek(i)); path.append(node); }); body.append(path);
    }
    const reading = make('div', 'demo-reading'); reading.setAttribute('aria-live','polite'); const explanation=make('div','demo-reading-copy'); explanation.append(make('span','demo-reading-kicker'),make('strong','demo-reading-title'),make('p','demo-reading-note')); reading.append(make('span', 'demo-reading-number'),explanation); body.insertBefore(reading,body.children[1]);
    const background=make('details','demo-background');background.append(make('summary','','业务背景与我的职责'));body.querySelectorAll(':scope > .demo-basis, :scope > .demo-contribution').forEach(node=>background.append(node));if(background.children.length>1)body.insertBefore(background,reading);
    body.dataset.demoKind=mode;
    // Static DOM is reused by every step; no per-frame layout or canvas loop.
    if (data.architecture && mode === 'flow') background.append(make('p', 'demo-contribution', data.focus.contribution));
    if (data.technical) body.append(make('p', 'demo-data-note', data.technical));
    if (data.database) { body.append(make('h4', 'demo-data-title', '缓存与数据处理'), make('p', 'demo-data-note', data.database)); }
    step = 0; renderStep(); schedule();
  }
  function renderStep() {
    host.querySelectorAll('[data-stage]').forEach(node => { const n = Number(node.dataset.stage); node.classList.toggle('current', n === step); node.classList.toggle('complete', n < step); node.setAttribute('aria-current', n === step ? 'step' : 'false'); });
    const phase = step % 3;
    if (mode === 'sms') renderSms();
    else if (mode === 'websocket') renderWebsocket();
    else if (mode === 'fullstack') renderFullstack();
    else if (mode === 'funnel') renderFunnel();
    else if (mode === 'whitelist') renderWhitelist();
    else if (mode === 'index') renderIndex();
    else if (mode === 'optimization') {
      const after = step >= 3;
      host.querySelectorAll('.demo-code').forEach(panel => {
        const active = panel.classList.contains(after ? 'after' : 'before'); panel.classList.toggle('active', active);
        const lines = [...panel.querySelectorAll('.demo-code-line')];
        const highlights = data.optimization.highlights[after ? 'after' : 'before'][phase];
        lines.forEach((line, i) => line.classList.toggle('executing', active && highlights.includes(i)));
      });
      host.querySelector('.demo-reading-note').textContent = `${after ? '优化后' : '优化前'}：${data.optimization.steps[phase][after ? 'after' : 'before']}。${data.optimization.steps[phase].note}`;
    } else {
      host.querySelector('.demo-reading-note').textContent = data.flow.notes[step];
      const svg = host.querySelector('.demo-diagram'), packet = svg.querySelector('.demo-packet'), [x, y] = svg.flowPoints[step];
      svg.querySelectorAll('[data-station]').forEach(node => { node.classList.toggle('current', Number(node.dataset.station) === step); node.classList.toggle('complete', Number(node.dataset.station) < step); });
      svg.querySelectorAll('[data-edge]').forEach(node => node.classList.toggle('complete', Number(node.dataset.edge) < step));
      packet.style.transform = `translate(${x}px,${y}px)`;
    }
    host.querySelector('.demo-body').dataset.phase=step;
    host.querySelector('.demo-reading-kicker').textContent=mode==='sms'?'短信接口防护':mode==='websocket'?['问题场景','重复投递','连接登记','连接登记','投递结果','失效清理','重新登记'][step]:mode==='index'?(step<3?'索引写入':step===3?'选择条件':step===4?'求交集':'查询结果'):mode==='whitelist'?(step<3?'筛查名单':step<5?'确认并导入':'结果标记'):mode==='fullstack'?(step===0?'多端适配':step===4?'页面回显':'接口请求'):mode==='funnel'?'业务转化':mode==='optimization'?(step<3?'原有流程':'优化流程'):'当前环节';
    host.querySelector('.demo-reading-title').textContent=mode==='optimization'?`${step>=3?'优化后':'优化前'} · ${data.optimization.steps[phase][step>=3?'after':'before']}`:data[mode].nodes[step];
    host.querySelector('.demo-reading-number').textContent = `${String(step + 1).padStart(2, '0')} / ${String(count()).padStart(2, '0')}`;
    host.querySelector('.demo-progress').value = step; host.querySelector('.demo-progress').max = count() - 1;
    host.querySelector('.demo-progress').style.setProperty('--demo-progress',`${step / Math.max(1,count()-1)*100}%`);
    const play = host.querySelector('.demo-play'); play.textContent = playing ? '暂停' : step === count() - 1 ? '重播' : '播放'; play.setAttribute('aria-pressed', String(playing));
    host.classList.toggle('demo-running', canPlay());
    host.querySelector('.demo-prev').disabled = step === 0; host.querySelector('.demo-next').disabled = step === count() - 1;
  }
  function seek(index) { playing = false; step = Math.max(0, Math.min(count() - 1, index)); cancelTick(); renderStep(); }
  document.querySelector('#demo-jump').addEventListener('click', () => host.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' }));
  function mount(index) {
    stop(); data = window.HYTEX_PROJECT_DEMOS[index]; document.querySelector('#demo-jump').hidden = !data; if (!data) { host.hidden = true; host.replaceChildren(); return; }
    host.hidden = false; playing = !reduced.matches && !window.HYTEX_SPATIAL?.state.paused; mode = data.sms ? 'sms' : data.websocket ? 'websocket' : data.fullstack ? 'fullstack' : data.funnel ? 'funnel' : data.whitelist ? 'whitelist' : data.optimization ? 'optimization' : 'flow'; visible = false;
    host.replaceChildren();
    const heading = make('div', 'demo-heading'); heading.append(make('h3', '', '亮点演示'), make('span', 'demo-label', '处理过程'));
    const note = make('p', 'demo-disclosure', data.optimization ? '代码为处理流程示例，非项目历史源码。' : '流程依据项目描述整理。');
    const tabs = make('div', 'demo-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '亮点演示类型');
    const modes = data.sms ? ['sms'] : data.websocket ? ['websocket'] : data.fullstack ? ['fullstack'] : data.funnel ? ['funnel'] : data.whitelist ? ['whitelist'] : data.index ? ['flow', 'index'] : data.optimization ? ['optimization', 'flow'] : ['flow'];
    modes.forEach((key) => {
      const tab = make('button', '', key === 'sms' ? '短信接口 / 请求限制' : key === 'websocket' ? 'WebSocket / 连接登记' : key === 'fullstack' ? '独立开发 / 多端适配' : key === 'funnel' ? '业务数据漏斗' : key === 'whitelist' ? '白名单导入' : key === 'index' ? '发布包检索' : key === 'flow' ? data.architecture ? '多微服务' : '业务亮点' : '优化对照'); tab.type = 'button'; tab.dataset.demoMode = key; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', 'demo-body'); tab.id = `demo-tab-${key}`;
      tab.addEventListener('click', () => selectMode(key)); tab.addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? modes[0] : e.key === 'End' ? modes[modes.length - 1] : modes[(modes.indexOf(key) + 1) % modes.length]; selectMode(next); tabs.querySelector(`[data-demo-mode="${next}"]`).focus(); } }); tabs.append(tab);
    });
    const body = make('div', 'demo-body'); body.id = 'demo-body'; body.setAttribute('role', 'tabpanel');
    const controls = make('div', 'demo-controls');
    const prev = make('button', 'demo-prev', '上一步'), play = make('button', 'demo-play', '暂停'), next = make('button', 'demo-next', '下一步'), progress = make('input', 'demo-progress');
    [prev, play, next].forEach(b => b.type = 'button'); progress.type = 'range'; progress.min = 0; progress.step = 1; progress.setAttribute('aria-label', '演示步骤');
    prev.addEventListener('click', () => seek(step - 1)); next.addEventListener('click', () => seek(step + 1)); progress.addEventListener('input', () => seek(Number(progress.value)));
    play.addEventListener('click', () => { if (step === count() - 1) step = 0; playing = !playing; if (reduced.matches) { seek(Math.min(step + 1, count() - 1)); return; } renderStep(); schedule(); });
    controls.append(prev, play, progress, next); host.append(heading, note, tabs, body, controls);
    selectMode(mode);
    observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .1; renderStep(); schedule(); }, { root: dialog, threshold: .1 }); observer.observe(host.querySelector('.demo-body'));
  }
  function selectMode(key) {
    generation++; cancelTick(); mode = key;
    if (key === 'whitelist') { whitelistExisting = new Map(data.whitelist.existing.map(record=>[record.id,record.bits])); whitelistReplay=false; }
    if (key === 'index') indexFilters = { platform: 'Android', version: '1.1' };
    host.querySelectorAll('[data-demo-mode]').forEach(tab => { const active = tab.dataset.demoMode === key; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
    host.querySelector('.demo-body').setAttribute('aria-labelledby', `demo-tab-${key}`); buildMode();
  }
  function stop() { generation++; cancelTick(); observer?.disconnect(); observer = null; playing = false; visible = false; host?.classList.remove('demo-running'); }
  document.addEventListener('visibilitychange', () => { if (data && host.childElementCount) { renderStep(); schedule(); } });
  document.addEventListener('spatial-project-ready', () => { if (data) { renderStep(); schedule(); } });
  document.addEventListener('spatial-pause', event => { if (event.detail && data) { playing = false; cancelTick(); renderStep(); } });
  reduced.addEventListener('change', () => { if (reduced.matches && data) { playing = false; cancelTick(); renderStep(); } });
  window.HYTEX_DEMOS = { mount, stop, get state() { return { mode, step, playing, timer, visible }; } };
})();
