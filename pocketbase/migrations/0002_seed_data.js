migrate(
  (app) => {
    const escritorios = app.findCollectionByNameOrId('escritorios')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const declaracoesCol = app.findCollectionByNameOrId('declaracoes')
    const fontesCol = app.findCollectionByNameOrId('fontes_pagadoras')
    const rendimentosCol = app.findCollectionByNameOrId('rendimentos')
    const despesasCol = app.findCollectionByNameOrId('despesas_dedutiveis')
    const dependentesCol = app.findCollectionByNameOrId('dependentes')
    const resultadosCol = app.findCollectionByNameOrId('resultados')
    const tabelasCol = app.findCollectionByNameOrId('tabelas_progressivas')

    let escRec
    try {
      escRec = app.findFirstRecordByData('escritorios', 'nome', 'Escritório Adapta Tributária')
    } catch (_) {
      escRec = new Record(escritorios)
      escRec.set('nome', 'Escritório Adapta Tributária')
      escRec.set('cnpj', '00.000.000/0001-00')
      escRec.set('email', 'contato@adaptatributaria.com.br')
      escRec.set('telefone', '(11) 98888-7777')
      escRec.set('endereco', 'Av. Paulista, 1000 - São Paulo, SP')
      escRec.set('plano', 'pro')
      escRec.set('limite_clientes', 100)
      app.save(escRec)
    }

    let userRec
    try {
      userRec = app.findAuthRecordByEmail('_pb_users_auth_', 'pirola.daniel@gmail.com')
    } catch (_) {
      userRec = new Record(users)
      userRec.setEmail('pirola.daniel@gmail.com')
      userRec.setPassword('Skip@Pass')
      userRec.setVerified(true)
      userRec.set('name', 'Daniel Pirola')
      userRec.set('escritorio_id', escRec.id)
      userRec.set('cargo', 'admin')
      userRec.set('ativo', true)
      app.save(userRec)
    }

    // Seed Tabelas Progressivas
    try {
      app.findFirstRecordByData('tabelas_progressivas', 'ano', 2024)
    } catch (_) {
      const tab2024 = new Record(tabelasCol)
      tab2024.set('ano', 2024)
      tab2024.set('faixas', [
        { limite_inferior: 0, limite_superior: 2259.2, aliquota: 0, deducao: 0 },
        { limite_inferior: 2259.21, limite_superior: 2826.65, aliquota: 7.5, deducao: 169.44 },
        { limite_inferior: 2826.66, limite_superior: 3751.05, aliquota: 15.0, deducao: 381.44 },
        { limite_inferior: 3751.06, limite_superior: 4664.68, aliquota: 22.5, deducao: 662.77 },
        { limite_inferior: 4664.69, limite_superior: 9999999, aliquota: 27.5, deducao: 896.0 },
      ])
      app.save(tab2024)
    }

    try {
      app.findFirstRecordByData('tabelas_progressivas', 'ano', 2025)
    } catch (_) {
      const tab2025 = new Record(tabelasCol)
      tab2025.set('ano', 2025)
      tab2025.set('faixas', [
        { limite_inferior: 0, limite_superior: 2259.2, aliquota: 0, deducao: 0 },
        { limite_inferior: 2259.21, limite_superior: 2826.65, aliquota: 7.5, deducao: 169.44 },
        { limite_inferior: 2826.66, limite_superior: 3751.05, aliquota: 15.0, deducao: 381.44 },
        { limite_inferior: 3751.06, limite_superior: 4664.68, aliquota: 22.5, deducao: 662.77 },
        { limite_inferior: 4664.69, limite_superior: 9999999, aliquota: 27.5, deducao: 896.0 },
      ])
      app.save(tab2025)
    }

    // Seed Clientes
    const clientData = [
      {
        nome: 'Maria Oliveira',
        cpf: '111.444.777-35',
        email: 'maria@email.com',
        tipo: 'pessoa_fisica',
      },
      { nome: 'João Pereira', cpf: '222.555.888-35', email: 'joao@empresa.com', tipo: 'socio' },
      {
        nome: 'Ana Costa',
        cpf: '333.666.999-00',
        email: 'ana.costa@email.com',
        tipo: 'pessoa_fisica',
      },
    ]

    for (const c of clientData) {
      let cliRec
      try {
        cliRec = app.findFirstRecordByData('clientes', 'cpf', c.cpf)
      } catch (_) {
        cliRec = new Record(clientesCol)
        cliRec.set('escritorio_id', escRec.id)
        cliRec.set('nome', c.nome)
        cliRec.set('cpf', c.cpf)
        cliRec.set('email', c.email)
        cliRec.set('telefone', '(11) 97777-6666')
        cliRec.set('tipo', c.tipo)
        cliRec.set('status', 'ativo')
        cliRec.set('responsaveis', [userRec.id])
        app.save(cliRec)

        // Create Declarations 2024 & 2025
        const dec2024 = new Record(declaracoesCol)
        dec2024.set('escritorio_id', escRec.id)
        dec2024.set('cliente_id', cliRec.id)
        dec2024.set('ano_calendario', 2024)
        dec2024.set('status', 'concluida')
        dec2024.set('progresso', 100)
        app.save(dec2024)

        const dec2025 = new Record(declaracoesCol)
        dec2025.set('escritorio_id', escRec.id)
        dec2025.set('cliente_id', cliRec.id)
        dec2025.set('ano_calendario', 2025)
        dec2025.set('status', 'em_preenchimento')
        dec2025.set('progresso', 65)
        app.save(dec2025)

        // Seed Rendimentos & Despesas for Maria 2024
        if (c.nome === 'Maria Oliveira') {
          const fp = new Record(fontesCol)
          fp.set('declaracao_id', dec2024.id)
          fp.set('nome', 'Tech Solutions Ltda')
          fp.set('cnpj', '12.345.678/0001-90')
          fp.set('tipo', 'salario')
          app.save(fp)

          const rend = new Record(rendimentosCol)
          rend.set('declaracao_id', dec2024.id)
          rend.set('fonte_pagadora_id', fp.id)
          rend.set('descricao', 'Salário Anual Provento')
          rend.set('tipo', 'tributavel')
          rend.set('valor', 120000)
          app.save(rend)

          const des = new Record(despesasCol)
          des.set('declaracao_id', dec2024.id)
          des.set('categoria', 'saude')
          des.set('descricao', 'Plano de Saúde Familiar')
          des.set('valor', 14000)
          app.save(des)

          const dep = new Record(dependentesCol)
          dep.set('declaracao_id', dec2024.id)
          dep.set('nome', 'Lucas Oliveira')
          dep.set('cpf', '444.555.666-77')
          app.save(dep)

          const res = new Record(resultadosCol)
          res.set('declaracao_id', dec2024.id)
          res.set('base_calculo', 103724.92)
          res.set('irrf_devido', 18200)
          res.set('irrf_retido', 22000)
          res.set('saldo_imposto', -3800) // Restituição
          res.set('destinacoes_aplicadas', 0)
          res.set('detalhamento', { faixas: [] })
          app.save(res)
        }
      }
    }
  },
  (app) => {},
)
