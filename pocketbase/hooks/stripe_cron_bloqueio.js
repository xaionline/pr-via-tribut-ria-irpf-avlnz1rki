// Cron job: bloqueia escritórios atrasados cujo prazo de 24h expirou.
// Roda a cada hora ("0 * * * *"). Regras:
//  - assinatura_status = atrasado && data_bloqueio <= agora  ->  ativo = false e assinatura_status = bloqueado
//  - trial expirado (trial_ate <= agora) sem assinatura      ->  assinatura_status = cancelado e ativo = false
//  - pagamento regularizado (ativo) antes do bloqueio        ->  limpa data_bloqueio (o webhook já cuida disso;
//    aqui apenas normaliza escritórios ativos com data_bloqueio residual).
cronAdd('bloqueioAssinaturasAtrasadas', '0 * * * *', () => {
  var agora = new Date()
  var agoraStr = agora.toISOString().replace('T', ' ')
  var bloqueados = 0
  var expirados = 0

  try {
    var atrasados = $app.findRecordsByFilter(
      'escritorios',
      "assinatura_status = 'atrasado' && data_bloqueio != ''",
      '-data_bloqueio',
      500,
      0,
    )
    for (var i = 0; i < atrasados.length; i++) {
      var esc = atrasados[i]
      var dataBloqueio = esc.getString('data_bloqueio') || ''
      if (!dataBloqueio) continue
      var deveBloquear = new Date(dataBloqueio.replace(' ', 'T') + 'Z').getTime() <= agora.getTime()
      if (deveBloquear) {
        esc.set('ativo', false)
        esc.set('assinatura_status', 'bloqueado')
        $app.save(esc)
        bloqueados++
        $app.logger().warn('cron bloqueio: escritório ' + esc.id + ' bloqueado por inadimplência')
      }
    }
  } catch (errAtr) {
    $app.logger().error('cron bloqueio: falha ao varrer atrasados', 'error', String(errAtr))
  }

  try {
    var emTrial = $app.findRecordsByFilter(
      'escritorios',
      "assinatura_status = 'trial' && trial_ate != ''",
      '-trial_ate',
      500,
      0,
    )
    for (var j = 0; j < emTrial.length; j++) {
      var escTrial = emTrial[j]
      var trialAte = escTrial.getString('trial_ate') || ''
      if (!trialAte) continue
      var trialVenceu = new Date(trialAte.replace(' ', 'T') + 'Z').getTime() <= agora.getTime()
      if (trialVenceu) {
        escTrial.set('assinatura_status', 'cancelado')
        escTrial.set('ativo', false)
        $app.save(escTrial)
        expirados++
        $app.logger().warn('cron bloqueio: trial expirado no escritório ' + escTrial.id)
      }
    }
  } catch (errTr) {
    $app.logger().error('cron bloqueio: falha ao varrear trials', 'error', String(errTr))
  }

  try {
    var residuais = $app.findRecordsByFilter(
      'escritorios',
      "assinatura_status = 'ativo' && data_bloqueio != ''",
      '-data_bloqueio',
      500,
      0,
    )
    for (var k = 0; k < residuais.length; k++) {
      var escAtivo = residuais[k]
      escAtivo.set('data_bloqueio', '')
      $app.save(escAtivo)
    }
  } catch (errRes) {
    $app.logger().error('cron bloqueio: falha ao limpar residuais', 'error', String(errRes))
  }

  $app
    .logger()
    .info(
      'cron bloqueio assinaturas: ' +
        bloqueados +
        ' bloqueado(s), ' +
        expirados +
        ' trial expirado(s) em ' +
        agoraStr,
    )
})
