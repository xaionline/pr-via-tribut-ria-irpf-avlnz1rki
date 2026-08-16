// Garante unicidade de CNPJ no cadastro de escritórios (multi-tenant).
// Antes de criar o índice único, deduplica registros existentes mantendo
// apenas o mais antigo por CNPJ (campos nulos/vazios não são afetados).
migrate(
  (app) => {
    // 1. Remove duplicidades de CNPJ (mantém o registro mais antigo por valor).
    app
      .db()
      .newQuery(
        `DELETE FROM escritorios
         WHERE cnpj IS NOT NULL AND cnpj != ''
           AND id NOT IN (
             SELECT MIN(id) FROM escritorios
             WHERE cnpj IS NOT NULL AND cnpj != ''
             GROUP BY cnpj
           )`,
      )
      .execute()

    // 2. Cria o índice único (idempotente via addIndex).
    const col = app.findCollectionByNameOrId('escritorios')
    col.addIndex('idx_escritorios_cnpj_unique', true, 'cnpj', "cnpj != ''")
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('escritorios')
    col.removeIndex('idx_escritorios_cnpj_unique')
    app.save(col)
  },
)
