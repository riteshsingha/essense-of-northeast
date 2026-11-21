// ==========================================================================
// ESSENCE OF NORTHEAST — APPLICATION CONTROLLER
// Ambient Radio • Procedural Nature Soundscapes • Studio Mode • Favorites
// ==========================================================================

// --- 1. Preference Storage Helper ---
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
    } catch (e) { /* Storage unavailable (private mode or iframe restrictions) */ }
}

// --- 2. Toast Notification System ---
let toastTimeout = null;
const toastEl = document.getElementById('app-toast');

function showToast(message, duration = 2800) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('visible');
    }, duration);
}

// --- 3. Live Clock Widget ---
function updateLiveTime() {
    const timeDisplay = document.getElementById('live-time');
    const dateDisplay = document.getElementById('live-date');
    const phaseIcon = document.getElementById('phase-icon');
    const phaseLabel = document.getElementById('phase-label');
    const now = new Date();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    if (timeDisplay) timeDisplay.textContent = `${hours}:${minutes} ${ampm}`;

    if (dateDisplay) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('en-US', options);
    }

    const isNight = now.getHours() >= 18 || now.getHours() < 6;
    if (phaseIcon) phaseIcon.textContent = isNight ? '🌙' : '☀️';
    if (phaseLabel) phaseLabel.textContent = isNight ? 'Night' : 'Day';
}
setInterval(updateLiveTime, 1000);
updateLiveTime();

// --- 4. Theme & Atmosphere System (Light / Dark Scenic Backgrounds) ---
const THEME_KEY = 'eon-theme';
const THEME_MODE_KEY = 'eon-theme-mode'; // 'auto' | 'manual'
const THEME_COLORS = { light: '#12151c', dark: '#07080c' };
const themeToggle = document.getElementById('theme-toggle');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const darkSchemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const atmoBtnDay = document.getElementById('atmo-btn-day');
const atmoBtnNight = document.getElementById('atmo-btn-night');
const atmoBtnAuto = document.getElementById('atmo-btn-auto');
const atmoBadge = document.getElementById('current-phase-badge');

let atmoMode = readStored(THEME_MODE_KEY, 'auto');

function getAutoTheme() {
    const hour = new Date().getHours();
    return (hour >= 18 || hour < 6) ? 'dark' : 'light';
}

function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function updateAtmoPills(theme, mode) {
    if (atmoBtnDay) atmoBtnDay.classList.toggle('active', mode === 'manual' && theme === 'light');
    if (atmoBtnNight) atmoBtnNight.classList.toggle('active', mode === 'manual' && theme === 'dark');
    if (atmoBtnAuto) atmoBtnAuto.classList.toggle('active', mode === 'auto');
    if (atmoBadge) {
        atmoBadge.textContent = mode === 'auto'
            ? `Auto (${theme === 'dark' ? 'Night' : 'Day'})`
            : `${theme === 'dark' ? 'Night' : 'Day'}`;
    }
}

function applyTheme(theme, mode = atmoMode) {
    atmoMode = mode;
    writeStored(THEME_MODE_KEY, mode);
    writeStored(THEME_KEY, theme);

    document.documentElement.setAttribute('data-theme', theme);
    if (themeColorMeta) themeColorMeta.setAttribute('content', THEME_COLORS[theme]);

    const label = theme === 'dark' ? 'Switch to daylight mode [T]' : 'Switch to night mode [T]';
    if (themeToggle) {
        themeToggle.setAttribute('aria-label', label);
        themeToggle.setAttribute('aria-pressed', theme === 'dark');
        themeToggle.title = label;
    }

    updateAtmoPills(theme, mode);
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next, 'manual');
        showToast(next === 'dark' ? '🌙 Night atmosphere enabled' : '☀️ Daylight atmosphere enabled');
    });
}

if (atmoBtnDay) {
    atmoBtnDay.addEventListener('click', () => {
        applyTheme('light', 'manual');
        showToast('☀️ Daylight atmosphere enabled');
    });
}

if (atmoBtnNight) {
    atmoBtnNight.addEventListener('click', () => {
        applyTheme('dark', 'manual');
        showToast('🌙 Night atmosphere enabled');
    });
}

if (atmoBtnAuto) {
    atmoBtnAuto.addEventListener('click', () => {
        const autoTheme = getAutoTheme();
        applyTheme(autoTheme, 'auto');
        showToast(`⏱️ Auto atmosphere synced (${autoTheme === 'dark' ? 'Night' : 'Day'})`);
    });
}

if (darkSchemeQuery) {
    const onSchemeChange = (e) => {
        if (atmoMode === 'auto') {
            applyTheme(e.matches ? 'dark' : 'light', 'auto');
        }
    };
    if (typeof darkSchemeQuery.addEventListener === 'function') {
        darkSchemeQuery.addEventListener('change', onSchemeChange);
    } else if (typeof darkSchemeQuery.addListener === 'function') {
        darkSchemeQuery.addListener(onSchemeChange);
    }
}

// Initial theme application
const initialTheme = (atmoMode === 'auto')
    ? getAutoTheme()
    : (readStored(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark');
applyTheme(initialTheme, atmoMode);

// --- 5. Weather Particle Canvas Initialization ---
const weatherCanvas = document.getElementById('weather-canvas');
if (weatherCanvas && window.ambientEngine) {
    window.ambientEngine.initCanvas(weatherCanvas);
}

// --- 6. Zen Mode (Wallpaper Immersion Focus) ---
const zenBtn = document.getElementById('zen-btn');
const zenExitBtn = document.getElementById('zen-exit-btn');

function toggleZenMode(enable) {
    const shouldEnable = enable !== undefined ? enable : !document.body.classList.contains('zen-mode');
    document.body.classList.toggle('zen-mode', shouldEnable);
    if (zenBtn) zenBtn.setAttribute('aria-pressed', shouldEnable);

    if (shouldEnable) {
        closeAllPanels();
        showToast('Zen Mode active • Press Z or Esc to exit', 3200);
    } else {
        showToast('UI restored');
    }
}

if (zenBtn) zenBtn.addEventListener('click', () => toggleZenMode());
if (zenExitBtn) zenExitBtn.addEventListener('click', () => toggleZenMode(false));

// --- 7. Sleep Timer System ---
const sleepTimerBtn = document.getElementById('sleep-timer-btn');
const sleepTimerLabel = document.getElementById('sleep-timer-label');
const sleepTimerMenu = document.getElementById('sleep-timer-menu');
const timerOptions = document.querySelectorAll('.timer-opt');

let sleepTimerInterval = null;
let sleepTimeRemaining = 0; // seconds

function toggleSleepTimerMenu(force) {
    if (!sleepTimerMenu) return;
    const isOpen = force !== undefined ? force : !sleepTimerMenu.classList.contains('open');
    sleepTimerMenu.classList.toggle('open', isOpen);
    if (sleepTimerBtn) sleepTimerBtn.setAttribute('aria-expanded', isOpen);
}

if (sleepTimerBtn) {
    sleepTimerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSleepTimerMenu();
    });
}

document.addEventListener('click', (e) => {
    if (sleepTimerMenu && !sleepTimerMenu.contains(e.target) && e.target !== sleepTimerBtn) {
        toggleSleepTimerMenu(false);
    }
});

timerOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        const minutes = parseInt(opt.getAttribute('data-minutes'), 10);
        timerOptions.forEach(o => o.classList.toggle('active', o === opt));
        setSleepTimer(minutes);
        toggleSleepTimerMenu(false);
    });
});

function setSleepTimer(minutes) {
    clearInterval(sleepTimerInterval);
    if (minutes <= 0) {
        sleepTimeRemaining = 0;
        if (sleepTimerLabel) sleepTimerLabel.textContent = 'Timer';
        if (sleepTimerBtn) sleepTimerBtn.classList.remove('active');
        showToast('Sleep timer turned off');
        return;
    }

    sleepTimeRemaining = minutes * 60;
    if (sleepTimerBtn) sleepTimerBtn.classList.add('active');
    updateSleepTimerBadge();
    showToast(`Sleep timer set for ${minutes} minutes`);

    sleepTimerInterval = setInterval(() => {
        sleepTimeRemaining--;
        if (sleepTimeRemaining <= 0) {
            clearInterval(sleepTimerInterval);
            triggerSleepTimerShutdown();
        } else {
            updateSleepTimerBadge();
        }
    }, 1000);
}

function updateSleepTimerBadge() {
    if (!sleepTimerLabel) return;
    const m = Math.ceil(sleepTimeRemaining / 60);
    sleepTimerLabel.textContent = `${m}m`;
}

function triggerSleepTimerShutdown() {
    if (sleepTimerBtn) sleepTimerBtn.classList.remove('active');
    if (sleepTimerLabel) sleepTimerLabel.textContent = 'Timer';
    timerOptions.forEach(o => o.classList.toggle('active', o.getAttribute('data-minutes') === '0'));

    showToast('Sleep timer ended — goodnight 🌙', 4000);
    if (player && typeof player.pauseVideo === 'function') {
        player.pauseVideo();
    }
}

// --- 8. Side Panels & Drawers Management ---
const sidebarScrim = document.getElementById('sidebar-scrim');
const playlistSidebar = document.getElementById('playlist-sidebar');
const playlistBtn = document.getElementById('playlist-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');

const soundscapeBtn = document.getElementById('soundscape-btn');
const soundscapePanel = document.getElementById('soundscape-panel');
const closeSoundscapeBtn = document.getElementById('close-soundscape-btn');

const exploreBtn = document.getElementById('explore-btn');
const explorePanel = document.getElementById('explore-panel');
const closeExploreBtn = document.getElementById('close-explore-btn');

const shortcutsBtn = document.getElementById('shortcuts-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');
const closeShortcutsBtn = document.getElementById('close-shortcuts-btn');

const studioView = document.getElementById('studio-view');
const studioExpandBtn = document.getElementById('studio-expand-btn');
const closeStudioBtn = document.getElementById('close-studio-btn');
const brandPill = document.getElementById('brand-pill');
const albumArtDeck = document.getElementById('album-art-deck');

function closeAllPanels() {
    if (playlistSidebar) playlistSidebar.classList.remove('open');
    if (soundscapePanel) soundscapePanel.classList.remove('open');
    if (explorePanel) explorePanel.classList.remove('open');
    if (shortcutsModal) shortcutsModal.classList.remove('open');
    if (sidebarScrim) sidebarScrim.classList.remove('visible');
    if (playlistBtn) playlistBtn.setAttribute('aria-expanded', 'false');
}

function openPanel(panelEl) {
    closeAllPanels();
    if (!panelEl) return;
    panelEl.classList.add('open');
    if (sidebarScrim) sidebarScrim.classList.add('visible');
}

if (playlistBtn) {
    playlistBtn.addEventListener('click', () => {
        if (playlistSidebar && playlistSidebar.classList.contains('open')) {
            closeAllPanels();
        } else {
            openPanel(playlistSidebar);
            loadPlaylistSidebar();
        }
    });
}
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeAllPanels);

if (soundscapeBtn) {
    soundscapeBtn.addEventListener('click', () => {
        if (soundscapePanel && soundscapePanel.classList.contains('open')) {
            closeAllPanels();
        } else {
            openPanel(soundscapePanel);
        }
    });
}
if (closeSoundscapeBtn) closeSoundscapeBtn.addEventListener('click', closeAllPanels);

if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
        if (explorePanel && explorePanel.classList.contains('open')) {
            closeAllPanels();
        } else {
            openPanel(explorePanel);
        }
    });
}
if (closeExploreBtn) closeExploreBtn.addEventListener('click', closeAllPanels);

if (shortcutsBtn) shortcutsBtn.addEventListener('click', () => openPanel(shortcutsModal));
if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', closeAllPanels);

if (sidebarScrim) sidebarScrim.addEventListener('click', closeAllPanels);

// Studio Mode Open/Close
function toggleStudioView(open) {
    if (!studioView) return;
    const shouldOpen = open !== undefined ? open : !studioView.classList.contains('open');
    studioView.classList.toggle('open', shouldOpen);
    studioView.setAttribute('aria-hidden', !shouldOpen);
    if (shouldOpen) {
        closeAllPanels();
        updateStudioViewUI();
    }
}

if (studioExpandBtn) studioExpandBtn.addEventListener('click', () => toggleStudioView(true));
if (albumArtDeck) albumArtDeck.addEventListener('click', () => toggleStudioView(true));
if (brandPill) brandPill.addEventListener('click', () => toggleStudioView(true));
if (closeStudioBtn) closeStudioBtn.addEventListener('click', () => toggleStudioView(false));

// --- 9. Nature Soundscapes & Weather Handlers ---
const soundFaders = ['rain', 'fire', 'stream', 'crickets'];

soundFaders.forEach(type => {
    const fader = document.getElementById(`fader-${type}`);
    const valDisplay = document.getElementById(`val-${type}`);
    if (fader) {
        fader.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (valDisplay) valDisplay.textContent = `${val}%`;
            if (window.ambientEngine) {
                window.ambientEngine.setSoundVolume(type, val);
            }
        });
    }
});

// Monastery Bell Chime
const monasteryBellBtn = document.getElementById('monastery-bell-btn');
if (monasteryBellBtn) {
    monasteryBellBtn.addEventListener('click', () => {
        if (window.ambientEngine) {
            window.ambientEngine.playMonasteryBowl();
            showToast('Tawang Monastery chime resonant');
        }
    });
}

// Weather Effect Pills
const weatherPills = document.querySelectorAll('.weather-pill');
weatherPills.forEach(pill => {
    pill.addEventListener('click', () => {
        const effect = pill.getAttribute('data-weather');
        weatherPills.forEach(p => p.classList.toggle('active', p === pill));
        if (window.ambientEngine) {
            window.ambientEngine.setWeatherEffect(effect);
            showToast(`Atmosphere: ${pill.textContent}`);
        }
    });
});

// --- 10. Favorites System (localStorage) ---
const FAVORITES_KEY = 'eon-favorites';
let favoriteTrackIds = new Set(JSON.parse(readStored(FAVORITES_KEY, '[]')));

function isTrackFavorited(id) {
    return favoriteTrackIds.has(id);
}

function toggleFavoriteCurrentTrack() {
    if (!player || !player.getVideoData) return;
    const videoData = player.getVideoData();
    if (!videoData || !videoData.video_id) return;

    const id = videoData.video_id;
    if (favoriteTrackIds.has(id)) {
        favoriteTrackIds.delete(id);
        showToast('Removed from favorites');
    } else {
        favoriteTrackIds.add(id);
        showToast('Added to ❤️ Favorites');
    }

    writeStored(FAVORITES_KEY, JSON.stringify(Array.from(favoriteTrackIds)));
    updateFavoriteButtonsState();
    updateFavoritesBadgeCount();
}

function updateFavoriteButtonsState() {
    const likeBtn = document.getElementById('like-btn');
    const studioLikeBtn = document.getElementById('studio-like-btn');
    if (!player || !player.getVideoData) return;
    const videoData = player.getVideoData();
    const isFav = videoData && videoData.video_id && isTrackFavorited(videoData.video_id);

    if (likeBtn) likeBtn.classList.toggle('active', isFav);
    if (studioLikeBtn) studioLikeBtn.classList.toggle('active', isFav);
}

function updateFavoritesBadgeCount() {
    const favCount = document.getElementById('fav-count');
    if (favCount) favCount.textContent = favoriteTrackIds.size;
}

const likeBtn = document.getElementById('like-btn');
const studioLikeBtn = document.getElementById('studio-like-btn');
if (likeBtn) likeBtn.addEventListener('click', toggleFavoriteCurrentTrack);
if (studioLikeBtn) studioLikeBtn.addEventListener('click', toggleFavoriteCurrentTrack);

updateFavoritesBadgeCount();

// --- 11. YouTube Player & Playback Orchestration ---
const PLAYLIST_ID = 'PLW6pHGnTx70o';

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
tag.onerror = () => {
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    if (trackTitle) trackTitle.textContent = "Unable to connect to stream";
    if (trackArtist) trackArtist.textContent = "Please check connection & reload";
};
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player = null;
let progressInterval = null;
let playlistTracksLoaded = false;
let playerIsReady = false;
let skipInProgress = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 10;
const oembedRequested = new Set();
let cachedPlaylistData = [];
let queueTabMode = 'all'; // 'all' | 'fav'

// DOM Elements
const playBtn = document.getElementById('play-pause-btn');
const playPauseIcon = document.getElementById('play-pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const trackIndexBadge = document.getElementById('track-index-badge');
const albumArt = document.getElementById('album-art');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressThumb = document.getElementById('progress-thumb');
const progressTooltip = document.getElementById('progress-tooltip');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');
const repeatBtn = document.getElementById('repeat-btn');
const repeatIcon = document.getElementById('repeat-icon');
const shuffleBtn = document.getElementById('shuffle-btn');
const shuffleIcon = document.getElementById('shuffle-icon');
const volumeControl = document.getElementById('volume-control');
const volumeBtn = document.getElementById('volume-btn');
const volumeIcon = document.getElementById('volume-icon');
const volumeSlider = document.getElementById('volume-slider');
const volumeTooltip = document.getElementById('volume-tooltip');
const headerTrackCount = document.getElementById('header-track-count');
const sidebarCount = document.getElementById('sidebar-count');
const sidebarTracks = document.getElementById('sidebar-tracks');
const playlistSearch = document.getElementById('playlist-search');
const searchClearBtn = document.getElementById('search-clear-btn');
const jumpToActiveBtn = document.getElementById('jump-to-active-btn');

// Studio View Elements
const studioAlbumArt = document.getElementById('studio-album-art');
const studioTitle = document.getElementById('studio-title');
const studioArtist = document.getElementById('studio-artist');
const studioCurrentTime = document.getElementById('studio-current-time');
const studioTotalTime = document.getElementById('studio-total-time');
const studioProgressBar = document.getElementById('studio-progress-bar');
const studioProgressFill = document.getElementById('studio-progress-fill');
const studioProgressThumb = document.getElementById('studio-progress-thumb');
const studioPlayBtn = document.getElementById('studio-play-btn');
const studioPlayIcon = document.getElementById('studio-play-icon');
const studioPrevBtn = document.getElementById('studio-prev-btn');
const studioNextBtn = document.getElementById('studio-next-btn');
const studioRepeatBtn = document.getElementById('studio-repeat-btn');
const studioRepeatIcon = document.getElementById('studio-repeat-icon');
const studioShuffleBtn = document.getElementById('studio-shuffle-btn');
const studioShuffleIcon = document.getElementById('studio-shuffle-icon');

function setControlsEnabled(enabled) {
    if (playBtn) playBtn.disabled = !enabled;
    if (prevBtn) prevBtn.disabled = !enabled;
    if (nextBtn) nextBtn.disabled = !enabled;
    if (repeatBtn) repeatBtn.disabled = !enabled;
    if (shuffleBtn) shuffleBtn.disabled = !enabled;
    if (studioShuffleBtn) studioShuffleBtn.disabled = !enabled;
    if (volumeBtn) volumeBtn.disabled = !enabled;
    if (volumeSlider) volumeSlider.disabled = !enabled;
    if (volumeControl) volumeControl.classList.toggle('disabled', !enabled);
    if (progressBar) progressBar.classList.toggle('disabled', !enabled);
}

// --- 12. Repeat & Volume Configuration ---
const REPEAT_MODES = ['off', 'all', 'one'];
const SVG_REPEAT = '<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>';
const SVG_REPEAT_ONE = '<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><text x="12" y="15" font-size="8" font-weight="bold" fill="currentColor" text-anchor="middle">1</text>';

const SVG_VOL_HIGH = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
const SVG_VOL_LOW = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
const SVG_VOL_MUTED = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';

let repeatMode = REPEAT_MODES.includes(readStored('eon-repeat-mode', 'off'))
    ? readStored('eon-repeat-mode', 'off')
    : 'off';

const storedVolume = parseInt(readStored('eon-volume', '70'), 10);
let volumeLevel = Number.isFinite(storedVolume) ? Math.min(Math.max(storedVolume, 0), 100) : 70;
let isMuted = readStored('eon-muted', 'false') === 'true';

function applyRepeatMode() {
    if (repeatIcon) repeatIcon.innerHTML = repeatMode === 'one' ? SVG_REPEAT_ONE : SVG_REPEAT;
    if (repeatBtn) repeatBtn.classList.toggle('mode-active', repeatMode !== 'off');

    if (studioRepeatIcon) studioRepeatIcon.innerHTML = repeatMode === 'one' ? SVG_REPEAT_ONE : SVG_REPEAT;
    if (studioRepeatBtn) studioRepeatBtn.classList.toggle('mode-active', repeatMode !== 'off');

    const label = repeatMode === 'all' ? 'Repeat queue [R]'
        : repeatMode === 'one' ? 'Repeat track [R]'
        : 'Repeat off [R]';
    if (repeatBtn) {
        repeatBtn.title = label;
        repeatBtn.setAttribute('aria-label', label);
    }

    if (player && typeof player.setLoop === 'function') {
        player.setLoop(repeatMode === 'all');
    }
}

function cycleRepeatMode() {
    repeatMode = REPEAT_MODES[(REPEAT_MODES.indexOf(repeatMode) + 1) % REPEAT_MODES.length];
    writeStored('eon-repeat-mode', repeatMode);
    applyRepeatMode();
    const modeName = repeatMode === 'all' ? 'Repeat Queue' : repeatMode === 'one' ? 'Repeat Track' : 'Repeat Off';
    showToast(modeName);
}

// --- 12b. Shuffle Mode System ---
let isShuffleOn = readStored('eon-shuffle', 'false') === 'true';

function applyShuffleState() {
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('mode-active', isShuffleOn);
        shuffleBtn.setAttribute('aria-pressed', isShuffleOn ? 'true' : 'false');
        const label = isShuffleOn ? 'Shuffle on [U]' : 'Shuffle off [U]';
        shuffleBtn.title = label;
        shuffleBtn.setAttribute('aria-label', label);
    }
    if (studioShuffleBtn) {
        studioShuffleBtn.classList.toggle('mode-active', isShuffleOn);
        studioShuffleBtn.setAttribute('aria-pressed', isShuffleOn ? 'true' : 'false');
        const label = isShuffleOn ? 'Shuffle on' : 'Shuffle off';
        studioShuffleBtn.title = label;
        studioShuffleBtn.setAttribute('aria-label', label);
    }
    if (player && typeof player.setShuffle === 'function') {
        try { player.setShuffle(isShuffleOn); } catch (e) { /* ignore */ }
    }
}

function toggleShuffle() {
    isShuffleOn = !isShuffleOn;
    writeStored('eon-shuffle', isShuffleOn ? 'true' : 'false');
    applyShuffleState();
    showToast(isShuffleOn ? '🔀 Shuffle On' : '➡️ Shuffle Off');
}

function playNextTrack() {
    if (!player) return;
    if (isShuffleOn && cachedPlaylistData.length > 1) {
        const curIndex = (typeof player.getPlaylistIndex === 'function') ? player.getPlaylistIndex() : -1;
        let nextIndex;
        let attempts = 0;
        do {
            nextIndex = Math.floor(Math.random() * cachedPlaylistData.length);
            attempts++;
        } while (nextIndex === curIndex && attempts < 10);
        player.playVideoAt(nextIndex);
    } else {
        player.nextVideo();
    }
}

function playPrevTrack() {
    if (!player) return;
    player.previousVideo();
}

if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
if (studioShuffleBtn) studioShuffleBtn.addEventListener('click', toggleShuffle);

function applyVolume() {
    const effective = isMuted ? 0 : volumeLevel;

    if (volumeSlider) {
        volumeSlider.value = effective;
        volumeSlider.style.background =
            `linear-gradient(to right, var(--accent) ${effective}%, rgba(255,255,255,0.2) ${effective}%)`;
    }

    if (volumeTooltip) {
        volumeTooltip.textContent = `${effective}%`;
    }

    if (volumeIcon) {
        volumeIcon.innerHTML = effective === 0 ? SVG_VOL_MUTED : effective < 50 ? SVG_VOL_LOW : SVG_VOL_HIGH;
    }

    if (volumeBtn) {
        volumeBtn.title = isMuted ? 'Unmute [M]' : `Mute (${effective}%) [M]`;
        volumeBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
        volumeBtn.setAttribute('aria-pressed', isMuted);
    }

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

if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
        const val = parseInt(volumeSlider.value, 10);
        isMuted = val === 0;
        if (!isMuted) volumeLevel = val;
        persistVolume();
        applyVolume();
    });
}

if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        if (!isMuted && volumeLevel === 0) volumeLevel = 50;
        persistVolume();
        applyVolume();
        showToast(isMuted ? 'Audio muted' : `Volume: ${volumeLevel}%`);
    });
}

if (repeatBtn) repeatBtn.addEventListener('click', cycleRepeatMode);
if (studioRepeatBtn) studioRepeatBtn.addEventListener('click', cycleRepeatMode);

applyRepeatMode();
applyVolume();

// --- 13. YouTube IFrame API Initialization ---
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
};

function onPlayerReady() {
    playerIsReady = true;
    setControlsEnabled(true);
    applyVolume();
    applyRepeatMode();
    applyShuffleState();

    // Check URL parameters for direct track share e.g. ?track=4
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTrack = parseInt(urlParams.get('track'), 10);
    if (Number.isInteger(sharedTrack) && sharedTrack >= 1) {
        setTimeout(() => {
            if (player && typeof player.playVideoAt === 'function') {
                player.playVideoAt(sharedTrack - 1);
                showToast(`Playing shared Track ${sharedTrack}`);
            }
        }, 800);
    }

    waitForVideoDataThenSync();

    const togglePlay = () => {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    };

    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (studioPlayBtn) studioPlayBtn.addEventListener('click', togglePlay);

    if (nextBtn) nextBtn.addEventListener('click', playNextTrack);
    if (studioNextBtn) studioNextBtn.addEventListener('click', playNextTrack);

    if (prevBtn) prevBtn.addEventListener('click', playPrevTrack);
    if (studioPrevBtn) studioPrevBtn.addEventListener('click', playPrevTrack);

    // Scrubber click seek
    const handleSeek = (e, barEl) => {
        if (!player || !player.getDuration) return;
        const duration = player.getDuration();
        if (!duration || duration <= 0) return;

        const rect = barEl.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.min(Math.max(clickX / rect.width, 0), 1);
        const seekTime = percentage * duration;
        player.seekTo(seekTime, true);
        updateProgressBar();
    };

    if (progressBar) {
        progressBar.addEventListener('click', (e) => handleSeek(e, progressBar));

        progressBar.addEventListener('mousemove', (e) => {
            if (!player || !player.getDuration || !progressTooltip) return;
            const duration = player.getDuration();
            if (!duration || duration <= 0) return;

            const rect = progressBar.getBoundingClientRect();
            const hoverX = e.clientX - rect.left;
            const percentage = Math.min(Math.max(hoverX / rect.width, 0), 1);
            const hoverSeconds = percentage * duration;

            progressTooltip.textContent = formatTime(hoverSeconds);
            progressTooltip.style.left = `${hoverX}px`;
            progressTooltip.classList.add('visible');
        });

        progressBar.addEventListener('mouseleave', () => {
            if (progressTooltip) progressTooltip.classList.remove('visible');
        });
    }

    if (studioProgressBar) {
        studioProgressBar.addEventListener('click', (e) => handleSeek(e, studioProgressBar));
    }
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

    if (skipInProgress) return;
    skipInProgress = true;
    consecutiveErrors++;

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        if (trackTitle) trackTitle.textContent = "No playable tracks found";
        if (trackArtist) trackArtist.textContent = "Playlist is restricted in this region";
        setControlsEnabled(false);
        skipInProgress = false;
        return;
    }

    if (trackTitle) trackTitle.textContent = "Skipping restricted track…";

    setTimeout(() => {
        if (player && typeof player.nextVideo === 'function') {
            player.nextVideo();
        }
        setTimeout(() => { skipInProgress = false; }, 350);
    }, 800);
}

function updateMediaMetadata() {
    if (!player || !player.getVideoData || typeof player.getVideoData !== 'function') return;
    const videoData = player.getVideoData();
    const playlist = typeof player.getPlaylist === 'function' ? player.getPlaylist() : [];
    const currentIndex = typeof player.getPlaylistIndex === 'function' ? player.getPlaylistIndex() : -1;

    if (videoData && videoData.title) {
        if (trackTitle) trackTitle.textContent = videoData.title;
        if (studioTitle) studioTitle.textContent = videoData.title;
        consecutiveErrors = 0;
    }

    if (videoData && videoData.author) {
        if (trackArtist) trackArtist.textContent = videoData.author;
        if (studioArtist) studioArtist.textContent = videoData.author;
    }

    if (trackIndexBadge && playlist && playlist.length > 0 && currentIndex >= 0) {
        trackIndexBadge.textContent = `${currentIndex + 1}/${playlist.length}`;
    }

    if (headerTrackCount && playlist && playlist.length > 0) {
        headerTrackCount.textContent = `${playlist.length}`;
    }

    if (sidebarCount && playlist && playlist.length > 0) {
        sidebarCount.textContent = `${playlist.length} Tracks`;
    }

    if (videoData && videoData.video_id) {
        const thumbUrl = `https://img.youtube.com/vi/${videoData.video_id}/hqdefault.jpg`;
        const imgTag = `<img src="${thumbUrl}" alt="${videoData.title || 'Album Art'}">`;
        if (albumArt) albumArt.innerHTML = imgTag;
        if (studioAlbumArt) studioAlbumArt.innerHTML = imgTag;
    }

    updateFavoriteButtonsState();
    highlightCurrentSidebarTrack();
}

function updateStudioViewUI() {
    updateMediaMetadata();
    updateProgressBar();
}

function waitForVideoDataThenSync(attempt = 0) {
    const videoData = player && player.getVideoData ? player.getVideoData() : null;
    if (videoData && videoData.title) {
        updateMediaMetadata();
        return;
    }
    if (attempt >= 16) {
        updateMediaMetadata();
        return;
    }
    setTimeout(() => waitForVideoDataThenSync(attempt + 1), 300);
}

// --- 14. Player State & Visualizer Sync ---
function onPlayerStateChange(event) {
    updateMediaMetadata();

    const pauseIcons = '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>';
    const playIcons = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';

    if (event.data === YT.PlayerState.PLAYING) {
        document.body.classList.add('is-playing');
        if (playPauseIcon) playPauseIcon.innerHTML = pauseIcons;
        if (studioPlayIcon) studioPlayIcon.innerHTML = pauseIcons;

        clearInterval(progressInterval);
        updateProgressBar();
        progressInterval = setInterval(updateProgressBar, 500);
    }
    else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.CUED) {
        document.body.classList.remove('is-playing');
        if (playPauseIcon) playPauseIcon.innerHTML = playIcons;
        if (studioPlayIcon) studioPlayIcon.innerHTML = playIcons;

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

        if (isShuffleOn) {
            playNextTrack();
            return;
        }

        document.body.classList.remove('is-playing');
        if (playPauseIcon) playPauseIcon.innerHTML = playIcons;
        if (studioPlayIcon) studioPlayIcon.innerHTML = playIcons;
    }
}

function updateProgressBar() {
    if (!player || !player.getCurrentTime) return;
    const currentSeconds = player.getCurrentTime();
    const totalSeconds = player.getDuration();

    if (totalSeconds > 0) {
        const percentage = (currentSeconds / totalSeconds) * 100;
        const curFormatted = formatTime(currentSeconds);
        const totFormatted = formatTime(totalSeconds);

        if (progressFill) progressFill.style.width = percentage + '%';
        if (progressThumb) progressThumb.style.left = percentage + '%';

        if (studioProgressFill) studioProgressFill.style.width = percentage + '%';
        if (studioProgressThumb) studioProgressThumb.style.left = percentage + '%';

        if (currentTimeDisplay) currentTimeDisplay.textContent = curFormatted;
        if (totalTimeDisplay) totalTimeDisplay.textContent = totFormatted;

        if (studioCurrentTime) studioCurrentTime.textContent = curFormatted;
        if (studioTotalTime) studioTotalTime.textContent = totFormatted;

        if (progressBar) {
            progressBar.setAttribute('aria-valuenow', Math.round(percentage));
            progressBar.setAttribute('aria-valuetext', `${curFormatted} of ${totFormatted}`);
        }
    }
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// --- 15. Playlist Drawer & Filter Architecture ---
function loadPlaylistSidebar() {
    if (playlistTracksLoaded) {
        renderFilteredQueue();
        highlightCurrentSidebarTrack();
        return;
    }

    if (!player || !player.getPlaylist) {
        setTimeout(loadPlaylistSidebar, 350);
        return;
    }

    const trackIDs = player.getPlaylist();
    if (!trackIDs || trackIDs.length === 0) {
        setTimeout(loadPlaylistSidebar, 350);
        return;
    }

    if (sidebarTracks) sidebarTracks.innerHTML = '';
    cachedPlaylistData = [];

    trackIDs.forEach((id, index) => {
        const itemObj = {
            id,
            index,
            title: `Track ${index + 1}`,
            artist: 'YouTube Music'
        };
        cachedPlaylistData.push(itemObj);

        const trackEl = document.createElement('div');
        trackEl.className = 'track-item';
        trackEl.id = `sidebar-track-${index}`;
        trackEl.setAttribute('role', 'listitem');
        trackEl.setAttribute('tabindex', '0');

        trackEl.addEventListener('click', () => {
            if (trackEl.classList.contains('restricted')) return;
            player.playVideoAt(index);
        });

        trackEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trackEl.click();
            }
        });

        const formattedNum = (index + 1).toString().padStart(2, '0');

        trackEl.innerHTML = `
            <span class="track-item-num">${formattedNum}</span>
            <img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="Thumbnail" loading="lazy">
            <div class="track-item-info">
                <div class="track-item-title" id="sidebar-title-${index}">Loading title…</div>
                <div class="track-item-artist" id="sidebar-author-${index}">YouTube Music</div>
            </div>
            <div class="track-item-playing-icon" aria-hidden="true">
                <span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span>
            </div>
        `;

        if (sidebarTracks) sidebarTracks.appendChild(trackEl);
        fetchOembedWithRetry(id, index);
    });

    playlistTracksLoaded = true;
    if (sidebarCount) sidebarCount.textContent = `${trackIDs.length} Tracks`;
    if (headerTrackCount) headerTrackCount.textContent = `${trackIDs.length}`;
    highlightCurrentSidebarTrack();
}

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
            if (!res.ok) throw new Error('oEmbed error');
            return res.json();
        })
        .then(data => {
            clearTimeout(timeoutId);
            const titleEl = document.getElementById(`sidebar-title-${index}`);
            const authorEl = document.getElementById(`sidebar-author-${index}`);
            if (titleEl && data.title) {
                titleEl.textContent = data.title;
                if (cachedPlaylistData[index]) cachedPlaylistData[index].title = data.title;
            }
            if (authorEl && data.author_name) {
                authorEl.textContent = data.author_name;
                if (cachedPlaylistData[index]) cachedPlaylistData[index].artist = data.author_name;
            }
        })
        .catch(() => {
            clearTimeout(timeoutId);
            if (attempt < 1) {
                setTimeout(() => fetchOembedWithRetry(id, index, attempt + 1), 1000);
            } else {
                const titleEl = document.getElementById(`sidebar-title-${index}`);
                if (titleEl) titleEl.textContent = `Northeast Track ${index + 1}`;
            }
        });
}

// Queue Tabs (All vs Favorites)
const tabAllTracks = document.getElementById('tab-all-tracks');
const tabFavTracks = document.getElementById('tab-fav-tracks');

if (tabAllTracks) {
    tabAllTracks.addEventListener('click', () => {
        queueTabMode = 'all';
        tabAllTracks.classList.add('active');
        if (tabFavTracks) tabFavTracks.classList.remove('active');
        renderFilteredQueue();
    });
}

if (tabFavTracks) {
    tabFavTracks.addEventListener('click', () => {
        queueTabMode = 'fav';
        tabFavTracks.classList.add('active');
        if (tabAllTracks) tabAllTracks.classList.remove('active');
        renderFilteredQueue();
    });
}

function renderFilteredQueue() {
    const query = playlistSearch ? playlistSearch.value.trim().toLowerCase() : '';
    const allTrackElements = document.querySelectorAll('.track-item');
    let matchedCount = 0;

    allTrackElements.forEach((el, index) => {
        const data = cachedPlaylistData[index];
        const id = data ? data.id : null;
        const title = data ? data.title.toLowerCase() : el.querySelector('.track-item-title').textContent.toLowerCase();
        const artist = data ? data.artist.toLowerCase() : el.querySelector('.track-item-artist').textContent.toLowerCase();

        const matchesQuery = !query || title.includes(query) || artist.includes(query);
        const matchesTab = queueTabMode === 'all' || (id && isTrackFavorited(id));

        const visible = matchesQuery && matchesTab;
        el.style.display = visible ? 'flex' : 'none';
        if (visible) matchedCount++;
    });

    if (sidebarCount) {
        sidebarCount.textContent = queueTabMode === 'fav'
            ? `${matchedCount} Favorite${matchedCount === 1 ? '' : 's'}`
            : `${matchedCount} of ${cachedPlaylistData.length} Tracks`;
    }
}

if (playlistSearch) {
    playlistSearch.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (searchClearBtn) searchClearBtn.classList.toggle('visible', query.length > 0);
        renderFilteredQueue();
    });
}

if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
        if (playlistSearch) {
            playlistSearch.value = '';
            playlistSearch.dispatchEvent(new Event('input'));
            playlistSearch.focus();
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

// Jump to Currently Playing Button in Sidebar
if (jumpToActiveBtn) {
    jumpToActiveBtn.addEventListener('click', () => {
        const activeItem = document.querySelector('.track-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

if (sidebarTracks) {
    sidebarTracks.addEventListener('scroll', () => {
        const activeItem = document.querySelector('.track-item.active');
        if (!activeItem || !jumpToActiveBtn) return;
        const rect = activeItem.getBoundingClientRect();
        const containerRect = sidebarTracks.getBoundingClientRect();
        const isOffscreen = rect.bottom < containerRect.top || rect.top > containerRect.bottom;
        jumpToActiveBtn.classList.toggle('visible', isOffscreen);
    });
}

// --- 16. Global Keyboard Shortcuts Handler ---
window.addEventListener('keydown', (e) => {
    // Ignore keyboard shortcuts when typing in inputs
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') {
            document.activeElement.blur();
        }
        return;
    }

    switch (e.key) {
        case ' ': // Space: Play/Pause
            e.preventDefault();
            if (playBtn && !playBtn.disabled) playBtn.click();
            break;

        case 'ArrowLeft': // Left Arrow: Seek backward 5s
            e.preventDefault();
            if (player && typeof player.getCurrentTime === 'function' && typeof player.seekTo === 'function') {
                const cur = player.getCurrentTime();
                player.seekTo(Math.max(cur - 5, 0), true);
                updateProgressBar();
                showToast(`-5s (${formatTime(Math.max(cur - 5, 0))})`);
            }
            break;

        case 'ArrowRight': // Right Arrow: Seek forward 5s
            e.preventDefault();
            if (player && typeof player.getCurrentTime === 'function' && typeof player.seekTo === 'function') {
                const cur = player.getCurrentTime();
                const dur = player.getDuration();
                player.seekTo(Math.min(cur + 5, dur), true);
                updateProgressBar();
                showToast(`+5s (${formatTime(Math.min(cur + 5, dur))})`);
            }
            break;

        case 'ArrowUp': // Up Arrow: Volume up 5%
            e.preventDefault();
            volumeLevel = Math.min(volumeLevel + 5, 100);
            isMuted = false;
            persistVolume();
            applyVolume();
            showToast(`Volume: ${volumeLevel}%`);
            break;

        case 'ArrowDown': // Down Arrow: Volume down 5%
            e.preventDefault();
            volumeLevel = Math.max(volumeLevel - 5, 0);
            if (volumeLevel === 0) isMuted = true;
            persistVolume();
            applyVolume();
            showToast(`Volume: ${volumeLevel}%`);
            break;

        case 'm':
        case 'M': // M: Mute toggle
            e.preventDefault();
            if (volumeBtn && !volumeBtn.disabled) volumeBtn.click();
            break;

        case 'p':
        case 'P': // P: Playlist toggle
            e.preventDefault();
            if (playlistSidebar && playlistSidebar.classList.contains('open')) {
                closeAllPanels();
            } else {
                openPanel(playlistSidebar);
                loadPlaylistSidebar();
            }
            break;

        case 'l':
        case 'L': // L: Like / Favorite song
            e.preventDefault();
            toggleFavoriteCurrentTrack();
            break;

        case 's':
        case 'S': // S: Soundscape panel
            e.preventDefault();
            if (soundscapePanel && soundscapePanel.classList.contains('open')) {
                closeAllPanels();
            } else {
                openPanel(soundscapePanel);
            }
            break;

        case 'e':
        case 'E': // E: Explore panel
            e.preventDefault();
            if (explorePanel && explorePanel.classList.contains('open')) {
                closeAllPanels();
            } else {
                openPanel(explorePanel);
            }
            break;

        case 'Enter': // Enter: Toggle Studio View
            e.preventDefault();
            toggleStudioView();
            break;

        case 'r':
        case 'R': // R: Repeat mode cycle
            e.preventDefault();
            cycleRepeatMode();
            break;

        case 'u':
        case 'U': // U: Toggle Shuffle mode
            e.preventDefault();
            toggleShuffle();
            break;

        case 't':
        case 'T': // T: Theme toggle
            e.preventDefault();
            if (themeToggle) themeToggle.click();
            break;

        case 'z':
        case 'Z': // Z: Zen mode toggle
            e.preventDefault();
            toggleZenMode();
            break;

        case '?': // ?: Shortcuts help
            e.preventDefault();
            openPanel(shortcutsModal);
            break;

        case 'Escape': // Escape: Close modals / drawers / Studio / Zen
            if (studioView && studioView.classList.contains('open')) {
                toggleStudioView(false);
            } else if (shortcutsModal && shortcutsModal.classList.contains('open')) {
                closeAllPanels();
            } else if (playlistSidebar && playlistSidebar.classList.contains('open')) {
                closeAllPanels();
            } else if (soundscapePanel && soundscapePanel.classList.contains('open')) {
                closeAllPanels();
            } else if (explorePanel && explorePanel.classList.contains('open')) {
                closeAllPanels();
            } else if (document.body.classList.contains('zen-mode')) {
                toggleZenMode(false);
            }
            break;
    }
});

// Fallback message if YouTube API fails to connect after 8s
setTimeout(() => {
    if (!playerIsReady && trackTitle) {
        trackTitle.textContent = "Connecting to audio stream…";
        if (trackArtist) trackArtist.textContent = "Tap play once ready";
    }
}, 8000);
