/* ============================================================
   DJ Drop – Frontend Logic
   Webhook: https://fosssss.app.n8n.cloud/webhook/dj-download
   ============================================================ */

const WEBHOOK_URL = 'https://fosssss.app.n8n.cloud/webhook/dj-download';

const PLATFORM_META = {
  tidal:      { label: 'Tidal',       emoji: '🎵', cls: 'p1', note: 'Priority 1 · Native FLAC' },
  qobuz:      { label: 'Qobuz',       emoji: '🎶', cls: 'p1', note: 'Priority 1 · Native FLAC' },
  deezer:     { label: 'Deezer',      emoji: '🎸', cls: 'p2', note: 'Priority 2 · FLAC via Lucida' },
  spotify:    { label: 'Spotify',     emoji: '🎤', cls: 'p3', note: 'Priority 3 · 320kbps Match' },
  apple:      { label: 'Apple Music', emoji: '🍎', cls: 'p3', note: 'Priority 3 · 320kbps Match' },
  soundcloud: { label: 'SoundCloud',  emoji: '☁️', cls: 'p3', note: 'Priority 3 · 320kbps Match' },
  unknown:    { label: 'Unknown',     emoji: '🎧', cls: 'p3', note: 'Best available quality' },
};

function detectPlatform(url) {
  if (url.includes('tidal.com'))      return 'tidal';
  if (url.includes('qobuz.com'))      return 'qobuz';
  if (url.includes('deezer.com'))     return 'deezer';
  if (url.includes('spotify.com'))    return 'spotify';
  if (url.includes('apple.com'))      return 'apple';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return 'unknown';
}

function showResult(html, type = '') {
  const area = document.getElementById('result-area');
  area.className = 'result-area';
  area.innerHTML = `<div class="result-card ${type}">${html}</div>`;
}

function showLoading(platform) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.unknown;
  showResult(`
    <div class="result-title"><span class="spinner"></span>Processing your request…</div>
    <div class="result-body">
      <span class="platform-tag ${meta.cls}">${meta.emoji} ${meta.label} · ${meta.note}</span>
      <p style="margin-top:0.5rem;color:var(--text-muted)">Contacting Lucida and verifying quality. This takes a few seconds…</p>
    </div>
  `, 'loading');
}

function showSuccess(platform, data) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.unknown;

  // Try to pull a download URL from known Lucida response shapes
  const downloadUrl = data?.result?.url || data?.result?.download_url || data?.result?.link || null;
  const trackTitle  = data?.result?.title  || data?.result?.name  || 'Your Track';
  const trackArtist = data?.result?.artist || data?.result?.by    || '';

  const linkHtml = downloadUrl
    ? `<p style="margin-top:0.75rem"><a href="${downloadUrl}" target="_blank" rel="noopener noreferrer">⬇️ Download ${trackArtist ? trackArtist + ' – ' : ''}${trackTitle}</a></p>`
    : `<p style="margin-top:0.75rem;color:var(--text-muted)">✅ Request processed. Check your Telegram for the download link, or try the link above.</p>`;

  showResult(`
    <div class="result-title">✅ Download Ready</div>
    <div class="result-body">
      <span class="platform-tag ${meta.cls}">${meta.emoji} ${meta.label} · ${meta.note}</span>
      ${linkHtml}
      <p style="margin-top:0.6rem;font-size:0.8rem;color:var(--text-muted)">Quality: <strong>${meta.cls === 'p1' || meta.cls === 'p2' ? 'FLAC (Lossless)' : '320kbps MP3'}</strong></p>
    </div>
  `, 'success');
}

function showError(message) {
  showResult(`
    <div class="result-title">❌ Something went wrong</div>
    <div class="result-body" style="color:var(--text-muted)">${message}</div>
  `, 'error');
}

async function fetchTrack() {
  const input = document.getElementById('music-url');
  const btn   = document.getElementById('fetch-btn');
  const url   = input.value.trim();

  if (!url) {
    input.focus();
    input.style.borderColor = 'var(--error)';
    setTimeout(() => input.style.borderColor = '', 1500);
    return;
  }

  if (!url.startsWith('http')) {
    showError('Please paste a valid music link starting with <strong>https://</strong>');
    return;
  }

  const platform = detectPlatform(url);
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Fetching…';
  showLoading(platform);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    const data = await res.json();
    showSuccess(data.platform || platform, data);
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showError('Could not reach the download server. Check your internet connection and try again.');
    } else {
      showError(`Error: ${err.message}. Please try again or try a different link.`);
    }
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Fetch Track';
  }
}

// Allow pressing Enter in the input
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('music-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchTrack();
  });
});
