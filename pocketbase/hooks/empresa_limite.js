// onRecordCreateRequest('empresas')
// Bloqueia cadastro de empresas no plano Starter (apenas PF) e guarda limite nos demais.
// 0 = ilimitado (Enterprise).
// Trial de 14 dias tem tudo liberado (equivale ao Pro).
onRecordCreateRequest((e) => {
  var authUser = e.auth
  if (!authUser) return e.next()

  var escId = authUser.getString('escritorio_id')
  if (!escId) return e.next()

  // Se o usuário for super_admin, libera
  try {
    if (authUser.getString('cargo') === 'super_admin') {
      return e.next()
    }
  } catch (_) {}

  try {
    var esc = $app.findRecordById('escritorios', escId)
    var plano = (esc.getString('plano') || '').toLowerCase()
    var statusAssinatura = (esc.getString('assinatura_status') || '').toLowerCase()

    // Regra do plano Starter: apenas PF (a menos que esteja em trial)
    if (plano === 'starter' && statusAssinatura !== 'trial') {
      return e.badRequestError(
        'O módulo de Empresas PJ está disponível a partir do plano Pro. Faça upgrade da sua assinatura em /app/planos para cadastrar e gerenciar empresas.',
      )
    }

    var limite = Number(esc.get('limite_empresas')) || 0
    if (limite <= 0) return e.next() // ilimitado (Enterprise)

    var count = $app.countRecords('empresas', "escritorio_id = '" + escId + "'")
    if (count >= limite) {
      return e.badRequestError(
        'Limite de empresas do plano atingido (' +
          limite +
          ' empresas). Faça upgrade do plano em /app/planos para cadastrar mais.',
      )
    }
  } catch (_) {}

  return e.next()
}, 'empresas')
