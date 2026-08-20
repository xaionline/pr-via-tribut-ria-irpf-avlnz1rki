routerAdd(
  'POST',
  '/backend/v1/declaracoes/{id}/calcular',
  (e) => {
    try {
      const decId = e.request.pathValue('id')
      if (!decId) {
        return e.badRequestError('ID da declaração é obrigatório')
      }

      var dec
      try {
        dec = $app.findRecordById('declaracoes', decId)
      } catch (_) {
        return e.notFoundError('Declaração não encontrada')
      }

      var isSuperuser = e.hasSuperuserAuth()
      var userCargo = isSuperuser ? 'admin' : e.auth ? e.auth.getString('cargo') : 'admin'

      if (userCargo === 'visualizador') {
        return e.forbiddenError('Visualizadores não podem calcular declarações')
      }

      if (userCargo === 'consultor' && !isSuperuser) {
        var clienteId = dec.getString('cliente_id')
        var cliente
        try {
          cliente = $app.findRecordById('clientes', clienteId)
        } catch (_) {
          return e.notFoundError('Cliente não encontrado')
        }
        var respRaw = cliente.get('responsaveis') || []
        // Goja does not recognize Go-native slices via Array.isArray(); duck-type
        // on .length but exclude strings (which also have a .length).
        var respArr
        if (
          respRaw instanceof Array ||
          (respRaw != null && typeof respRaw.length === 'number' && typeof respRaw !== 'string')
        ) {
          respArr = respRaw
        } else {
          respArr = [respRaw]
        }
        if (e.auth && respArr.indexOf(e.auth.id) === -1) {
          return e.forbiddenError('Você não tem permissão para calcular esta declaração')
        }
      }

      var ano = Number(dec.get('ano_calendario')) || 0
      if (!ano) {
        return e.badRequestError(
          'Ano-calendário não definido na declaração. Edite a declaração e informe o ano-calendário.',
        )
      }

      var tabRecord
      try {
        tabRecord = $app.findFirstRecordByData('tabelas_progressivas', 'ano_calendario', ano)
      } catch (_) {
        // Backwards-compat fallback to the legacy `ano` field.
        try {
          tabRecord = $app.findFirstRecordByData('tabelas_progressivas', 'ano', ano)
        } catch (_e) {
          return e.badRequestError(
            'Nenhuma tabela progressiva cadastrada para o ano-calendário ' + ano + '.',
          )
        }
      }

      var faixas = []
      try {
        var rawFaixas = tabRecord.get('faixas')
        // Goja pode retornar `faixas` como []byte (array de números = códigos ASCII),
        // string JSON, ou array JS. Detectamos cada caso e normalizamos para array JS puro.
        if (Array.isArray(rawFaixas) && rawFaixas.length > 0 && typeof rawFaixas[0] === 'number') {
          // []byte do Go: cada elemento é o código ASCII de um caractere do JSON.
          var byteStr = ''
          for (var bi = 0; bi < rawFaixas.length; bi++) {
            byteStr += String.fromCharCode(rawFaixas[bi])
          }
          rawFaixas = JSON.parse(byteStr)
        } else if (typeof rawFaixas === 'string') {
          rawFaixas = JSON.parse(rawFaixas)
        }
        var fkeys = ['limite_inferior', 'limite_superior', 'aliquota', 'parcela_deduzir', 'deducao']
        if (Array.isArray(rawFaixas)) {
          for (var fi = 0; fi < rawFaixas.length; fi++) {
            var fr = rawFaixas[fi]
            if (fr == null || typeof fr !== 'object') continue
            var fo = {}
            for (var fki = 0; fki < fkeys.length; fki++) {
              var fk = fkeys[fki]
              if (fr[fk] != null) fo[fk] = Number(fr[fk])
            }
            faixas.push(fo)
          }
        }
      } catch (parseErr) {
        $app
          .logger()
          .error(
            'calcular: failed to parse faixas',
            'error',
            String(parseErr),
            'tabela_id',
            tabRecord.id,
          )
      }

      if (!faixas || faixas.length === 0) {
        return e.badRequestError(
          'A tabela progressiva do ano-calendário ' +
            ano +
            ' não possui faixas configuradas. Edite a tabela e adicione as faixas.',
        )
      }

      // The faixas stored in `tabelas_progressivas` are ANNUAL values (limite_inferior,
      // limite_superior and parcela_deduzir already in base anual). The calc applies the
      // aliquota of the faixa whose limite_inferior the base exceeds, then subtracts that
      // faixa's parcela_deduzir — no monthly ×12 multiplication is needed.
      function calcIRPF(baseCalculo, faixasArr) {
        var irrfDevido = 0
        var faixaAplicada = null
        for (var i = faixasArr.length - 1; i >= 0; i--) {
          var f = faixasArr[i]
          if (!f || typeof f !== 'object') continue
          var limInf = Number(f.limite_inferior) || 0
          if (baseCalculo > limInf) {
            var aliq = (Number(f.aliquota) || 0) / 100
            var parcelaDeduzir =
              f.parcela_deduzir != null
                ? Number(f.parcela_deduzir) || 0
                : (Number(f.deducao) || 0) * 12
            irrfDevido = Math.max(0, baseCalculo * aliq - parcelaDeduzir)
            faixaAplicada = {
              indice: i,
              limite_inferior: limInf,
              aliquota: Number(f.aliquota) || 0,
              parcela_deduzir: parcelaDeduzir,
            }
            break
          }
        }
        return irrfDevido
      }

      function round2(v) {
        return Math.round(v * 100) / 100
      }

      var rends = []
      try {
        rends = $app.findRecordsByFilter(
          'rendimentos',
          'declaracao_id = {:id}',
          'created',
          500,
          0,
          { id: decId },
        )
      } catch (_) {}

      var rendTributavel = 0
      for (var ri = 0; ri < rends.length; ri++) {
        if (rends[ri].getString('tipo') === 'tributavel') {
          rendTributavel += Number(rends[ri].get('valor')) || 0
        }
      }

      var desps = []
      try {
        desps = $app.findRecordsByFilter(
          'despesas_dedutiveis',
          'declaracao_id = {:id}',
          'created',
          500,
          0,
          { id: decId },
        )
      } catch (_) {}

      var totalDeducoes = 0
      for (var di = 0; di < desps.length; di++) {
        totalDeducoes += Number(desps[di].get('valor')) || 0
      }

      var deps = []
      try {
        deps = $app.findRecordsByFilter('dependentes', 'declaracao_id = {:id}', 'created', 500, 0, {
          id: decId,
        })
      } catch (_) {}
      totalDeducoes += deps.length * 2275.08

      var ativs = []
      try {
        ativs = $app.findRecordsByFilter(
          'atividades_rurais',
          'declaracao_id = {:id}',
          'created',
          500,
          0,
          { id: decId },
        )
      } catch (_) {}
      for (var ai = 0; ai < ativs.length; ai++) {
        var recBruta = Number(ativs[ai].get('receita_bruta')) || 0
        if (recBruta > 0) rendTributavel += recBruta * 0.2
      }

      var dests = []
      try {
        dests = $app.findRecordsByFilter(
          'destinacoes_fiscais',
          'declaracao_id = {:id}',
          'created',
          500,
          0,
          { id: decId },
        )
      } catch (_) {}
      var totalDest = 0
      for (var dsti = 0; dsti < dests.length; dsti++) {
        totalDest += Number(dests[dsti].get('valor')) || 0
      }

      var irrfRecords = []
      try {
        irrfRecords = $app.findRecordsByFilter('irrf', 'declaracao_id = {:id}', 'created', 500, 0, {
          id: decId,
        })
      } catch (_) {}

      var irrfRetido = 0
      for (var irri = 0; irri < irrfRecords.length; irri++) {
        irrfRetido += Number(irrfRecords[irri].get('valor')) || 0
      }

      var legalBase = Math.max(0, rendTributavel - totalDeducoes)
      var legalIRRF = calcIRPF(legalBase, faixas)
      var legalScenario = {
        modalidade: 'legal',
        base_calculo: round2(legalBase),
        total_deducoes: round2(totalDeducoes),
        irrf_devido: round2(legalIRRF),
        irrf_retido: round2(irrfRetido),
        saldo_imposto: round2(legalIRRF - irrfRetido - totalDest),
        destinacoes_aplicadas: round2(totalDest),
      }

      var deducaoSimplificada = Math.min(rendTributavel * 0.2, 16754.34)
      var simpBase = Math.max(0, rendTributavel - deducaoSimplificada)
      var simpIRRF = calcIRPF(simpBase, faixas)
      var simpScenario = {
        modalidade: 'simplificada',
        base_calculo: round2(simpBase),
        total_deducoes: round2(deducaoSimplificada),
        irrf_devido: round2(simpIRRF),
        irrf_retido: round2(irrfRetido),
        saldo_imposto: round2(simpIRRF - irrfRetido - totalDest),
        destinacoes_aplicadas: round2(totalDest),
      }

      var recommended =
        legalScenario.saldo_imposto <= simpScenario.saldo_imposto ? 'legal' : 'simplificada'

      var modalidadeEscolhida = dec.getString('modalidade') || ''
      if (!modalidadeEscolhida) {
        modalidadeEscolhida = recommended
        dec.set('modalidade', recommended)
      }

      var chosenScenario = modalidadeEscolhida === 'simplificada' ? simpScenario : legalScenario

      var resRecord
      try {
        resRecord = $app.findFirstRecordByData('resultados', 'declaracao_id', decId)
      } catch (_) {
        var colRes = $app.findCollectionByNameOrId('resultados')
        resRecord = new Record(colRes)
        resRecord.set('declaracao_id', decId)
      }

      resRecord.set('base_calculo', chosenScenario.base_calculo)
      resRecord.set('irrf_devido', chosenScenario.irrf_devido)
      resRecord.set('irrf_retido', chosenScenario.irrf_retido)
      resRecord.set('saldo_imposto', chosenScenario.saldo_imposto)
      resRecord.set('destinacoes_aplicadas', chosenScenario.destinacoes_aplicadas)
      resRecord.set('detalhamento', {
        legal: legalScenario,
        simplificada: simpScenario,
        recomendada: recommended,
        modalidade_escolhida: modalidadeEscolhida,
        rendimento_tributavel: round2(rendTributavel),
      })
      $app.save(resRecord)

      dec.set('progresso', 100)
      dec.set('status', 'calculada')
      $app.save(dec)

      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        if (e.auth && e.auth.id) auditRec.set('user_id', e.auth.id)
        auditRec.set('action', 'calculo')
        auditRec.set('entity', 'declaracoes')
        auditRec.set('entity_id', decId)
        auditRec.set('diff', {
          timestamp: new Date().toISOString(),
          inputs: {
            ano_calendario: ano,
            rendimento_tributavel: round2(rendTributavel),
            total_deducoes: round2(totalDeducoes),
            total_destinacoes: round2(totalDest),
            num_dependentes: deps.length,
            num_rendimentos: rends.length,
            num_despesas: desps.length,
            num_irrf: irrfRecords.length,
          },
          result: {
            modalidade: modalidadeEscolhida,
            base_calculo: chosenScenario.base_calculo,
            irrf_devido: chosenScenario.irrf_devido,
            irrf_retido: chosenScenario.irrf_retido,
            saldo_imposto: chosenScenario.saldo_imposto,
            destinacoes_aplicadas: chosenScenario.destinacoes_aplicadas,
          },
        })
        $app.save(auditRec)
      } catch (auditErr) {
        $app
          .logger()
          .error('audit log failed for calculo', 'error', String(auditErr), 'declaracao_id', decId)
      }

      return e.json(200, {
        success: true,
        legal: legalScenario,
        simplificada: simpScenario,
        recomendada: recommended,
        resultado: {
          id: resRecord.id,
          base_calculo: chosenScenario.base_calculo,
          irrf_devido: chosenScenario.irrf_devido,
          irrf_retido: chosenScenario.irrf_retido,
          saldo_imposto: chosenScenario.saldo_imposto,
          destinacoes_aplicadas: chosenScenario.destinacoes_aplicadas,
        },
      })
    } catch (err) {
      $app
        .logger()
        .error(
          'calcular declaracao failed',
          'error',
          String(err),
          'stack',
          String((err && err.stack) || ''),
          'declaracao_id',
          e.request.pathValue('id') || '',
        )
      var errMsg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao calcular declaração: ' + errMsg)
    }
  },
  $apis.requireAuth(),
)
