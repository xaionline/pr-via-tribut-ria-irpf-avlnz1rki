routerAdd(
  'GET',
  '/backend/v1/tabelas-progressivas/{ano}',
  (e) => {
    var ano = e.request.pathValue('ano')
    if (!ano) {
      return e.badRequestError('Ano-calendário é obrigatório.')
    }

    var anoNum = Number(ano)
    if (isNaN(anoNum) || !Number.isInteger(anoNum)) {
      return e.badRequestError('Ano-calendário inválido: "' + ano + '".')
    }

    var tabRecord
    try {
      tabRecord = $app.findFirstRecordByData('tabelas_progressivas', 'ano_calendario', anoNum)
    } catch (_) {
      // Backwards-compat fallback to the legacy `ano` field.
      try {
        tabRecord = $app.findFirstRecordByData('tabelas_progressivas', 'ano', anoNum)
      } catch (_e) {
        return e.json(404, {
          success: false,
          message: 'Nenhuma tabela progressiva cadastrada para o ano-calendário ' + anoNum + '.',
        })
      }
    }

    var faixas = []
    try {
      var rawFaixas = tabRecord.get('faixas')
      if (typeof rawFaixas === 'string') {
        faixas = JSON.parse(rawFaixas)
      } else if (Array.isArray(rawFaixas)) {
        faixas = rawFaixas
      } else if (rawFaixas && typeof rawFaixas === 'object') {
        faixas = rawFaixas
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      ano_calendario: tabRecord.getNumber('ano_calendario') || tabRecord.getNumber('ano') || anoNum,
      descricao: tabRecord.getString('descricao') || '',
      data_vigencia_inicio: tabRecord.getString('data_vigencia_inicio') || '',
      data_vigencia_fim: tabRecord.getString('data_vigencia_fim') || '',
      faixas: faixas,
    })
  },
  $apis.requireAuth(),
)
