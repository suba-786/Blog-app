// Data lives in localStorage for now. A backend replaces this in a later module.
const get = (k, d) => JSON.parse(localStorage.getItem(k) || d);
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const $ = id => document.getElementById(id);
const user = get('user', 'null');
const page = document.body.dataset.page;

function show(el, text, ok) { el.textContent = text; el.classList.toggle('ok', !!ok); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

const dlg = document.createElement('dialog'); document.body.append(dlg);
dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('close')) dlg.close(); });
function openPost(p) {
  dlg.innerHTML = `<button class="close" aria-label="Close">×</button><span class="tag ${esc(p.category).toLowerCase()}">${esc(p.category)}</span>
    <h2>${esc(p.title)}</h2><small>${esc(p.author)} · ${esc(p.date)}</small><div class="body">${esc(p.content).replace(/\n/g, '<br>')}</div>`;
  dlg.showModal();
}
function renderPosts(list, box, mine) {
  if (!list.length) { box.innerHTML = '<div class="empty"><h3>Nothing here yet</h3><p>Your first post is a few lines away.</p><a class="btn" href="create-blog.html">Write a post</a></div>'; return; }
  box.innerHTML = list.map(p => `<article class="post ${esc(p.category).toLowerCase()}" data-id="${p.id}" tabindex="0" role="button" aria-label="Read ${esc(p.title)}">
    <span class="tag">${esc(p.category)}</span><h3>${esc(p.title)}</h3>
    <p>${esc(p.content.slice(0, 110))}${p.content.length > 110 ? '…' : ''}</p>
    <div class="meta"><span>${esc(p.author)} · ${esc(p.date)} · ${Math.max(1, Math.round(p.content.split(/\s+/).length / 200))} min read</span>
    ${mine ? `<button class="del" data-del="${p.id}">Delete</button>` : ''}</div></article>`).join('');
  const open = el => { const a = el.closest('.post'); if (a) openPost(list.find(p => p.id == a.dataset.id)); };
  box.onclick = e => {
    const d = e.target.closest('[data-del]');
    if (!d) return open(e.target);
    if (confirm('Delete this post? This cannot be undone.')) { set('blogs', get('blogs', '[]').filter(b => b.id != d.dataset.del)); location.reload(); }
  };
  box.onkeydown = e => { if (e.key === 'Enter' && e.target.classList.contains('post')) open(e.target); };
}

// give older posts an id
set('blogs', get('blogs', '[]').map((b, i) => b.id ? b : { ...b, id: Date.now() + i }));

// nav: highlight current page, swap auth links
const file = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('nav a').forEach(a => { if (a.getAttribute('href') === file) a.setAttribute('aria-current', 'page'); });
const lg = document.querySelector('nav a[href="login.html"]'), rg = document.querySelector('nav a[href="register.html"]');
if (user) {
  lg.style.display = 'none'; rg.textContent = 'Log out'; rg.href = '#';
  rg.onclick = e => { e.preventDefault(); localStorage.removeItem('user'); location.href = 'index.html'; };
} else {
  document.querySelectorAll('nav a[href="dashboard.html"],nav a[href="create-blog.html"]').forEach(a => a.style.display = 'none');
}

// show/hide password
document.querySelectorAll('input[type=password]').forEach(i => {
  const w = document.createElement('div'); w.className = 'pw'; i.before(w); w.append(i);
  const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Show'; b.setAttribute('aria-label', 'Show or hide password');
  b.onclick = () => { const h = i.type === 'password'; i.type = h ? 'text' : 'password'; b.textContent = h ? 'Hide' : 'Show'; };
  w.append(b);
});

const sample = [{ id: 's1', title: 'Getting started with HTML', category: 'Tech', author: 'Inkwell team', date: '1 Jan 2026', content: 'Every web page starts with a few tags. Learn the ones you will use every day.' }];

if (page === 'home') renderPosts([...get('blogs', '[]'), ...sample], $('posts'), false);

if (page === 'register') $('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('name').value.trim(), email = $('email').value.trim().toLowerCase(), pw = $('password').value;
  if (!name || !email.includes('@')) return show($('msg'), 'Enter your name and a valid email.');
  if (pw.length < 6) return show($('msg'), 'Password must be at least 6 characters.');
  if (pw !== $('confirm').value) return show($('msg'), 'Passwords do not match.');
  const users = get('users', '[]');
  if (users.some(u => u.email === email)) return show($('msg'), 'That email is already registered. Log in instead.');
  users.push({ name, email, pw }); set('users', users);
  show($('msg'), 'Account created. Redirecting to log in…', true);
  setTimeout(() => location.href = 'login.html', 900);
});

if (page === 'login') $('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = $('email').value.trim().toLowerCase(), pw = $('password').value;
  const u = get('users', '[]').find(u => u.email === email && u.pw === pw);
  if (!u) return show($('msg'), 'Email or password is incorrect.');
  set('user', { name: u.name, email: u.email }); location.href = 'dashboard.html';
});

if (page === 'dashboard' || page === 'create') {
  if (!user) location.href = 'login.html';
}

if (page === 'dashboard' && user) {
  const mine = get('blogs', '[]').filter(b => b.email === user.email);
  $('hello').textContent = `Hi, ${user.name}`;
  $('count').textContent = mine.length;
  renderPosts(mine, $('posts'), true);
  $('logout').addEventListener('click', () => { localStorage.removeItem('user'); location.href = 'index.html'; });
}

if (page === 'create' && user) $('blogForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = $('title').value.trim(), content = $('content').value.trim();
  if (!title || !content) return show($('msg'), 'Add a title and some content.');
  const blogs = get('blogs', '[]');
  blogs.unshift({ id: Date.now(), title, content, category: $('category').value, author: user.name, email: user.email,
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) });
  set('blogs', blogs);
  show($('msg'), 'Published. Opening your dashboard…', true);
  setTimeout(() => location.href = 'dashboard.html', 800);
});
