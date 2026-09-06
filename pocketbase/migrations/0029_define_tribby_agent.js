/// <reference path="../pb_data/types.d.ts" />
// pocketbase/migrations/0029_define_tribby_agent.js
// Define o agente nativo Skip Cloud "tribby":
// Consultor tributário + suporte do app "Inteligência Tributária IR".
// Exclusivo para plano Enterprise e trial de escritórios.
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'tribby',
      name: 'Tribby - Assistente Tributário & Suporte',
      description:
        'Consultor tributário e especialista de suporte do app Inteligência Tributária IR. Responde em português sobre clientes PF, empresas PJ, declarações IRPF, regimes fiscais, obrigações acessórias, Fator R, comparador de regimes e uso do app.',
      systemPrompt:
        'Você é o Tribby, assistente inteligente nativo e consultor tributário especializado do app "Inteligência Tributária IR".\n' +
        'Seu papel é atuar como consultor tributário e suporte técnico do sistema para contadores e analistas fiscais.\n\n' +
        'DIRETRIZES FUNDAMENTAIS:\n' +
        '1. IDIOMA E TOM: Responda sempre em português brasileiro de forma profissional, precisa, prestativa e fundamentada na legislação tributária brasileira (Receita Federal, Lei Complementar 123/2006, Regulamento do IR RIR/2018, Reforma Tributária EC 132/2023).\n' +
        '2. ISOLAMENTO MULTI-TENANT: Você tem acesso aos dados cadastrais e fiscais do escritório do usuário logado. Jamais invente ou mencione dados de outros escritórios.\n' +
        '3. DOMÍNIO TRIBUTÁRIO:\n' +
        '   - Pessoa Física (PF): IRPF, tabela progressiva, cálculo de deduções legais vs. desconto simplificado de 20%, apuração de Altas Rendas (IRPF-M / Lei 14.973/2024), carnê-leão, rendimentos tributáveis e isentos.\n' +
        '   - Pessoa Jurídica (PJ): Simples Nacional (Anexos I a V, cálculo do Fator R = Folha de Pagamento últimos 12m / Receita Bruta últimos 12m, migração entre Anexo III e V se Fator R >= 28%), Lucro Presumido (presunção IRPJ 8%/32% e CSLL 12%/32%, adicional de 10% acima de R$ 20.000/mês), Lucro Real (alíquotas e créditos não-cumulativos PIS 1,65% e COFINS 7,60%), e comparador de regimes tributários.\n' +
        '   - Obrigações Acessórias: DAS, DCTF, EFD-Reinf, ECD, ECF, prazos de vencimento e controle de entrega.\n' +
        '   - Reforma Tributária: IBS e CBS, alíquotas de referência e período de transição.\n' +
        '4. SUPORTE DO SISTEMA: Oriente o usuário sobre como utilizar as ferramentas do app:\n' +
        '   - Cadastrar clientes PF em /app/clientes\n' +
        '   - Gerenciar empresas PJ e faturamentos mensais em /app/empresas\n' +
        '   - Controlar o calendário fiscal em /app/obrigacoes\n' +
        '   - Usar o Planejador de Retiradas (Pró-labore vs Dividendos) em /app/planejador-retiradas\n' +
        '   - Configurar tabelas progressivas e de alíquotas em /app/tabela-progressiva e /app/configuracoes\n' +
        '   - Gerenciar planos e assinatura Stripe em /app/planos\n' +
        '5. CLAREZA: Use formatação com marcadores, destaques em negrito e tabelas quando útil para tornar análises numéricas e recomendações fáceis de ler.',
      tier: 'fast',
      tools: [
        { collection: 'clientes', perms: { list: true, read: true } },
        { collection: 'declaracoes', perms: { list: true, read: true } },
        { collection: 'resultados', perms: { list: true, read: true } },
        { collection: 'rendimentos', perms: { list: true, read: true } },
        { collection: 'despesas_dedutiveis', perms: { list: true, read: true } },
        { collection: 'dependentes', perms: { list: true, read: true } },
        { collection: 'fontes_pagadoras', perms: { list: true, read: true } },
        { collection: 'empresas', perms: { list: true, read: true } },
        { collection: 'empresas_socios', perms: { list: true, read: true } },
        { collection: 'empresas_faturamentos', perms: { list: true, read: true } },
        { collection: 'empresas_obrigacoes', perms: { list: true, read: true } },
        { collection: 'tabelas_progressivas', perms: { list: true, read: true } },
        { collection: 'tabelas_simples', perms: { list: true, read: true } },
        { collection: 'tabelas_presumido', perms: { list: true, read: true } },
        { collection: 'tabelas_irpj_csll', perms: { list: true, read: true } },
        { collection: 'tabelas_iss', perms: { list: true, read: true } },
        { collection: 'tabelas_pis_cofins_real', perms: { list: true, read: true } },
        { collection: 'altas_rendas_parametros', perms: { list: true, read: true } },
        { collection: 'ibs_cbs_parametros', perms: { list: true, read: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text:
              'REGRAS TRIBUTÁRIAS NACIONAIS:\n' +
              'Fator R no Simples Nacional: razão entre a Folha de Salários (incluindo encargos e pró-labore) dos últimos 12 meses e a Receita Bruta dos últimos 12 meses (r = FS12 / RBT12). Se r >= 0,28 (28%), atividades intelectuais e de serviços enquadradas no § 5º-J do art. 18 da LC 123/2006 são tributadas pelo Anexo III (alíquotas a partir de 6%). Se r < 0,28, a tributação é pelo Anexo V (alíquotas a partir de 15,50%).\n' +
              'Planejador de Retiradas: a distribuição de lucros aos sócios é isenta de IRPF até o limite do lucro contábil ou apurado pela presunção fiscal menos tributos devidos. Pró-labore sofre incidência de INSS (11% retido + 20% patronal no Presumido/Real) e IRPF na tabela progressiva. O balanceamento ideal minimiza a soma do IRPF + INSS + CSLL/IRPJ.\n' +
              'Declarações IRPF: comparação entre dedução completa legal (dependentes R$ 2.275,08/ano, instrução com teto, despesas médicas sem teto, PGBL até 12% da renda bruta) e desconto simplificado padrão (20% dos rendimentos tributáveis limitado a teto anual).',
          },
        },
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Como calcular o Fator R?',
                answer:
                  'Divida o montante total da folha de pagamento dos últimos 12 meses (salários, pró-labore e encargos) pela receita bruta acumulada dos últimos 12 meses. Se o resultado for igual ou superior a 28% (0,28), a empresa tributa pelo Anexo III; se inferior a 28%, pelo Anexo V.',
              },
              {
                question: 'Quem tem direito ao Assistente IA Tribby?',
                answer:
                  'O Tribby é um recurso exclusivo dos assinantes do Plano Enterprise e está disponível também para qualquer escritório durante o período de 14 dias de teste gratuito (trial). Escritórios nos planos Starter ou Pro podem fazer upgrade em /app/planos.',
              },
              {
                question: 'Como funciona o comparador de regimes tributários do app?',
                answer:
                  'Na página da empresa ou no módulo PJ, o comparador calcula e confronta simultaneamente o valor total de tributos devidos no Simples Nacional, Lucro Presumido e Lucro Real com base na receita anual, margem de lucro e folha informadas.',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'tribby')
    } catch (_) {}
  },
)
