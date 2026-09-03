// POST /backend/v1/stripe/webhook
// Recebe eventos do Stripe e atualiza o estado de assinatura do escritório.
// Eventos tratados: checkout.session.completed, invoice.paid,
// invoice.payment_failed, customer.subscription.deleted, customer.subscription.updated.
//
// Autenticação: se STRIPE_WEBHOOK_SECRET estiver definida, valida a assinatura
// v2 do PocketBase (header "v-pb-signature", HMAC-SHA256 do corpo + data). Caso
// contrário (ambiente de testes sem segredo), aceita o evento sem validação.
routerAdd('POST', '/backend/v1/stripe/webhook', (e) => {
  var rawBody = ''
  try {
    rawBody = e.request().body
  } catch (_) {
    rawBody = ''
  }
  if (!rawBody) {
    try {
      rawBody = JSON.stringify(e.requestInfo().body || {})
    } catch (_) {
      rawBody = ''
    }
  }

  // ---- Validação de assinatura (opcional) --------------------------------
  var webhookSecret = $os.getenv('STRIPE_WEBHOOK_SECRET') || ''
  if (webhookSecret) {
    var pbSig = ''
    try {
      pbSig = e.request().header.get('v-pb-signature') || ''
    } catch (_) {
      pbSig = ''
    }
    var nowUnix = Math.floor(new Date().getTime() / 1000)
    var janelaValida = false
    for (var d = 0; d <= 300; d += 5) {
      var teste = rawBody + '.' + (nowUnix - d)
      var assinado = $security.hs256(teste, webhookSecret)
      if (assinado && assinado === pbSig) {
        janelaValida = true
        break
      }
    }
    if (!janelaValida) {
      return e.json(400, { success: false, message: 'Assinatura de webhook inválida.' })
    }
  }

  // ---- Parse do evento -----------------------------------------------------
  var evento = {}
  try {
    evento = JSON.parse(rawBody) || {}
  } catch (_) {
    return e.json(400, { success: false, message: 'JSON inválido.' })
  }

  var tipo = evento.type || ''
  var data = evento.data || {}
  var obj = data.object || {}
  if (!tipo || !obj) {
    return e.json(400, { success: false, message: 'Evento Stripe sem type/data.' })
  }

  var eventId = evento.id || ''

  // ---- Resolve o escritório pelo ID do customer ---------------------------
  var customerId =
    obj.customer || (obj.subscription_details && obj.subscription_details.customer) || ''
  var metadata = obj.metadata || {}
  var escId = metadata.escritorio_id || ''
  var esc = null

  if (!escId && customerId) {
    try {
      esc = $app.findFirstRecordByData('escritorios', 'stripe_customer_id', customerId)
      escId = esc.id
    } catch (_) {}
  }
  if (!esc && escId) {
    try {
      esc = $app.findRecordById('escritorios', escId)
    } catch (_) {
      esc = null
    }
  }

  // Deduplicação: não reprocessa o mesmo evento
  if (eventId) {
    try {
      $app.findFirstRecordByData('assinaturas', 'stripe_event_id', eventId)
      return e.json(200, {
        success: true,
        message: 'Evento já processado (deduplicado).',
        duplicado: true,
      })
    } catch (_) {}
  }

  var agora = new Date()

  var registrarAssinatura = function (escritorioId, campos) {
    if (!escritorioId) return
    try {
      var col = $app.findCollectionByNameOrId('assinaturas')
      var rec = new Record(col)
      rec.set('escritorio_id', escritorioId)
      rec.set('stripe_event_id', campos.stripe_event_id || eventId)
      rec.set('stripe_customer_id', campos.stripe_customer_id || customerId)
      rec.set('stripe_subscription_id', campos.stripe_subscription_id || '')
      rec.set('stripe_invoice_id', campos.stripe_invoice_id || '')
      rec.set('tipo_evento', campos.tipo_evento || tipo)
      rec.set('plano', campos.plano || '')
      rec.set('valor', campos.valor || 0)
      rec.set('moeda', campos.moeda || 'brl')
      rec.set('status', campos.status || 'info')
      rec.set('periodo_inicio', campos.periodo_inicio || '')
      rec.set('periodo_fim', campos.periodo_fim || '')
      rec.set('descricao', campos.descricao || '')
      rec.set('dados_evento', campos.dados_evento || evento)
      $app.save(rec)
    } catch (errReg) {
      $app.logger().warn('assinaturas registro falhou', 'error', String(errReg))
    }
  }

  var atualizarEscritorio = function (rec, campos) {
    var precisaSave = false
    for (var k in campos) {
      if (campos[k] !== undefined && campos[k] !== null) {
        rec.set(k, campos[k])
        precisaSave = true
      }
    }
    if (precisaSave) {
      $app.save(rec)
    }
  }

  var converterUnix = function (unix) {
    if (!unix) return ''
    var dt = new Date(unix * 1000)
    return dt.toISOString().replace('T', ' ')
  }

  try {
    // ============================================================
    // checkout.session.completed
    // ============================================================
    if (
      tipo === 'checkout.session.completed' ||
      tipo === 'checkout.session.async_payment_succeeded'
    ) {
      if (!esc) {
        return e.json(200, {
          success: true,
          message: 'Escritório não identificado — evento ignorado.',
        })
      }
      var planoCheckout = metadata.plano || esc.getString('plano') || 'starter'
      var subId = obj.subscription || ''
      var vencCheckout = converterUnix(
        obj.current_period_end ||
          (obj.subscription_details && obj.subscription_details.current_period_end) ||
          0,
      )

      atualizarEscritorio(esc, {
        plano: planoCheckout,
        stripe_customer_id: obj.customer || '',
        stripe_subscription_id: subId,
        assinatura_status: 'ativo',
        data_bloqueio: '',
        data_vencimento: vencCheckout,
      })
      registrarAssinatura(escId, {
        stripe_subscription_id: subId,
        tipo_evento: tipo,
        plano: planoCheckout,
        valor: (obj.amount_total || 0) / 100,
        moeda: obj.currency || 'brl',
        status: 'pago',
        periodo_fim: vencCheckout,
        descricao:
          'Checkout concluído — assinatura ativa (trial de 14 dias incluído quando aplicável)',
      })
      $app.logger().info('stripe webhook: checkout concluído para escritório ' + escId)
      return e.json(200, { success: true, recebido: true })
    }

    // ============================================================
    // invoice.paid
    // ============================================================
    if (tipo === 'invoice.paid' || tipo === 'invoice.payment_succeeded') {
      if (!esc) {
        return e.json(200, {
          success: true,
          message: 'Escritório não identificado — evento ignorado.',
        })
      }
      var planoInvoice =
        (obj.subscription_details &&
          obj.subscription_details.metadata &&
          obj.subscription_details.metadata.plano) ||
        esc.getString('plano')
      var vencInvoice = converterUnix(obj.period_end || 0)

      atualizarEscritorio(esc, {
        assinatura_status: 'ativo',
        data_bloqueio: '',
        data_vencimento: vencInvoice,
        stripe_subscription_id: obj.subscription || '',
      })
      registrarAssinatura(escId, {
        stripe_invoice_id: obj.id || '',
        stripe_subscription_id: obj.subscription || '',
        tipo_evento: tipo,
        plano: planoInvoice,
        valor: (obj.amount_paid || obj.total || 0) / 100,
        moeda: obj.currency || 'brl',
        status: 'pago',
        periodo_inicio: converterUnix(obj.period_start || 0),
        periodo_fim: vencInvoice,
        descricao: 'Fatura #' + (obj.number || '') + ' paga — mensalidade confirmada',
      })
      return e.json(200, { success: true, recebido: true })
    }

    // ============================================================
    // invoice.payment_failed
    // ============================================================
    if (tipo === 'invoice.payment_failed') {
      if (!esc) {
        return e.json(200, {
          success: true,
          message: 'Escritório não identificado — evento ignorado.',
        })
      }
      var bloqueioEm = new Date(agora.getTime() + 24 * 60 * 60 * 1000)
      atualizarEscritorio(esc, {
        assinatura_status: 'atrasado',
        data_bloqueio: bloqueioEm.toISOString().replace('T', ' '),
      })
      registrarAssinatura(escId, {
        stripe_invoice_id: obj.id || '',
        stripe_subscription_id: obj.subscription || '',
        tipo_evento: tipo,
        plano: esc.getString('plano'),
        valor: (obj.amount_due || 0) / 100,
        moeda: obj.currency || 'brl',
        status: 'falha',
        periodo_inicio: converterUnix(obj.period_start || 0),
        periodo_fim: converterUnix(obj.period_end || 0),
        descricao:
          'Falha no pagamento da fatura #' + (obj.number || '') + ' — bloqueio automático em 24h',
      })
      $app
        .logger()
        .warn('stripe webhook: pagamento falhou para escritório ' + escId + ' (bloqueio em 24h)')
      return e.json(200, { success: true, recebido: true })
    }

    // ============================================================
    // customer.subscription.deleted
    // ============================================================
    if (tipo === 'customer.subscription.deleted') {
      if (!esc) {
        return e.json(200, {
          success: true,
          message: 'Escritório não identificado — evento ignorado.',
        })
      }
      atualizarEscritorio(esc, {
        assinatura_status: 'cancelado',
        stripe_subscription_id: obj.id || '',
      })
      registrarAssinatura(escId, {
        stripe_subscription_id: obj.id || '',
        tipo_evento: tipo,
        plano: esc.getString('plano'),
        status: 'cancelado',
        descricao: 'Assinatura cancelada no Stripe',
      })
      return e.json(200, { success: true, recebido: true })
    }

    // ============================================================
    // customer.subscription.updated (ativa / cancelada no fim do período)
    // ============================================================
    if (tipo === 'customer.subscription.updated') {
      if (!esc) {
        return e.json(200, {
          success: true,
          message: 'Escritório não identificado — evento ignorado.',
        })
      }
      var novoStatusSub = obj.status || ''
      var camposUpd = { stripe_subscription_id: obj.id || '' }
      if (novoStatusSub === 'active') {
        camposUpd.assinatura_status = 'ativo'
        camposUpd.data_bloqueio = ''
      } else if (novoStatusSub === 'trialing') {
        camposUpd.assinatura_status = 'trial'
        camposUpd.trial_ate = converterUnix(obj.trial_end || 0)
      } else if (novoStatusSub === 'past_due' || novoStatusSub === 'unpaid') {
        camposUpd.assinatura_status = 'atrasado'
        if (!esc.getString('data_bloqueio')) {
          var blq = new Date(agora.getTime() + 24 * 60 * 60 * 1000)
          camposUpd.data_bloqueio = blq.toISOString().replace('T', ' ')
        }
      }
      atualizarEscritorio(esc, camposUpd)
      registrarAssinatura(escId, {
        stripe_subscription_id: obj.id || '',
        tipo_evento: tipo,
        plano: (obj.metadata && obj.metadata.plano) || esc.getString('plano'),
        status: 'info',
        periodo_inicio: converterUnix(obj.current_period_start || 0),
        periodo_fim: converterUnix(obj.current_period_end || 0),
        descricao: 'Assinatura atualizada — status Stripe: ' + (novoStatusSub || 'desconhecido'),
      })
      return e.json(200, { success: true, recebido: true })
    }

    // Outros eventos: apenas registra no histórico
    if (esc) {
      registrarAssinatura(escId, {
        tipo_evento: tipo,
        plano: esc.getString('plano'),
        status: 'info',
        descricao: 'Evento Stripe recebido (sem ação de estado)',
      })
    }
    return e.json(200, { success: true, recebido: true, acao: 'nenhuma' })
  } catch (errProc) {
    $app.logger().error('stripe webhook erro', 'error', String(errProc))
    return e.json(500, {
      success: false,
      message: 'Erro interno ao processar webhook: ' + String(errProc),
    })
  }
})
