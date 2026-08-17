migrate(
  (app) => {
    // Promove o usuário Daniel Pirola (id: j0nzl292g7fy97j) de 'admin' para 'super_admin'
    app
      .db()
      .newQuery('UPDATE users SET cargo = {:cargo} WHERE id = {:id}')
      .bind({ cargo: 'super_admin', id: 'j0nzl292g7fy97j' })
      .execute()
  },
  (app) => {
    // Reverte para o cargo anterior ('admin')
    app
      .db()
      .newQuery('UPDATE users SET cargo = {:cargo} WHERE id = {:id}')
      .bind({ cargo: 'admin', id: 'j0nzl292g7fy97j' })
      .execute()
  },
)
