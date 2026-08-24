(function () {
  'use strict';

  var FAVORITES_ID = 'favorites';
  var MAX_FAVORITES = 20;

  var GENRES = [
    { id: 'rock', label: 'ROCK', tag: 'rock' },
    { id: 'metal', label: 'METAL', tag: 'metal' },
    { id: 'gothic', label: 'GOTHIC', tag: 'gothic' },
    { id: 'synthwave', label: 'SYNTHWAVE', tag: 'synthwave' },
    { id: 'alternative', label: 'ALTERNATIVE', tag: 'alternative rock' },
    { id: FAVORITES_ID, label: '★ FAVORITES', tag: null }
  ];

  var API_BASE = 'https://de1.api.radio-browser.info';
  var STATIONS_PER_GENRE = 8;
  var FAVORITES_KEY = 'rockstation_favorites';

  // Stations to skip when fetched from the API (case-insensitive exact name match).
  // "all" applies to every genre; a genre id applies only to that genre's list.
  var EXCLUDED_STATIONS = {
    all: { 'power pop': true },
    metal: {
      'antyradio': true,
      'epic rock radio': true,
      'rockfm.ru heavy': true,
      'begoodradio.com 80s metal': true,
      'bollocks rock & metal radio': true,
      'megarock radio 320k': true,
      // Broad/eclectic stations where "metal" is a minor tag among unrelated genres
      // (student radio, generic rock mix) rather than the station's actual focus.
      'distorsión fm': true,
      '- 0 n - rock on radio': true,
      'radio sar - studencka agencja radiowa': true,
      'rock antenne gothic': true, // keep this crossover station only in GOTHIC, not METAL
      // Generic white-label "classic rock" stream (rebroadcast via an aggregator site) —
      // "metal" is just one of 3 loosely-applied tags, not the actual content focus.
      'rock fm classic rock': true,
      'rock & folk (rock n folk)': true,
      'rock fm': true // Lithuanian station is fine, but "Metal Only" (next candidate) is a tighter thematic fit
    },
    gothic: {
      'rock antenne - gothic': true,
      '80s forever - we keep the 80s alive': true,
      'rockantenne  gothic': true // duplicate mount of "Rock Antenne Gothic" (same stream URL)
    },
    rock: {
      'радио maximum': true,
      'best of rock.fm alternative rock': true,
      'somafm left coast 70s (320k mp3)': true,
      'retro rádió': true,
      'metal rock radio': true,
      // Mostly pop-leaning despite the "rock" tag; deprioritized in favor of tighter fits.
      'radio oxígeno': true,
      'rtbf classic 21': true
    },
    // Removed: tagged "synthwave" but it's a minor tag among many unrelated genres
    // (dnb/edm/jazz/reggae/etc) rather than the station's actual focus.
    synthwave: {
      'dnb&edm': true,
      'neu radio': true,
      'highfi dream': true,
      'yumi co. radio': true,
      'xraydio 1 – your kaleidoscope of sounds': true,
      'radio paweł': true
    },
    alternative: {
      // Sprawling tag soup / off-genre mixes, not a focused alternative-rock fit.
      'alternativa by mix (iheart radio) - online - acir online / iheart radio - ciudad de méxico': true,
      'radio rosak': true,
      '__countryhits.fm__ by rautemusik (rm.fm)': true,
      'caspian business radio boss': true
    }
  };
  // Prefix matches (case-insensitive) to exclude an entire family of stations from a genre.
  var EXCLUDED_PREFIXES = {
    gothic: ['drgnu']
  };
  // Per-genre cap overriding STATIONS_PER_GENRE — used when excluded stations should
  // shrink the list instead of being backfilled by the next-ranked station.
  var STATIONS_LIMIT_OVERRIDES = {
    metal: 10,
    rock: 8,
    synthwave: 3,
    gothic: 10,
    alternative: 10
  };
  // Manual logo overrides for stations whose API-provided favicon URL 404s or is empty.
  var ART_OVERRIDES = {
    'nightride fm': 'https://nightride.fm/apple-touch-icon.png',
    'flatlines radio': 'https://flatlinesradio.de/images/152x152/25239909/Copilot_20260429_183222-wR-lYtj-LfEZYP4_rIW88Q-ilZjehTgSe-dkkog3pgsJg.png',
    'bkk.fm': 'https://bkk.fm/favicon.ico',
    "181.fm - kickin' country": 'https://cdn-profiles.tunein.com/s51095/images/logoq.jpg',
    'exclusively pink floyd': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Dark_Side_of_the_Moon.png/330px-Dark_Side_of_the_Moon.png',
    'exclusively the cure': 'https://upload.wikimedia.org/wikipedia/en/b/b8/CureDisintegration.jpg',
    'exclusively nirvana': 'https://upload.wikimedia.org/wikipedia/en/b/b7/NirvanaNevermindalbumcover.jpg',
    'metal rock radio': 'https://cdn-radiotime-logos.tunein.com/s221762q.png',
    "181.fm - 80's hairband": 'https://cdn-radiotime-logos.tunein.com/s90443q.png',
    'bons tempos fm': 'https://files.cdn-files-a.com/uploads/11554423/800_6a5e7fdb7487d.png?aspect_ratio=1:1&width=180&format=png',
    'nightwave plaza': 'https://plaza.one/icons/apple-touch-icon.png',
    '89 a radio rock': 'https://cdn-profiles.tunein.com/s85089/images/logoq.jpg',
    'easy fm 972': 'https://cdn-profiles.tunein.com/s291260/images/logoq.jpg',
    'zeppelin 106.7': 'https://www.ertecho.gr/wp-content/uploads/2025/07/zeppelin-logo.svg',
    'badrock hard & heavy': 'https://badrockradio.net/wp-content/themes/proradio-child/img/badrock_app_icon.jpg',
    'arrow classic rock': 'https://cdn-profiles.tunein.com/s6702/images/logoq.jpg',
    'metal invasion radio': 'https://metal-invasion.fr/wp-content/uploads/2017/05/cropped-Banniere-Final-metal-invasion.fr_-180x180.png',
    'rtbf classic 21 - metal': '', // API's favicon is just RTBF's generic ".be" network mark — fall back to initials
    '- 0 n - heavy metal on radio': 'https://www.0nradio.com/logos/0n-heavy-metal_600x600.jpg', // API's logo URL 404s (moved to a hyphenated path)
    'darkclub-radio': 'https://assets.laut.fm/1ac2d8e0f0d8422f317c846320b26095?t=_640x640',
    'htd radio - hit the dark': 'https://assets.laut.fm/690f30baad8e535edc35f34e7f33f4d3?t=_640x640',
    'blackspot': 'https://assets.laut.fm/8d9f22ff4a079f4c24f6197b9507fe46?t=_640x640',
    'odinsmetalrockclub': 'https://assets.laut.fm/e6f90a7647f78471583ad48c6ad9cff8?t=_640x640',
    'khasandria': 'https://assets.laut.fm/9bb8cd37e19408cd17e7240666e68bac?t=_640x640',
    '8radio': 'https://8radio.com/wp-content/uploads/2016/06/cropped-8RadioLogoUpdateJune2016-2-e1467023293153-180x180.jpg',
    'nightride fm - darksynth': 'https://nightride.fm/apple-touch-icon.png',
    'nightride fm - horrorsynth': 'https://nightride.fm/apple-touch-icon.png',
    'magic city radio wata-db': 'https://magiccity.radio/wp-content/uploads/2025/03/6-370x370.png',
    'sanctuary radio (retro 80s channel)': 'https://cdn-radiotime-logos.tunein.com/s121324q.png',
    'palmera blanca radio - daystream': 'https://palmerablanca.com/cover.png',
    'esoterica radio s5': 'https://esoterica.live/images/favicon.ico',
    'metal only - http://www.metal-only.de,metal only - http://www.metal-only.de - 24h black death heavy metal rock und mehr!': 'https://www.metal-only.de/fileadmin/media/og-metal-only.gif'
  };
  // Logos that are mostly text/wordmarks — shrink to fit instead of cropping to fill the circle.
  var ART_CONTAIN_FIT = {
    'metal rock radio': true,
    'radio 1 rock': true,
    'z-rock radio': true,
    'zeppelin 106.7': true,
    'htd radio - hit the dark': true,
    'palmera blanca radio - daystream': true,
    'metal only - http://www.metal-only.de,metal only - http://www.metal-only.de - 24h black death heavy metal rock und mehr!': true
  };
  // Logos that are dark artwork on a transparent background — need a light backing plate
  // instead of blending into the dark player card.
  var ART_LIGHT_BG = {
    'zeppelin 106.7': true
  };
  // Manual stream URL overrides for stations whose API-listed url_resolved is stale
  // (e.g. plays a "we've moved" announcement instead of the actual station).
  var STREAM_URL_OVERRIDES = {
    'badrock hard & heavy': 'https://streams.badrockradio.net/hard-heavy'
  };
  // Stations added by hand (missing from the API results, or only available over http://
  // there but with a working https:// endpoint found directly on the station's own site).
  var EXTRA_STATIONS = {
    rock: [
      {
        name: 'Radio 1 Rock',
        url: 'https://play.global.audio/radio1rockhi.aac',
        art: 'https://www.radio1rock.bg/theme_assets/radio1rock/images/logo.png',
        country: 'BG',
        bitrate: 128
      },
      {
        name: 'Z-Rock radio',
        url: 'https://streamer2.atlantis.bg:8443/zrocknew',
        art: 'https://zrockradio.bg/wp-content/uploads/2017/08/zrock_logo.png',
        country: 'BG',
        bitrate: 128
      }
    ],
    synthwave: [
      {
        name: 'Night Drive Radio – Synthwave & Retrowave',
        url: 'https://a5.asurahosting.com:7920/radio.mp3',
        art: 'https://yt3.googleusercontent.com/34Wzf2EzGTFeW99VHr9Jz6Yh5RngxvKUSDxWF_NJe5cTcTr8XEXCEd3Pf5j2S29mNjIUEfib=s900-c-k-c0x00ffffff-no-rj',
        country: 'DE',
        bitrate: 192
      },
      {
        name: 'Atomicwave FM',
        url: 'https://atomicwavefm.stream.laut.fm/atomicwavefm',
        art: 'https://assets.laut.fm/75ba3d39e80147363879b0e69654cc4b?t=_120x120',
        country: 'DE',
        bitrate: 128
      },
      {
        name: 'Nightride FM - Darksynth',
        url: 'https://stream.nightride.fm/darksynth.mp3',
        art: 'https://nightride.fm/apple-touch-icon.png',
        country: 'DE',
        bitrate: 128
      },
      {
        name: 'Nightride FM - Horrorsynth',
        url: 'https://stream.nightride.fm/horrorsynth.mp3',
        art: 'https://nightride.fm/apple-touch-icon.png',
        country: 'DE',
        bitrate: 128
      },
      {
        name: 'Magic City Radio WATA-DB',
        url: 'https://cast6.my-control-panel.com/proxy/magiccityradio/stream',
        art: 'https://magiccity.radio/wp-content/uploads/2025/03/6-370x370.png',
        country: 'US',
        bitrate: 128
      },
      {
        name: 'Sanctuary Radio (Retro 80s Channel)',
        url: 'https://patmos.cdnstream.com/proxy/sanctua1?mp=/stream2',
        art: 'https://cdn-radiotime-logos.tunein.com/s121324q.png',
        country: 'US',
        bitrate: 192
      },
      {
        name: 'Palmera Blanca radio - Daystream',
        url: 'https://daystream.palmerablanca.com/daystream-128.mp3',
        art: 'https://palmerablanca.com/cover.png',
        country: 'KZ',
        bitrate: 128
      },
      {
        name: 'Esoterica Radio S5',
        url: 'https://esoterica.servemp3.com:444/listen/synthwave_electronicrock/radio.mp3',
        art: 'https://esoterica.live/images/favicon.ico',
        country: 'BA',
        bitrate: 128
      }
    ]
  };
  function isExcluded(genreId, nameLower) {
    if ((EXCLUDED_STATIONS.all && EXCLUDED_STATIONS.all[nameLower]) ||
      (EXCLUDED_STATIONS[genreId] && EXCLUDED_STATIONS[genreId][nameLower])) return true;
    var prefixes = EXCLUDED_PREFIXES[genreId];
    if (prefixes) {
      for (var i = 0; i < prefixes.length; i++) {
        if (nameLower.indexOf(prefixes[i]) === 0) return true;
      }
    }
    return false;
  }

  var state = {
    genre: 'rock',
    stationsByGenre: {},   // id -> array of {name, url}
    selectedByGenre: {},   // id -> station name
    favorites: loadFavorites(), // array of station objects, kept in sync with localStorage
    playing: false,
    error: false,
    volume: 0.7,
    autoSkipCount: 0
  };
  state.stationsByGenre[FAVORITES_ID] = state.favorites;
  if (state.favorites.length) state.selectedByGenre[FAVORITES_ID] = state.favorites[0].name;

  var els = {
    genreTabs: document.getElementById('genre-tabs'),
    artRing: document.getElementById('art-ring'),
    artImg: document.getElementById('art-img'),
    artFallback: document.getElementById('art-fallback'),
    onAir: document.getElementById('on-air'),
    stationName: document.getElementById('lcd-station'),
    stationSub: document.getElementById('lcd-genre'),
    playBtn: document.getElementById('play-btn'),
    playIcon: document.getElementById('play-icon'),
    stopIcon: document.getElementById('stop-icon'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    player: document.getElementById('player'),
    volumeRange: document.getElementById('volume-range'),
    logGenre: document.getElementById('log-genre'),
    stationFlankLeft: document.getElementById('stations-flank-left'),
    stationFlankRight: document.getElementById('stations-flank-right'),
    stationMeta: document.getElementById('station-meta'),
    favoriteBtn: document.getElementById('favorite-btn'),
    shareBtn: document.getElementById('share-btn'),
    shareIcon: document.getElementById('share-icon'),
    checkIcon: document.getElementById('check-icon')
  };

  var BRAND_ICON_HTML = els.artFallback.innerHTML;

  // ---------- Favorites (localStorage) ----------

  function favKey(s) { return s.uuid || s.url; }

  function loadFavorites() {
    try {
      var raw = localStorage.getItem(FAVORITES_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites() {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites)); } catch (e) {}
  }

  function isFavorite(station) {
    if (!station) return false;
    var key = favKey(station);
    for (var i = 0; i < state.favorites.length; i++) if (favKey(state.favorites[i]) === key) return true;
    return false;
  }

  function toggleFavorite(station) {
    if (!station) return;
    var key = favKey(station);
    var idx = -1;
    for (var i = 0; i < state.favorites.length; i++) if (favKey(state.favorites[i]) === key) { idx = i; break; }
    if (idx >= 0) state.favorites.splice(idx, 1);
    else if (state.favorites.length < MAX_FAVORITES) state.favorites.push(station);
    else return;
    state.stationsByGenre[FAVORITES_ID] = state.favorites;
    saveFavorites();
    render();
  }

  function starSvg(filled) {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="' + (filled ? '#ffcf4d' : 'none') +
      '" stroke="#ffcf4d" stroke-width="2"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.6z"/></svg>';
  }

  function findGenre(id) {
    for (var i = 0; i < GENRES.length; i++) if (GENRES[i].id === id) return GENRES[i];
    return GENRES[0];
  }

  // ---------- Per-station fallback avatar (used when a station has no logo/favicon) ----------

  function hashHue(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    return hash % 360;
  }

  function initialsFor(name) {
    var words = name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }

  function renderArtFallback(station) {
    if (!station) {
      els.artFallback.innerHTML = BRAND_ICON_HTML;
      els.artFallback.style.background = '';
      return;
    }
    var hue = hashHue(station.name);
    els.artFallback.style.background = 'linear-gradient(160deg, hsl(' + hue + ',60%,42%), hsl(' + hue + ',60%,24%))';
    els.artFallback.innerHTML = '';
    var span = document.createElement('span');
    span.className = 'initials';
    span.textContent = initialsFor(displayName(station.name));
    els.artFallback.appendChild(span);
  }

  // Display-only cleanup for a few station names (localized script, stray
  // callsign prefixes, …); the underlying name (used for matching/state) is untouched.
  var NAME_OVERRIDES = {
    'Радио Maximum': 'Radio Maximum',
    '- 0 N - Classic Rock on Radio': 'Classic Rock on Radio',
    'Retro Rádió': 'Retro Radio',
    'METAL ONLY - http://www.metal-only.de,METAL ONLY - http://www.metal-only.de - 24h Black Death Heavy Metal Rock und mehr!': 'Metal Only',
    'metal rock radio': 'Metal rock radio'
  };
  var BITRATE_SUFFIX = /\s*\(\s*\d+\s*k(?:bps)?\s*(?:mp3|aac\+?|ogg|flac|wma)\s*\)\s*$/i;
  function displayName(name) {
    var mapped = NAME_OVERRIDES[name] || name;
    return mapped.replace(BITRATE_SUFFIX, '').trim();
  }

  // ---------- Country flag / name + bitrate line ----------

  var regionNames = (typeof Intl !== 'undefined' && Intl.DisplayNames)
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

  function countryName(code) {
    if (!code) return '';
    try {
      return (regionNames && regionNames.of(code.toUpperCase())) || code.toUpperCase();
    } catch (e) {
      return code.toUpperCase();
    }
  }

  function renderStationMeta(station) {
    els.stationMeta.innerHTML = '';
    if (!station) return;

    var cc = (station.country || '').trim();
    if (cc && cc.length === 2 && /^[A-Za-z]{2}$/.test(cc)) {
      var flag = document.createElement('img');
      flag.className = 'flag-icon';
      flag.alt = '';
      flag.width = 16;
      flag.height = 12;
      flag.src = 'https://flagcdn.com/' + cc.toLowerCase() + '.svg';
      flag.addEventListener('error', function () { flag.style.display = 'none'; });
      els.stationMeta.appendChild(flag);
      els.stationMeta.appendChild(document.createTextNode(countryName(cc)));
    }
    if (station.bitrate > 0) {
      if (els.stationMeta.childNodes.length) {
        els.stationMeta.appendChild(document.createTextNode(' · '));
      }
      els.stationMeta.appendChild(document.createTextNode(station.bitrate + ' kbps'));
    }
  }

  // ---------- Radio Browser API ----------

  function fetchStationsForGenre(genre) {
    var url = API_BASE + '/json/stations/bytagexact/' + encodeURIComponent(genre.tag) +
      '?limit=100&hidebroken=true&order=votes&reverse=true';
    return fetch(url, { headers: { 'User-Agent': 'RockStation/1.0' } })
      .then(function (res) {
        if (!res.ok) throw new Error('API error ' + res.status);
        return res.json();
      })
      .then(function (list) {
        var limit = STATIONS_LIMIT_OVERRIDES[genre.id] || STATIONS_PER_GENRE;
        var seen = {};
        var picked = [];
        for (var i = 0; i < list.length && picked.length < limit; i++) {
          var s = list[i];
          var streamUrl = s.url_resolved || s.url;
          if (!streamUrl || streamUrl.indexOf('https://') !== 0) continue;
          var name = (s.name || '').trim();
          if (!name || seen[name.toLowerCase()] || isExcluded(genre.id, name.toLowerCase())) continue;
          seen[name.toLowerCase()] = true;
          streamUrl = STREAM_URL_OVERRIDES[name.toLowerCase()] || streamUrl;
          var favicon = (s.favicon || '').trim();
          var nameLower = name.toLowerCase();
          var art = (nameLower in ART_OVERRIDES) ? ART_OVERRIDES[nameLower] : (favicon.indexOf('http') === 0 ? favicon : '');
          picked.push({
            name: name,
            url: streamUrl,
            uuid: s.stationuuid,
            art: art,
            country: (s.countrycode || '').trim(),
            bitrate: s.bitrate || 0
          });
        }
        var extras = EXTRA_STATIONS[genre.id] || [];
        for (var j = 0; j < extras.length; j++) {
          var extra = extras[j];
          if (seen[extra.name.toLowerCase()]) continue;
          seen[extra.name.toLowerCase()] = true;
          picked.push(extra);
        }
        return picked;
      })
      .catch(function (err) {
        console.error('Failed to load stations for', genre.id, err);
        return [];
      });
  }

  function loadGenre(id) {
    if (state.stationsByGenre[id]) return Promise.resolve(state.stationsByGenre[id]);
    var genre = findGenre(id);
    return fetchStationsForGenre(genre).then(function (stations) {
      state.stationsByGenre[id] = stations;
      if (stations.length && !state.selectedByGenre[id]) {
        state.selectedByGenre[id] = stations[0].name;
      }
      return stations;
    });
  }

  // ---------- Rendering ----------

  function render() {
    renderGenreTabs();
    renderNowPlaying();
    renderStationLog();
  }

  function renderGenreTabs() {
    els.genreTabs.innerHTML = '';
    GENRES.forEach(function (g) {
      var btn = document.createElement('button');
      btn.className = 'genre-tab' + (g.id === state.genre ? ' active' : '');
      btn.textContent = g.label;
      btn.addEventListener('click', function () { tuneGenre(g.id); });
      els.genreTabs.appendChild(btn);
    });
  }

  function renderNowPlaying() {
    var g = findGenre(state.genre);
    var stations = state.stationsByGenre[state.genre];
    var current = currentStation();
    var station = current ? current.name : null;

    if (!stations) {
      els.stationName.textContent = 'TUNING IN…';
      els.stationSub.textContent = g.label;
      document.title = 'RockStation — Your Station. Your Rock.';
    } else if (!station) {
      if (state.genre === FAVORITES_ID) {
        els.stationName.textContent = 'NO FAVORITES YET';
        els.stationSub.textContent = 'TAP ☆ ON A STATION';
      } else {
        els.stationName.textContent = 'NO STATION FOUND';
        els.stationSub.textContent = g.label + ' · TRY ANOTHER GENRE';
      }
      document.title = 'RockStation — Your Station. Your Rock.';
    } else {
      els.stationName.textContent = displayName(station);
      if (state.playing) {
        els.stationSub.textContent = g.label + ' · LIVE STREAM';
      } else if (state.error) {
        els.stationSub.textContent = g.label + ' · STREAM UNAVAILABLE';
      } else {
        els.stationSub.textContent = g.label + ' · PRESS PLAY';
      }
      document.title = displayName(station) + ' · RockStation';
    }

    els.onAir.textContent = state.playing ? 'ON AIR' : 'STANDBY';
    els.onAir.classList.toggle('live', state.playing);
    els.artRing.classList.toggle('playing', state.playing);
    els.playIcon.style.display = state.playing ? 'none' : '';
    els.stopIcon.style.display = state.playing ? '' : 'none';

    renderStationMeta(current);
    updateMediaSession(current);

    var fav = isFavorite(current);
    els.favoriteBtn.classList.toggle('active', fav);
    els.favoriteBtn.setAttribute('aria-pressed', fav ? 'true' : 'false');
    els.favoriteBtn.style.visibility = current ? 'visible' : 'hidden';

    updateHash();

    var artUrl = current ? current.art : '';
    if (artUrl && artUrl !== els.artImg.dataset.loaded) {
      els.artImg.dataset.loaded = artUrl;
      els.artImg.src = artUrl;
    }
    els.artImg.classList.toggle('art-img--contain', !!(current && ART_CONTAIN_FIT[current.name.toLowerCase()]));
    els.artImg.classList.toggle('art-img--light-bg', !!(current && ART_LIGHT_BG[current.name.toLowerCase()]));
    if (artUrl) {
      els.artImg.style.display = '';
      els.artFallback.style.display = 'none';
    } else {
      els.artImg.style.display = 'none';
      els.artFallback.style.display = '';
      els.artImg.removeAttribute('src');
      els.artImg.dataset.loaded = '';
      renderArtFallback(current);
    }
  }

  function renderStationLog() {
    var g = findGenre(state.genre);
    els.logGenre.textContent = g.label;

    var stations = state.stationsByGenre[state.genre] || [];

    els.stationFlankLeft.innerHTML = '';
    els.stationFlankRight.innerHTML = '';

    if (!state.stationsByGenre[state.genre]) {
      var loading = document.createElement('div');
      loading.className = 'log-empty';
      loading.textContent = 'Loading live stations…';
      els.stationFlankLeft.appendChild(loading);
      return;
    }

    if (!stations.length) {
      var empty = document.createElement('div');
      empty.className = 'log-empty';
      empty.textContent = state.genre === FAVORITES_ID
        ? 'No favorites yet — tap the ☆ on a station to add one.'
        : 'No live stations found for this genre right now.';
      els.stationFlankLeft.appendChild(empty);
      return;
    }

    var selected = state.selectedByGenre[state.genre];

    stations.forEach(function (s, i) {
      var isActive = s.name === selected;
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'log-row' + (isActive ? ' active' : '');

      if (isActive && state.playing) {
        var dot = document.createElement('span');
        dot.className = 'live-dot';
        row.appendChild(dot);
      }
      row.appendChild(document.createTextNode(displayName(s.name)));

      var fav = isFavorite(s);
      var star = document.createElement('span');
      star.className = 'fav-star' + (fav ? ' active' : '');
      star.setAttribute('role', 'button');
      star.setAttribute('aria-label', fav ? 'Remove from favorites' : 'Add to favorites');
      star.innerHTML = starSvg(fav);
      star.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavorite(s);
      });
      row.appendChild(star);

      row.addEventListener('click', function () {
        state.selectedByGenre[state.genre] = s.name;
        tuneGenre(state.genre);
      });

      // Alternate stations between the two flanking columns so they frame the phone evenly.
      (i % 2 === 0 ? els.stationFlankLeft : els.stationFlankRight).appendChild(row);
    });
  }

  // ---------- Media Session (lock screen / hardware media keys) ----------

  var mediaSessionReady = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  function updateMediaSession(station) {
    if (!mediaSessionReady) return;
    try {
      if (!station) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
        return;
      }
      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayName(station.name),
        artist: 'RockStation',
        album: findGenre(state.genre).label,
        artwork: station.art ? [{ src: station.art, sizes: '512x512', type: 'image/png' }] : []
      });
      navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';
    } catch (e) {}
  }

  // ---------- Shareable link (URL hash) ----------

  function updateHash() {
    var current = currentStation();
    var stationName = current ? current.name : null;
    var hash = '#' + state.genre + (stationName ? '/' + encodeURIComponent(stationName) : '');
    if (location.hash !== hash) {
      try { history.replaceState(null, '', hash); } catch (e) {}
    }
  }

  function parseInitialHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return null;
    var slashIdx = h.indexOf('/');
    var genreId = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
    var stationName = slashIdx >= 0 ? decodeURIComponent(h.slice(slashIdx + 1)) : null;
    var valid = false;
    for (var i = 0; i < GENRES.length; i++) if (GENRES[i].id === genreId) { valid = true; break; }
    if (!valid) return null;
    return { genreId: genreId, stationName: stationName };
  }

  // ---------- Playback ----------

  function currentStation() {
    var stations = state.stationsByGenre[state.genre] || [];
    var name = state.selectedByGenre[state.genre];
    for (var i = 0; i < stations.length; i++) if (stations[i].name === name) return stations[i];
    // Self-heal: no valid selection for this genre (e.g. just favorited a station
    // while on another tab, or the selected one dropped out) — fall back to the
    // first station and remember it, so every other read stays consistent.
    var fallback = stations[0] || null;
    state.selectedByGenre[state.genre] = fallback ? fallback.name : null;
    return fallback;
  }

  function playCurrent() {
    var station = currentStation();
    if (!station) return;
    state.error = false;
    els.player.src = station.url;
    var playPromise = els.player.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () {
        state.playing = false;
        state.error = true;
        render();
      });
    }
    state.playing = true;
    render();
  }

  function stopPlayback() {
    els.player.pause();
    els.player.removeAttribute('src');
    els.player.load();
    state.playing = false;
    render();
  }

  function togglePlay() {
    if (state.playing) {
      stopPlayback();
    } else {
      playCurrent();
    }
  }

  function tuneGenre(id, forcePlay) {
    var wasPlaying = state.playing;
    state.genre = id;
    render();

    if (!state.stationsByGenre[id]) {
      loadGenre(id).then(function () {
        render();
        if ((wasPlaying || forcePlay) && state.genre === id) playCurrent();
      });
    } else if (wasPlaying || forcePlay) {
      playCurrent();
    }
  }

  function skip(direction, forcePlay) {
    var stations = state.stationsByGenre[state.genre] || [];
    if (!stations.length) return;
    var current = state.selectedByGenre[state.genre];
    var idx = 0;
    for (var i = 0; i < stations.length; i++) if (stations[i].name === current) { idx = i; break; }
    idx = (idx + direction + stations.length) % stations.length;
    state.selectedByGenre[state.genre] = stations[idx].name;
    tuneGenre(state.genre, forcePlay !== undefined ? forcePlay : state.playing);
  }

  var AUTO_SKIP_MAX = 3;

  els.player.addEventListener('error', function () {
    if (state.playing) {
      state.playing = false;
      state.error = true;
      var stations = state.stationsByGenre[state.genre] || [];
      if (state.autoSkipCount < AUTO_SKIP_MAX && stations.length > 1) {
        state.autoSkipCount++;
        skip(1, true);
      } else {
        state.autoSkipCount = 0;
        render();
      }
    }
  });
  els.player.addEventListener('playing', function () {
    state.error = false;
    state.autoSkipCount = 0;
    render();
  });

  // Stop the stream when the tab/app is actually being closed or navigated away from
  // (switching to another app should keep audio going — this only fires on real teardown).
  window.addEventListener('pagehide', function () {
    els.player.pause();
    els.player.removeAttribute('src');
  });

  els.playBtn.addEventListener('click', togglePlay);
  els.prevBtn.addEventListener('click', function () { skip(-1); });
  els.nextBtn.addEventListener('click', function () { skip(1); });

  els.artImg.addEventListener('error', function () {
    els.artImg.style.display = 'none';
    els.artImg.dataset.loaded = '';
    els.artFallback.style.display = '';
    renderArtFallback(currentStation());
  });

  els.favoriteBtn.addEventListener('click', function () {
    toggleFavorite(currentStation());
  });

  var showShareCopied = function () {
    els.shareIcon.style.display = 'none';
    els.checkIcon.style.display = '';
    setTimeout(function () {
      els.shareIcon.style.display = '';
      els.checkIcon.style.display = 'none';
    }, 1500);
  };

  var fallbackCopyLink = function (url) {
    try {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showShareCopied();
    } catch (e) {}
  };

  var copyShareLink = function (url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(showShareCopied).catch(function () {
        fallbackCopyLink(url);
      });
    } else {
      fallbackCopyLink(url);
    }
  };

  els.shareBtn.addEventListener('click', function () {
    copyShareLink(location.href);
  });

  if (mediaSessionReady) {
    try {
      navigator.mediaSession.setActionHandler('play', function () { playCurrent(); });
      navigator.mediaSession.setActionHandler('pause', function () { stopPlayback(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { skip(-1, true); });
      navigator.mediaSession.setActionHandler('nexttrack', function () { skip(1, true); });
    } catch (e) {}
  }

  // ---------- Volume ----------

  function applyVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    els.player.volume = state.volume;
  }

  els.volumeRange.addEventListener('input', function () {
    applyVolume(els.volumeRange.value / 100);
  });

  // ---------- Init ----------

  var initialHash = parseInitialHash();
  if (initialHash) state.genre = initialHash.genreId;

  applyVolume(state.volume);
  render();

  GENRES.forEach(function (g) {
    loadGenre(g.id).then(function (stations) {
      if (initialHash && g.id === initialHash.genreId && initialHash.stationName) {
        for (var i = 0; i < stations.length; i++) {
          if (stations[i].name === initialHash.stationName) {
            state.selectedByGenre[g.id] = stations[i].name;
            break;
          }
        }
      }
      render();
    });
  });
})();
