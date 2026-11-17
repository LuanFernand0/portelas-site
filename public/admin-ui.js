/* Camada de interface do painel: avisos (toast), estatísticas, arrastar-e-soltar, filtros */
(function () {
  const $ = id => document.getElementById(id);
  const root = API_URL.replace(/\/api$/, '');

  // 1) Avisos discretos no lugar de alert()
  window.alert = msg => {
    const t = document.createElement('div');
    t.className = 'toast' + (/erro|não foi|inválid|incorret|verifique/i.test(msg) ? ' err' : '');
    t.textContent = msg; $('toasts')?.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  };

  // 2) Título da barra superior e menu mobile
  const nomes = { dashboard: 'Visão geral', clientes: 'Clientes', orcamentos: 'Orçamentos', galeria: 'Galeria do site', mostruario: 'Mostruário de cores' };
  const mudar = window.mudarAba;
  window.mudarAba = id => { mudar(id); $('topbar-title').textContent = nomes[id] || ''; $('sidebar').classList.remove('open'); window.scrollTo(0, 0); };
  $('menu-btn')?.addEventListener('click', e => { e.stopPropagation(); $('sidebar').classList.toggle('open'); });
  document.addEventListener('click', e => {
    const sb = $('sidebar');
    if (sb?.classList.contains('open') && !sb.contains(e.target)) sb.classList.remove('open');
  });

  // 3) Estatísticas do dashboard
  async function stats() {
    const n = async p => { try { const r = await fetch(API_URL + p); return r.ok ? (await r.json()).length : '-'; } catch { return '-'; } };
    $('st-clientes').textContent = await n('/clientes/listar');
    $('st-orcamentos').textContent = await n('/orcamentos/listar');
    $('st-fotos').textContent = await n('/galeria/listar');
    $('st-amostras').textContent = await n('/mostruario/listar');
  }
  stats();
  ['admin-photo-grid', 'admin-mostruario-grid', 'tabela-clientes-body', 'tabela-orcamentos-body'].forEach(id => {
    const el = $(id); if (!el) return; let t;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(stats, 600); }).observe(el, { childList: true });
  });

  // 4) Arrastar e soltar + miniatura
  document.querySelectorAll('.file-upload-wrapper').forEach(box => {
    const input = box.querySelector('input[type=file]'), thumb = box.querySelector('.drop-thumb');
    const mostrar = () => { const f = input.files[0]; if (f && thumb) { thumb.src = URL.createObjectURL(f); thumb.style.display = 'block'; } };
    input.addEventListener('change', mostrar);
    ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove('drag'); }));
    box.addEventListener('drop', e => {
      if (!e.dataTransfer.files.length) return;
      input.files = e.dataTransfer.files; input.dispatchEvent(new Event('change'));
      input.onchange && input.onchange.call(input);
    });
  });
  document.querySelectorAll('form').forEach(f => f.addEventListener('reset', () => document.querySelectorAll('.drop-thumb').forEach(t => { t.style.display = 'none'; })));

  // 5) Busca e filtro nas grades
  function filtrar(gridId) {
    const q = document.querySelector(`input[data-filtro="${gridId}"]`)?.value.toLowerCase() || '';
    const f = document.querySelector(`select[data-filtro="${gridId}"]`)?.value.toLowerCase() || '';
    document.querySelectorAll(`#${gridId} .admin-photo-item`).forEach(it => {
      const txt = it.textContent.toLowerCase();
      it.style.display = (!q || txt.includes(q)) && (!f || txt.includes(f)) ? '' : 'none';
    });
  }
  document.querySelectorAll('[data-filtro]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => filtrar(el.dataset.filtro)));
  window.imgUrl = u => !u ? '' : (/^https?:/.test(u) ? u : root + (u.startsWith('/') ? '' : '/') + u);
})();