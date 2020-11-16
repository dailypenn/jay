const http = require('http')
const express = require('express')
const querystring = require('querystring')
const axios = require('axios')
const {
    ApolloServer,
    PubSub,
    gql,
    UserInputError,
} = require('apollo-server-express')
const { RESTDataSource } = require('apollo-datasource-rest')

// Pubsub init and ENUM def
const pubsub = new PubSub();
const ARTICLE_EDITED = 'ARTICLE_EDITED'

const typeDefs = gql`
    type Subscription {
        articleEdited: Article
    }

    type Query {
        article(slug: String) : Article
        articles(first: Int, cursor: String, section: String): Articles
    }

    type Article {
        slug: String
        headline: String
        abstract: String
        content: String
    }

    type Articles {
        totalCount: Int
        edges: [ArticleNode]
        hasNextPage: Boolean
    }

    type ArticleNode {
        article: Article
        cursor: String
    }
`

// TODO: LRU Cache on each section + checking whether a section's datetime
// has been modified to delete/regenerate the cache
// use the         "modified_at": "2018-08-17 14:51:32",
// property of the response from /section/{slug}

const DEFAULT_PAGE = 10;

class ContentAPI extends RESTDataSource {
    constructor() {
        super();
        this.baseURL = `https://thedp.com/article/`
    }

    async getArticle(slug) {
        const { article } = (await this.get(`${slug}.json`)) || {}
        return article
    }

    async getArticles(cursor, first = 5, section = `news`) {
        const queryString = (new Buffer(cursor)).toString();
        const { section: cursorSection, rawIndex } = querystring.decode(queryString);
        
        // Make sure the cursorSection and section are the same, pagination is borked otherwise
        if (cursorSection !== section) {
            throw new UserInputError(`Cursor section ${cursorSection} and requested section ${section} do not match!`)
        }
        const index = parseInt(rawIndex)
        // Make sure the index is a valid int
        if (isNaN(index)) {
            throw new UserInputError(`Index ${rawIndex} is not an integer!`)
        }
        
        const pageSize = Math.max(first, DEFAULT_PAGE)
        let currPage = Math.floor(index / pageSize)
        const pageOffset = index % currPage;

        const articles = []
        do {

        } while ()
        const ceoQuery = querystring.encode({
            page: currPage,
            per_page: pageSize
        })
        const { articles } = (await this.get(`${section}.json?${ceoQuery}`)) || {}
        return articles;
    }
}

const resolvers = {
    Subscription: {
        articleEdited: {
            subscribe: () => pubsub.asyncIterator([ARTICLE_EDITED])
        },
    },
    Query: {
        article: async (_, { slug }, { dataSources }) => dataSources.contentAPI.getArticle(slug),
        articles: async (_, { cursor = null, first, section }, { dataSources }) => {
            return dataSources.contentAPI.getArticles(cursor, first, section)
        }
    }
}

// REST routes
const app = express();

app.post('/connector', async (req, res) => {
    // TODO: JWT Auth
    await pubsub.publish(ARTICLE_EDITED, { articleEdited: req.body })
    res.send("nice")
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

server.applyMiddleware({ app })
const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

httpServer.listen(5000, () => {
    console.log(`Server ready at port 5000 ${server.graphqlPath}`)
    console.log('Subscriptions ready at ws://localhost:5000')
})
