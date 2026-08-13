migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('escritorios')
    if (!col.fields.getByName('logo')) {
      col.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('escritorios')
    const logoField = col.fields.getByName('logo')
    if (logoField) {
      col.fields.remove(logoField)
      app.save(col)
    }
  },
)
