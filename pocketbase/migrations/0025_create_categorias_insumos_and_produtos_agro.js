// pocketbase/migrations/0025_create_categorias_insumos_and_produtos_agro.js
migrate(
  (app) => {
    // 1. Atualizar collection empresas_faturamentos com detalhamento de insumos em formato JSON
    const empresasFaturamentos = app.findCollectionByNameOrId('empresas_faturamentos')
    if (!empresasFaturamentos.fields.getByName('insumos_detalhados')) {
      empresasFaturamentos.fields.add(
        new JSONField({
          name: 'insumos_detalhados',
          maxSize: 2000000,
        }),
      )
      app.save(empresasFaturamentos)
    }

    // 2. Collection tabelas_insumos_real (alíquotas anuais por categoria de insumo)
    // Note: Em NumberField no PocketBase, `required: true` rejeita o valor `0` (trata 0 como blank).
    // Por isso, campos numéricos que podem ser 0 (como monofásico 0%) NÃO devem ter `required: true`.
    const tabelasInsumos = new Collection({
      name: 'tabelas_insumos_real',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      updateRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      deleteRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      fields: [
        {
          name: 'ano',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['comercial_servico', 'rural_agro', 'monofasico', 'imobilizado'],
          maxSelect: 1,
        },
        {
          name: 'descricao',
          type: 'text',
          required: true,
        },
        {
          name: 'aliquota_credito_pis',
          type: 'number',
        },
        {
          name: 'aliquota_credito_cofins',
          type: 'number',
        },
        {
          name: 'permite_credito',
          type: 'bool',
        },
        {
          name: 'tipo_credito',
          type: 'select',
          required: true,
          values: ['padrao', 'presumido', 'isento_vedado', 'depreciacao'],
          maxSelect: 1,
        },
        {
          name: 'observacao',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_tabelas_insumos_ano_cat ON tabelas_insumos_real (ano, categoria)',
      ],
    })
    app.save(tabelasInsumos)

    // 3. Collection tabelas_produtos_agro (tabela anual de produtos agro com crédito presumido próprio)
    const tabelasAgro = new Collection({
      name: 'tabelas_produtos_agro',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      updateRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      deleteRule: '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"',
      fields: [
        {
          name: 'ano',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'codigo',
          type: 'text',
          required: true,
        },
        {
          name: 'nome',
          type: 'text',
          required: true,
        },
        {
          name: 'percentual_presumido_pis',
          type: 'number',
        },
        {
          name: 'percentual_presumido_cofins',
          type: 'number',
        },
        {
          name: 'aliquota_efetiva_pis',
          type: 'number',
        },
        {
          name: 'aliquota_efetiva_cofins',
          type: 'number',
        },
        {
          name: 'ncm',
          type: 'text',
        },
        {
          name: 'base_legal',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_tabelas_produtos_agro_ano_cod ON tabelas_produtos_agro (ano, codigo)',
      ],
    })
    app.save(tabelasAgro)

    // --- SEEDS ANUAIS (2024, 2025, 2026, 2027) ---
    const anos = [2024, 2025, 2026, 2027]

    // Categorias padrão por ano
    const categoriasBase = [
      {
        categoria: 'comercial_servico',
        descricao: 'Comercial / Serviços / Insumos Gerais',
        aliquota_credito_pis: 1.65,
        aliquota_credito_cofins: 7.6,
        permite_credito: true,
        tipo_credito: 'padrao',
        observacao: 'Crédito básico não-cumulativo padrão (Art. 3º das Leis 10.637/02 e 10.833/03)',
      },
      {
        categoria: 'rural_agro',
        descricao: 'Rural / Agropecuário (Crédito Presumido por Produto)',
        aliquota_credito_pis: 0.825, // Referência média ~50%
        aliquota_credito_cofins: 3.8, // Referência média ~50%
        permite_credito: true,
        tipo_credito: 'presumido',
        observacao:
          'Crédito presumido da agroindústria com alíquotas diferenciadas por produto agropecuário (Lei 10.925/04)',
      },
      {
        categoria: 'monofasico',
        descricao: 'Produtos Monofásicos / Alíquota Zero',
        aliquota_credito_pis: 0.0,
        aliquota_credito_cofins: 0.0,
        permite_credito: false,
        tipo_credito: 'isento_vedado',
        observacao:
          'Regime monofásico ou alíquota zero sem direito a crédito (Art. 2º da Lei 10.833/03 e Lei 10.147/00)',
      },
      {
        categoria: 'imobilizado',
        descricao: 'Bens do Ativo Imobilizado (Depreciação / Aquisição)',
        aliquota_credito_pis: 1.65,
        aliquota_credito_cofins: 7.6,
        permite_credito: true,
        tipo_credito: 'depreciacao',
        observacao:
          'Crédito sobre encargos de depreciação de máquinas e equipamentos ou amortização 1/48 (Lei 10.833/03)',
      },
    ]

    // Produtos agro padrão por ano
    const produtosAgroBase = [
      {
        codigo: 'soja',
        nome: 'Soja em Grão',
        percentual_presumido_pis: 50.0,
        percentual_presumido_cofins: 50.0,
        aliquota_efetiva_pis: 0.825,
        aliquota_efetiva_cofins: 3.8,
        ncm: '1201.90.00',
        base_legal: 'Lei 10.925/2004, Art. 8º, § 3º, I (50% do crédito padrão)',
      },
      {
        codigo: 'milho',
        nome: 'Milho em Grão',
        percentual_presumido_pis: 35.0,
        percentual_presumido_cofins: 35.0,
        aliquota_efetiva_pis: 0.5775,
        aliquota_efetiva_cofins: 2.66,
        ncm: '1005.90.10',
        base_legal: 'Lei 10.925/2004, Art. 8º, § 3º, II (35% do crédito padrão)',
      },
      {
        codigo: 'cana_de_acucar',
        nome: 'Cana-de-Açúcar',
        percentual_presumido_pis: 50.0,
        percentual_presumido_cofins: 50.0,
        aliquota_efetiva_pis: 0.825,
        aliquota_efetiva_cofins: 3.8,
        ncm: '1212.93.00',
        base_legal: 'Lei 10.925/2004 e Lei 12.839/2013 (50% do crédito padrão)',
      },
      {
        codigo: 'leite_in_natura',
        nome: 'Leite In Natura / Lácteos',
        percentual_presumido_pis: 50.0,
        percentual_presumido_cofins: 50.0,
        aliquota_efetiva_pis: 0.825,
        aliquota_efetiva_cofins: 3.8,
        ncm: '0401.20.10',
        base_legal: 'Lei 10.925/2004, Art. 8º e Decreto 8.533/2015 (50% do crédito padrão)',
      },
      {
        codigo: 'trigo',
        nome: 'Trigo em Grão',
        percentual_presumido_pis: 35.0,
        percentual_presumido_cofins: 35.0,
        aliquota_efetiva_pis: 0.5775,
        aliquota_efetiva_cofins: 2.66,
        ncm: '1001.99.00',
        base_legal: 'Lei 10.925/2004, Art. 8º (35% do crédito padrão)',
      },
      {
        codigo: 'cafe',
        nome: 'Café em Grão Cru',
        percentual_presumido_pis: 50.0,
        percentual_presumido_cofins: 50.0,
        aliquota_efetiva_pis: 0.825,
        aliquota_efetiva_cofins: 3.8,
        ncm: '0901.11.10',
        base_legal: 'Lei 10.925/2004 e Lei 12.350/2010 (50% do crédito padrão)',
      },
      {
        codigo: 'bovinos_aves_suinos',
        nome: 'Carnes e Animais Vivos (Bovinos/Aves/Suínos)',
        percentual_presumido_pis: 35.0,
        percentual_presumido_cofins: 35.0,
        aliquota_efetiva_pis: 0.5775,
        aliquota_efetiva_cofins: 2.66,
        ncm: '0201.10.00',
        base_legal: 'Lei 12.058/2009 e Lei 12.350/2010 (35% do crédito padrão)',
      },
      {
        codigo: 'algodao',
        nome: 'Algodão em Pluma',
        percentual_presumido_pis: 50.0,
        percentual_presumido_cofins: 50.0,
        aliquota_efetiva_pis: 0.825,
        aliquota_efetiva_cofins: 3.8,
        ncm: '5201.00.20',
        base_legal: 'Lei 10.925/2004 (50% do crédito padrão)',
      },
      {
        codigo: 'outros_produtos_agro',
        nome: 'Outros Produtos Agropecuários (Genérico)',
        percentual_presumido_pis: 35.0,
        percentual_presumido_cofins: 35.0,
        aliquota_efetiva_pis: 0.5775,
        aliquota_efetiva_cofins: 2.66,
        ncm: '',
        base_legal: 'Lei 10.925/2004, Art. 8º, § 3º',
      },
    ]

    for (const ano of anos) {
      // 1. Inserir Categorias
      for (const cat of categoriasBase) {
        try {
          const existing = app.findRecordsByFilter(
            'tabelas_insumos_real',
            `ano = ${ano} && categoria = "${cat.categoria}"`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const rec = new Record(tabelasInsumos)
            rec.set('ano', ano)
            rec.set('categoria', cat.categoria)
            rec.set('descricao', cat.descricao)
            rec.set('aliquota_credito_pis', cat.aliquota_credito_pis)
            rec.set('aliquota_credito_cofins', cat.aliquota_credito_cofins)
            rec.set('permite_credito', cat.permite_credito)
            rec.set('tipo_credito', cat.tipo_credito)
            rec.set('observacao', cat.observacao)
            app.save(rec)
          }
        } catch (_) {
          const rec = new Record(tabelasInsumos)
          rec.set('ano', ano)
          rec.set('categoria', cat.categoria)
          rec.set('descricao', cat.descricao)
          rec.set('aliquota_credito_pis', cat.aliquota_credito_pis)
          rec.set('aliquota_credito_cofins', cat.aliquota_credito_cofins)
          rec.set('permite_credito', cat.permite_credito)
          rec.set('tipo_credito', cat.tipo_credito)
          rec.set('observacao', cat.observacao)
          app.save(rec)
        }
      }

      // 2. Inserir Produtos Agro
      for (const prod of produtosAgroBase) {
        try {
          const existing = app.findRecordsByFilter(
            'tabelas_produtos_agro',
            `ano = ${ano} && codigo = "${prod.codigo}"`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const rec = new Record(tabelasAgro)
            rec.set('ano', ano)
            rec.set('codigo', prod.codigo)
            rec.set('nome', prod.nome)
            rec.set('percentual_presumido_pis', prod.percentual_presumido_pis)
            rec.set('percentual_presumido_cofins', prod.percentual_presumido_cofins)
            rec.set('aliquota_efetiva_pis', prod.aliquota_efetiva_pis)
            rec.set('aliquota_efetiva_cofins', prod.aliquota_efetiva_cofins)
            rec.set('ncm', prod.ncm)
            rec.set('base_legal', prod.base_legal)
            app.save(rec)
          }
        } catch (_) {
          const rec = new Record(tabelasAgro)
          rec.set('ano', ano)
          rec.set('codigo', prod.codigo)
          rec.set('nome', prod.nome)
          rec.set('percentual_presumido_pis', prod.percentual_presumido_pis)
          rec.set('percentual_presumido_cofins', prod.percentual_presumido_cofins)
          rec.set('aliquota_efetiva_pis', prod.aliquota_efetiva_pis)
          rec.set('aliquota_efetiva_cofins', prod.aliquota_efetiva_cofins)
          rec.set('ncm', prod.ncm)
          rec.set('base_legal', prod.base_legal)
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    try {
      const colAgro = app.findCollectionByNameOrId('tabelas_produtos_agro')
      if (colAgro) app.delete(colAgro)
    } catch (_) {}

    try {
      const colInsumos = app.findCollectionByNameOrId('tabelas_insumos_real')
      if (colInsumos) app.delete(colInsumos)
    } catch (_) {}
  },
)
