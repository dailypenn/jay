const moment = require('moment')

const TIME_AGO = published_at =>
  moment(published_at, 'YYYY-MM-DD HH:mm:ss').fromNow()

const DAYS_AGO = published_at =>
  moment(published_at, 'YYYY-MM-DD HH:mm:ss').diff(moment(), 'days')

module.exports = { TIME_AGO, DAYS_AGO }
