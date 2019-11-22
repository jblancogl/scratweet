const puppeteer = require('puppeteer')
const agent = require('secure-random-user-agent')
const { DateTime } = require('luxon')
const argv = require('yargs').argv
const fs = require('fs')

async function getProfile (page) {
  try {
    let data = await page.evaluate(() => {
      const id = document.querySelector('.ProfileNav')
      const username = document.querySelector('.ProfileHeaderCard > h2 > a > span > b')
      const fullname = document.querySelector('.ProfileHeaderCard > h1 > a')
      const bio = document.querySelector('.ProfileHeaderCard > p')
      const location = document.querySelector('.ProfileHeaderCard-locationText.u-dir')
      const url = document.querySelector('.ProfileHeaderCard-urlText.u-dir > a')
      const avatar = document.querySelector('.ProfileCanopy-avatar > div > a > img')
      const background = document.querySelector('.ProfileCanopy-headerBg > img')
      const verified = document.querySelector('.ProfileHeaderCard > h1 > span > a > span')
      const tweets = document.querySelector('.ProfileNav-item--tweets > a > span.ProfileNav-value')
      const following = document.querySelector('.ProfileNav-item--following > a > span.ProfileNav-value')
      const followers = document.querySelector('.ProfileNav-item--followers > a > span.ProfileNav-value')
      const likes = document.querySelector('.ProfileNav-item--favorites > a > span.ProfileNav-value')
      const date = document.querySelector('.ProfileHeaderCard-joinDateText.js-tooltip.u-dir')

      return {
        id: id ? Number(id.dataset.userId) : null,
        username: username ? username.innerText : '',
        fullname: fullname ? fullname.innerText : '',
        bio: bio ? bio.innerText : '',
        location: location ? location.innerText : '',
        url: url ? url.title : '',
        avatar: avatar ? avatar.src : '',
        background: background ? background.src : '',
        verified: verified ? true : false,
        tweets: tweets ? Number(tweets.dataset.count) : 0,
        following: following ? Number(following.dataset.count) : 0,
        followers: followers ? Number(followers.dataset.count) : 0,
        likes: likes ? Number(likes.dataset.count) : 0,
        date: date ? date.title : ''
      }
    })

    if (data.date) {
      data.date = DateTime.fromFormat(data.date, 'H:m a - d MMM yyyy').toISO()
    }

    return data
  } catch (e) {
    console.log(e)
  }
}


async function getDataFromPage (page) {
  try {
    const records = []
    const users = await page.$$('.user-item .username')

    for (let user of users) {
      const username = await user.evaluate((e) => e.innerText.replace('@', ''))

      records.push(username)
    }

    return records
  } catch (e) {
    console.log(e)
  }
}

function scroll (page, fn) {
  return new Promise((resolve, reject) => {
    try {
      const records = []
      const interval = setInterval(async () => {
        try {
          const data = await fn(page)
          records.push(...data)
          const moreButton = await page.$('div.user-list > div > a')

          if (!moreButton) {
            resolve(records)
            return clearInterval(interval)
          }

          await moreButton.click()
        } catch (e) {
          reject(e)
        }
      }, 600)
    } catch (e) {
      reject(e)
    }
  })
}

async function getUser (config, depth = 0, blacklist = []) {
  try {
    console.log(config.username, depth, blacklist)

    if (blacklist.includes(config.username)) {
      return
    }

    const filename = `./data/${config.username}.json`
    let exists = true

    try {
      await fs.promises.access(filename, fs.constants.F_OK)
    } catch (e) {
      exists = false
    }

    let data = {
      username: config.username,
      profile: {},
      following: [],
      followers: []
    }

    if (exists) {
      data = JSON.parse((await fs.promises.readFile(filename)))
    } else {
      let args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-features=NetworkService'
      ]

      const browser = await puppeteer.launch({
        defaultViewport: null,
        headless: true,
        args: args
      })

      if (depth >= 2) {
        config.following = false
        config.followers = false
      }

      const page = (await browser.pages())[0]

      if (config.profile && !exists) {
        await page.goto(`https://twitter.com/${config.username}?lang=en&time=${Date.now()}`)
        data.profile = await getProfile(page)
      }

      await page.setUserAgent(agent())

      if (config.following && !exists) {
        await page.goto(`https://mobile.twitter.com/${config.username}/following?lang=en`)
        data.following = await scroll(page, getDataFromPage)
      }

      if (config.followers && !exists) {
        await page.goto(`https://mobile.twitter.com/${config.username}/followers?lang=en`)
        data.followers = await scroll(page, getDataFromPage)
      }

      fs.promises.writeFile(filename, JSON.stringify(data, null, 2))

      await browser.close()
    }

    blacklist.push(data.username)

    if (data.following.length > 0) {
      for (const username of data.following) {
        config.username = username
        await getUser(config, depth + 1, blacklist)
      }
    }
  } catch (e) {
    console.log(e)
  }
}

async function main (argv) {
  if (!argv.username) {
    return
  }

  const config = {
    username: argv.username,
    profile: argv.profile || false,
    followers: argv.followers || false,
    following: argv.following || false
  }

  await getUser(config)
}

main(argv)
  .then(process.exit)