async function LoginToLinkedIn(page) {
  await page.waitForSelector("#username");
  await page.type("#username", process.env.EMAIL);

  await page.waitForSelector("#password");
  await page.type("#password", process.env.PASSWORD);

  await page.waitForSelector(".btn__primary--large");

  await page.$eval(".btn__primary--large", (element) => element.click());
}

async function SetupPageForLink(page, link) {
  await page.goto(link);
  await page.setViewport({ width: 1280, height: 1024 });
  await page.waitForSelector(
    ".social-details-social-activity > ul > li > .ember-view"
  );
}

async function Scroll(page) {
  await page.evaluate((selector) => {
    const scrollableSection = document.querySelector(selector);
    const div = document.querySelector(".scaffold-finite-scroll__content");

    scrollableSection.scrollTop = div.scrollHeight;
  }, ".artdeco-modal__content");

  const test = await page.evaluate((selector) => {
    const scrollableSection = document.querySelector(selector);
    const div = document.querySelector(".scaffold-finite-scroll__content");
    const schroedingerDiv = document.querySelector(
      ".feed-shared-reposts-modal__private-shares-footer"
    );

    if (schroedingerDiv) {
      return (
        scrollableSection.scrollHeight !==
        div.scrollHeight + schroedingerDiv.offsetHeight
      );
    } else return scrollableSection.scrollHeight !== div.scrollHeight;
  }, ".artdeco-modal__content");

  if (test) await Scroll(page);
  else return;
}

module.exports = { LoginToLinkedIn, SetupPageForLink, Scroll };
