# CRM Web - TODO

## Banco de Dados & Infraestrutura
- [x] Schema do banco de dados (users estendido, clientes, oportunidades, tarefas, interações, gravações, mensagens WhatsApp)
- [x] Migrations SQL aplicadas

## Autenticação & Controle de Acesso
- [x] Sistema de login próprio com email e senha (bcrypt)
- [x] Controle admin para ativar/desativar acesso de usuários
- [x] Painel de gestão de usuários (admin)
- [x] Proteção de rotas por role (admin vs user)

## Backend - Procedures tRPC
- [x] Procedures para autenticação (login, registro, gestão de usuários)
- [x] Procedures para clientes (CRUD + busca + filtros)
- [x] Procedures para oportunidades/funil de vendas
- [x] Procedures para tarefas e lembretes
- [x] Procedures para interações/atividades
- [x] Procedures para gravações de áudio
- [x] IA como assistente principal do CRM (ChatGPT integrado)
- [x] Transcrição automática de áudio (Speech-to-Text)
- [x] Notificações por email (mudança de estágio + tarefas vencidas)
- [x] Upload de áudio para S3
- [x] Estrutura preparada para integração com WhatsApp (conectar depois)

## Frontend - Design & Layout
- [x] Design system elegante (cores, fontes, espaçamentos)
- [x] Layout com DashboardLayout e sidebar personalizada
- [x] Tema escuro elegante com tons de azul/índigo

## Frontend - Páginas
- [x] Dashboard com métricas de vendas e clientes
- [x] Página de Clientes (CRUD + busca + filtros + cards)
- [x] Página de Detalhes do Cliente (info + interações + oportunidades + sugestões IA)
- [x] Funil de Vendas (Kanban com 6 estágios)
- [x] Página de Tarefas (criar, completar, filtrar por status)
- [x] Assistente IA (chat completo com sugestões rápidas)
- [x] Gravações de Áudio (recorder com visualização, transcrição automática)
- [x] Gestão de Usuários (admin - ativar/desativar, mudar role)
- [x] Configurações (WhatsApp, notificações, dados)
- [x] Página WhatsApp (placeholder para integração futura)

## Testes
- [x] Testes unitários para auth (32 testes passando)
- [x] Testes para admin procedures
- [x] Testes para clients procedures
- [x] Testes para opportunities procedures
- [x] Testes para tasks procedures
- [x] Testes para interactions procedures
- [x] Testes para dashboard procedures
- [x] Testes para AI procedures
- [x] Testes para audio procedures

## Sistema de Atendentes por Empresa
- [x] Tabela de atendentes (attendants) vinculados a clientes/empresas
- [x] Tabela de sessões ativas para controle de sessão única
- [x] Campo maxAttendants no cliente para limitar quantidade de atendentes
- [x] Procedures para CRUD de atendentes (empresa gerencia seus atendentes)
- [x] Login individual por atendente (email + senha)
- [x] Sessão única por atendente (desconecta sessão anterior ao logar em novo dispositivo)
- [x] Registro de IP e dispositivo em cada login
- [x] Painel da empresa para gerenciar seus atendentes
- [x] Admin pode desativar empresa inteira ou atendentes individuais
- [x] Testes para o sistema de atendentes (44 testes passando)

## Sistema ZapVoice - Automação de Fluxos
- [x] Tabelas de banco de dados (mediaAudios, mediaFiles, mediaDocuments, mediaTexts, labels, contactLabels, flows, flowSteps, sendCounters, flowExecutions, flowResponses, flowAnalytics)
- [x] Procedures tRPC para gerenciamento de fluxos (criar, listar, atualizar, deletar)
- [x] Procedures tRPC para gerenciamento de mídias (audios, arquivos, documentos, textos)
- [x] Procedures tRPC para gerenciamento de labels e etiquetas de contatos
- [x] Procedures tRPC para gerenciamento de gatilhos (triggers)
- [x] Procedures tRPC para análise de fluxos (estatísticas, respostas)
- [ ] Frontend - Página de Fluxos (criar, editar, deletar, visualizar fluxos)
- [ ] Frontend - Página de Mídias (upload, gerenciar biblioteca de mídias)
- [ ] Frontend - Página de Gatilhos (criar e configurar triggers)
- [ ] Frontend - Builder visual de fluxos (drag-and-drop)
- [ ] Frontend - Visualização de estatísticas de fluxos em tempo real

## Relatórios & Analytics
- [x] Schema de banco de dados para relatórios (flowExecutions, flowResponses, flowAnalytics)
- [x] Procedures tRPC para estatísticas de fluxos (execução, respostas, tempo médio)
- [x] Procedures tRPC para fluxos mais executados
- [x] Frontend - Página de Relatórios (ReportsPage.tsx criada)
- [x] Integração de ReportsPage no App.tsx
- [x] Link de Relatórios no menu lateral (DashboardLayout)
- [x] Testes unitários para procedures de relatórios (44 testes passando)
- [x] Refinamento visual da página de Relatórios
- [ ] Exportação de relatórios em PDF/CSV
