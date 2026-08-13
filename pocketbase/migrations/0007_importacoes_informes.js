migrate(
  (app) => {
    const declaracoesCol = app.findCollectionByNameOrId('declaracoes')
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    const importacoes = new Collection({
      name: 'importacoes_informes',
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
        { name: 'cliente_id', type: 'relation', collectionId: clientesCol.id, maxSelect: 1 },
        {
          name: 'arquivo_original',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        { name: 'nome_arquivo', type: 'text', required: true },
        { name: 'importado_por', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['processando', 'concluida', 'falhou', 'cancelada'],
          maxSelect: 1,
        },
        { name: 'detalhes', type: 'json' },
        { name: 'reversao', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_importacoes_declaracao ON importacoes_informes (declaracao_id)',
        'CREATE INDEX idx_importacoes_cliente ON importacoes_informes (cliente_id)',
        'CREATE INDEX idx_importacoes_usuario ON importacoes_informes (importado_por)',
        'CREATE INDEX idx_importacoes_created ON importacoes_informes (created)',
      ],
    })
    app.save(importacoes)

    const rendimentos = app.findCollectionByNameOrId('rendimentos')
    rendimentos.fields.add(
      new SelectField({ name: 'origem', values: ['manual', 'importado'], maxSelect: 1 }),
    )
    rendimentos.fields.add(
      new RelationField({ name: 'importacao_id', collectionId: importacoes.id, maxSelect: 1 }),
    )
    rendimentos.fields.add(new NumberField({ name: 'confianca' }))
    rendimentos.addIndex('idx_rendimentos_importacao', false, 'importacao_id', '')
    rendimentos.addIndex('idx_rendimentos_origem', false, 'origem', '')
    app.save(rendimentos)

    app
      .db()
      .newQuery("UPDATE rendimentos SET origem = 'manual' WHERE origem IS NULL OR origem = ''")
      .execute()
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('importacoes_informes'))
    } catch (_) {}
    try {
      const r = app.findCollectionByNameOrId('rendimentos')
      const f1 = r.fields.getByName('origem')
      if (f1) r.fields.remove(f1)
      const f2 = r.fields.getByName('importacao_id')
      if (f2) r.fields.remove(f2)
      const f3 = r.fields.getByName('confianca')
      if (f3) r.fields.remove(f3)
      r.removeIndex('idx_rendimentos_importacao')
      r.removeIndex('idx_rendimentos_origem')
      app.save(r)
    } catch (_) {}
  },
)
