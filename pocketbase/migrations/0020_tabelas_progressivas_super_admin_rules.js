// pocketbase/migrations/0020_tabelas_progressivas_super_admin_rules.js
// Atualiza as regras de API da collection `tabelas_progressivas` para permitir
// leitura para usuários autenticados e escrita (create, update, delete) apenas para admin e super_admin.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tabelas_progressivas')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"'
    col.updateRule = '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"'
    col.deleteRule = '@request.auth.cargo = "super_admin" || @request.auth.cargo = "admin"'
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('tabelas_progressivas')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    col.deleteRule = "@request.auth.id != ''"
    app.save(col)
  },
)
