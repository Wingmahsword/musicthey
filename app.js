/* ============================================================
   DJ Drop – Frontend Logic V3 (Robust Direct Download)
   Webhook: https://fosssss.app.n8n.cloud/webhook/dj-download
   ============================================================ */

const WEBHOOK_URL = 'https://fosssss.app.n8n.cloud/webhook-test/dj-download';

const PLATFORM_META = {
  tidal:      { label: 'Tidal',       emoji: '🎵', cls: 'p1', quality: 'FLAC Lossless' },
  qobuz:      { label: 'Qobuz',       emoji: '🎶', cls: 'p1', quality: 'FLAC Lossless' },
  deezer:     { label: 'Deezer',      emoji: '🎸', cls: 'p2', quality: 'FLAC Lossless' },
  spotify:    { label: 'Spotify',     emoji: '🎤', cls: 'p3', quality: '320kbps MP3' },
  apple:      { label: 'Apple Music', emoji: '🍎', cls: 'p3', quality: '320kbps MP3' },
  soundcloud: { label: 'SoundCloud',  emoji: '☁️', cls: 'p3', quality: '320kbps MP3' },
  unknown:    { label: 'Source',      emoji: '🎧', cls: 'p3', quality: 'Best Available' },
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

function setResult(html, type = '') {
  const area = document.getElementById('result-area');
  area.className = 'result-area';
  area.innerHTML = `<div class="result-card ${type}">${html}</div>`;
}

function showLoading(platform) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.unknown;
  setResult(`
    <div class="result-title"><span class="spinner"></span>Fetching hi-res audio…</div>
    <div class="result-body">
      <span class="platform-tag ${meta.cls}">${meta.emoji} ${meta.label} Detected</span>
      <p style="margin-top:0.6rem;color:var(--text-muted)">Contacting Lucida · Checking ${meta.quality} availability…</p>
    </div>
  `, 'loading');
}

function showSuccess(platform, downloadUrl, metadata) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.unknown;
  const title  = (metadata && metadata.title)  || 'Track';
  const artist = (metadata && metadata.artist) || '';
  const isFlac = (meta.cls === 'p1' || meta.cls === 'p2');

  setResult(`
    <div class="result-title">✅ Ready to Download</div>
    <div class="result-body">
      <div style="margin-bottom:0.8rem">
        <span class="platform-tag ${meta.cls}">${meta.emoji} ${meta.label}</span>
        <span class="platform-tag p1" style="margin-left:0.4rem">🎧 ${meta.quality}</span>
      </div>
      <div style="font-size:1.15rem;font-weight:700;margin-bottom:0.15rem">${artist ? artist + ' –' : ''} ${title}</div>
      <a href="${downloadUrl}" class="download-btn-big" target="_blank" rel="noopener">
        ⬇️ Download ${isFlac ? 'FLAC' : '320kbps'} Now
      </a>
      <p style="margin-top:0.8rem;font-size:0.75rem;color:var(--text-muted)">
        If the file opens in a new tab, right-click the player →  <strong>Save Audio As…</strong>
      </p>
    </div>
  `, 'success');
}

function showError(msg) {
  setResult(`
    <div class="result-title">❌ Could not fetch track</div>
    <div class="result-body" style="color:var(--text-muted)">
      <p>${msg}</p>
      <p style="margin-top:0.5rem;font-size:0.85rem">💡 Try a <strong>Tidal</strong> or <strong>Qobuz</strong> link for guaranteed FLAC quality.</p>
    </div>
  `, 'error');
}

async function fetchTrack() {
  const input = document.getElementById('music-url');
  const btn   = document.getElementById('fetch-btn');
  const url   = input.value.trim();

  if (!url) { input.focus(); return; }
  if (!url.startsWith('http')) {
    showError('Please paste a valid link starting with https://');
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

    // Handle empty or non-JSON response gracefully
    const text = await res.text();
    if (!text || text.trim() === '') {
      throw new Error('The server returned an empty response. Please re-import the updated n8n workflow from GitHub.');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Server returned invalid data. Check your n8n workflow is active and saved.');
    }

    // Handle array response (n8n may return array)
    if (Array.isArray(data)) data = data[0];

    // Dig through multiple possible response shapes from Lucida + n8n
    const downloadUrl =
      data.download_url ||
      data.result?.url ||
      data.result?.download_url ||
      data.url ||
      null;

    const metadata =
      data.metadata ||
      data.result?.metadata ||
      {};

    const detectedPlatform = data.platform || platform;

    if (downloadUrl) {
      showSuccess(detectedPlatform, downloadUrl, metadata);
    } else {
      throw new Error('Track found but no download link available. Lucida may not support this link yet — try a Tidal or Qobuz track URL.');
    }

  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Fetch Track';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('music-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchTrack();
  });
});
