# Site da Portela's Marcenaria

Esta é a pasta do site (a antiga ficava em `.vscode\Site\meu-projeto`).

## Ligar o site no computador
1. Abra esta pasta no VS Code (File > Open Folder).
2. No terminal: `npm install` (só na primeira vez).
3. Depois: `npm run dev` e abra http://localhost:4321

O servidor Java (IntelliJ, projeto marcenaria-sistema) precisa estar ligado para a galeria,
o mostruário e o painel funcionarem.

## Painel
- Endereço: http://localhost:4321/login
- O usuário e a senha ficam no servidor, no arquivo
  `marcenaria-sistema\src\main\resources\application.properties`
  (linhas `portelas.admin.usuario` e `portelas.admin.senha`).
  Para trocar a senha, mude ali e reinicie o servidor.

## Endereço do servidor
O site descobre sozinho: no computador usa http://localhost:8080; online usa o próprio domínio.
