// pocketbase/migrations/0024_create_lucro_real_and_pis_cofins.js
migrate(
  (app) => {
    // 1. Adicionar campos de Lucro Real à collection empresas_faturamentos caso não existam
    const empresasFaturamentos = app.findCollectionByNameOrId('empresas_faturamentos')

    if (!empresasFaturamentos.fields.getByName('lucro_contabil')) {
      empresasFaturamentos.fields.add(
        new NumberField({
          name: 'lucro_contabil',
          type: 'number',
        }),
      )
    }
    if (!empresasFaturamentos.fields.getByName('adicoes_lalur')) {
      empresasFaturamentos.fields.add(
        new NumberField({
          name: 'adicoes_lalur',
          type: 'number',
        }),
      )
    }
    if (!empresasFaturamentos.fields.getByName('exclusoes_lalur')) {
      empresasFaturamentos.fields.add(
        new NumberField({
          name: 'exclusoes_lalur',
          type: 'number',
        }),
      )
    }
    if (!empresasFaturamentos.fields.getByName('compras_insumos')) {
      empresasFaturamentos.fields.add(
        new NumberField({
          name: 'compras_insumos',
          type: 'number',
        }),
      )
    }
    if (!empresasFaturamentos.fields.getByName('outros_creditos_pis_cofins')) {
      empresasFaturamentos.fields.add(
        new NumberField({
          name: 'outros_creditos_pis_cofins',
          type: 'number',
        }),
      )
    }
    app.save(empresasFaturamentos)

    // 2. Collection tabelas_pis_cofins_real (Parâmetros PIS/COFINS Não-Cumulativo)
    const tabelasPisCofins = new Collection({
      name: 'tabelas_pis_cofins_real',
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
          name: 'aliquota_pis',
          type: 'number',
          required: true,
        },
        {
          name: 'aliquota_cofins',
          type: 'number',
          required: true,
        },
        {
          name: 'aliquota_credito_pis',
          type: 'number',
          required: true,
        },
        {
          name: 'aliquota_credito_cofins',
          type: 'number',
          required: true,
        },
        {
          name: 'observacao',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_tabelas_pis_cofins_ano ON tabelas_pis_cofins_real (ano)'],
    })
    app.save(tabelasPisCofins)

    // 3. Collection cenarios_simulacao_pj (Para salvar simulações PJ se o usuário desejar)
    const empresasCol = app.findCollectionByNameOrId('empresas')
    const cenariosPj = new Collection({
      name: 'cenarios_simulacao_pj',
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
          name: 'ano_calendario',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'nome',
          type: 'text',
          required: true,
        },
        {
          name: 'params',
          type: 'json',
        },
        {
          name: 'resultados',
          type: 'json',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cenarios_pj_empresa ON cenarios_simulacao_pj (empresa_id)'],
    })
    app.save(cenariosPj)

    // --- SEED INICIAL PIS/COFINS NÃO-CUMULATIVO (2024, 2025, 2026) ---
    const anos = [2024, 2025, 2026, 2027]
    for (const ano of anos) {
      try {
        app.findFirstRecordByData('tabelas_pis_cofins_real', 'ano', ano)
      } catch (_) {
        const rec = new Record(tabelasPisCofins)
        rec.set('ano', ano)
        rec.set('aliquota_pis', 1.65)
        rec.set('aliquota_cofins', 7.6)
        rec.set('aliquota_credito_pis', 1.65)
        rec.set('aliquota_credito_cofins', 7.6)
        rec.set('observacao', 'Regime Não-Cumulativo Padrão (Leis 10.637/2002 e 10.833/2003)')
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      const cPj = app.findCollectionByNameOrId('cenarios_simulacao_pj')
      if (cPj) app.delete(cPj)
    } catch (_) {}

    try {
      const pisCofins = app.findCollectionByNameOrId('tabelas_pis_cofins_real')
      if (pisCofins) app.delete(pisCofins)
    } catch (_) {}
  },
)
