// Classical theme chrome (pages with <body class="ar">), applied over what app.js draws: the flame "A" logo with
// AURA / PHARMA in serif capitals, and the shorter nav. The founders sale banner keeps its usual look, at the top of the page.
// Load after app.js.
(function () {
  document.querySelectorAll(".logo-mark").forEach((svg) => {
    const h = +svg.getAttribute("height") || 42;
    svg.outerHTML = `<img class="logo-mark ar-mark" src="media/renaissance/logo-mark.png" alt="" height="${Math.round(h * 1.25)}">`;
  });
  document.querySelectorAll(".wordmark b").forEach((b) => { b.textContent = "AURA"; });

  const page = document.body.dataset.page, here = document.body.dataset.nav || page;   // data-nav: the tab to mark, when it differs from the content
  const nav = document.querySelector("nav.main");
  if (nav) nav.innerHTML = [["shop.html", "Shop", "shop"], ["angel.html", "Angel", "angel"], ["faq.html", "FAQ", "faq"], ["affiliate.html", "Affiliates", "affiliate"]]
    .map(([h, l, p]) => `<a href="${h}"${p === here ? ' aria-current="page"' : ""}>${l}</a>`).join("");

  // home: the header floats over the hero, so start it below the sale banner at the top of the page
  const sale = document.querySelector(".sale-banner");
  if (page === "home" && sale) {
    const place = () => document.documentElement.style.setProperty("--ar-head-top", `${sale.getBoundingClientRect().bottom + scrollY}px`);
    place(); addEventListener("resize", place);
  }
})();
