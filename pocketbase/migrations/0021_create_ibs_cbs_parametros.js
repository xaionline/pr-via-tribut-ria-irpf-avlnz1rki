// pocketbase/migrations/0021_create_ibs_cbs_parametros.js
migrate(
  (app) => {
    const ibsCbsParametros = new Collection({
      name: 'ibs_cbs_parametros',
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
          name: 'iva_padrao',
          type: 'number',
          required: true,
        },
        {
          name: 'reducao_percentual',
          type: 'number',
          required: true,
        },
        {
          name: 'presuncao_bc',
          type: 'number',
          required: true,
        },
        {
          name: 'funrural',
          type: 'number',
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_ibs_cbs_parametros_ano_calendario ON ibs_cbs_parametros (ano_calendario)',
      ],
    })
    app.save(ibsCbsParametros)

    // Seed com dados padrão para 2025 e 2026
    const defaultParams = [
      {
        ano_calendario: 2024,
        iva_padrao: 27.91,
        reducao_percentual: 60.0,
        presuncao_bc: 20.0,
        funrural: 1.63,
      },
      {
        ano_calendario: 2025,
        iva_padrao: 27.91,
        reducao_percentual: 60.0,
        presuncao_bc: 20.0,
        funrural: 1.63,
      },
      {
        ano_calendario: 2026,
        iva_padrao: 27.91,
        reducao_percentual: 60.0,
        presuncao_bc: 20.0,
        funrural: 1.63,
      },
    ]

    for (const item of defaultParams) {
      try {
        app.findFirstRecordByData('ibs_cbs_parametros', 'ano_calendario', item.ano_calendario)
      } catch (_) {
        const rec = new Record(ibsCbsParametros)
        rec.set('ano_calendario', item.ano_calendario)
        rec.set('iva_padrao', item.iva_padrao)
        rec.set('reducao_percentual', item.reducao_percentual)
        rec.set('presuncao_bc', item.presuncao_bc)
        rec.set('funrural', item.funrural)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ibs_cbs_parametros')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
