// Recria os registros da collection `tabelas_progressivas` com as tabelas
// progressivas anuais oficiais da Receita Federal para 2023, 2024 e 2025.
//
// Contexto: registros corrompidos estavam sendo gravados com o campo `faixas`
// (JSON) como string bruta, fazendo o frontend interpretar o conteúdo
// caractere por caractere e exibir centenas de faixas zeradas. Esta migração
// exclui TODOS os registros existentes e recria exatamente 3 registros (um por
// ano), cada um com 5 faixas válidas (array JSON propriamente tipado).

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tabelas_progressivas')

    // 1) Exclui TODOS os registros existentes (corrompidos ou não).
    app.db().newQuery('DELETE FROM tabelas_progressivas').execute()

    // 2) Tabelas progressivas anuais oficiais (Receita Federal).
    //    Cada faixa inclui: limite_inferior, limite_superior (null = última),
    //    aliquota (%), parcela_deduzir e deducao.
    var tabelas = {
      2023: {
        descricao: 'Tabela Progressiva Anual IRPF 2023',
        faixas: [
          {
            limite_inferior: 0,
            limite_superior: 24511.92,
            aliquota: 0,
            parcela_deduzir: 0,
            deducao: 0,
          },
          {
            limite_inferior: 24511.93,
            limite_superior: 33919.8,
            aliquota: 7.5,
            parcela_deduzir: 1838.39,
            deducao: 0,
          },
          {
            limite_inferior: 33919.81,
            limite_superior: 45012.6,
            aliquota: 15,
            parcela_deduzir: 4382.38,
            deducao: 0,
          },
          {
            limite_inferior: 45012.61,
            limite_superior: 55976.16,
            aliquota: 22.5,
            parcela_deduzir: 7758.32,
            deducao: 0,
          },
          {
            limite_inferior: 55976.17,
            limite_superior: null,
            aliquota: 27.5,
            parcela_deduzir: 10557.13,
            deducao: 0,
          },
        ],
      },
      2024: {
        descricao: 'Tabela Progressiva Anual IRPF 2024',
        faixas: [
          {
            limite_inferior: 0,
            limite_superior: 26963.2,
            aliquota: 0,
            parcela_deduzir: 0,
            deducao: 0,
          },
          {
            limite_inferior: 26963.21,
            limite_superior: 33919.8,
            aliquota: 7.5,
            parcela_deduzir: 2022.24,
            deducao: 0,
          },
          {
            limite_inferior: 33919.81,
            limite_superior: 45012.6,
            aliquota: 15,
            parcela_deduzir: 4566.23,
            deducao: 0,
          },
          {
            limite_inferior: 45012.61,
            limite_superior: 55976.16,
            aliquota: 22.5,
            parcela_deduzir: 7942.17,
            deducao: 0,
          },
          {
            limite_inferior: 55976.17,
            limite_superior: null,
            aliquota: 27.5,
            parcela_deduzir: 10740.98,
            deducao: 0,
          },
        ],
      },
      2025: {
        descricao: 'Tabela Progressiva Anual IRPF 2025',
        faixas: [
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
        ],
      },
    }

    var anos = [2023, 2024, 2025]
    for (var i = 0; i < anos.length; i++) {
      var ano = anos[i]
      var def = tabelas[ano]

      var rec = new Record(col)
      rec.set('ano', ano)
      rec.set('ano_calendario', ano)
      rec.set('descricao', def.descricao)
      rec.set('data_vigencia_inicio', String(ano) + '-01-01 00:00:00.000Z')
      rec.set('data_vigencia_fim', String(ano) + '-12-31 23:59:59.000Z')
      // `faixas` é um JSONField — passar um array JS faz o PocketBase gravá-lo
      // como JSON válido (não como string bruta).
      rec.set('faixas', def.faixas)
      app.save(rec)
    }
  },
  (app) => {
    // Down: apenas limpa os registros recriados (não restaura os corrompidos).
    app.db().newQuery('DELETE FROM tabelas_progressivas').execute()
  },
)
