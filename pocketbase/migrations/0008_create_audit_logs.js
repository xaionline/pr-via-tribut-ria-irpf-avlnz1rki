migrate(
  (app) => {
    const collection = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true },
        { name: 'entity', type: 'text', required: true },
        { name: 'entity_id', type: 'text', required: false },
        { name: 'diff', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id)',
        'CREATE INDEX idx_audit_logs_user ON audit_logs (user_id)',
        'CREATE INDEX idx_audit_logs_created ON audit_logs (created)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('audit_logs')
      app.delete(collection)
    } catch (_) {}
  },
)
