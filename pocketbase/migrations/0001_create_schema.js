migrate(
  (app) => {
    const escritorios = new Collection({
      name: 'escritorios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'cnpj', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'telefone', type: 'text' },
        { name: 'endereco', type: 'text' },
        {
          name: 'plano',
          type: 'select',
          required: true,
          values: ['starter', 'pro', 'enterprise'],
          maxSelect: 1,
        },
        { name: 'limite_clientes', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(escritorios)

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.add(
      new RelationField({ name: 'escritorio_id', collectionId: escritorios.id, maxSelect: 1 }),
    )
    users.fields.add(
      new SelectField({
        name: 'cargo',
        values: ['admin', 'consultor', 'visualizador'],
        maxSelect: 1,
      }),
    )
    users.fields.add(new BoolField({ name: 'ativo' }))
    app.save(users)

    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'escritorio_id',
          type: 'relation',
          required: true,
          collectionId: escritorios.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'cpf', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'telefone', type: 'text' },
        { name: 'data_nascimento', type: 'date' },
        { name: 'endereco', type: 'text' },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['pessoa_fisica', 'socio'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'responsaveis', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 50 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clientes_escritorio ON clientes (escritorio_id)',
        'CREATE INDEX idx_clientes_nome ON clientes (nome)',
      ],
    })
    app.save(clientes)

    const declaracoes = new Collection({
      name: 'declaracoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'escritorio_id',
          type: 'relation',
          required: true,
          collectionId: escritorios.id,
          maxSelect: 1,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          maxSelect: 1,
        },
        { name: 'ano_calendario', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['rascunho', 'em_preenchimento', 'concluida', 'entregue'],
          maxSelect: 1,
        },
        { name: 'progresso', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_declaracoes_cliente ON declaracoes (cliente_id)',
        'CREATE INDEX idx_declaracoes_ano ON declaracoes (ano_calendario)',
      ],
    })
    app.save(declaracoes)

    const fontesPagadoras = new Collection({
      name: 'fontes_pagadoras',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'declaracao_id',
          type: 'relation',
          required: true,
          collectionId: declaracoes.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'cnpj', type: 'text' },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['salario', 'aposentadoria', 'pro_labore', 'outros'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(fontesPagadoras)

    const rendimentos = new Collection({
      name: 'rendimentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'declaracao_id',
          type: 'relation',
          required: true,
          collectionId: declaracoes.id,
          maxSelect: 1,
        },
        {
          name: 'fonte_pagadora_id',
          type: 'relation',
          collectionId: fontesPagadoras.id,
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['tributavel', 'isento', 'exclusiva'],
          maxSelect: 1,
        },
        { name: 'valor', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(rendimentos)

    const despesas = new Collection({
      name: 'despesas_dedutiveis',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'declaracao_id',
          type: 'relation',
          required: true,
          collectionId: declaracoes.id,
          maxSelect: 1,
        },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['saude', 'educacao', 'previdencia', 'pensao', 'dependentes', 'outras'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(despesas)

    const dependentes = new Collection({
      name: 'dependentes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'declaracao_id',
          type: 'relation',
          required: true,
          collectionId: declaracoes.id,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'cpf', type: 'text' },
        { name: 'data_nascimento', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(dependentes)

    const atividades = new Collection({
      name: 'atividades_rurais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'declaracao_id',
          type: 'relation',
          required: true,
          collectionId: declaracoes.id,
          maxSelect: 1,
        },
        { name: 'receita_bruta', type: 'number', required: true },
        { name: 'despesas', type: 'number', required: true },
        { name: 'resultado', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(atividades)

    const destinacoes = new Collection({
      name: 'destinacoes_fiscais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'declaracao_id',
          type: 'relation',
          required: true,
          collectionId: declaracoes.id,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['fundo_idoso', 'fundo_crianca', 'incentivos', 'doacoes'],
          maxSelect: 1,
        },
        { name: 'valor', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(destinacoes)

    const resultados = new Collection({
      name: 'resultados',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'declaracao_id',
          type: 'relation',
          required: true,
          collectionId: declaracoes.id,
          maxSelect: 1,
        },
        { name: 'base_calculo', type: 'number' },
        { name: 'irrf_devido', type: 'number' },
        { name: 'irrf_retido', type: 'number' },
        { name: 'saldo_imposto', type: 'number' },
        { name: 'destinacoes_aplicadas', type: 'number' },
        { name: 'detalhamento', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(resultados)

    const tabelas = new Collection({
      name: 'tabelas_progressivas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'ano', type: 'number', required: true },
        { name: 'vigencia_de', type: 'date' },
        { name: 'vigencia_ate', type: 'date' },
        { name: 'faixas', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(tabelas)
  },
  (app) => {
    const collections = [
      'tabelas_progressivas',
      'resultados',
      'destinacoes_fiscais',
      'atividades_rurais',
      'dependentes',
      'despesas_dedutiveis',
      'rendimentos',
      'fontes_pagadoras',
      'declaracoes',
      'clientes',
      'escritorios',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) app.delete(col)
      } catch (_) {}
    }
  },
)
