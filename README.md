# Portela's Marcenaria: site

Site da Portela's Marcenaria, marcenaria sob medida em Itaipu, Niterói - RJ.
Feito com [Astro](https://astro.build).

## Páginas
- **Início:** apresentação, ambientes, projeto 3D, painéis em PVB e diferenciais.
- **Projetos:** galeria em mosaico com filtro por ambiente e foto ampliada.
- **Mostruário de cores:** chapas MDF por fabricante (Guararapes e Duratex), com busca e filtro por linha.
- **Orçamento:** formulário que abre o WhatsApp com o pedido preenchido.
- **Painel (/login):** galeria, mostruário, clientes e orçamentos em PDF.

## Como rodar
```
npm install
npm run dev        # http://localhost:4321
npm run celular    # também abre pelo Wi-Fi, para testar no celular
npm run build      # gera a pasta dist para publicar
```

A galeria, o mostruário e o painel usam o servidor Java (repositório separado), que roda na porta 8080.
Sem o servidor, o mostruário mostra o catálogo de reserva (`public/mostruario.json`).

## Contato
WhatsApp (21) 98459-2134 · portelasmarcenaria@gmail.com
Estrada Francisco da Cruz Nunes, 2254, Loja 102, Itaipu, Niterói - RJ
