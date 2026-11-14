async function smokeTest() {
  const checks = [];

  async function check(name, url, validate) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      let ok = res.ok;
      let note = `HTTP ${res.status}`;
      if (validate) {
        const v = validate(res, text);
        if (!v.ok) { ok = false; note += ` - ${v.reason}`; }
        else { note += ` - ${v.reason}`; }
      }
      checks.push({ name, url, ok: ok ? 'PASS' : 'FAIL', note });
    } catch (err) {
      checks.push({ name, url, ok: 'FAIL', note: err.message });
    }
  }

  await check('API Liveness', 'http://127.0.0.1:4000/healthz', (res, text) => ({
    ok: text.includes('"status":"ok"'),
    reason: 'status ok'
  }));

  await check('API Readiness', 'http://127.0.0.1:4000/readyz', (res, text) => ({
    ok: text.includes('"status":"ready"'),
    reason: 'Postgres & Redis connected'
  }));

  await check('Public Listings API (Rule 9: Price/PII Protection)', 'http://127.0.0.1:4000/api/listings', (res, text) => {
    let json = {};
    try { json = JSON.parse(text); } catch {}
    const forbidden = ['price', 'askingPrice', 'commission', 'phone', 'email', 'ownerAskingPrice'];
    const leaked = forbidden.filter(k => text.includes(`"${k}":`));
    return {
      ok: leaked.length === 0 && Array.isArray(json.data),
      reason: leaked.length === 0 ? 'Zero price/PII leakage in public DTO' : `LEAK: ${leaked.join(',')}`
    };
  });

  await check('Public Filters Meta API', 'http://127.0.0.1:4000/api/meta/filters', (res, text) => ({
    ok: text.includes('cities') && text.includes('types'),
    reason: 'Facets and options available'
  }));

  await check('Web Arabic (/ar)', 'http://127.0.0.1:3000/ar', (res, text) => ({
    ok: text.includes('الأحمدي') || text.includes('عقارات'),
    reason: 'Arabic RTL landing page rendered'
  }));

  await check('Web English (/en)', 'http://127.0.0.1:3000/en', (res, text) => ({
    ok: text.includes('Al-ahmadi') || text.includes('Properties'),
    reason: 'English LTR landing page rendered'
  }));

  await check('Web Listings Page (/ar/listings)', 'http://127.0.0.1:3000/ar/listings', (res, text) => ({
    ok: text.includes('عقار') || text.includes('listings'),
    reason: 'Listings view and filters rendered'
  }));

  await check('Web Contact Page (/ar/contact)', 'http://127.0.0.1:3000/ar/contact', (res, text) => ({
    ok: text.includes('whatsapp') || text.includes('واتساب') || text.includes('contact'),
    reason: 'Contact information & WhatsApp CTA rendered'
  }));

  await check('Web Login Page (/ar/login)', 'http://127.0.0.1:3000/ar/login', (res, text) => ({
    ok: text.includes('password') || text.includes('كلمة المرور') || text.includes('login'),
    reason: 'Localized login form rendered'
  }));

  console.table(checks);
}

smokeTest();

