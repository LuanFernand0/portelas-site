/* Importação em lote do mostruário: selecione todas as imagens e envie de uma vez */
(function () {
  const $ = id => document.getElementById(id);
  const input = $('lote-files');
  if (!input) return;
  const MIN = ['de', 'do', 'da', 'dos', 'das', 'e'];
  const FIX = { mairnho: 'marinho', madeias: 'madeiras', confort: 'comfort', gurarapes: 'guararapes' };
  const ACENTOS = { Petroleo: 'Petróleo', Freijo: 'Freijó', Araucaria: 'Araucária', Sao: 'São', Ambar: 'Âmbar', Niquel: 'Níquel', Cromio: 'Crômio', Onix: 'Ônix', Ardosia: 'Ardósia', Sepia: 'Sépia', Nordico: 'Nórdico', Acores: 'Açores' };
  const LIN = [[/madeiras_geom/, 'Madeiras Geométricas'], [/madeiras?_(do_)?brasil/, 'Madeiras do Brasil'], [/madeiras?_(do_)?mundo/, 'Madeiras do Mundo']];
  // Conserta nomes de arquivo com acento quebrado (ex.: "Geom├®tricas" vira "Geométricas")
  const T850 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐';
  const repara = s => s.replace(/├(.)/g, (m, c) => { const i = T850.indexOf(c); return i < 0 ? m : String.fromCharCode(0xC0 + i); })
    .replace(/Ã([\u0080-\u00BF])/g, (m, c) => String.fromCharCode(0xC0 + c.charCodeAt(0) - 0x80));
  const canon = l => { const k = sem(l).toLowerCase().replace(/\s+/g, '_'); for (const [rx, nm] of LIN) if (rx.test(k)) return nm; return l; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sem = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const chave = s => sem(s).toLowerCase().trim();
  const slug = s => sem(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'chapa';
  const titulo = s => s.trim().split(/[\s_\-]+/).filter(Boolean)
    .map((w, i) => i && MIN.includes(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .map(w => ACENTOS[w] || w).join(' ');
  const limpa = s => s.toLowerCase().split(/[\s_]+/).map(w => FIX[w] || w).join('_');

  // Descobre nome e linha pelo nome do arquivo.
  // Aceita "Nome - Linha.jpg" e o formato antigo "nome_linha_colors_guararapes.jpg".
  function parse(fn) {
    const b0 = repara(fn).replace(/\.[^.]+$/, '').normalize('NFC');
    const i = b0.lastIndexOf(' - ');
    if (i > 0) return { nome: b0.slice(0, i).trim(), linha: canon(b0.slice(i + 3).trim()) };
    const b = limpa(b0), m = b.match(/^(.*?)_linha_(.*)$/);
    if (!m) return { nome: titulo(b), linha: '' };
    const l = m[2].replace(/_(guararapes|duratex)$/, '');
    for (const [rx, nm] of LIN) if (rx.test(sem(l))) return { nome: titulo(m[1]), linha: nm };
    return { nome: titulo(m[1]), linha: titulo(l) };
  }
  window.__parseChapa = parse;

  let rows = [], enviando = false;
  const body = $('lote-body'), lista = $('lote-lista'), btn = $('lote-enviar'), status = $('lote-status'), prog = $('lote-prog'), bar = $('lote-bar');

  function render() {
    lista.style.display = rows.length ? 'block' : 'none';
    btn.disabled = enviando || !rows.length;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar ' + (rows.length || '') + ' chapa' + (rows.length === 1 ? '' : 's');
    status.textContent = rows.length && !enviando ? rows.length + ' prontas para enviar' : status.textContent;
    body.innerHTML = rows.map((r, n) => `<tr data-i="${n}"><td><img class="lote-thumb" src="${r.url}" alt=""></td>
      <td><input class="field" data-k="nome" value="${esc(r.nome)}" aria-label="Nome"></td>
      <td><input class="field" data-k="linha" value="${esc(r.linha)}" aria-label="Linha"></td>
      <td class="lote-st" id="lote-st-${n}">${esc(r.st || '')}</td>
      <td><button type="button" class="icon-btn danger" data-del title="Remover da lista"><i class="fas fa-xmark"></i></button></td></tr>`).join('');
  }
  function add(files) {
    [...files].forEach(f => {
      if (rows.some(r => r.file.name === f.name && r.file.size === f.size)) return;
      const p = parse(f.name);
      rows.push({ file: f, nome: p.nome, linha: p.linha, url: URL.createObjectURL(f), st: '' });
    });
    rows.sort((a, b) => a.linha.localeCompare(b.linha) || a.nome.localeCompare(b.nome));
    render();
  }
  async function reduzir(file, max = 1000) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  }

  async function enviar() {
    if (enviando || !rows.length) return;
    const fab = $('lote-fab').value.trim();
    if (!fab) { alert('Informe a fabricante.'); return; }
    if (rows.some(r => !r.nome.trim() || !r.linha.trim())) { alert('Preencha o nome e a linha de todas as chapas.'); return; }
    status.style.color = '';
    const falha = msg => { status.textContent = msg; status.style.color = '#c0392b'; alert(msg); };
    let existentes = [];
    try {
      const r = await fetch(API_URL + '/mostruario/listar');
      if (!r.ok) throw new Error('o servidor respondeu ' + r.status);
      existentes = await r.json();
      if (!Array.isArray(existentes)) throw new Error('resposta inesperada');
    } catch (e) {
      falha('Erro: o servidor não tem a rota /api/mostruario/listar (' + e.message + '). Nada foi enviado. O backend precisa ter as rotas do mostruário e ser reiniciado.');
      return;
    }
    const subst = $('lote-subst').checked;
    rows.forEach(r => {
      r.velhas = existentes.filter(e => chave(e.fabricante || '') === chave(fab) && chave(parse((e.nome || '') + '.x').nome) === chave(r.nome)).map(e => e.id);
      r.pular = !subst && r.velhas.length > 0;
      if (r.pular) r.st = 'já existe';
    });
    const fila = rows.filter(r => !r.pular), jaExistem = fila.filter(r => r.velhas.length).length;
    if (!fila.length) { render(); alert('Todas já estão cadastradas.'); return; }
    if (!confirm('Enviar ' + fila.length + ' chapas de ' + fab + '?' + (jaExistem ? '\n' + jaExistem + ' já estão cadastradas e serão substituídas.' : ''))) return;

    enviando = true; btn.disabled = true; prog.style.display = 'block'; bar.style.width = '0';
    let feitos = 0, erros = 0, idx = 0, abortar = false;
    const um = async r => {
      const n = rows.indexOf(r), cel = () => $('lote-st-' + n);
      try {
        if (cel()) cel().textContent = 'enviando...';
        const blob = await reduzir(r.file).catch(() => { throw new Error('formato não suportado (use JPG ou PNG)'); });
        const fd = new FormData();
        fd.append('nome', r.nome.trim()); fd.append('fabricante', fab); fd.append('categoria', r.linha.trim());
        fd.append('foto', blob, slug(r.nome) + '_' + slug(fab) + '.jpg');
        const res = await fetch(API_URL + '/mostruario/upload', { method: 'POST', body: fd });
        if (res.status === 404) { abortar = true; throw new Error('rota /api/mostruario/upload não existe (404)'); }
        if (!res.ok) throw new Error('servidor recusou (' + res.status + ')');
        if (subst) for (const id of r.velhas) await fetch(`${API_URL}/mostruario/deletar/${id}`, { method: 'DELETE' });
        r.st = 'ok';
      } catch (e) { r.st = 'erro: ' + e.message; erros++; }
      feitos++; bar.style.width = (feitos / fila.length * 100) + '%'; status.textContent = feitos + ' de ' + fila.length;
      if (cel()) cel().textContent = r.st;
    };
    await Promise.all([0, 1, 2].map(async () => { while (idx < fila.length && !abortar) await um(fila[idx++]); }));
    rows = rows.filter(r => r.st !== 'ok'); enviando = false;
    status.textContent = (fila.length - erros) + ' enviadas' + (erros ? ', ' + erros + ' com erro (veja a lista)' : '');
    render(); setTimeout(() => { prog.style.display = 'none'; }, 1500);
    if (abortar) { falha('Envio interrompido: o servidor não tem a rota de upload do mostruário (404). Reinicie o backend ou adicione as rotas.'); return; }
    alert(erros ? (fila.length - erros) + ' chapas enviadas. ' + erros + ' deram erro.' : 'Pronto! ' + fila.length + ' chapas enviadas.');
    if (typeof carregarMostruarioAdmin === 'function') carregarMostruarioAdmin();
  }

  input.addEventListener('change', () => { add(input.files); input.value = ''; });
  body.addEventListener('input', e => { const tr = e.target.closest('tr'); if (tr && e.target.dataset.k) rows[+tr.dataset.i][e.target.dataset.k] = e.target.value; });
  body.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b && !enviando) { rows.splice(+b.closest('tr').dataset.i, 1); render(); } });
  btn.addEventListener('click', enviar);
  $('lote-limpar').addEventListener('click', () => { if (!enviando) { rows = []; status.textContent = ''; render(); } });
})();