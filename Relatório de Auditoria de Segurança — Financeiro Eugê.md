# Relatório de Auditoria de Segurança — Financeiro Eugê

**Data:** 15 de junho de 2026  
**Auditor:** Manus (atuando como pentester)  
**Escopo:** Aplicação web completa (frontend, backend, banco de dados, integrações)

---

## Resumo Executivo

A aplicação possui uma **boa base de segurança** na autenticação (OAuth, cookies httpOnly/secure, JWT), mas apresenta **vulnerabilidades significativas de IDOR (Insecure Direct Object Reference)** em operações de update/delete, além de falhas de isolamento no bot Telegram e nos relatórios PDF. Nenhuma vulnerabilidade de injeção SQL foi encontrada (Drizzle ORM parametriza queries corretamente).

---

## Classificação de Severidade

| Nível | Significado |
|-------|-------------|
| **CRÍTICO** | Acesso/modificação de dados de outros usuários sem autenticação especial |
| **ALTO** | Vazamento de dados entre contas com autenticação válida |
| **MÉDIO** | Risco potencial que requer condições específicas |
| **BAIXO** | Boas práticas não seguidas, risco mínimo atual |

---

## Vulnerabilidades Encontradas

### 1. IDOR em Delete/Update — Sem Verificação de Ownership (CRÍTICO)

**Descrição:** Múltiplos endpoints de `delete` e `update` aceitam apenas um `id` numérico e executam a operação **sem verificar se o registro pertence ao usuário logado**. Um atacante autenticado pode deletar/modificar dados de qualquer outro usuário simplesmente adivinhando IDs (que são sequenciais).

**Endpoints afetados:**

| Endpoint | Operação | Risco |
|----------|----------|-------|
| `goals.delete` | `deleteGoal(id)` | Deletar metas de outros |
| `goals.update` | `updateGoal(id, data)` | Modificar metas de outros |
| `categories.delete` | `deleteCategory(id)` | Deletar categorias de outros |
| `transactions.delete` | `deleteTransaction(id)` | Deletar transações de outros |
| `transactions.update` | `updateTransaction(id, data)` | Modificar transações de outros |
| `workDays.delete` | `deleteWorkDay(id)` | Deletar diárias de outros |
| `emailReports.delete` | `deleteEmailReport(id)` | Deletar relatórios de outros |
| `recurringIncome.delete` | `deleteRecurringIncome(id)` | Deletar recorrências de outros |
| `recurringExpenses.delete` | `deleteRecurringExpense(id)` | Deletar despesas recorrentes de outros |
| `jobs.delete` | `deleteJob(id)` | Deletar jobs de outros |
| `jobs.deliveries.delete` | `deleteJobDelivery(id)` | Deletar entregas de outros |
| `jobs.costs.delete` | `deleteJobCost(id)` | Deletar custos de outros |
| `jobs.payments.delete` | `deleteJobPayment(id)` | Deletar pagamentos de outros |
| `assets.getById` | `getAssetById(id)` | Ver bens de outros |
| `assets.update` | `updateAsset(id, data)` | Modificar bens de outros |
| `assets.delete` | `deleteAsset(id)` | Deletar bens de outros |
| `quotes.delete` | `deleteQuote(id)` | Deletar orçamentos de outros |

**Vetor de ataque:**
```
1. Atacante se autentica normalmente
2. Usa DevTools ou curl para chamar: trpc.transactions.delete({ id: 1 })
3. Deleta a transação de ID 1 (que pertence a outro usuário)
4. IDs são sequenciais, então pode iterar de 1 a N
```

**Correção recomendada:** Adicionar `AND userId = ctx.user.id` em todas as queries de delete/update, ou verificar ownership antes de executar.

---

### 2. Bot Telegram — Dados Sem Isolamento por Usuário (ALTO)

**Descrição:** O bot Telegram chama funções como `getDashboardData()`, `getTransactions()`, `getAllCards()`, `getAllCategories()`, `getJobs()`, `getJobsMonthSummary()`, `getUpcomingRecurrences()`, `getWorkDaysSummary()`, `getRecurringProjections()` e `getAllTaxReminders()` **sem passar userId**. Além disso, a função `resolveUserIdFromChat()` retorna **sempre 1** (hardcoded).

**Impacto:**
- Se o bot for aberto para outros usuários no futuro, todos verão os dados do userId=1
- Atualmente é single-tenant (só o owner usa), mas é uma bomba-relógio

**Correção recomendada:** Implementar resolução real de userId via `telegramSessions` e passar userId em todas as chamadas.

---

### 3. Relatórios PDF — Sem Filtro de Usuário (ALTO)

**Descrição:** A função `generateAndSendReport()` em `pdf-reports.ts` chama `getTransactions()`, `getAllCards()`, `getAllCategories()`, `getDashboardData()` **sem passar userId**. Qualquer usuário autenticado que gere um relatório receberá dados de **todos os usuários**.

**Endpoints afetados:**
- `reports.sendMonthly`
- `reports.sendAnnual`
- `reports.sendJob`

**Correção recomendada:** Passar `userId` para `generateAndSendReport()` e propagar para todas as queries internas.

---

### 4. Endpoint `/api/telegram/setup` Não Autenticado (MÉDIO)

**Descrição:** O endpoint `POST /api/telegram/setup` permite que qualquer pessoa configure o webhook do bot Telegram passando um `baseUrl`. Não há autenticação nem verificação de role admin.

**Impacto:** Um atacante poderia redirecionar o webhook do Telegram para um servidor próprio e interceptar todas as mensagens enviadas ao bot.

**Correção recomendada:** Proteger com verificação de admin ou token secreto.

---

### 5. Import Backup com `z.any()` — Validação Fraca (MÉDIO)

**Descrição:** O endpoint `importBackup` usa `z.array(z.any())` para validar os dados importados. Isso permite inserir campos arbitrários no banco, incluindo potencialmente campos que não deveriam ser editáveis pelo usuário (como `role`, `plan`, etc.).

**Impacto:** Um atacante poderia craftar um JSON de backup com campos maliciosos. Embora o `insertRows` force o `userId`, outros campos como `role` ou `plan` poderiam ser injetados se presentes na tabela.

**Correção recomendada:** Usar schemas Zod tipados para cada tabela no import, ou filtrar campos permitidos (whitelist).

---

### 6. Sem Rate Limiting (BAIXO)

**Descrição:** Nenhum rate limiting está implementado nos endpoints da API. Um atacante poderia:
- Fazer brute-force de IDs para explorar IDORs
- Sobrecarregar o servidor com requests
- Abusar do endpoint de geração de relatórios (que usa LLM/PDF)

**Correção recomendada:** Implementar `express-rate-limit` com limites por IP e por usuário.

---

### 7. Endpoint `/api/scheduled/keep-alive` Não Autenticado (BAIXO)

**Descrição:** O endpoint de keep-alive é público. Embora não exponha dados sensíveis, poderia ser usado para manter o servidor acordado indevidamente ou como vetor de DDoS.

**Correção recomendada:** Adicionar token de verificação.

---

## O Que Está BEM Feito

| Aspecto | Status |
|---------|--------|
| Autenticação OAuth | Implementada corretamente via Manus OAuth |
| Cookies | httpOnly, secure, sameSite=none |
| JWT/Session | Assinado com secret, não expõe dados sensíveis |
| SQL Injection | Protegido — Drizzle ORM parametriza todas as queries |
| XSS | Nenhum `dangerouslySetInnerHTML` com dados de usuário |
| Secrets no frontend | Nenhum secret server-side exposto no client |
| Stripe Webhook | Verificação de assinatura implementada corretamente |
| CORS | Não configurado explicitamente (usa proxy do Manus) |
| Listagem de dados | Corrigida — todas as queries de LIST filtram por userId |
| Export backup | Corrigido — exporta apenas dados do usuário logado |
| Import backup | Corrigido — força userId do usuário logado em todos os registros |

---

## Prioridade de Correção

| Prioridade | Vulnerabilidade | Esforço |
|------------|-----------------|---------|
| 1 (urgente) | IDOR em delete/update | ~2h (adicionar userId em ~17 funções) |
| 2 (urgente) | PDF Reports sem userId | ~30min |
| 3 (importante) | Telegram bot sem userId | ~1h |
| 4 (importante) | `/api/telegram/setup` não autenticado | ~15min |
| 5 (melhorar) | Import backup com z.any() | ~1h |
| 6 (melhorar) | Rate limiting | ~30min |

---

## Conclusão

A aplicação tem **fundações sólidas de segurança** (OAuth, cookies seguros, ORM parametrizado, sem XSS). O problema principal é a **falta de verificação de ownership** nas operações de modificação/exclusão — um padrão comum em aplicações que começaram single-tenant e evoluíram para multi-tenant. As correções são relativamente simples (adicionar `AND userId = ?` nas queries) e devem ser priorizadas antes de abrir o sistema para mais usuários.

**Risco geral atual:** ALTO (devido aos IDORs em delete/update)  
**Risco após correções:** BAIXO
