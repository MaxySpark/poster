import log from 'lib/utils/logger'
import puppeteer from 'puppeteer'
interface ProxySettings {
  host: string
  username?: string
  password?: string
}

interface GetChainedTranslation {
  (getChainedTranslationSettings: {
    text: string,
    languages: string[],
    proxy?: ProxySettings
  }): Promise<string>
}

const getChainedTranslation: GetChainedTranslation = async ({text, languages, proxy}) => {
  let result = text
  for (let i = 0; i < languages.length; i++) {
    result = await getTranslation(result, languages[i], proxy)
  }
  return result
}

// eslint-disable-next-line require-await
const getTranslation = async (text: string, language: string, proxy?: ProxySettings) => {
  if (text.trim().length === 0) {
    throw new Error('empty keyword')
  }

  if (language.length === 0) {
    throw new Error('empty language')
  }

  let browser
  try {
    let proxy_url

    if (proxy && typeof proxy.host !== 'undefined') {
      let host = proxy.host.split(':')[0]
      const port = proxy.host.split(':')[1] || 80
      proxy_url = `${host}:${port}`
      browser = await puppeteer.launch({
        headless: true,
        args: [`--proxy-server=${proxy_url}`, '--no-sandbox']
      })
    }
    else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
      })
    }

    let page = await browser.newPage()

    if (proxy && typeof proxy.host !== 'undefined' && proxy.username) {
      await page.authenticate({
        username: proxy.username,
        password: proxy.password
      })
    }

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36')
    await page.setViewport({
      width: 1200,
      height: 1200
    })

    const sText = encodeURI(text)
    await page.goto(`https://translate.google.co.in/#view=home&op=translate&sl=auto&tl=${language}&text=${sText}`)
    await page.waitForSelector('.result .tlid-copy-target')

    let trText = await page.evaluate(() => {
      let nodeList = <NodeListOf<HTMLElement>> document.querySelectorAll('.result .tlid-copy-target')
      const txt = nodeList[0].innerText

      return txt
    })

    await browser.close()
    return trText
  }
  catch (err) {
    log.info(err)
    await browser.close()
    log.info('Browser Closed')
  }
}

export default getChainedTranslation
