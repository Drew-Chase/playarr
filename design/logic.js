const G = (a, b, c) => 'linear-gradient(155deg,' + a + ' 0%,' + b + ' 54%,' + c + ' 100%)';

const TITLES = [
  { id: 'hollow', t: 'Hollow Signal', yr: 2024, kind: 'show', rating: '8.7', gen: ['Sci-Fi', 'Thriller', 'Mystery'], seasons: 3, prog: 0.31, ep: 'S03 · E04 — The Quiet Floor', ink: '#8ff0e2', art: G('#0d4d55', '#0a2030', '#04070c'), ov: 'A decommissioned relay station keeps receiving a broadcast that has not been sent yet. The skeleton crew has eleven days to decide whether to answer.' },
  { id: 'copper', t: 'Copperline', yr: 2023, kind: 'show', rating: '8.2', gen: ['Crime', 'Drama'], seasons: 2, prog: 0.62, ep: 'S02 · E07 — Smoke Money', ink: '#ffcf7a', art: G('#5a3410', '#2a1608', '#08050b'), ov: 'Two detectives on opposite sides of a dying steel town trade favours until the ledger comes due.' },
  { id: 'vault', t: 'Vault of Ash', yr: 2025, kind: 'show', rating: '9.1', gen: ['Fantasy', 'Adventure'], seasons: 1, prog: 0.08, ep: 'S01 · E02 — The Long Vigil', ink: '#d9b6ff', art: G('#3c1c63', '#1b0f33', '#07060d'), ov: 'The last archive of a burned empire is guarded by a girl who cannot read, and by something older than the shelves.' },
  { id: 'cranes', t: 'Paper Cranes', yr: 2024, kind: 'show', rating: '8.9', gen: ['Anime', 'Drama'], seasons: 2, prog: null, ep: 'S01 · E01 — Folded Twice', ink: '#ffd0e4', art: G('#8f2d5f', '#3b1330', '#0a060c'), ov: 'A courier of impossible letters walks a city that rearranges itself every night.' },
  { id: 'static', t: 'The Long Static', yr: 2022, kind: 'movie', rating: '7.8', gen: ['Sci-Fi', 'Drama'], seasons: 0, prog: 0.44, ep: '1h 58m', ink: '#a9c6ff', art: G('#1b3566', '#101a3a', '#05060c'), ov: 'Forty years after the signal stopped, one listener refuses to take off the headphones.' },
  { id: 'rift', t: 'Rift Runners', yr: 2025, kind: 'movie', rating: '7.4', gen: ['Action', 'Sci-Fi'], seasons: 0, prog: null, ep: '2h 12m', ink: '#ffb08a', art: G('#7d2b1c', '#361208', '#08050a'), ov: 'A smuggling crew hauls cargo through gaps in the map that close on a schedule nobody published.' },
  { id: 'lantern', t: 'Lantern Bay', yr: 2021, kind: 'movie', rating: '8.0', gen: ['Drama'], seasons: 0, prog: 0.9, ep: '2h 04m', ink: '#ffe9a8', art: G('#6b5a12', '#2c2408', '#08070a'), ov: 'A lighthouse keeper writes to a daughter who has stopped answering.' },
  { id: 'undertow', t: 'Undertow', yr: 2024, kind: 'movie', rating: '7.1', gen: ['Thriller'], seasons: 0, prog: null, ep: '1h 47m', ink: '#9fe8ff', art: G('#0f4a63', '#0a2230', '#05070c'), ov: 'A free diver takes a job that requires her to forget what she saw at ninety metres.' },
  { id: 'gilded', t: 'Gilded Hours', yr: 2023, kind: 'show', rating: '8.4', gen: ['Period', 'Drama'], seasons: 4, prog: null, ep: 'S01 · E01 — First Season', ink: '#f0d9a0', art: G('#4c3a1a', '#241a0d', '#08060a'), ov: 'A clockmaker\u2019s widow inherits her husband\u2019s debts and his client list.' },
  { id: 'northpass', t: 'Northpass', yr: 2022, kind: 'show', rating: '7.9', gen: ['Adventure', 'Drama'], seasons: 3, prog: null, ep: 'S01 · E01 — The Cut', ink: '#c6e6ff', art: G('#2a4a5e', '#152430', '#06070b'), ov: 'A haulage route through the northern pass reopens after twenty winters closed.' },
  { id: 'saltmark', t: 'Saltmark', yr: 2025, kind: 'show', rating: '8.6', gen: ['Mystery'], seasons: 1, prog: null, ep: 'S01 · E01 — Low Tide', ink: '#b6ffd9', art: G('#12503c', '#0a271e', '#05070a'), ov: 'Every seventh year the tide leaves something on the beach that the village agrees not to name.' },
  { id: 'emberfall', t: 'Emberfall', yr: 2024, kind: 'movie', rating: '7.6', gen: ['Fantasy'], seasons: 0, prog: null, ep: '2h 21m', ink: '#ffc2a0', art: G('#7a3312', '#3a1608', '#09050a'), ov: 'The last dragon-keeper takes a census.' }
];

const DISCOVER = [
  { id: 'd1', t: 'Quiet Machines', yr: 2026, rating: '8.3', kind: 'movie', ink: '#a7d8ff', art: G('#20406b', '#132340', '#05060c'), ov: 'A factory that builds nothing keeps hiring.' },
  { id: 'd2', t: 'The Understudy', yr: 2025, rating: '7.7', kind: 'movie', ink: '#ffd2c2', art: G('#6c2a3a', '#33131c', '#08050a'), ov: 'She learns every line of a play that has no ending written.' },
  { id: 'd3', t: 'Harbourlight', yr: 2026, rating: '8.8', kind: 'show', ink: '#b9f0ff', art: G('#0f4b5c', '#0a232c', '#05070b'), ov: 'A port authority inspector finds the same container arriving twice.' },
  { id: 'd4', t: 'Bright Fever', yr: 2025, rating: '7.2', kind: 'show', ink: '#ffe6a3', art: G('#6d5715', '#2f250a', '#07060a'), ov: 'A heatwave summer in a town with one working phone line.' },
  { id: 'd5', t: 'Nine Winters', yr: 2024, rating: '8.1', kind: 'movie', ink: '#d5dcff', art: G('#2c3170', '#181a3c', '#06060c'), ov: 'Two climbers, one rope, nine seasons of trying.' },
  { id: 'd6', t: 'Kettle Black', yr: 2026, rating: '7.9', kind: 'show', ink: '#ffc0d8', art: G('#6d1f45', '#331025', '#08050a'), ov: 'A restaurant kitchen where every cook is hiding the same thing.' },
  { id: 'd7', t: 'Slow Orbit', yr: 2025, rating: '8.5', kind: 'movie', ink: '#c0ffe4', art: G('#12523f', '#0a2720', '#05070a'), ov: 'A supply run to a station nobody has heard from in a year.' },
  { id: 'd8', t: 'Fault Lines', yr: 2026, rating: '7.5', kind: 'show', ink: '#ffcaa8', art: G('#71391a', '#341a0b', '#08050a'), ov: 'Seismologists argue about a tremor that only one of them recorded.' }
];

const FRIENDS = [
  { name: 'Drew', initials: 'DC', art: 'linear-gradient(140deg,#00D474,#0b7f5b)' },
  { name: 'Mara', initials: 'MK', art: 'linear-gradient(140deg,#8ab4ff,#3b5f9e)' },
  { name: 'Theo', initials: 'TL', art: 'linear-gradient(140deg,#ffd166,#a3801f)' },
  { name: 'Priya', initials: 'PS', art: 'linear-gradient(140deg,#ff9ec4,#a34a72)' }
];

const QUALITY = [
  { label: 'Original', note: '2160p HEVC · 18.6 Mbps · direct play' },
  { label: '1080p', variants: ['High 20 Mbps', 'Med 12 Mbps', 'Normal 10 Mbps', 'Low 8 Mbps'] },
  { label: '720p', variants: ['High 4 Mbps', 'Med 3 Mbps', 'Normal 2 Mbps'] },
  { label: '480p', note: '1.5 Mbps' },
  { label: '360p', note: '0.7 Mbps' }
];
const AUDIO = [
  { label: 'English · TrueHD Atmos 7.1', note: 'Default · lossless' },
  { label: 'English · DDP 5.1', note: 'Compatible · 640 kbps' },
  { label: 'English · Commentary', note: 'Director and cast' },
  { label: 'Spanish · AAC 2.0', note: 'Dub · 192 kbps' }
];
const SUBS = [
  { label: 'Off', note: '' },
  { label: 'English (SDH)', note: 'Embedded · PGS image' },
  { label: 'English — Forced', note: 'Embedded · signs and songs only' },
  { label: 'Spanish', note: 'Embedded · SRT text' }
];

const EP_TITLES = ['The Quiet Floor', 'Carrier Wave', 'Nineteen Minutes', 'Dead Air', 'The Long Vigil', 'Answering Tone', 'Smoke Money', 'Low Tide', 'Folded Twice'];
const EP_OV = 'The crew argues about protocol while the signal repeats on a shorter interval than yesterday.';

class Component extends DCLogic {
  state = {
    scale: 1, screen: 'home', hero: 0, titleId: 'hollow', season: 1,
    modal: null, toast: null, partyScope: 'everyone', joinCode: '',
    query: '', gridKind: 'movie', gridFilter: 'All', discoverTab: 'Trending',
    playing: true, t: 372, partyPanelOpen: true, party: null, chat: [],
    reqTarget: null, reqFields: [0, 0, 0, 0], autoSearch: true,
    grabbed: {}, listed: {}, requested: {}, scrollY: 0, barHidden: false,
    epIndex: 3, settingsPane: null, quality: '1080p', variant: 'Normal 10 Mbps',
    audio: 0, subs: 1, speed: '1x', upNext: false, countdown: 10, autoplay: true
  };
  lastY = 0;
  scrollRef = React.createRef();

  componentDidMount() {
    this.fit();
    this.onResize = () => this.fit();
    window.addEventListener('resize', this.onResize);
    this.tick = setInterval(() => {
      const s = this.state;
      if (s.screen !== 'player') return;
      if (s.upNext) {
        if (!s.autoplay) return;
        if (s.countdown <= 1) return this.startNext();
        return this.setState({ countdown: s.countdown - 1 });
      }
      if (!s.playing) return;
      const nt = Math.min(s.t + 1, 3600);
      if (nt >= 3570) this.setState({ t: nt, upNext: true, countdown: 10, settingsPane: null });
      else this.setState({ t: nt });
    }, 1000);
    this.onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); this.back(); }
    };
    window.addEventListener('keydown', this.onKey);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKey);
    clearInterval(this.tick);
  }
  fit() {
    this.setState({ scale: Math.min(window.innerWidth / 1920, window.innerHeight / 1080) });
  }
  flash(msg) {
    this.setState({ toast: msg });
    clearTimeout(this.tt);
    this.tt = setTimeout(() => this.setState({ toast: null }), 2200);
  }
  nav(screen, extra) {
    const el = this.scrollRef.current;
    if (el) el.scrollTop = 0;
    this.lastY = 0;
    this.setState(Object.assign({ screen, modal: null, scrollY: 0, barHidden: false }, extra || {}));
  }
  back() {
    const s = this.state;
    if (s.modal) return this.setState({ modal: null });
    if (s.settingsPane) return this.setState({ settingsPane: null });
    if (s.screen === 'player') { this.setState({ upNext: false }); return this.nav('detail'); }
    if (s.screen === 'episode') return this.nav('detail');
    if (s.screen !== 'home') return this.nav('home');
  }
  title(id) { return TITLES.find(x => x.id === id) || TITLES[0]; }
  fmt(sec) {
    const m = Math.floor(sec / 60), h = Math.floor(m / 60);
    const mm = m % 60, ss = Math.floor(sec % 60);
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? h + ':' + p(mm) + ':' + p(ss) : p(mm) + ':' + p(ss);
  }
  openTitle(id) { this.nav('detail', { titleId: id, season: 1 }); }
  startNext() {
    const next = Math.min(this.state.epIndex + 1, 7);
    this.setState({ epIndex: next, upNext: false, t: 0, playing: true, countdown: 10 });
    this.flash('Playing E0' + (next + 1));
  }
  play(id, label) {
    this.setState({ screen: 'player', titleId: id || this.state.titleId, playing: true, t: 372, partyPanelOpen: !!this.state.party, upNext: false, settingsPane: null, countdown: 10 });
    if (label) this.flash(label);
  }

  renderVals() {
    const s = this.state;
    const T = this.title(s.titleId);
    const hero = TITLES[s.hero % 4];
    const atTop = s.scrollY < 40;
    const chatFeed = s.chat.length ? s.chat : [
      { name: 'Mara', initials: 'MK', art: FRIENDS[1].art, text: 'okay that transition was insane' },
      { name: 'Theo', initials: 'TL', art: FRIENDS[2].art, text: 'pausing for 2, kettle' },
      { name: 'Drew', initials: 'DC', art: FRIENDS[0].art, text: 'take your time, holding here' }
    ];

    const navDefs = [
      { key: 'home', label: 'Home' },
      { key: 'movies', label: 'Movies' },
      { key: 'shows', label: 'TV Shows' }
    ];
    const activeKey = s.screen === 'grid' ? (s.gridKind === 'movie' ? 'movies' : 'shows') : s.screen;

    const railItem = t => ({
      t: t.t, sub: t.yr + ' · ' + (t.kind === 'show' ? t.seasons + ' seasons' : t.ep),
      art: t.art, ink: t.ink,
      badge: t.prog !== null && t.prog > 0 ? 'Resume' : null,
      hasProg: t.prog !== null && t.prog > 0,
      progPct: Math.round((t.prog || 0) * 100) + '%',
      open: () => this.openTitle(t.id)
    });

    const epCount = 8;
    const episodes = Array.from({ length: epCount }, (_, i) => {
      const done = i < 3, cur = i === 3;
      return {
        num: 'S0' + s.season + ' · E0' + (i + 1),
        title: EP_TITLES[(i + s.season) % EP_TITLES.length],
        ov: EP_OV, dur: 42 + (i % 5) + 'm',
        art: T.art, hasProg: cur, progPct: '31%',
        state: done ? 'Watched' : cur ? 'In progress' : '',
        stateColor: done ? '#7dffc0' : '#ffd166',
        play: () => this.nav('episode', { epIndex: i })
      };
    });

    const libMovies = TITLES.filter(t => t.kind === 'movie');
    const libShows = TITLES.filter(t => t.kind === 'show');
    const gridSource = s.gridKind === 'movie' ? libMovies : libShows;
    const gridList = s.gridFilter === 'In progress' ? gridSource.filter(t => t.prog) :
      s.gridFilter === 'Unwatched' ? gridSource.filter(t => !t.prog) : gridSource;

    const q = s.query.trim().toLowerCase();
    const searchPool = TITLES.concat(DISCOVER);
    const results = q ? searchPool.filter(t => t.t.toLowerCase().includes(q)) : TITLES.slice(0, 8);

    const rows = [['Q','W','E','R','T','Y','U'],['I','O','P','A','S','D','F'],['G','H','J','K','L','Z','X'],['C','V','B','N','M']];
    const keyRows = rows.map(r => ({
      keys: r.map(k => ({ label: k, w: '64px', bg: '#14181c', fg: '#e9ecee', press: () => this.setState({ query: s.query + k }) }))
    }));
    keyRows.push({ keys: [
      { label: 'Space', w: '148px', bg: '#14181c', fg: '#e9ecee', press: () => this.setState({ query: s.query + ' ' }) },
      { label: 'Delete', w: '148px', bg: '#14181c', fg: '#e9ecee', press: () => this.setState({ query: s.query.slice(0, -1) }) },
      { label: 'Clear', w: '148px', bg: 'rgba(0,212,116,.16)', fg: '#7dffc0', press: () => this.setState({ query: '' }) }
    ]});

    const reqOpts = [
      { label: 'Root folder', vals: ['/mnt/media/movies', '/mnt/media/4k', '/mnt/media/archive'] },
      { label: 'Quality profile', vals: ['Any', 'HD-1080p', 'Ultra-HD', 'Remux'] },
      { label: 'Monitor', vals: ['Movie only', 'All seasons', 'Future episodes', 'First season'] },
      { label: 'Availability', vals: ['Released', 'Announced', 'In cinemas'] }
    ];
    const reqT = s.reqTarget ? (DISCOVER.find(d => d.id === s.reqTarget) || TITLES.find(t => t.id === s.reqTarget) || DISCOVER[0]) : DISCOVER[0];

    const relNames = ['2160p.WEB-DL.DV.HDR10.DDP5.1.Atmos.H265','1080p.BluRay.REMUX.AVC.TrueHD.7.1','1080p.WEB-DL.DDP5.1.H264','2160p.BluRay.x265.10bit.HDR','1080p.WEBRip.x265.DDP5.1','720p.WEB-DL.AAC2.0.H264','2160p.WEB-DL.DDP5.1.HEVC','1080p.AMZN.WEB-DL.DDP5.1.H264'];
    const releases = relNames.map((n, i) => {
      const key = s.titleId + i, got = !!s.grabbed[key];
      return {
        name: T.t.replace(/ /g, '.') + '.' + T.yr + '.' + n + '-PLAYARR',
        indexer: ['NZBgeek', 'DrunkenSlug', 'Nzb.su', 'AnimeTosho'][i % 4],
        size: [22.4, 34.1, 6.2, 41.8, 4.9, 2.1, 18.6, 7.4][i] + ' GB',
        quality: n.split('.')[0],
        btn: got ? 'Queued' : 'Grab',
        btnBg: got ? 'rgba(0,212,116,.18)' : 'rgba(255,255,255,.09)',
        btnFg: got ? '#7dffc0' : '#e9ecee',
        grab: () => { this.setState(st => ({ grabbed: Object.assign({}, st.grabbed, { [key]: 1 }) })); this.flash('Sent to download client — ' + n.split('.')[0]); }
      };
    });

    const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const calDays = dows.map((d, i) => {
      const today = i === 2;
      const items = [];
      const n = [2, 1, 3, 2, 1, 0, 2][i];
      for (let j = 0; j < n; j++) {
        const t = TITLES[(i * 3 + j) % TITLES.length];
        const st = i < 2 ? 'downloaded' : i === 2 ? 'today' : 'unaired';
        items.push({
          t: t.t + ' S0' + (1 + (j % 3)) + 'E0' + (2 + j),
          sub: st === 'downloaded' ? 'Downloaded' : st === 'today' ? 'Airs tonight' : 'Unaired',
          bg: st === 'downloaded' ? 'rgba(0,212,116,.12)' : st === 'today' ? 'rgba(255,209,102,.13)' : 'rgba(138,180,255,.1)',
          accent: st === 'downloaded' ? '#00D474' : st === 'today' ? '#ffd166' : '#8ab4ff',
          act: () => this.openTitle(t.id)
        });
      }
      return {
        dow: d, num: String(8 + i), items,
        bg: today ? 'rgba(0,212,116,.06)' : '#0d0f12',
        border: today ? 'rgba(0,212,116,.35)' : 'rgba(255,255,255,.06)',
        numColor: today ? '#00D474' : '#f3f5f6'
      };
    });

    const dlQueue = [
      { t: 'Vault.of.Ash.S01E03.2160p.WEB-DL.DV.HDR10-PLAYARR', size: '18.6 GB', speed: '64.2 MB/s', eta: '4m 12s', pct: '68%', color: '#00D474', sub: 'Importing to /mnt/media/tv · Sonarr' },
      { t: 'Rift.Runners.2025.1080p.BluRay.REMUX-PLAYARR', size: '34.1 GB', speed: '41.8 MB/s', eta: '11m 40s', pct: '34%', color: '#00D474', sub: 'Radarr · quality profile Remux' },
      { t: 'Copperline.S02E08.1080p.WEB-DL.DDP5.1-PLAYARR', size: '6.2 GB', speed: '—', eta: 'Queued', pct: '0%', color: '#8ab4ff', sub: 'Waiting on slot 3 of 3' },
      { t: 'Saltmark.S01E01.2160p.WEB-DL.HEVC-PLAYARR', size: '12.4 GB', speed: '—', eta: 'Done', pct: '100%', color: '#7dffc0', sub: 'Imported 12 minutes ago' }
    ].map(d => Object.assign({}, d, { act: () => this.flash('Opened ' + d.t.split('.')[0]) }));

    return {
      scale: s.scale,
      sPlayer: s.screen === 'player',
      sShell: s.screen !== 'player',
      sHome: s.screen === 'home',
      sGrid: s.screen === 'grid',
      sDetail: s.screen === 'detail',
      sCalendar: s.screen === 'calendar',
      sEpisode: s.screen === 'episode',
      sDownloads: s.screen === 'downloads',
      sSearch: s.screen === 'search',
      sProfile: s.screen === 'profile',

      scrollRef: this.scrollRef,
      onScroll: e => {
        const y = e.target.scrollTop;
        this.lastY = y;
        this.setState({ scrollY: y, barHidden: false });
      },
      barBg: atTop ? 'rgba(7,8,10,0)' : 'rgba(10,12,15,.72)',
      barBlur: atTop ? 'none' : 'blur(26px) saturate(160%)',
      barBorder: atTop ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,.08)',
      barShift: s.barHidden ? '-112px' : '0px',
      dlBadge: '3',

      navItems: navDefs.map(n => ({
        label: n.label, badge: n.badge || null,
        bg: activeKey === n.key ? 'rgba(255,255,255,.1)' : 'transparent',
        fg: activeKey === n.key ? '#00D474' : '#c9ced3',
        go: () => {
          if (n.key === 'movies') this.nav('grid', { gridKind: 'movie', gridFilter: 'All' });
          else if (n.key === 'shows') this.nav('grid', { gridKind: 'show', gridFilter: 'All' });
          else this.nav(n.key);
        }
      })),
      goHome: () => this.nav('home'),
      goCalendar: () => this.nav('calendar'),
      calBg: s.screen === 'calendar' ? 'rgba(0,212,116,.18)' : 'rgba(255,255,255,.09)',
      calInk: s.screen === 'calendar' ? '#00D474' : '#e9ecee',
      goSearch: () => this.nav('search'),
      goDownloads: () => this.nav('downloads'),
      goProfile: () => this.nav('profile'),

      heroArt: hero.art,
      heroTag: hero.prog ? 'Continue watching' : 'New in your library',
      heroTitle: hero.t,
      heroRating: hero.rating + ' ★',
      heroMeta: hero.yr + ' · ' + hero.gen.join(' / ') + ' · ' + (hero.kind === 'show' ? hero.seasons + ' seasons' : hero.ep),
      heroOverview: hero.ov,
      heroPlayLabel: hero.prog ? 'Resume ' + hero.ep.split('—')[0].trim() : 'Play',
      heroPlay: () => this.play(hero.id, 'Playing ' + hero.t),
      heroInfo: () => this.openTitle(hero.id),
      heroDots: [0, 1, 2, 3].map(i => ({
        w: i === s.hero % 4 ? '34px' : '8px',
        bg: i === s.hero % 4 ? '#00D474' : 'rgba(255,255,255,.3)',
        go: () => this.setState({ hero: i })
      })),

      continueItems: TITLES.filter(t => t.prog).map(railItem),
      liveCount: '3 live now',
      rails: [
        { label: 'Recently added', note: 'Imported this week', items: TITLES.slice(4, 12).map(railItem) },
        { label: 'Because you watched Hollow Signal', note: '', items: TITLES.slice(2, 10).map(railItem) },
        { label: 'Movies in your library', note: libMovies.length + ' titles', items: libMovies.map(railItem) }
      ],

      gridTitle: s.gridKind === 'movie' ? 'Movies' : 'TV Shows',
      gridCount: gridList.length + ' of ' + gridSource.length + ' titles · ' + s.gridFilter,
      gridFilters: ['All', 'In progress', 'Unwatched'].map(f => ({
        label: f,
        bg: s.gridFilter === f ? '#00D474' : 'rgba(255,255,255,.08)',
        fg: s.gridFilter === f ? '#04120b' : '#e9ecee',
        act: () => this.setState({ gridFilter: f })
      })),
      gridItems: gridList.map(t => ({
        t: t.t, sub: t.yr + ' · ' + (t.kind === 'show' ? t.seasons + ' seasons' : t.ep),
        art: t.art, ink: t.ink, watched: t.prog !== null && t.prog > 0.85,
        open: () => this.openTitle(t.id)
      })),

      dArt: T.art, dInk: T.ink, dTitle: T.t, dRating: T.rating + ' ★',
      dMeta: T.yr + ' · ' + (T.kind === 'show' ? T.seasons + ' seasons' : T.ep),
      dQuality: '2160p HDR · Atmos',
      dOverview: T.ov,
      dGenres: T.gen.map(g => ({ label: g })),
      dIsShow: T.kind === 'show',
      dPlayLabel: T.prog ? 'Resume ' + T.ep.split('—')[0].trim() : 'Play',
      dPlay: () => this.play(T.id, 'Playing ' + T.t),
      dListLabel: s.listed[T.id] ? 'In my list ✓' : 'Add to my list',
      dToggleList: () => {
        const on = !s.listed[T.id];
        this.setState(st => ({ listed: Object.assign({}, st.listed, { [T.id]: on }) }));
        this.flash(on ? T.t + ' added to your list' : T.t + ' removed from your list');
      },
      openReleases: () => this.setState({ modal: 'releases' }),
      dSeasons: Array.from({ length: Math.max(T.seasons, 1) }, (_, i) => ({
        label: 'Season ' + (i + 1),
        sub: (i === 0 ? epCount : 8 + i) + ' episodes' + (i === 0 ? ' · 3 watched' : ''),
        art: T.art, ink: T.ink,
        ring: s.season === i + 1 ? '2px solid #00D474' : '2px solid rgba(255,255,255,.08)',
        shade: s.season === i + 1 ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.55)',
        act: () => this.setState({ season: i + 1 })
      })),
      dEpisodes: episodes,
      dCast: ['Ana Reyes','Miles Okafor','Ingrid Sol','Petra Lange','Sam Boyd','Nadia Farr','Joel Marsh','Ruth Ahn'].map((n, i) => ({
        name: n, role: ['Cmdr. Vale','Tech 2','Dr. Yun','Archivist','Relay Op','The Caller','Marsh','Ahn'][i],
        initials: n.split(' ').map(x => x[0]).join(''),
        art: G('#2a2f36', '#1a1e23', '#12151a')
      })),
      dSimilar: TITLES.filter(t => t.id !== T.id).slice(0, 7).map(t => ({
        t: t.t, art: t.art, ink: t.ink, open: () => this.openTitle(t.id)
      })),

      discoverTabs: ['Trending', 'Popular movies', 'Popular shows'].map(f => ({
        label: f,
        bg: s.discoverTab === f ? '#00D474' : 'rgba(255,255,255,.08)',
        fg: s.discoverTab === f ? '#04120b' : '#e9ecee',
        act: () => this.setState({ discoverTab: f })
      })),
      discoverRails: (() => {
        const card = d => {
          const done = !!s.requested[d.id];
          return {
            t: d.t, sub: d.yr + ' · ' + (d.kind === 'movie' ? 'Movie' : 'Series'),
            rating: d.rating + ' ★', art: d.art, ink: d.ink,
            btn: done ? 'Requested ✓' : '+ Request',
            btnBg: done ? 'rgba(0,212,116,.9)' : 'rgba(255,255,255,.16)',
            btnFg: done ? '#04120b' : '#f3f5f6',
            request: () => this.setState({ modal: 'request', reqTarget: d.id, reqFields: [0, 0, 0, 0] })
          };
        };
        const pool = s.discoverTab === 'Popular movies' ? DISCOVER.filter(d => d.kind === 'movie')
          : s.discoverTab === 'Popular shows' ? DISCOVER.filter(d => d.kind === 'show') : DISCOVER;
        const rot = n => pool.concat(pool).slice(n, n + Math.max(pool.length, 5));
        return [
          { label: s.discoverTab === 'Trending' ? 'Trending this week' : s.discoverTab, note: 'From TMDB', items: rot(0).map(card) },
          { label: 'Recommended for your library', note: 'Based on what you watch', items: rot(2).map(card) },
          { label: 'Most requested by your users', note: '4 awaiting approval', items: rot(4).map(card) }
        ];
      })(),

      requestRows: [
        { t: 'Harbourlight', status: 'Downloading', sub: 'Sonarr · S01 pack · NZBgeek · 2160p WEB-DL', pct: '68%', eta: '4m left', pill: 'go', art: DISCOVER[2].art },
        { t: 'Slow Orbit', status: 'Searching', sub: 'Radarr · 14 indexers · no cut-off match yet', pct: '12%', eta: 'Retrying', pill: 'wait', art: DISCOVER[6].art },
        { t: 'Nine Winters', status: 'Imported', sub: 'Available in your library · 1080p Remux', pct: '100%', eta: 'Ready', pill: 'done', art: DISCOVER[4].art },
        { t: 'Bright Fever', status: 'Pending approval', sub: 'Requested by Theo · needs your OK', pct: '0%', eta: 'Awaiting', pill: 'hold', art: DISCOVER[3].art }
      ].map(r => ({
        t: r.t, status: r.status, sub: r.sub, pct: r.pct, eta: r.eta, art: r.art,
        pillBg: r.pill === 'done' ? 'rgba(0,212,116,.18)' : r.pill === 'go' ? 'rgba(0,212,116,.14)' : r.pill === 'wait' ? 'rgba(255,209,102,.15)' : 'rgba(138,180,255,.15)',
        pillFg: r.pill === 'done' || r.pill === 'go' ? '#7dffc0' : r.pill === 'wait' ? '#ffd166' : '#8ab4ff',
        barColor: r.pill === 'wait' ? '#ffd166' : r.pill === 'hold' ? '#8ab4ff' : '#00D474',
        act: () => this.flash(r.t + ' · ' + r.status)
      })),

      partyCards: [
        { name: "Drew's Movie Night", watching: 'Rift Runners · 41:20 remaining', pct: '38%', live: true, members: FRIENDS.slice(0, 3) },
        { name: 'Sunday Rewatch', watching: 'Copperline · S02 E07', pct: '62%', live: true, members: FRIENDS.slice(1, 4) },
        { name: 'Anime Club', watching: 'Paper Cranes · starts in 20 min', pct: '0%', live: false, members: FRIENDS.slice(0, 2) },
        { name: 'Late Shift', watching: 'Hollow Signal · S03 E04', pct: '31%', live: true, members: FRIENDS.slice(2, 4) }
      ].map((p, i) => ({
        name: p.name, watching: p.watching, pct: p.pct,
        art: TITLES[(i * 3 + 1) % TITLES.length].art,
        liveColor: p.live ? '#00D474' : '#ffd166',
        liveLabel: p.live ? 'Live now' : 'Scheduled',
        members: p.members,
        countLabel: p.members.length + ' watching',
        join: () => {
          this.setState({ party: p.name, partyPanelOpen: true });
          this.play(TITLES[(i * 3 + 1) % TITLES.length].id, 'Joined ' + p.name + ' — synced');
        }
      })),
      openCreateParty: () => this.setState({ modal: 'create' }),
      openJoinParty: () => this.setState({ modal: 'join' }),

      calDays, calLegend: [
        { label: 'Downloaded', color: '#00D474' },
        { label: 'Airs today', color: '#ffd166' },
        { label: 'Unaired', color: '#8ab4ff' }
      ],

      dlStats: [
        { label: 'Active', value: '2', color: '#00D474' },
        { label: 'Download rate', value: '106 MB/s', color: '#7dffc0' },
        { label: 'Queued', value: '1', color: '#8ab4ff' },
        { label: 'Imported today', value: '9', color: '#f3f5f6' }
      ],
      dlRows: dlQueue,

      searchDisplay: s.query || 'Search your server and TMDB…',
      searchNote: q ? results.length + ' results for “' + s.query + '”' : 'Suggested from your library',
      keyRows,
      searchResults: results.map(t => {
        const inLib = TITLES.some(x => x.id === t.id);
        return {
          t: t.t, sub: t.yr + ' · ' + (t.kind === 'movie' ? 'Movie' : 'Series'),
          art: t.art, ink: t.ink,
          tag: inLib ? 'In library' : 'Discover',
          tagColor: inLib ? '#7dffc0' : '#ffd166',
          open: () => inLib ? this.openTitle(t.id) : this.setState({ modal: 'request', reqTarget: t.id, reqFields: [0, 0, 0, 0] })
        };
      }),

      profiles: FRIENDS.map((f, i) => ({
        name: f.name, initials: f.initials, art: f.art,
        sub: ['Owner · 4K', 'Standard', 'Standard', 'Kids'][i],
        ring: i === 0 ? '#00D474' : 'transparent',
        act: () => this.flash('Switched to ' + f.name)
      })),
      settings: [
        { label: 'Watch party sync tolerance', value: '±250 ms', valColor: '#00D474', sub: 'Auto-corrects drift between viewers' },
        { label: 'Preferred quality on this TV', value: '2160p HDR', valColor: '#00D474', sub: 'Falls back to 1080p on slow links' },
        { label: 'Skip intros automatically', value: 'On', valColor: '#7dffc0', sub: 'Uses chapter markers when present' },
        { label: 'Request approval', value: 'Owner only', valColor: '#8ab4ff', sub: 'Who can send new titles to Sonarr / Radarr' }
      ].map(x => Object.assign({}, x, { act: () => this.flash(x.label + ' — ' + x.value) })),

      epBack: () => this.nav('detail', { titleId: s.titleId, season: s.season }),
      epCrumb: T.t + '  ›  Season ' + s.season,
      epArt: T.art, epInk: T.ink,
      epNum: 'S0' + s.season + ' · E0' + (s.epIndex + 1),
      epTitle: EP_TITLES[(s.epIndex + s.season) % EP_TITLES.length],
      epMeta: '42m ' + (s.epIndex + 3) + 's · Aired ' + (12 + s.epIndex) + ' Mar ' + T.yr + ' · TV-14',
      epOverview: EP_OV + ' Vale takes the log off the record, and Yun starts counting the gaps between transmissions instead of the transmissions themselves.',
      epTech: [
        { label: 'Video', value: '2160p HEVC · HDR10 · 24.0 fps' },
        { label: 'Audio', value: 'English TrueHD Atmos 7.1 · 3 tracks' },
        { label: 'Subtitles', value: '4 embedded tracks · no external search' },
        { label: 'File', value: '18.6 GB · /mnt/media/tv/' + T.t.replace(/ /g, '.') }
      ],
      epProgLabel: s.epIndex === 3 ? '13m 04s in · 31% watched' : s.epIndex < 3 ? 'Watched' : 'Not watched',
      epPlayLabel: s.epIndex === 3 ? 'Resume episode' : 'Play episode',
      epPlay: () => this.play(T.id, 'Playing ' + EP_TITLES[(s.epIndex + s.season) % EP_TITLES.length]),
      epMarkLabel: s.epIndex < 3 ? 'Mark as unwatched' : 'Mark as watched',
      epMark: () => this.flash(s.epIndex < 3 ? 'Marked unwatched' : 'Marked watched'),
      epSiblings: episodes.map((e, i) => ({
        num: e.num, title: e.title, dur: e.dur, art: T.art,
        bg: i === s.epIndex ? 'rgba(0,212,116,.1)' : '#0f1114',
        border: i === s.epIndex ? 'rgba(0,212,116,.4)' : 'rgba(255,255,255,.06)',
        go: () => this.nav('episode', { epIndex: i })
      })),

      settingsOpen: !!s.settingsPane && !s.upNext,
      chromeDisplay: s.upNext ? 'none' : 'flex',
      paneRoot: s.settingsPane === 'root',
      paneQuality: s.settingsPane === 'quality',
      paneAudio: s.settingsPane === 'audio',
      paneSubs: s.settingsPane === 'subs',
      paneSpeed: s.settingsPane === 'speed',
      openSettings: () => this.setState({ settingsPane: 'root' }),
      closeSettings: () => this.setState({ settingsPane: null }),
      backToRoot: () => this.setState({ settingsPane: 'root' }),
      settingsRows: [
        { key: 'quality', label: 'Quality', value: s.quality === 'Original' ? 'Original' : s.quality + ' · ' + s.variant },
        { key: 'audio', label: 'Audio', value: AUDIO[s.audio].label },
        { key: 'subs', label: 'Subtitles', value: SUBS[s.subs].label },
        { key: 'speed', label: 'Playback speed', value: s.speed }
      ].map(r => ({
        label: r.label, value: r.value,
        act: () => this.setState({ settingsPane: r.key })
      })),
      qualityRows: QUALITY.map(q => {
        const on = s.quality === q.label;
        return {
          label: q.label, note: q.note || '',
          fg: on ? '#00D474' : '#e9ecee',
          mark: on ? '✓' : '',
          bg: on ? 'rgba(0,212,116,.07)' : 'transparent',
          hasVariants: !!q.variants,
          variants: (q.variants || []).map(v => {
            const von = on && s.variant === v;
            return {
              label: v,
              bg: von ? '#00D474' : 'rgba(255,255,255,.07)',
              fg: von ? '#04120b' : '#c9ced3',
              act: () => { this.setState({ quality: q.label, variant: v }); this.flash('Transcoding at ' + q.label + ' · ' + v); }
            };
          }),
          act: () => {
            this.setState({ quality: q.label, variant: q.variants ? q.variants[0] : '' });
            this.flash(q.label === 'Original' ? 'Direct play · original file' : 'Switched to ' + q.label);
          }
        };
      }),
      audioRows: AUDIO.map((a, i) => ({
        label: a.label, note: a.note,
        mark: s.audio === i ? '✓' : '',
        fg: s.audio === i ? '#00D474' : '#e9ecee',
        bg: s.audio === i ? 'rgba(0,212,116,.07)' : 'transparent',
        act: () => { this.setState({ audio: i }); this.flash('Audio: ' + a.label); }
      })),
      subRows: SUBS.map((x, i) => ({
        label: x.label, note: x.note,
        mark: s.subs === i ? '✓' : '',
        fg: s.subs === i ? '#00D474' : '#e9ecee',
        bg: s.subs === i ? 'rgba(0,212,116,.07)' : 'transparent',
        act: () => { this.setState({ subs: i }); this.flash('Subtitles: ' + x.label); }
      })),
      subsNote: 'Only tracks embedded in this file can be used — external subtitle search is unavailable on this server.',
      speedRows: ['0.5x', '0.75x', '1x', '1.25x', '1.5x', '2x'].map(v => ({
        label: v, note: v === '1x' ? 'Normal' : '',
        mark: s.speed === v ? '✓' : '',
        fg: s.speed === v ? '#00D474' : '#e9ecee',
        bg: s.speed === v ? 'rgba(0,212,116,.07)' : 'transparent',
        act: () => { this.setState({ speed: v }); if (s.party && v !== '1x') this.flash('Speed changes apply to the whole party'); }
      })),

      upNext: s.upNext,
      unArt: T.art,
      unShow: T.t,
      unNum: 'S0' + s.season + ' · E0' + Math.min(s.epIndex + 2, 8),
      unTitle: EP_TITLES[(Math.min(s.epIndex + 1, 7) + s.season) % EP_TITLES.length],
      unMeta: '42m 3s · TV-14',
      unOverview: EP_OV,
      unCountLabel: s.autoplay ? 'Playing in ' + s.countdown + 's' : 'Autoplay paused',
      unRingPct: (s.autoplay ? (10 - s.countdown) / 10 : 0) * 100 + '%',
      unPlayNow: () => this.startNext(),
      unToggleAuto: () => this.setState({ autoplay: !s.autoplay }),
      unAutoLabel: s.autoplay ? 'Cancel autoplay' : 'Resume autoplay',
      unWatchCredits: () => this.setState({ upNext: false, autoplay: false, t: 3575 }),
      unExit: () => this.nav('detail'),
      unSimilar: TITLES.filter(x => x.id !== T.id).slice(0, 6).map(t => ({
        t: t.t, sub: String(t.yr), art: t.art, ink: t.ink,
        open: () => { this.setState({ upNext: false }); this.openTitle(t.id); }
      })),

      pScene: T.art,
      pTitle: T.t,
      pSub: T.kind === 'show'
        ? 'S0' + s.season + ' · E0' + (s.epIndex + 1) + ' — ' + EP_TITLES[(s.epIndex + s.season) % EP_TITLES.length]
        : T.yr + ' · ' + T.ep,
      pTimeLabel: this.fmt(s.t) + ' / ' + this.fmt(3600),
      pPct: Math.round((s.t / 3600) * 100) + '%',
      pSyncBadge: 'In sync · ±120 ms',
      playGlyph: s.playing ? '❚❚' : '▶',
      togglePlay: () => {
        const now = !s.playing;
        this.setState({ playing: now });
        if (s.party) this.flash(now ? 'Resumed for everyone in ' + s.party : 'Paused for everyone in ' + s.party);
      },
      back10: () => this.setState({ t: Math.max(0, s.t - 10) }),
      fwd10: () => this.setState({ t: Math.min(3600, s.t + 10) }),
      nextEp: () => this.startNext(),
      seekClick: e => {
        const r = e.currentTarget.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        this.setState({ t: Math.round(pct * 3600) });
        if (s.party) this.flash('Seeked everyone to ' + this.fmt(pct * 3600));
      },
      exitPlayer: () => { this.setState({ upNext: false, settingsPane: null }); this.nav('detail'); },
      partyActive: !!s.party,
      partyLabel: s.party ? s.party + ' · 3' : '',
      partyPanelOpen: s.partyPanelOpen && !!s.party,
      partyPanelLabel: s.party ? (s.partyPanelOpen ? 'Hide party' : 'Show party') : 'Start watch party',
      togglePartyPanel: () => s.party ? this.setState({ partyPanelOpen: !s.partyPanelOpen }) : this.setState({ modal: 'create' }),
      partyName: s.party || 'Watch party',
      partySyncNote: 'Everyone within ±120 ms · host controls playback',
      partyMembers: FRIENDS.slice(0, 3).map((f, i) => ({
        name: f.name, initials: f.initials, art: f.art,
        state: i === 0 ? 'Host · in sync' : i === 1 ? 'In sync' : 'Buffering',
        stateColor: i === 2 ? '#ffd166' : '#7dffc0'
      })),
      chat: chatFeed,
      quickChat: ['😂', 'No way', 'Called it', 'Rewind that'].map(x => ({
        text: x,
        send: () => this.setState(st => ({ chat: chatFeed.concat([{ name: 'Drew', initials: 'DC', art: FRIENDS[0].art, text: x }]) }))
      })),
      playerTools: [
        { label: 'Skip to credits', bg: 'rgba(255,255,255,.09)', fg: '#e9ecee', act: () => this.setState({ t: 3572, upNext: true, countdown: 10, autoplay: true, settingsPane: null }) },
        { label: 'Subtitles · ' + SUBS[s.subs].label.split(' —')[0], bg: 'rgba(255,255,255,.09)', fg: '#e9ecee', act: () => this.setState({ settingsPane: 'subs' }) },
        { label: 'Settings', bg: 'rgba(255,255,255,.09)', fg: '#e9ecee', act: () => this.setState({ settingsPane: 'root' }) },
        { label: s.party ? 'Invite code J4K2' : 'Watch party', bg: 'rgba(0,212,116,.16)', fg: '#7dffc0', act: () => s.party ? this.flash('Invite code J4K2 copied') : this.setState({ modal: 'create' }) }
      ],

      modalCreate: s.modal === 'create',
      modalJoin: s.modal === 'join',
      modalRequest: s.modal === 'request',
      modalReleases: s.modal === 'releases',
      closeModal: () => this.setState({ modal: null }),
      partyDraftName: "Drew's Movie Night",
      partyScopes: [
        { key: 'everyone', label: 'Everyone', sub: 'Any user on this server can join' },
        { key: 'invite', label: 'Invite only', sub: 'Share a code to let people join' },
        { key: 'select', label: 'Select users', sub: 'Choose specific users from your server' }
      ].map(x => ({
        label: x.label, sub: x.sub,
        bg: s.partyScope === x.key ? 'rgba(0,212,116,.09)' : '#191d21',
        border: s.partyScope === x.key ? 'rgba(0,212,116,.45)' : 'rgba(255,255,255,.06)',
        ring: s.partyScope === x.key ? '#00D474' : 'rgba(255,255,255,.3)',
        dot: s.partyScope === x.key ? '#00D474' : 'transparent',
        act: () => this.setState({ partyScope: x.key })
      })),
      confirmCreateParty: () => {
        this.setState({ party: "Drew's Movie Night", modal: null, partyPanelOpen: true });
        this.play(s.titleId, "Watch party started · code J4K2");
      },
      joinCodeDisplay: s.joinCode || '– – – –',
      codeKeys: ['1','2','3','4','5','6','7','8','9','0','J','K','⌫'].map(k => ({
        label: k, bg: '#191d21',
        press: () => this.setState(st => ({ joinCode: k === '⌫' ? st.joinCode.slice(0, -1) : (st.joinCode + k).slice(0, 4) }))
      })),
      openParties: [
        { name: "Mara's Party", watching: 'Copperline · S02 E07' },
        { name: 'Anime Club', watching: 'Paper Cranes · S01 E01' }
      ].map((p, i) => ({
        name: p.name, watching: p.watching,
        join: () => { this.setState({ party: p.name, modal: null, partyPanelOpen: true }); this.play(TITLES[i + 1].id, 'Joined ' + p.name + ' — synced'); }
      })),

      reqArt: reqT.art, reqTitle: reqT.t,
      reqSub: reqT.yr + ' · ' + (reqT.kind === 'movie' ? 'Movie · Radarr' : 'Series · Sonarr') + ' · ' + reqT.rating + ' ★',
      reqOverview: reqT.ov,
      reqFields: reqOpts.map((o, i) => ({
        label: o.label, value: o.vals[s.reqFields[i] % o.vals.length],
        cycle: () => this.setState(st => {
          const f = st.reqFields.slice(); f[i] = (f[i] + 1) % o.vals.length; return { reqFields: f };
        })
      })),
      autoSearchBg: s.autoSearch ? '#00D474' : 'transparent',
      autoSearchBorder: s.autoSearch ? '#00D474' : 'rgba(255,255,255,.3)',
      autoSearchMark: s.autoSearch ? '✓' : '',
      toggleAutoSearch: () => this.setState({ autoSearch: !s.autoSearch }),
      reqCta: reqT.kind === 'movie' ? 'Add to Radarr' : 'Add to Sonarr',
      confirmRequest: () => {
        this.setState(st => ({ requested: Object.assign({}, st.requested, { [reqT.id]: 1 }), modal: null }));
        this.flash(reqT.t + ' requested' + (s.autoSearch ? ' · searching indexers' : ''));
      },

      relFor: T.t + (T.kind === 'show' ? ' · S0' + s.season + 'E04' : ''),
      relCount: releases.length + ' releases',
      releases,

      toast: s.toast
    };
  }
}
