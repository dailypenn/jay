const moment = require('moment')

const TIME_AGO = published_at =>
  moment(published_at, 'YYYY-MM-DD HH:mm:ss').fromNow()

const DAYS_AGO = published_at =>
  moment().diff(moment(published_at, 'YYYY-MM-DD HH:mm:ss'), 'days')

const getRandomIntInclusive = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min)

const addPhotoCredits = content => {
  
}

module.exports = { TIME_AGO, DAYS_AGO, getRandomIntInclusive, addPhotoCredits }
