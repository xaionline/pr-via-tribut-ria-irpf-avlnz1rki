// Cria as tabelas progressivas anuais projetadas para os anos de 2026 a 2033
// na collection `tabelas_progressivas`, utilizando a tabela de 2025 como base
// (mesmas faixas, alíquotas e deduções).

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tabelas_progressivas')

    // Faixas base de 2025
    const faixasBase2025 = [
      {
        limite_inferior: 0,
        limite_superior: 28467.2,
        aliquota: 0,
        parcela_deduzir: 0,
        deducao: 0,
      },
      {
        limite_inferior: 28467.21,
        limite_superior: 33919.8,
        aliquota: 7.5,
        parcela_deduzir: 2135.04,
        deducao: 0,
      },
      {
        limite_inferior: 33919.81,
        limite_superior: 45012.6,
        aliquota: 15,
        parcela_deduzir: 4577.28,
        deducao: 0,
      },
      {
        limite_inferior: 45012.61,
        limite_superior: 55976.16,
        aliquota: 22.5,
        parcela_deduzir: 7953.24,
        deducao: 0,
      },
      {
        limite_inferior: 55976.17,
        limite_superior: null,
        aliquota: 27.5,
        parcela_deduzir: 10752.0,
        deducao: 0,
      },
    ]

    const anos = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

    for (let i = 0; i < anos.length; i++) {
      const ano = anos[i]

      // Idempotência: verificar se já existe registro para o ano
      let existing = null
      try {
        existing = app.findFirstRecordByData('tabelas_progressivas', 'ano_calendario', ano)
      } catch (_) {}

      if (!existing) {
        try {
          existing = app.findFirstRecordByData('tabelas_progressivas', 'ano', ano)
        } catch (_) {}
      }

      if (existing) {
        continue
      }

      const rec = new Record(col)
      rec.set('ano', ano)
      rec.set('ano_calendario', ano)
      rec.set('descricao', 'Tabela Progressiva Anual IRPF ' + ano + ' (projeção)')
      rec.set('data_vigencia_inicio', String(ano) + '-01-01 00:00:00.000Z')
      rec.set('data_vigencia_fim', String(ano) + '-12-31 23:59:59.000Z')
      rec.set('faixas', faixasBase2025)
      app.save(rec)
    }
  },
  (app) => {
    app
      .db()
      .newQuery(
        'DELETE FROM tabelas_progressivas WHERE ano_calendario >= 2026 AND ano_calendario <= 2033',
      )
      .execute()
  },
)
