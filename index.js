const express = require('express')
const querystring = require('querystring')
const {
  ApolloServer,
  PubSub,
  UserInputError
} = require('apollo-server-express')
const { RESTDataSource } = require('apollo-datasource-rest')
const axios = require('axios')
const HTMLParser = require('node-html-parser')

const typeDefs = require('./schema')
const {
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
} = require('./constants')
const {
  TIME_AGO,
  DAYS_AGO,
  getRandomIntInclusive,
  addPhotoCredits
} = require('./helperFunctions')

// Pubsub init and ENUM def
const pubsub = new PubSub()
const ARTICLE_EDITED = 'ARTICLE_EDITED'

const parseArticle = (
  article,
  publication,
  section,
  isSectionArticle = false
) => {
  const {
    published_at,
    authors,
    slug,
    tags,
    dominantMedia = {},
    content
  } = article

  // add embedded photo credits
  const root = HTMLParser.parse(content)

  const imgs = root.querySelectorAll('.media-embed')

  imgs.forEach(async img => {
    const uuid = img.getAttribute('data-uuid')
    // get the embedded author credit using the uuid
    const { data } = await axios.get(
      `https://www.thedp.com/search.json?a=1&s=${uuid}&ty=media`
    )
    const authors = data.items[0].authors.map(({ name }) => name)
    const authorString = authors.join(', ')
    const credit = authorString ? `Credit: ${authorString}` : ''
    const newNode = `<figure>${HTMLParser.parse(
      img.outerHTML
    )}<figcaption>${credit}</figcaption></figure>`
    root.exchangeChild(img, newNode)
  })
  article.content = root.toString()

  // generate the correct slug
  const firstIndex = published_at.indexOf('-')
  const year = published_at.substring(0, firstIndex)
  const month = published_at.substring(
    firstIndex + 1,
    published_at.indexOf('-', firstIndex + 1)
  )
  article.slug = `${year}/${month}/${slug}`

  // parse authors
  article.authors = authors.map(({ name, slug }) => ({ name, slug }))

  if (dominantMedia.authors) {
    article.dominantMedia.authors = dominantMedia.authors.map(
      ({ name, slug }) => ({ name, slug })
    )
  }

  // parse tag
  if (isSectionArticle) {
    // this is a section article from the discover page
    article.tag = section

    if (article.tag in TAG_TO_NAME) {
      article.tag = TAG_TO_NAME[article.tag]
    }
  } else {
    // home article/ search article/ setting article
    let TAGS = []
    switch (publication) {
      case DP:
        TAGS = DP_TAGS
        break
      case STREET:
        TAGS = STREET_TAGS
        break
      default:
        TAGS = UTB_TAGS
    }

    if (TAGS.includes(section)) {
      article.tag = section
    } else if (DP_CEO_TAGS.includes(section)) {
      article.tag = section.split('-')[2]
    } else {
      const article_tags = tags.map(({ slug }) => slug)
      for (let i = 0; i < TAGS.length; i++) {
        if (article_tags.includes(TAGS[i])) {
          article.tag = TAGS[i]
          break
        }
      }
    }

    if (article.tag in TAG_TO_NAME) {
      article.tag = TAG_TO_NAME[article.tag]
    }

    if (article.tag) {
      article.tag = article.tag.replace('-', ' ')
    } else {
      // verify if this is ok
      article.tag = 'uncategorized'
    }
  }

  delete article.tags

  // parse published_at
  article.published_at = TIME_AGO(published_at)

  return article
}

// TODO: LRU Cache on each section + checking whether a section's datetime
// has been modified to delete/regenerate the cache
// use the         "modified_at": "2018-08-17 14:51:32",
// property of the response from /section/{slug}

class ContentAPI extends RESTDataSource {
  constructor() {
    super()
    this.publication = ''
  }

  get baseURL() {
    switch (this.publication) {
      case STREET:
        return `https://www.34st.com/`
      case UTB:
        return `https://www.underthebutton.com/`
      default:
        return `https://thedp.com/`
    }
  }

  getArticle = async (publication, slug, isRandom) => {
    this.publication = publication

    if (publication === UTB && isRandom) {
      const randomSection =
        UTB_RANDOM_SECTIONS[
          Math.floor(Math.random() * UTB_RANDOM_SECTIONS.length)
        ]

      const { section, pages } = randomSection

      const { articles } = await this.get(`section/${section}.json`, {
        page: getRandomIntInclusive(1, pages),
        per_page: 1
      })

      const article = articles[0]

      return parseArticle(article, UTB, section)
    }

    const { article } = await this.get(`article/${slug}.json`)

    return parseArticle(article, publication, '')
  }

  async getAuthor(slug) {
    const { author, articles } = (await this.get(`staff/${slug}.json`)) || {}
    return { ...author, articles }
  }

  decideDPCarouselArticle = async section => {
    const { articles } = await this.get(`section/${section}.json`, {
      page: 1,
      per_page: 1
    })

    const article = articles[0]
    const { published_at } = article
    if (DAYS_AGO(published_at) >= 4) {
      return null
    }

    return parseArticle(article, this.publication, section.split('-')[2])
  }

  async getHomeArticles(
    first = 5,
    section = 'news',
    publication = 'The Daily Pennsylvanian'
  ) {
    this.publication = publication

    if (publication === DP && section === 'top') {
      let newsNumber = 2
      let topArticles = []

      const opinionArticle = await this.decideDPCarouselArticle(
        'app-top-opinion'
      )
      if (opinionArticle) {
        topArticles.push(opinionArticle)
      } else {
        newsNumber++
      }

      const sportsArticle = await this.decideDPCarouselArticle('app-top-sports')
      if (sportsArticle) {
        topArticles.push(sportsArticle)
      } else {
        newsNumber++
      }

      const multimediaArticle = await this.decideDPCarouselArticle(
        'app-top-multimedia'
      )
      if (multimediaArticle) {
        topArticles.push(multimediaArticle)
      } else {
        newsNumber++
      }

      const { articles } = await this.get(`section/app-top-news.json`, {
        page: 1,
        per_page: newsNumber
      })
      const newsArticles = articles.map(article =>
        parseArticle(article, publication, 'news')
      )

      return newsArticles.concat(topArticles)
    }

    const { articles } = await this.get(`section/${section}.json`, {
      page: 1,
      per_page: first
    })
    return articles.map(article => parseArticle(article, publication, section))
  }

  // TODO: add page number / support fetchMore
  async getSectionArticles(
    section = 'news',
    publication = 'The Daily Pennsylvanian'
  ) {
    this.publication = publication

    const { articles } = await this.get(`section/${section}.json`, {
      page: 1,
      per_page: DEFAULT_PAGE
    })
    return articles.map(article =>
      parseArticle(article, publication, section, true)
    )
  }

  // async getSectionArticles(
  //   first = 5,
  //   cursor = '',
  //   section = `news`,
  //   publication = 'The Daily Pennsylvanian'
  // ) {
  //   this.publication = publication
  //   const queryString = new Buffer(cursor, 'base64').toString('ascii')
  //   const { section: cursorSection, index: rawIndex = 0 } = querystring.decode(
  //     queryString
  //   )
  //   // Make sure the cursorSection and section are the same, pagination is borked otherwise
  //   if (cursorSection && cursorSection !== section)
  //     throw new UserInputError(
  //       `Cursor section ${cursorSection} and requested section ${section} do not match!`
  //     )

  //   const index = parseInt(rawIndex)
  //   // Make sure the index is a valid int
  //   if (isNaN(index))
  //     throw new UserInputError(`Index ${rawIndex} is not an integer!`)

  //   // TODO: optimize pagination
  //   const pageSize = DEFAULT_PAGE
  //   let currPage = Math.floor(index / pageSize) + 1
  //   let pageOffset = index % pageSize

  //   const articles = []
  //   do {
  //     const ceoQuery = querystring.encode({
  //       page: currPage,
  //       per_page: pageSize
  //     })
  //     const { articles: pageArticles } =
  //       (await this.get(`section/${section}.json?${ceoQuery}`)) || {}
  //     pageArticles.slice(pageOffset).forEach(el => {
  //       if (articles.length < first) articles.push(el)
  //     })
  //     currPage += 1
  //     pageOffset = 0
  //   } while (articles.length < first)

  //   // TODO: actually check if there's a next page
  //   return {
  //     edges: articles.map((el, idx) => ({
  //       article: parseArticle(el, publication, section, true),
  //       cursor: new Buffer(
  //         querystring.encode({
  //           section,
  //           index: index + idx + 1
  //         })
  //       ).toString('base64')
  //     })),
  //     hasNextPage: true
  //   }
  // }

  getSearchArticles = async (filter, publication) => {
    this.publication = publication

    if (filter) {
      const { items: articles } = await this.get(
        `search.json?a=1&s=${filter}&ty=article`
      )
      return articles.map(article => parseArticle(article, publication, ''))
    }

    return []
  }
}

const resolvers = {
  Subscription: {
    articleEdited: {
      subscribe: () => pubsub.asyncIterator([ARTICLE_EDITED])
    }
  },
  Query: {
    article: async (_, { publication, slug, isRandom }, { dataSources }) =>
      dataSources.contentAPI.getArticle(publication, slug, isRandom),
    homeArticles: async (
      _,
      { first, section, publication },
      { dataSources }
    ) => {
      return dataSources.contentAPI.getHomeArticles(first, section, publication)
    },
    sectionArticles: async (_, { section, publication }, { dataSources }) => {
      // console.log('article triggered')
      return dataSources.contentAPI.getSectionArticles(section, publication)
    },
    searchArticles: async (_, { filter, publication }, { dataSources }) => {
      return dataSources.contentAPI.getSearchArticles(filter, publication)
    }
    // author: async (_, { slug }, { dataSources }) =>
    //   dataSources.contentAPI.getAuthor(slug)
  }
}

// REST routes
const app = express()

app.post('/connector', async (req, res) => {
  // TODO: JWT Auth
  await pubsub.publish(ARTICLE_EDITED, { articleEdited: req.body })
  res.send('nice')
})

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => {
    return {
      contentAPI: new ContentAPI()
    }
  }
})

app.get('/', (req, res) => {
  res.send('welcome to DP GraphQL server')
})

server.applyMiddleware({ app })
// const httpServer = http.createServer(app)
// server.installSubscriptionHandlers(httpServer)

const PORT = process.env.PORT || 5000

app.listen(PORT, () =>
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
  )
)

// httpServer.listen(PORT, () => {
//   console.log(`Server ready at port ${PORT} ${server.graphqlPath}`)
//   console.log(`Subscriptions ready at ws://localhost:${PORT}`)
// })
