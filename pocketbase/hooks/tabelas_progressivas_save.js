// PUT /backend/v1/tabelas-progressivas/{ano}
// Admin-only upsert of a progressive tax table for a given ano-calendário.
// Body: { descricao?: string, data_vigencia_inicio?: string, data_vigencia_fim?: string, faixas: [] }
// Validates faixas contiguity, aliquota range and that the last faixa has no
// limite_superior. Writes an audit_logs entry on success.
routerAdd(
  'PUT',
  '/backend/v1/tabelas-progressivas/{ano}',
  (e) => {
    try {
      var ano = e.request.pathValue('ano')
      if (!ano) {
        return e.badRequestError('Ano-calendário é obrigatório.')
      }
      var anoNum = Number(ano)
      if (isNaN(anoNum) || !Number.isInteger(anoNum)) {
        return e.badRequestError('Ano-calendário inválido: "' + ano + '".')
      }

      // --- Auth / role check (server-side) ---------------------------------
      var isSuperuser = e.hasSuperuserAuth()
      var userCargo = isSuperuser ? 'admin' : e.auth ? e.auth.getString('cargo') : ''
      if (userCargo !== 'admin') {
        return e.forbiddenError('Apenas administradores podem editar a tabela progressiva.')
      }

      // --- Parse body ------------------------------------------------------
      var body = {}
      try {
        body = e.requestInfo().body || {}
      } catch (_) {
        body = {}
      }

      var faixas = body.faixas
      if (!Array.isArray(faixas) || faixas.length === 0) {
        return e.badRequestError('Informe ao menos uma faixa de cálculo.')
      }

      // --- Normalize + validate each faixa --------------------------------
      function toNum(v) {
        if (v === null || v === undefined || v === '') return null
        var n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'))
        return isNaN(n) ? null : n
      }

      var normFaixas = []
      for (var i = 0; i < faixas.length; i++) {
        var f = faixas[i] || {}
        var limInf = toNum(f.limite_inferior)
        var limSup = toNum(f.limite_superior)
        var aliq = toNum(f.aliquota)
        var ded = toNum(f.parcela_deduzir)

        if (limInf === null || limInf < 0) {
          return e.badRequestError('Faixa ' + (i + 1) + ': base de cálculo "de" inválida.')
        }
        if (aliq === null || aliq < 0 || aliq > 100) {
          return e.badRequestError('Faixa ' + (i + 1) + ': alíquota deve estar entre 0 e 100.')
        }
        if (ded === null || ded < 0) {
          return e.badRequestError('Faixa ' + (i + 1) + ': parcela a deduzir inválida.')
        }

        var isLast = i === faixas.length - 1
        if (isLast) {
          // última faixa deve ser "aberta"
          if (limSup !== null) {
            return e.badRequestError(
              'A última faixa deve ter o limite superior vazio (acima de...).',
            )
          }
        } else {
          if (limSup === null || limSup <= limInf) {
            return e.badRequestError(
              'Faixa ' + (i + 1) + ': limite superior inválido (deve ser maior que o inferior).',
            )
          }
        }

        normFaixas.push({
          limite_inferior: Math.round(limInf * 100) / 100,
          limite_superior: limSup === null ? null : Math.round(limSup * 100) / 100,
          aliquota: Math.round(aliq * 10000) / 10000,
          parcela_deduzir: Math.round(ded * 100) / 100,
        })
      }

      // --- Contiguity / gaps / overlaps ------------------------------------
      for (var j = 0; j < normFaixas.length - 1; j++) {
        var cur = normFaixas[j]
        var nxt = normFaixas[j + 1]
        var expectedInf = Math.round((cur.limite_superior + 0.01) * 100) / 100
        if (Math.abs(nxt.limite_inferior - expectedInf) > 0.001) {
          return e.badRequestError(
            'Faixas não contíguas: o limite superior da faixa ' +
              (j + 1) +
              ' (' +
              cur.limite_superior +
              ') deve ser 0,01 a menos que o limite inferior da faixa ' +
              (j + 2) +
              ' (' +
              nxt.limite_inferior +
              ').',
          )
        }
      }

      // --- Upsert record ---------------------------------------------------
      var col = $app.findCollectionByNameOrId('tabelas_progressivas')
      var rec = null
      var existed = false
      try {
        rec = $app.findFirstRecordByData('tabelas_progressivas', 'ano_calendario', anoNum)
        existed = true
      } catch (_) {
        try {
          rec = $app.findFirstRecordByData('tabelas_progressivas', 'ano', anoNum)
          existed = true
        } catch (_e) {
          rec = new Record(col)
        }
      }

      var descricao = body.descricao || rec.get('descricao') || ''
      if (!descricao) {
        descricao = 'Tabela Progressiva Anual IRPF ' + anoNum
      }
      var vigInicio = body.data_vigencia_inicio || rec.get('data_vigencia_inicio') || ''
      if (!vigInicio) {
        vigInicio = String(anoNum) + '-01-01 00:00:00.000Z'
      }
      var vigFim =
        body.data_vigencia_fim !== undefined
          ? body.data_vigencia_fim
          : rec.get('data_vigencia_fim') || ''
      if (!vigFim) {
        vigFim = String(anoNum) + '-12-31 23:59:59.000Z'
      }

      rec.set('ano', anoNum)
      rec.set('ano_calendario', anoNum)
      rec.set('descricao', descricao)
      rec.set('faixas', normFaixas)
      rec.set('data_vigencia_inicio', vigInicio)
      rec.set('data_vigencia_fim', vigFim)
      $app.save(rec)

      // --- Audit log -------------------------------------------------------
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        if (e.auth && e.auth.id) auditRec.set('user_id', e.auth.id)
        auditRec.set('action', existed ? 'update' : 'create')
        auditRec.set('entity', 'tabelas_progressivas')
        auditRec.set('entity_id', rec.id)
        auditRec.set(
          'diff',
          JSON.stringify({
            ano_calendario: anoNum,
            num_faixas: normFaixas.length,
            timestamp: new Date().toISOString(),
          }),
        )
        $app.save(auditRec)
      } catch (auditErr) {
        $app
          .logger()
          .error(
            'audit log failed for tabela_progressiva save',
            'error',
            String(auditErr),
            'ano',
            String(anoNum),
          )
      }

      return e.json(200, {
        success: true,
        message: 'Tabela atualizada',
        ano_calendario: anoNum,
        descricao: descricao,
        data_vigencia_inicio: vigInicio,
        data_vigencia_fim: vigFim,
        faixas: normFaixas,
      })
    } catch (err) {
      $app
        .logger()
        .error(
          'salvar tabela progressiva failed',
          'error',
          String(err),
          'stack',
          String((err && err.stack) || ''),
          'ano',
          e.request.pathValue('ano') || '',
        )
      var errMsg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao salvar tabela progressiva: ' + errMsg)
    }
  },
  $apis.requireAuth(),
)
