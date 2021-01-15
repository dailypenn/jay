const http = require('http')
const express = require('express')
const querystring = require('querystring')
const {
  ApolloServer,
  PubSub,
  UserInputError
} = require('apollo-server-express')
const { RESTDataSource } = require('apollo-datasource-rest')

const typeDefs = require('./schema')

// Pubsub init and ENUM def
const pubsub = new PubSub()
const ARTICLE_EDITED = 'ARTICLE_EDITED'

const parseArticle = article => {
  const { published_at, authors, slug } = article

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
  return article
}

// TODO: LRU Cache on each section + checking whether a section's datetime
// has been modified to delete/regenerate the cache
// use the         "modified_at": "2018-08-17 14:51:32",
// property of the response from /section/{slug}

const DEFAULT_PAGE = 50
const STREET = 'street'
const UTB = 'utb'

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

  async getArticle(slug) {
    const { article } = (await this.get(`article/${slug}.json`)) || {}
    return parseArticle(article)
  }

  async getAuthor(slug) {
    const { author, articles } = (await this.get(`staff/${slug}.json`)) || {}
    return { ...author, articles }
  }

  async getArticles(
    first = 5,
    cursor = '',
    section = `news`,
    publication = 'dp'
  ) {
    this.publication = publication
    const queryString = new Buffer(cursor, 'base64').toString('ascii')
    const { section: cursorSection, index: rawIndex = 0 } = querystring.decode(
      queryString
    )
    // Make sure the cursorSection and section are the same, pagination is borked otherwise
    if (cursorSection && cursorSection !== section)
      throw new UserInputError(
        `Cursor section ${cursorSection} and requested section ${section} do not match!`
      )

    const index = parseInt(rawIndex)
    // Make sure the index is a valid int
    if (isNaN(index))
      throw new UserInputError(`Index ${rawIndex} is not an integer!`)

    // TODO: optimize pagination
    const pageSize = DEFAULT_PAGE
    let currPage = Math.floor(index / pageSize) + 1
    let pageOffset = index % pageSize

    const articles = []
    do {
      const ceoQuery = querystring.encode({
        page: currPage,
        per_page: pageSize
      })
      const { articles: pageArticles } =
        (await this.get(`section/${section}.json?${ceoQuery}`)) || {}
      pageArticles.slice(pageOffset).forEach(el => {
        if (articles.length < first) articles.push(el)
      })
      currPage += 1
      pageOffset = 0
    } while (articles.length < first)

    // TODO: actually check if there's a next page
    return {
      edges: articles.map((el, idx) => ({
        article: parseArticle(el),
        cursor: new Buffer(
          querystring.encode({
            section,
            index: index + idx + 1
          })
        ).toString('base64')
      })),
      hasNextPage: true
    }
  }

  getSearchArticles = async filter => {
    if (filter) {
      const { items: articles } = await this.get(
        `search.json?a=1&s=${filter}&ty=article`
      )
      return articles.map(article => parseArticle(article))
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
    article: async (_, { slug }, { dataSources }) =>
      dataSources.contentAPI.getArticle(slug),
    articles: async (
      _,
      { first, cursor, section, publication, filter },
      { dataSources }
    ) => {
      console.log('article triggered')
      return dataSources.contentAPI.getArticles(
        first,
        cursor,
        section,
        publication
      )
    },
    searchArticles: async (_, { filter }, { dataSources }) => {
      return dataSources.contentAPI.getSearchArticles(filter)
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
