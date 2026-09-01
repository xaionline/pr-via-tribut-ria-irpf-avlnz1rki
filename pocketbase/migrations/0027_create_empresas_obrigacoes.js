// pocketbase/migrations/0027_create_empresas_obrigacoes.js
migrate(
  (app) => {
    const escritoriosCol = app.findCollectionByNameOrId('escritorios')
    const empresasCol = app.findCollectionByNameOrId('empresas')

    // 1. Criar collection empresas_obrigacoes
    const obrigacoesCol = new Collection({
      name: 'empresas_obrigacoes',
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
          collectionId: empresasCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'escritorio_id',
          type: 'relation',
          collectionId: escritoriosCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['DAS', 'DCTF', 'EFD_REINF', 'ECD', 'ECF'],
          maxSelect: 1,
        },
        {
          name: 'nome',
          type: 'text',
          required: true,
        },
        {
          name: 'ano_calendario',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'competencia',
          type: 'text',
          required: true, // Formato "01/2025", "02/2025", "Anual/2024" etc.
        },
        {
          name: 'mes_competencia',
          type: 'number',
          required: false,
          onlyInt: true, // 1-12 para mensais, 0 ou null para anuais
        },
        {
          name: 'data_vencimento',
          type: 'date',
          required: true,
        },
        {
          name: 'data_vencimento_original',
          type: 'date',
          required: false,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'entregue', 'dispensada'],
          maxSelect: 1,
        },
        {
          name: 'data_entrega',
          type: 'date',
          required: false,
        },
        {
          name: 'observacao',
          type: 'text',
          required: false,
        },
        {
          name: 'codigo_recibo',
          type: 'text',
          required: false,
        },
        {
          name: 'valor_guia',
          type: 'number',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obrigacoes_empresa_ano ON empresas_obrigacoes (empresa_id, ano_calendario)',
        'CREATE INDEX idx_obrigacoes_escritorio ON empresas_obrigacoes (escritorio_id)',
        'CREATE INDEX idx_obrigacoes_tipo_vencimento ON empresas_obrigacoes (tipo, data_vencimento)',
        'CREATE INDEX idx_obrigacoes_status ON empresas_obrigacoes (status)',
      ],
    })
    app.save(obrigacoesCol)

    // 2. Adicionar campo enviar_obrigacoes_acessorias na tabela alertas_config se existir
    try {
      const alertasCfgCol = app.findCollectionByNameOrId('alertas_config')
      if (alertasCfgCol && !alertasCfgCol.fields.getByName('enviar_obrigacoes_acessorias')) {
        alertasCfgCol.fields.add(new BoolField({ name: 'enviar_obrigacoes_acessorias' }))
        app.save(alertasCfgCol)
      }
    } catch (_) {}

    // 3. Seed de obrigações iniciais para as empresas existentes no ano 2025 e 2026
    try {
      const empresas = app.findRecordsByFilter('empresas', 'id != ""', 'created', 50, 0)
      for (const empresa of empresas) {
        const empId = empresa.id
        const escId = empresa.getString('escritorio_id')
        const regime = empresa.getString('regime') || 'simples'

        // Gerar 2025 para ter dados realistas de exemplo
        const ano = 2025

        // Helpers de datas (competência do mês M vence no mês M+1 ou datas fixas)
        // DAS (Simples): dia 20 do mês seguinte
        // DCTF (Presumido/Real): dia 15 do 2º mês seguinte ou dia 20 conforme calendário
        // EFD-Reinf: dia 15 do mês seguinte
        // ECD: último dia útil de maio/junho do ano seguinte (ex: 30/05/2025)
        // ECF: último dia útil de julho do ano seguinte (ex: 31/07/2025)

        const obrigacoesParaCriar = []

        if (regime === 'simples') {
          // DAS mensal para todos os meses do ano
          for (let m = 1; m <= 12; m++) {
            const mesStr = m < 10 ? '0' + m : '' + m
            // Competência MM/2025 vence no mês MM+1
            const vencAno = m === 12 ? ano + 1 : ano
            const vencMes = m === 12 ? '01' : m + 1 < 10 ? '0' + (m + 1) : '' + (m + 1)
            const vencData = `${vencAno}-${vencMes}-20 00:00:00.000Z`
            const isEntregue = m <= 4 // Primeiros meses entregues como exemplo
            const dataEntrega = isEntregue ? `${vencAno}-${vencMes}-18 00:00:00.000Z` : null

            obrigacoesParaCriar.push({
              empresa_id: empId,
              escritorio_id: escId,
              tipo: 'DAS',
              nome: 'DAS — Documento de Arrecadação do Simples Nacional',
              ano_calendario: ano,
              competencia: `${mesStr}/${ano}`,
              mes_competencia: m,
              data_vencimento: vencData,
              data_vencimento_original: vencData,
              status: isEntregue ? 'entregue' : 'pendente',
              data_entrega: dataEntrega,
              observacao: isEntregue ? 'Guia paga e transmitida via PGDAS-D' : '',
              codigo_recibo: isEntregue ? `REC-DAS-${ano}${mesStr}-8923` : '',
              valor_guia: 3200 + m * 150,
            })
          }

          // EFD-Reinf mensal (se aplicável ao Simples com retenção)
          for (let m = 1; m <= 12; m++) {
            const mesStr = m < 10 ? '0' + m : '' + m
            const vencAno = m === 12 ? ano + 1 : ano
            const vencMes = m === 12 ? '01' : m + 1 < 10 ? '0' + (m + 1) : '' + (m + 1)
            const vencData = `${vencAno}-${vencMes}-15 00:00:00.000Z`
            const isEntregue = m <= 4

            obrigacoesParaCriar.push({
              empresa_id: empId,
              escritorio_id: escId,
              tipo: 'EFD_REINF',
              nome: 'EFD-Reinf — Escrituração Fiscal Digital de Retenções',
              ano_calendario: ano,
              competencia: `${mesStr}/${ano}`,
              mes_competencia: m,
              data_vencimento: vencData,
              data_vencimento_original: vencData,
              status: isEntregue ? 'entregue' : 'pendente',
              data_entrega: isEntregue ? `${vencAno}-${vencMes}-14 00:00:00.000Z` : null,
              codigo_recibo: isEntregue ? `REINF-${ano}${mesStr}-442` : '',
            })
          }

          // ECD anual (facultativo/obrigatório se houver investidor-anjo ou contabilidade completa)
          obrigacoesParaCriar.push({
            empresa_id: empId,
            escritorio_id: escId,
            tipo: 'ECD',
            nome: 'ECD — Escrituração Contábil Digital (SPED Contábil)',
            ano_calendario: ano,
            competencia: `Anual/${ano - 1}`,
            mes_competencia: 0,
            data_vencimento: `${ano}-05-30 00:00:00.000Z`,
            data_vencimento_original: `${ano}-05-30 00:00:00.000Z`,
            status: 'entregue',
            data_entrega: `${ano}-05-28 00:00:00.000Z`,
            codigo_recibo: `SPED-ECD-${ano}-8819`,
            observacao: 'Transmitida com sucesso pelo PVA SPED',
          })
        } else {
          // Lucro Presumido / Lucro Real: DCTF, EFD-Reinf, ECD, ECF
          for (let m = 1; m <= 12; m++) {
            const mesStr = m < 10 ? '0' + m : '' + m
            // DCTF Mensal vence no 15º dia útil do 2º mês subsequente (aprox. dia 20-22)
            let vencAno = ano
            let mSub = m + 2
            if (mSub > 12) {
              mSub -= 12
              vencAno = ano + 1
            }
            const vencMes = mSub < 10 ? '0' + mSub : '' + mSub
            const vencData = `${vencAno}-${vencMes}-22 00:00:00.000Z`
            const isEntregue = m <= 3

            obrigacoesParaCriar.push({
              empresa_id: empId,
              escritorio_id: escId,
              tipo: 'DCTF',
              nome: 'DCTF Mensal — Declaração de Débitos e Créditos Tributários Federais',
              ano_calendario: ano,
              competencia: `${mesStr}/${ano}`,
              mes_competencia: m,
              data_vencimento: vencData,
              data_vencimento_original: vencData,
              status: isEntregue ? 'entregue' : 'pendente',
              data_entrega: isEntregue ? `${vencAno}-${vencMes}-19 00:00:00.000Z` : null,
              codigo_recibo: isEntregue ? `DCTF-${ano}${mesStr}-9912` : '',
            })
          }

          // EFD-Reinf mensal
          for (let m = 1; m <= 12; m++) {
            const mesStr = m < 10 ? '0' + m : '' + m
            const vencAno = m === 12 ? ano + 1 : ano
            const vencMes = m === 12 ? '01' : m + 1 < 10 ? '0' + (m + 1) : '' + (m + 1)
            const vencData = `${vencAno}-${vencMes}-15 00:00:00.000Z`
            const isEntregue = m <= 3

            obrigacoesParaCriar.push({
              empresa_id: empId,
              escritorio_id: escId,
              tipo: 'EFD_REINF',
              nome: 'EFD-Reinf — Escrituração Fiscal Digital de Retenções',
              ano_calendario: ano,
              competencia: `${mesStr}/${ano}`,
              mes_competencia: m,
              data_vencimento: vencData,
              data_vencimento_original: vencData,
              status: isEntregue ? 'entregue' : 'pendente',
              data_entrega: isEntregue ? `${vencAno}-${vencMes}-14 00:00:00.000Z` : null,
              codigo_recibo: isEntregue ? `REINF-${ano}${mesStr}-5531` : '',
            })
          }

          // ECD anual
          obrigacoesParaCriar.push({
            empresa_id: empId,
            escritorio_id: escId,
            tipo: 'ECD',
            nome: 'ECD — Escrituração Contábil Digital (SPED Contábil)',
            ano_calendario: ano,
            competencia: `Anual/${ano - 1}`,
            mes_competencia: 0,
            data_vencimento: `${ano}-05-30 00:00:00.000Z`,
            data_vencimento_original: `${ano}-05-30 00:00:00.000Z`,
            status: 'entregue',
            data_entrega: `${ano}-05-29 00:00:00.000Z`,
            codigo_recibo: `SPED-ECD-${ano}-3312`,
            observacao: 'Transmitida com assinatura digital dos sócios',
          })

          // ECF anual
          obrigacoesParaCriar.push({
            empresa_id: empId,
            escritorio_id: escId,
            tipo: 'ECF',
            nome: 'ECF — Escrituração Contábil Fiscal (SPED ECF)',
            ano_calendario: ano,
            competencia: `Anual/${ano - 1}`,
            mes_competencia: 0,
            data_vencimento: `${ano}-07-31 00:00:00.000Z`,
            data_vencimento_original: `${ano}-07-31 00:00:00.000Z`,
            status: 'pendente',
            observacao: 'Aguardando validação dos blocos Lalur/Lacs',
          })
        }

        for (const item of obrigacoesParaCriar) {
          const rec = new Record(obrigacoesCol)
          Object.keys(item).forEach((k) => {
            if (item[k] !== undefined && item[k] !== null) {
              rec.set(k, item[k])
            }
          })
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('empresas_obrigacoes')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
