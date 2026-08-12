migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('declaracoes')

    if (!col.fields.getByName('modalidade')) {
      col.fields.add(
        new SelectField({
          name: 'modalidade',
          values: ['legal', 'simplificada'],
          maxSelect: 1,
        }),
      )
    }

    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['rascunho', 'em_preenchimento', 'calculada', 'concluida', 'entregue']
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('declaracoes')

    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['rascunho', 'em_preenchimento', 'concluida', 'entregue']
    }

    app.save(col)
  },
)
