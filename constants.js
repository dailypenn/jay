const DP_TAGS = ['news', 'sports', 'opinion', 'multimedia']

const DP_CEO_TAGS = [
  'app-front-news',
  'app-front-opinion',
  'app-front-sports',
  'app-front-multimedia'
]

const STREET_TAGS = [
  'style',
  'lastpage',
  'word-on-the-street',
  'highbrow',
  'ego',
  'music',
  'film',
  'tv',
  'television',
  'drama',
  'features',
  'food',
  'arts',
  'lowbrow',
  'backpage',
  'letter',
  'the-round-up',
  'overheads',
  'playlists',
  'review',
  'entertainment',
  'campus-life',
  'tech',
  'vice-and-virtue',
  'humor',
  'focus'
]

const UTB_TAGS = ['news', 'opinion', 'choose-your-own-adventure', 'quiz']

const TAG_TO_NAME = {
  'choose-your-own-adventure': 'adventure',
  'adventure-start': 'adventure'
}

const UTB_RANDOM_SECTIONS = [
  { section: 'news', pages: 1608 },
  { section: 'opinion', pages: 583 },
  { section: 'adventure-start', pages: 4 }
]

const DP = 'The Daily Pennsylvanian'
const STREET = '34th Street'
const UTB = 'Under the Button'

const DEFAULT_PAGE = 10

module.exports = {
  DP_TAGS,
  DP_CEO_TAGS,
  STREET_TAGS,
  UTB_TAGS,
  TAG_TO_NAME,
  DP,
  STREET,
  UTB,
  DEFAULT_PAGE,
  UTB_RANDOM_SECTIONS
}
