migrate(
  (app) => {
    const declaracoes = app.findCollectionByNameOrId('declaracoes')

    const irrf = new Collection({
      name: 'irrf',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'declaracao_id',
          type: 'relation',
          required: true,
          collectionId: declaracoes.id,
          maxSelect: 1,
        },
        { name: 'fonte_pagadora', type: 'text', required: true },
        { name: 'cnpj_fonte', type: 'text' },
        { name: 'valor', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_irrf_declaracao ON irrf (declaracao_id)'],
    })
    app.save(irrf)
  },
  (app) => {
    try {
      const irrf = app.findCollectionByNameOrId('irrf')
      if (irrf) app.delete(irrf)
    } catch (_) {}
  },
)
