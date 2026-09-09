export function setupPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Setup Playarr TV</title>
<style>
  :root { --accent:#00D474; --accent-soft:#7dffc0; --ink:#04120b; --bg:#07080a; --panel:#0f1114; --hair:rgba(255,255,255,.08); --dim:#8f969c; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:#f3f5f6; font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { width:100%; max-width:420px; background:var(--panel); border:1px solid var(--hair); border-radius:18px; padding:28px 24px; }
  .logo { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .logo .dot { width:34px; height:34px; border-radius:17px; background:var(--accent); color:var(--ink); display:flex; align-items:center; justify-content:center; font-size:15px; }
  .logo h1 { font-size:22px; font-weight:800; letter-spacing:-.4px; }
  .logo h1 span { color:var(--accent); }
  .sub { color:var(--dim); font-size:14px; margin-bottom:22px; }
  label { display:block; font-size:13px; color:var(--dim); margin:0 0 6px 2px; }
  input { width:100%; background:#191d21; border:1px solid var(--hair); border-radius:12px; color:#f3f5f6; font-size:16px; padding:14px 16px; outline:none; }
  input:focus { border-color:rgba(0,212,116,.55); }
  input.error { border-color:#ff6b6b; }
  .code-wrap { margin:22px 0; padding:18px; border:1px dashed rgba(0,212,116,.4); border-radius:14px; text-align:center; background:rgba(0,212,116,.06); }
  .copy-hint { font-size:12px; color:var(--dim); letter-spacing:.4px; text-transform:uppercase; }
  .code { font-size:clamp(18px,6vw,44px); font-weight:800; letter-spacing:4px; word-break:break-all; color:var(--accent-soft); margin-top:6px; cursor:pointer; user-select:all; }
  .steps { margin:0 0 22px 2px; padding:0; list-style:none; color:var(--dim); font-size:13.5px; line-height:1.9; }
  .steps b { color:#e9ecee; font-weight:600; }
  button { width:100%; border:none; border-radius:12px; font-size:16px; font-weight:700; padding:15px 18px; cursor:pointer; margin-top:10px; }
  .primary { background:var(--accent); color:var(--ink); }
  .primary:disabled { background:#23392f; color:#6f8f80; cursor:default; }
  .ghost { background:rgba(255,255,255,.08); color:#f3f5f6; }
  .error { color:#ff8a80; font-size:14px; margin-top:12px; min-height:18px; }
  .ok { color:var(--accent-soft); }
  .foot { margin-top:18px; text-align:center; color:#5d646a; font-size:12px; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo"><div class="dot">▶</div><h1>Setup <span>Playarr</span> TV</h1></div>
    <p class="sub">Pair this phone with your TV to link your Plex account and Playarr server.</p>

    <ol class="steps">
      <li><b>Link Plex</b> — open plex.tv/link and enter the code shown below.</li>
      <li><b>Enter your Playarr server URL</b>.</li>
      <li><b>Complete</b> — the TV connects automatically.</li>
    </ol>

    <div class="code-wrap">
      <div class="copy-hint" id="copy-hint">Plex code — tap to copy</div>
      <div class="code" id="plex-code">······</div>
    </div>

    <label for="server-url">Playarr server URL</label>
    <input id="server-url" inputmode="url" autocomplete="off" placeholder="https://playarr.example.com"/>

    <button id="plex-link-button" class="ghost">1 · Link with Plex</button>
    <button id="complete-button" class="primary" disabled>2 · Complete setup</button>
    <p id="error-message" class="error"></p>
    <p class="foot">Keep this page open until the TV confirms the connection.</p>
  </div>

<script>
(function () {
  var codeEl = document.getElementById('plex-code');
  var hintEl = document.getElementById('copy-hint');
  var linkBtn = document.getElementById('plex-link-button');
  var doneBtn = document.getElementById('complete-button');
  var errEl = document.getElementById('error-message');
  var urlEl = document.getElementById('server-url');

  var clientId = null;
  var pinId = null;
  var authToken = null;
  var pollTimer = null;

  function setError(msg) { errEl.textContent = msg || ''; }

  function fetchPinFromTV() {
    return fetch('/api/pin').then(function (r) {
      if (!r.ok) throw new Error('Failed to fetch PIN: ' + r.status);
      return r.json();
    });
  }

  function pollPlexPin(clientId, pinId) {
    return fetch('https://plex.tv/api/v2/pins/' + pinId, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'X-Plex-Product': 'Playarr', 'X-Plex-Client-Identifier': clientId }
    }).then(function (r) {
      if (!r.ok) throw new Error('Failed to poll PIN: ' + r.status);
      return r.json();
    }).then(function (d) { return d.authToken || null; });
  }

  function submitSetup(serverUrl, authToken) {
    return fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl: serverUrl, authToken: authToken })
    }).then(function (r) { return r.json(); });
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      pollPlexPin(clientId, pinId).then(function (token) {
        if (!token) return;
        clearInterval(pollTimer);
        authToken = token;
        linkBtn.textContent = '✓ Plex linked';
        linkBtn.classList.remove('ghost');
        linkBtn.classList.add('primary');
        linkBtn.disabled = true;
        doneBtn.disabled = false;
      }).catch(function () {});
    }, 2000);
  }

  function init() {
    var tries = 0;
    function attempt() {
      fetchPinFromTV().then(function (pin) {
        if (pin.code && pin.pinId) {
          clientId = pin.clientId;
          pinId = pin.pinId;
          codeEl.textContent = pin.code;
          startPolling();
        } else if (tries++ < 15) {
          setTimeout(attempt, 1000);
        } else {
          codeEl.textContent = 'Error';
        }
      }).catch(function () {
        if (tries++ < 15) setTimeout(attempt, 1000);
        else codeEl.textContent = 'Error';
      });
    }
    attempt();
  }

  codeEl.addEventListener('click', function () {
    var code = codeEl.textContent.trim();
    if (!code || code === '······' || code === 'Error') return;
    if (navigator.clipboard) navigator.clipboard.writeText(code);
    hintEl.textContent = 'Copied!';
    setTimeout(function () { hintEl.textContent = 'Plex code — tap to copy'; }, 1400);
  });

  linkBtn.addEventListener('click', function () {
    if (authToken || !clientId || !pinId) return;
    setError('');
    window.open('https://plex.tv/link', '_blank');
  });

  urlEl.addEventListener('input', function () {
    var v = urlEl.value.trim();
    if (v && !/^https?:\\/\\//.test(v)) {
      setError('URL must start with http:// or https://');
      urlEl.classList.add('error');
    } else {
      setError('');
      urlEl.classList.remove('error');
    }
  });

  doneBtn.addEventListener('click', function () {
    var serverUrl = urlEl.value.trim();
    setError('');
    if (!serverUrl) { setError('Please enter your Playarr server URL.'); return; }
    if (!/^https?:\\/\\//.test(serverUrl)) { setError('URL must start with http:// or https://'); return; }
    if (!authToken) { setError('Link your Plex account first.'); return; }

    doneBtn.disabled = true;
    doneBtn.textContent = 'Connecting…';
    submitSetup(serverUrl, authToken).then(function (result) {
      if (result && result.success) {
        doneBtn.textContent = '✓ TV connected';
        hintEl.textContent = 'You can close this page';
        codeEl.classList.add('ok');
      } else {
        setError((result && result.error) || 'Setup failed. Please try again.');
        doneBtn.disabled = false;
        doneBtn.textContent = '2 · Complete setup';
      }
    }).catch(function () {
      setError('Connection error. Please try again.');
      doneBtn.disabled = false;
      doneBtn.textContent = '2 · Complete setup';
    });
  });

  init();
})();
</script>
</body>
</html>`;
}
