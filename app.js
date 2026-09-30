'use strict';
const data = window.RESUME;
// All resume text is local data; construct text nodes rather than injecting HTML.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function tags(values) {
  const root = el('div', 'tags');
  values.forEach(value => root.append(el('span', '', value)));
  return root;
}
const projectGrid = document.querySelector('#project-grid');
const projectDialog = document.querySelector('#project-dialog');
let projectOpener = null;
function showProject(project, opener) {
  projectOpener = opener;
  document.querySelector('#dialog-category').textContent = project.label;
  document.querySelector('#dialog-title').textContent = project.title;
  document.querySelector('#dialog-period').textContent = project.period;
  document.querySelector('#dialog-summary').textContent = project.summary;
  document.querySelector('#dialog-tags').replaceChildren(tags(project.tags));
  document.querySelector('#dialog-work').replaceChildren(...project.details.map(detail => el('li', '', detail)));
  projectDialog.showModal();
  projectDialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
  document.dispatchEvent(new CustomEvent('project-detail-state', { detail: true }));
}
projectDialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  document.dispatchEvent(new CustomEvent('project-detail-state', { detail: false }));
  if (projectOpener?.isConnected) projectOpener.focus({ preventScroll: true });
});
projectDialog.addEventListener('click', event => {
  if (event.target !== projectDialog) return;
  const rect = projectDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) projectDialog.close();
});
function renderProjects(filter = 'all') {
  const projects = data.projects.filter(project => filter === 'all' || project.category === filter);
  projectGrid.replaceChildren();
  projects.forEach(project => {
    const card = el('article', `project-card${project.featured ? ' featured' : ''}`);
    const top = el('div', 'card-top');
    top.append(el('span', 'project-label', project.label), el('span', 'card-number', `${project.number} ↗`));
    const details = el('button', 'project-view', '查看项目详情 ↗');
    details.type = 'button';
    details.setAttribute('aria-haspopup', 'dialog');
    details.setAttribute('aria-label', `查看${project.title}的项目详情`);
    details.addEventListener('click', () => showProject(project, details));
    card.append(top, el('h3', '', project.title), el('p', 'project-period', project.period), el('p', 'project-summary', project.cardDescription), details);
    projectGrid.append(card);
  });
  document.querySelector('#project-count').textContent = `${projects.length} 个项目`;
}
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    renderProjects(button.dataset.filter);
  });
});
renderProjects();
data.experience.forEach(job => {
  const row = el('article', 'timeline-item');
  const content = el('div');
  content.append(el('h3', '', job.company), el('p', 'timeline-role', job.role), el('p', 'timeline-description', job.description));
  row.append(el('p', 'timeline-date', job.period), content);
  document.querySelector('#timeline').append(row);
});

document.querySelector('#copy-email').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText('68449317@qq.com');
    status.textContent = '邮箱已复制。';
  } catch {
    status.textContent = '请选中邮箱复制，或点击邮箱直接发送邮件。';
  }
});
