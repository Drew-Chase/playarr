// TODO: wire to /api/continue-watching
export const continueWatching = [
  { id: '1', title: 'Northern Bearings', sub: 'S2 \u00b7 E04 \u00b7 38m left', progress: 32, runtime: '38m', episode: 'E04' },
  { id: '2', title: 'Chrome Cathedral', sub: '52m left', progress: 58, runtime: '52m' },
  { id: '3', title: 'The Sleepless Atlas', sub: 'S1 \u00b7 E07 \u00b7 12m left', progress: 78, runtime: '12m', episode: 'E07' },
  { id: '4', title: 'Lighthouse Country', sub: '1h 04m left', progress: 24, runtime: '1h 04m' },
  { id: '5', title: 'Iron Glass Cities', sub: 'S3 \u00b7 E02 \u00b7 22m left', progress: 64, runtime: '22m', episode: 'E02' },
  { id: '6', title: 'Silver in the Dust', sub: '47m left', progress: 15, runtime: '47m' },
];

// TODO: wire to /api/recently-added/movies
export const recentMovies = [
  { id: '10', title: 'The Long Distance', year: '2025', watched: false },
  { id: '11', title: 'Coastal Recovery', year: '2024', watched: true },
  { id: '12', title: 'Pale November', year: '2025', watched: false },
  { id: '13', title: 'Salt and Borrowed', year: '2024', watched: false },
  { id: '14', title: 'Rivers in October', year: '2023', watched: true },
  { id: '15', title: 'A Fragile Thing', year: '2025', watched: false },
  { id: '16', title: 'The Quiet Year', year: '2024', watched: false },
  { id: '17', title: 'Empty Rooms', year: '2022', watched: false },
];

// TODO: wire to /api/recently-added/shows
export const recentShows = [
  { id: '20', title: 'Northern Bearings', year: '2024', watched: false },
  { id: '21', title: 'Chrome Cathedral', year: '2025', watched: false },
  { id: '22', title: 'Iron Glass Cities', year: '2024', watched: false },
  { id: '23', title: 'The Sleepless Atlas', year: '2025', watched: true },
  { id: '24', title: 'Plainsong', year: '2023', watched: false },
  { id: '25', title: 'House of Reasonable Doubt', year: '2024', watched: false },
  { id: '26', title: 'Patient Zero Hour', year: '2025', watched: false },
  { id: '27', title: 'The Marigolds', year: '2024', watched: false },
];

// TODO: wire to /api/suggested
export const suggested = [
  { id: '30', title: 'Western Approaches', year: '2024', watched: false },
  { id: '31', title: 'Field Notes', year: '2023', watched: false },
  { id: '32', title: 'Daylight Operations', year: '2025', watched: false },
  { id: '33', title: 'A Theory of Tides', year: '2022', watched: true },
  { id: '34', title: 'The Last Cartographer', year: '2024', watched: false },
  { id: '35', title: 'Engine Music', year: '2025', watched: false },
  { id: '36', title: 'Driftwood', year: '2023', watched: false },
  { id: '37', title: 'Counterweight', year: '2024', watched: false },
];

// TODO: wire to /api/collections
export const collections = [
  { id: '40', title: 'Best of 2025', sub: '24 films' },
  { id: '41', title: 'Quiet Films', sub: '17 films' },
  { id: '42', title: 'Rainy Sundays', sub: '32 films' },
  { id: '43', title: 'Late Night Rewatch', sub: '21 films' },
  { id: '44', title: 'Director Spotlight', sub: '12 films' },
  { id: '45', title: 'Studio Era', sub: '40 films' },
];

export const featured = {
  id: 'f1',
  title: 'Northern Bearings',
  year: '2024',
  rating: 'TV-MA',
  runtime: '8 episodes',
  resolution: '4K HDR',
  audio: 'Dolby Atmos',
  genres: ['Drama', 'Mystery', 'Thriller'],
  synopsis: "On a fog-bound stretch of the Maine coast, a recently transferred detective unearths a thirty-year-old conspiracy buried beneath a town that would prefer she didn't. A patient, weather-bitten thriller about the price of small towns and longer memories.",
  director: 'Eleanor Vance',
  writers: 'Marcus Tate, Imani Okafor',
};

export const featuredMovie = {
  id: 'f2',
  title: 'The Long Distance',
  year: '2025',
  rating: 'R',
  runtime: '2h 14m',
  resolution: '4K HDR',
  audio: 'Atmos \u00b7 5.1',
  genres: ['Drama', 'Romance'],
  synopsis: "Two researchers stationed at opposite poles of the earth fall in love over a delayed satellite line. A decade later, one of them shows up at the other's door without a word of warning.",
  director: 'Hana Bregovi\u0107',
  writers: 'Hana Bregovi\u0107',
};

export const cast = [
  { name: 'Imani Okafor', role: 'Detective Reyes' },
  { name: 'L\u00e9a Brassard', role: 'Margot' },
  { name: 'Sven Halvorsen', role: 'The Engineer' },
  { name: 'Dara Patel', role: 'Asha Vora' },
  { name: 'Theo Marchetti', role: 'Father Conrad' },
  { name: 'Nadia Constantine', role: 'Beatrice' },
  { name: 'Akira Tomine', role: 'Yuki' },
  { name: 'Florent Mbongo', role: 'Henri' },
  { name: 'Sasha Velikovsky', role: 'Mira Petrov' },
  { name: 'Calla Ridgeway', role: 'June' },
  { name: 'Idris Cromwell', role: 'The Captain' },
  { name: 'Mei-Ling Zhao', role: 'Dr. Chen' },
  { name: 'Bram Hollister', role: 'Walter' },
];

export const episodes = [
  { id: 'e1', ep: 'E01', title: 'Cold Open', runtime: '54m', watched: true, syn: 'A body washes ashore on a quiet morning. Reyes is two years out of the academy and already too tired for this.' },
  { id: 'e2', ep: 'E02', title: 'Names of the Missing', runtime: '49m', watched: true, syn: 'A wedding photograph from 1987. Three of the people in it are dead. The fourth has stopped returning calls.' },
  { id: 'e3', ep: 'E03', title: 'Sea Glass', runtime: '52m', watched: true, syn: 'Margot returns to the lighthouse. The weather turns. Conrad makes an offer the family cannot refuse.' },
  { id: 'e4', ep: 'E04', title: 'The Long Way Around', runtime: '47m', watched: false, syn: 'Reyes drives north on a tip that almost certainly leads nowhere \u2014 until a state trooper recognizes the name.' },
  { id: 'e5', ep: 'E05', title: 'Salt', runtime: '51m', watched: false, syn: 'Old grudges resurface at the harbor. Asha discovers what her grandfather buried under the dock in 1962.' },
  { id: 'e6', ep: 'E06', title: 'A Plain Reckoning', runtime: '55m', watched: false, syn: 'Conrad delivers a sermon that names no one and accuses everyone. Beatrice walks out before the second hymn.' },
  { id: 'e7', ep: 'E07', title: 'Inheritance', runtime: '49m', watched: false, syn: 'The will is read. Margot inherits the building and the debt. Henri inherits the silence.' },
  { id: 'e8', ep: 'E08', title: 'After the Storm', runtime: '58m', watched: false, syn: 'Reyes makes the arrest she has been avoiding for ten weeks. The town does not thank her for it.' },
];

export const similarTitles = [
  { id: '50', title: 'The Quiet Year', year: '2024', watched: false },
  { id: '51', title: 'Lighthouse Country', year: '2023', watched: false },
  { id: '52', title: 'Plainsong', year: '2023', watched: false },
  { id: '53', title: 'Salt and Borrowed', year: '2024', watched: false },
  { id: '54', title: 'A Theory of Tides', year: '2022', watched: true },
  { id: '55', title: 'Driftwood', year: '2023', watched: false },
  { id: '56', title: 'Pale November', year: '2025', watched: false },
];

export const movies = [
  { id: '60', title: '14 South', year: '2024', watched: false },
  { id: '61', title: 'A Fragile Thing', year: '2025', watched: false },
  { id: '62', title: 'After the Tide', year: '2023', watched: true },
  { id: '63', title: 'All the Light', year: '2022', watched: true },
  { id: '64', title: 'Anvil & Ash', year: '2024', watched: false },
  { id: '65', title: 'Battery', year: '2025', watched: false },
  { id: '66', title: 'The Black Mile', year: '2023', watched: false },
  { id: '67', title: 'Borrowed Hours', year: '2024', watched: true },
  { id: '68', title: 'Brass Knuckles', year: '2022', watched: false },
  { id: '69', title: 'Cardinal Direction', year: '2025', watched: false },
  { id: '70', title: 'Coastal Recovery', year: '2024', watched: true },
  { id: '71', title: 'Counterweight', year: '2024', watched: false },
  { id: '72', title: 'Daylight Operations', year: '2025', watched: false },
  { id: '73', title: 'Driftwood', year: '2023', watched: false },
  { id: '74', title: 'Empty Rooms', year: '2022', watched: false },
  { id: '75', title: 'Engine Music', year: '2025', watched: false },
  { id: '76', title: 'Field Notes', year: '2023', watched: false },
  { id: '77', title: 'First Frost', year: '2024', watched: false },
  { id: '78', title: 'Foxglove', year: '2025', watched: true },
  { id: '79', title: 'Glass House', year: '2023', watched: false },
  { id: '80', title: 'Granite', year: '2024', watched: false },
  { id: '81', title: 'The Halfway Country', year: '2022', watched: false },
  { id: '82', title: 'Harborlight', year: '2025', watched: false },
  { id: '83', title: 'Hollow Earth', year: '2024', watched: false },
];

export const calendarDays = [
  { day: 'MON', date: 'May 4', items: [
    { title: 'Northern Bearings \u00b7 S2E05', kind: 'episode' as const, status: 'scheduled' as const, time: '9:00 PM' },
  ]},
  { day: 'TUE', date: 'May 5', items: [
    { title: 'The Marigolds \u00b7 S1E03', kind: 'episode' as const, status: 'scheduled' as const, time: '8:00 PM' },
    { title: 'Anvil & Ash', kind: 'release' as const, status: 'scheduled' as const, time: 'Theatrical' },
  ]},
  { day: 'WED', date: 'May 6', items: [
    { title: 'Coastal Recovery', kind: 'request' as const, status: 'pending' as const, time: 'Requested' },
  ]},
  { day: 'THU', date: 'May 7', items: [
    { title: 'Chrome Cathedral \u00b7 S3E11', kind: 'episode' as const, status: 'scheduled' as const, time: '10:00 PM' },
    { title: 'Iron Glass Cities \u00b7 S3E03', kind: 'episode' as const, status: 'scheduled' as const, time: '10:00 PM' },
  ]},
  { day: 'FRI', date: 'May 8', items: [
    { title: 'The Quiet Year', kind: 'release' as const, status: 'scheduled' as const, time: 'Streaming' },
    { title: 'Plainsong \u00b7 S2E08', kind: 'episode' as const, status: 'scheduled' as const, time: '9:00 PM' },
  ]},
  { day: 'SAT', date: 'May 9', items: [] },
  { day: 'SUN', date: 'May 10', items: [
    { title: 'Patient Zero Hour \u00b7 S1E01', kind: 'episode' as const, status: 'scheduled' as const, time: 'Premiere \u00b7 9:00 PM' },
  ]},
];
