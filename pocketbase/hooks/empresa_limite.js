// onRecordCreateRequest('empresas')
// Guarda o limite de empresas (limite_empresas) definido no plano do escritório.
// 0 = ilimitado (Enterprise).
onRecordCreateRequest((e) => {
  var authUser = e.auth
  if (!authUser) return e.next()

  var escId = authUser.getString('escritorio_id')
  if (!escId) return e.next()

  try {
    var esc = $app.findRecordById('escritorios', escId)
    var limite = esc.getNumber('limite_empresas') || 0
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
