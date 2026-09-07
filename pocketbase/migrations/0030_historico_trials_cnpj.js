// pocketbase/migrations/0030_historico_trials_cnpj.js
// Cria a collection `historico_trials_cnpj` para registro permanente de CNPJs
// que já consumiram um trial de 14 dias ou já iniciaram cadastro.
// Garante que mesmo que um escritório seja cancelado/bloqueado ou excluído,
// o mesmo CNPJ não possa obter um novo período de teste gratuito (anti-fraude).
migrate(
  (app) => {
    if (!app.hasTable('historico_trials_cnpj')) {
      const col = new Collection({
        name: 'historico_trials_cnpj',
        type: 'base',
        // Leitura apenas para usuários autenticados (ou super_admin); criação apenas server-side / hooks
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'cnpj',
            type: 'text',
            required: true,
            min: 14,
            max: 14,
          },
          {
            name: 'nome_escritorio',
            type: 'text',
          },
          {
            name: 'escritorio_id',
            type: 'text',
          },
          {
            name: 'trial_iniciado_em',
            type: 'date',
          },
          {
            name: 'trial_expira_em',
            type: 'date',
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_trials_cnpj_unique ON historico_trials_cnpj (cnpj)'],
      })
      app.save(col)
    }

    // Popula o histórico com escritórios existentes que possuam CNPJ preenchido
    try {
      const historicoCol = app.findCollectionByNameOrId('historico_trials_cnpj')
      const escritorios = app.findRecordsByFilter('escritorios', "cnpj != ''", 'created', 1000, 0)

      for (const esc of escritorios) {
        const cnpjDigitos = (esc.getString('cnpj') || '').replace(/\D/g, '')
        if (cnpjDigitos.length === 14) {
          try {
            app.findFirstRecordByData('historico_trials_cnpj', 'cnpj', cnpjDigitos)
          } catch (_) {
            const rec = new Record(historicoCol)
            rec.set('cnpj', cnpjDigitos)
            rec.set('nome_escritorio', esc.getString('nome'))
            rec.set('escritorio_id', esc.id)

            const trialAte = esc.getString('trial_ate')
            if (trialAte) {
              rec.set('trial_expira_em', trialAte)
            }
            const created = esc.getString('created')
            if (created) {
              rec.set('trial_iniciado_em', created)
            }
            app.save(rec)
          }
        }
      }
    } catch (popErr) {
      console.log('0030: aviso ao povoar historico_trials_cnpj: ' + String(popErr))
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('historico_trials_cnpj')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
