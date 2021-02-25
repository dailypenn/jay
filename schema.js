const { gql } = require('apollo-server-express')

const typeDefs = gql`
  type Subscription {
    articleEdited: Article
  }

  type Query {
    article(publication: String, slug: String, isRandom: Boolean): Article
    sectionArticles(section: String, publication: String): [ArticleMetaData]
    author(slug: String): Author
    homeArticles(first: Int, section: String, publication: String): [ArticleMetaData]
    searchArticles(filter: String, publication: String): [ArticleMetaData]
  }

  type DominantMedia {
    attachment_uuid: String
    extension: String
    authors: [Author]
  }

  type Article {
    slug: String
    headline: String
    abstract: String
    content: String
    published_at: String
    dominantMedia: DominantMedia
    authors: [Author]
    tag: String
  }

  type ArticleMetaData {
    slug: String
    headline: String
    abstract: String
    published_at: String
    dominantMedia: DominantMedia
    authors: [Author]
    tag: String
    content: String
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
