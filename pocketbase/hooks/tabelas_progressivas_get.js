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
      // JSON round-trip normaliza qualquer tipo (Go-native, string JSON, JS array) para array JS puro
      var normalized = JSON.parse(JSON.stringify(rawFaixas))
      if (Array.isArray(normalized)) {
        var fkeys = ['limite_inferior', 'limite_superior', 'aliquota', 'parcela_deduzir', 'deducao']
        for (var fi = 0; fi < normalized.length; fi++) {
          var fr = normalized[fi]
          if (fr == null) continue
          var fo = {}
          for (var fki = 0; fki < fkeys.length; fki++) {
            var fk = fkeys[fki]
            if (fr[fk] != null) fo[fk] = Number(fr[fk])
          }
          faixas.push(fo)
        }
      }
    } catch (_) {}

    return e.json(200, {
      success: true,
      ano_calendario:
        Number(tabRecord.get('ano_calendario')) || Number(tabRecord.get('ano')) || anoNum,
      descricao: tabRecord.getString('descricao') || '',
      data_vigencia_inicio: tabRecord.getString('data_vigencia_inicio') || '',
      data_vigencia_fim: tabRecord.getString('data_vigencia_fim') || '',
      faixas: faixas,
    })
  },
  $apis.requireAuth(),
)
