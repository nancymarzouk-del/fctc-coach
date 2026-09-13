// ============================================================================
// generators.mjs — ORIGINAL FINRA SIE practice for the Sprint-2 vertical slice.
// ----------------------------------------------------------------------------
// One generator per slice subskill; each ROTATES ≥2 question families (reasoning
// paths) with variant pools, 4 answer choices (A–D), meaningful distractors, and
// stable misconception keys aligned to each distractor. Quality over volume; every
// item is original — no FINRA question content reproduced or paraphrased.
//
// Generator contract (consumed by sieEngine.generateSieItem):
//   (rng) => { concept, prompt, options:[4 strings], correct:index,
//              explanation, verify?, meta:{ distractorRationale:[], misconceptions:[] } }
// ============================================================================

const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const shuffle = (rng, a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const pctStr = (x) => `${(Math.round(x * 100) / 100).toFixed(2)}%`;

// Build 4 shuffled options from one correct answer + 3 distractors (each {text, why,
// key?}). Keeps each option's rationale + misconception key aligned to its final
// index; the correct option's rationale/key = null. Distractors must be distinct.
function assemble4(rng, correct, distractors) {
  const entries = [{ text: correct, why: null, key: null, correct: true }];
  const seen = new Set([correct]);
  for (const d of distractors) {
    if (seen.has(d.text)) continue;
    seen.add(d.text);
    entries.push({ text: d.text, why: d.why, key: d.key || null, correct: false });
    if (entries.length >= 4) break;
  }
  const shuffled = shuffle(rng, entries);
  return {
    options: shuffled.map((e) => e.text),
    correct: shuffled.findIndex((e) => e.correct),
    distractorRationale: shuffled.map((e) => (e.correct ? null : e.why)),
    misconceptions: shuffled.map((e) => (e.correct ? null : e.key)),
  };
}
const wrap = (concept, prompt, built, explanation, extra = {}) => ({
  concept, prompt, options: built.options, correct: built.correct, explanation,
  meta: { distractorRationale: built.distractorRationale, misconceptions: built.misconceptions, ...extra },
});

// ---- Capital Markets: SEC vs FINRA vs MSRB --------------------------------------
function regulators(rng) {
  const mode = pick(rng, ['reg-identify', 'reg-scenario', 'reg-compare']);
  const SEC = 'The SEC';
  const FINRA = 'FINRA';
  const MSRB = 'The MSRB';
  const SIPC = 'SIPC';
  if (mode === 'reg-identify') {
    const v = pick(rng, [
      { role: 'writes and enforces the conduct rules that govern broker-dealers and their registered representatives', ans: FINRA,
        ds: [{ text: SEC, why: 'the SEC administers the federal securities laws and oversees the SROs; FINRA writes the BD conduct rules', key: 'sec-vs-finra-role' }, { text: MSRB, why: 'the MSRB writes rules for municipal securities dealers, not broker-dealers generally', key: 'finra-vs-msrb-role' }, { text: SIPC, why: 'SIPC protects customer assets if a firm fails — it is not a rule-maker' }] },
      { role: 'writes the rules for firms that deal in municipal securities', ans: MSRB,
        ds: [{ text: FINRA, why: 'FINRA enforces MSRB rules for non-bank dealers but the MSRB writes them', key: 'finra-vs-msrb-role' }, { text: SEC, why: 'the SEC oversees the MSRB but the MSRB writes municipal dealer rules', key: 'sec-vs-finra-role' }, { text: SIPC, why: 'SIPC is customer-asset protection, not a rule-maker' }] },
      { role: 'is the federal government agency that administers the federal securities laws and oversees the SROs', ans: SEC,
        ds: [{ text: FINRA, why: 'FINRA is an SRO overseen BY the SEC — it is not the federal agency', key: 'sec-vs-finra-role' }, { text: MSRB, why: 'the MSRB is an SRO for municipal securities, overseen by the SEC', key: 'finra-vs-msrb-role' }, { text: SIPC, why: 'SIPC is a nonprofit that protects customers, not a federal regulator' }] },
    ]);
    return wrap('reg-identify', `Which organization ${v.role}?`, assemble4(rng, v.ans, v.ds),
      `${v.ans} ${v.role}.`);
  }
  if (mode === 'reg-scenario') {
    const v = pick(rng, [
      { s: 'A registered representative is accused of recommending unsuitable investments to customers. Which body would bring the disciplinary action against the representative?', ans: FINRA,
        ds: [{ text: SEC, why: 'the SEC oversees FINRA but day-to-day BD/rep discipline is FINRA’s', key: 'sec-vs-finra-role' }, { text: MSRB, why: 'the MSRB makes municipal rules but does not enforce/discipline', key: 'finra-vs-msrb-role' }, { text: SIPC, why: 'SIPC handles failed-firm customer claims, not discipline' }] },
      { s: 'A dealer that buys and sells municipal revenue bonds must follow rules on markups, disclosures, and fair dealing specific to municipal securities. Whose rulebook primarily sets those requirements?', ans: MSRB,
        ds: [{ text: FINRA, why: 'FINRA enforces them for non-bank dealers, but the rulebook is the MSRB’s', key: 'finra-vs-msrb-role' }, { text: SEC, why: 'the SEC oversees the MSRB but the municipal rulebook is the MSRB’s', key: 'sec-vs-finra-role' }, { text: SIPC, why: 'SIPC is not a rule-writer' }] },
      { s: 'A company files a registration statement to offer securities to the public under the Securities Act of 1933. Which body administers that federal law?', ans: SEC,
        ds: [{ text: FINRA, why: 'FINRA is an SRO; it does not administer federal statutes', key: 'sec-vs-finra-role' }, { text: MSRB, why: 'the MSRB’s scope is municipal securities dealer rules', key: 'finra-vs-msrb-role' }, { text: SIPC, why: 'SIPC does not administer securities registration' }] },
    ]);
    return wrap('reg-scenario', v.s, assemble4(rng, v.ans, v.ds), `${v.ans} is the correct body here.`);
  }
  // reg-compare
  const v = pick(rng, [
    { q: 'Which statement correctly distinguishes the SEC from FINRA?',
      ans: 'The SEC is a federal government agency; FINRA is a self-regulatory organization (SRO) overseen by the SEC.',
      ds: [{ text: 'FINRA is a federal agency and the SEC is a self-regulatory organization.', why: 'reversed — the SEC is the federal agency; FINRA is the SRO', key: 'sec-vs-finra-role' }, { text: 'Both the SEC and FINRA are federal government agencies.', why: 'only the SEC is a federal agency', key: 'sec-vs-finra-role' }, { text: 'FINRA writes the federal securities laws; the SEC only enforces them.', why: 'Congress writes the laws; the SEC administers them; FINRA writes member conduct rules', key: 'sec-vs-finra-role' }] },
    { q: 'Which statement correctly distinguishes FINRA from the MSRB?',
      ans: 'The MSRB writes rules for municipal securities; FINRA writes rules for broker-dealers and enforces MSRB rules for non-bank dealers.',
      ds: [{ text: 'The MSRB writes and enforces its own rules against all dealers itself.', why: 'the MSRB writes rules but does not enforce them — FINRA/SEC/bank regulators do', key: 'finra-vs-msrb-role' }, { text: 'FINRA writes the rules for municipal securities dealers.', why: 'the MSRB writes municipal dealer rules, not FINRA', key: 'finra-vs-msrb-role' }, { text: 'FINRA and the MSRB regulate exactly the same products in the same way.', why: 'their scopes differ — the MSRB is municipal-securities specific', key: 'finra-vs-msrb-role' }] },
  ]);
  return wrap('reg-compare', v.q, assemble4(rng, v.ans, v.ds), v.ans);
}

// ---- Capital Markets: primary vs secondary market -------------------------------
function marketStructure(rng) {
  const mode = pick(rng, ['market-identify', 'market-scenario', 'market-compare']);
  const PRIMARY = 'The primary market';
  const SECONDARY = 'The secondary market';
  if (mode === 'market-identify') {
    const v = pick(rng, [
      { role: 'an ISSUER sells NEW securities to investors and receives the proceeds', ans: PRIMARY,
        ds: [{ text: SECONDARY, why: 'in the secondary market investors trade among themselves; the issuer gets nothing', key: 'primary-vs-secondary-market' }, { text: 'The third market', why: 'the third market is exchange-listed stocks traded OTC — still investor-to-investor' }, { text: 'The fourth market', why: 'the fourth market is institution-to-institution direct trading' }] },
      { role: 'investors trade OUTSTANDING securities among themselves and the issuer receives no proceeds', ans: SECONDARY,
        ds: [{ text: PRIMARY, why: 'the primary market is where the issuer sells new securities and receives proceeds', key: 'primary-vs-secondary-market' }, { text: 'The fourth market', why: 'the fourth market is a specific institution-to-institution venue, not the general resale market' }, { text: 'The third market', why: 'the third market is a specific OTC venue for listed stocks, not the general resale market' }] },
    ]);
    return wrap('market-identify', `In which market does the following occur: ${v.role}?`, assemble4(rng, v.ans, v.ds),
      `${v.ans} is where ${v.role}.`);
  }
  if (mode === 'market-scenario') {
    const v = pick(rng, [
      { s: 'An investor buys shares in a company’s initial public offering (IPO) directly from the underwriting syndicate. This transaction occurs in the:', ans: PRIMARY,
        ds: [{ text: SECONDARY, why: 'buying from the issuer/underwriters at issuance is the primary market', key: 'primary-vs-secondary-market' }, { text: 'The third market', why: 'not a listed-OTC trade' }, { text: 'The fourth market', why: 'not an institution-to-institution trade' }] },
      { s: 'Two months after the IPO, an investor buys those same shares from another investor on an exchange. This transaction occurs in the:', ans: SECONDARY,
        ds: [{ text: PRIMARY, why: 'the issuer is not involved and receives no proceeds — this is the secondary market', key: 'primary-vs-secondary-market' }, { text: 'The primary market because the shares originated in an IPO', why: 'origin doesn’t matter; a resale between investors is secondary', key: 'primary-vs-secondary-market' }, { text: 'The fourth market', why: 'an ordinary exchange trade is not the institution-to-institution fourth market' }] },
    ]);
    return wrap('market-scenario', v.s, assemble4(rng, v.ans, v.ds), `${v.ans} — the deciding factor is whether the ISSUER receives the proceeds.`);
  }
  const ans = 'In the primary market the issuer receives the proceeds of the sale; in the secondary market investors trade among themselves and the issuer receives nothing.';
  return wrap('market-compare', 'Which statement correctly distinguishes the primary and secondary markets?',
    assemble4(rng, ans, [
      { text: 'In the secondary market the issuer receives the proceeds; in the primary market investors trade among themselves.', why: 'reversed — the issuer is paid in the PRIMARY market', key: 'primary-vs-secondary-market' },
      { text: 'The issuer receives proceeds in both markets.', why: 'the issuer is only paid at issuance (primary)', key: 'primary-vs-secondary-market' },
      { text: 'Only institutions may participate in the primary market.', why: 'participation is not the distinction; who receives the proceeds is' },
    ]), ans);
}

// ---- Products: bond price/yield + current yield vs coupon -----------------------
function debt(rng) {
  const mode = pick(rng, ['price-yield-direction', 'price-yield-scenario', 'current-yield-calc', 'yield-compare']);
  if (mode === 'price-yield-direction') {
    const up = rng() < 0.5;
    const ans = up ? 'Its price falls.' : 'Its price rises.';
    return wrap('price-yield-direction',
      `Market interest rates ${up ? 'RISE' : 'FALL'}. What most likely happens to the price of an existing fixed-rate bond?`,
      assemble4(rng, ans, [
        { text: up ? 'Its price rises.' : 'Its price falls.', why: 'bond prices move INVERSELY to rates', key: 'bond-price-yield-direction' },
        { text: 'Its price is unchanged.', why: 'existing fixed-rate bond prices adjust as market rates change', key: 'bond-price-yield-direction' },
        { text: 'Its coupon payment changes.', why: 'the coupon is fixed; the PRICE adjusts, not the coupon' },
      ]),
      `Bond prices and yields move in opposite directions. When rates ${up ? 'rise, existing bonds with lower coupons become less attractive, so their prices fall' : 'fall, existing bonds with higher coupons become more attractive, so their prices rise'}.`);
  }
  if (mode === 'price-yield-scenario') {
    const higher = rng() < 0.5;
    const ans = higher ? 'at a discount (below par).' : 'at a premium (above par).';
    return wrap('price-yield-scenario',
      `An investor holds a ${higher ? '4%' : '6%'} coupon bond. Newly issued comparable bonds now pay ${higher ? '6%' : '4%'}. If she sells before maturity, she will most likely sell it:`,
      assemble4(rng, ans, [
        { text: higher ? 'at a premium (above par).' : 'at a discount (below par).', why: higher ? 'her lower coupon is now less attractive, so buyers pay less — a discount' : 'her higher coupon is now more attractive, so buyers pay more — a premium', key: 'bond-price-yield-direction' },
        { text: 'at par (face value).', why: 'the bond only trades at par when its coupon equals current market rates', key: 'bond-price-yield-direction' },
        { text: 'at face value plus all future coupons.', why: 'price reflects present value, not a simple sum of future coupons' },
      ]),
      higher ? 'A 4% bond in a 6% market is worth less than par — it sells at a discount so its yield rises to match the market.' : 'A 6% bond in a 4% market is worth more than par — it sells at a premium so its yield falls to match the market.');
  }
  if (mode === 'current-yield-calc') {
    const v = pick(rng, [
      { c: 5, price: 800, cy: 6.25, ds: [6.00, 4.00] },
      { c: 6, price: 1200, cy: 5.00, ds: [4.50, 7.20] },
      { c: 4, price: 500, cy: 8.00, ds: [6.00, 10.00] },
    ]);
    const couponDollar = v.c / 100 * 1000;
    const ans = pctStr(v.cy);
    return wrap('current-yield-calc',
      `A bond with a $1,000 par value pays a ${v.c}% coupon and currently trades at $${v.price}. What is its current yield?`,
      assemble4(rng, ans, [
        { text: pctStr(v.c), why: `${v.c}% is the COUPON rate (coupon ÷ par); current yield uses the market PRICE`, key: 'current-yield-vs-coupon' },
        { text: pctStr(v.ds[0]), why: 'calculation slip — current yield = annual coupon ÷ price', key: null },
        { text: pctStr(v.ds[1]), why: 'calculation slip — current yield = annual coupon ÷ price', key: null },
      ]),
      `Current yield = annual coupon ($${couponDollar}) ÷ market price ($${v.price}) = ${pctStr(v.cy)}. It uses the PRICE paid, not par.`,
      { verifyValue: v.cy });
  }
  // yield-compare
  const disc = rng() < 0.5;
  const ans = disc ? 'Its current yield and yield to maturity are both HIGHER than its coupon rate.'
    : 'Its coupon rate is HIGHER than its current yield and yield to maturity.';
  return wrap('yield-compare',
    `A bond trades at a ${disc ? 'DISCOUNT (below par)' : 'PREMIUM (above par)'}. Which ordering of its yields is correct?`,
    assemble4(rng, ans, [
      { text: disc ? 'Its coupon rate is higher than its current yield and yield to maturity.' : 'Its current yield and yield to maturity are both higher than its coupon rate.', why: disc ? 'at a discount you pay less, so yields RISE above the coupon' : 'at a premium you pay more, so yields FALL below the coupon', key: 'current-yield-vs-coupon' },
      { text: 'Coupon rate, current yield, and yield to maturity are all equal.', why: 'they are only equal when the bond trades at par', key: 'current-yield-vs-coupon' },
      { text: 'The coupon rate always equals the current yield regardless of price.', why: 'current yield changes with price; the coupon rate is fixed', key: 'current-yield-vs-coupon' },
    ]), ans);
}

// ---- Products: systematic vs non-systematic risk -------------------------------
function investmentRisks(rng) {
  const mode = pick(rng, ['risk-identify', 'risk-match', 'risk-compare']);
  if (mode === 'risk-identify') {
    const sys = rng() < 0.5;
    if (sys) {
      return wrap('risk-identify', 'Which of the following is a SYSTEMATIC (market) risk?',
        assemble4(rng, 'A broad rise in interest rates that affects the entire bond market.', [
          { text: 'A product recall at a single manufacturer.', why: 'that is firm-specific (non-systematic) risk', key: 'systematic-vs-nonsystematic' },
          { text: 'One company losing a major lawsuit.', why: 'that is firm-specific (non-systematic) risk', key: 'systematic-vs-nonsystematic' },
          { text: 'A factory fire at one issuer.', why: 'that is firm-specific (non-systematic) risk', key: 'systematic-vs-nonsystematic' },
        ]), 'Systematic (market) risk affects the whole market — e.g., interest-rate, inflation, or recession risk — and cannot be diversified away.');
    }
    return wrap('risk-identify', 'Which of the following is a NON-SYSTEMATIC (diversifiable) risk?',
      assemble4(rng, 'A single company losing a major customer.', [
        { text: 'A market-wide recession.', why: 'that is systematic (market) risk affecting all securities', key: 'systematic-vs-nonsystematic' },
        { text: 'A general rise in interest rates.', why: 'that is systematic (market) risk', key: 'systematic-vs-nonsystematic' },
        { text: 'Broad inflation reducing purchasing power.', why: 'that is systematic (market) risk', key: 'systematic-vs-nonsystematic' },
      ]), 'Non-systematic risk is firm- or industry-specific and can be reduced through diversification.');
  }
  if (mode === 'risk-match') {
    const v = pick(rng, [
      { s: 'An investor holds only one company’s stock, and it drops sharply after that company loses a major lawsuit. This loss is an example of:', ans: 'non-systematic (firm-specific) risk.',
        d: 'systematic (market) risk.', why: 'the cause is specific to one company, so it is non-systematic', key: 'systematic-vs-nonsystematic' },
      { s: 'A well-diversified portfolio still falls during a broad market crash. This decline is an example of:', ans: 'systematic (market) risk.',
        d: 'non-systematic (firm-specific) risk.', why: 'a market-wide crash affects everything, so it is systematic', key: 'systematic-vs-nonsystematic' },
    ]);
    return wrap('risk-match', v.s, assemble4(rng, v.ans, [
      { text: v.d, why: v.why, key: v.key },
      { text: 'currency risk.', why: 'no foreign-exchange exposure is described' },
      { text: 'liquidity risk.', why: 'nothing about difficulty selling is described' },
    ]), `${v.ans[0].toUpperCase()}${v.ans.slice(1)}`);
  }
  const ans = 'Systematic risk affects the whole market and cannot be diversified away; non-systematic risk is firm-specific and can be reduced by diversification.';
  return wrap('risk-compare', 'Which statement correctly distinguishes systematic and non-systematic risk?',
    assemble4(rng, ans, [
      { text: 'Non-systematic risk affects the whole market and cannot be diversified away; systematic risk is firm-specific and diversifiable.', why: 'reversed — systematic = market-wide/undiversifiable', key: 'systematic-vs-nonsystematic' },
      { text: 'Both systematic and non-systematic risk can be diversified away.', why: 'systematic (market) risk cannot be diversified away', key: 'systematic-vs-nonsystematic' },
      { text: 'Neither type of risk can be reduced by diversification.', why: 'non-systematic risk CAN be reduced by diversification', key: 'systematic-vs-nonsystematic' },
    ]), ans);
}

// ---- Trading: market vs limit order --------------------------------------------
function orders(rng) {
  const mode = pick(rng, ['order-identify', 'order-scenario', 'order-compare']);
  if (mode === 'order-identify') {
    const market = rng() < 0.5;
    if (market) {
      return wrap('order-identify', 'Which order executes immediately at the best available price but does NOT guarantee a specific price?',
        assemble4(rng, 'A market order.', [
          { text: 'A limit order.', why: 'a limit order guarantees the price (or better) but not execution', key: 'market-vs-limit-order' },
          { text: 'A stop (stop-loss) order.', why: 'a stop order only activates once a trigger price is reached', key: null },
          { text: 'A good-til-canceled (GTC) order.', why: 'GTC is a duration instruction, not an execution type' },
        ]), 'A market order prioritizes speed — it fills right away at the best available price, but the exact price is not guaranteed.');
    }
    return wrap('order-identify', 'Which order sets a maximum price to pay (or a minimum to receive) but may NOT execute?',
      assemble4(rng, 'A limit order.', [
        { text: 'A market order.', why: 'a market order guarantees execution but not price', key: 'market-vs-limit-order' },
        { text: 'A stop order.', why: 'a stop order triggers at a price, then becomes a market order', key: null },
        { text: 'A GTC order.', why: 'GTC is how long the order stays open, not a price condition' },
      ]), 'A limit order guarantees the price (or better) but not that it will fill.');
  }
  if (mode === 'order-scenario') {
    const v = pick(rng, [
      { s: 'An investor wants to buy a volatile stock but refuses to pay more than $50 per share. Which order best fits?', ans: 'A buy limit order at $50.',
        ds: [{ text: 'A market order.', why: 'a market order could fill above $50 — it does not cap the price', key: 'market-vs-limit-order' }, { text: 'A sell limit order at $50.', why: 'she wants to BUY, not sell', key: null }, { text: 'A sell stop order at $50.', why: 'a sell stop is a downside-protection/exit tool, not a buy cap', key: null }] },
      { s: 'An investor wants to sell a position immediately and cares more about certainty of execution than the exact price. Which order best fits?', ans: 'A market order.',
        ds: [{ text: 'A sell limit order.', why: 'a limit could go unfilled if the price never reaches it — it sacrifices certainty', key: 'market-vs-limit-order' }, { text: 'A buy limit order.', why: 'she wants to SELL, not buy', key: null }, { text: 'A GTC order.', why: 'GTC is a duration, not what guarantees immediate execution' }] },
    ]);
    return wrap('order-scenario', v.s, assemble4(rng, v.ans, v.ds), `${v.ans} matches the stated priority.`);
  }
  const ans = 'A market order prioritizes speed/certainty of execution over price; a limit order prioritizes price over certainty of execution.';
  return wrap('order-compare', 'Which statement correctly distinguishes a market order from a limit order?',
    assemble4(rng, ans, [
      { text: 'A market order guarantees a specific price; a limit order guarantees immediate execution.', why: 'reversed — a limit guarantees price; a market guarantees execution', key: 'market-vs-limit-order' },
      { text: 'Both order types guarantee both price and execution.', why: 'no order guarantees both at once', key: 'market-vs-limit-order' },
      { text: 'A limit order always executes faster than a market order.', why: 'a market order is what fills immediately', key: 'market-vs-limit-order' },
    ]), ans);
}

// ---- Trading: insider trading / MNPI -------------------------------------------
function insiderTrading(rng) {
  const mode = pick(rng, ['insider-identify', 'mnpi-vs-public', 'insider-reverse']);
  if (mode === 'insider-identify') {
    return wrap('insider-identify', 'Which action is PROHIBITED as insider trading?',
      assemble4(rng, 'Trading on material nonpublic information obtained from a corporate insider.', [
        { text: 'Trading after the information has been released to the public.', why: 'once information is public, trading on it is permitted', key: 'mnpi-vs-public-info' },
        { text: 'Trading based on a published analyst research report.', why: 'published research is public information', key: 'mnpi-vs-public-info' },
        { text: 'Trading based on the company’s public press release.', why: 'a public press release is public information', key: 'mnpi-vs-public-info' },
      ]), 'Insider trading is trading on MATERIAL NONPUBLIC information (or tipping others to do so). Once the information is public, trading on it is allowed.');
  }
  if (mode === 'mnpi-vs-public') {
    const wantMnpi = rng() < 0.5;
    if (wantMnpi) {
      return wrap('mnpi-vs-public', 'Which best describes MATERIAL NONPUBLIC information (MNPI)?',
        assemble4(rng, 'Information a reasonable investor would consider important that has not yet been disseminated to the public.', [
          { text: 'Any information already reported in the news.', why: 'that is PUBLIC information, not nonpublic', key: 'mnpi-vs-public-info' },
          { text: 'An analyst’s opinion based entirely on public data.', why: 'analysis of public data is public, not MNPI', key: 'mnpi-vs-public-info' },
          { text: 'Any information at all about a public company.', why: 'MNPI must be BOTH material AND nonpublic — not just any information' },
        ]), 'MNPI is information that is BOTH material (would affect a reasonable investor’s decision) AND not yet public.');
    }
    return wrap('mnpi-vs-public', 'Which of the following is PUBLIC information that a representative may trade on?',
      assemble4(rng, 'An earnings figure released in the company’s public press release.', [
        { text: 'A merger a board member told you about before any announcement.', why: 'that is material NONPUBLIC information — prohibited', key: 'mnpi-vs-public-info' },
        { text: 'Quarterly results you saw in a draft before public release.', why: 'not yet public — that is MNPI', key: 'mnpi-vs-public-info' },
        { text: 'A tip overheard in the CEO’s private meeting.', why: 'nonpublic insider information — prohibited', key: 'mnpi-vs-public-info' },
      ]), 'Once information has been publicly released, it is public and may be traded on.');
  }
  // insider-reverse
  return wrap('insider-reverse', 'Which action is PERMITTED (i.e., is NOT insider trading)?',
    assemble4(rng, 'Buying a stock after its earnings have been announced publicly.', [
      { text: 'Buying ahead of a merger you learned of from an insider.', why: 'trading on nonpublic insider information is prohibited', key: 'insider-trading-party-confusion' },
      { text: 'Tipping a friend about nonpublic earnings so they can trade.', why: 'tipping MNPI is prohibited even if you don’t trade yourself', key: 'insider-trading-party-confusion' },
      { text: 'Trading on results overheard in a private boardroom.', why: 'that is nonpublic information — prohibited', key: 'mnpi-vs-public-info' },
    ]), 'Trading on information only AFTER it is public is permitted. Trading on — or tipping — MNPI is prohibited, and the tipper is liable too.');
}

// ---- Trading: market manipulation recognition ----------------------------------
function marketManipulation(rng) {
  const mode = pick(rng, ['manip-identify', 'manip-scenario', 'manip-reverse']);
  if (mode === 'manip-identify') {
    return wrap('manip-identify', 'Which of the following is prohibited MARKET MANIPULATION?',
      assemble4(rng, 'Spreading false rumors to inflate a stock’s price so you can sell into the hype (pump and dump).', [
        { text: 'Placing a limit order at the price you are willing to pay.', why: 'a legitimate order is not manipulation', key: 'manipulation-category-confusion' },
        { text: 'Publishing an honest research report with disclosed assumptions.', why: 'honest, disclosed research is legitimate', key: 'manipulation-category-confusion' },
        { text: 'Buying a stock you genuinely believe is undervalued.', why: 'a good-faith investment decision is legitimate', key: 'manipulation-category-confusion' },
      ]), 'Market manipulation is intentional conduct designed to deceive or create a false appearance of market activity or price — e.g., pump-and-dump, marking the close, or matched orders.');
  }
  if (mode === 'manip-scenario') {
    const v = pick(rng, [
      { s: 'A trader enters many buy orders in the final seconds of trading to push the closing price up, then cancels them. This is best described as:', ans: 'marking the close (manipulation).',
        ds: [{ text: 'front running.', why: 'front running is trading ahead of a known customer order — a different prohibited category', key: 'manipulation-category-confusion' }, { text: 'a legitimate market order.', why: 'orders placed to move the price and then canceled are manipulative, not legitimate', key: 'manipulation-category-confusion' }, { text: 'a stop order.', why: 'a stop order is a normal order type, not this conduct' }] },
      { s: 'A broker buys a security for his own account just before entering a large customer order he knows will move the price. This is best described as:', ans: 'front running (prohibited).',
        ds: [{ text: 'marking the open.', why: 'that is a different manipulation category (affecting the opening price)', key: 'manipulation-category-confusion' }, { text: 'a legitimate personal trade.', why: 'trading ahead of a known customer order is prohibited', key: 'manipulation-category-confusion' }, { text: 'a suitability violation.', why: 'the issue is trading ahead of the customer, not suitability' }] },
    ]);
    return wrap('manip-scenario', v.s, assemble4(rng, v.ans, v.ds), `${v.ans[0].toUpperCase()}${v.ans.slice(1)}`);
  }
  // manip-reverse
  return wrap('manip-reverse', 'Which activity is LEGITIMATE (i.e., NOT market manipulation)?',
    assemble4(rng, 'Buying shares because you believe, in good faith, the company is undervalued.', [
      { text: 'Coordinating trades among accounts to create the appearance of active trading.', why: 'creating fake activity (e.g., matched orders/wash trades) is manipulation', key: 'manipulation-category-confusion' },
      { text: 'Spreading a false rumor to move a stock’s price.', why: 'spreading false information to move a price is manipulation', key: 'manipulation-category-confusion' },
      { text: 'Entering and canceling orders to paint a misleading price at the close.', why: 'marking the close is manipulation', key: 'manipulation-category-confusion' },
    ]), 'A good-faith investment decision based on your own analysis is legitimate; conduct designed to deceive the market is manipulation.');
}

// topic:subskill -> generator(rng). One per slice subskill; each rotates families.
export const SIE_SLICE_GENERATORS = {
  'capitalMarkets:regulators': regulators,
  'capitalMarkets:marketStructure': marketStructure,
  'products:debt': debt,
  'products:investmentRisks': investmentRisks,
  'trading:orders': orders,
  'trading:insiderTrading': insiderTrading,
  'trading:marketManipulation': marketManipulation,
};
