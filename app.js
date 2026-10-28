/* ===== SPAM OTP - by Jiyyad | app.js ===== */

const DAILY_LIMIT = 7;
const LIMIT_KEY   = 'spamOtp_count';
const DATE_KEY    = 'spamOtp_date';
const FLOX_API    = 'https://flox-spamotp.vercel.app/api';
const FLOX_ORIGIN = 'https://flox-spamotp.vercel.app';
const FLOX_TOKEN  = 'PARADOX_SUPER_SECRET_998877';

/* ===== DOM ===== */
const phoneInput   = document.getElementById('phoneInput');
const sendBtn      = document.getElementById('sendBtn');
const sendText     = document.getElementById('sendText');
const consoleEl    = document.getElementById('console');
const channelModal = document.getElementById('channelModal');

/* ===== TAB SWITCH ===== */
function switchTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}

/* ===== LIMIT HELPERS ===== */
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getUsage() {
  try {
    const d = localStorage.getItem(DATE_KEY);
    if (d !== getTodayStr()) {
      localStorage.setItem(DATE_KEY, getTodayStr());
      localStorage.setItem(LIMIT_KEY, '0');
      return 0;
    }
    return parseInt(localStorage.getItem(LIMIT_KEY) || '0', 10);
  } catch { return 0; }
}

function incrementUsage() {
  try {
    const u = getUsage() + 1;
    localStorage.setItem(LIMIT_KEY, String(u));
    localStorage.setItem(DATE_KEY, getTodayStr());
    return u;
  } catch { return 1; }
}

function updateUI() {
  const used = getUsage();
  const sisa = DAILY_LIMIT - used;
  document.getElementById('stat-used').textContent = used;
  document.getElementById('stat-left').textContent = Math.max(0, sisa);
  if (sisa <= 0) {
    sendBtn.disabled = true;
    sendText.textContent = 'LIMIT HABIS (0/7)';
  } else {
    sendBtn.disabled = false;
    sendText.textContent = `KIRIM SPAM OTP (${sisa}/7)`;
  }
}

/* ===== LOGGER ===== */
function log(msg, type = 'info') {
  const t = new Date().toLocaleTimeString('en-US', { hour12: false });
  const d = document.createElement('div');
  d.className = 'log-line ' + type;
  d.textContent = `[${t}] ${msg}`;
  consoleEl.appendChild(d);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

/* ===== FLOX POST via proxy /api/spam ===== */
async function floxPost(payload) {
  const res = await fetch('/api/spam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

/* ===== SEND SPAM OTP ===== */
async function sendSpam() {
  if (getUsage() >= DAILY_LIMIT) {
    log('Limit harian tercapai. Coba lagi besok.', 'error');
    return;
  }

  const phone = phoneInput.value.trim().replace(/[\s+\-]/g, '');
  if (!phone) {
    log('Nomor target tidak boleh kosong!', 'error');
    phoneInput.focus();
    return;
  }
  if (phone.length < 9) {
    log('Nomor tidak valid. Minimal 9 digit.', 'error');
    return;
  }

  sendBtn.disabled = true;
  sendText.textContent = 'MEMPROSES...';
  log(`Mengirim ke nomor: ${phone}...`, 'info');

  let success = false;

  try {
    const { status, data } = await floxPost({ action: 'request_otp', phone });
    if (status === 200 && data.success) {
      log('SUCCESS: ' + (data.message || 'Terkirim'), 'success');
      if (data.stats) {
        const s = data.stats;
        log(`Stats — sukses:${s.success||0} bypass:${s.bypass||0} ratelimit:${s.ratelimit||0}`, 'info');
      }
      success = true;
    } else {
      log('GAGAL: ' + JSON.stringify(data).substring(0, 100), 'error');
    }
  } catch (e) {
    log('GAGAL: ' + e.message, 'error');
  }

  if (success) {
    const used = incrementUsage();
    const sisa = DAILY_LIMIT - used;
    log('Proses selesai. Cek HP target (' + phone + ').', 'success');
    log('Sisa hari ini: ' + sisa + '/7', 'warn');
  }

  updateUI();
}

/* ===== AM PREM: SEND LINK ===== */
async function amSendLink() {
  const email = document.getElementById('amEmail').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAmResult('error', 'Email tidak valid!');
    return;
  }

  const btn = document.getElementById('amSendBtn');
  const txt = document.getElementById('amSendText');
  btn.disabled = true;
  txt.textContent = 'MENGIRIM...';
  showAmResult('info', 'Mengirim link ke ' + email + '...');

  try {
    const { status, data } = await floxPost({ action: 'free_alight_send', email });
    if (status === 200 && data.success) {
      showAmResult('success', (data.message || 'Link berhasil dikirim!') + '\n\nCek inbox / folder spam emailmu.');
      document.getElementById('amVerifySection').style.display = 'flex';
    } else {
      showAmResult('error', 'Gagal: ' + JSON.stringify(data).substring(0, 120));
    }
  } catch (e) {
    showAmResult('error', 'Error: ' + e.message);
  }

  btn.disabled = false;
  txt.textContent = 'KIRIM ULANG';
}

/* ===== AM PREM: VERIFY ===== */
async function amVerify() {
  const email = document.getElementById('amEmail').value.trim();
  const link  = document.getElementById('amLink').value.trim();

  if (!link || !/^https?:\/\//.test(link)) {
    showAmResult('error', 'Link tidak valid!');
    return;
  }

  const btn = document.getElementById('amVerifyBtn');
  const txt = document.getElementById('amVerifyText');
  btn.disabled = true;
  txt.textContent = 'MEMVERIFIKASI...';
  showAmResult('info', 'Memverifikasi...');

  try {
    const { status, data } = await floxPost({ action: 'free_alight_verify', email, link });
    if (status === 200 && data.success) {
      let out = (data.message || 'Verifikasi sukses!');
      if (data.status)  out += '\nStatus  : ' + data.status;
      if (data.expired) out += '\nExpired : ' + data.expired;
      showAmResult('success', out);
    } else {
      showAmResult('error', 'Gagal: ' + JSON.stringify(data).substring(0, 120));
    }
  } catch (e) {
    showAmResult('error', 'Error: ' + e.message);
  }

  btn.disabled = false;
  txt.textContent = 'VERIFIKASI SEKARANG';
}

function showAmResult(type, msg) {
  const el = document.getElementById('amResult');
  el.className = 'am-result show';
  const colorMap = {
    success: 'var(--green)',
    error:   'var(--primary)',
    info:    'var(--fg-muted)'
  };
  el.style.color = colorMap[type] || 'var(--fg-muted)';
  el.textContent = msg;
}

/* ===== MODAL ===== */
function closeModal() {
  channelModal.classList.remove('active');
}

channelModal.addEventListener('click', (e) => {
  if (e.target === channelModal) closeModal();
});

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  updateUI();

  const used = getUsage();
  if (used > 0) {
    log('Sisa penggunaan hari ini: ' + (DAILY_LIMIT - used) + '/7', 'warn');
  }

  // Popup channel WA — muncul 1x saja
  try {
    if (!localStorage.getItem('hasSeenChannel')) {
      setTimeout(() => {
        channelModal.classList.add('active');
        localStorage.setItem('hasSeenChannel', 'true');
      }, 3000);
    }
  } catch {}
});
