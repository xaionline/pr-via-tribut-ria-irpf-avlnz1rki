migrate(
  (app) => {
    const importacoes = app.findCollectionByNameOrId('importacoes_informes')

    // Permitir arquivos CSV e texto além de PDF/imagens
    const arqField = importacoes.fields.getByName('arquivo_original')
    if (arqField) {
      arqField.mimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'text/csv',
        'text/plain',
        'application/vnd.ms-excel',
      ]
      app.save(importacoes)
    }

    // Adicionar importacao_id em despesas_dedutiveis para rastreabilidade de importação
    const despesas = app.findCollectionByNameOrId('despesas_dedutiveis')
    if (!despesas.fields.getByName('importacao_id')) {
      despesas.fields.add(
        new RelationField({
          name: 'importacao_id',
          collectionId: importacoes.id,
          maxSelect: 1,
        }),
      )
      despesas.addIndex('idx_despesas_importacao', false, 'importacao_id', '')
      app.save(despesas)
    }

    // Adicionar importacao_id em empresas_faturamentos para rastreabilidade de importação
    const faturamentos = app.findCollectionByNameOrId('empresas_faturamentos')
    if (!faturamentos.fields.getByName('importacao_id')) {
      faturamentos.fields.add(
        new RelationField({
          name: 'importacao_id',
          collectionId: importacoes.id,
          maxSelect: 1,
        }),
      )
      faturamentos.addIndex('idx_faturamentos_importacao', false, 'importacao_id', '')
      app.save(faturamentos)
    }
  },
  (app) => {
    try {
      const despesas = app.findCollectionByNameOrId('despesas_dedutiveis')
      const f1 = despesas.fields.getByName('importacao_id')
      if (f1) despesas.fields.remove(f1)
      despesas.removeIndex('idx_despesas_importacao')
      app.save(despesas)
    } catch (_) {}

    try {
      const faturamentos = app.findCollectionByNameOrId('empresas_faturamentos')
      const f2 = faturamentos.fields.getByName('importacao_id')
      if (f2) faturamentos.fields.remove(f2)
      faturamentos.removeIndex('idx_faturamentos_importacao')
      app.save(faturamentos)
    } catch (_) {}
  },
)
