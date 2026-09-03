onRecordCreateRequest((e) => {
  const authUser = e.auth
  if (!authUser) return e.next()

  const escId = authUser.getString('escritorio_id')
  if (!escId) return e.next()

  try {
    const esc = $app.findRecordById('escritorios', escId)
    const limite = Number(esc.get('limite_clientes')) || 0
    const count = $app.countRecords(
      'clientes',
      "escritorio_id = '" + escId + "' && status = 'ativo'",
    )

    if (count >= limite) {
      return e.badRequestError(
        'Limite anual de clientes do escritório atingido (' + limite + ' clientes).',
      )
    }
  } catch (_) {}

  return e.next()
}, 'clientes')
