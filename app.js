require("dotenv").config();

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

const userAgent = require("user-agents");
const fs = require("fs");

const people = {
  people: [],
};

let status = 0;
let totalCount = 0;
let count = 0;
let repostCount = 0;

if (!fs.existsSync("./IO/people.json")) {
  fs.writeFileSync("./IO/people.json", JSON.stringify(people));
}

puppeteer.use(StealthPlugin());

const json = JSON.parse(fs.readFileSync("./IO/people.json"));
const links = JSON.parse(fs.readFileSync("./IO/links.json"));

(async function () {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent(userAgent.random().toString());

  await page.goto(
    "https://www.linkedin.com/feed/update/urn:li:activity:7067869281031467008"
  );

  await page.setViewport({ width: 1280, height: 1024 });

  const textSelector = await page.waitForSelector(
    "header > nav > div > .nav__button-secondary"
  );

  textSelector.click();

  await page.waitForSelector("#username");
  await page.type("#username", process.env.EMAIL);

  await page.waitForSelector("#password");
  await page.type("#password", process.env.PASSWORD);

  await page.waitForSelector(".btn__primary--large");

  await page.$eval(".btn__primary--large", (element) => element.click());

  await page.waitForSelector(
    ".social-details-social-activity > ul > li > .ember-view"
  );
  for (let link of links.link) {
    const page = await browser.newPage();
    await page.setUserAgent(userAgent.random().toString());

    await page.goto(link);

    await page.setViewport({ width: 1280, height: 1024 });
    await page.waitForSelector(
      ".social-details-social-activity > ul > li > .ember-view"
    );

    const repostText = await page.$eval(
      ".social-details-social-activity > ul > li > .ember-view",
      (element) => element.textContent.match(/\d+/)[0]
    );
    repostCount += Number(repostText);

    await page.$eval(
      ".social-details-social-activity > ul > li > .ember-view",
      (element) => element.click()
    );

    await page.waitForSelector(".artdeco-modal__content");
    await page.waitForSelector(".scaffold-finite-scroll__content");

    await page.evaluate(async (selector) => {
      const scrollableSection = document.querySelector(selector);
      const div = document.querySelector(".scaffold-finite-scroll__content");

      scrollableSection.scrollTop = div.scrollHeight;
    }, ".artdeco-modal__content");

    setTimeout(async function () {
      await page.evaluate(async (selector) => {
        const scrollableSection = document.querySelector(selector);
        const div = document.querySelector(".scaffold-finite-scroll__content");

        scrollableSection.scrollTop = div.scrollHeight;
      }, ".artdeco-modal__content");
    }, 2000);

    setTimeout(async function () {
      const repost = await page.$$(
        ".update-components-text-view__mention, .update-components-actor__name > .visually-hidden"
      );

      for (let i = 0; i < repost.length; i++) {
        const fullTitle = await repost[i].evaluate((el) => el.textContent);
        if (fullTitle !== "The CSL Group Inc.") {
          count++;
          if (!json.people.includes(fullTitle)) json.people.push(fullTitle);
        }
      }
      console.log(`${count} reposts from ${link}`);
      totalCount += count;
      count = 0;
      fs.writeFile("./IO/people.json", JSON.stringify(json), (error) => {
        if (error) {
          console.log("An error has occurred ", error);
          return;
        }
        status++;

        if (status === links.link.length) {
          console.log(
            `Scraped ${totalCount} out of ${repostCount} reposts from ${links.link.length} links.`
          );

          browser.close();
        }
      });
    }, 5000);
  }
})();
