// Inclui o cargo "super_admin" nas API rules (regras de acesso) das collections
// que possuem regras condicionais por cargo: `clientes` e `declaracoes`.
//
// O cargo super_admin foi adicionado ao enum em 0015, porem nao foi incluido nas
// regras de API definidas em 0013 — o que fazia um usuario promovido a super_admin
// perder a capacidade de criar/listar/atualizar registros nessas collections.
//
// O super_admin tem acesso total (como ou maior que admin) a todos os registros de
// todos os escritorios, por isso a clausula do super_admin NAO restringe por
// escritorio_id.
migrate(
  (app) => {
    // --- clientes ------------------------------------------------------------
    const clientesCol = app.findCollectionByNameOrId('clientes')

    const clienteReadRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && responsaveis.id ?= @request.auth.id) || ' +
      '(@request.auth.cargo = "visualizador" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "cliente" && user_id = @request.auth.id) || ' +
      '(@request.auth.cargo = "super_admin")'

    const clienteWriteRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "super_admin")'

    clientesCol.listRule = clienteReadRule
    clientesCol.viewRule = clienteReadRule
    clientesCol.createRule = clienteWriteRule
    clientesCol.updateRule = clienteWriteRule
    clientesCol.deleteRule = clienteWriteRule
    app.save(clientesCol)

    // --- declaracoes ---------------------------------------------------------
    const decCol = app.findCollectionByNameOrId('declaracoes')

    const decReadRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && cliente_id.responsaveis.id ?= @request.auth.id && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "visualizador" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "cliente" && cliente_id.user_id = @request.auth.id) || ' +
      '(@request.auth.cargo = "super_admin")'

    const decWriteRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "super_admin")'

    decCol.listRule = decReadRule
    decCol.viewRule = decReadRule
    decCol.createRule = decWriteRule
    decCol.updateRule = decWriteRule
    decCol.deleteRule = decWriteRule
    app.save(decCol)
  },
  (app) => {
    // Reverte para as regras originais (sem super_admin) definidas em 0013.
    const clientesCol = app.findCollectionByNameOrId('clientes')

    const clienteReadRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && responsaveis.id ?= @request.auth.id) || ' +
      '(@request.auth.cargo = "visualizador" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "cliente" && user_id = @request.auth.id)'

    const clienteWriteRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && escritorio_id = @request.auth.escritorio_id)'

    clientesCol.listRule = clienteReadRule
    clientesCol.viewRule = clienteReadRule
    clientesCol.createRule = clienteWriteRule
    clientesCol.updateRule = clienteWriteRule
    clientesCol.deleteRule = clienteWriteRule
    app.save(clientesCol)

    const decCol = app.findCollectionByNameOrId('declaracoes')

    const decReadRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && cliente_id.responsaveis.id ?= @request.auth.id && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "visualizador" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "cliente" && cliente_id.user_id = @request.auth.id)'

    const decWriteRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && escritorio_id = @request.auth.escritorio_id)'

    decCol.listRule = decReadRule
    decCol.viewRule = decReadRule
    decCol.createRule = decWriteRule
    decCol.updateRule = decWriteRule
    decCol.deleteRule = decWriteRule
    app.save(decCol)
  },
)
