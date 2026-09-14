# Ativação dos canais reais

O código conecta múltiplos WhatsApps e até um Instagram profissional e uma Página do Facebook por empresa. Contas, tokens, mensagens e escolhas de login são vinculados ao ID da empresa, inclusive para usuários com perfil `admin`. Atendentes autorizados da própria empresa podem atender seus contatos, mas não cadastrar canais nem consultar tokens. A mesma conta não pode ser cadastrada por outra empresa; a Página vinculada ao Instagram também fica reservada à empresa.

## 1. Preparar o servidor

O `vercel.json` encaminha `/api/*` e `/uploads/*` por `api/proxy.ts` para o backend HTTPS hospedado junto ao bot Discord. Publique o backend empacotado nesse servidor e o frontend na Vercel. Configurar apenas a Vercel não atualiza a API. Siga `crm_discord_js/README-HOSPEDAGEM.md` para gerar o pacote, configurar os certificados e a confiança da Vercel. O proxy preserva cookies e o corpo original dos webhooks.

Copie as variáveis de `.env.channels.example` para o ambiente do backend. Preencha o ID e o segredo do seu aplicativo Meta diretamente no gerenciador de segredos/ambiente do servidor, sem colocá-los no frontend ou no Git. Use duas chaves aleatórias diferentes para o token de verificação e a criptografia. Preserve uma cópia segura da chave de criptografia junto ao backup do banco.

Antes de iniciar a versão nova, com backup do banco disponível, execute:

```sh
npm run channels:migrate
npm run build
```

A migração adiciona tabelas e campos, com índices únicos para impedir duplicidade mesmo em requisições concorrentes. Não apaga configurações nem histórico antigo. O cadastro anterior não verificava identidade ou credenciais; por isso os canais antigos precisam ser reconectados pela nova tela. Os exemplos antigos não são importados nem exibidos. O histórico fica disponível, e o operador escolhe o número na primeira resposta de uma conversa antiga.

O modo JSON é exclusivo para desenvolvimento local sem `DATABASE_URL`; o cadastro de canais usa `data/channels.json`, com gravação atômica. Em produção, MySQL é obrigatório. Uma falha de conexão não deve criar um cadastro paralelo em JSON.

## 2. Configurar o aplicativo Meta

Use estas URLs exatamente, sem barra adicional no final:

- URI de redirecionamento OAuth válida: `https://template-pi-ii-projeto-nps-2-0.vercel.app/api/meta/callback`
- Callback de webhooks: `https://template-pi-ii-projeto-nps-2-0.vercel.app/api/meta/webhook`
- Token de verificação: o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN` no servidor.

Configure o domínio `template-pi-ii-projeto-nps-2-0.vercel.app` e o produto de login do Facebook compatível com seu aplicativo. O fluxo implementado é **Instagram API com Facebook Login**: o Instagram deve ser profissional (empresa ou criador) e estar vinculado a uma Página que o usuário gerencia. O Facebook conecta uma Página, não mensagens de um perfil pessoal.

Permissões solicitadas pelo fluxo:

- Ambas as plataformas: `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`.
- Facebook Messenger: `pages_messaging`.
- Instagram: `instagram_basic`, `instagram_manage_messages`.

No painel Meta, configure os webhooks de `page` e `instagram` para mensagens (`messages` e, conforme o produto, `messaging_postbacks`). Configure também `whatsapp_business_account`, campo `messages`. O servidor assina a Página/WABA ao conectar; a configuração dos objetos e campos no aplicativo continua necessária. Confira a opção de permitir acesso às mensagens nas ferramentas conectadas do Instagram.

Para empresas e pessoas fora dos papéis de teste do aplicativo, obtenha as aprovações/acessos avançados e verificação empresarial exigidos pela Meta e coloque o aplicativo no modo apropriado. Políticas e janelas de envio continuam sendo aplicadas pela Meta; um login bem-sucedido não permite enviar mensagens não autorizadas.

## 3. Conectar pela aplicação

1. Entre como responsável pela empresa e abra **Canais**.
2. WhatsApp: informe nome, Phone Number ID, WABA ID e token do mesmo aplicativo Meta configurado no CRM, com `whatsapp_business_management` e `whatsapp_business_messaging`. O número precisa estar registrado para uso da Cloud API; o CRM valida a identidade/verificação e assina os eventos, mas não registra o PIN de um número novo.
3. Instagram/Facebook: clique em conectar, entre na Meta, autorize as permissões, volte ao CRM e escolha a conta. As credenciais não são enviadas ao navegador na lista de escolhas.
4. Após conectar, o status inicial é **Credenciais validadas · aguardando mensagem**. Envie uma mensagem de uma conta externa para comprovar a chegada; só um evento com assinatura válida confirma o recebimento no painel.
5. No atendimento, responda à conversa. Ela mantém o canal de origem. Para contatos antigos sem vínculo, selecione o WhatsApp antes de iniciar o envio.

Instagram recebe e envia texto/imagens neste fluxo. Facebook e WhatsApp também enviam áudio e documentos. Mensagens só são registradas como enviadas depois da confirmação da Meta. Notas internas não são enviadas ao cliente. Arquivos de saída precisam estar acessíveis por HTTPS.

Ao desconectar, o CRM remove a credencial e o roteamento local e preserva o histórico. A autorização global do aplicativo na Meta não é revogada automaticamente, pois pode atender o outro canal da mesma empresa. Para retirar também essa autorização, use as configurações de integrações empresariais da Meta. Reconectar uma conta cria um vínculo novo; o histórico do vínculo removido permanece para consulta.

## Validação antes de publicar

```sh
npm run check
npm test
npm run build
```

Os testes locais usam respostas simuladas da API para verificar regras e falhas, sem enviar mensagens reais. A validação final requer o aplicativo Meta configurado: conectar duas empresas, dois WhatsApps na primeira empresa, um Instagram/Facebook por empresa, tentar cadastrar a mesma conta em outra empresa, cancelar/repetir o login, testar entrada/saída em cada canal, credenciais revogadas e mensagens repetidas de webhook.

Referências oficiais: [coleção Instagram mantida pela Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), [Messenger Platform da Meta](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api), [WhatsApp Cloud API da Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).
