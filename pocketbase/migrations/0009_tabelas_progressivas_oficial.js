migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tabelas_progressivas')

    function toNum(v) {
      if (v == null) return 0
      if (typeof v === 'number') return v
      var n = Number(v)
      return isNaN(n) ? 0 : n
    }

    // 1) Add new fields as OPTIONAL first (required flags would reject the existing
    //    blank rows). We flip them to required after backfilling, below.
    if (!col.fields.getByName('ano_calendario')) {
      col.fields.add(new NumberField({ name: 'ano_calendario', onlyInt: true }))
    }
    if (!col.fields.getByName('descricao')) {
      col.fields.add(new TextField({ name: 'descricao' }))
    }
    if (!col.fields.getByName('data_vigencia_inicio')) {
      col.fields.add(new DateField({ name: 'data_vigencia_inicio' }))
    }
    if (!col.fields.getByName('data_vigencia_fim')) {
      col.fields.add(new DateField({ name: 'data_vigencia_fim' }))
    }
    // Make the old `ano` field optional — `ano_calendario` is now the source of truth.
    const anoField = col.fields.getByName('ano')
    if (anoField) {
      anoField.required = false
    }
    app.save(col)

    // 2) Annualize the faixas of any existing record whose faixas are still in monthly
    //    values (identified by limite_superior of the last faixa < 10.000.000) and
    //    backfill ano_calendario / descricao / data_vigencia_* from `ano`.
    var existing = []
    try {
      existing = app.findRecordsByFilter('tabelas_progressivas', "id != ''", '-created', 500, 0)
    } catch (_) {}

    for (var i = 0; i < existing.length; i++) {
      var rec = existing[i]
      var anoVal = toNum(rec.get('ano')) || toNum(rec.get('ano_calendario')) || 0

      if (!rec.get('ano_calendario') && anoVal) {
        rec.set('ano_calendario', anoVal)
      }
      if (!rec.get('descricao') && anoVal) {
        rec.set('descricao', 'Tabela Progressiva Anual IRPF ' + anoVal)
      }
      if (!rec.get('data_vigencia_inicio') && anoVal) {
        rec.set('data_vigencia_inicio', String(anoVal) + '-01-01 00:00:00.000Z')
      }
      if (!rec.get('data_vigencia_fim') && anoVal) {
        rec.set('data_vigencia_fim', String(anoVal) + '-12-31 23:59:59.000Z')
      }

      var rawFaixas = rec.get('faixas')
      var faixas = []
      if (typeof rawFaixas === 'string') {
        try {
          faixas = JSON.parse(rawFaixas)
        } catch (_) {
          faixas = []
        }
      } else if (Array.isArray(rawFaixas)) {
        faixas = rawFaixas
      }

      var lastFaixa = faixas.length > 0 ? faixas[faixas.length - 1] : null
      var isMonthly =
        lastFaixa &&
        typeof lastFaixa.limite_superior === 'number' &&
        lastFaixa.limite_superior < 10000000

      if (isMonthly) {
        var anualizada = []
        for (var f = 0; f < faixas.length; f++) {
          var fx = faixas[f]
          var limInf = (fx.limite_inferior || 0) * 12
          var limSup =
            f === faixas.length - 1 ? null : Math.round((fx.limite_superior || 0) * 12 * 100) / 100
          var aliq = fx.aliquota || 0
          var dedVal =
            fx.deducao != null ? fx.deducao : fx.parcela_deduzir != null ? fx.parcela_deduzir : 0
          var dedAnual = dedVal
          if (dedVal > 0 && dedVal < 100000) {
            dedAnual = Math.round(dedVal * 12 * 100) / 100
          }
          anualizada.push({
            limite_inferior: Math.round(limInf * 100) / 100,
            limite_superior: limSup,
            aliquota: aliq,
            parcela_deduzir: dedAnual,
          })
        }
        rec.set('faixas', anualizada)
      } else if (faixas.length > 0) {
        var norm = []
        for (var n = 0; n < faixas.length; n++) {
          var ff = faixas[n]
          norm.push({
            limite_inferior: ff.limite_inferior || 0,
            limite_superior: ff.limite_superior != null ? ff.limite_superior : null,
            aliquota: ff.aliquota || 0,
            parcela_deduzir:
              ff.parcela_deduzir != null ? ff.parcela_deduzir : ff.deducao != null ? ff.deducao : 0,
          })
        }
        rec.set('faixas', norm)
      }

      app.save(rec)
    }

    // 3) Replace the previously-seeded 2024/2025 rows with the OFFICIAL Receita Federal
    //    annual tables, and add 2023. Idempotent: skip a year if an official table
    //    (identified by faixas containing `parcela_deduzir`) already exists for it.
    var faixas2024 = [
      { limite_inferior: 0, limite_superior: 27110.4, aliquota: 0, parcela_deduzir: 0 },
      {
        limite_inferior: 27110.41,
        limite_superior: 33919.8,
        aliquota: 7.5,
        parcela_deduzir: 2033.28,
      },
      {
        limite_inferior: 33919.81,
        limite_superior: 45012.6,
        aliquota: 15,
        parcela_deduzir: 4577.28,
      },
      {
        limite_inferior: 45012.61,
        limite_superior: 55976.16,
        aliquota: 22.5,
        parcela_deduzir: 7953.24,
      },
      {
        limite_inferior: 55976.16,
        limite_superior: null,
        aliquota: 27.5,
        parcela_deduzir: 10752.0,
      },
    ]
    var faixas2023 = [
      { limite_inferior: 0, limite_superior: 26510.4, aliquota: 0, parcela_deduzir: 0 },
      {
        limite_inferior: 26510.41,
        limite_superior: 33159.6,
        aliquota: 7.5,
        parcela_deduzir: 1988.28,
      },
      {
        limite_inferior: 33159.61,
        limite_superior: 44020.2,
        aliquota: 15,
        parcela_deduzir: 4475.28,
      },
      {
        limite_inferior: 44020.21,
        limite_superior: 54739.44,
        aliquota: 22.5,
        parcela_deduzir: 7776.24,
      },
      {
        limite_inferior: 54739.44,
        limite_superior: null,
        aliquota: 27.5,
        parcela_deduzir: 10512.0,
      },
    ]

    function upsertOficial(ano, faixas, descricao) {
      var rec
      var exists = false
      try {
        rec = app.findFirstRecordByData('tabelas_progressivas', 'ano_calendario', ano)
        exists = true
      } catch (_) {
        rec = new Record(col)
      }

      if (exists) {
        var raw = rec.get('faixas')
        var arr = []
        if (typeof raw === 'string') {
          try {
            arr = JSON.parse(raw)
          } catch (_) {
            arr = []
          }
        } else if (Array.isArray(raw)) {
          arr = raw
        }
        var alreadyOfficial = arr.length > 0 && arr[0] && arr[0].parcela_deduzir != null
        if (alreadyOfficial) {
          if (!rec.get('ano')) rec.set('ano', ano)
          if (!rec.get('descricao')) rec.set('descricao', descricao)
          if (!rec.get('data_vigencia_inicio')) {
            rec.set('data_vigencia_inicio', String(ano) + '-01-01 00:00:00.000Z')
          }
          if (!rec.get('data_vigencia_fim')) {
            rec.set('data_vigencia_fim', String(ano) + '-12-31 23:59:59.000Z')
          }
          app.save(rec)
          return
        }
      }

      rec.set('ano', ano)
      rec.set('ano_calendario', ano)
      rec.set('descricao', descricao)
      rec.set('faixas', faixas)
      rec.set('data_vigencia_inicio', String(ano) + '-01-01 00:00:00.000Z')
      rec.set('data_vigencia_fim', String(ano) + '-12-31 23:59:59.000Z')
      app.save(rec)
    }

    upsertOficial(2024, faixas2024, 'Tabela Progressiva Anual IRPF 2024')
    upsertOficial(2023, faixas2023, 'Tabela Progressiva Anual IRPF 2023')
    // 2025 reuses the 2024 annual table (no new annual table published by the RFB for
    // ano-calendário 2025 at the time of writing) — ensure it exists too.
    upsertOficial(2025, faixas2024, 'Tabela Progressiva Anual IRPF 2025')

    // 4) Deduplicate any rows sharing the same ano_calendario (keep the oldest) so the
    //    unique index can be created, then add it.
    app
      .db()
      .newQuery(
        `DELETE FROM tabelas_progressivas WHERE id NOT IN (
          SELECT MIN(id) FROM tabelas_progressivas WHERE ano_calendario IS NOT NULL GROUP BY ano_calendario
        ) AND ano_calendario IS NOT NULL`,
      )
      .execute()

    col.addIndex('idx_tabelas_progressivas_ano_calendario', true, 'ano_calendario', '')

    // 5) Now flip the required flags on — every row has been backfilled/seeded by now.
    const anoCalField = col.fields.getByName('ano_calendario')
    if (anoCalField) anoCalField.required = true
    const vigInicioField = col.fields.getByName('data_vigencia_inicio')
    if (vigInicioField) vigInicioField.required = true
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('tabelas_progressivas')
      col.removeIndex('idx_tabelas_progressivas_ano_calendario')
      ;['ano_calendario', 'descricao', 'data_vigencia_inicio', 'data_vigencia_fim'].forEach(
        function (n) {
          const f = col.fields.getByName(n)
          if (f) col.fields.remove(f)
        },
      )
      app.save(col)
    } catch (_) {}
  },
)
