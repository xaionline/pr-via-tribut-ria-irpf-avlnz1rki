// 1. Adiciona "super_admin" ao enum de users.cargo.
// 2. Adiciona o campo "ativo" (bool) à coleção escritorios para permitir
//    ativar/desativar escritórios a partir da tela de administração.
migrate(
  (app) => {
    // --- users.cargo: adiciona super_admin ---------------------------------
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const cargoField = usersCol.fields.getByName('cargo')
    if (cargoField) {
      const vals = cargoField.values || []
      if (vals.indexOf('super_admin') < 0) {
        vals.push('super_admin')
        cargoField.values = vals
      }
    }
    app.save(usersCol)

    // --- escritorios.ativo: novo campo bool -------------------------------
    const escCol = app.findCollectionByNameOrId('escritorios')
    if (!escCol.fields.getByName('ativo')) {
      escCol.fields.add(new BoolField({ name: 'ativo' }))
    }
    app.save(escCol)

    // Marca todos os escritórios existentes como ativos por padrão.
    app.db().newQuery('UPDATE escritorios SET ativo = 1 WHERE ativo IS NULL').execute()
  },
  (app) => {
    // Reverte o enum de cargo (remove super_admin).
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const cargoField = usersCol.fields.getByName('cargo')
    if (cargoField) {
      const vals = (cargoField.values || []).filter(function (v) {
        return v !== 'super_admin'
      })
      cargoField.values = vals
    }
    app.save(usersCol)

    // Remove o campo ativo de escritorios.
    const escCol = app.findCollectionByNameOrId('escritorios')
    const ativoField = escCol.fields.getByName('ativo')
    if (ativoField) {
      escCol.fields.remove(ativoField)
    }
    app.save(escCol)
  },
)
