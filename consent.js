/* Cookie notice: the Meta Pixel (via Tag Manager) only loads after Accept. */
(function () {
  var KEY = "fc_consent";
  var banner = document.getElementById("cookie-banner");
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function grant() { (window.dataLayer = window.dataLayer || []).push({ event: "consent_marketing_granted" }); }
  function show() { if (banner) banner.hidden = false; }
  function hide() { if (banner) banner.hidden = true; }
  var v = get();
  if (v === "granted") grant(); else if (v !== "denied") show();
  var a = document.getElementById("cookie-accept"), d = document.getElementById("cookie-decline");
  if (a) a.addEventListener("click", function () { set("granted"); grant(); hide(); });
  if (d) d.addEventListener("click", function () {
    var was = get(); set("denied"); hide();
    if (was === "granted") window.location.reload(); // stop the pixel already loaded in this page
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-cookie-settings]");
    if (t) { e.preventDefault(); show(); if (a) a.focus(); }
  });
})();
