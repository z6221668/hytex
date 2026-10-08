'use strict';
(() => {
  const api=window.HYTEX_SPATIAL,room=document.querySelector('#interactive-room'),toggle=document.querySelector('#interactive-toggle');
  const canvas=document.querySelector('#resume-scene'),main=document.querySelector('#main'),panel=document.querySelector('#room-content'),inspector=document.querySelector('#room-inspector');
  const $=id=>document.getElementById(id),emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
  const scenes=[['01','HYTEX',''],['02','技术','选择一项，展开技术说明。'],['03','项目','选择左侧项目，查看详情。'],['04','工作经历','左右拖动，查看不同公司的经历。'],['05','开源项目','独立查询同时执行，取得结果后汇总。'],['06','联系',''],['07','摄影','左右拖动挑选照片，长按显影后查看大图。']];
  let active=false,started=false,current=0,selection=0,savedScroll=0,yaw=0,pitch=0,zoom=1,drag=null,suppressClick=false,holdActivated=false,scrollFrame=0,holdTimer=null,gather=0,introLocked=false;
  const node=(tag,cls,content)=>{const n=document.createElement(tag);n.className=cls;if(content!==undefined)n.textContent=content;return n;};
  function setToggleLabel(label){toggle.textContent=label;const radar=node('span','interactive-radar');radar.setAttribute('aria-hidden','true');toggle.append(radar);}
  const queryView=window.createQueryExhibit(room);
  const contact=node('section','contact-exhibit');contact.hidden=true;contact.setAttribute('aria-label','邮箱联系');
  const contactInner=node('div','contact-inner'),email=node('a','contact-email','68449317@qq.com');email.href='mailto:68449317@qq.com';
  const contactActions=node('div','contact-actions'),sendMail=node('a','','发送邮件 ↗'),copyMail=node('button','','复制邮箱'),copyStatus=node('p','contact-status');
  sendMail.href=email.href;copyMail.type='button';copyStatus.setAttribute('role','status');
  copyMail.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('68449317@qq.com');copyStatus.textContent='邮箱已复制';}catch{copyStatus.textContent='请长按或选中邮箱复制';}});
  contactActions.append(sendMail,copyMail);contactInner.append(node('p','contact-kicker','06 / 联系'),email,contactActions,copyStatus);contact.append(contactInner,node('span','contact-signature','HYTEX'));room.append(contact);

  const detail=document.createElement('dialog');detail.id='exhibition-dialog';detail.className='exhibition-dialog';detail.setAttribute('aria-label','互动展厅详情');document.body.append(detail);
  const highlightHost=node('section','interactive-highlight-demo');highlightHost.id='interactive-project-demo';const highlightDemo=window.createProjectDemo(highlightHost,detail);
  let dialogAnimation=null,dialogOpener=null,dialogClosing=false;
  function closeDetail(){
    if(!detail.open||dialogClosing)return;highlightDemo.stop();dialogAnimation?.cancel();dialogAnimation=null;
    if(detail.classList.contains('is-highlight')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      dialogClosing=true;const closing=detail.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.98)'}],{duration:180,easing:'ease-in',fill:'forwards'});
      closing.finished.then(()=>{detail.close();closing.cancel();dialogClosing=false;},()=>{dialogClosing=false;});
    }else detail.close();
  }
  detail.addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
  detail.addEventListener('close',()=>{if(detail.open)return;highlightDemo.stop();detail.classList.remove('detail-ready');emit('spatial-modal',false);dialogOpener?.focus({preventScroll:true});detail.replaceChildren();});
  detail.addEventListener('click',e=>{if(e.target===detail){const r=detail.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDetail();}});
  function showTextDetail(title,content){
    if(detail.open)return;dialogOpener=document.activeElement;detail.className='exhibition-dialog text-detail';
    const close=node('button','exhibit-close','关闭 ×');close.type='button';close.addEventListener('click',closeDetail);
    const heading=node('h2','',title);heading.id='text-detail-title';detail.setAttribute('aria-labelledby',heading.id);
    detail.replaceChildren(close,heading,...content);detail.showModal();detail.scrollTop=0;emit('spatial-modal',true);
  }
  const codeButton=node('button','query-code-open','查看代码');codeButton.type='button';codeButton.setAttribute('aria-haspopup','dialog');
  codeButton.addEventListener('click',()=>showTextDetail('Java 21 · 示例调用',[room.querySelector('.query-source pre').cloneNode(true)]));
  room.querySelector('.query-controls').insertBefore(codeButton,room.querySelector('.query-controls a'));
  function makeTags(values){const g=node('div','exhibit-tags');values.forEach(v=>g.append(node('span','',v)));return g;}
  function showDetail(isPhoto,index){
    if(detail.open)return;detail.replaceChildren();dialogOpener=document.activeElement;detail.removeAttribute('aria-labelledby');detail.className='exhibition-dialog';detail.classList.toggle('is-photo',isPhoto);
    const close=node('button','exhibit-close','关闭 ×');close.type='button';close.addEventListener('click',closeDetail);detail.append(close);
    if(isPhoto){const p=HYTEX_HOBBIES.photos[index],image=node('img','exhibit-full-photo');image.src=p.src;image.alt=p.alt;detail.append(image,node('p','exhibit-photo-caption',p.caption));}
    else{
      const p=RESUME.projects[index],demo=window.HYTEX_PROJECT_DEMOS?.[index];
      const top=node('div','exhibit-project-top');top.append(node('span','exhibit-project-number',p.number),node('p','exhibit-overline',p.label),node('h2','',p.title),node('p','exhibit-period',p.period));
      const body=node('div','exhibit-project-body');body.append(node('p','exhibit-summary',p.summary),makeTags(p.tags));
      if(demo?.focus){const focus=node('section','exhibit-focus');focus.append(node('p','exhibit-overline','项目亮点'),node('h3','',demo.focus.title),node('p','',demo.focus.context),node('p','',demo.focus.contribution));if(demo.technical)focus.append(node('p','',demo.technical));body.append(focus);
        const walkthrough=node('details','mobile-project-highlights');walkthrough.append(node('summary','','查看亮点演示'));
        walkthrough.addEventListener('toggle',()=>{if(walkthrough.open){walkthrough.append(highlightHost);detail.classList.add('detail-ready');highlightDemo.mount(index);}else highlightDemo.stop();});body.append(walkthrough);
      }
      const list=node('ol','exhibit-work');p.details.forEach((text,i)=>{const li=node('li','');li.append(node('span','',String(i+1).padStart(2,'0')),node('p','',text));list.append(li);});body.append(node('h3','exhibit-work-heading','负责的工作'),list);detail.append(top,body);
    }
    detail.showModal();detail.scrollTop=0;emit('spatial-modal',true);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){dialogAnimation=detail.animate(isPhoto?[{clipPath:'inset(49% 0 round 18px)',opacity:.2},{clipPath:'inset(0% 0 round 18px)',opacity:1}]:[{transform:'perspective(1200px) rotateY(-12deg) translateY(25px) scale(.92)',opacity:0},{transform:'perspective(1200px) rotateY(0deg) translateY(0px) scale(1)',opacity:1}],{duration:isPhoto?850:650,easing:'cubic-bezier(.16,1,.3,1)'});dialogAnimation.finished.catch(()=>{}).then(()=>{dialogAnimation=null;});}
  }
  function showHighlight(index){
    if(detail.open)return;dialogOpener=document.activeElement;detail.className='exhibition-dialog is-highlight';
    const project=RESUME.projects[index],demo=window.HYTEX_PROJECT_DEMOS?.[index];
    const close=node('button','exhibit-close','关闭 ×');close.type='button';close.addEventListener('click',closeDetail);
    const body=node('section','highlight-body'),title=node('h2','',demo?.focus?.title||'需求收集与任务分配');title.id='highlight-title';detail.setAttribute('aria-labelledby',title.id);
    body.append(node('p','exhibit-overline',`${project.title} / 项目亮点`),title);
    if(demo?.focus){const context=node('details','highlight-background');context.append(node('summary','','背景与负责内容'),node('p','highlight-context',demo.focus.context),node('p','highlight-contribution',demo.focus.contribution));if(index===0&&demo.technical)context.append(node('p','highlight-contribution',demo.technical));body.append(context);}
    else body.append(node('p','highlight-contribution','担任项目负责人，负责需求的二次收集、任务分配，以及项目组内的协作。'));
    if(demo)body.append(highlightHost);
    detail.replaceChildren(close,body);detail.showModal();detail.classList.add('detail-ready');detail.scrollTop=0;emit('spatial-modal',true);if(demo)highlightDemo.mount(index);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)dialogAnimation=detail.animate([{opacity:0,transform:'translateY(12px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  function renderContent(){
    const section=node('section','exhibit-reading');section.append(node('p','exhibit-overline',scenes[current][0]));
    if(current===0){section.append(node('h2','exhibit-name','HYTEX'),node('p','exhibit-role','Java 后端开发'),node('p','','2018 年起从事 Java 开发，参与数据中台、金融平台和移动端产品研发。'),makeTags(['Spring 微服务','AI 应用','跨端协作']));}
    if(current===1){const s=RESUME.skills[selection],parts=s.description.split(/[。；]/).filter(Boolean);section.append(node('h2','',s.name),node('p','exhibit-subtitle',s.kind),node('p','',parts.shift()+'。'));const list=node('ul','exhibit-points');parts.forEach(t=>list.append(node('li','',t+'。')));section.append(list);}
    if(current===2){const p=RESUME.projects[selection];section.append(node('h2','',p.title),node('p','',p.cardDescription),makeTags(p.tags));const button=node('button','exhibit-link','抽取这份档案 ↗');button.type='button';button.addEventListener('click',activate);section.append(button);}
    if(current===3){const e=RESUME.experience[selection];section.append(node('p','exhibit-period',e.period),node('h2','',e.company),node('p','exhibit-subtitle',e.role),node('p','',e.description),makeTags(e.tags));}
    if(current===4){section.append(node('h2','','开源项目'),node('p','','将独立只读查询提交到 Java 21 虚拟线程，使用 Future 取得结果并汇总返回。'));const stages=node('ol','exhibit-query-stages');['提交用户、订单、账户查询','三项任务独立执行','Future 取得结果','组合成接口响应'].forEach(t=>stages.append(node('li','',t)));section.append(stages);const code=node('pre','exhibit-code','var user = tasks.submit(this::queryUser);\nvar orders = tasks.submit(this::queryOrders);\nvar account = tasks.submit(this::queryAccount);\nreturn combine(tasks.await(user), tasks.await(orders), tasks.await(account));');section.append(code);const a=node('a','exhibit-link','查看源码 ↗');a.href='https://github.com/z6221668/parallel_query';a.target='_blank';a.rel='noopener noreferrer';section.append(a);}
    if(current===5){section.append(node('h2','','邮箱联系'));const a=node('a','exhibit-mail','68449317@qq.com');a.href='mailto:68449317@qq.com';section.append(a);const copy=node('button','exhibit-link','复制邮箱');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('68449317@qq.com');copy.textContent='已复制';}catch{copy.textContent='请选中邮箱复制';}});section.append(copy);}
    if(current===6&&selection<HYTEX_HOBBIES.photos.length){const p=HYTEX_HOBBIES.photos[selection];section.append(node('h2','',p.caption));const image=node('img','exhibit-thumbnail');image.src=p.src;image.alt=p.alt;section.append(image);const b=node('button','exhibit-link','让照片显影 ↗');b.type='button';b.addEventListener('click',activate);section.append(b);}
    panel.replaceChildren(section);panel.scrollTop=0;
  }

  const viewport=$('journey-viewport'),gate=$('journey-gate'),cue=$('journey-scroll-cue');
  const pageGesture=window.createPageGesture();
  viewport.style.setProperty('--page-height',`${innerHeight}px`);
  const sheet=$('technology-sheet'),lens=$('technology-lens');room.append(sheet);
  function hideLens(){lens.hidden=true;}
  const groups=[['AI 应用',[0]],['后端与服务',[1,2,6,7,8]],['数据与消息',[3,4,5]],['跨端开发',[9,10]]];
  const techTiles=[];
  groups.forEach(([label,indices])=>{
    const group=node('section','tech-group');group.append(node('h3','tech-group-label',label));
    indices.forEach(index=>{
      const skill=RESUME.skills[index],item=node('div','tech-index-item'),button=node('button','tech-tile'),name=node('span','tech-name',skill.name),description=node('div','tech-description');
      button.type='button';button.dataset.tech=index;button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',`tech-description-${index}`);if(index<2)button.classList.add('featured');
      button.append(name,node('span','tech-toggle','+'));description.id=`tech-description-${index}`;description.hidden=true;description.append(node('p','tech-kind',skill.kind),node('p','',skill.description));
      button.setAttribute('aria-haspopup','dialog');button.removeAttribute('aria-expanded');button.removeAttribute('aria-controls');
      button.addEventListener('click',()=>showTextDetail(skill.name,[node('p','tech-kind',skill.kind),node('p','',skill.description)]));
      item.append(button,description);group.append(item);techTiles.push(button);
    });sheet.append(group);
  });
  let textLayoutFrame=0,textRevision=0;
  const careerIndex=node('div','career-index'),careerStrip=node('div','career-strip');careerIndex.hidden=true;careerIndex.setAttribute('aria-label','按时间排列的公司经历');
  [...RESUME.experience].reverse().forEach((experience,order)=>{const index=RESUME.experience.length-1-order,button=node('button','career-word');button.type='button';button.dataset.company=index;button.append(node('span','career-year',experience.period.slice(0,4)),node('span','career-company',experience.shortCompany),node('span','career-role',experience.role));button.addEventListener('click',()=>{if(suppressClick||holdActivated){suppressClick=false;holdActivated=false;return;}choose(index);});careerStrip.append(button);});careerIndex.append(careerStrip);room.append(careerIndex);
  const photoLabel=node('p','photo-index-caption');photoLabel.hidden=true;room.append(photoLabel);
  const eggIndex=HYTEX_HOBBIES.photos.length;
  const eggMenu=node('nav','photo-easter-menu');eggMenu.hidden=true;eggMenu.setAttribute('aria-label','摄影彩蛋菜单');
  const eggButton=node('button','photo-easter-button');eggButton.type='button';eggButton.setAttribute('aria-label','打开彩蛋：视线光晕');
  eggButton.innerHTML='<span class="hatching-egg" aria-hidden="true"><span class="egg-shadow"></span><span class="egg-body"><span class="egg-light"></span><span class="egg-shell egg-shell-bottom"></span><span class="egg-shell egg-shell-top"></span></span></span><span class="egg-menu-title">视线光晕 <span aria-hidden="true">↗</span></span><span class="egg-menu-hint">隐藏交互 · 点击唤醒</span>';
  eggButton.addEventListener('click',()=>{stopHold();emit('gaze-open');});
  eggButton.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose((selection+(e.key==='ArrowRight'?1:-1)+eggIndex+1)%(eggIndex+1));viewport.focus({preventScroll:true});}});
  eggMenu.append(eggButton);room.append(eggMenu);
  document.addEventListener('exhibition-egg-position',e=>{const {x,y,scale,visible,paused}=e.detail;eggMenu.hidden=!active||!started||current!==6||!visible;if(eggMenu.hidden)return;eggMenu.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${scale})`;eggMenu.classList.toggle('motion-paused',paused);});

  function textElements(index){
    const heading=index===0||index===5?[]:[...room.querySelectorAll('.room-heading > *')];
    const selectors={1:'.tech-name,.tech-group-label,.tech-toggle',2:'.project-row-number,.project-row-title',3:'.career-year,.career-company,.career-role',4:'.query-diagram-head span,.query-task,.query-result,.query-collected span,.query-output,.query-footnote,.query-code-caption,.query-code-line i,.query-code-line code,.query-status,.query-controls > *',5:'.contact-kicker,.contact-email,.contact-actions > *,.contact-signature',6:'.photo-index-caption'};
    return [...heading,...(selectors[index]?[...room.querySelectorAll(selectors[index])]:[])];
  }
  function captureText(index){
    const lines=[];
    textElements(index).forEach(element=>{
      if(!element.getClientRects().length)return;element.dataset.particleText='';
      const style=getComputedStyle(element);let clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
      for(let p=element.parentElement;p&&p!==room;p=p.parentElement){if(/auto|scroll|hidden/.test(getComputedStyle(p).overflowY)){const r=p.getBoundingClientRect();clip={left:Math.max(clip.left,r.left),top:Math.max(clip.top,r.top),right:Math.min(clip.right,r.right),bottom:Math.min(clip.bottom,r.bottom)};}}
      const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),range=document.createRange();let textNode;
      while((textNode=walker.nextNode())){
        let line=null;
        for(let i=0;i<textNode.length;i++){
          range.setStart(textNode,i);range.setEnd(textNode,i+1);const r=range.getBoundingClientRect();if(!r.width||r.bottom<clip.top||r.top>clip.bottom||r.right<clip.left||r.left>clip.right)continue;
          if(!line||Math.abs(line.y-r.y)>2){line={text:'',x:r.x,y:r.y,width:0,height:r.height,font:`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,spacing:style.letterSpacing};lines.push(line);}line.text+=textNode.data[i];line.width=r.right-line.x;
        }
      }
    });return lines;
  }
  function measurePageText(notify=true){
    textLayoutFrame=0;if(!active||!started)return;
    room.style.setProperty('--mobile-content-top',`${room.querySelector('.room-heading').getBoundingClientRect().bottom+18}px`);
    if(current===1){sheet.style.top=`${room.querySelector('.room-heading').getBoundingClientRect().bottom+34}px`;}
    if(current===2)measureProjectTargets();
    if(current===3)emit('exhibition-career-layout',{railY:careerIndex.getBoundingClientRect().bottom+12});
    if(notify!==false)emit('exhibition-text-target',{index:current,revision:textRevision,labels:captureText(current)});
  }
  function schedulePageText(){if(!textLayoutFrame)textLayoutFrame=requestAnimationFrame(measurePageText);}
  let textViewportWidth=innerWidth;
  window.addEventListener('resize',()=>{const widthChanged=innerWidth!==textViewportWidth;textViewportWidth=innerWidth;if(active&&started){if(!widthChanged&&!room.classList.contains('particle-arriving')){measurePageText(false);return;}textRevision++;room.classList.add('particle-arriving');schedulePageText();}});
  document.addEventListener('exhibition-career-position',e=>{careerStrip.style.setProperty('--career-index',RESUME.experience.length-1-e.detail.value);});
  document.addEventListener('exhibition-text-ready',e=>{
    if(e.detail.index!==current||e.detail.revision!==textRevision)return;
    room.classList.remove('particle-arriving','tech-forming');sheet.classList.add('tech-ready');
    if(current===2){projectButtons.forEach((button,index)=>{button.classList.add('arrived');button.disabled=false;});if(projectDefaultPending&&innerWidth>700)showProjectInline(0);}
    if(current===3)reveal(true);
    if(current===4)queryView.replay();
  });
  const compactProjects=()=>innerWidth<=700||innerHeight<500;
  const projectBoard=$('project-board'),projectDetail=$('project-inline-detail');let projectAnimation=null,projectDefaultPending=false;
  const projectButtons=RESUME.projects.map((project,index)=>{const button=node('button','project-flight-row');button.type='button';button.disabled=true;button.setAttribute('aria-controls',compactProjects()?'exhibition-dialog':'project-inline-detail');if(compactProjects())button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.append(node('span','flight-marker',''),node('span','project-row-number',project.number),node('span','project-row-title',project.title));button.addEventListener('click',()=>showProjectInline(index));projectBoard.append(button);return button;});
  function measureProjectTargets(){if(!active||current!==2)return;const heading=room.querySelector('.room-heading').getBoundingClientRect();projectBoard.style.top=`${heading.bottom+28}px`;emit('exhibition-project-layout',projectButtons.map(button=>{const r=button.querySelector('.flight-marker').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,height:r.height};}));}
  function showProjectInline(index){
    if(compactProjects()){projectDefaultPending=false;selection=index;projectDetail.hidden=true;showDetail(false,index);return;}
    projectDefaultPending=false;selection=index;emit('exhibition-select',{index});const p=RESUME.projects[index],demo=window.HYTEX_PROJECT_DEMOS?.[index];projectAnimation?.cancel();
    const close=node('button','inline-detail-close','×');close.type='button';close.setAttribute('aria-label','收起项目详情');close.addEventListener('click',()=>{projectDetail.hidden=true;projectButtons.forEach(b=>b.setAttribute('aria-expanded','false'));});
    const content=[close,node('p','exhibit-overline',`${p.number} / ${p.label}`),node('h2','',p.title),node('p','exhibit-period',p.period),node('p','inline-project-summary',p.cardDescription),makeTags(p.tags)];
    const highlight=node('button','project-highlight-link','项目亮点 ↗');highlight.type='button';highlight.setAttribute('aria-haspopup','dialog');highlight.addEventListener('click',()=>showHighlight(index));content.push(highlight);
    const full=node('button','project-full-link','完整项目介绍 ↗');full.type='button';full.setAttribute('aria-haspopup','dialog');full.addEventListener('click',()=>showDetail(false,index));content.push(full);projectDetail.replaceChildren(...content);projectDetail.hidden=false;projectDetail.scrollTop=0;
    projectButtons.forEach((b,i)=>{b.classList.toggle('selected',i===index);b.setAttribute('aria-expanded',String(i===index));});
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)projectAnimation=projectDetail.animate([{opacity:.5},{opacity:1}],{duration:180,easing:'ease-out'});
  }
  document.addEventListener('exhibition-project-arrived',e=>{if(current!==2||room.classList.contains('particle-arriving'))return;const button=projectButtons[e.detail.index];button.classList.add('arrived');button.disabled=false;if(e.detail.index===0&&!compactProjects()&&projectDefaultPending&&!room.classList.contains('particle-arriving'))showProjectInline(0);});
  window.addEventListener('resize',measureProjectTargets);
  function reveal(value){inspector.hidden=!value;room.classList.toggle('show-content',value);}
  function choose(index,play=false){stopHold();if(current===2&&play){showProjectInline(index);return;}selection=index;if(current===6)photoLabel.textContent=HYTEX_HOBBIES.photos[index]?.caption||'彩蛋 · 视线光晕';gather=0;renderContent();emit('exhibition-select',{index});if(play)activate();}
  function activate(){if(current===6&&selection===eggIndex){if(active&&started&&!document.querySelector('dialog[open]'))emit('gaze-open');return;}if(current===5)return;if(current===4){queryView.replay();return;}if(!active||!started||document.querySelector('dialog[open]'))return;reveal(false);emit('exhibition-action',{index:selection});}
  function updateChapter(index){
    cancelGesture();
    if(started)emit('exhibition-text-source',{index:current,labels:captureText(current)});textRevision++;room.classList.toggle('particle-arriving',started);
    eggMenu.hidden=true;queryView.setActive(index===4,true);contact.hidden=index!==5;careerIndex.hidden=index!==3;photoLabel.hidden=index!==6;if(index===3)careerStrip.style.setProperty('--career-index','0');if(index===6)photoLabel.textContent=HYTEX_HOBBIES.photos[0].caption;copyStatus.textContent='';current=index;selection=index===1?1:index===3?3:0;gather=0;yaw=pitch=0;zoom=1;reveal(false);stopHold();
    room.classList.toggle('tech-forming',index===1);sheet.hidden=index!==1;if(index===1){sheet.classList.remove('tech-ready');sheet.scrollTop=0;sheet.querySelectorAll('.tech-description').forEach(n=>n.hidden=true);techTiles.forEach(b=>{b.lastChild.textContent='+';});}projectBoard.hidden=index!==2;projectDetail.hidden=true;projectAnimation?.cancel();if(index===2){projectDefaultPending=!compactProjects();projectButtons.forEach(b=>{b.disabled=true;b.classList.remove('arrived','selected');b.setAttribute('aria-expanded','false');});requestAnimationFrame(measureProjectTargets);}room.dataset.chapter=index;$('room-kicker').textContent=scenes[index][0];$('room-title').textContent=scenes[index][1];$('room-hint').textContent=index===2&&compactProjects()?'点击项目，查看详情。':scenes[index][2];
    hideLens();renderContent();textElements(index).forEach(element=>element.dataset.particleText='');emit('exhibition-chapter',{index});if(started)schedulePageText();
  }
  function canNavigate(direction){
    return active&&started&&!introLocked&&!document.querySelector('dialog[open]')&&current+direction>=0&&current+direction<scenes.length;
  }
  function navigate(direction){
    if(!canNavigate(direction))return false;
    viewport.scrollTop=(current+direction)*innerHeight;syncScroll();return true;
  }
  function syncScroll(){
    scrollFrame=0;if(!active||!started)return;if(introLocked){viewport.scrollTop=0;return;}
    const index=Math.max(0,Math.min(scenes.length-1,Math.round(viewport.scrollTop/innerHeight)));
    if(index!==current)updateChapter(index);
    // The scroll position identifies a page; it no longer drives camera animation.
    if(Math.abs(viewport.scrollTop-index*innerHeight)>.5)viewport.scrollTop=index*innerHeight;
    room.style.setProperty('--section-opacity','1');room.style.setProperty('--chapter-exit-opacity','1');
    cue.style.opacity=index===0?'1':'0';hideLens();
  }
  // One touch owner for the whole exhibition, including fixed overlay panels.
  let panelTouch=null;
  function stopTouchScroll(){panelTouch=null;}
  room.addEventListener('touchstart',e=>{
    stopTouchScroll();
    if(!active||!started||introLocked||document.querySelector('dialog[open]')||e.touches.length!==1)return;
    const t=e.touches[0];panelTouch={x:t.clientX,y:t.clientY,axis:null,turned:false,horizontal:current===6||!!e.target.closest('.career-index')};
  },{passive:true});
  room.addEventListener('touchmove',e=>{
    if(e.touches.length!==1){stopTouchScroll();return;}
    if(!panelTouch||!e.cancelable)return;
    // Prevent browser scrolling before its direction threshold cancels our pointer stream.
    e.preventDefault();
    const t=e.touches[0],dx=t.clientX-panelTouch.x,dy=t.clientY-panelTouch.y;
    if(!panelTouch.axis&&Math.hypot(dx,dy)>7)panelTouch.axis=panelTouch.horizontal&&Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
    if(panelTouch.axis!=='y')return;
    stopHold();suppressClick=true;
    if(!panelTouch.turned&&Math.abs(dy)>=55){panelTouch.turned=true;navigate(dy<0?1:-1);}
  },{passive:false});
  room.addEventListener('touchend',stopTouchScroll,{passive:true});
  room.addEventListener('touchcancel',stopTouchScroll,{passive:true});
  window.addEventListener('blur',stopTouchScroll);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTouchScroll();});
  document.addEventListener('spatial-modal',e=>{if(e.detail)stopTouchScroll();});
  document.addEventListener('wheel',e=>{
    if(active&&introLocked&&!e.ctrlKey){if(e.cancelable)e.preventDefault();return;}
    if(!active||!started||e.ctrlKey||document.querySelector('dialog[open]')||!e.cancelable||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1);
    const now=performance.now();
    const direction=pageGesture.wheel(delta,now);
    if(direction)navigate(direction);
    e.preventDefault();
  },{passive:false});
  viewport.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(syncScroll);},{passive:true});
  window.addEventListener('resize',()=>{viewport.style.setProperty('--page-height',`${innerHeight}px`);if(active&&started){viewport.scrollTop=current*innerHeight;syncScroll();}});
  function begin(){
    if(started||$('journey-start').disabled)return;started=true;introLocked=true;room.classList.add('intro-running');viewport.scrollTop=0;room.classList.add('started');document.body.classList.add('journey-started');gate.classList.add('leaving');
    const start=$('journey-start'),range=document.createRange();range.selectNodeContents(start);const bounds=range.getBoundingClientRect(),style=getComputedStyle(start);
    emit('exhibition-intro',{labels:[{text:'开始',x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,font:style.font,spacing:style.letterSpacing}]});
    syncScroll();viewport.focus({preventScroll:true});
  }
  document.addEventListener('exhibition-intro-ready',()=>{
    if(!active||!started||!introLocked)return;
    viewport.scrollTop=0;introLocked=false;room.classList.remove('intro-running');gate.hidden=true;cue.hidden=false;syncScroll();
  });
  room.addEventListener('touchmove',e=>{if(introLocked&&e.cancelable)e.preventDefault();},{passive:false});
  document.addEventListener('keydown',e=>{if(active&&introLocked&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))e.preventDefault();},{capture:true});
  $('journey-start').addEventListener('click',begin);
  function setMode(value){
    if(document.querySelector('dialog[open]'))return;
    if(value&&!window.HYTEX_SCENE_READY){setToggleLabel(document.body.classList.contains('no-webgl')?'当前设备使用阅读版':'场景加载中');return;}
    stopTouchScroll();pageGesture.reset();active=value;api.state.interactive=value;toggle.setAttribute('aria-pressed',String(value));setToggleLabel(value?'阅读版本':'互动版本');cancelGesture();introLocked=false;room.classList.remove('intro-running');
    canvas.parentNode.setAttribute('aria-hidden',String(!value));
    if(value){savedScroll=scrollY;started=false;room.hidden=false;main.hidden=true;document.body.classList.add('interactive-mode');document.body.classList.remove('journey-started');room.classList.remove('started');gate.hidden=false;gate.classList.remove('leaving');cue.hidden=true;viewport.scrollTop=0;emit('spatial-interactive-mode',{active:true});updateChapter(0);const start=$('journey-start');start.disabled=false;start.focus({preventScroll:true});}
    else{queryView.setActive(false);room.hidden=true;main.hidden=false;document.body.classList.remove('interactive-mode','journey-started');hideLens();emit('spatial-interactive-mode',{active:false});window.scrollTo({top:savedScroll,behavior:'instant'});api.refreshChapter();toggle.focus({preventScroll:true});}
  }
  let entryBusy=false;
  const entryCover=node('div','interactive-entry-cover');entryCover.hidden=true;entryCover.setAttribute('aria-hidden','true');document.body.append(entryCover);
  toggle.addEventListener('click',async()=>{
    if(entryBusy)return;
    if(active||!window.HYTEX_SCENE_READY||matchMedia('(prefers-reduced-motion: reduce)').matches){setMode(!active);return;}
    if(document.querySelector('dialog[open]'))return;
    entryBusy=true;entryCover.hidden=false;
    const origin=toggle.getBoundingClientRect();
    const inset=`inset(${origin.top}px ${Math.max(0,innerWidth-origin.right)}px ${Math.max(0,innerHeight-origin.bottom)}px ${origin.left}px)`;
    const fade=entryCover.animate([{clipPath:inset,backgroundColor:getComputedStyle(toggle).backgroundColor},{clipPath:'inset(0px 0px 0px 0px)',backgroundColor:'#090909'}],{duration:720,easing:'cubic-bezier(.65,0,.35,1)',fill:'both'});
    let revealStart;
    const start=$('journey-start');
    try{
      await fade.finished;setMode(true);start.disabled=true;
      revealStart=start.animate([{opacity:0},{opacity:1}],{duration:340,easing:'ease-out',fill:'both'});
      entryCover.hidden=true;fade.cancel();
      await revealStart.finished;
    }catch{}finally{
      entryCover.hidden=true;fade.cancel();revealStart?.cancel();entryBusy=false;start.disabled=false;
      if(active&&!started)start.focus({preventScroll:true});
    }
  });$('room-panel-toggle').addEventListener('click',()=>reveal(false));
  function startHold(){if(current!==6||holdTimer||selection===eggIndex)return;gather=0;const t=performance.now();holdTimer=setInterval(()=>{gather=Math.min(1,(performance.now()-t)/1400);emit('exhibition-gather',{value:gather});if(gather>=1){stopHold();holdActivated=true;activate();}},35);}
  function stopHold(){if(holdTimer){clearInterval(holdTimer);holdTimer=null;}}
  document.addEventListener('exhibition-picked',e=>{if(!active)return;choose(e.detail.index,current!==6);if(current===6&&e.detail.hold)startHold();});
  document.addEventListener('exhibition-preview',e=>{selection=e.detail.index;renderContent();if(current===3&&!room.classList.contains('particle-arriving'))reveal(true);if(current===6)photoLabel.textContent=HYTEX_HOBBIES.photos[selection]?.caption||'彩蛋 · 视线光晕';});
  document.addEventListener('exhibition-complete',e=>{if(!active||e.detail.chapter!==current)return;if(current===2)showProjectInline(e.detail.index);else if(current===6)showDetail(true,e.detail.index);else if(current!==0&&current!==4&&current!==5)reveal(true);});
  // Vertical gestures turn pages; horizontal drags manipulate the current exhibit.
  room.addEventListener('pointerdown',e=>{
    if(!started||introLocked||e.button>0||e.target.closest('button,a,input,dialog')&&!e.target.closest('.career-word'))return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};suppressClick=false;holdActivated=false;
    if(e.pointerType==='mouse')viewport.setPointerCapture(e.pointerId);if(current===6)emit('exhibition-hit',{x:e.clientX,y:e.clientY,hold:true});
  });
  room.addEventListener('pointermove',e=>{
    if(!started)return;if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(Math.hypot(dx,dy)>7){suppressClick=true;stopHold();}
    if((!panelTouch||panelTouch.axis==='x')&&Math.abs(dx)>Math.abs(dy)&&(current===3||current===6)&&!e.target.closest('.room-inspector')){yaw+= (e.clientX-drag.x)*(current===3?.004:.012);emit('exhibition-view',{yaw,pitch,zoom});}
    drag.x=e.clientX;drag.y=e.clientY;
  });
  function release(e){
    if(drag&&suppressClick&&!holdActivated){if(current===3||current===6){emit('exhibition-snap');yaw=0;}if(current===4&&e.clientX-drag.startX>35)activate();if(current===5&&drag.startY-e.clientY>35)activate();}
    stopHold();drag=null;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  }
  room.addEventListener('pointerup',release);room.addEventListener('pointercancel',cancelGesture);viewport.addEventListener('lostpointercapture',()=>{if(drag)cancelGesture();});
  viewport.addEventListener('click',e=>{if(!started||e.target.closest('button,a,input'))return;if(suppressClick||holdActivated){suppressClick=false;holdActivated=false;return;}emit('exhibition-hit',{x:e.clientX,y:e.clientY});});
  viewport.addEventListener('keydown',e=>{if(e.target!==viewport||!started||introLocked||e.repeat)return;if(['ArrowDown','PageDown','ArrowUp','PageUp','Home','End'].includes(e.key)){e.preventDefault();navigate(e.key==='Home'?-current:e.key==='End'?scenes.length-1-current:e.key==='ArrowDown'||e.key==='PageDown'?1:-1);return;}if(e.key==='Enter'||e.key===' '){if([2,4,5,6].includes(current)){e.preventDefault();if(current===6&&selection!==eggIndex)startHold();else activate();}}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){if(current===3){e.preventDefault();choose(Math.max(0,Math.min(RESUME.experience.length-1,selection+(e.key==='ArrowRight'?-1:1))));}else if(current===6){e.preventDefault();const count=HYTEX_HOBBIES.photos.length+1;choose((selection+(e.key==='ArrowRight'?1:-1)+count)%count);}}});
  viewport.addEventListener('keyup',()=>{if(gather<1)stopHold();});
  function cancelGesture(){const id=drag?.id;drag=null;stopHold();holdActivated=false;suppressClick=true;gather=0;emit('exhibition-gather',{value:0});emit('exhibition-cancel');if(id!==undefined&&viewport.hasPointerCapture(id))viewport.releasePointerCapture(id);}
  window.addEventListener('blur',cancelGesture);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelGesture();});
  document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'&&!document.querySelector('dialog[open]')){if(!inspector.hidden)reveal(false);else setMode(false);}});
  document.addEventListener('spatial-scene-ready',()=>{if(!active)setToggleLabel('互动版本');});document.addEventListener('spatial-renderer-fallback',()=>{if(active)setMode(false);setToggleLabel('当前设备使用阅读版');});
  window.HYTEX_ROOM={setMode,begin,activate,navigate,canNavigate,get state(){return {active,started,introLocked,current,selection,gather,query:queryView.state,scroll:viewport.scrollTop};}};
})();
