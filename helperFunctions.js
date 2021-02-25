const moment = require('moment')
const axios = require('axios')
const HTMLParser = require('node-html-parser')

const {
  DP,
  STREET,
  DP_TAGS,
  DP_CEO_TAGS,
  STREET_TAGS,
  UTB_TAGS,
  TAG_TO_NAME,
} = require('./constants')

const TIME_AGO = published_at =>
  moment(published_at, 'YYYY-MM-DD HH:mm:ss').fromNow()

const DAYS_AGO = published_at =>
  moment().diff(moment(published_at, 'YYYY-MM-DD HH:mm:ss'), 'days')

const getRandomIntInclusive = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min)

const addPhotoCredits = async content => {
  // add embedded photo credits
  const root = HTMLParser.parse(content)

  const imgs = root.querySelectorAll('.media-embed')

  const imgsPromise = imgs.map(img => {
    const uuid = img.getAttribute('data-uuid')
    return axios.get(`https://www.thedp.com/search.json?a=1&s=${uuid}&ty=media`)
  })

  const imgsAuthors = await Promise.all(imgsPromise)

  imgsAuthors.forEach((resp, idx) => {
    const { data } = resp
    const authors = data.items[0].authors.map(({ name }) => name)
    const authorString = authors.join(', ')
    const credit = authorString ? `Credit: ${authorString}` : ''
    const newNode = `<figure>${HTMLParser.parse(
      imgs[idx].outerHTML
    )}<figcaption>${credit}</figcaption></figure>`
    root.exchangeChild(imgs[idx], newNode)
  })

  return root.toString()
}

const parseArticleMetaData = (
  article,
  publication,
  section,
  isSectionArticle = false
) => {
  const { published_at, authors, slug, tags, dominantMedia = {} } = article
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

const parseArticle = async (
  article,
  publication,
  section,
  isSectionArticle = false
) => {
  article = parseArticleMetaData(article, publication, section, isSectionArticle)
  article.content = await addPhotoCredits(article.content)
  return article
}

module.exports = {
  DAYS_AGO,
  getRandomIntInclusive,
  parseArticleMetaData,
  parseArticle
}
