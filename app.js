// --- 1. Live Clock ---
function updateTime() {
    const timeDisplay = document.getElementById('live-time');
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    timeDisplay.textContent = hours + ':' + minutes + ' ' + ampm;
}
setInterval(updateTime, 1000);
updateTime();

// --- Preference storage (localStorage may be unavailable on file:// or in
// private mode, so every access is guarded) ---
function readStored(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (e) {
        return fallback;
    }
}

function writeStored(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) { /* storage unavailable (private mode / file://) */ }
}

// --- Theme (light / dark) ---
// The initial data-theme is set by the inline script in index.html so the
// first paint is already correct; this only handles switching afterwards.
const THEME_KEY = 'eon-theme';
const THEME_COLORS = { light: '#121212', dark: '#08080a' };

const themeToggle = document.getElementById('theme-toggle');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const darkSchemeQuery = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    if (themeColorMeta) themeColorMeta.setAttribute('content', THEME_COLORS[theme]);

    const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggle.setAttribute('aria-label', label);
    themeToggle.setAttribute('aria-pressed', theme === 'dark');
    themeToggle.title = label;
}

themeToggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    writeStored(THEME_KEY, next);
    applyTheme(next);
});

// Follow the OS appearance only until the user picks a theme themselves.
if (darkSchemeQuery) {
    const onSchemeChange = (e) => {
        const stored = readStored(THEME_KEY, null);
        if (stored === 'light' || stored === 'dark') return;
        applyTheme(e.matches ? 'dark' : 'light');
    };

    if (typeof darkSchemeQuery.addEventListener === 'function') {
        darkSchemeQuery.addEventListener('change', onSchemeChange);
    } else if (typeof darkSchemeQuery.addListener === 'function') {
        darkSchemeQuery.addListener(onSchemeChange); // Safari < 14
    }
}

applyTheme(currentTheme());

// --- 2. Single Playlist Configuration ---
const PLAYLIST_ID = 'PLW6pHGnTx70o';

// --- 3. YouTube Iframe API Integration ---
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
tag.onerror = () => {
    trackTitle.textContent = "Couldn't load player";
    trackArtist.textContent = "Check your connection and reload";
};
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player;
let progressInterval = null;
let playlistTracksLoaded = false;
let playerIsReady = false;

// Guards against error-handler race conditions (Bug #1)
let skipInProgress = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 10; // safety valve if the whole playlist is blocked

// Tracks in-flight oembed fetches so we don't refire them (Bug #7)
const oembedRequested = new Set();

const playBtn = document.getElementById('play-pause-btn');
const playPauseIcon = document.getElementById('play-pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const albumArt = document.getElementById('album-art');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressThumb = document.getElementById('progress-thumb');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');
const repeatBtn = document.getElementById('repeat-btn');
const repeatIcon = document.getElementById('repeat-icon');
const volumeControl = document.getElementById('volume-control');
const volumeBtn = document.getElementById('volume-btn');
const volumeIcon = document.getElementById('volume-icon');
const volumeSlider = document.getElementById('volume-slider');

// Sidebar UI Elements
const playlistBtn = document.getElementById('playlist-btn');
const playlistSidebar = document.getElementById('playlist-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebarTracks = document.getElementById('sidebar-tracks');
const sidebarScrim = document.getElementById('sidebar-scrim');

function setControlsEnabled(enabled) {
    playBtn.disabled = !enabled;
    prevBtn.disabled = !enabled;
    nextBtn.disabled = !enabled;
    repeatBtn.disabled = !enabled;
    volumeBtn.disabled = !enabled;
    volumeSlider.disabled = !enabled;
    volumeControl.classList.toggle('disabled', !enabled);
    progressBar.classList.toggle('disabled', !enabled);
}

// --- Repeat & volume state (persisted between visits) ---
const REPEAT_MODES = ['off', 'all', 'one'];
const ICON_REPEAT = 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z';
const ICON_REPEAT_ONE = 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z';
const ICON_VOL_HIGH = 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z';
const ICON_VOL_LOW = 'M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z';
const ICON_VOL_MUTED = 'M3 9v6h4l5 5V4L7 9H3zm13.59 3l2.7-2.7-1.41-1.41-2.7 2.7-2.7-2.7-1.41 1.41 2.7 2.7-2.7 2.7 1.41 1.41 2.7-2.7 2.7 2.7 1.41-1.41-2.7-2.7z';

let repeatMode = REPEAT_MODES.includes(readStored('eon-repeat-mode', 'off'))
    ? readStored('eon-repeat-mode', 'off')
    : 'off';

const storedVolume = parseInt(readStored('eon-volume', '70'), 10);
let volumeLevel = Number.isFinite(storedVolume) ? Math.min(Math.max(storedVolume, 0), 100) : 70;
let isMuted = readStored('eon-muted', 'false') === 'true';

function applyRepeatMode() {
    repeatIcon.innerHTML = `<path d="${repeatMode === 'one' ? ICON_REPEAT_ONE : ICON_REPEAT}"/>`;
    repeatBtn.classList.toggle('mode-active', repeatMode !== 'off');

    const label = repeatMode === 'all' ? 'Repeat playlist'
        : repeatMode === 'one' ? 'Repeat track'
        : 'Repeat off';
    repeatBtn.title = label;
    repeatBtn.setAttribute('aria-label', label);

    // Let YouTube loop the queue itself for "repeat all"; "repeat one"
    // is handled manually on the ENDED event so the queue never advances.
    if (player && typeof player.setLoop === 'function') {
        player.setLoop(repeatMode === 'all');
    }
}

function cycleRepeatMode() {
    repeatMode = REPEAT_MODES[(REPEAT_MODES.indexOf(repeatMode) + 1) % REPEAT_MODES.length];
    writeStored('eon-repeat-mode', repeatMode);
    applyRepeatMode();
}

function applyVolume() {
    const effective = isMuted ? 0 : volumeLevel;

    volumeSlider.value = effective;
    volumeSlider.style.background =
        `linear-gradient(to right, #fff ${effective}%, rgba(255,255,255,0.25) ${effective}%)`;

    const icon = effective === 0 ? ICON_VOL_MUTED : effective < 50 ? ICON_VOL_LOW : ICON_VOL_HIGH;
    volumeIcon.innerHTML = `<path d="${icon}"/>`;
    volumeBtn.title = isMuted ? 'Unmute' : `Mute (volume ${effective}%)`;
    volumeBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
    volumeBtn.setAttribute('aria-pressed', isMuted);

    if (player && typeof player.setVolume === 'function') {
        player.setVolume(volumeLevel);
        if (isMuted) {
            player.mute();
        } else {
            player.unMute();
        }
    }
}

function persistVolume() {
    writeStored('eon-volume', volumeLevel);
    writeStored('eon-muted', isMuted);
}

volumeSlider.addEventListener('input', () => {
    const value = parseInt(volumeSlider.value, 10);
    isMuted = value === 0;
    // Keep the last audible level so unmuting returns to it.
    if (!isMuted) volumeLevel = value;
    persistVolume();
    applyVolume();
});

volumeBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (!isMuted && volumeLevel === 0) volumeLevel = 50;
    persistVolume();
    applyVolume();
});

repeatBtn.addEventListener('click', cycleRepeatMode);

applyRepeatMode();
applyVolume();

window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
    player = new YT.Player('yt-player-container', {
        height: '1',
        width: '1',
        playerVars: {
            'listType': 'playlist',
            'list': PLAYLIST_ID,
            'controls': 0,
            'disablekb': 1,
            'autoplay': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerError(event) {
    console.error("YouTube Player Error Code:", event.data);

    if (player && typeof player.getPlaylistIndex === 'function') {
        const badIndex = player.getPlaylistIndex();
        const badSidebarItem = document.getElementById(`sidebar-track-${badIndex}`);

        if (badSidebarItem) {
            badSidebarItem.classList.add('restricted');
            const titleDiv = badSidebarItem.querySelector('.track-item-title');
            if (titleDiv) titleDiv.textContent = '⚠️ Unavailable (Blocked by Artist)';
        }
    }

    // Bug fix #1: guard against overlapping skip calls when multiple
    // consecutive tracks are blocked (each onError firing its own
    // timer used to race the others and could skip past good tracks,
    // or loop forever if the whole playlist was blocked).
    if (skipInProgress) return;
    skipInProgress = true;

    consecutiveErrors++;
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        trackTitle.textContent = "No playable tracks found";
        trackArtist.textContent = "This playlist may be fully restricted";
        setControlsEnabled(false);
        skipInProgress = false;
        return;
    }

    trackTitle.textContent = "Skipping unavailable track…";

    setTimeout(() => {
        if (player && typeof player.nextVideo === 'function') {
            player.nextVideo();
        }
        // Release the guard once the resulting state/error event has
        // had a chance to fire, rather than immediately.
        setTimeout(() => { skipInProgress = false; }, 300);
    }, 800);
}

function updateMediaMetadata() {
    if (player && player.getVideoData && typeof player.getVideoData === 'function') {
        const videoData = player.getVideoData();
        if (videoData && videoData.title) {
            trackTitle.textContent = videoData.title;
            consecutiveErrors = 0; // a track loaded successfully, reset the safety counter
        }
        if (videoData && videoData.author) {
            trackArtist.textContent = videoData.author;
        }
        if (videoData && videoData.video_id) {
            albumArt.innerHTML = `<img src="https://img.youtube.com/vi/${videoData.video_id}/hqdefault.jpg" alt="Album Art">`;
            albumArt.style.background = 'none';
        }
    }
    highlightCurrentSidebarTrack();
}

function onPlayerReady(event) {
    playerIsReady = true;
    setControlsEnabled(true);

    // Push the restored volume / repeat preferences into the player
    // now that its API methods actually exist.
    applyVolume();
    applyRepeatMode();

    // NOTE: shuffle intentionally NOT enabled. YouTube's
    // setShuffle(true) reorders the *live playback queue* internally,
    // but getPlaylist() / playVideoAt(index) address tracks by their
    // position in the original (unshuffled) list. That mismatch is
    // what caused clicking a sidebar track to play a different song
    // than the one clicked. Keeping natural order keeps sidebar
    // indices and actual playback perfectly in sync.

    // Bug fix #3: instead of guessing with nested setTimeouts, poll
    // briefly until video data actually shows up, then sync the UI.
    waitForVideoDataThenSync();

    playBtn.addEventListener('click', () => {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    });

    nextBtn.addEventListener('click', () => player.nextVideo());
    prevBtn.addEventListener('click', () => player.previousVideo());

    progressBar.addEventListener('click', (e) => {
        // Bug fix #4: give feedback / no-op cleanly instead of silently
        // failing when there's no duration yet (nothing loaded/playing).
        if (!player || !player.getDuration) return;
        const duration = player.getDuration();
        if (!duration || duration <= 0) return;

        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.min(Math.max(clickX / rect.width, 0), 1);
        const seekTime = percentage * duration;
        player.seekTo(seekTime, true);
        updateProgressBar();
    });
}

function waitForVideoDataThenSync(attempt = 0) {
    const videoData = player && player.getVideoData ? player.getVideoData() : null;
    if (videoData && videoData.title) {
        updateMediaMetadata();
        return;
    }
    if (attempt >= 15) { // ~4.5s of polling, then give up quietly
        updateMediaMetadata();
        return;
    }
    setTimeout(() => waitForVideoDataThenSync(attempt + 1), 300);
}

// --- 4. Sidebar Functional Logic ---
function openSidebar() {
    playlistSidebar.classList.add('open');
    sidebarScrim.classList.add('visible');
    loadPlaylistSidebar();
}

function closeSidebar() {
    playlistSidebar.classList.remove('open');
    sidebarScrim.classList.remove('visible');
}

playlistBtn.addEventListener('click', openSidebar);
closeSidebarBtn.addEventListener('click', closeSidebar);
sidebarScrim.addEventListener('click', closeSidebar);

function loadPlaylistSidebar() {
    // Bug fix #2: if the player/playlist wasn't ready the first time
    // the sidebar was opened, retry instead of permanently no-op'ing.
    if (playlistTracksLoaded) return;

    if (!player || !player.getPlaylist) {
        sidebarTracks.innerHTML = '<div class="loading-text">Loading playlist…</div>';
        setTimeout(loadPlaylistSidebar, 400);
        return;
    }

    const trackIDs = player.getPlaylist();
    if (!trackIDs || trackIDs.length === 0) {
        sidebarTracks.innerHTML = '<div class="loading-text">Loading playlist…</div>';
        setTimeout(loadPlaylistSidebar, 400);
        return;
    }

    sidebarTracks.innerHTML = '';

    trackIDs.forEach((id, index) => {
        const trackEl = document.createElement('div');
        trackEl.className = 'track-item';
        trackEl.id = `sidebar-track-${index}`;

        trackEl.onclick = () => {
            if (trackEl.classList.contains('restricted')) return;
            // Safe because shuffle is disabled: getPlaylist() order,
            // getPlaylistIndex(), and playVideoAt(index) all agree on
            // the same natural order. Re-enabling shuffle would break
            // this (see note in onPlayerReady).
            player.playVideoAt(index);
        };

        trackEl.innerHTML = `
            <img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="thumbnail">
            <div class="track-item-info">
                <div class="track-item-title" id="sidebar-title-${index}">Fetching track…</div>
                <div class="track-item-artist" id="sidebar-author-${index}">YouTube Music</div>
            </div>
            <svg class="track-item-playing-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
        sidebarTracks.appendChild(trackEl);

        fetchOembedWithRetry(id, index);
    });

    playlistTracksLoaded = true;
    highlightCurrentSidebarTrack();
}

// Bug fix #7: retry once on failure/timeout instead of leaving the
// row stuck on "Fetching track…" forever, and guard against
// duplicate in-flight requests for the same track.
function fetchOembedWithRetry(id, index, attempt = 0) {
    const key = `${id}:${index}`;
    if (attempt === 0) {
        if (oembedRequested.has(key)) return;
        oembedRequested.add(key);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
        signal: controller.signal
    })
        .then(res => {
            if (!res.ok) throw new Error('oembed request failed');
            return res.json();
        })
        .then(data => {
            clearTimeout(timeoutId);
            const titleEl = document.getElementById(`sidebar-title-${index}`);
            const authorEl = document.getElementById(`sidebar-author-${index}`);
            if (titleEl) titleEl.textContent = data.title;
            if (authorEl && data.author_name) authorEl.textContent = data.author_name;
        })
        .catch(() => {
            clearTimeout(timeoutId);
            if (attempt < 1) {
                setTimeout(() => fetchOembedWithRetry(id, index, attempt + 1), 1000);
            } else {
                const titleEl = document.getElementById(`sidebar-title-${index}`);
                if (titleEl) titleEl.textContent = `Track ${index + 1}`;
            }
        });
}

function highlightCurrentSidebarTrack() {
    if (!playlistTracksLoaded || !player || typeof player.getPlaylistIndex !== 'function') return;
    const currentIndex = player.getPlaylistIndex();

    const allTracks = document.querySelectorAll('.track-item');
    allTracks.forEach((el, index) => {
        if (index === currentIndex) {
            el.classList.add('active');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            el.classList.remove('active');
        }
    });
}

// --- 5. Player State Handling & Dynamic SVG Swap ---
function onPlayerStateChange(event) {
    updateMediaMetadata();

    if (event.data === YT.PlayerState.PLAYING) {
        playPauseIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        // Bug fix #5: always clear any existing interval before
        // starting a new one, in case PLAYING fires twice in a row
        // (e.g. after a brief buffering blip) without an
        // intervening PAUSED/ENDED state.
        clearInterval(progressInterval);
        updateProgressBar();
        progressInterval = setInterval(updateProgressBar, 500);
    }
    else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.CUED) {
        playPauseIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        clearInterval(progressInterval);
        progressInterval = null;
    }
    else if (event.data === YT.PlayerState.ENDED) {
        clearInterval(progressInterval);
        progressInterval = null;

        if (repeatMode === 'one' && player && typeof player.seekTo === 'function') {
            player.seekTo(0, true);
            player.playVideo();
            return;
        }

        playPauseIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
}

function updateProgressBar() {
    if (player && player.getCurrentTime) {
        const currentSeconds = player.getCurrentTime();
        const totalSeconds = player.getDuration();

        if (totalSeconds > 0) {
            const percentage = (currentSeconds / totalSeconds) * 100;
            progressFill.style.width = percentage + '%';
            progressThumb.style.left = percentage + '%';

            currentTimeDisplay.textContent = formatTime(currentSeconds);
            totalTimeDisplay.textContent = formatTime(totalSeconds);
        }
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// Bug fix #6: surface a clearer state if the API script itself never
// loads at all (e.g. blocked by network policy) rather than leaving
// "Loading track…" forever with no explanation.
setTimeout(() => {
    if (!playerIsReady) {
        trackTitle.textContent = "Still connecting…";
        trackArtist.textContent = "Tap play once it's ready";
    }
}, 8000);
