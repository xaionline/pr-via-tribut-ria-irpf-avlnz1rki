// pocketbase/migrations/0028_stripe_assinaturas.js
// Sistema de pagamento/assinatura Stripe:
//  1. Campos de assinatura na collection escritorios
//  2. Nova collection `assinaturas` (histórico de eventos/faturas do Stripe)
//  3. Parâmetro de envio de e-mail do alerta de mensalidade (enviar_mensalidade)
migrate(
  (app) => {
    const escritoriosCol = app.findCollectionByNameOrId('escritorios')

    // ------------------------------------------------------------------
    // 1. Campos de assinatura no escritorios
    // ------------------------------------------------------------------
    if (!escritoriosCol.fields.getByName('stripe_customer_id')) {
      escritoriosCol.fields.add(new TextField({ name: 'stripe_customer_id', max: 255 }))
    }
    if (!escritoriosCol.fields.getByName('stripe_subscription_id')) {
      escritoriosCol.fields.add(new TextField({ name: 'stripe_subscription_id', max: 255 }))
    }
    if (!escritoriosCol.fields.getByName('assinatura_status')) {
      escritoriosCol.fields.add(
        new SelectField({
          name: 'assinatura_status',
          values: ['trial', 'ativo', 'atrasado', 'cancelado', 'bloqueado'],
          maxSelect: 1,
        }),
      )
    }
    if (!escritoriosCol.fields.getByName('data_vencimento')) {
      escritoriosCol.fields.add(new DateField({ name: 'data_vencimento' }))
    }
    if (!escritoriosCol.fields.getByName('data_bloqueio')) {
      escritoriosCol.fields.add(new DateField({ name: 'data_bloqueio' }))
    }
    if (!escritoriosCol.fields.getByName('trial_ate')) {
      escritoriosCol.fields.add(new DateField({ name: 'trial_ate' }))
    }
    if (!escritoriosCol.fields.getByName('limite_empresas')) {
      escritoriosCol.fields.add(new NumberField({ name: 'limite_empresas', onlyInt: true, min: 0 }))
    }
    app.save(escritoriosCol)

    // ------------------------------------------------------------------
    // 2. Collection assinaturas (histórico de eventos/faturas Stripe)
    // ------------------------------------------------------------------
    if (!app.hasTable('assinaturas')) {
      const assinaturasCol = new Collection({
        name: 'assinaturas',
        type: 'base',
        listRule: "@request.auth.id != '' && escritorio_id = @request.auth.escritorio_id",
        viewRule: "@request.auth.id != '' && escritorio_id = @request.auth.escritorio_id",
        createRule: null, // criado apenas pelo backend (webhooks)
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'escritorio_id',
            type: 'relation',
            collectionId: escritoriosCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          { name: 'stripe_event_id', type: 'text', max: 255 },
          { name: 'stripe_customer_id', type: 'text', max: 255 },
          { name: 'stripe_subscription_id', type: 'text', max: 255 },
          { name: 'stripe_invoice_id', type: 'text', max: 255 },
          { name: 'tipo_evento', type: 'text', max: 100 },
          {
            name: 'plano',
            type: 'select',
            values: ['starter', 'pro', 'enterprise'],
            maxSelect: 1,
          },
          { name: 'valor', type: 'number' },
          { name: 'moeda', type: 'text', max: 10 },
          {
            name: 'status',
            type: 'select',
            values: ['pago', 'falha', 'pendente', 'cancelado', 'info'],
            maxSelect: 1,
          },
          { name: 'periodo_inicio', type: 'date' },
          { name: 'periodo_fim', type: 'date' },
          { name: 'descricao', type: 'text', max: 500 },
          { name: 'dados_evento', type: 'json', maxSize: 2000000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_assinaturas_escritorio ON assinaturas (escritorio_id)',
          'CREATE UNIQUE INDEX idx_assinaturas_evento ON assinaturas (stripe_event_id) WHERE stripe_event_id != ""',
          'CREATE INDEX idx_assinaturas_tipo ON assinaturas (tipo_evento)',
        ],
      })
      app.save(assinaturasCol)
    }

    // ------------------------------------------------------------------
    // 3. Parâmetro de e-mail do alerta de mensalidade (mesmo padrão dos outros)
    // ------------------------------------------------------------------
    try {
      const alertasCfgCol = app.findCollectionByNameOrId('alertas_config')
      if (alertasCfgCol && !alertasCfgCol.fields.getByName('enviar_mensalidade')) {
        alertasCfgCol.fields.add(new BoolField({ name: 'enviar_mensalidade' }))
        app.save(alertasCfgCol)
      }
    } catch (_) {}

    // ------------------------------------------------------------------
    // 4. Estado inicial: trial de 14 dias + limites por plano
    // ------------------------------------------------------------------
    try {
      const escritorios = app.findRecordsByFilter('escritorios', 'id != ""', 'created', 500, 0)
      for (const esc of escritorios) {
        const precisaEstado = !esc.getString('assinatura_status')
        const precisaLimite = esc.getNumber('limite_empresas') <= 0
        if (!precisaEstado && !precisaLimite) continue

        if (precisaLimite) {
          const plano = esc.getString('plano') || 'starter'
          const limiteEmpresas = plano === 'starter' ? 10 : plano === 'pro' ? 50 : 0 // enterprise = ilimitado
          const limiteClientes = plano === 'starter' ? 20 : plano === 'pro' ? 150 : 0
          esc.set('limite_empresas', limiteEmpresas)
          // Alinha o limite de clientes ao plano somente se não tiver sido personalizado
          if (esc.getNumber('limite_clientes') > 100) {
            esc.set('limite_clientes', limiteClientes)
          }
        }
        if (precisaEstado) {
          esc.set('assinatura_status', 'trial')
          const agora = new Date()
          const trialAte = new Date(agora.getTime() + 14 * 24 * 60 * 60 * 1000)
          // Formato PocketBase: "2006-01-02 15:04:05.000Z"
          esc.set('trial_ate', trialAte.toISOString().replace('T', ' '))
        }
        app.save(esc)
      }
    } catch (err) {
      console.log('0028: falha ao aplicar estado inicial nos escritorios: ' + String(err))
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('assinaturas')
      if (col) app.delete(col)
    } catch (_) {}
    try {
      const escritoriosCol = app.findCollectionByNameOrId('escritorios')
      for (const f of [
        'stripe_customer_id',
        'stripe_subscription_id',
        'assinatura_status',
        'data_vencimento',
        'data_bloqueio',
        'trial_ate',
        'limite_empresas',
      ]) {
        try {
          escritoriosCol.fields.removeByName(f)
        } catch (_) {}
      }
      app.save(escritoriosCol)
    } catch (_) {}
    try {
      const alertasCfgCol = app.findCollectionByNameOrId('alertas_config')
      if (alertasCfgCol) {
        try {
          alertasCfgCol.fields.removeByName('enviar_mensalidade')
          app.save(alertasCfgCol)
        } catch (_) {}
      }
    } catch (_) {}
  },
)
