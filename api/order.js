// Vercel Serverless Function - substitui api.php
// Replica exatamente a logica do CApiConnector do api.php original

const https  = require('https');
const crypto = require('crypto');

const API_KEY    = 'c66289394c2a6e8515c8e8b382fba719';
const USER_ID    = '75329';
const OFFER_ID   = '14325';
const API_DOMAIN = 'https://t-api.org';

/* ---- helpers ---- */

function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

function parseFormBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk.toString(); });
    req.on('end', () => {
      try {
        const p = new URLSearchParams(raw);
        const obj = {};
        for (const [k, v] of p) obj[k] = v;
        resolve(obj);
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function httpPost(url, jsonBody) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const bufBody = Buffer.from(jsonBody);
    const options = {
      hostname: parsed.hostname,
      path    : parsed.pathname + parsed.search,
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'Content-Length': bufBody.length,
      },
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(bufBody);
    req.end();
  });
}

/* ---- handler principal ---- */

module.exports = async function handler(req, res) {

  // So aceita POST
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  // Parse do corpo do formulario
  const post = await parseFormBody(req);

  if (!post.name || !post.phone) {
    const ref = req.headers.referer || '/';
    res.writeHead(302, { Location: ref });
    res.end();
    return;
  }

  // IP real do usuario (Vercel usa x-forwarded-for)
  const ip = (req.headers['x-forwarded-for'] || '')
    .split(',')[0].trim() || req.socket?.remoteAddress || '';

  // Parametros GET (utm, sub_ids, etc.) passados via query string na action
  const query  = (req.url || '').split('?')[1] || '';
  const qp     = new URLSearchParams(query);
  const gp     = k => qp.get(k) || null;

  // Monta o objeto de lead identico ao api.php
  const leadData = {
    name        : post.name.trim(),
    phone       : post.phone.trim(),
    offer_id    : OFFER_ID,
    country     : 'HU',
    stream_id   : '',
    tz          : '',
    ip          : ip,
    user_agent  : req.headers['user-agent'] || 'Unknown',
    referer     : gp('referer') || req.headers.referer || null,
    region      : post.region       || null,
    city        : post.city         || null,
    count       : post.count        || null,
    address     : post.address      || null,
    email       : post.email        || null,
    zip         : post.zip          || null,
    user_comment: post.user_comment || null,
    utm_source  : gp('utm_source'),
    utm_medium  : gp('utm_medium'),
    utm_campaign: gp('utm_campaign'),
    utm_term    : gp('utm_term'),
    utm_content : gp('utm_content'),
    sub_id      : gp('sub_id'),
    sub_id_1    : gp('sub_id_1'),
    sub_id_2    : gp('sub_id_2'),
    sub_id_3    : gp('sub_id_3'),
    sub_id_4    : gp('sub_id_4'),
  };

  const payload = { user_id: USER_ID, data: leadData };
  const jsonStr = JSON.stringify(payload);
  const checkSum = sha1(jsonStr + API_KEY);

  const apiUrl = `${API_DOMAIN}/api/lead/create?check_sum=${encodeURIComponent(checkSum)}`;

  try {
    const response = await httpPost(apiUrl, jsonStr);
    const result   = JSON.parse(response.body);

    if (result.status === 'ok') {
      const leadId = (result.data && result.data.id) ? result.data.id : '';
      res.writeHead(302, { Location: '/success.html?id=' + leadId });
      res.end();
    } else {
      throw new Error(result.error || 'Erro desconhecido na API');
    }
  } catch (e) {
    // Em producao, mostra o erro para facilitar debug
    res.status(500).send('Erro ao registrar lead: ' + e.message);
  }
};
