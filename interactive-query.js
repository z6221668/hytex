'use strict';
window.createQueryExhibit = function(parent) {
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  const root=el('section','query-exhibit');root.hidden=true;root.setAttribute('aria-label','parallel_query 执行演示');
  const diagram=el('div','query-diagram'),head=el('div','query-diagram-head');
  head.append(el('span','','01 / SUBMIT'),el('span','','02 / EXECUTE'),el('span','','03 / JOIN'));
  diagram.append(head);
  const names=['用户','订单','账户'],identifiers=['user','orders','account'];
  const rows=names.map((name,i)=>{
    const row=el('div','query-lane'),label=el('span','query-task',`${String(i+1).padStart(2,'0')}  ${name}查询`),track=el('div','query-track'),fill=el('i','query-fill'),packet=el('i','query-packet'),status=el('span','query-result','等待提交');
    track.append(fill,packet);row.append(label,track,status);diagram.append(row);return {row,fill,packet,status};
  });
  const join=el('div','query-join'),collected=el('div','query-collected');
  const receipts=identifiers.map(name=>{const n=el('span','',name);collected.append(n);return n;});
  const output=el('strong','query-output','等待结果');join.append(collected,el('span','query-join-arrow','→'),output);diagram.append(join);
  const foot=el('p','query-footnote','执行过程示意 · 各查询独立完成，全部结果就绪后组合返回。');diagram.append(foot);
  const code=el('div','query-source'),caption=el('p','query-code-caption','JAVA 21 / 示例调用'),pre=el('pre','');
  const lines=['var user = tasks.submit(this::queryUser);','var orders = tasks.submit(this::queryOrders);','var account = tasks.submit(this::queryAccount);','','return combine(','  tasks.await(user),','  tasks.await(orders),','  tasks.await(account)',');'].map((text,i)=>{const line=el('span','query-code-line');line.append(el('i','',String(i+1).padStart(2,'0')),el('code','',text||' '));pre.append(line);return line;});
  code.append(caption,pre);
  const controls=el('div','query-controls'),play=el('button','','暂停'),replayButton=el('button','','重新演示'),link=el('a','','GitHub ↗'),state=el('p','query-status','准备提交');
  play.type=replayButton.type='button';link.href='https://github.com/z6221668/parallel_query';link.target='_blank';link.rel='noopener noreferrer';state.setAttribute('aria-live','polite');controls.append(play,replayButton,link);
  root.append(diagram,code,state,controls);parent.append(root);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,running=false,frame=0,last=0,elapsed=0,globalPaused=false,phase=-1;
  const clamp=n=>Math.max(0,Math.min(1,n));
  function paint(){
    const done=elapsed>=4.8,current=elapsed<.6?0:elapsed<4?1:done?3:2;
    if(current!==phase){phase=current;state.textContent=['提交三个独立查询','各任务独立执行，先完成的结果保留等待','Future 结果已就绪，组合响应','返回组合后的结果'][current];root.dataset.phase=current;}
    rows.forEach(({row,fill,packet,status},i)=>{
      const progress=clamp((elapsed-.6)/[2.2,3.4,2.7][i]),complete=progress===1;
      fill.style.transform=`scaleX(${progress})`;packet.style.left=`${progress*100}%`;packet.style.opacity=elapsed>=.6&&!complete?'1':'0';
      row.classList.toggle('complete',complete);status.textContent=complete?'结果就绪':elapsed>=.6?'执行中':'等待提交';receipts[i].classList.toggle('received',complete);
      lines[i].classList.toggle('executing',current===0);lines[i+5].classList.toggle('executing',complete&&current===2);
    });
    output.classList.toggle('ready',done);output.textContent=done?'组合响应':current===2?'组合中':'等待结果';lines[4].classList.toggle('executing',done);lines[8].classList.toggle('executing',done);
    play.textContent=done?'播放':running?'暂停':'继续';play.setAttribute('aria-pressed',String(running));
  }
  function cancel(){cancelAnimationFrame(frame);frame=0;last=0;}
  function tick(now){frame=0;if(!active||!running||globalPaused||document.hidden)return;if(last)elapsed+=Math.min(.05,(now-last)/1000);last=now;if(elapsed>=5.6){elapsed=5.6;running=false;}paint();if(running)frame=requestAnimationFrame(tick);}
  function schedule(){cancel();if(active&&running&&!globalPaused&&!document.hidden)frame=requestAnimationFrame(tick);}
  function replay(){elapsed=reduced.matches?5.6:0;running=!reduced.matches;phase=-1;paint();schedule();}
  play.addEventListener('click',()=>{if(elapsed>=5.6){replay();return;}running=!running;paint();schedule();});replayButton.addEventListener('click',replay);
  document.addEventListener('visibilitychange',schedule);
  document.addEventListener('spatial-pause',e=>{globalPaused=e.detail;schedule();});
  reduced.addEventListener('change',()=>{if(active)replay();});
  return {replay,setActive(value,defer=false){active=value;root.hidden=!value;if(value&&!defer)replay();else if(value){elapsed=0;running=false;phase=-1;cancel();paint();}else{running=false;cancel();}},get state(){return {active,running,frame,elapsed};}};
};
