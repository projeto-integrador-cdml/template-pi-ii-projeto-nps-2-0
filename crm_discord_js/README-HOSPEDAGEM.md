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
6. Inicie `npm start`. A API deve informar `Backend principal com canais reais ativo na porta 26653 (HTTPS)`. As contas precisam entrar novamente no site, porque o formato antigo de sessão era diferente.

Os segredos do aplicativo Meta não são o token do bot Discord. O bot pode hospedar a API sem habilitar comandos de dados no Discord. `!clientes`, `!stats` e `!addcliente` só ficam disponíveis aos IDs de usuários em `DISCORD_ALLOWED_USER_IDS`, para a empresa em `DISCORD_COMPANY_ID`, por mensagem privada.

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

## Meta

No aplicativo Meta existente, configure:

- Retorno OAuth: `https://template-pi-ii-projeto-nps-2-0.vercel.app/api/meta/callback`
- Webhook: `https://template-pi-ii-projeto-nps-2-0.vercel.app/api/meta/webhook`
- Token de verificação: o mesmo de `META_WEBHOOK_VERIFY_TOKEN` no `.env` do bot.

O Instagram usa Facebook Login: precisa ser profissional e estar vinculado a uma Página. Autorize `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `instagram_basic`, `instagram_manage_messages`; Facebook Messenger usa também `pages_messaging`. Configure os objetos/campos de webhooks e as aprovações exigidas pela Meta. O WhatsApp usa um token do mesmo aplicativo, com `whatsapp_business_management` e `whatsapp_business_messaging`.

Cada empresa deve reconectar seus canais na tela nova; os registros antigos sem validação e os exemplos não são importados. O passo a passo completo fica em `docs/CANAIS-META.md` na raiz do projeto.
