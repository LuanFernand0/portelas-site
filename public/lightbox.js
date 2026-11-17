/* Lightbox compartilhado (galeria e mostruário): setas, ESC, swipe e foco acessível */
window.Lightbox = (function () {
  let items = [], i = 0, el, last;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e8e2d8"/><text x="200" y="155" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#8f6f22">Imagem indisponível</text></svg>');
  document.addEventListener('error', e => { const t = e.target; if (t.tagName === 'IMG' && t.src !== FALLBACK) t.src = FALLBACK; }, true);

  function build() {
    el = document.createElement('div');
    el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Visualizador de imagens');
    el.innerHTML = '<button class="lb-x" aria-label="Fechar">&#10005;</button><button class="lb-p" aria-label="Anterior">&#8249;</button><img alt=""><button class="lb-n" aria-label="Próxima">&#8250;</button><div class="lb-cap"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', e => {
      const c = e.target.classList;
      if (e.target === el || c.contains('lb-x')) close();
      else if (c.contains('lb-p')) go(-1);
      else if (c.contains('lb-n')) go(1);
    });
    document.addEventListener('keydown', e => {
      if (!el.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
    let x0 = null;
    el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => { if (x0 === null) return; const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); x0 = null; });
  }
  function show() {
    const it = items[i], img = el.querySelector('img');
    img.src = it.src; img.alt = it.title || '';
    el.querySelector('.lb-cap').innerHTML = esc(it.title) + '<small>' + (it.sub ? esc(it.sub) + '. ' : '') + (i + 1) + ' de ' + items.length + '</small>';
    el.querySelector('.lb-p').style.display = el.querySelector('.lb-n').style.display = items.length > 1 ? '' : 'none';
  }
  function go(d) { i = (i + d + items.length) % items.length; show(); }
  function open(list, idx) {
    if (!el) build();
    items = list; i = idx; last = document.activeElement; show();
    el.classList.add('open'); document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => el.classList.add('show'));
    el.querySelector('.lb-x').focus();
  }
  function close() {
    el.classList.remove('show'); document.body.style.overflow = '';
    setTimeout(() => el.classList.remove('open'), 250);
    last && last.focus && last.focus();
  }
  return { open, esc, FALLBACK };
})();