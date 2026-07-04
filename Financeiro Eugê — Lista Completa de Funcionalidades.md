# Financeiro Eugê — Lista Completa de Funcionalidades

## Visão Geral

Sistema financeiro completo feito para **freelancers, MEIs e estúdios criativos**. Controle jobs, transações, faturas e impostos em um só lugar.

---

## 1. Dashboard & Visão Geral

| Funcionalidade | Descrição |
|---|---|
| Dashboard Inteligente | Resumo em tempo real: receitas, despesas, saldo, tendência mensal |
| Fluxo de Caixa | Projeção de 12 meses com gráfico de área, alertas de meses negativos |
| DRE (Demonstrativo de Resultado) | Receita bruta, custos diretos, lucro bruto, despesas fixas/variáveis, lucro líquido |
| DRE Anual | Tabela comparativa mês a mês + gráfico de barras da evolução |
| Tendência Mensal | Gráfico dos últimos 6 meses de receita vs despesa |

---

## 2. Movimentações Financeiras

| Funcionalidade | Descrição |
|---|---|
| Transações | Registro de receitas e despesas com categorização, escopo PJ/PF, filtros por período |
| Caixa (Saldo) | Controle de saldo em espécie com depósitos, retiradas e ajustes |
| Cartões de Crédito | Cadastro de múltiplos cartões (PJ, PF, Familiar), controle de limite e gastos |
| Recorrências | Receitas e despesas recorrentes automáticas (mensais), projeção futura |
| Parcelados | Compras parceladas com divisão automática em N parcelas, agrupamento visual |
| Importação de Faturas | Upload de PDF/imagem de fatura de cartão com processamento automático por IA |
| NFs de Serviço | Registro de notas fiscais de serviço emitidas |
| NFs de Produto | Registro de notas fiscais de produto |

---

## 3. Jobs & Comercial

| Funcionalidade | Descrição |
|---|---|
| Gestão de Jobs | Pipeline completo: rascunho → em andamento → concluído → cancelado |
| Entregas (Deliveries) | Registro de entregas parciais por job com data e descrição |
| Custos por Job | Controle de custos com fornecedores vinculados ao job (pago/pendente) |
| Recebimentos por Job | Parcelas de pagamento do cliente por job (pendente/recebido) |
| Resumo Financeiro do Job | Valor cobrado, custos, lucro e margem por job |
| Rentabilidade | Ranking de jobs por margem de lucro, gráfico comparativo |
| Orçamentos | Criação de orçamentos profissionais com itens, valores, status (rascunho/enviado/aprovado/recusado) |
| Diárias de Trabalho | Registro de diárias com valor, data, descrição e resumo mensal |
| Metas | Definição de metas de faturamento, lucro e quantidade de jobs por mês, com acompanhamento de progresso |
| Parceiros (Indicações) | Cadastro de parceiros que indicam jobs, ranking de indicações, comissões |

---

## 4. Cadastros

| Funcionalidade | Descrição |
|---|---|
| Fornecedores | Cadastro com nome, contato, CNPJ/CPF, especialidade |
| Contratantes (Clientes) | Cadastro com nome, contato, empresa, endereço |
| Categorias | Categorias personalizáveis para transações (receita/despesa) |
| Bens e Patrimônio | Registro de equipamentos com depreciação automática (câmeras, lentes, computadores, etc.) |
| Parceiros | Cadastro de parceiros de indicação com ranking de performance |

---

## 5. Fiscal & Contábil

| Funcionalidade | Descrição |
|---|---|
| Lembretes de Impostos | Alertas automáticos de DAS (mensal) e IRPF (anual) com dias restantes |
| Resumo IR Anual | Visão consolidada de receitas, despesas dedutíveis por categoria fiscal |
| Pró-labore | Sugestão de valor de pró-labore baseada na média de faturamento dos últimos meses |
| Categorização Fiscal | Classificação de despesas em categorias do IR (saúde, educação, moradia, etc.) |
| Painel Contábil | Área para compartilhar dados com a contadora (convite por email) |

---

## 6. Relatórios

| Funcionalidade | Descrição |
|---|---|
| Relatório Mensal PDF | Geração e envio por email do resumo financeiro mensal |
| Relatório Anual PDF | Geração e envio por email do resumo financeiro anual |
| Relatório por Job PDF | Geração e envio por email do detalhamento financeiro de um job específico |
| Relatórios Automáticos | Agendamento de envio periódico (semanal/mensal) por email |
| Exportar Backup | Download completo dos dados em formato JSON |

---

## 7. Bot Telegram

| Funcionalidade | Descrição |
|---|---|
| Lançar despesa por mensagem | `cartão PF 150 mercado` — registra direto no cartão |
| Lançar receita por mensagem | `receita PJ 3000 cliente X` — registra receita PJ |
| Resumo financeiro | `/resumo` — mostra resumo do mês atual |
| Gastos por cartão | `/cartoes` — mostra total gasto em cada cartão |
| Próximas recorrências | `/recorrencias` — lista próximas cobranças |
| Importar fatura por foto | Envia foto/PDF da fatura e o bot processa automaticamente com IA |
| Ajuda | `/ajuda` — lista todos os comandos disponíveis |

---

## 8. Sistema & Configurações

| Funcionalidade | Descrição |
|---|---|
| Onboarding Guiado | Wizard de 5 passos para configurar empresa, cartões e categorias |
| Dados da Empresa | Nome, CNPJ, endereço, regime tributário |
| Planos e Assinatura | Gestão de plano (Grátis/Pro/Business) via Stripe |
| Sistema de Convites | Código de indicação para convidar novos usuários |
| Feedback | Envio de sugestões e bugs direto pelo sistema |
| Notificações Telegram | Alertas automáticos ao admin quando novo feedback é enviado |
| Limpar Dados de Teste | Remoção seletiva de dados de teste |
| Limpar Todos os Dados | Reset completo (transações, jobs, recorrências) |
| Multi-tenant | Dados 100% isolados por usuário |

---

## 9. Planos e Preços

| Recurso | Grátis | Pro (R$29/mês) | Business (R$59/mês) |
|---|---|---|---|
| Jobs ativos | 3 | 15 | Ilimitado |
| Transações/mês | 50 | Ilimitado | Ilimitado |
| Cartões | 2 | 5 | Ilimitado |
| Categorias | 10 | 30 | Ilimitado |
| Recorrências | 3 | 15 | Ilimitado |
| Uploads faturas/mês | 1 | 5 | Ilimitado |
| DRE & Projeções | — | ✓ | ✓ |
| Metas | — | ✓ | ✓ |
| Orçamentos | — | ✓ | ✓ |
| Relatórios PDF | — | ✓ | ✓ |
| Bot Telegram | — | — | ✓ |
| Suporte prioritário | — | — | ✓ |

---

## 10. Diferenciais Técnicos

- **100% na nuvem** — acesso de qualquer lugar, qualquer dispositivo
- **Dados isolados por usuário** — segurança total entre contas
- **IA integrada** — processamento automático de faturas de cartão via foto/PDF
- **Bot Telegram** — lançamentos sem abrir o sistema
- **Relatórios PDF por email** — envio automático para você e sua contadora
- **Onboarding guiado** — começa a usar em 2 minutos
- **Projeções financeiras** — fluxo de caixa projetado com recorrências
- **Depreciação automática** — controle patrimonial com cálculo de depreciação
- **Sistema de indicação** — convide amigos e acompanhe quem entrou

---

## Público-Alvo

- Freelancers criativos (fotógrafos, designers, videomakers)
- MEIs e microempreendedores
- Estúdios e agências pequenas
- Produtoras de conteúdo
- Profissionais autônomos que faturam por projeto/job

---

## Proposta de Valor (Pitch)

> "Organize suas finanças de freelancer em um só lugar. Controle jobs, transações, faturas e impostos — do orçamento ao IR. Comece grátis, cresça no seu ritmo."

**Problemas que resolve:**
1. Planilhas desorganizadas e sem visão consolidada
2. Não saber quanto realmente lucra por job
3. Esquecer de pagar impostos (DAS, IRPF)
4. Perder tempo categorizando despesas de cartão manualmente
5. Não ter projeção de fluxo de caixa futuro
6. Dificuldade de compartilhar dados com a contadora
