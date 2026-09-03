// POST /backend/v1/stripe/checkout
// Cria uma sessão de Checkout do Stripe (cartão + PIX) para o plano informado.
// Requer as chaves STRIPE_SECRET_KEY e STRIPE_PUBLISHABLE_KEY no ambiente.
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
    var precos = { starter: 4900, pro: 12900, enterprise: 29900 }
    if (!plano || !precos[plano]) {
      return e.badRequestError('Plano inválido. Planos disponíveis: starter, pro, enterprise.')
    }

    var secretKey = $os.getenv('STRIPE_SECRET_KEY') || ''
    if (!secretKey) {
      return e.json(503, {
        success: false,
        stripe_configurado: false,
        message:
          'O pagamento com Stripe ainda não está configurado neste ambiente (STRIPE_SECRET_KEY ausente). Solicite ao administrador que cadastre as chaves do Stripe.',
      })
    }

    var frontendUrl = $os.getenv('SITE_URL') || ''
    if (!frontendUrl) {
      return e.json(503, {
        success: false,
        stripe_configurado: false,
        message:
          'SITE_URL não configurado no ambiente: impossível definir as URLs de retorno do checkout.',
      })
    }
    frontendUrl = frontendUrl.replace(/\/$/, '')

    var esc
    try {
      esc = $app.findRecordById('escritorios', escId)
    } catch (_) {
      return e.notFoundError('Escritório não encontrado.')
    }

    var nomesPlanos = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }

    // Garante um customer do Stripe para o escritório
    var customerId = esc.getString('stripe_customer_id') || ''
    try {
      if (!customerId) {
        var emailEsc = esc.getString('email') || auth.email()
        var createRes = $http.send({
          url: 'https://api.stripe.com/v1/customers',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + secretKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body:
            'name=' +
            encodeURIComponent(esc.getString('nome') || 'Escritório') +
            (emailEsc ? '&email=' + encodeURIComponent(emailEsc) : ''),
          timeout: 20,
        })
        if (
          createRes.status >= 200 &&
          createRes.status < 300 &&
          createRes.json &&
          createRes.json.id
        ) {
          customerId = createRes.json.id
          esc.set('stripe_customer_id', customerId)
          $app.save(esc)
        } else {
          var errMsg =
            createRes.json && createRes.json.error && createRes.json.error.message
              ? createRes.json.error.message
              : 'status ' + createRes.status
          $app.logger().error('stripe customer create failed', 'error', errMsg)
          return e.json(502, {
            success: false,
            message: 'Falha ao criar cliente no Stripe: ' + errMsg,
          })
        }
      }
    } catch (errCust) {
      return e.json(502, {
        success: false,
        message: 'Falha de comunicação com o Stripe: ' + String(errCust),
      })
    }

    // Sessão de Checkout: cartão + PIX, trial de 14 dias
    var formParts = [
      'mode=subscription',
      'customer=' + encodeURIComponent(customerId),
      'line_items[0][quantity]=1',
      'line_items[0][price_data][currency]=brl',
      'line_items[0][price_data][unit_amount]=' + precos[plano],
      'line_items[0][price_data][recurring][interval]=month',
      'line_items[0][price_data][product_data][name]=Plano ' +
        nomesPlanos[plano] +
        ' — Inteligência Tributária IR',
      'line_items[0][price_data][product_data][description]=Assinatura mensal do plano ' +
        nomesPlanos[plano] +
        ' (R$ ' +
        precos[plano] / 100 +
        '/mês)',
      'subscription_data[trial_period_days]=14',
      'subscription_data[metadata][escritorio_id]=' + encodeURIComponent(escId),
      'subscription_data[metadata][plano]=' + encodeURIComponent(plano),
      'metadata[escritorio_id]=' + encodeURIComponent(escId),
      'metadata[plano]=' + encodeURIComponent(plano),
      'success_url=' +
        encodeURIComponent(
          frontendUrl + '/app/planos?checkout=success&session_id={CHECKOUT_SESSION_ID}',
        ),
      'cancel_url=' + encodeURIComponent(frontendUrl + '/app/planos?checkout=cancel'),
      'client_reference_id=' + encodeURIComponent(escId),
      'locale=pt-BR',
      'payment_method_types[0]=card',
      'payment_method_types[1]=pix',
      'allow_promotion_codes=true',
    ]
    var form = formParts.join('&')

    try {
      var res = $http.send({
        url: 'https://api.stripe.com/v1/checkout/sessions',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + secretKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
        timeout: 25,
      })

      var j = res.json || {}
      if (res.status >= 200 && res.status < 300 && j.id && j.url) {
        // Marca o estado local como "trial" se o escritório ainda não tem status
        if (!esc.getString('assinatura_status')) {
          esc.set('assinatura_status', 'trial')
        }
        esc.set('plano', plano)
        $app.save(esc)

        try {
          var auditCol = $app.findCollectionByNameOrId('audit_logs')
          var auditRec = new Record(auditCol)
          auditRec.set('user_id', auth.id)
          auditRec.set('action', 'stripe_checkout_criado')
          auditRec.set('entity', 'escritorios')
          auditRec.set('entity_id', escId)
          auditRec.set(
            'diff',
            JSON.stringify({ plano: plano, session_id: j.id, customer: customerId }),
          )
          $app.save(auditRec)
        } catch (_) {}

        return e.json(200, {
          success: true,
          stripe_configurado: true,
          checkout_url: j.url,
          session_id: j.id,
          plano: plano,
          trial_dias: 14,
        })
      }

      var err2 = j.error && j.error.message ? j.error.message : 'status ' + res.status
      $app.logger().error('stripe checkout failed', 'error', err2)
      return e.json(502, {
        success: false,
        message: 'Stripe recusou a criação do checkout: ' + err2,
      })
    } catch (errHttp) {
      return e.json(502, {
        success: false,
        message: 'Falha de comunicação com o Stripe: ' + String(errHttp),
      })
    }
  },
  $apis.requireAuth(),
)
