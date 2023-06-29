require("dotenv").config();

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

const userAgent = require("user-agents");
const desktopUA = new userAgent({ deviceCategory: "desktop" }).toString();

const fs = require("fs");

// eslint-disable-next-line no-unused-vars
const colors = require("colors");

const config = require("./config.js");
const { LoginToLinkedIn, SetupPageForLink, Scroll } = require("./functions.js");

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
  const browser = await puppeteer.launch({ headless: config.headless });
  const page = await browser.newPage();
  await page.setUserAgent(desktopUA);

  await page.goto(
    "https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin"
  );

  await page.setViewport({ width: 1280, height: 1024 });

  await LoginToLinkedIn(page);

  if (config.headless === "new") {
    if ((await page.$("#captcha-internal")) !== null) {
      console.log(
        "A captcha appeared.\n\n".bold.red +
          "Create a new LinkedIn account or set headless mode to false and solve the captcha manually.\nIf you can't login after solving the captcha, the account is restricted."
            .yellow
      );

      return process.exit();
    }
  }

  await page.waitForSelector(".global-nav__content");

  page.close();

  for (let link of links.link) {
    const page = await browser.newPage();
    await page.setUserAgent(desktopUA);

    await SetupPageForLink(page, link);

    const repostText = await page.$eval(
      ".social-details-social-activity > ul > li > .ember-view",
      (element) => element.textContent.match(/\d+/)[0]
    );
    repostCount += Number(repostText);
    const singleRepostCount = Number(repostText);

    await page.$eval(
      ".social-details-social-activity > ul > li > .ember-view",
      (element) => element.click()
    );

    await page.waitForSelector(".scaffold-finite-scroll__content");

    await Scroll(page);

    const repost = await page.$$(
      ".update-components-text-view__mention, .scaffold-finite-scroll__content > div > .feed-shared-update-v2 > div > .update-components-actor--with-control-menu > .update-components-actor__container-link > .update-components-actor__meta > .update-components-actor__title > .update-components-actor__name > .visually-hidden"
    );

    for (let i = 0; i < repost.length; i++) {
      const fullTitle = await repost[i].evaluate((el) => el.textContent);
      count++;
      if (!json.people.includes(fullTitle)) json.people.push(fullTitle);
    }
    if (count === singleRepostCount) {
      console.log(
        `${count} / ${singleRepostCount}`.green +
          " reposts from ".yellow +
          link.blue
      );
    } else {
      console.log(
        `${count} / ${singleRepostCount}`.red +
          " reposts from ".yellow +
          link.blue
      );
    }

    page.close();

    fs.writeFile("./IO/people.json", JSON.stringify(json), (error) => {
      if (error) {
        console.log("An error has occurred while writing people.json", error);
        return;
      }
      status++;

      if (status === links.link.length) {
        console.log(
          `\nScraped ${totalCount} out of ${repostCount} reposts from ${links.link.length} links.`
            .bold.green
        );

        browser.close();
      }
    });

    totalCount += count;
    count = 0;
  }
})();
