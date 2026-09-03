// GET /backend/v1/stripe/status
// Estado da assinatura + limites do plano para o escritório autenticado.
routerAdd(
  'GET',
  '/backend/v1/stripe/status',
  (e) => {
    var auth = e.auth
    if (!auth) {
      return e.unauthorizedError('Autenticação necessária.')
    }

    var escId = auth.getString('escritorio_id')
    if (!escId) {
      return e.badRequestError('Usuário sem escritório vinculado.')
    }

    var esc
    try {
      esc = $app.findRecordById('escritorios', escId)
    } catch (_) {
      return e.notFoundError('Escritório não encontrado.')
    }

    var stripeConfigurado = !!($os.getenv('STRIPE_SECRET_KEY') || '')

    var plano = esc.getString('plano') || 'starter'
    var status = esc.getString('assinatura_status') || 'trial'
    var limiteEmpresas = Number(esc.get('limite_empresas')) || 0
    var limiteClientes = Number(esc.get('limite_clientes')) || 0

    var countEmpresas = 0
    var countClientes = 0
    try {
      countEmpresas = $app.countRecords('empresas', "escritorio_id = '" + escId + "'")
    } catch (_) {}
    try {
      countClientes = $app.countRecords(
        'clientes',
        "escritorio_id = '" + escId + "' && status = 'ativo'",
      )
    } catch (_) {}

    var dataVencimento = esc.getString('data_vencimento') || ''
    var dataBloqueio = esc.getString('data_bloqueio') || ''
    var trialAte = esc.getString('trial_ate') || ''

    // Última fatura registrada
    var ultimaFatura = null
    try {
      var fat = $app.findRecordsByFilter(
        'assinaturas',
        'escritorio_id = "' + escId + '" && status != "info"',
        '-created',
        1,
        0,
      )
      if (fat && fat.length > 0) {
        ultimaFatura = {
          id: fat[0].id,
          tipo_evento: fat[0].getString('tipo_evento'),
          status: fat[0].getString('status'),
          valor: Number(fat[0].get('valor')) || 0,
          moeda: fat[0].getString('moeda'),
          created: fat[0].getString('created'),
        }
      }
    } catch (_) {}

    var acessoLiberado =
      esc.getBool('ativo') && (status === 'ativo' || status === 'trial' || status === 'atrasado')

    return e.json(200, {
      success: true,
      stripe_configurado: stripeConfigurado,
      escritorio: {
        id: escId,
        nome: esc.getString('nome'),
        plano: plano,
        ativo: esc.getBool('ativo'),
        assinatura_status: status,
        data_vencimento: dataVencimento,
        data_bloqueio: dataBloqueio,
        trial_ate: trialAte,
        stripe_customer_id: esc.getString('stripe_customer_id'),
        stripe_subscription_id: esc.getString('stripe_subscription_id'),
      },
      limites: {
        empresas: limiteEmpresas, // 0 = ilimitado (Enterprise)
        clientes: limiteClientes, // 0 = ilimitado (Enterprise)
        empresas_usadas: countEmpresas,
        clientes_usados: countClientes,
      },
      ultima_fatura: ultimaFatura,
      acesso_liberado: acessoLiberado,
    })
  },
  $apis.requireAuth(),
)
