const { gql } = require('apollo-server-express')

const typeDefs = gql`
  type Subscription {
    articleEdited: Article
  }

  type Query {
    article(slug: String): Article
    articles(first: Int, cursor: String, section: String): ArticleInfo
    author(slug: String): Author
    searchArticles(filter: String): [Article]
  }

  type DominantMedia {
    attachment_uuid: String
    extension: String
  }

  type Article {
    slug: String
    headline: String
    abstract: String
    content: String
    published_at: String
    dominantMedia: DominantMedia
    authors: [Author]
  }

  type ArticleInfo {
    edges: [ArticleNode]
    hasNextPage: Boolean
  }

  type ArticleNode {
    article: Article
    cursor: String
  }

  type Author {
    name: String
    slug: String
  }
`

module.exports = typeDefs