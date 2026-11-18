// Endereço do servidor: no computador ou pelo Wi-Fi (porta do Astro) é a porta 8080 do mesmo endereço; online é o próprio site.
const API_BASE = (location.port && !['80', '443', '8080'].includes(location.port)) ? location.protocol + '//' + location.hostname + ':8080' : '';
const API_URL = API_BASE + '/api';
const imgUrl = u => !u ? '' : (/^https?:/.test(u) ? u : API_BASE + (u.startsWith('/') ? '' : '/') + u);

// --- 0. LOGIN ---
// A senha é conferida no servidor. Quem entra recebe um token, enviado em todo pedido do painel.
const CHAVE_TOKEN = 'portelas_token';
const lerToken = () => { try { return localStorage.getItem(CHAVE_TOKEN); } catch (e) { return null; } };
const gravarToken = t => { try { t ? localStorage.setItem(CHAVE_TOKEN, t) : localStorage.removeItem(CHAVE_TOKEN); } catch (e) {} };
const BASE = window.BASE || '';
const naTelaDeLogin = location.pathname.replace(/\/$/, '') === BASE + '/login';

const fetchOriginal = window.fetch.bind(window);
window.fetch = async (url, opcoes = {}) => {
    const endereco = String(url);
    const doPainel = endereco.startsWith(API_URL);
    if (doPainel && lerToken()) {
        const cabecalhos = new Headers(opcoes.headers || {});
        cabecalhos.set('Authorization', 'Bearer ' + lerToken());
        opcoes = { ...opcoes, headers: cabecalhos };
    }
    const resposta = await fetchOriginal(url, opcoes);
    if (doPainel && resposta.status === 401 && !endereco.includes('/auth/') && !naTelaDeLogin) {
        gravarToken(null);
        location.href = BASE + '/login';
    }
    return resposta;
};

if (!lerToken() && !naTelaDeLogin) {
    location.href = BASE + '/login';
}

document.getElementById('login-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const aviso = document.getElementById('login-erro');
    const botao = this.querySelector('button[type="submit"]');
    const mostrar = msg => { if (aviso) { aviso.textContent = msg; aviso.hidden = false; } };
    if (aviso) aviso.hidden = true;
    if (botao) { botao.disabled = true; botao.textContent = 'Entrando...'; }

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario: document.getElementById('usuario').value.trim(),
                senha: document.getElementById('senha').value
            })
        });
        if (res.ok) {
            gravarToken((await res.json()).token);
            location.href = BASE + '/admin';
            return;
        }
        mostrar(res.status === 401 ? 'Usuário ou senha incorretos.' : 'O servidor respondeu com erro (' + res.status + '). Tente de novo.');
    } catch (erro) {
        mostrar('Não foi possível falar com o servidor. Confira se ele está ligado.');
    } finally {
        if (botao) { botao.disabled = false; botao.textContent = 'Entrar no painel'; }
    }
});

async function efetuarLogout() {
    try { await fetch(`${API_URL}/auth/sair`, { method: 'POST' }); } catch (e) {}
    gravarToken(null);
    location.href = BASE + '/login';
}

// Reduz fotos grandes antes de enviar (envio mais rápido e site mais leve).
async function reduzirFoto(arquivo, ladoMaximo = 2000) {
    if (!arquivo || !/^image\/(jpeg|png|webp)$/.test(arquivo.type)) return arquivo;
    try {
        const bmp = await createImageBitmap(arquivo);
        const escala = Math.min(1, ladoMaximo / Math.max(bmp.width, bmp.height));
        if (escala === 1 && arquivo.size < 1.5 * 1024 * 1024) return arquivo;
        const tela = document.createElement('canvas');
        tela.width = Math.round(bmp.width * escala);
        tela.height = Math.round(bmp.height * escala);
        const ctx = tela.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, tela.width, tela.height);
        ctx.drawImage(bmp, 0, 0, tela.width, tela.height);
        const blob = await new Promise(ok => tela.toBlob(ok, 'image/jpeg', 0.85));
        if (!blob) return arquivo;
        return new File([blob], arquivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch (e) {
        return arquivo;
    }
}

// --- 1. NAVEGAÇÃO DE ABAS ---
function mudarAba(abaId) {
    const abas = ['dashboard', 'clientes', 'orcamentos', 'galeria', 'mostruario'];
    
    abas.forEach(aba => {
        const elAba = document.getElementById(`aba-${aba}`);
        const elMenu = document.getElementById(`menu-${aba}`);
        if (elAba) elAba.style.display = (aba === abaId) ? 'block' : 'none';
        if (elMenu) elMenu.classList.toggle('active', aba === abaId);
    });

    if (abaId === 'galeria') {
        carregarFotosAdmin();
    } else if (abaId === 'mostruario') {
        carregarMostruarioAdmin();
    }
}

// --- 2. CARREGAR DADOS (CLIENTES E ORÇAMENTOS) ---
async function carregarDadosDoBanco() {
    try {
        const resClientes = await fetch(`${API_URL}/clientes/listar`);
        if (resClientes.ok) {
            const clientes = await resClientes.json();
            const selectPdf = document.getElementById('nome-cliente');
            const tabelaClientes = document.getElementById('tabela-clientes-body');
            
            if (selectPdf) selectPdf.innerHTML = '<option value="" disabled selected>Selecione um cliente...</option>';
            if (tabelaClientes) tabelaClientes.innerHTML = '';

            clientes.forEach(c => {
                if (selectPdf) selectPdf.appendChild(new Option(c.nome, c.nome));
                if (tabelaClientes) {
                    const end = (c.endereco && c.endereco !== 'null') ? c.endereco : '-';
                    tabelaClientes.innerHTML += `
                        <tr>
                            <td>#${c.id}</td>
                            <td><strong>${c.nome}</strong></td>
                            <td>${c.telefone}</td>
                            <td>${end}</td>
                            <td>
                                <button onclick="excluirCliente(${c.id})" class="icon-btn danger" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>`;
                }
            });
        }
    } catch (e) { 
        console.error("Erro ao carregar clientes", e); 
    }

    try {
        const resOrc = await fetch(`${API_URL}/orcamentos/listar`);
        if (resOrc.ok) {
            const orcamentos = await resOrc.json();
            const tabelaOrc = document.getElementById('tabela-orcamentos-body');
            if (tabelaOrc) {
                tabelaOrc.innerHTML = '';
                orcamentos.forEach(o => {
                    tabelaOrc.innerHTML += `
                        <tr>
                            <td>#${o.id}</td>
                            <td>${o.data}</td>
                            <td><strong>${o.cliente}</strong></td>
                            <td>${o.servicosResumo}</td>
                            <td style="color:#1e8a4c;font-weight:700">R$ ${o.valorTotal}</td>
                            <td>
                                <button onclick="baixarOrcamento(${o.id})" class="icon-btn pdf" title="Baixar PDF">
                                    <i class="fas fa-file-pdf"></i>
                                </button>
                                <button onclick="excluirOrcamento(${o.id})" class="icon-btn danger" title="Excluir Orçamento">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>`;
                });
            }
        }
    } catch (e) { 
        console.error("Erro ao carregar orçamentos", e); 
    }
}

if (!naTelaDeLogin) {
    document.addEventListener('DOMContentLoaded', carregarDadosDoBanco);
}

// --- 2.1. BAIXAR ORÇAMENTO HISTÓRICO ---
async function baixarOrcamento(id) {
    try {
        const res = await fetch(`${API_URL}/orcamentos/download/${id}`);
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Orcamento_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } else {
            alert("Não foi possível baixar o PDF deste orçamento.");
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão ao baixar o PDF.");
    }
}

// --- 3. EXCLUIR CLIENTE ---
async function excluirCliente(id) {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
        try {
            const res = await fetch(`${API_URL}/clientes/excluir/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Cliente excluído com sucesso!");
                carregarDadosDoBanco();
            } else {
                const msg = await res.text();
                alert("Erro ao excluir: " + msg);
            }
        } catch (e) {
            alert("Erro de conexão ao tentar excluir.");
        }
    }
}

// --- 3.1. EXCLUIR ORÇAMENTO ---
async function excluirOrcamento(id) {
    if (confirm("Tem certeza que deseja excluir este orçamento do histórico?")) {
        try {
            const res = await fetch(`${API_URL}/orcamentos/excluir/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Orçamento excluído com sucesso!");
                carregarDadosDoBanco();
            } else {
                const erroMsg = await res.text();
                alert("Erro ao excluir: " + erroMsg);
            }
        } catch (e) {
            alert("Erro de conexão ao tentar excluir o orçamento.");
        }
    }
}

// --- 4. CADASTRAR CLIENTE ---
document.getElementById('formNovoCliente')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nome = document.getElementById('cad-nome').value.trim();
    const telefone = document.getElementById('cad-telefone').value.trim();
    const enderecoInput = document.getElementById('cad-endereco');
    const endereco = enderecoInput ? enderecoInput.value.trim() : '';
    
    if (nome.length < 3) { alert("O nome deve ter pelo menos 3 caracteres."); return; }
    if (telefone.length < 8) { alert("Por favor, insira um telefone válido."); return; }

    const btn = this.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/clientes/cadastrar`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, telefone, endereco })
        });

        if (res.ok) { 
            alert(await res.text()); 
            this.reset(); 
            fecharModal(); 
            carregarDadosDoBanco(); 
        } else {
            const erroMsg = await res.text();
            alert("Erro ao cadastrar: " + erroMsg);
        }
    } catch (e) { 
        alert("Erro de conexão com o servidor."); 
    } finally { 
        if (btn) btn.disabled = false; 
    }
});

// --- 5. GALERIA DO SITE ---
function previsualizarArquivo(input) {
    const preview = document.getElementById('file-name-preview');
    if (preview) {
        preview.textContent = (input.files && input.files[0]) ? input.files[0].name : 'Nenhum arquivo selecionado';
    }
}

document.getElementById('formUploadFoto')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData();

    const titulo = document.getElementById('titulo-projeto')?.value;
    const categoria = document.getElementById('categoria-projeto')?.value;
    const foto = document.getElementById('foto-projeto')?.files[0];

    if (!foto) {
        alert("Por favor, selecione uma imagem para publicar.");
        return;
    }

    formData.append("titulo", titulo);
    formData.append("categoria", categoria);
    formData.append("foto", await reduzirFoto(foto));

    const btn = this.querySelector('.btn-publish');
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/galeria/upload`, { method: 'POST', body: formData });
        if (res.ok) { 
            alert("Foto publicada com sucesso!"); 
            this.reset(); 
            const preview = document.getElementById('file-name-preview');
            if (preview) preview.textContent = 'Nenhum arquivo selecionado';
            carregarFotosAdmin();
        } else {
            const msg = await res.text();
            alert("Erro ao salvar: " + msg);
        }
    } catch (e) { 
        alert("Erro de conexão com o servidor."); 
    } finally { 
        if (btn) btn.disabled = false; 
    }
});

async function carregarFotosAdmin() {
    const grid = document.getElementById('admin-photo-grid');
    if (!grid) return;
    
    grid.innerHTML = "<p class='empty'>Carregando fotos...</p>"; 
    try {
        const resposta = await fetch(`${API_URL}/galeria/listar`); 
        if (!resposta.ok) throw new Error("Erro ao buscar as fotos");
        
        const fotos = await resposta.json();
        if (fotos.length === 0) {
            grid.innerHTML = "<p class='empty'>Nenhuma foto publicada. Use o formulário acima para enviar a primeira.</p>";
            return;
        }

        grid.innerHTML = fotos.map(foto => `
            <div class="admin-photo-item">
                <img src="${imgUrl(foto.url)}" loading="lazy" alt="${foto.titulo}">
                <div class="photo-overlay">
                    <button class="btn-delete-photo" onclick="excluirFoto(${foto.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="admin-photo-title">${foto.titulo}</div>
            </div>
        `).join('');
    } catch (erro) { 
        console.error("Erro ao carregar fotos:", erro); 
        grid.innerHTML = "<p class='empty'>Não foi possível conectar ao servidor (porta 8080).</p>"; 
    }
}

async function excluirFoto(id) {
    if (!id) {
        alert("ID da foto inválido.");
        return;
    }

    if (confirm("Tem certeza que deseja excluir esta foto do site?")) {
        try {
            const resposta = await fetch(`${API_URL}/galeria/deletar/${id}`, { method: 'DELETE' });
            if (resposta.ok) {
                alert("Foto excluída com sucesso!");
                carregarFotosAdmin();
            } else { 
                const msg = await resposta.text();
                alert("Erro ao excluir no servidor: " + msg); 
            }
        } catch (erro) { 
            console.error("Erro ao excluir foto:", erro); 
            alert("Erro de conexão ao tentar excluir a foto.");
        }
    }
}

// --- 5.1. MOSTRUÁRIO DIGITAL DE CORES ---
function previsualizarArquivoMostruario(input) {
    const preview = document.getElementById('file-name-preview-mostruario');
    if (preview) {
        preview.textContent = (input.files && input.files[0]) ? input.files[0].name : 'Nenhum arquivo selecionado';
    }
}

document.getElementById('formUploadMostruario')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData();

    formData.append("nome", document.getElementById('mostruario-nome').value);
    formData.append("fabricante", document.getElementById('mostruario-fabricante').value);
    formData.append("categoria", document.getElementById('mostruario-categoria').value);
    formData.append("foto", await reduzirFoto(document.getElementById('mostruario-foto').files[0]));

    const btn = this.querySelector('.btn-publish');
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/mostruario/upload`, { method: 'POST', body: formData });
        if (res.ok) { 
            alert("Chapa cadastrada com sucesso!"); 
            this.reset(); 
            const preview = document.getElementById('file-name-preview-mostruario');
            if (preview) preview.textContent = 'Nenhum arquivo selecionado';
            carregarMostruarioAdmin();
        } else {
            alert("Erro ao salvar a amostra no servidor.");
        }
    } catch (e) { 
        alert("Erro de conexão com o servidor."); 
    } finally { 
        if (btn) btn.disabled = false; 
    }
});

async function carregarMostruarioAdmin() {
    const grid = document.getElementById('admin-mostruario-grid');
    if (!grid) return;
    
    grid.innerHTML = "<p class='empty'>Carregando mostruário...</p>"; 
    try {
        const resposta = await fetch(`${API_URL}/mostruario/listar`); 
        if (!resposta.ok) throw new Error("Erro ao buscar amostras");
        
        const amostras = await resposta.json();
        if (amostras.length === 0) {
            grid.innerHTML = "<p class='empty'>Nenhuma chapa cadastrada. Use o formulário acima para adicionar.</p>";
            return;
        }

        grid.innerHTML = amostras.map(item => `
            <div class="admin-photo-item">
                <img src="${imgUrl(item.url)}" loading="lazy" alt="${item.nome}">
                <div class="photo-overlay">
                    <button class="btn-delete-photo" onclick="excluirMostruario(${item.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="admin-photo-title">${item.nome}<br><small>${item.fabricante}</small></div>
            </div>
        `).join('');
    } catch (erro) { 
        console.error(erro); 
        grid.innerHTML = "<p class='empty'>Não foi possível conectar ao servidor (porta 8080).</p>"; 
    }
}

async function excluirMostruario(id) {
    if (confirm("Excluir esta chapa do mostruário?")) {
        try {
            const resposta = await fetch(`${API_URL}/mostruario/deletar/${id}`, { method: 'DELETE' });
            if (resposta.ok) {
                alert("Chapa excluída.");
                carregarMostruarioAdmin();
            } else { 
                alert("Erro ao excluir no servidor."); 
            }
        } catch (erro) { 
            console.error(erro); 
        }
    }
}

// --- 6. FORMULÁRIO DE GERAR PDF ---
function adicionarLinhaServico() {
    const div = document.createElement('div');
    div.className = 'form-row servico-item'; 
    div.style.marginTop = '10px';
    div.innerHTML = `
        <div class="input-group-admin" style="flex: 2;">
            <input type="text" class="desc-servico" placeholder="Descrição do serviço" required>
        </div>
        <div class="input-group-admin" style="flex: 1;">
            <input type="text" class="valor-item" placeholder="Valor (R$)" required>
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#ff4757; cursor:pointer; padding:10px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    document.getElementById('lista-servicos')?.appendChild(div);
}

document.getElementById('formGerarPDF')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('cliente', document.getElementById('nome-cliente').value);
    
    const descs = document.querySelectorAll('.desc-servico');
    const vals = document.querySelectorAll('.valor-item');
    let total = 0;
    
    for (let i = 0; i < descs.length; i++) {
        let valorNum = parseFloat(vals[i].value.replace(/\./g, '').replace(',', '.'));
        if (isNaN(valorNum)) { alert("Verifique o valor do item " + (i+1)); return; }
        formData.append('servicos', descs[i].value);
        formData.append('valores', vals[i].value);
        total += valorNum;
    }
    formData.append('valorTotal', total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));

    try {
        const res = await fetch(`${API_URL}/orcamentos/gerar-pdf`, { method: 'POST', body: formData });
        if (res.ok) {
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = window.URL.createObjectURL(blob); 
            a.download = 'Orcamento.pdf'; 
            a.click();
            carregarDadosDoBanco();
        } else {
            alert("Erro ao gerar o PDF no servidor.");
        }
    } catch (e) {
        alert("Erro de conexão ao gerar PDF.");
    }
});

// --- 7. MODAL CLIENTE ---
function abrirModal() { 
    const modal = document.getElementById('modalCliente');
    if (modal) modal.style.display = 'flex'; 
}

function fecharModal() { 
    const modal = document.getElementById('modalCliente');
    if (modal) modal.style.display = 'none'; 
}

// --- 8. VINCULAÇÃO GLOBAL DAS FUNÇÕES ---
window.mudarAba = mudarAba;
window.efetuarLogout = efetuarLogout;
window.baixarOrcamento = baixarOrcamento;
window.excluirCliente = excluirCliente;
window.excluirOrcamento = excluirOrcamento;
window.excluirFoto = excluirFoto;
window.excluirMostruario = excluirMostruario;
window.previsualizarArquivo = previsualizarArquivo;
window.previsualizarArquivoMostruario = previsualizarArquivoMostruario;
window.adicionarLinhaServico = adicionarLinhaServico;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;