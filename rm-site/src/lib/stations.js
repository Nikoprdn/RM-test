// Les 4 webradios (flux Infomaniak) — partagé entre le serveur (pages) et le lecteur.
export const STATIONS = [
  {
    key: 'montecarlo', name: 'Monte-Carlo', color: '#E4032E', ink: '#FFFFFF', wash: 'rgba(228,3,46,.55)',
    stream: 'https://radiomonaco.ice.infomaniak.ch/radiomonaco-128.mp3',
    logo: 'wr-montecarlo-allwhite.png', logoInk: 'wr-montecarlo-ink.png', photo: 'rm-casino.jpg', pos: '50% 30%',
    line: 'The sound of Monte-Carlo',
    bands: [{ city: 'Monaco', f: '98,2 FM' }, { city: 'Nice', f: '95,4 FM' }, { city: 'Cannes & Grasse', f: '103,2 FM' }, { city: 'Saint-Tropez', f: '95,4 FM' }, { city: '', f: 'DAB+' }]
  },
  {
    key: 'paris', name: 'Paris', color: '#E4032E', ink: '#FFFFFF', wash: 'rgba(228,3,46,.5)',
    stream: 'https://radiomonacoparis.ice.infomaniak.ch/radiomonacoparis-320.aac',
    logo: 'wr-paris-allwhite.png', logoInk: 'wr-paris-ink.png', photo: 'rm-paris.jpg', pos: '50% 40%',
    line: 'La webradio Radio Monaco', bands: [{ city: '', f: 'DAB+' }]
  },
  {
    key: 'mixdj', name: '100 % Mix DJ', color: '#F59C00', ink: '#141218', wash: 'rgba(245,156,0,.55)',
    stream: 'https://mixdj.ice.infomaniak.ch/mixdj-128.aac',
    logo: 'wr-mixdj-allwhite.png', logoInk: 'wr-mixdj-ink.png', photo: 'rm-dj.jpg', pos: '40% 50%',
    line: 'DJ sets non-stop', bands: [{ city: '', f: 'Web' }]
  },
  {
    key: 'nightmood', name: 'Night Mood', color: '#8A5AA1', ink: '#FFFFFF', wash: 'rgba(138,90,161,.6)',
    stream: 'https://nightmood.ice.infomaniak.ch/nightmood-128.aac',
    logo: 'wr-nightmood-allwhite.png', logoInk: 'wr-nightmood-ink.png', photo: 'rm-night.jpg', pos: '35% 50%',
    line: 'La playlist de Pampa', bands: [{ city: '', f: 'Web' }]
  }
];
