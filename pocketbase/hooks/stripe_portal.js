// POST /backend/v1/stripe/portal
// Cria uma sessão do Billing Portal do Stripe para o escritório autenticado.
routerAdd(
  'POST',
  '/backend/v1/stripe/portal',
  (e) => {
    var auth = e.auth
    if (!auth) {
      return e.unauthorizedError('Autenticação necessária.')
    }

    var escId = auth.getString('escritorio_id')
    if (!escId) {
      return e.badRequestError('Usuário sem escritório vinculado.')
    }

    var secretKey = $os.getenv('STRIPE_SECRET_KEY') || ''
    if (!secretKey) {
      return e.json(503, {
        success: false,
        stripe_configurado: false,
        message:
          'O Stripe ainda não está configurado neste ambiente (STRIPE_SECRET_KEY ausente). Solicite ao administrador que cadastre as chaves.',
      })
    }

    var frontendUrl = ($os.getenv('SITE_URL') || '').replace(/\/$/, '')
    if (!frontendUrl) {
      return e.json(503, {
        success: false,
        stripe_configurado: false,
        message:
          'SITE_URL não configurado no ambiente: impossível definir a URL de retorno do portal.',
      })
    }

    var esc
    try {
      esc = $app.findRecordById('escritorios', escId)
    } catch (_) {
      return e.notFoundError('Escritório não encontrado.')
    }

    var customerId = esc.getString('stripe_customer_id') || ''
    if (!customerId) {
      return e.json(400, {
        success: false,
        message:
          'Nenhuma assinatura Stripe encontrada para este escritório. Assine um plano primeiro em /app/planos.',
      })
    }

    try {
      var res = $http.send({
        url: 'https://api.stripe.com/v1/billing_portal/sessions',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + secretKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body:
          'customer=' +
          encodeURIComponent(customerId) +
          '&return_url=' +
          encodeURIComponent(frontendUrl + '/app/planos'),
        timeout: 25,
      })

      var j = res.json || {}
      if (res.statusCode >= 200 && res.statusCode < 300 && j.url) {
        return e.json(200, {
          success: true,
          stripe_configurado: true,
          portal_url: j.url,
        })
      }

      var err = j.error && j.error.message ? j.error.message : 'statusCode ' + res.statusCode
      $app.logger().error('stripe portal failed', 'error', err)
      return e.json(502, {
        success: false,
        message: 'Stripe recusou a criação do portal: ' + err,
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
