/* Kadak Chai Cafe - menu, order cart and table reservation */

const ITEMS = [
  { id: 1, n: "Masala Chai",     p: 30, c: "chai",   e: "\u2615", hot: true },
  { id: 2, n: "Adrak Chai",      p: 35, c: "chai",   e: "\uD83E\uDED6" },
  { id: 3, n: "Cutting Chai",    p: 20, c: "chai",   e: "\uD83C\uDF75" },
  { id: 4, n: "Cold Coffee",     p: 90, c: "coffee", e: "\uD83E\uDDCA", hot: true },
  { id: 5, n: "Filter Coffee",   p: 50, c: "coffee", e: "\u2615" },
  { id: 6, n: "Bun Maska",       p: 40, c: "snack",  e: "\uD83C\uDF5E", hot: true },
  { id: 7, n: "Vada Pav",        p: 25, c: "snack",  e: "\uD83C\uDF54" },
  { id: 8, n: "Cheese Sandwich", p: 80, c: "snack",  e: "\uD83E\uDD6A" },
  { id: 9, n: "Samosa",          p: 20, c: "snack",  e: "\uD83E\uDD5F" }
];

/* Put your WhatsApp number here: country code + number, no plus sign, no spaces. Example: 919876543210 */
const WHATSAPP_NUMBER = "918980906498";
/* To show real food photos: put images in an "images" folder and add img:"images/masala-chai.jpg" to an item above. */

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const rupee = n => "\u20B9" + n;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const niceDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); };
const nice12 = hhmm => { const [h, m] = hhmm.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };

const toastEl = $("#toast");
function say(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(say.t);
  say.t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

const waLink = text => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/* Confirmation ticket shown after an order or a reservation */
function showTicket({ title, subtitle, rows, code, codeLabel, extra = "" }) {
  $("#doneBody").innerHTML = `
    <div class="ticket">
      <div class="ticket-head">
        <span class="tick" aria-hidden="true">\u2713</span>
        <h2 id="doneTitle">${esc(title)}</h2>
        <div>${esc(subtitle)}</div>
      </div>
      <div class="ticket-body">
        ${rows.map(r => `<div class="row-i"><span>${esc(r[0])}</span><span class="text-end">${r[1]}</span></div>`).join("")}
        ${extra}
      </div>
      <div class="ticket-code"><small class="d-block text-secondary" style="font:400 .8rem 'DM Sans'">${esc(codeLabel)}</small>${esc(code)}</div>
      <div class="p-3 pt-0"><button class="btn btn-gold w-100" data-bs-dismiss="modal">Done</button></div>
    </div>`;
  bootstrap.Modal.getOrCreateInstance($("#doneModal")).show();
}

/* ---------- menu ---------- */
const grid = $("#grid");
let menuFilter = "all", menuQuery = "";
function renderMenu() {
  const list = ITEMS.filter(i =>
    (menuFilter === "all" || i.c === menuFilter) &&
    (!menuQuery || `${i.n} ${i.c} ${i.c}s`.toLowerCase().includes(menuQuery)));
  grid.setAttribute("aria-live", "polite");
  grid.innerHTML = list.length ? list.map(i => `
    <div class="col-sm-6 col-lg-4"><div class="item pop">
      ${i.hot ? '<span class="badge-hot">Popular</span>' : ""}
      ${i.img ? `<img class="food" src="${i.img}" alt="${i.n}" loading="lazy">` : `<span class="emoji" aria-hidden="true">${i.e}</span>`}
      <h3 class="h5 mt-2">${i.n}</h3>
      <div class="d-flex justify-content-between align-items-center mt-3">
        <span class="price">${rupee(i.p)}</span>
        <button type="button" class="add" data-id="${i.id}" aria-label="Add ${i.n} to order">Add</button>
      </div></div></div>`).join("")
    : `<div class="col-12"><div class="o-empty">No item matches "${esc(menuQuery)}". Try another word.</div></div>`;
}
renderMenu();

$("#filters").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  document.querySelectorAll("#filters button").forEach(x => {
    x.classList.remove("on");
    x.setAttribute("aria-pressed", "false");
  });
  b.classList.add("on");
  b.setAttribute("aria-pressed", "true");
  menuFilter = b.dataset.f;
  renderMenu();
});
$("#q").addEventListener("input", e => { menuQuery = e.target.value.trim().toLowerCase(); renderMenu(); });

/* ---------- order cart ---------- */
let cart = store.get("kc_cart", {});   // { itemId: quantity }
let orders = store.get("kc_orders", []); // placed orders, newest first

function totals() {
  let sub = 0, count = 0;
  for (const id in cart) {
    const it = ITEMS.find(i => i.id == id);
    if (!it) { delete cart[id]; continue; }
    sub += it.p * cart[id]; count += cart[id];
  }
  const gst = Math.round(sub * 0.05);
  return { sub, gst, total: sub + gst, count };
}

function renderCart() {
  const t = totals();
  store.set("kc_cart", cart);
  $("#cartCount").textContent = t.count;
  $("#cartFoot").style.display = t.count ? "block" : "none";
  if (!t.count) {
    $("#cartList").innerHTML = `<div class="empty"><span class="emoji" aria-hidden="true">\u2615</span>Your order is empty.<br>Add chai or snacks from the menu.</div>`;
    return;
  }
  $("#cartList").innerHTML = Object.keys(cart).map(id => {
    const it = ITEMS.find(i => i.id == id), q = cart[id];
    return `<div class="line">
      <span class="emoji" style="font-size:1.8rem" aria-hidden="true">${it.e}</span>
      <div class="nm">${it.n}<br><small>${rupee(it.p)} each</small></div>
      <div class="qty">
        <button type="button" data-act="dec" data-id="${id}" aria-label="Decrease ${it.n}">&minus;</button>
        <strong aria-live="polite">${q}</strong>
        <button type="button" data-act="inc" data-id="${id}" aria-label="Increase ${it.n}">+</button>
      </div>
      <strong style="min-width:3.2rem;text-align:right">${rupee(it.p * q)}</strong>
      <button type="button" class="del" data-act="del" data-id="${id}" aria-label="Remove ${it.n}">\u2715</button>
    </div>`;
  }).join("");
  $("#sub").textContent = rupee(t.sub);
  $("#gst").textContent = rupee(t.gst);
  $("#tot").textContent = rupee(t.total);
}

grid.addEventListener("click", e => {
  const b = e.target.closest(".add"); if (!b) return;
  const id = b.dataset.id;
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
  const pill = $("#cartBtn");
  pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump");
  say(`${ITEMS.find(i => i.id == id).n} added. ${cart[id]} in your order`);
});

$("#cartList").addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;
  if (act === "inc") cart[id]++;
  if (act === "dec") cart[id]--;
  if (act === "del" || cart[id] <= 0) delete cart[id];
  renderCart();
});

$("#clearBtn").addEventListener("click", () => { cart = {}; renderCart(); say("Order cleared"); });

$("#placeBtn").addEventListener("click", () => {
  const t = totals();
  if (!t.count) return say("Add something to your order first");
  const nameEl = $("#oname"), name = nameEl.value.trim();
  nameEl.classList.toggle("is-invalid", !name);
  if (!name) { nameEl.focus(); return; }

  const type = document.querySelector("input[name=otype]:checked").value;
  const code = "KC" + Math.floor(1000 + Math.random() * 9000);
  const mins = Math.min(10 + t.count * 2, 30);
  const lines = Object.keys(cart).map(id => {
    const it = ITEMS.find(i => i.id == id);
    return [`${cart[id]} \u00D7 ${it.n}`, rupee(it.p * cart[id])];
  });
  const ticketRows = [
    ["Name", esc(name)], ["Order type", type],
    ...lines,
    ["GST (5%)", rupee(t.gst)],
    ["Total", `<strong>${rupee(t.total)}</strong>`]
  ];

  const waText = [`Order ${code} (${type}) for ${name}`, ...lines.map(l => `${l[0]} - ${l[1]}`), `Total: ${rupee(t.total)}`].join("\n");
  orders.unshift({
    code, name, type, mins, placed: Date.now(),
    items: Object.keys(cart).map(id => ({ id: +id, q: cart[id], p: ITEMS.find(i => i.id == id).p })),
    sub: t.sub, gst: t.gst, total: t.total
  });
  orders = orders.slice(0, 20);
  store.set("kc_orders", orders);
  cart = {}; renderCart(); renderOrders(); nameEl.value = "";
  const panel = bootstrap.Offcanvas.getInstance($("#cartPanel"));
  if (panel) panel.hide();
  setTimeout(() => showTicket({
    title: "Order placed", subtitle: `Ready in about ${mins} minutes`,
    rows: ticketRows, code, codeLabel: "Order number. Show this at the counter.",
    extra: `<a class="btn-wa mt-3" href="${waLink(waText)}" target="_blank" rel="noopener">Send this order on WhatsApp</a>
      <a href="#orders" class="d-block text-center mt-3" data-bs-dismiss="modal">See it in My orders</a>`
  }), 350);
});

/* ---------- my orders ---------- */
function statusOf(o) {
  const left = Math.ceil(o.mins - (Date.now() - o.placed) / 60000);
  if (left <= 0) return { ready: true, left: 0, pct: 100 };
  return { ready: false, left, pct: Math.max(8, Math.min(95, Math.round((1 - left / o.mins) * 100))) };
}

function renderOrders() {
  const box = $("#orderList");
  $("#clearOrders").style.display = orders.length ? "" : "none";
  if (!orders.length) {
    box.innerHTML = `<div class="col-12"><div class="o-empty">No orders yet.<br>Add items from the menu and place an order. It will appear here.</div></div>`;
    return;
  }
  box.innerHTML = orders.map((o, idx) => {
    const s = statusOf(o);
    const when = new Date(o.placed).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    const lines = o.items.map(i => {
      const it = ITEMS.find(x => x.id === i.id);
      return `<li><span>${i.q} \u00D7 ${it ? it.n : "Item"}</span><span>${rupee(i.p * i.q)}</span></li>`;
    }).join("");
    return `<div class="col-lg-6"><article class="order-card">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div><span class="code">${esc(o.code)}</span>
          <div class="small text-secondary">${when}, ${esc(o.type)}, for ${esc(o.name)}</div></div>
        <span class="status ${s.ready ? "ready" : "prep"}">${s.ready ? "Ready" : "Preparing"}</span>
      </div>
      <ul class="o-items">${lines}
        <li><span>GST (5%)</span><span>${rupee(o.gst)}</span></li>
        <li><strong>Total</strong><strong>${rupee(o.total)}</strong></li></ul>
      <div class="o-bar ${s.ready ? "done" : ""}" role="progressbar" aria-valuenow="${s.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${s.pct}%"></i></div>
      <div class="d-flex justify-content-between align-items-center mt-3">
        <small class="text-secondary">${s.ready ? "Ready at the counter" : `About ${s.left} min left`}</small>
        <button type="button" class="btn btn-sm btn-ink rounded-pill" data-reorder="${idx}">Order again</button>
      </div></article></div>`;
  }).join("");
}

$("#orderList").addEventListener("click", e => {
  const b = e.target.closest("[data-reorder]"); if (!b) return;
  const o = orders[+b.dataset.reorder]; if (!o) return;
  o.items.forEach(i => { cart[i.id] = (cart[i.id] || 0) + i.q; });
  renderCart();
  bootstrap.Offcanvas.getOrCreateInstance($("#cartPanel")).show();
  say(`${o.code} items added to your order`);
});
$("#clearOrders").addEventListener("click", () => {
  orders = []; store.del("kc_orders"); renderOrders(); say("Order history cleared");
});
setInterval(renderOrders, 30000);

/* ---------- table reservation ---------- */
const bd = $("#bd"), bt = $("#bt"), bg = $("#bg");

for (let g = 1; g <= 10; g++) bg.add(new Option(g === 1 ? "1 person" : `${g} people`, g));
bg.value = 2;

function fillTimes() {
  const now = new Date(), today = bd.value === ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  bt.innerHTML = "";
  for (let m = 7 * 60; m <= 22 * 60 + 30; m += 30) {
    const v = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    const o = new Option(nice12(v), v);
    if (today && m <= nowMin + 15) o.disabled = true;
    bt.add(o);
  }
  const first = [...bt.options].find(o => !o.disabled);
  bt.value = first ? first.value : "";
}

(function initDate() {
  const now = new Date();
  const late = now.getHours() * 60 + now.getMinutes() > 22 * 60 + 15;
  const start = new Date(now); if (late) start.setDate(start.getDate() + 1);
  bd.min = ymd(start); bd.value = ymd(start);
  fillTimes();
})();
bd.addEventListener("change", fillTimes);

let bookings = store.get("kc_bookings", null);
if (!bookings) {                       // move an older single booking into the new list
  const old = store.get("kc_booking", null);
  bookings = old ? [old] : [];
  store.del("kc_booking"); store.set("kc_bookings", bookings);
}

function renderBooking() {
  const box = $("#myBooking");
  if (!bookings.length) {
    box.innerHTML = `<div class="my-booking none">No reservation yet.<br>Fill the form and your booking will appear here.</div>`;
    return;
  }
  box.innerHTML = `<h3 class="h4 mb-3">Your reservations</h3>` + bookings.map(b => `<div class="my-booking">
    <div class="ticket-body px-0 pt-0">
      <div class="row-i"><span>Name</span><span>${esc(b.name)}</span></div>
      <div class="row-i"><span>Date</span><span>${niceDate(b.date)}</span></div>
      <div class="row-i"><span>Time</span><span>${nice12(b.time)}</span></div>
      <div class="row-i"><span>Guests</span><span>${b.guests}</span></div>
      ${b.note ? `<div class="row-i"><span>Note</span><span>${esc(b.note)}</span></div>` : ""}
    </div>
    <div class="d-flex justify-content-between align-items-center pt-3">
      <strong style="font-family:Fraunces,serif;letter-spacing:.05em">${esc(b.code)}</strong>
      <button type="button" class="btn btn-outline-danger btn-sm rounded-pill" data-cancel="${esc(b.code)}">Cancel booking</button>
    </div></div>`).join("");
}
$("#myBooking").addEventListener("click", e => {
  const b = e.target.closest("[data-cancel]"); if (!b) return;
  bookings = bookings.filter(x => x.code !== b.dataset.cancel);
  store.set("kc_bookings", bookings); renderBooking(); say("Reservation cancelled");
});

$("#bookForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#bn").value.trim(), phone = $("#bp").value.replace(/[\s-]/g, "");
  const checks = [
    [$("#bn"), !!name],
    [$("#bp"), /^\+?\d{10,14}$/.test(phone)],
    [bd, !!bd.value],
    [bt, !!bt.value]
  ];
  checks.forEach(([el, ok]) => el.classList.toggle("is-invalid", !ok));
  const bad = checks.find(c => !c[1]);
  if (bad) { bad[0].focus(); return; }
  if (bookings.length >= 5) return say("You can keep up to 5 reservations. Cancel one first.");
  if (bookings.some(x => x.date === bd.value && x.time === bt.value)) return say("You already have a table at that date and time.");

  const booking = {
    code: "TB" + Math.floor(1000 + Math.random() * 9000),
    name, phone, date: bd.value, time: bt.value,
    guests: bg.value, note: $("#bnote").value.trim()
  };
  bookings.push(booking);
  bookings.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  store.set("kc_bookings", bookings);
  renderBooking();

  const rows = [
    ["Name", esc(name)], ["Mobile", esc(phone)],
    ["Date", niceDate(booking.date)], ["Time", nice12(booking.time)],
    ["Guests", booking.guests]
  ];
  if (booking.note) rows.push(["Note", esc(booking.note)]);
  const waText = `Hi Kadak Chai, I reserved table ${booking.code}: ${name}, ${niceDate(booking.date)}, ${nice12(booking.time)}, ${booking.guests} guests.`;
  showTicket({
    title: "Table reserved", subtitle: "We will hold it for 15 minutes",
    rows, code: booking.code, codeLabel: "Booking ID. Show this when you arrive.",
    extra: `<a class="btn-wa mt-3" href="${waLink(waText)}" target="_blank" rel="noopener">Confirm on WhatsApp</a>`
  });
  e.target.reset(); bg.value = 2; bd.value = bd.min; fillTimes();
});
document.querySelectorAll("#bookForm .form-control, #bookForm .form-select").forEach(el =>
  el.addEventListener("input", () => el.classList.remove("is-invalid")));

/* ---------- small extras ---------- */
const co = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  const el = en.target, end = +el.dataset.n; let n = 0;
  const t = setInterval(() => { n += Math.ceil(end / 40); if (n >= end) { n = end; clearInterval(t); } el.textContent = n; }, 30);
  co.unobserve(el);
}), { threshold: .6 });
document.querySelectorAll("[data-n]").forEach(el => co.observe(el));

$("#oname").addEventListener("input", e => e.target.classList.remove("is-invalid"));
$("#yr").textContent = new Date().getFullYear();

renderCart();
renderOrders();
renderBooking();

/* ---------- dark mode ---------- */
const themeBtn = $("#themeBtn"), htmlEl = document.documentElement;
function setTheme(t) {
  htmlEl.setAttribute("data-bs-theme", t);
  themeBtn.textContent = t === "dark" ? "Light" : "Dark";
  themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  store.set("kc_theme", t);
}
setTheme(store.get("kc_theme", window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
themeBtn.addEventListener("click", () => setTheme(htmlEl.getAttribute("data-bs-theme") === "dark" ? "light" : "dark"));
