migrate(
  (app) => {
    const declaracoesCol = app.findCollectionByNameOrId('declaracoes')

    const collection = new Collection({
      name: 'cenarios_simulacao',
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
          collectionId: declaracoesCol.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text' },
        { name: 'params', type: 'json' },
        { name: 'resultados', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cenarios_declaracao ON cenarios_simulacao (declaracao_id)'],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('cenarios_simulacao')
      app.delete(col)
    } catch (_) {}
  },
)
