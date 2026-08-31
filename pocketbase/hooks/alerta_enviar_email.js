// POST /backend/v1/alertas/enviar-email
// Dispara notificação por e-mail para o proprietário do escritório contábil
// sobre alertas tributários críticos e pendências das empresas clientes.
routerAdd(
  'POST',
  '/backend/v1/alertas/enviar-email',
  (e) => {
    try {
      var auth = e.auth
      if (!auth) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      var escId = auth.getString('escritorio_id')
      if (!escId) {
        return e.badRequestError('Escritório não vinculado ao usuário.')
      }

      var body = {}
      try {
        body = e.requestInfo().body || {}
      } catch (_) {
        body = {}
      }

      var alertas = body.alertas || []
      var emailDestinatario = (body.email_destinatario || '').trim().toLowerCase()
      var empresaNome = body.empresa_nome || ''
      var tipoAlerta = body.tipo_alerta || 'alerta_geral'
      var assuntoPersonalizado = body.assunto || ''

      var esc
      try {
        esc = $app.findRecordById('escritorios', escId)
      } catch (_) {
        return e.notFoundError('Escritório não encontrado.')
      }

      var nomeEscritorio = esc.getString('nome') || 'Escritório Contábil'

      // Se destinatário não foi enviado expressamente, procura o e-mail do proprietário/admin ou do escritório
      if (!emailDestinatario) {
        try {
          var cfg = $app.findFirstRecordByData('alertas_config', 'escritorio_id', escId)
          if (cfg && cfg.getString('email_proprietario')) {
            emailDestinatario = cfg.getString('email_proprietario')
          }
        } catch (_) {}
      }

      if (!emailDestinatario) {
        try {
          var admins = $app.findRecordsByFilter(
            'users',
            'escritorio_id = {:escId} && cargo = "admin"',
            '-created',
            1,
            0,
            { escId: escId },
          )
          if (admins && admins.length > 0) {
            emailDestinatario = admins[0].email() || admins[0].getString('email')
          }
        } catch (_) {}
      }

      if (!emailDestinatario) {
        emailDestinatario = esc.getString('email') || ''
      }

      if (!emailDestinatario || emailDestinatario.indexOf('@') < 0) {
        return e.json(400, {
          success: false,
          message: 'Nenhum e-mail de proprietário/administrador configurado para o escritório.',
        })
      }

      var siteUrl = $os.getenv('SITE_URL') || ''
      var dashboardUrl = siteUrl ? siteUrl.replace(/\/$/, '') + '/app/dashboard' : '/app/dashboard'
      var senderAddress = $app.settings().meta.senderAddress || 'no-reply@previatributaria.com.br'
      var senderName = $app.settings().meta.senderName || 'Prévia Tributária — Alertas'

      // Montar HTML de alertas
      var alertasHtml = ''
      if (Array.isArray(alertas) && alertas.length > 0) {
        alertasHtml =
          '<div style="margin: 20px 0; display: flex; flex-direction: column; gap: 12px;">'
        for (var i = 0; i < alertas.length; i++) {
          var a = alertas[i]
          var corBorda =
            a.severidade === 'critico'
              ? '#ef4444'
              : a.severidade === 'atencao'
                ? '#f59e0b'
                : '#3b82f6'
          var corFundo =
            a.severidade === 'critico'
              ? '#fef2f2'
              : a.severidade === 'atencao'
                ? '#fffbeb'
                : '#eff6ff'
          var textoBadge =
            a.severidade === 'critico'
              ? 'URGENTE / CRÍTICO'
              : a.severidade === 'atencao'
                ? 'ATENÇÃO'
                : 'INFORMATIVO'
          var linkEmpresa =
            a.empresa_id && siteUrl
              ? siteUrl.replace(/\/$/, '') + '/app/empresas/' + a.empresa_id + '/planejador'
              : dashboardUrl

          alertasHtml +=
            '<div style="background:' +
            corFundo +
            ';border-left:4px solid ' +
            corBorda +
            ';padding:14px 16px;border-radius:6px;margin-bottom:12px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<strong style="color:#0f172a;font-size:15px">' +
            (a.empresa_nome || 'Empresa') +
            '</strong>' +
            '<span style="background:' +
            corBorda +
            ';color:#ffffff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:4px">' +
            textoBadge +
            '</span>' +
            '</div>' +
            '<div style="color:#334155;font-size:14px;font-weight:bold;margin-bottom:4px">' +
            (a.titulo || 'Alerta Tributário') +
            '</div>' +
            '<p style="color:#475569;font-size:13px;margin:4px 0 8px 0">' +
            (a.descricao || '') +
            '</p>' +
            (a.acao
              ? '<p style="color:#0f172a;font-size:12px;margin:0 0 8px 0"><strong>Ação recomendada:</strong> ' +
                a.acao +
                '</p>'
              : '') +
            '<a href="' +
            linkEmpresa +
            '" style="color:#0284c7;font-size:12px;font-weight:bold;text-decoration:none">→ Abrir Planejador de Retiradas</a>' +
            '</div>'
        }
        alertasHtml += '</div>'
      } else {
        alertasHtml =
          '<p style="font-size:14px;color:#334155">Alerta tributário emitido pelo sistema para a empresa <strong>' +
          (empresaNome || 'sua carteira') +
          '</strong>.</p>'
      }

      var subject = assuntoPersonalizado || '⚠️ Alertas Fiscais das Empresas — ' + nomeEscritorio

      var html =
        '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0f172a;line-height:1.5;background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-radius:12px">' +
        '<div style="border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:18px">' +
        '<span style="font-size:11px;color:#059669;font-weight:bold;letter-spacing:1px;text-transform:uppercase">Sistema de Inteligência Tributária</span>' +
        '<h2 style="color:#0f172a;margin:4px 0 0 0;font-size:20px">Relatório de Alertas Automáticos</h2>' +
        '<p style="margin:4px 0 0 0;color:#64748b;font-size:13px">' +
        nomeEscritorio +
        '</p>' +
        '</div>' +
        '<p style="font-size:14px;color:#334155">Olá <strong>Contador / Proprietário</strong>,</p>' +
        '<p style="font-size:13px;color:#475569">Identificamos os seguintes pontos de atenção tributária e oportunidades de enquadramento na sua carteira de empresas PJ:</p>' +
        alertasHtml +
        '<div style="margin:28px 0 16px 0;text-align:center">' +
        '<a href="' +
        dashboardUrl +
        '" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">Acessar Dashboard de Alertas</a>' +
        '</div>' +
        '<p style="color:#64748b;font-size:11px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;text-align:center">' +
        'Este e-mail foi gerado automaticamente pela plataforma Prévia Tributária IRPF para o escritório ' +
        nomeEscritorio +
        '.' +
        '</p>' +
        '</div>'

      var message = new MailerMessage({
        from: {
          address: senderAddress,
          name: senderName,
        },
        to: [{ address: emailDestinatario }],
        subject: subject,
        html: html,
      })

      var mailSent = false
      var mailError = ''
      try {
        $app.newMailClient().send(message)
        mailSent = true
      } catch (errSend) {
        mailError = String(errSend)
        $app.logger().warn('envio email alerta failed', 'error', mailError)
      }

      // Auditoria
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'disparar_alerta_email')
        auditRec.set('entity', 'escritorios')
        auditRec.set('entity_id', escId)
        auditRec.set(
          'diff',
          JSON.stringify({
            destinatario: emailDestinatario,
            qtd_alertas: Array.isArray(alertas) ? alertas.length : 1,
            tipo: tipoAlerta,
            enviado: mailSent,
            erro: mailError || null,
          }),
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        enviado: mailSent,
        email_destinatario: emailDestinatario,
        aviso:
          !mailSent && mailError
            ? 'E-mail processado (servidor SMTP simulado ou sem entrega externa ativa: ' +
              mailError +
              ')'
            : null,
        message: mailSent
          ? 'Alerta enviado por e-mail com sucesso para ' + emailDestinatario
          : 'Alerta registrado para ' +
            emailDestinatario +
            (mailError ? ' (' + mailError + ')' : ''),
      })
    } catch (err) {
      $app.logger().error('alerta enviar email route error', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      return e.json(500, {
        success: false,
        message: 'Erro ao processar envio de alerta: ' + msg,
      })
    }
  },
  $apis.requireAuth(),
)
