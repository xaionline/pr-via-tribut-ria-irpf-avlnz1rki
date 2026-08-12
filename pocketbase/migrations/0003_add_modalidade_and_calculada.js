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
      col.fields.remove(statusField)
    }
    col.fields.add(
      new SelectField({
        name: 'status',
        required: true,
        values: ['rascunho', 'em_preenchimento', 'calculada', 'concluida', 'entregue'],
        maxSelect: 1,
      }),
    )

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('declaracoes')

    const modalidadeField = col.fields.getByName('modalidade')
    if (modalidadeField) {
      col.fields.remove(modalidadeField)
    }

    const statusField = col.fields.getByName('status')
    if (statusField) {
      col.fields.remove(statusField)
    }
    col.fields.add(
      new SelectField({
        name: 'status',
        required: true,
        values: ['rascunho', 'em_preenchimento', 'concluida', 'entregue'],
        maxSelect: 1,
      }),
    )

    app.save(col)
  },
)
