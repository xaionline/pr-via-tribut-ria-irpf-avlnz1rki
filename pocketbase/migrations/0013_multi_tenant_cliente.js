// Isolamento multi-tenant + perfil de cliente.
// 1. Adiciona 'cliente' ao enum `cargo` de users.
// 2. Adiciona `user_id` (relation 1:1 com users) em clientes — vincula o login
//    do cliente ao seu registro em `clientes`.
// 3. Substitui as regras de acesso (API rules) de `clientes` e `declaracoes`
//    por regras multi-tenant que isolam por escritório, responsável e,
//    para o cargo `cliente`, restringem ao próprio registro.
migrate(
  (app) => {
    // --- 1. Enum cargo de users: adiciona 'cliente' ---
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const cargoField = usersCol.fields.getByName('cargo')
    if (cargoField) {
      cargoField.values = ['admin', 'consultor', 'visualizador', 'cliente']
    }
    app.save(usersCol)

    // --- 2. Campo user_id em clientes (relation 1:1, opcional) ---
    const clientesCol = app.findCollectionByNameOrId('clientes')
    if (!clientesCol.fields.getByName('user_id')) {
      clientesCol.fields.add(
        new RelationField({
          name: 'user_id',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }

    // --- 3. Regras multi-tenant de clientes ---
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
    clientesCol.deleteRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && escritorio_id = @request.auth.escritorio_id)'
    app.save(clientesCol)

    // --- 4. Regras multi-tenant de declaracoes ---
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
    decCol.deleteRule =
      '(@request.auth.cargo = "admin" && escritorio_id = @request.auth.escritorio_id) || ' +
      '(@request.auth.cargo = "consultor" && escritorio_id = @request.auth.escritorio_id)'
    app.save(decCol)
  },
  (app) => {
    // Reverte: remove 'cliente' do enum, remove user_id e volta às regras permissivas.
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const cargoField = usersCol.fields.getByName('cargo')
    if (cargoField) {
      cargoField.values = ['admin', 'consultor', 'visualizador']
    }
    app.save(usersCol)

    const clientesCol = app.findCollectionByNameOrId('clientes')
    const uid = clientesCol.fields.getByName('user_id')
    if (uid) clientesCol.fields.remove(uid)
    clientesCol.listRule = '@request.auth.id != ""'
    clientesCol.viewRule = '@request.auth.id != ""'
    clientesCol.createRule = '@request.auth.id != ""'
    clientesCol.updateRule = '@request.auth.id != ""'
    clientesCol.deleteRule = '@request.auth.id != ""'
    app.save(clientesCol)

    const decCol = app.findCollectionByNameOrId('declaracoes')
    decCol.listRule = '@request.auth.id != ""'
    decCol.viewRule = '@request.auth.id != ""'
    decCol.createRule = '@request.auth.id != ""'
    decCol.updateRule = '@request.auth.id != ""'
    decCol.deleteRule = '@request.auth.id != ""'
    app.save(decCol)
  },
)
