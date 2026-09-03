// POST /backend/v1/stripe/checkout
// Retorna o Stripe Payment Link correspondente ao plano informado,
// incluindo o client_reference_id e prefilled_email como query params.
// NÃO realiza chamadas HTTP de saída síncronas para a api.stripe.com para
// evitar problemas de timeout/bloqueio de rede externa.
routerAdd(
  'POST',
  '/backend/v1/stripe/checkout',
  (e) => {
    var auth = e.auth
    if (!auth) {
      return e.unauthorizedError('Autenticação necessária.')
    }

    var escId = auth.getString('escritorio_id')
    if (!escId) {
      return e.badRequestError('Usuário sem escritório vinculado.')
    }

    var body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {
      body = {}
    }

    var plano = (body.plano || '').trim().toLowerCase()
    var planosValidos = { starter: true, pro: true, enterprise: true }
    if (!plano || !planosValidos[plano]) {
      return e.badRequestError('Plano inválido. Planos disponíveis: starter, pro, enterprise.')
    }

    var esc
    try {
      esc = $app.findRecordById('escritorios', escId)
    } catch (_) {
      return e.notFoundError('Escritório não encontrado.')
    }

    // 1. Obtém o Payment Link da variável de ambiente por plano
    var paymentLinks = {
      starter: ($os.getenv('STRIPE_PAYMENT_LINK_STARTER') || '').trim(),
      pro: ($os.getenv('STRIPE_PAYMENT_LINK_PRO') || '').trim(),
      enterprise: ($os.getenv('STRIPE_PAYMENT_LINK_ENTERPRISE') || '').trim(),
    }

    var baseLink = paymentLinks[plano] || ''

    if (!baseLink) {
      return e.json(503, {
        success: false,
        stripe_configurado: false,
        message:
          'O Payment Link para o plano ' +
          plano.toUpperCase() +
          ' ainda não foi cadastrado no ambiente (adicione a variável STRIPE_PAYMENT_LINK_' +
          plano.toUpperCase() +
          '). Crie o Payment Link no painel do Stripe e configure seu segredo.',
      })
    }

    // Monta a URL final injetando client_reference_id e prefilled_email
    var emailCliente = esc.getString('email') || auth.email() || ''
    var separator = baseLink.indexOf('?') >= 0 ? '&' : '?'
    var checkoutUrl =
      baseLink +
      separator +
      'client_reference_id=' +
      encodeURIComponent(escId) +
      (emailCliente ? '&prefilled_email=' + encodeURIComponent(emailCliente) : '')

    // Marca o plano pretendido no escritório caso não tenha
    if (!esc.getString('plano')) {
      esc.set('plano', plano)
      $app.save(esc)
    }

    try {
      var auditCol = $app.findCollectionByNameOrId('audit_logs')
      var auditRec = new Record(auditCol)
      auditRec.set('user_id', auth.id)
      auditRec.set('action', 'stripe_payment_link_gerado')
      auditRec.set('entity', 'escritorios')
      auditRec.set('entity_id', escId)
      auditRec.set(
        'diff',
        JSON.stringify({ plano: plano, payment_link: baseLink, redirect_url: checkoutUrl }),
      )
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      stripe_configurado: true,
      checkout_url: checkoutUrl,
      plano: plano,
    })
  },
  $apis.requireAuth(),
)
