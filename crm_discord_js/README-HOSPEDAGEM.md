# Backend real na hospedagem do bot

`server.js` agora inicia o mesmo backend principal do CRM, empacotado em `backend.cjs`. A API antiga, que tinha rotas simuladas e um login diferente, foi substituída. O comando da hospedagem continua sendo `npm start` ou `node bot.js`. Use Node.js 22 ou superior.

## Preparação no computador do projeto

Na raiz do projeto:

```sh
npm run check
npm test
npm run build:discord
npm run cert:discord
```

O último comando gera uma chave e um certificado TLS para `sd-us1.blazebr.com`, válidos por 365 dias. Não sobrescreve certificados existentes. O certificado é próprio: a Vercel precisa confiar nele explicitamente pelo campo `CRM_BACKEND_CA_PEM`. Se a hospedagem fornecer certificado público válido para esse nome, use esse certificado e deixe `CRM_BACKEND_CA_PEM` vazio. A verificação de certificados permanece ativa.

Se `certs/` já estiver preenchida, pule a geração do certificado. Para conferir o backend empacotado sem iniciar o Discord nem acessar o banco real, execute `npm run test:discord` na raiz. No Windows, `powershell -NoProfile -File scripts/package-discord.ps1` gera `dist/crm-discord-backend-canais.zip`, sem `.env` e sem `node_modules`. O pacote inclui a chave TLS privada para uso somente na sua hospedagem; não o publique no Git.

Na pasta do bot, `npm run check:deploy` verifica as variáveis e o certificado sem mostrar segredos, iniciar o bot ou alterar o banco. No ambiente local preparado, domínio e chaves internas já foram acrescentados a `crm_discord_js/.env`; ainda é necessário preencher `META_APP_ID` e `META_APP_SECRET` com os dados do seu aplicativo. O `.env` local não é incluído no pacote: acrescente esses campos ao ambiente do servidor preservando sua configuração existente.

## Atualização na Blaze

1. Pare o bot para fazer a atualização e preserve o `.env`, os arquivos enviados e backups do banco.
2. Extraia o conteúdo de `crm-discord-backend-canais.zip` diretamente em `/home/container`, preservando o `.env` existente. `bot.js` e `package.json` devem ficar nessa raiz, com `commands/crm.js` e os certificados dentro das respectivas pastas. No painel, configure `MAIN_FILE=bot.js`. Não envie `node_modules` do Windows para o servidor Linux.
3. Instale as dependências com `npm install`. Preserve o mesmo `DATABASE_URL` e `JWT_SECRET` já usados pelo CRM. `MYSQL_*` continua sendo aceito quando `DATABASE_URL` estiver ausente.
4. Acrescente ao `.env` os campos novos de `.env.example`: `PUBLIC_APP_URL`, `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` e `CHANNEL_ENCRYPTION_KEY`. Gere duas chaves aleatórias diferentes para os últimos dois campos. Não coloque os segredos no Git ou nas variáveis `VITE_*`.
5. Execute `npm run channels:migrate` no console da hospedagem antes de iniciar a versão nova. A migração é repetível, preserva históricos e registra a alteração no controle do Drizzle. Ela pressupõe o banco existente do CRM; para uma instalação vazia, aplique primeiro as migrações completas na raiz.
6. Inicie `npm start`. O bot testa o MySQL com `SELECT 1` antes de abrir a API: deve aparecer `[Database] Connected successfully to MySQL (Aiven Cloud)!`, seguido da confirmação do heartbeat a cada três horas e de `Backend principal com canais reais ativo na porta 26653 (HTTPS)`. Se o MySQL falhar, a inicialização é interrompida para não usar um banco JSON diferente. As contas precisam entrar novamente no site, porque o formato antigo de sessão era diferente.

Os segredos do aplicativo Meta não são o token do bot Discord. O bot pode hospedar a API sem habilitar comandos de dados no Discord. `!clientes`, `!stats` e `!addcliente` só ficam disponíveis aos IDs de usuários em `DISCORD_ALLOWED_USER_IDS`, para a empresa em `DISCORD_COMPANY_ID`, por mensagem privada.

## Migrar pelo painel, sem terminal

Se o console da Blaze não aceita comandos de terminal, use o arquivo `setup.js` como ponto de entrada:

1. Pare o servidor e extraia o pacote atualizado em `/home/container`, preservando o `.env` e seus arquivos.
2. No painel da **Aiven**, abra seu serviço MySQL e baixe o **CA certificate** em **Overview / Connection information**. Envie esse arquivo como `/home/container/certs/aiven-ca.pem`. Ele valida o banco; mantenha também `cert.pem` e `key.pem`, usados no HTTPS da API.
3. Na aba de inicialização da **Blaze**, altere **MAIN_FILE** de `bot.js` para `setup.js` e inicie pelo botão do painel. Se o painel permitir editar somente o comando completo, use `node /home/container/setup.js`.
4. Aguarde `Migração de canais concluída` e depois `[Setup] Banco atualizado. Iniciando o bot e a API...`. O mesmo processo inicia o bot automaticamente após a migração.
5. Após o sucesso, pode voltar `MAIN_FILE` para `bot.js` nos próximos reinícios. Se mantiver `setup.js`, a migração repete as verificações; não apaga dados. Uma falha interrompe o início do bot e aparece no console.

O certificado CA da Aiven não vem no ZIP: ele pertence ao seu projeto Aiven e deve ser baixado pelo painel. Para outro local do arquivo, configure `DATABASE_SSL_CA_PATH` no `.env`. Como alternativa, `DATABASE_SSL_CA_PEM` aceita o PEM completo. A validação de certificado da migração permanece habilitada por padrão.

## Erro de arquivo ausente ao iniciar

Se aparecer `Cannot find module '/home/container/commands/crm.js'`, confira no gerenciador de arquivos se existe uma **pasta** `commands` contendo `crm.js` ao lado de `bot.js`. O arquivo não pode ficar dentro de uma pasta extra `crm_discord_js`, nem ter o nome literal `commands\crm.js` na raiz.

O empacotador foi corrigido para usar `/` nos caminhos internos do ZIP, compatível com Linux. Gere ou use o pacote atualizado, extraia novamente na raiz e reinicie o servidor pelo painel. Preserve o `.env`; o ZIP não contém suas credenciais. Os avisos de `npm audit` não são a causa desse erro de arquivo ausente.

## Vercel

Configure as variáveis do projeto Vercel:

```text
CRM_BACKEND_URL=https://sd-us1.blazebr.com:26653
CRM_BACKEND_CA_PEM=<conteúdo completo de certs/cert.pem>
```

Cole o PEM público completo, com suas quebras de linha. **Nunca copie `key.pem` para a Vercel ou para o frontend.** Publique o frontend com o novo `api/proxy.ts` e `vercel.json`. Esse proxy transporta cookies, login, uploads e webhooks por HTTPS e preserva os bytes usados na assinatura da Meta. Não configure `NODE_TLS_REJECT_UNAUTHORIZED=0`.

O certificado deve ser renovado antes de vencer; ao trocar um certificado próprio, atualize também o PEM confiado na Vercel. A porta 26653 precisa aceitar conexões da Vercel. A conexão pública existente não pôde ser confirmada a partir do ambiente de desenvolvimento.

Depois da publicação, confira:

```text
https://template-pi-ii-projeto-nps-2-0.vercel.app/api/health
```

O retorno deve conter `backend: "crm-main"` e `channels: true`.

### Site com erro 502 e backend iniciado

Se `/api/health` funciona diretamente na Blaze, mas retorna 502 pelo domínio do site, confira o encaminhamento na Vercel. Esse endpoint não consulta o banco: o erro nessa etapa é de comunicação com o backend.

No projeto da Vercel, em **Settings → Environment Variables**, defina `CRM_BACKEND_URL=https://sd-us1.blazebr.com:26653` e `CRM_BACKEND_CA_PEM` com o conteúdo inteiro de `certs/cert.pem`, incluindo `-----BEGIN CERTIFICATE-----`, `-----END CERTIFICATE-----` e as quebras de linha. Selecione o ambiente **Production**, salve e faça um **Redeploy**; salvar as variáveis não atualiza um deploy existente. O certificado precisa ser o mesmo enviado à Blaze, e a URL deve usar o domínio do certificado, não o IP.

Teste novamente o `/api/health` do site. No proxy atualizado, `BACKEND_TLS_ERROR` identifica falha na verificação do certificado; `BACKEND_CONNECTION_ERROR` indica outro erro de conexão, como DNS, porta ou timeout. Os logs da função `api/proxy` informam também se `CRM_BACKEND_CA_PEM` foi configurado, sem mostrar seu conteúdo. O erro `Unable to transform response from server` no navegador é consequência de receber o erro 502 no lugar da resposta tRPC.

## Meta

### Autorizacao falha depois de selecionar a Pagina ou o Instagram

A selecao na Meta confirma os ativos escolhidos, mas o CRM ainda precisa validar a sessao, trocar o codigo recebido e consultar as contas autorizadas. O backend atualizado registra a etapa da falha em linhas iniciadas por `[Meta OAuth]`, sem registrar cookies, codigos de autorizacao ou tokens.

- `callback_failed stage=session` ou `stage=browser`: entre novamente no dominio principal do CRM e refaca a conexao na mesma janela; confira se o navegador permite os cookies do site.
- `stage=flow`, `stage=consume_flow` ou `stage=save_selection`: confira a migracao/conexao MySQL e inicie uma tentativa nova.
- `stage=decrypt`: confira se todas as instancias preservam o mesmo `CHANNEL_ENCRYPTION_KEY`.
- `stage=code_exchange`: procure tambem a linha `operation=code_exchange` ou `operation=token_extension`. Ela informa os codigos numericos retornados pela Meta, necessarios para distinguir credencial, URL de retorno e tipo de token.
- `stage=accounts`: procure `operation=list_permissions` ou `operation=list_pages` e seus codigos. A selecao visual de uma conta nao confirma todas as permissoes de mensagens exigidas.

Envie apenas essas linhas de diagnostico ao solicitar suporte. Inicie uma nova tentativa pelo botao de conectar: o retorno OAuth e de uso unico. O frontend atualizado mostra mensagens especificas para cada etapa; ele precisa de um novo deploy na Vercel para exibi-las.

Quando `/me/accounts` retorna zero Paginas, o backend consulta as Paginas indicadas nos `target_ids` das permissoes de Pagina retornadas pela Meta em `debug_token`. A autorizacao deve estar valida, pertencer ao aplicativo configurado e incluir as permissoes de mensagens, inclusive com `META_CONFIG_ID`. IDs de Instagram e de portfolio nao sao usados como IDs de Pagina, e cada consulta precisa retornar a identidade esperada e um token de Pagina.

O resumo `[Meta OAuth] instagram: ...` informa `listed_pages` (listagem inicial), `authorized_page_targets` (IDs autorizados consultados na segunda busca), `resolved_pages` (Paginas encontradas) e `eligible_accounts` (contas com os dados necessarios). Se a lista e os IDs autorizados estiverem vazios, revise no painel Meta os ativos e permissoes efetivamente concedidos e o acesso da pessoa que autoriza a Pagina. `missing_permissions=...` identifica as permissoes ausentes. Nenhum ID deve ser fixado no codigo para contornar uma autorizacao vazia.

Se a conta aparece para selecao, mas a conexao recebe `http=403 code=200`, a descoberta ja funcionou: ainda falta a Meta aceitar a operacao seguinte. A assinatura do Instagram solicita somente `messages`; o CRM nao trata postbacks de botoes nesse canal. A assinatura do Facebook permanece com `messages,messaging_postbacks`.

O diagnostico `operation=subscribe_webhook` identifica a assinatura e mostra `requested_fields`, `permission_hints` e `field_hints`. Os hints sao apenas nomes conhecidos citados pela resposta da Meta, nao uma confirmacao de qual permissao esta ausente. Nenhum token ou mensagem bruta e registrado. Se a recusa continuar, confira as permissoes citadas, os acessos da pessoa que autoriza e o nivel de acesso aprovado no painel Meta. A selecao de uma conta por si so nao confirma a assinatura. Para atualizar essa correcao, substitua `/home/container/backend.cjs`, reinicie a Blaze e inicie uma nova conexao no CRM; o fluxo anterior e de uso unico.

No aplicativo Meta existente, configure:

- Retorno OAuth: `https://template-pi-ii-projeto-nps-2-0.vercel.app/api/meta/callback`
- Webhook: `https://template-pi-ii-projeto-nps-2-0.vercel.app/api/meta/webhook`
- Token de verificação: o mesmo de `META_WEBHOOK_VERIFY_TOKEN` no `.env` do bot.

O Instagram usa Facebook Login: precisa ser profissional e estar vinculado a uma Página. Autorize `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `pages_messaging`, `instagram_basic`, `instagram_manage_messages`. Neste fluxo, Instagram e Facebook Messenger assinam `messages` na Página e precisam de `pages_messaging`; remover `messaging_postbacks` não elimina essa exigência. Configure os objetos/campos de webhooks e as aprovações exigidas pela Meta. O WhatsApp usa um token do mesmo aplicativo, com `whatsapp_business_management` e `whatsapp_business_messaging`.

Se aparecer `permission_hints=pages_messaging`, confira essa permissão no aplicativo Meta. Quando `META_CONFIG_ID` estiver preenchido no servidor, abra **Facebook Login for Business > Configurações**, edite a configuração correspondente a esse ID e inclua `pages_messaging` nas permissões. Se precisar criar outra configuração, atualize `META_CONFIG_ID` na Blaze. O login com `config_id` usa as permissões definidas no painel Meta; mudar apenas a lista de scopes no código não altera essa configuração. Reinicie com o `backend.cjs` atualizado e comece uma nova autorização no CRM para obter o token com a permissão. Confira também o nível de acesso disponível/aprovado para essa permissão antes de liberar contas de clientes externos.

Cada empresa deve reconectar seus canais na tela nova; os registros antigos sem validação e os exemplos não são importados. O passo a passo completo fica em `docs/CANAIS-META.md` na raiz do projeto.
