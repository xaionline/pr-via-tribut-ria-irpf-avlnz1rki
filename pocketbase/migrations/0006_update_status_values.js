migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('declaracoes')
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['rascunho', 'calculada', 'revisada', 'apresentada', 'retificada']
    }
    app.save(col)

    app
      .db()
      .newQuery("UPDATE declaracoes SET status = 'revisada' WHERE status = 'em_preenchimento'")
      .execute()
    app
      .db()
      .newQuery("UPDATE declaracoes SET status = 'apresentada' WHERE status = 'concluida'")
      .execute()
    app
      .db()
      .newQuery("UPDATE declaracoes SET status = 'retificada' WHERE status = 'entregue'")
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('declaracoes')
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['rascunho', 'em_preenchimento', 'calculada', 'concluida', 'entregue']
    }
    app.save(col)

    app
      .db()
      .newQuery("UPDATE declaracoes SET status = 'em_preenchimento' WHERE status = 'revisada'")
      .execute()
    app
      .db()
      .newQuery("UPDATE declaracoes SET status = 'concluida' WHERE status = 'apresentada'")
      .execute()
    app
      .db()
      .newQuery("UPDATE declaracoes SET status = 'entregue' WHERE status = 'retificada'")
      .execute()
  },
)
