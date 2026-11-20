// Generates crawlable page URLs (/submissions/, /outreach/, /sponsorship/, /team/)
// from index.html, each with its own title, description, canonical and active page.
// Run after editing index.html:  node build-pages.js
const fs = require("fs");
const src = fs.readFileSync("index.html", "utf8");
const pages = {
  submissions: { title: "Submit Your Film | FirstCut Take 13 Student Film Festival", desc: "Submit your student short film free to FirstCut Take 13 at FLAME University, Pune. Fiction, Non-Fiction, Animation and Nano categories. Deadline 10 Jan 2027." },
  outreach: { title: "Collaborate With Us | FirstCut Outreach, Colleges and Film Clubs", desc: "Partner with FirstCut Take 13. Colleges, film clubs, media schools and industry collaborators can reach the FirstCut outreach team here." },
  sponsorship: { title: "Sponsor FirstCut Take 13 | Partner With India's Student Film Festival", desc: "Connect your brand with FirstCut Take 13, a student film festival at FLAME University, Pune. Social media, on-ground branding, activations and award sponsorships." },
  team: { title: "Meet the Team | FirstCut Take 13 Film Festival Committee", desc: "Meet the student team behind FirstCut Take 13, India's largest student-run film festival at FLAME University, Pune." },
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
for (const [slug, m] of Object.entries(pages)) {
  const url = `https://firstcutflame.com/${slug}/`;
  let h = src;
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`);
  h = h.replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(m.desc)}"`);
  h = h.replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`);
  h = h.replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(m.title)}"`);
  h = h.replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(m.desc)}"`);
  h = h.replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`);
  h = h.replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${esc(m.title)}"`);
  h = h.replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${esc(m.desc)}"`);
  // active page container
  h = h.replace('class="dept-page active" id="page-home"', 'class="dept-page" id="page-home"');
  h = h.replace(`class="dept-page" id="page-${slug}"`, `class="dept-page active" id="page-${slug}"`);
  // active nav links
  h = h.replace(/<a [^>]*data-page-target="(\w+)"[^>]*>/g, (tag, p) => {
    const on = p === slug;
    return tag.replace(/class="([^"]*)"/, (_, c) => {
      const cls = c.split(/\s+/).filter((x) => x && x !== "active");
      if (on && /(nav-link|bottom-nav-item|drawer-link)/.test(c)) cls.push("active");
      return `class="${cls.join(" ")}"`;
    });
  });
  fs.mkdirSync(slug, { recursive: true });
  fs.writeFileSync(`${slug}/index.html`, h);
  console.log("built", `${slug}/index.html`);
}
