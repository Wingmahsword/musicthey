/* ============================================================
   DJ Drop – Frontend Logic (V2 - Direct Download)
   Webhook: https://fosssss.app.n8n.cloud/webhook/dj-download
   ============================================================ */

const WEBHOOK_URL = 'https://fosssss.app.n8n.cloud/webhook/dj-download';

const PLATFORM_META = {
  tidal:      { label: 'Tidal',       emoji: '🎵', cls: 'p1', quality: 'FLAC (Lossless)' },
  qobuz:      { label: 'Qobuz',       emoji: '🎶', cls: 'p1', quality: 'FLAC (Lossless)' },
  deezer:     { label: 'Deezer',      emoji: '🎸', cls: 'p2', quality: 'FLAC (Lossless)' },
  spotify:    { label: 'Spotify',     emoji: '🎤', cls: 'p3', quality: '320kbps MP3' },
  apple:      { label: 'Apple Music', emoji: '🍎', cls: 'p3', quality: '320kbps MP3' },
  soundcloud: { label: 'SoundCloud',  emoji: '☁️', cls: 'p3', quality: '320kbps MP3' },
  unknown:    { label: 'Unknown',     emoji: '🎧', cls: 'p3', quality: 'High Quality' },
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
    <div class="result-title"><span class="spinner"></span>Processing…</div>
    <div class="result-body">
      <span class="platform-tag ${meta.cls}">${meta.emoji} ${meta.label} Detected</span>
      <p style="margin-top:0.5rem;color:var(--text-muted)">Fetching best quality audio. Please wait...</p>
    </div>
  `, 'loading');
}

function showSuccess(platform, data) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.unknown;
  const downloadUrl = data.download_url;
  const track = data.metadata || {};
  
  const title = track.title || 'Track';
  const artist = track.artist || 'Unknown Artist';

  showResult(`
    <div class="result-title">✅ Track Found</div>
    <div class="result-body">
      <div style="margin-bottom: 1rem;">
        <span class="platform-tag ${meta.cls}">${meta.emoji} ${meta.label}</span>
        <span class="platform-tag p1" style="margin-left:5px">🎧 ${meta.quality}</span>
      </div>
      
      <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.2rem;">${title}</div>
      <div style="color: var(--text-muted); margin-bottom: 1.5rem;">${artist}</div>
      
      <a href="${downloadUrl}" class="download-btn-big" target="_blank" download>
        Download Now (${meta.cls === 'p3' ? '320k' : 'FLAC'})
      </a>
      
      <p style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted);">
        The file will open in a new tab. Right-click and "Save As" if it starts playing.
      </p>
    </div>
  `, 'success');
}

function showError(message) {
  showResult(`
    <div class="result-title">❌ Error</div>
    <div class="result-body" style="color:var(--text-muted)">${message}</div>
  `, 'error');
}

async function fetchTrack() {
  const input = document.getElementById('music-url');
  const btn   = document.getElementById('fetch-btn');
  const url   = input.value.trim();

  if (!url) {
    input.focus();
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

    const data = await res.json();
    
    if (data.status === 'ok' && data.download_url) {
      showSuccess(data.platform || platform, data);
    } else {
      throw new Error('Could not find the track. Try a Tidal or Qobuz link for better results.');
    }
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Fetch Track';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('music-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchTrack();
  });
});
