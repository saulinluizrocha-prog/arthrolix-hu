// =============================================
// ARTHROLIX - Formulário via JS (GitHub Pages)
// Substitui api.php para funcionar em hosting estático
// =============================================

(function () {
  'use strict';

  var API_KEY    = 'c66289394c2a6e8515c8e8b382fba719';
  var USER_ID    = '75329';
  var OFFER_ID   = '14325';
  var API_DOMAIN = 'https://t-api.org';
  var COUNTRY    = 'HU';

  // Gera SHA1 usando Web Crypto API (assíncrono)
  async function sha1(str) {
    var msgBuffer = new TextEncoder().encode(str);
    var hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  // Obtém IP público do usuário
  async function getIP() {
    try {
      var r = await fetch('https://api.ipify.org?format=json');
      var d = await r.json();
      return d.ip || '';
    } catch (e) {
      return '';
    }
  }

  // Lê parâmetros da URL
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || null;
  }

  // Envia o lead para a API da Terra
  async function submitLead(name, phone) {
    var ip = await getIP();

    var leadData = {
      name:         name.trim(),
      phone:        phone.trim(),
      offer_id:     OFFER_ID,
      country:      COUNTRY,
      ip:           ip,
      user_agent:   navigator.userAgent || 'Unknown',
      referer:      document.referrer || window.location.href,
      utm_source:   getParam('utm_source'),
      utm_medium:   getParam('utm_medium'),
      utm_campaign: getParam('utm_campaign'),
      utm_term:     getParam('utm_term'),
      utm_content:  getParam('utm_content'),
      sub_id:       getParam('sub_id'),
      sub_id_1:     getParam('sub_id_1'),
      sub_id_2:     getParam('sub_id_2'),
      sub_id_3:     getParam('sub_id_3'),
      sub_id_4:     getParam('sub_id_4'),
    };

    var payload = { user_id: USER_ID, data: leadData };
    var jsonStr = JSON.stringify(payload);
    var checkSum = await sha1(jsonStr + API_KEY);

    var url = API_DOMAIN + '/api/lead/create?check_sum=' + checkSum;

    var response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    jsonStr,
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    var result = await response.json();

    if (result.status === 'ok') {
      return result.data;
    } else {
      throw new Error(result.error || 'Erro desconhecido');
    }
  }

  // Intercepta todos os formulários da landing page
  function attachForms() {
    var forms = document.querySelectorAll('form.x_order_form, form.al-form');

    forms.forEach(function (form) {
      // Remove action e bloqueia submit padrão
      form.removeAttribute('action');

      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        var nameInput  = form.querySelector('input[name="name"]');
        var phoneInput = form.querySelector('input[name="phone"]');

        if (!nameInput || !phoneInput) return;

        var name  = nameInput.value.trim();
        var phone = phoneInput.value.trim();

        if (!name || !phone) {
          alert('Por favor, preencha nome e telefone.');
          return;
        }

        // Desabilita botão durante envio
        var btn = form.querySelector('button[type="submit"], button.btn');
        var btnOriginalText = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = 'Enviando...';
        }

        try {
          var lead = await submitLead(name, phone);
          var leadId = lead && lead.id ? lead.id : '';
          window.location.href = 'success.html?id=' + leadId;
        } catch (err) {
          console.error('Erro ao enviar lead:', err);
          // Em caso de erro na API, redireciona mesmo assim
          window.location.href = 'success.html';
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = btnOriginalText;
          }
        }
      });
    });
  }

  // Aguarda o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachForms);
  } else {
    attachForms();
  }
})();
