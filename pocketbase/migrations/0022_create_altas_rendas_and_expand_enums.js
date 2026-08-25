// pocketbase/migrations/0022_create_altas_rendas_and_expand_enums.js
migrate(
  (app) => {
    // 1a. Expandir enum rendimentos.tipo com 'dividendos' e 'exterior'
    const rendimentos = app.findCollectionByNameOrId('rendimentos')
    const tipoRendimentoField = rendimentos.fields.getByName('tipo')
    if (tipoRendimentoField) {
      tipoRendimentoField.values = ['tributavel', 'isento', 'exclusiva', 'dividendos', 'exterior']
    } else {
      rendimentos.fields.add(
        new SelectField({
          name: 'tipo',
          required: true,
          values: ['tributavel', 'isento', 'exclusiva', 'dividendos', 'exterior'],
          maxSelect: 1,
        }),
      )
    }
    app.save(rendimentos)

    // 1b. Nova collection: altas_rendas_parametros
    const altasRendasParametros = new Collection({
      name: 'altas_rendas_parametros',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      updateRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      deleteRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      fields: [
        {
          name: 'ano_calendario',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'aliquota',
          type: 'number',
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_altas_rendas_parametros_ano_calendario ON altas_rendas_parametros (ano_calendario)',
      ],
    })
    app.save(altasRendasParametros)

    // Seed inicial para altas_rendas_parametros (2024, 2025, 2026 com alíquota padrão 10.0%)
    const defaultParams = [
      { ano_calendario: 2024, aliquota: 10.0 },
      { ano_calendario: 2025, aliquota: 10.0 },
      { ano_calendario: 2026, aliquota: 10.0 },
    ]

    for (const item of defaultParams) {
      try {
        app.findFirstRecordByData('altas_rendas_parametros', 'ano_calendario', item.ano_calendario)
      } catch (_) {
        const rec = new Record(altasRendasParametros)
        rec.set('ano_calendario', item.ano_calendario)
        rec.set('aliquota', item.aliquota)
        app.save(rec)
      }
    }

    // 1c. Adicionar campo tipo na collection irrf (irrf_comum, irpfm_exercicio)
    const irrf = app.findCollectionByNameOrId('irrf')
    if (!irrf.fields.getByName('tipo')) {
      irrf.fields.add(
        new SelectField({
          name: 'tipo',
          values: ['irrf_comum', 'irpfm_exercicio'],
          maxSelect: 1,
        }),
      )
    }

    // 1d. Atualizar API rules de irrf
    irrf.listRule = "@request.auth.id != ''"
    irrf.viewRule = "@request.auth.id != ''"
    irrf.createRule = "@request.auth.id != ''"
    irrf.updateRule = "@request.auth.id != ''"
    irrf.deleteRule = "@request.auth.id != ''"
    app.save(irrf)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('altas_rendas_parametros')
      if (col) app.delete(col)
    } catch (_) {}

    try {
      const irrf = app.findCollectionByNameOrId('irrf')
      if (irrf && irrf.fields.getByName('tipo')) {
        irrf.fields.removeByName('tipo')
        app.save(irrf)
      }
    } catch (_) {}

    try {
      const rendimentos = app.findCollectionByNameOrId('rendimentos')
      const tipoField = rendimentos.fields.getByName('tipo')
      if (tipoField) {
        tipoField.values = ['tributavel', 'isento', 'exclusiva']
        app.save(rendimentos)
      }
    } catch (_) {}
  },
)
