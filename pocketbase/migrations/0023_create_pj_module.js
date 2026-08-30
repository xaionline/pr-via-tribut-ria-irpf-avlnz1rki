// pocketbase/migrations/0023_create_pj_module.js
migrate(
  (app) => {
    const escritoriosCol = app.findCollectionByNameOrId('escritorios')
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // 1. Collection empresas
    const empresas = new Collection({
      name: 'empresas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'escritorio_id',
          type: 'relation',
          collectionId: escritoriosCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'razao_social',
          type: 'text',
          required: true,
        },
        {
          name: 'cnpj',
          type: 'text',
          required: true,
        },
        {
          name: 'regime',
          type: 'select',
          required: true,
          values: ['simples', 'presumido', 'real'],
          maxSelect: 1,
        },
        {
          name: 'atividade',
          type: 'text',
        },
        {
          name: 'anexo_simples',
          type: 'select',
          values: ['I', 'II', 'III', 'IV', 'V'],
          maxSelect: 1,
        },
        {
          name: 'data_abertura',
          type: 'date',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_empresas_escritorio ON empresas (escritorio_id)',
        'CREATE INDEX idx_empresas_cnpj ON empresas (cnpj)',
      ],
    })
    app.save(empresas)

    // 2. Collection empresas_socios
    const empresasSocios = new Collection({
      name: 'empresas_socios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'empresa_id',
          type: 'relation',
          collectionId: empresas.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'percentual_participacao',
          type: 'number',
          required: true,
        },
        {
          name: 'pro_labore_mensal',
          type: 'number',
        },
        {
          name: 'participa_lucros',
          type: 'bool',
        },
        {
          name: 'participa_jcp',
          type: 'bool',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_empresas_socios_empresa ON empresas_socios (empresa_id)',
        'CREATE INDEX idx_empresas_socios_cliente ON empresas_socios (cliente_id)',
      ],
    })
    app.save(empresasSocios)

    // 3. Collection empresas_faturamentos
    const empresasFaturamentos = new Collection({
      name: 'empresas_faturamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'empresa_id',
          type: 'relation',
          collectionId: empresas.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'ano_calendario',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'mes',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'receita_bruta',
          type: 'number',
          required: true,
        },
        {
          name: 'folha',
          type: 'number',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_faturamentos_empresa_ano ON empresas_faturamentos (empresa_id, ano_calendario)',
      ],
    })
    app.save(empresasFaturamentos)

    // 4. Collection tabelas_simples (Configurações Simples Nacional)
    const tabelasSimples = new Collection({
      name: 'tabelas_simples',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      updateRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      deleteRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      fields: [
        {
          name: 'ano',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'anexo',
          type: 'select',
          required: true,
          values: ['I', 'II', 'III', 'IV', 'V'],
          maxSelect: 1,
        },
        {
          name: 'faixas',
          type: 'json',
        },
        {
          name: 'aliquota',
          type: 'number',
        },
        {
          name: 'parcela_deduzir',
          type: 'number',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_tabelas_simples_ano_anexo ON tabelas_simples (ano, anexo)'],
    })
    app.save(tabelasSimples)

    // 5. Collection tabelas_presumido (Lucro Presumido)
    const tabelasPresumido = new Collection({
      name: 'tabelas_presumido',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      updateRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      deleteRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      fields: [
        {
          name: 'ano',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'atividade',
          type: 'text',
          required: true,
        },
        {
          name: 'presuncao_irpj',
          type: 'number',
          required: true,
        },
        {
          name: 'presuncao_csll',
          type: 'number',
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_tabelas_presumido_ano ON tabelas_presumido (ano)'],
    })
    app.save(tabelasPresumido)

    // 6. Collection tabelas_irpj_csll
    const tabelasIrpjCsll = new Collection({
      name: 'tabelas_irpj_csll',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      updateRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      deleteRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      fields: [
        {
          name: 'ano',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'aliquota_irpj',
          type: 'number',
          required: true,
        },
        {
          name: 'adicional_irpj',
          type: 'number',
          required: true,
        },
        {
          name: 'limite_adicional',
          type: 'number',
          required: true,
        },
        {
          name: 'aliquota_csll',
          type: 'number',
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_tabelas_irpj_csll_ano ON tabelas_irpj_csll (ano)'],
    })
    app.save(tabelasIrpjCsll)

    // 7. Collection tabelas_iss
    const tabelasIss = new Collection({
      name: 'tabelas_iss',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      updateRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      deleteRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      fields: [
        {
          name: 'ano',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'aliquota',
          type: 'number',
          required: true,
        },
        {
          name: 'municipio',
          type: 'text',
        },
        {
          name: 'uf',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_tabelas_iss_ano ON tabelas_iss (ano)'],
    })
    app.save(tabelasIss)

    // --- SEEDS INICIAIS ---
    const anos = [2024, 2025, 2026]

    // Seed tabelas_irpj_csll
    for (const ano of anos) {
      try {
        app.findFirstRecordByData('tabelas_irpj_csll', 'ano', ano)
      } catch (_) {
        const rec = new Record(tabelasIrpjCsll)
        rec.set('ano', ano)
        rec.set('aliquota_irpj', 15.0)
        rec.set('adicional_irpj', 10.0)
        rec.set('limite_adicional', 20000.0) // R$ 20.000 / mês ou R$ 60.000 / trimestre
        rec.set('aliquota_csll', 9.0)
        app.save(rec)
      }
    }

    // Seed tabelas_iss
    for (const ano of anos) {
      try {
        const records = app.findRecordsByFilter('tabelas_iss', `ano = ${ano}`, '', 1, 0)
        if (records.length === 0) throw new Error('none')
      } catch (_) {
        const rec = new Record(tabelasIss)
        rec.set('ano', ano)
        rec.set('aliquota', 5.0)
        rec.set('municipio', 'Padrão / Geral')
        rec.set('uf', 'SP')
        app.save(rec)
      }
    }

    // Seed tabelas_presumido
    const atividadesPresumido = [
      {
        atividade: 'Comércio / Indústria / Transporte de Cargas',
        presuncao_irpj: 8.0,
        presuncao_csll: 12.0,
      },
      {
        atividade: 'Serviços Hospitalares e Médicos Específicos',
        presuncao_irpj: 8.0,
        presuncao_csll: 12.0,
      },
      { atividade: 'Transporte de Passageiros', presuncao_irpj: 16.0, presuncao_csll: 12.0 },
      {
        atividade: 'Serviços em Geral / Consultoria / TI / Advocacia',
        presuncao_irpj: 32.0,
        presuncao_csll: 32.0,
      },
    ]

    for (const ano of anos) {
      for (const atv of atividadesPresumido) {
        try {
          const records = app.findRecordsByFilter(
            'tabelas_presumido',
            `ano = ${ano} && atividade = "${atv.atividade}"`,
            '',
            1,
            0,
          )
          if (records.length === 0) throw new Error('none')
        } catch (_) {
          const rec = new Record(tabelasPresumido)
          rec.set('ano', ano)
          rec.set('atividade', atv.atividade)
          rec.set('presuncao_irpj', atv.presuncao_irpj)
          rec.set('presuncao_csll', atv.presuncao_csll)
          app.save(rec)
        }
      }
    }

    // Seed tabelas_simples (faixas padrão Lei Complementar 123/2006)
    const faixasPadraoSimples = {
      I: [
        // Comércio
        { faixa: 1, faixa_inicial: 0, faixa_final: 180000, aliquota: 4.0, parcela_deduzir: 0 },
        {
          faixa: 2,
          faixa_inicial: 180000.01,
          faixa_final: 360000,
          aliquota: 7.3,
          parcela_deduzir: 5940,
        },
        {
          faixa: 3,
          faixa_inicial: 360000.01,
          faixa_final: 720000,
          aliquota: 9.5,
          parcela_deduzir: 13860,
        },
        {
          faixa: 4,
          faixa_inicial: 720000.01,
          faixa_final: 1800000,
          aliquota: 10.7,
          parcela_deduzir: 22500,
        },
        {
          faixa: 5,
          faixa_inicial: 1800000.01,
          faixa_final: 3600000,
          aliquota: 14.3,
          parcela_deduzir: 87300,
        },
        {
          faixa: 6,
          faixa_inicial: 3600000.01,
          faixa_final: 4800000,
          aliquota: 19.0,
          parcela_deduzir: 378000,
        },
      ],
      II: [
        // Indústria
        { faixa: 1, faixa_inicial: 0, faixa_final: 180000, aliquota: 4.5, parcela_deduzir: 0 },
        {
          faixa: 2,
          faixa_inicial: 180000.01,
          faixa_final: 360000,
          aliquota: 7.8,
          parcela_deduzir: 5940,
        },
        {
          faixa: 3,
          faixa_inicial: 360000.01,
          faixa_final: 720000,
          aliquota: 10.0,
          parcela_deduzir: 13860,
        },
        {
          faixa: 4,
          faixa_inicial: 720000.01,
          faixa_final: 1800000,
          aliquota: 11.2,
          parcela_deduzir: 22500,
        },
        {
          faixa: 5,
          faixa_inicial: 1800000.01,
          faixa_final: 3600000,
          aliquota: 14.7,
          parcela_deduzir: 85500,
        },
        {
          faixa: 6,
          faixa_inicial: 3600000.01,
          faixa_final: 4800000,
          aliquota: 30.0,
          parcela_deduzir: 720000,
        },
      ],
      III: [
        // Serviços (Locação, TI, Manutenção etc)
        { faixa: 1, faixa_inicial: 0, faixa_final: 180000, aliquota: 6.0, parcela_deduzir: 0 },
        {
          faixa: 2,
          faixa_inicial: 180000.01,
          faixa_final: 360000,
          aliquota: 11.2,
          parcela_deduzir: 9360,
        },
        {
          faixa: 3,
          faixa_inicial: 360000.01,
          faixa_final: 720000,
          aliquota: 13.5,
          parcela_deduzir: 17640,
        },
        {
          faixa: 4,
          faixa_inicial: 720000.01,
          faixa_final: 1800000,
          aliquota: 16.0,
          parcela_deduzir: 35640,
        },
        {
          faixa: 5,
          faixa_inicial: 1800000.01,
          faixa_final: 3600000,
          aliquota: 21.0,
          parcela_deduzir: 125640,
        },
        {
          faixa: 6,
          faixa_inicial: 3600000.01,
          faixa_final: 4800000,
          aliquota: 33.0,
          parcela_deduzir: 648000,
        },
      ],
      IV: [
        // Serviços específicos (Limpeza, Vigilância, Obras)
        { faixa: 1, faixa_inicial: 0, faixa_final: 180000, aliquota: 4.5, parcela_deduzir: 0 },
        {
          faixa: 2,
          faixa_inicial: 180000.01,
          faixa_final: 360000,
          aliquota: 9.0,
          parcela_deduzir: 8100,
        },
        {
          faixa: 3,
          faixa_inicial: 360000.01,
          faixa_final: 720000,
          aliquota: 10.2,
          parcela_deduzir: 12420,
        },
        {
          faixa: 4,
          faixa_inicial: 720000.01,
          faixa_final: 1800000,
          aliquota: 14.0,
          parcela_deduzir: 39780,
        },
        {
          faixa: 5,
          faixa_inicial: 1800000.01,
          faixa_final: 3600000,
          aliquota: 22.0,
          parcela_deduzir: 183780,
        },
        {
          faixa: 6,
          faixa_inicial: 3600000.01,
          faixa_final: 4800000,
          aliquota: 33.0,
          parcela_deduzir: 828000,
        },
      ],
      V: [
        // Serviços intelectuais, médicos, engenharia (sujeitos ao Fator R)
        { faixa: 1, faixa_inicial: 0, faixa_final: 180000, aliquota: 15.5, parcela_deduzir: 0 },
        {
          faixa: 2,
          faixa_inicial: 180000.01,
          faixa_final: 360000,
          aliquota: 18.0,
          parcela_deduzir: 4500,
        },
        {
          faixa: 3,
          faixa_inicial: 360000.01,
          faixa_final: 720000,
          aliquota: 19.5,
          parcela_deduzir: 9900,
        },
        {
          faixa: 4,
          faixa_inicial: 720000.01,
          faixa_final: 1800000,
          aliquota: 20.5,
          parcela_deduzir: 17100,
        },
        {
          faixa: 5,
          faixa_inicial: 1800000.01,
          faixa_final: 3600000,
          aliquota: 23.0,
          parcela_deduzir: 62100,
        },
        {
          faixa: 6,
          faixa_inicial: 3600000.01,
          faixa_final: 4800000,
          aliquota: 30.5,
          parcela_deduzir: 540000,
        },
      ],
    }

    const anexos = ['I', 'II', 'III', 'IV', 'V']
    for (const ano of anos) {
      for (const anexo of anexos) {
        try {
          const records = app.findRecordsByFilter(
            'tabelas_simples',
            `ano = ${ano} && anexo = "${anexo}"`,
            '',
            1,
            0,
          )
          if (records.length === 0) throw new Error('none')
        } catch (_) {
          const rec = new Record(tabelasSimples)
          rec.set('ano', ano)
          rec.set('anexo', anexo)
          rec.set('faixas', faixasPadraoSimples[anexo] || [])
          rec.set('aliquota', faixasPadraoSimples[anexo]?.[0]?.aliquota ?? 0)
          rec.set('parcela_deduzir', 0)
          app.save(rec)
        }
      }
    }

    // Seed de Empresa de Demonstração e Vínculo com Sócio
    try {
      const primeiroEscritorio = app.findFirstRecordByData('escritorios', 'ativo', true)
      const primeiroCliente = app.findFirstRecordByData('clientes', 'status', 'ativo')

      let empresaDemo
      try {
        empresaDemo = app.findFirstRecordByData('empresas', 'cnpj', '12.345.678/0001-90')
      } catch (_) {
        empresaDemo = new Record(empresas)
        empresaDemo.set('escritorio_id', primeiroEscritorio.id)
        empresaDemo.set('razao_social', 'Tech & Inovação Soluções Digitais LTDA')
        empresaDemo.set('cnpj', '12.345.678/0001-90')
        empresaDemo.set('regime', 'simples')
        empresaDemo.set(
          'atividade',
          'Desenvolvimento de Softwares e Consultoria em TI (CNAE 6201-5/01)',
        )
        empresaDemo.set('anexo_simples', 'III')
        empresaDemo.set('data_abertura', '2021-03-15')
        app.save(empresaDemo)
      }

      // Vínculo do sócio
      try {
        app.findFirstRecordByData('empresas_socios', 'empresa_id', empresaDemo.id)
      } catch (_) {
        const socio = new Record(empresasSocios)
        socio.set('empresa_id', empresaDemo.id)
        socio.set('cliente_id', primeiroCliente.id)
        socio.set('percentual_participacao', 60.0)
        socio.set('pro_labore_mensal', 5000.0)
        socio.set('participa_lucros', true)
        socio.set('participa_jcp', false)
        app.save(socio)
      }

      // Faturamentos exemplo 2024
      const faturamentosMensais = [
        { mes: 1, receita_bruta: 45000, folha: 15000 },
        { mes: 2, receita_bruta: 48000, folha: 15000 },
        { mes: 3, receita_bruta: 52000, folha: 15000 },
        { mes: 4, receita_bruta: 50000, folha: 15000 },
        { mes: 5, receita_bruta: 55000, folha: 16000 },
        { mes: 6, receita_bruta: 53000, folha: 16000 },
        { mes: 7, receita_bruta: 58000, folha: 16000 },
        { mes: 8, receita_bruta: 60000, folha: 16000 },
        { mes: 9, receita_bruta: 62000, folha: 17000 },
        { mes: 10, receita_bruta: 65000, folha: 17000 },
        { mes: 11, receita_bruta: 68000, folha: 17000 },
        { mes: 12, receita_bruta: 74000, folha: 22000 },
      ]

      for (const fat of faturamentosMensais) {
        try {
          const recs = app.findRecordsByFilter(
            'empresas_faturamentos',
            `empresa_id = "${empresaDemo.id}" && ano_calendario = 2024 && mes = ${fat.mes}`,
            '',
            1,
            0,
          )
          if (recs.length === 0) throw new Error('none')
        } catch (_) {
          const fatRec = new Record(empresasFaturamentos)
          fatRec.set('empresa_id', empresaDemo.id)
          fatRec.set('ano_calendario', 2024)
          fatRec.set('mes', fat.mes)
          fatRec.set('receita_bruta', fat.receita_bruta)
          fatRec.set('folha', fat.folha)
          app.save(fatRec)
        }
      }
    } catch (_) {
      // Ignora erro se escritório/cliente ainda não existirem no momento do teste
    }
  },
  (app) => {
    const cols = [
      'empresas_faturamentos',
      'empresas_socios',
      'empresas',
      'tabelas_iss',
      'tabelas_irpj_csll',
      'tabelas_presumido',
      'tabelas_simples',
    ]
    for (const name of cols) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) app.delete(col)
      } catch (_) {}
    }
  },
)
