// Adiciona campos de endereço estruturado e configurações de segurança
// à collection `escritorios` para a tela de Configurações.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('escritorios')

    // --- Endereço estruturado ---
    if (!col.fields.getByName('logradouro')) {
      col.fields.add(new TextField({ name: 'logradouro' }))
    }
    if (!col.fields.getByName('numero')) {
      col.fields.add(new TextField({ name: 'numero' }))
    }
    if (!col.fields.getByName('complemento')) {
      col.fields.add(new TextField({ name: 'complemento' }))
    }
    if (!col.fields.getByName('bairro')) {
      col.fields.add(new TextField({ name: 'bairro' }))
    }
    if (!col.fields.getByName('cidade')) {
      col.fields.add(new TextField({ name: 'cidade' }))
    }
    if (!col.fields.getByName('estado')) {
      col.fields.add(new TextField({ name: 'estado' }))
    }
    if (!col.fields.getByName('cep')) {
      col.fields.add(new TextField({ name: 'cep' }))
    }

    // --- Segurança e políticas ---
    // Tempo de inatividade da sessão em minutos (padrão 30).
    if (!col.fields.getByName('sessao_inatividade_min')) {
      col.fields.add(new NumberField({ name: 'sessao_inatividade_min' }))
    }
    // Data da última revisão das políticas de privacidade (ISO string).
    if (!col.fields.getByName('ultima_revisao_politicas')) {
      col.fields.add(new DateField({ name: 'ultima_revisao_politicas' }))
    }
    // Status/texto do último backup (ex.: "Concluído em DD/MM/AAAA às HH:MM").
    if (!col.fields.getByName('ultimo_backup_status')) {
      col.fields.add(new TextField({ name: 'ultimo_backup_status' }))
    }

    app.save(col)

    // --- Defaults para escritórios já existentes ---
    const escritorios = app.findRecordsByFilter('escritorios', '1=1', '', 500, 0)
    for (let i = 0; i < escritorios.length; i++) {
      const esc = escritorios[i]
      if (!esc.get('sessao_inatividade_min')) {
        esc.set('sessao_inatividade_min', 30)
      }
      app.save(esc)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('escritorios')
    const removidos = [
      'logradouro',
      'numero',
      'complemento',
      'bairro',
      'cidade',
      'estado',
      'cep',
      'sessao_inatividade_min',
      'ultima_revisao_politicas',
      'ultimo_backup_status',
    ]
    for (let i = 0; i < removidos.length; i++) {
      const f = col.fields.getByName(removidos[i])
      if (f) col.fields.remove(f)
    }
    app.save(col)
  },
)
