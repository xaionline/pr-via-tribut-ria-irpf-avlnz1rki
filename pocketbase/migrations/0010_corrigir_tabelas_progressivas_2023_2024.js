// Corrige os valores das tabelas progressivas de 2023 e 2024 com os valores
// oficiais da Receita Federal. NÃO altera a tabela de 2025.
//
// Fonte: gov.br/receitafederal
//   - 2023 (ano-calendário 2023, exercício 2024)
//   - 2024 (ano-calendário 2024, exercício 2025)

migrate(
  (app) => {
    const faixasPorAno = {
      2023: [
        { limite_inferior: 0, limite_superior: 24511.92, aliquota: 0, parcela_deduzir: 0 },
        {
          limite_inferior: 24511.93,
          limite_superior: 33919.8,
          aliquota: 7.5,
          parcela_deduzir: 1838.39,
        },
        {
          limite_inferior: 33919.81,
          limite_superior: 45012.6,
          aliquota: 15,
          parcela_deduzir: 4382.38,
        },
        {
          limite_inferior: 45012.61,
          limite_superior: 55976.16,
          aliquota: 22.5,
          parcela_deduzir: 7758.32,
        },
        {
          limite_inferior: 55976.17,
          limite_superior: null,
          aliquota: 27.5,
          parcela_deduzir: 10557.13,
        },
      ],
      2024: [
        { limite_inferior: 0, limite_superior: 26963.2, aliquota: 0, parcela_deduzir: 0 },
        {
          limite_inferior: 26963.21,
          limite_superior: 33919.8,
          aliquota: 7.5,
          parcela_deduzir: 2022.24,
        },
        {
          limite_inferior: 33919.81,
          limite_superior: 45012.6,
          aliquota: 15,
          parcela_deduzir: 4566.23,
        },
        {
          limite_inferior: 45012.61,
          limite_superior: 55976.16,
          aliquota: 22.5,
          parcela_deduzir: 7942.17,
        },
        {
          limite_inferior: 55976.17,
          limite_superior: null,
          aliquota: 27.5,
          parcela_deduzir: 10740.98,
        },
      ],
    }

    const collection = app.findCollectionByNameOrId('tabelas_progressivas')

    ;[2023, 2024].forEach((ano) => {
      try {
        const record = app.findFirstRecordByData('tabelas_progressivas', 'ano_calendario', ano)
        record.set('faixas', faixasPorAno[ano])
        // Garante que o campo legado `ano` também reflita o ano-calendário correto.
        record.set('ano', ano)
        app.save(record)
        console.log('Tabela progressiva atualizada: ano_calendario=' + ano)
      } catch (e) {
        console.log(
          'Registro não encontrado para ano_calendario=' + ano + ' — pulando. (' + e + ')',
        )
      }
    })
  },
  (app) => {
    // Reversão não reconstitui os valores anteriores (incorretos) — a correção
    // é intencional e definitiva. Nada a fazer no down.
  },
)
