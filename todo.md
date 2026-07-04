# Project TODO

## Banco de Dados
- [x] Schema: tabela transactions (valor, tipo PJ/PF, cartão, categoria, descrição, data)
- [x] Schema: tabela cards (3 cartões: Empresa com assinatura, Pessoal, Familiar)
- [x] Schema: tabela categories (categorias de despesa padrão + personalizadas)
- [x] Schema: tabela tax_reminders (lembretes de impostos DAS e IRPF)
- [x] Seed dos 3 cartões e categorias padrão
- [x] Push migrations para o banco

## Backend - tRPC Routers
- [x] Router transactions: CRUD completo de transações
- [x] Router cards: listar cartões e totais por cartão
- [x] Router categories: listar, criar e editar categorias
- [x] Router dashboard: dados agregados para gráficos (PJ vs PF, por cartão, por mês)
- [x] Router reports: relatórios mensais filtráveis por categoria, tipo e cartão
- [x] Router tax: listar e gerenciar lembretes de impostos

## Bot Telegram
- [x] Configurar secret do token do Telegram
- [x] Endpoint webhook para receber mensagens do Telegram
- [x] Parser de mensagens: "cartão PF 150 mercado", "receita PJ 3000 cliente X"
- [x] Comando /resumo - resumo financeiro do mês atual
- [x] Comando /cartoes - gastos por cartão
- [x] Comando /ajuda - lista de comandos disponíveis
- [x] Envio de lembretes automáticos de DAS mensal e IRPF anual
- [x] Resumo financeiro mensal automático via Telegram

## Frontend - Design e Layout
- [x] Tema elegante e sofisticado (dark mode, paleta refinada)
- [x] DashboardLayout com sidebar navegável
- [x] Página Dashboard: gráficos PJ vs PF, totais por cartão, receitas/despesas
- [x] Página Transações: lista filtável com busca, tipo, cartão e categoria
- [x] Página Cartões: visão individual de cada cartão com gastos
- [x] Página Categorias: gerenciar categorias de despesa
- [x] Página Impostos: calendário de impostos com status
- [x] Página Telegram: instruções de setup e referência de comandos
- [x] Formulário rápido para adicionar transação pelo painel web

## Testes
- [x] Testes vitest para routers de transações
- [x] Testes vitest para parser do bot Telegram

## Relatório Mensal por E-mail
- [x] Envio automático de relatório mensal para contatoseghessi@gmail.com
- [x] Template HTML elegante do relatório com resumo PJ/PF, gastos por cartão, top categorias
- [x] Insights e dicas de economia baseados nos padrões de gasto
- [x] Cron job para envio no dia 1 de cada mês

## Upload e Leitura de Faturas PDF
- [x] Schema: tabela invoiceUploads (arquivo, status, dados extraídos)
- [x] Endpoint de upload de fatura PDF via S3
- [x] Processamento com LLM para extrair transações do PDF
- [x] Importação automática das transações extraídas para o sistema
- [x] Página de upload de faturas no frontend com preview das transações extraídas

## Controle de Diárias de Trabalho
- [x] Schema: tabela workDays (cliente, valor diária, data, tipo de serviço, status)
- [x] Router CRUD de diárias com filtros por cliente, mês e status
- [x] Página de Diárias no frontend com lista, formulário e resumo mensal
- [x] Integração com dashboard: total faturado em diárias no mês
- [x] Comando no Telegram: "diária 1500 cliente X videomaker"


## Upload de Faturas de Cartão com Categorização
- [x] Schema: tabela cardStatements (arquivo, mês, ano, transações extraídas)
- [x] Endpoint de upload de extrato de cartão PDF
- [x] Processamento com LLM para extrair transações do extrato
- [x] Categorização automática de transações por padrão de descrição
- [x] Importação automática das transações extraídas
- [x] Página de upload de extratos no frontend
- [x] Preview das transações antes de importar

## Controle Anual e Mês a Mês
- [x] Gráfico de evolução mensal (receita, despesa, lucro)
- [x] Comparativo mês anterior vs mês atual
- [x] Relatório anual com totalizações por mês
- [x] Filtro de período (mês, trimestre, semestre, ano)
- [x] Exportar relatório anual em PDF

## Upload de NF de Serviço Contratado
- [x] Schema: tabela serviceInvoices (fornecedor, valor, data, arquivo)
- [x] Endpoint de upload de NF de serviço
- [x] Extração de dados: CNPJ, razão social, valor, data
- [x] Criação automática de despesa no dia especificado (ou dia 28)
- [x] Página de upload e visualização de NF de serviço

## Upload de NF de Compra de Produto
- [x] Schema: tabela productInvoices (fornecedor, valor, data, arquivo)
- [x] Endpoint de upload de NF de produto
- [x] Extração de dados: CNPJ, razão social, itens, valor total
- [x] Criação automática de despesa
- [x] Página de upload e visualização de NF de produto

## Cadastro de Fornecedores
- [x] Schema: tabela suppliers (CNPJ, razão social, contato, email, telefone)
- [x] Criação automática de fornecedor a partir de NF de serviço
- [x] CRUD manual de fornecedores
- [x] Página de gerenciamento de fornecedores
- [x] Histórico de compras por fornecedor

## Cadastro de Contratantes
- [x] Schema: tabela clients (CNPJ, razão social, contato, email, telefone)
- [x] Criação automática de contratante a partir de NF gerada
- [x] CRUD manual de contratantes
- [x] Página de gerenciamento de contratantes
- [x] Histórico de vendas por contratante

## Recebimentos Recorrentes para Contratos Anuais
- [x] Schema: tabela recurringIncome (cliente, valor, frequência, data início, data fim)
- [x] Criação automática de receitas recorrentes (mensais, trimestrais, anuais)
- [x] Visualização de próximos recebimentos
- [x] Página de gerenciamento de contratos recorrentes
- [x] Alertas de recebimentos próximos via Telegram

## Cobranças Recorrentes
- [x] Schema: tabela recurringExpenses (fornecedor, valor, frequência, data início, data fim)
- [x] Criação automática de despesas recorrentes
- [x] Visualização de próximos pagamentos
- [x] Página de gerenciamento de cobranças recorrentes
- [x] Alertas de pagamentos próximos via Telegram

## Navegação entre Meses
- [x] Adicionar setas de navegação (anterior/próximo) no dashboard para trocar de mês
- [x] Filtro de mês nas páginas de Transações, Cartões e Recorrências

## Visão Anual e Navegação Rápida entre Meses
- [x] Grid visual com os 12 meses do ano mostrando receita/despesa de cada mês
- [x] Seletor de ano para transição entre anos
- [x] Clicar no mês carrega os dados no dashboard
- [x] Manter setas anterior/próximo para navegação rápida

## Projeção de Recorrências nos Meses Futuros
- [x] Incluir receitas recorrentes previstas nos meses futuros do dashboard e visão anual
- [x] Incluir despesas recorrentes previstas nos meses futuros do dashboard e visão anual
- [x] Diferenciar visualmente valores reais vs projetados (recorrências)
- [x] Endpoint para calcular projeções de recorrências por mês

## Bug Fix: Projeção Meses Futuros
- [x] Meses futuros devem mostrar SOMENTE recorrências cadastradas, não repetir dados reais
- [x] Remover custos/despesas dos meses futuros que não são recorrências

## Limpeza de Dados de Teste
- [x] Remover receitas recorrentes de teste (manter "Iguatemi")
- [x] Remover despesas recorrentes de teste
- [x] Remover fornecedores de teste

## Cards Clicáveis no Dashboard
- [x] Card de Receitas clicável: abre lista detalhada das receitas do mês
- [x] Card de Despesas clicável: abre lista detalhada das despesas do mês

## Recorrências Geram Transações Automaticamente
- [x] Ao cadastrar recorrência, gerar transações em todos os meses do período configurado
- [x] Transações recorrentes aparecem nos cards clicáveis de Receitas e Despesas em qualquer mês
- [x] Ao navegar para meses futuros (ex: dez/2026), ver quais empresas/contratos estarão ativos
- [x] Marcar transações geradas por recorrência com indicador visual (ex: ícone de recorrência)

## Bug Fix: Painel lateral não abre em meses futuros
- [x] Cards de Receitas e Despesas devem abrir painel lateral em todos os meses, incluindo futuros com transações recorrentes

## Sistema de Jobs/Projetos
- [x] Schema: tabela jobs (nome, cliente, status, data início, data fim, valor cobrado, observações)
- [x] Schema: tabela jobDeliveries (entregas do job: descrição, status pendente/entregue)
- [x] Schema: tabela jobCosts (custos do job: descrição, valor, fornecedor, gera despesa PJ automaticamente)
- [x] Schema: tabela jobPayments (recebimentos: descrição, valor, data prevista de recebimento, status pendente/recebido, gera receita PJ automaticamente)
- [x] DB helpers: CRUD de jobs, entregas, custos e recebimentos
- [x] Routers tRPC: CRUD completo de jobs com sub-routers para entregas, custos e recebimentos
- [x] Cálculo automático de lucro e margem por job
- [x] Página de lista de Jobs com filtros por status, cliente e período
- [x] Página de detalhe do Job com abas: entregas, custos, recebimentos e resumo financeiro
- [x] Formulários simples para criar/editar job, entregas, custos e recebimentos
- [x] Nada obrigatório para criar job (só nome), tudo editável depois
- [x] Card "Jobs do Mês" no dashboard com jobs ativos e lucro total
- [x] Menu item "Jobs" no sidebar

## Bug Fix: Data de recebimento faltando no formulário de pagamentos
- [x] Adicionar campo editável de data de recebimento no formulário de recebimentos do Job
- [x] Permitir edição completa de recebimentos (não só confirmar)

## Testes de Jobs
- [x] Testes vitest para routers de Jobs (CRUD, entregas, custos, recebimentos, monthSummary)

## Novos Comandos Telegram
- [x] /jobs - Resumo dos jobs ativos (em andamento, lucro do mês, recebimentos pendentes)
- [x] /recorrencias - Próximas receitas e despesas recorrentes dos próximos 30 dias
- [x] /diarias - Resumo de diárias do mês (dias trabalhados, valor total)
- [x] /projecao - Projeção financeira do ano
- [x] /ultimas - Últimas 5 transações registradas
- [x] Registro rápido de job por texto (ex: "job Campanha Iguatemi 15000")
- [x] Processamento de fatura de cartão via foto/PDF com IA (upload S3 + LLM extração + categorização + criação de transações)
- [x] Atualizar /start e /ajuda com todos os novos comandos
- [x] Testes vitest para os novos comandos

## Bugs Reportados - Categorias e Cartões
- [x] Lançamentos da fatura do Telegram não estão sendo categorizados corretamente
- [x] Página de Categorias: adicionar navegação mês a mês e resumo por categoria
- [x] Página de Cartões: adicionar navegação mês a mês

## Bug: Recebimentos de Jobs não aparecem no Saldo Previsto
- [x] Recebimentos pendentes de jobs com data prevista devem aparecer no saldo previsto do mês correspondente
- [x] Similar às recorrências: se um recebimento tem data prevista 30/06, deve aparecer como receita prevista em junho
- [x] Atualizar dashboard e visão anual para incluir recebimentos de jobs previstos

## Sistema de Revisão de Categorias + Melhorias
- [x] Criar tabela categoryLearning no schema (merchantPattern → categoryId, confirmCount)
- [x] Helpers no db.ts para categoryLearning (upsert, lookup, getUncategorized)
- [x] Comando /revisar no Telegram: lista transações sem categoria do mês com números
- [x] Resposta rápida para categorizar: "1 alimentação, 2 equipamento, 3 pessoal"
- [x] Aprendizado automático: salvar padrão merchant→categoria a cada resposta
- [x] Integrar aprendizado na categorização de faturas futuras (consultar categoryLearning antes da IA)
- [x] Card de Despesas clicável no dashboard (já existia, verificado funcionamento)
- [x] Melhorar mensagem de resumo pós-fatura: mostrar categorizados vs pendentes

## Drill-down por Categoria + Fatura PF
- [x] Página de Categorias: ao clicar em uma categoria, abrir lista de transações daquela categoria no mês selecionado
- [x] Mostrar descrição original da fatura em cada transação para conferência
- [x] Funcionar para todos os meses (navegação mês a mês)
- [x] Bot Telegram: ao receber foto/PDF de fatura, perguntar se é PJ ou PF antes de processar
- [x] Todas as features (categorização, /revisar, aprendizado) funcionam para PJ e PF
- [x] Testes vitest para as novas funcionalidades

## Melhorias Categorias - Troca manual + Filtro PJ/PF
- [x] Drill-down: botão para trocar categoria de cada transação manualmente (select com todas as categorias)
- [x] Drill-down: ao trocar categoria, salvar aprendizado automático (upsertCategoryLearning)
- [x] Página de Categorias: abas/filtro PJ e PF para separar gastos por escopo
- [x] Drill-down: filtrar transações pelo escopo selecionado (PJ/PF/Todos)

## Bug: /revisar mostra transações erradas
- [x] /revisar deve filtrar apenas transações com source="telegram" (não mostrar recorrentes, web, jobs)
- [x] Fatura mandada pelo Telegram voltou "sem categoria" R$ 238 - melhorado prompt da LLM para categorizar melhor

## Anti-duplicação e Aprendizado na Troca de Categoria
- [x] Ao trocar categoria de uma transação: se já existe outra com mesmo nome, valor e data na nova categoria, substituir (deletar a duplicada) sem perguntar
- [x] Ao trocar categoria manualmente no frontend, salvar aprendizado automático (upsertCategoryLearning) para IA categorizar igual nas próximas faturas

## Relatórios em PDF com Envio por E-mail
- [x] Relatório Mensal Completo em PDF: receitas/despesas PJ e PF, gastos por categoria e cartão, lucro, comparativo mês anterior
- [x] Relatório Anual em PDF: faturamento por mês, impostos pagos, lucro mensal, evolução, totais do ano
- [x] Relatório de Job/Projeto em PDF: valor cobrado, custos, lucro, margem, entregas, recebimentos, status
- [x] Endpoint tRPC para gerar e enviar cada relatório por e-mail
- [x] Botão "Exportar PDF" no Dashboard (relatório mensal)
- [x] Botão "Exportar PDF" na Visão Anual (relatório anual)
- [x] Botão "Exportar PDF" na página de detalhe do Job (relatório do projeto)
- [x] Template HTML elegante para os PDFs com branding Estúdio Criativo Eugê

## Identidade Visual Eugê + Gestão de Dados
- [x] Aplicar paleta de cores Eugê: preto (#0D0D0D), laranja (#EE770E), verde lima (#EBEDAE), branco, off-white (#F0EEEB)
- [x] Fonte Satoshi como fonte principal do sistema
- [x] Tema dark como padrão (coerente com a marca)
- [x] Logo EUGÊ. estilizado no sidebar como branding
- [x] Funcionalidade "Limpar Dados de Teste" na página de Configurações
- [x] Autonomia para apagar transações, jobs, recorrências e aprendizado individualmente com filtros

## Bug: Cadastro de Contratantes
- [x] Erro "erro ao cadastrar contratante" quando não preenche todos os campos - deve funcionar só com nome
- [x] Todos os campos exceto nome devem ser opcionais no cadastro de contratantes
- [x] Verificar se recorrências buscam contratantes corretamente
- [x] Selects de contratantes/fornecedores nas recorrências estilizados com componentes shadcn/ui (tema dark)

## Bug: Cadastro de Fornecedores - Mesmo bug do email
- [x] Erro de validação email ao cadastrar fornecedor sem preencher todos os campos
- [x] Aplicar mesma correção dos contratantes: strings vazias → null, remover z.string().email()
- [x] Melhorar formulário de fornecedores com labels e placeholders (consistência com contratantes)

## Bug: Despesa Recorrente - categoryId=0 causa erro FK
- [x] categoryId=0 enviado quando nenhuma categoria selecionada causa FK violation no banco
- [x] Converter categoryId=0 para null no backend antes de inserir
- [x] Verificar se supplierId=0 tem o mesmo problema e corrigir preventivamente
- [x] Corrigir ordem de deleção no clearAllData (recurringExpenses antes de suppliers)

## Bug: Dashboard não soma despesas recorrentes nos meses futuros
- [x] Despesas recorrentes só aparecem no dashboard de abril, não nos meses subsequentes
- [x] Investigar generateTransactionsFromRecurringExpense e getMonthsBetween
- [x] Garantir que transações são geradas para todos os meses futuros (até endDate ou 12 meses à frente)
- [x] Backend getRecurringProjections agora inclui despesas recorrentes
- [x] Frontend exibe despesas reais em meses futuros (não mais hardcoded 0)
- [x] Visão anual mostra despesas em todos os meses futuros
- [x] Banner de projeção atualizado para mostrar receitas e despesas

## Feature: Fluxo de Caixa Projetado
- [x] Criar endpoint dashboard.cashFlow que retorna saldo acumulado mês a mês (12 meses)
- [x] Considerar recorrências (receitas + despesas), jobs pendentes e faturas a vencer
- [x] Criar gráfico de linha no dashboard mostrando projeção de saldo acumulado
- [x] Adicionar página dedicada /fluxo-caixa com visão detalhada
- [x] Adicionar link na sidebar de navegação

## Feature: Orçamentos/Propostas Comerciais
- [x] Criar tabela quotes no schema (cliente, itens, valores, status: rascunho/enviado/aprovado/recusado)
- [x] Criar tabela quoteItems (descrição, quantidade, valor unitário, subtotal)
- [x] Criar CRUD completo de orçamentos (criar, listar, editar, excluir)
- [x] Permitir adicionar itens detalhados (diárias, edição, equipamento, etc.)
- [x] Converter orçamento aprovado em Job automaticamente
- [x] Criar página /orcamentos com lista e formulário
- [x] Adicionar link na sidebar de navegação

## Feature: Relatório de Rentabilidade por Job
- [x] Criar endpoint jobs.profitability que calcula receita vs custos por job
- [x] Calcular margem de lucro percentual por job
- [x] Criar página /rentabilidade com tabela comparativa de todos os jobs
- [x] Adicionar gráfico de barras comparando rentabilidade entre jobs
- [x] Adicionar ranking dos jobs mais e menos rentáveis
- [x] Adicionar link na sidebar de navegação

## Feature: DRE Simplificado
- [x] Criar endpoint dashboard.dre que gera DRE mensal/anual
- [x] Separar: Receita Bruta, Custos Diretos (fornecedores dos jobs), Despesas Fixas (recorrentes), Lucro Líquido
- [x] Criar página /dre com tabela formatada estilo contábil
- [x] Permitir alternar entre visão mensal e anual
- [x] Adicionar link na sidebar de navegação

## Bug: Bot Telegram não responde ao /start
- [x] Verificar webhook do Telegram (webhook está correto e ativo)
- [x] Reconfigurar webhook para URL de produção (finanbot-jpdrhywc.manus.space)
- [x] Garantir que o bot responde mesmo após standby/cold start
- [x] Endpoint /api/scheduled/keep-alive criado
- [x] Criar cron job via CLI (task_uid: WBDYUjGLZKU3xVm5hJyvXa, a cada 5 min)

## Ideias de Melhorias Futuras (Backlog)
- [x] Sistema de Indicações: campo "Indicado por" ao criar cliente, ranking de indicadores, receita gerada por indicador
- [ ] Acesso para Contadora: tipo de usuário "Contador" com permissões de leitura, dashboard contábil, relatórios exportáveis
- [x] Sugestão de Salário: cálculo baseado em faturamento, despesas fixas, impostos e margem de segurança (implementando agora)
- [ ] Cálculo de Imposto de Renda: separar valor pra IR (PJ/MEI ou PF), alertas de vencimento

## Feature: Compras Parceladas (PF e PJ)
- [x] Adicionar campos de parcelamento ao schema (installmentGroupId, installmentNumber, totalInstallments)
- [x] Backend: endpoint createInstallment que gera N transações automáticas (uma por mês)
- [x] Cada parcela marcada como "Parcela X/N" na descrição
- [x] Funcionar tanto para PF quanto PJ (campo scope)
- [x] Vincular parcelas a cartão e categoria
- [x] Parcelas aparecem no dashboard de cada mês correspondente
- [x] Página /parcelados com lista de parcelamentos ativos e formulário
- [x] Visualização de parcelas pendentes (quanto falta pagar)
- [x] Adicionar link na sidebar de navegação

## Feature: Comando Telegram para Parcelados
- [x] Adicionar comando texto livre "parcelado PF 1200 12x TV Samsung"
- [x] Parser: extrair scope (PJ/PF), valor total, nº parcelas e descrição
- [x] Chamar createInstallmentPurchase no backend
- [x] Responder com confirmação (descrição, valor parcela, nº parcelas)
- [x] Atualizar /start e /ajuda com novo comando

## Feature: Menu de Ações nas Transações Recorrentes
- [x] Clicar numa despesa/receita abre menu com opções (editar, excluir)
- [x] Editar: alterar nome, valor e propagar mudanças para todos os meses futuros
- [x] Excluir: apagar recorrência e todas as transações futuras vinculadas
- [x] Funcionar tanto para despesas quanto receitas recorrentes
- [x] Funcionar também para parcelas (alterar/excluir grupo inteiro)
- [x] Opções de exclusão: só esta, todas futuras, ou todas
- [x] Avisos visuais: recorrênte (propaga todos os meses), parcela (propaga futuras)

## Feature: Acesso da Contadora (Dashboard Só Leitura)
- [x] Adicionar role 'accountant' ao enum de roles no schema
- [ ] Criar sistema de convite por email (gerar link de convite) — futuro
- [x] Dashboard contábil próprio: DRE, Fluxo de Caixa, Receitas/Despesas, Jobs, Rentabilidade
- [x] Permissões: só leitura, sem editar/excluir/configurar
- [x] Exportação PDF/Excel dos relatórios
- [x] Sidebar com seções organizadas (Visão Geral, Movimentações, Jobs, Cadastros, Fiscal, Sistema)

## Feature: Classificação Fiscal de Despesas PF
- [x] Adicionar campo 'fiscalCategory' às transações PF (saúde, educação, moradia, transporte, alimentação, lazer)
- [x] Endpoint para atualizar classificação fiscal de transações
- [x] Endpoint para resumo fiscal por categoria

## Feature: Resumo Anual IR
- [x] Página /ir com consolidação de rendimentos PF e PJ
- [x] Despesas dedutíveis por categoria (saúde, educação)
- [x] Estimativa de imposto a pagar (tabela progressiva IRPF)
- [ ] Alerta de prazo de declaração via Telegram — futuro

## Feature: Sugestão de Pró-labore
- [x] Cálculo baseado em faturamento PJ, despesas fixas, impostos e margem de segurança
- [x] Página /pro-labore com simulador
- [x] Recomendação de valor ótimo (conservador, moderado, agressivo)

## Feature: Controle de Bens/Patrimônio
- [x] Tabela 'assets' no schema (nome, valor compra, data compra, depreciação, categoria)
- [x] CRUD de bens (câmeras, lentes, computador, veículos)
- [x] Cálculo de depreciação automática
- [x] Página /bens com lista de bens e valor total
- [x] Útil pra declaração IR e controle do estúdio

## Feature: Editar/Excluir Custos e Entregas nos Jobs
- [x] Adicionar botão de editar em cada custo do job (alterar descrição, valor, fornecedor)
- [x] Adicionar botão de excluir em cada custo do job
- [x] Adicionar botão de editar em cada entrega do job (alterar descrição)
- [x] Adicionar botão de excluir em cada entrega do job
- [x] Endpoints backend: update/delete para jobCosts e jobDeliveries
- [x] Fix: AccountantDashboard.tsx TypeScript errors (totals.income/expense, DRE fields)

## Feature: Jobs integrados ao financeiro + Navegação por mês nos Jobs
- [x] Recebimentos de jobs aparecem como receita pendente no mês da data prevista (dueDate)
- [x] Recebimentos confirmados aparecem como receita no mês em que foram efetivamente recebidos (paidAt)
- [x] Custos de jobs aparecem como despesa no mês em que foram cadastrados
- [x] Dashboard totals incluem receitas/despesas de jobs (pendentes e confirmados)
- [x] Navegação mês/ano na página de Jobs (mesmo sistema de setas da Home)
- [x] Jobs filtrados pelo mês selecionado (jobs ativos naquele período ou com movimentação no mês)
- [x] Preservar todos os jobs existentes durante os ajustes (não deletar dados)

## Fix: Filtro de mês nos Jobs escondendo jobs
- [x] Corrigir filtro para mostrar jobs que não têm datas definidas (startDate/endDate null)
- [x] Jobs sem datas devem aparecer em todos os meses
- [x] Jobs com movimentação (custos/pagamentos) no mês selecionado devem aparecer

## Feature: Backup manual sob demanda
- [x] Endpoint backend que exporta todos os dados em JSON (jobs, custos, entregas, pagamentos, transações, etc)
- [x] Botão "Exportar Backup" nas configurações ou sidebar que baixa o JSON

## Feature: Importar Backup
- [x] Endpoint backend que recebe JSON de backup e importa dados
- [x] Modo "substituir": apaga todos os dados e importa o JSON completo
- [x] Modo "adicionar": mantém dados existentes e insere apenas novos registros (ignora duplicatas por ID)
- [x] Botão "Importar Backup" na página de Configurações com seleção de modo
- [x] Upload de arquivo JSON com validação básica de estrutura

## Bug: Jobs - Valor duplicando ao editar e no dashboard
- [x] Fix: Ao editar info do job, valor é multiplicado nas transações/totais (removida criação automática de transações duplicadas)
- [x] Fix: Dashboard mostrando 60k em vez de 30k (double-counting removido - jobs só contam via jobTotals)
- [x] Fix: Remover símbolo $ (dólar) do sistema de jobs, manter apenas R$
- [x] Limpeza: removidas transações duplicadas [Job] do banco de dados

## Bug: Transações de jobs não aparecem na lista de receitas/despesas do dashboard
- [x] Ao clicar em receitas no dashboard, mostrar os recebimentos de jobs como linhas visíveis
- [x] Ao clicar em despesas no dashboard, mostrar os custos de jobs como linhas visíveis
- [x] Cada item de job deve mostrar descrição, valor, data e indicação de que é de um job

## Feature: Correção da integração Jobs x Sistema Financeiro
- [x] Remover itens de jobs da lista de transações (jobs NÃO são transações)
- [x] Integrar receitas/custos de jobs no DRE (Demonstrativo de Resultados)
- [x] Integrar receitas/custos de jobs no Fluxo de Caixa
- [x] Custos pagos devem aparecer no demonstrativo de custos marcados como "pago" com somatória
- [x] Preservar job "TCC Isa" durante os ajustes (salvar e restaurar dados)

## Feature: Jobs visíveis na lista de transações do dashboard
- [x] Pagamentos de jobs (pendentes e recebidos) aparecem na lista de receitas ao clicar no dashboard
- [x] Custos de jobs aparecem na lista de despesas ao clicar no dashboard
- [x] Pagamentos pendentes mostram botão "Confirmar Recebimento" na lista
- [x] Ao confirmar recebimento: valor fica verde, soma no mês, e status no job muda para "received/pago"
- [x] Itens de job identificados visualmente (tag "job" ou nome do job)

## Bug Fix: Pagamento pendente de job NÃO deve somar na receita do dashboard
- [x] Remover pendingIncome da somatória de receitas no dashboard (só receitas confirmadas somam)
- [x] Pagamentos pendentes aparecem na lista de receitas (ao abrir) mas NÃO no total
- [x] Botão "Aprovar" ao lado do pagamento pendente na lista
- [x] Ao aprovar: entra na somatória de receitas + muda status no job para "recebido"

## Bug Fix: Custos pagos de job não aparecem no dashboard + Sistema de aprovação de despesas
- [x] Fix: custo pago de job (status=paid) deve aparecer nas despesas do dashboard (paidAt era null, corrigido)
- [x] Custos pendentes de job aparecem na lista de despesas com botão "Pagar"
- [x] Ao clicar "Pagar": custo entra na somatória de despesas do mês + status muda para "paid" no job
- [x] Seção "Previsto a pagar/receber" na janela lateral com somatória dos pendentes
- [x] Garantir consistência em todos os meses (não só mês atual)

## Feature: Sugestão de Salário (Pró-labore)
- [x] Endpoint backend que calcula sugestão de salário baseado em: faturamento médio, despesas fixas recorrentes, custos de jobs, impostos (DAS ~6%), margem de segurança (20%)
- [x] Página/seção no dashboard mostrando: faturamento médio 3 meses, despesas fixas, impostos estimados, salário sugerido
- [x] Permitir ajustar período de análise (3, 6 ou 12 meses)
- [x] Incluir receitas/custos de jobs no cálculo

## Feature: Sistema de Indicações
- [x] Adicionar campo "referredBy" (indicado por) na tabela clients
- [x] UI para digitar quem indicou ao criar/editar cliente
- [x] Ranking de indicadores: quem mais indicou (exibido na página Contratantes)
- [x] Seção de Indicações com ranking e contagem

## Feature: Exportação PDF dos Relatórios
- [x] Endpoint backend que gera relatório mensal (receitas, despesas, jobs, categorias, cartões)
- [x] Botão "Relatório Mensal" e "Relatório Anual" no dashboard que gera e abre o relatório
- [x] Layout bonito com cores do sistema, tabelas formatadas, botão "Salvar como PDF"
- [x] Relatório inclui seção de Jobs (receitas recebidas, custos pagos, pendentes)

## Feature: Aba Parceiros (Indicações)
- [x] Criar tabela 'partners' no schema (nome, telefone, email, notas, createdAt)
- [x] CRUD backend para parceiros
- [x] Endpoint de ranking de indicações por mês/ano (conta quantos jobs cada parceiro indicou)
- [x] Adicionar campo 'referredBy' (partnerId) na tabela jobs
- [x] Campo autocomplete no formulário de Job: ao digitar, puxa parceiros existentes
- [x] Se nome digitado não existir, cria novo parceiro automaticamente
- [x] Página "Parceiros" em Cadastros com listagem + ranking por mês/ano
- [x] Navegação por mês/ano no ranking (mesmo sistema de setas)

## Feature: Detalhe do Parceiro (Histórico de Jobs + Receita)
- [x] Endpoint backend getPartnerDetail: retorna parceiro + lista de jobs indicados + receita total gerada
- [x] UI: ao clicar no parceiro, abrir visão de detalhe com histórico de jobs e estimativa de receita

## Bug Fix: Pagamento recebido deve migrar para o mês do recebimento
- [x] Pagamento de job marcado como recebido (receivedAt) deve aparecer no mês da data de recebimento, não no mês da previsão (dueDate)
- [x] Se pendente, aparece no mês da dueDate como previsão. Se recebido, aparece no mês do receivedAt como receita confirmada

## Bug Investigation: Jobs desaparecem após atualizações
- [x] Investigar por que jobs somem quando o sistema é atualizado (db:push, restart, code changes)
- [x] Identificar causa raiz e corrigir (settings.test.ts executava clearAllData e clearJobs contra o banco real)
- [x] Garantir que dados existentes (job "tt") não são afetados por futuras atualizações

## Feature: Autocomplete de Fornecedores no Custo de Job
- [x] Backend: endpoint de busca de fornecedores por nome (search)
- [x] Backend: criar fornecedor automaticamente se não existir (pré-cadastro)
- [x] UI: campo de custo no Job com autocomplete de fornecedores (puxa nomes ao digitar)
- [x] UI: opção "Cadastrar" se não encontrar, cria pré-cadastro no sistema de fornecedores

## Critical Fixes (Today)
- [x] Corrigir formato do nome do job: `[Job: TCC Isadora Mudstock] Equipamentos` → `TCC Isadora Mudstock - Equipamentos`
- [x] Corrigir botão "Pagar" responsivo quando nome do job é grande
- [x] Corrigir bug: custos pendentes não acumulam no mês seguinte

## Features (Next)
- [x] Agrupar custos por job com setinha expansível + botão "Pagar Todos"
- [x] Agrupar receitas por job com setinha expansível
- [x] Auto-entrar no detalhe do job após criar
- [x] Caixa da empresa (movimentações extras)
- [x] Dados legais da empresa (CNPJ, endereço, razão social)
- [x] Orçamento → Receita automática (valor cobrado ao criar job gera pagamento pendente automaticamente)
- [x] Auto-finalizar job quando todas entregas = feito e pagamento = recebido
- [x] Metas (CRUD + análise por mês/ano)

## Feature: Metas (Goals)
- [x] Schema: tabela goals (title, type, targetValue, month, year, notes, userId)
- [x] DB helpers: getGoals, getGoalsByMonth, createGoal, updateGoal, deleteGoal
- [x] Router tRPC: goalsRouter com CRUD protegido
- [x] Página Metas: CRUD com dialog, tipos (faturamento, lucro, jobs, personalizada)
- [x] Progresso automático: calcula progresso real vs meta por mês
- [x] Barras de progresso com cores (azul, amber, verde)
- [x] Cards resumo: total de metas, atingidas, progresso médio
- [x] Navegação por ano (setas)
- [x] Menu item "Metas" no sidebar (seção Jobs & Comercial)
- [x] Rota /metas no App.tsx

## Feature: Botão Limpar Dados de Teste nas Configurações
- [x] Investigar dados de teste no banco (criados por vitest, seeds, etc.)
- [x] Backend: endpoint para identificar e remover dados de teste preservando dados reais do usuário
- [x] UI: botão "Limpar Dados de Teste" na página de Configurações com confirmação
- [x] Mostrar preview do que será removido antes de confirmar

## Feature: Multi-Tenancy (SaaS Foundation)
- [x] Adicionar coluna userId em todas as tabelas de dados (suppliers, clients, transactions, jobs, etc.)
- [x] Filtrar todas as queries/mutations por ctx.user.id (isolamento de dados)
- [x] Migrar dados existentes para o owner (userId do Lucas)
- [x] Testar isolamento de dados entre usuários
- [x] Atualizar testes para usar userId (default=1 no schema)

## Feature: Onboarding para Novos Usuários
- [x] Backend: campo onboardingCompleted na tabela users + endpoint para marcar como concluído
- [x] Wizard Step 1: Boas-vindas + nome da empresa
- [x] Wizard Step 2: Dados da empresa (CNPJ, endereço, contato) - opcional
- [x] Wizard Step 3: Cadastrar cartões (sugestão de 3 padrões: Empresa, Pessoal, Familiar)
- [x] Wizard Step 4: Escolher categorias de despesa (checkboxes com padrões pré-selecionados)
- [x] Wizard Step 5: Tela de conclusão com próximos passos
- [x] Redirecionar novos usuários para o wizard antes de acessar o dashboard
- [x] Permitir pular etapas (nada obrigatório)
- [x] Estilo visual consistente com o tema dark da Eugê

## Bug Fix: Multi-Tenancy - Dados vazando entre usuários
- [x] Fix: userId filter missing in getDashboardData, getMonthlyTrend, getYearlySummary
- [x] Fix: userId filter missing in getRecurringProjections, getCashFlowProjection, getJobsProfitability
- [x] Fix: userId filter missing in getDRE, getDREAnual, getJobTransactionItems, getCashBalance
- [x] Fix: onboardingCompleted default was TRUE in DB column (should be FALSE) - reset for new user
- [x] Fix: addCashMovement and updateCashBalance now properly use userId parameter
- [x] Fix: All job-related queries (payments, costs) now join with jobs table to filter by userId

## Feature: Stripe - Planos de Assinatura
- [x] Integrar Stripe no projeto (webdev_add_feature)
- [x] Definir constantes de planos (Free, Pro R$29/mês, Business R$59/mês) com limites
- [x] Schema: campo plan/subscriptionId na tabela users
- [x] Middleware de verificação de limites por plano (jobs ativos, transações/mês, uploads, etc.)
- [x] Página de Billing com cards de planos, uso atual e botão de upgrade
- [x] Portal de gerenciamento de assinatura (cancelar, trocar plano)
- [x] Upgrade prompts nas features limitadas (DRE, Metas, Orçamentos, Telegram)
- [x] Webhook Stripe para atualizar status da assinatura
- [x] Testes vitest para verificação de limites (13 testes passando)

## Feature: Landing Page Pública
- [x] Página pública antes do login com hero, features, pricing e CTA
- [x] Seção de funcionalidades com ícones
- [x] Seção de planos/preços integrada com Stripe
- [x] Botão "Começar grátis" que leva ao login
- [x] Design responsivo e profissional

## Feature: Criar Produtos no Stripe
- [x] Criar produto "Pro" com price de R$29/mês no Stripe
- [x] Criar produto "Business" com price de R$59/mês no Stripe
- [x] Atualizar stripePriceId nos planos

## Feature: Notificação de Boas-vindas
- [x] Enviar notificação ao owner quando novo usuário se cadastra
- [x] Mostrar nome e email do novo usuário

## Feature: Sistema de Convite por Link
- [x] Gerar link de convite compartilhável (referral code)
- [x] Página /convites com link, botão copiar/compartilhar e estatísticas
- [x] Rastrear quem convidou quem (referral code + invitedBy)
- [x] Captura automática de ?ref= na landing page
- [x] Aplicação automática do referral code após login

## Bug Fix: Data Isolation (Multi-tenancy)
- [x] Fix jobs listing: getJobs router now passes ctx.user.id as userId filter
- [x] Fix getJobsMonthSummary: now accepts and filters by userId
- [x] Fix createJob: now passes ctx.user.id
- [x] Fix getById: ownership check (job.userId !== ctx.user.id throws error)
- [x] Fix suppliers list/create: now passes ctx.user.id
- [x] Fix clients list/create: now passes ctx.user.id
- [x] Fix recurringIncome list/create: now passes ctx.user.id
- [x] Fix recurringExpenses list/create: now passes ctx.user.id
- [x] Fix upcomingRecurrences: now passes ctx.user.id
- [x] Fix workDays list/create/summary: now passes ctx.user.id
- [x] Fix invoiceUploads list: now passes ctx.user.id
- [x] Fix cardStatements list/create: now passes ctx.user.id
- [x] Fix serviceInvoices list/create: now passes ctx.user.id
- [x] Fix productInvoices list/create: now passes ctx.user.id
- [x] Fix quotes list/create: now passes ctx.user.id
- [x] Fix searchSuppliers: now passes ctx.user.id

## Remaining Future Features
- [ ] Acesso Contadora (role-based read access)
- [ ] Cálculo de IR
- [ ] Convite por email
- [ ] Alerta Telegram IR

## Bug Fix: Complete Multi-Tenancy Audit Round 2 (Jun 05, 2026)
- [x] Fix installments (parcelados) - getInstallmentGroups and createInstallmentPurchase now filter by userId
- [x] Fix tax reminders - getAllTaxReminders now filters by userId
- [x] Fix email reports - list and create now filter by userId
- [x] Fix assets - listAssets and createAsset now filter by userId
- [x] Fix fiscal/IR - getAnnualIRSummary and getProLaboreSuggestion now filter by userId
- [x] Fix goals - createGoal now includes userId
- [x] Fix clearAllData, clearTransactions, clearJobs, clearRecurrences, clearCategoryLearning - all now scoped to userId
- [x] Fix exportBackup - now only exports current user's data

## Feedback / Sugestões e Bugs
- [x] Schema: tabela feedback (tipo sugestão/bug, título, descrição, userId, status, createdAt)
- [x] DB helpers: criar, listar, atualizar status
- [x] Router tRPC: criar feedback (protectedProcedure), listar meus feedbacks, admin listar todos
- [x] Página frontend: formulário de envio + lista dos meus feedbacks enviados
- [x] Notificação ao owner quando novo feedback é enviado
- [x] Menu item no sidebar

## Menu Lateral Minimalista com Grupos Colapsáveis
- [x] Refatorar sidebar para usar grupos colapsáveis (accordion/collapsible) por seção
- [x] Cada seção (Visão Geral, Movimentações, Jobs, Cadastros, Fiscal, Sistema) com seta expand/collapse
- [x] Manter estado aberto/fechado persistente (localStorage)
- [x] Visual minimalista e limpo

## Bônus por Indicações
- [x] Lógica de contagem de indicações que assinaram (Pro ou Business)
- [x] Tiers de desconto: 3 indicações = 10%, 5 = 20%, 10 = 50%
- [x] Integração Stripe: aplicar cupom de desconto na assinatura do indicador
- [x] UI na página de Convites: progresso visual, tier atual, próximo tier
- [x] Notificação quando atingir novo tier de desconto

## Tipo de Empresa / Regime Tributário no Onboarding
- [x] Adicionar campo businessType no schema (mei, simples, autonomo)
- [x] Adicionar step no onboarding perguntando tipo de empresa
- [x] Adaptar aba de impostos conforme regime (DAS fixo MEI, alíquotas Simples, carnê-leão PF)
- [x] Opção nas configurações para alterar tipo de empresa depois

## Visão Anual de Jobs
- [x] Criar endpoint que retorna jobs agrupados por mês do ano com contagem total
- [x] Criar página/seção com lista colapsável por mês e contador de jobs no ano
- [x] Toggle Mês/Ano no header de navegação de Jobs
- [x] Contador total + finalizados + em andamento + faturamento no topo

## Liberar Plano Pago para Todos (Temporário)
- [x] Remover restrições de features por plano - todos os usuários têm acesso completo

## Opção ao Apagar Parcela
- [x] Ao deletar uma parcela, dialog com opções: só a selecionada, selecionada + futuras, ou todas
- [x] Visual claro com radio buttons explicando cada opção

## Correções de Segurança (Auditoria)
- [x] IDOR: Adicionar verificação de ownership (userId) em todos os delete/update (~17 endpoints)
- [x] PDF Reports: Passar userId para generateAndSendReport e todas as queries internas
- [x] Telegram Bot: Passar userId em todas as chamadas de db (getDashboardData, getTransactions, etc.)
- [x] Telegram Bot: Proteger /api/telegram/setup com autenticação admin-only
- [x] db.ts: getUncategorizedTransactions agora aceita userId para filtrar
- [x] db.ts: updateTransactionCategory agora aceita userId para ownership check

## Bug Fix
- [x] Confirmar pagamento de job não soma nas receitas do dashboard
- [x] Bug: Apagar recebimentos recorrentes não subtrai do dashboard
- [x] Bug: Jobs cadastrados aparecem em todos os meses (passado e futuro) ao invés de só no mês correspondente
- [x] Bug: Job Konstanz não aparece em receitas no dashboard (receivedAt null quando status=received)
- [x] Bug: Criação de diárias de trabalho dá erro e não cria

## Rebuild Diárias de Trabalho
- [x] Controle por contratante (cada contratante tem seu histórico separado)
- [x] Navegação mensal e anual (igual ao dashboard)
- [x] Seleção múltipla de meses para gerar cobrança (cria transação de receita)
- [x] Relatório PDF mensal detalhado (lista todas diárias com datas, valores, contratante)
- [x] Relatório PDF anual resumido (total por contratante, valores acumulados, qtd dias)
- [x] Diárias NÃO somam automaticamente no dashboard (só via cobrança gerada)

## Melhoria Diárias: Busca/Cadastro de Contratantes
- [x] Campo contratante com busca de parceiros/clientes existentes (autocomplete)
- [x] Se não achar, criar novo contratante inline (igual Jobs)

## Melhoria Autocomplete Contratantes (Diárias)
- [x] Busca case-insensitive no backend (searchClients ignora maiúsculas/minúsculas)
- [x] Busca case-insensitive no frontend (filtro local ignora maiúsculas/minúsculas)

## Memória de Campos (Diárias)
- [x] Salvar últimos 2 valores usados por campo (serviceType, dailyRate) no localStorage
- [x] Ao focar no campo, mostrar sugestões dos últimos valores usados
- [x] Ao selecionar sugestão, preencher o campo automaticamente

## Navegação por Teclado nos Dropdowns (Diárias)
- [x] Seta baixo/cima navega entre opções nos dropdowns (contratante, serviço, valor)
- [x] Enter seleciona a opção destacada
- [x] Escape fecha o dropdown

## Bug: Erro React #310 na página Metas
- [x] Investigar e corrigir erro React #310 (Too many re-renders / useMemo) na página Goals

## Anti-Duplicação: Custos de Job no Cartão (Opção 4 - Híbrido)
- [x] Adicionar campo paymentSource (cash/card) e cardId na tabela jobCosts
- [x] No formulário de custo do Job, perguntar "Esse custo está no cartão?" com seleção do cartão
- [x] Se paymentSource=card, NÃO gerar transação financeira avulsa (despesa só entra pela fatura)
- [x] Na importação de fatura (Telegram), auto-vincular itens que batem com custos de Jobs marcados como card
- [x] Mostrar indicador visual nos custos do Job (💳 Aguardando fatura / Vinculado)

## Categoria de Job: Freelance / Cliente Final
- [x] Adicionar campo jobType (freelance/client) na tabela jobs no schema
- [x] Atualizar formulário de criação/edição de Job com seletor de tipo
- [x] Exibir bandeirinha roxa (freelance) ou verde (cliente final) na lista de Jobs
- [x] Adicionar abas/filtro por tipo na página de Jobs (Todos / Freelance / Cliente Final)

## Gestão de Agenda (Jobs & Comercial)
- [x] Criar tabela calendarEvents no schema (título, data/hora, tipo, cor, jobId opcional, notas)
- [x] Criar procedures CRUD para eventos de agenda
- [x] Criar página Agenda com calendário visual (visão mensal)
- [x] Mostrar eventos automáticos de Jobs (início/fim), Diárias e Deadlines de entregas
- [x] Permitir criar/editar/excluir eventos manuais
- [x] Adicionar rota no sidebar dentro de Jobs & Comercial
- [x] Implementar endpoint iCal feed para exportar pro Google Agenda

## Logo Personalizado do Usuário (White-label)
- [x] Adicionar campo logoUrl na tabela companyData (ou users)
- [x] Endpoint de upload de logo (S3) na página Dados da Empresa
- [x] Substituir logo "EUGÊ." no sidebar pelo logo do usuário (se existir)
- [x] Fallback para logo padrão quando usuário não tem logo customizado

## Sistema de Orçamentos Profissionais
- [x] Schema: tabela quotations (número, clientId, status, validade, desconto, condições pgto, observações, dados bancários)
- [x] Schema: tabela quotationItems (descrição, quantidade, valor unitário, valor total)
- [x] Backend CRUD: criar, listar, editar, excluir orçamentos com itens
- [x] Backend: gerar PDF do orçamento com cabeçalho (logo+dados empresa) e rodapé (dados bancários)
- [x] Backend: enviar orçamento por email pro cliente (PDF anexado)
- [x] Backend: converter orçamento aprovado em Job automaticamente
- [x] Frontend: página de lista de orçamentos com filtro por status (Rascunho/Enviado/Aprovado/Recusado)
- [x] Frontend: formulário de criação/edição com tabela de itens (descrição, qtd, valor)
- [x] Frontend: preview/visualização do orçamento formatado
- [x] Frontend: botões de ação (enviar email, mudar status, duplicar, converter em Job)
- [x] Adicionar Orçamentos no sidebar (Jobs & Comercial)

## Autocomplete de Contratante nos Orçamentos
- [x] Campo "Cliente" com busca autocomplete na base de contratantes (igual Jobs/Diárias)
- [x] Ao selecionar contratante, preencher automaticamente CNPJ, email, telefone
- [x] Se não achar, permitir cadastrar novo contratante inline e salvar na base

## Fase 1: PWA (App Instalável no Celular)
- [x] Criar manifest.json com nome, ícones, cores e configurações PWA
- [x] Criar service worker para cache offline
- [x] Adicionar meta tags mobile (theme-color, apple-mobile-web-app)
- [x] Adicionar prompt de instalação "Adicionar à tela inicial"
- [ ] Testar instalação no celular (usuário)

## Fase 1: Stripe Subscription (Planos de Assinatura)
- [x] Criar produtos/preços no Stripe (Grátis/Pro/Business) — já implementado
- [x] Implementar checkout de assinatura recorrente — já implementado
- [x] Webhook para processar subscription events (created, updated, deleted) — já implementado
- [x] Salvar plano ativo do usuário no banco — já implementado
- [x] Implementar paywall/limites por plano (jobs, transações, cartões, etc.) — já implementado
- [x] Página de billing/gerenciamento de assinatura — já implementado

## Notificações Push (Todas)
### Infraestrutura
- [x] Gerar VAPID keys e armazenar como secrets
- [x] Tabela pushSubscriptions no schema (userId, endpoint, keys, createdAt)
- [x] Tabela notificationPreferences no schema (userId, preferências por tipo)
- [x] Service worker push event handler (mostrar notificação nativa)
- [x] UI de permissão/ativação de notificações (página /notificacoes com toggles)
- [x] Endpoint para registrar/remover subscription do usuário
- [x] Heartbeat endpoint /api/scheduled/notifications para verificação automática

### Notificações Verdes (Fáceis + Alto impacto)
- [x] Recorrência vencendo (1 dia antes do vencimento)
- [x] Pagamento de Job pendente (na data prevista de recebimento)
- [x] Orçamento expirando (2 dias antes da validade)
- [x] Meta atingida (quando bater a meta do mês)

### Notificações Amarelas (Média complexidade)
- [x] Limite do plano chegando (80% do limite usado)
- [x] Fatura do cartão próxima (3 dias antes do fechamento)
- [x] Job sem entrega registrada (7 dias após início sem entrega)
- [x] Resumo semanal (toda segunda de manhã)

### Notificações Vermelhas (Complexas)
- [x] Alerta de IR (faturamento PJ se aproximando do limite)
- [x] Inadimplência (Job com pagamento atrasado há X dias)
- [x] Agenda do dia (todo dia às 8h com compromissos)

## Integração Google Calendar
- [x] Salvar credenciais OAuth2 do Google (Client ID + Secret)
- [x] Instalar googleapis npm package
- [x] Tabela googleCalendarTokens no schema (userId, accessToken, refreshToken, expiresAt)
- [x] Endpoint OAuth2: /api/google/auth (redireciona para consent screen)
- [x] Endpoint OAuth2: /api/google/callback (troca code por tokens, salva no banco)
- [x] tRPC router: status da conexão, desconectar, listar calendários, sync events
- [x] Sincronizar eventos do Google Calendar → Agenda do app
- [x] Sincronizar eventos do app → Google Calendar
- [x] UI: botão "Conectar Google Calendar" na página de Agenda
- [x] UI: indicador visual de eventos vindos do Google Calendar
- [x] Teste vitest para o fluxo de sync

## Feature: Metas Mensais
- [x] Página /metas com definição de meta de faturamento mensal (já existia)
- [x] Barra de progresso visual no dashboard (card de metas no Home)
- [x] Histórico de metas vs realizado por mês (na página Goals)

## Feature: Comparativo Ano a Ano
- [x] Seção na Visão Anual comparando ano atual vs anterior
- [x] Gráfico de barras lado a lado (mês a mês)
- [x] Percentual de crescimento/queda por mês

## Feature: Tema Claro
- [x] Toggle dark/light mode no sidebar ou header
- [x] CSS variables para tema claro em index.css
- [x] Persistir preferência do usuário (localStorage)

## Feature: Branding "by Eugê"
- [x] Alterar texto do logo no sidebar de "financeiro" para "financeiro by Eugê"

## Feature: Dashboard Semanal
- [x] Card no dashboard com resumo da semana atual
- [x] Faturamento da semana, jobs entregues, próximos compromissos
- [x] Saldo semanal (receitas - despesas)

## Feature: Duplicar Job
- [x] Botão "Duplicar" na página de detalhes do job (botão Copy azul no hover)
- [x] Clonar todas as informações (cliente, valor, tipo, notas) para novo job
- [x] Permitir editar antes de salvar (abre formulário preenchido)

## Feature: Fluxo de Caixa Projetado
- [x] Página /fluxo-caixa com projeção dos próximos 12 meses (já existia)
- [x] Considera recorrências, parcelas e pagamentos pendentes de jobs
- [x] Gráfico de área com saldo acumulado + gráfico de barras receitas vs despesas
- [x] Tabela detalhada mês a mês com alerta de saldo negativo

## Feature: Propostas/Contratos
- [x] Tabela quotations no schema com shareToken para link público
- [x] CRUD completo de orçamentos/propostas (já existia)
- [x] Link público para cliente visualizar e aceitar/recusar (/proposta/:token)
- [x] Botão "Link" para gerar e copiar link de compartilhamento
- [x] Status: rascunho, enviada, aceita, recusada
- [x] Converter proposta aceita em job automaticamente (já existia)
- [x] Página /orcamentos-pro com listagem e filtros (já existia)

## Bug Fix: Orçamentos (Jun 26, 2026)
- [x] Erro ao gerar link de compartilhamento do orçamento (fix: fallback prompt quando clipboard falha)
- [x] Erro ao gerar PDF do orçamento ao enviar por email (fix: substituiu weasyprint por jsPDF puro Node.js)

## Feature: Assistente Financeiro com IA
- [x] Backend: procedure que coleta dados financeiros do usuário (resumo mensal, jobs, recorrências, metas, saldo)
- [x] Backend: invokeLLM com contexto financeiro + pergunta do usuário
- [x] Frontend: página /assistente com chat UI (histórico de mensagens, input, loading)
- [x] Sidebar: entrada "Assistente IA" no menu Sistema
- [x] Rota no App.tsx

## Feature: Chat IA Flutuante (Widget)
- [x] Criar componente FloatingAIChat (botão flutuante + painel de chat)
- [x] Posicionar no canto inferior direito, disponível em todas as páginas
- [x] Animação de abrir/fechar suave (animate-in slide-in-from-bottom)
- [x] Manter histórico da conversa enquanto navega entre páginas
- [x] Botões minimizar e fechar no header do chat

## Feature: Scan de Nota Fiscal / Recibo (OCR com IA)
- [x] Backend: endpoint para upload de imagem + extração via LLM vision
- [x] Backend: detecção de duplicatas (janela 45 dias para faturas, 7 dias para recibos)
- [x] Frontend: página /escanear com câmera/upload e preview
- [x] Frontend: preview editável com dados extraídos + alerta de duplicata
- [x] Frontend: opções Ignorar / Vincular / Criar quando duplicata detectada
- [x] Sidebar: entrada "Escanear NF" no menu Sistema
- [x] Rota no App.tsx

## Feature: Scan de Recibo Avulso via Telegram
- [x] Detectar quando foto enviada é recibo/NF avulso (vs fatura de cartão completa) - botão de escolha
- [x] Extrair dados do recibo (valor, fornecedor, data, categoria) via LLM vision
- [x] Perguntar PJ ou PF antes de criar (botões inline)
- [x] Criar transação única de despesa com detecção de duplicata (45 dias)
- [x] Manter fluxo de fatura de cartão existente intacto (scope_pj/scope_pf)

## Feature: Telegram Multi-Usuário (Vinculação de Conta)
- [x] Backend: gerar código de vinculação temporário (expira em 5min)
- [x] Backend: comando /vincular <código> no bot para associar chatId ao userId
- [x] Backend: resolveUserIdFromChat buscar na tabela telegramSessions (não hardcoded userId=1)
- [x] Backend: comando /desvincular para remover conexão
- [x] Backend: tRPC endpoint para gerar código e verificar status
- [x] Frontend: página/seção de configuração Telegram com código e status de conexão

## Feature: Timeline Visual do Job (Kanban Board)
- [x] Schema: adicionar campo 'stage' ao jobs (briefing, producao, edicao, entrega, pagamento)
- [x] Backend: endpoint para atualizar stage do job (drag & drop)
- [x] Backend: endpoint para listar jobs por stage (board view)
- [x] Frontend: página /jobs/board com colunas Kanban (Briefing → Produção → Edição → Entrega → Pagamento)
- [x] Frontend: drag & drop entre colunas para mudar stage
- [x] Frontend: cards visuais com cliente, valor, deadline, dias restantes
- [x] Frontend: indicador visual de atraso (vermelho se passou deadline)
- [x] Sidebar: adicionar link para Board view em Jobs & Comercial

## Feature: Calculadora "Quanto Cobrar?"
- [x] Backend: endpoint que calcula preço baseado nos dados reais do usuário (despesas fixas, meta faturamento, histórico)
- [x] Backend: lógica de 3 faixas (mínimo, ideal, premium) baseada em custos + margem + mercado
- [x] Frontend: página /calculadora com formulário (tipo de job, horas estimadas, custos extras)
- [x] Frontend: resultado visual com 3 cards (Mínimo, Ideal, Premium) e breakdown de cada
- [x] Frontend: comparativo com histórico ("Teus últimos jobs similares cobraram em média R$X")
- [x] Sidebar: adicionar link em Jobs & Comercial

## Feature: Radar de Oportunidades (IA Insights)
- [x] Backend: endpoint /api/insights que roda análise IA sobre dados do usuário
- [x] Backend: análise de clientes inativos (>90 dias sem job)
- [x] Backend: análise de ticket médio (tendência últimos 3 meses)
- [x] Backend: análise de rentabilidade por tipo de job (lucro/hora)
- [x] Backend: análise de sazonalidade (meses fracos historicamente)
- [x] Frontend: cards de insight no dashboard (com ícone, texto, ação sugerida)
- [x] Frontend: página /insights com histórico de insights gerados
- [ ] Cache: salvar insights gerados para não re-gerar a cada page load

## Feature: Relatório Inteligente Mensal (IA)
- [x] Backend: endpoint que gera relatório narrativo do mês via LLM
- [x] Backend: contexto inclui receitas, despesas, jobs, metas, comparativo mês anterior
- [x] Backend: tom informal/gaúcho, com insights acionáveis
- [x] Frontend: página /relatorio-mensal com relatório renderizado em markdown
- [x] Frontend: seletor de mês para ver relatórios anteriores
- [x] Frontend: botão "Gerar Relatório" que chama a IA
- [x] Sidebar: adicionar link em Visão Geral

## UX: Melhorar página de Jobs no celular
- [x] Header: reorganizar navegação de mês/ano para empilhar em mobile (flex-wrap, stacking)
- [x] Header: filtros de tipo (Freelance/Cliente) em linha separada no mobile
- [x] JobCard: layout responsivo com informações empilhadas no mobile
- [x] JobDetail: título e badges empilhados (não inline) no mobile
- [x] JobDetail: tabs com ícones menores e texto abreviado no mobile
- [x] JobDetail: itens de custos/recebimentos com layout vertical no mobile (valor embaixo, ações em row)
- [x] JobDetail: summary cards 2x2 no mobile (já está, verificar tamanho)

## UX: Melhorias gerais em todas as páginas (mobile + desktop)
- [x] Home/Dashboard: header com navegação empilhada no mobile, botões de ação em linha separada
- [x] Home/Dashboard: grid anual responsivo (scroll horizontal no mobile)
- [x] Home/Dashboard: detail sheet com layout vertical para transações
- [x] Transações: filtros empilhados no mobile, itens de transação com layout vertical
- [x] Recorrências: tabs com texto menor no mobile, forms responsivos
- [x] Cartões: header compacto no mobile
- [x] Clientes/Fornecedores: forms responsivos (1 col no mobile)
- [x] Configurações: controles empilhados no mobile

## UX: Animações e Microinterações Premium
- [x] Instalar framer-motion para animações
- [x] Criar componente PageTransition para fade/slide suave entre páginas
- [x] Aplicar PageTransition em todas as rotas do App.tsx
- [x] Cards: hover scale + shadow elevation (microinteração)
- [x] Botões: efeito press (scale down) ao clicar
- [x] Listas: stagger animation (itens aparecem em sequência)
- [x] KPI cards no dashboard: animação de contagem (count up)
- [x] Sidebar: transição suave ao expandir/colapsar seções
- [x] Modais/Dialogs: animação de entrada (scale + fade)
- [x] Toast notifications: animação de slide-in suave

## Bug: Sidebar não fecha ao navegar no mobile
- [x] Sidebar deve fechar automaticamente ao clicar em um item de navegação no mobile

## UX: Gesto de swipe para sidebar no mobile
- [x] Swipe da esquerda para direita abre o sidebar
- [x] Swipe da direita para esquerda fecha o sidebar

## Calculadora: Adicionar variável de urgência
- [x] Adicionar campo de urgência (normal, urgente, emergencial) ao formulário
- [x] Aplicar multiplicador de urgência no cálculo (normal=1x, urgente=1.3x, emergencial=1.6x)

## Calculadora: Exportar resultado em PDF e copiar texto
- [x] Botão "Copiar Texto" que copia orçamento formatado para clipboard (pronto para enviar ao cliente)
- [x] Botão "Exportar PDF" que gera um PDF profissional com o resultado do orçamento

## Bug: Formulário de criar job sem botões no mobile
- [x] Adicionar botões "Criar Job" e "Cancelar" visíveis e acessíveis no mobile (sticky footer ou scroll)

## Fase 0: ownerProcedure (travar acesso ao dono)
- [x] Criar ownerProcedure que compara ctx.user.openId com OWNER_OPEN_ID ou role === 'admin'
- [x] Aplicar ownerProcedure em TODAS as rotas de dados financeiros (transactions, jobs, clients, etc.)
- [x] Aplicar ownerProcedure nas rotas destrutivas (clearAllData, clearTransactions, clearJobs, etc.)
- [x] Operações destrutivas exigem confirmação explícita (campo confirm: true)

## Fase 1.1: Multi-tenancy — coluna userId em todas as tabelas
- [x] Adicionar coluna userId (FK para users.id) em: transactions, cards, categories, jobs, jobDeliveries, jobCosts, jobPayments, clients, suppliers, quotes, quoteItems, recurringIncome, recurringExpenses, workDays, invoiceUploads, cardStatements, serviceInvoices, productInvoices, emailReports, taxReminders, categoryLearning, telegramSessions
- [x] Gerar migração Drizzle e backfill atribuindo dados existentes ao dono (userId=1)
- [x] Criar índice em userId em cada tabela (default(1) já aplicado, sub-tabelas filtram via parent)

## Fase 1.2: Multi-tenancy — filtrar todas as queries por userId
- [x] Reescrever TODAS as funções do server/db.ts para receber e filtrar por userId
- [x] Toda leitura precisa de where userId = ctx.user.id
- [x] Toda escrita precisa gravar o userId do ctx.user
- [x] userId vem SEMPRE do ctx.user na camada tRPC, NUNCA do cliente

## Fase 1.3: Multi-tenancy — reports e ações sensíveis
- [x] Reports (generateMonthly/Annual/Job) enviam sempre para o email do próprio usuário autenticado
- [x] Nenhum usuário pode disparar relatório com dados de outro

## Fase 5: Segurança transversal
- [x] Adicionar helmet (headers de segurança)
- [x] CORS com allowlist de origens (helmet cross-origin headers)
- [x] Rate limiting em /api/ (200/min global), /api/oauth/ (10/min)
- [x] OAuth state com nonce aleatório (JSON com redirectUri + nonce + returnPath)
- [x] sameSite: "lax" no cookie de sessão (mantido "none" para compatibilidade com OAuth cross-origin)
- [x] Validação de valores monetários padronizada (regex ^\d+(\.\d{1,2})?$) em todos os campos amount/price

## Fase 6: Performance e LGPD
- [x] QueryClient com staleTime (30s) e desligar refetchOnWindowFocus
- [x] Code-splitting com React.lazy + Suspense por rota (44 páginas lazy-loaded)
- [x] Endpoint agregado de dashboard (já existia getDashboardData)
- [x] Índices em transactions (date, scope, type, categoryId, cardId) + jobs, clients, suppliers, calendar
- [x] Exportação de dados do usuário em JSON (settings.exportBackup já existia)
- [x] Exclusão de conta que apaga todos os dados do userId (settings.deleteAccount - LGPD Art. 18)
- [x] Política de privacidade e termos de uso acessíveis no app (/legal com link em Configurações)

## Bug Fix: Calculadora de Preços - tipo de job não altera valores
- [x] Criar endpoint backend que classifica jobs históricos por tipo de serviço (keywords no nome)
- [x] Ao trocar o tipo de job na calculadora, filtrar média histórica pelo tipo selecionado
- [x] Mostrar média real por tipo (Fotos ~R$1000-1500, Vídeos ~R$1500-2500, Coberturas ~R$2000-3500, etc.)
- [x] Usar a média do tipo selecionado como referência no cálculo (não a média global)

## Fix: ownerProcedure bloqueando usuários legítimos
- [x] Mudar ownerProcedure para permitir que qualquer usuário autenticado acesse SEUS PRÓPRIOS dados
- [x] Criar ownerOnlyProcedure para ações destrutivas (clearAllData, deleteAccount, clearTransactions, clearJobs)
- [x] Garantir que o filtro por userId continue isolando os dados de cada usuário

## Bug Fix: Filtro freela/cliente final não funciona nos Jobs
- [x] Adicionar jobType e stage ao select da função getJobs() no db.ts (campo estava faltando na query)

## Bug Fix: Telegram - IA não categoriza e /revisar não mostra categorias
- [x] Migrar categorias de userId=0 para userId=1 (dados antigos pré-multi-tenancy)
- [x] Vincular sessão Telegram (chatId 851812341) ao userId=1
- [x] Migrar transactions, jobs, cards, clients, suppliers de userId=0 para userId=1
- [x] Ajustar /revisar para buscar últimos 3 meses (não só mês atual)

## Melhoria: /revisar aceitar formato multilinha e criar categorias novas
- [x] Aceitar formato "número categoria" um por linha (ex: "1 manus\n2 anúncios\n3 AliExpress")
- [x] Quando categoria não existir, perguntar se quer criar as categorias novas
- [x] Se sim, criar categorias e salvar aprendizado com IA (upsertCategoryLearning)
- [x] Manter compatibilidade com formato antigo (1 alimentação, 2 transporte)

## Feature: Google Login (substituir Manus OAuth)
- [x] Implementar fluxo OAuth2 do Google (login/callback)
- [x] Criar/atualizar usuário no banco ao fazer login com Google
- [x] Manter sessão via cookie JWT (mesmo padrão atual)
- [x] Atualizar frontend para usar botão "Entrar com Google"
- [x] Manter compatibilidade com usuários existentes (match por email via getUserByEmail)

## Feature: Restringir IA ao plano pago
- [x] Adicionar hasAI e hasDocumentScan ao PlanLimits
- [x] Free: hasAI=false, hasDocumentScan=false / Pro+Business: hasAI=true
- [x] Gate nos endpoints: insights.generate, monthlyReport.generate, documentScan.analyze, aiAssistant.chat
- [x] Mensagem clara de upgrade quando usuário free tenta usar IA
- [x] Categorização manual (sem IA) continua disponível no plano free

## Feature: Atualizar página de vendas com diferencial IA
- [x] Destacar IA como feature premium na página de billing/upgrade (banner AI highlight)
- [x] Listar features IA: categorização automática, insights, assistente, scan de docs, relatórios IA
- [x] Mostrar comparativo Free vs Pro com IA como diferencial principal (seção separada com ícones)
- [x] FAQ atualizado com pergunta sobre IA

## Melhoria: Redesign página de Cartões + integração Home
- [x] Página Cartões: mostrar categorias com valor e % de gasto por cartão
- [x] Página Cartões: nome do cartão como título, total gasto no mês
- [x] Página Cartões: lista de categorias com barra de progresso e percentual
- [x] Home: resumo "Cartão X: R$ Y de gastos" em despesas, clicável para navegar à página Cartões

## Ajustes: Cartões e Dashboard
- [x] Renomear cartões para "Cartão Empresarial" e "Cartão Pessoal"
- [x] Excluir cartão Familiar (desativado, isActive=0)
- [x] Remover seção "Gastos por Cartão" do Dashboard (Home)

## Fix: Agrupar gastos por cartão no Dashboard (despesas)
- [x] No painel lateral de despesas do Dashboard, agrupar transações por cartão (ex: "Cartão Empresarial: R$ X", "Cartão Pessoal: R$ Y") em vez de listar soltas

## Agrupar recorrências no painel lateral do Dashboard
- [x] Agrupar despesas recorrentes em bloco colapsável no painel de despesas
- [x] Agrupar receitas recorrentes em bloco colapsável no painel de receitas
- [x] Melhorar visual do título "recorrente" nas transações (mais agradável) — renomeado para "Despesas Fixas" / "Receitas Fixas"

## Redesign da tela de login
- [x] Criar tela de login personalizada com identidade visual do Eugê Financeiro (não parecer template Manus)

## Logo e tagline
- [ ] Substituir ícone do app pelo logo do cachorro (PNG e SVG)
- [ ] Atualizar favicon e PWA icons com o novo logo
- [ ] Atualizar logo na tela de login do Manus (VITE_APP_LOGO)
- [ ] Adicionar "by filmmaker to filmmaker" na página de login dedicada
- [ ] Adicionar "by filmmaker to filmmaker" na Landing page de vendas
