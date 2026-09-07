// onRecordCreateRequest('escritorios')
// Garante validação de CNPJ e unicidade mesmo em inserções diretas via API PocketBase.
onRecordCreateRequest((e) => {
  var rec = e.record
  if (!rec) return e.next()

  var cnpjRaw = (rec.getString('cnpj') || '').trim()
  if (!cnpjRaw) return e.next()

  var cnpjDigitos = cnpjRaw.replace(/\D/g, '')
  if (cnpjDigitos.length !== 14) {
    return e.badRequestError('CNPJ deve conter 14 dígitos.')
  }

  // Validação dos dígitos verificadores
  if (/^(\d)\1{13}$/.test(cnpjDigitos)) {
    return e.badRequestError('CNPJ inválido.')
  }

  var t1 = 12
  var n1 = cnpjDigitos.substring(0, t1)
  var s1 = 0
  var p1 = t1 - 7
  for (var i1 = t1; i1 >= 1; i1--) {
    s1 += parseInt(n1.charAt(t1 - i1), 10) * p1--
    if (p1 < 2) p1 = 9
  }
  var r1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11)
  if (r1 !== parseInt(cnpjDigitos.charAt(12), 10)) {
    return e.badRequestError('CNPJ inválido.')
  }

  var t2 = 13
  var n2 = cnpjDigitos.substring(0, t2)
  var s2 = 0
  var p2 = t2 - 7
  for (var i2 = t2; i2 >= 1; i2--) {
    s2 += parseInt(n2.charAt(t2 - i2), 10) * p2--
    if (p2 < 2) p2 = 9
  }
  var r2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11)
  if (r2 !== parseInt(cnpjDigitos.charAt(13), 10)) {
    return e.badRequestError('CNPJ inválido.')
  }

  // Normaliza o CNPJ gravado para somente dígitos
  rec.set('cnpj', cnpjDigitos)

  // Duplicidade em escritorios
  try {
    var exist = $app.findFirstRecordByData('escritorios', 'cnpj', cnpjDigitos)
    if (exist) {
      return e.badRequestError('Este CNPJ já possui um cadastro no sistema.')
    }
  } catch (_) {}

  // Verificação de histórico de trials já consumidos
  try {
    var hist = $app.findFirstRecordByData('historico_trials_cnpj', 'cnpj', cnpjDigitos)
    if (hist) {
      return e.badRequestError('Este CNPJ já utilizou o período de teste grátis de 14 dias.')
    }
  } catch (_) {}

  return e.next()
}, 'escritorios')

// onRecordUpdateRequest('escritorios')
// Garante validação de CNPJ e verificação de duplicidade ao atualizar dados do escritório.
onRecordUpdateRequest((e) => {
  var rec = e.record
  if (!rec) return e.next()

  var cnpjRaw = (rec.getString('cnpj') || '').trim()
  if (!cnpjRaw) return e.next()

  var cnpjDigitos = cnpjRaw.replace(/\D/g, '')
  if (cnpjDigitos.length !== 14) {
    return e.badRequestError('CNPJ deve conter 14 dígitos.')
  }

  // Validação dos dígitos verificadores
  if (/^(\d)\1{13}$/.test(cnpjDigitos)) {
    return e.badRequestError('CNPJ inválido.')
  }

  var t1 = 12
  var n1 = cnpjDigitos.substring(0, t1)
  var s1 = 0
  var p1 = t1 - 7
  for (var i1 = t1; i1 >= 1; i1--) {
    s1 += parseInt(n1.charAt(t1 - i1), 10) * p1--
    if (p1 < 2) p1 = 9
  }
  var r1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11)
  if (r1 !== parseInt(cnpjDigitos.charAt(12), 10)) {
    return e.badRequestError('CNPJ inválido.')
  }

  var t2 = 13
  var n2 = cnpjDigitos.substring(0, t2)
  var s2 = 0
  var p2 = t2 - 7
  for (var i2 = t2; i2 >= 1; i2--) {
    s2 += parseInt(n2.charAt(t2 - i2), 10) * p2--
    if (p2 < 2) p2 = 9
  }
  var r2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11)
  if (r2 !== parseInt(cnpjDigitos.charAt(13), 10)) {
    return e.badRequestError('CNPJ inválido.')
  }

  rec.set('cnpj', cnpjDigitos)

  // Duplicidade em outro escritório
  try {
    var exist = $app.findFirstRecordByData('escritorios', 'cnpj', cnpjDigitos)
    if (exist && exist.id !== rec.id) {
      return e.badRequestError('Este CNPJ já possui um cadastro no sistema.')
    }
  } catch (_) {}

  return e.next()
}, 'escritorios')
