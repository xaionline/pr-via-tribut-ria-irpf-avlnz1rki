migrate(
  (app) => {
    // 0026_create_alertas_config.js
    // Tabela para persistir preferências de alertas automáticos e envio de e-mails para o escritório
    const escritoriosCol = app.findCollectionByNameOrId('escritorios')

    const collection = new Collection({
      name: 'alertas_config',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'escritorio_id',
          type: 'relation',
          required: true,
          collectionId: escritoriosCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'email_proprietario',
          type: 'email',
          required: false,
        },
        {
          name: 'enviar_email_geral',
          type: 'bool',
          required: false,
        },
        {
          name: 'enviar_fator_r',
          type: 'bool',
          required: false,
        },
        {
          name: 'enviar_pro_labore',
          type: 'bool',
          required: false,
        },
        {
          name: 'enviar_altas_rendas',
          type: 'bool',
          required: false,
        },
        {
          name: 'enviar_anexo_simples',
          type: 'bool',
          required: false,
        },
        {
          name: 'config_alertas_custom',
          type: 'json',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_alertas_config_escritorio ON alertas_config (escritorio_id)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('alertas_config')
      app.delete(collection)
    } catch (_) {}
  },
)
