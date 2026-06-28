/**
 * sync.js — Prode Mundial 2026
 * Fuente: football-data.org (tier gratuito, cubre FIFA World Cup)
 *
 * Variables de entorno requeridas (GitHub Secrets):
 *   FDO_API_KEY          — tu key de football-data.org (la recibís por mail al registrarte)
 *   FIREBASE_DB_URL      — https://prode-picci-default-rtdb.firebaseio.com
 *   FIREBASE_DB_SECRET   — Database Secret (Firebase Console > Project Settings > Service Accounts > Database secrets)
 *
 * Uso local:
 *   FDO_API_KEY=xxx FIREBASE_DB_URL=https://... FIREBASE_DB_SECRET=yyy node sync.js
 */

const FDO_KEY  = process.env.FDO_API_KEY;
const FB_URL   = process.env.FIREBASE_DB_URL || 'https://prode-picci-default-rtdb.firebaseio.com';
const FB_AUTH  = process.env.FIREBASE_DB_SECRET;

if (!FDO_KEY || !FB_AUTH) {
  console.error('Faltan FDO_API_KEY o FIREBASE_DB_SECRET');
  process.exit(1);
}

// ── Team name mapping (football-data.org English → our Spanish) ────────────
const FDO_TO_OUR = {
  'Mexico':'México','México':'México',
  'South Africa':'Sudáfrica',
  'South Korea':'Corea del Sur','Korea Republic':'Corea del Sur',
  'Czech Republic':'Chequia','Czechia':'Chequia',
  'Canada':'Canadá',
  'Bosnia and Herzegovina':'Bosnia y Herzegovina','Bosnia-Herzegovina':'Bosnia y Herzegovina',
  'Qatar':'Qatar','Switzerland':'Suiza','Brazil':'Brasil','Morocco':'Marruecos','Haiti':'Haití',
  'Scotland':'Escocia','United States':'Estados Unidos','USA':'Estados Unidos',
  'Paraguay':'Paraguay','Australia':'Australia','Turkey':'Turquía','Türkiye':'Turquía',
  'Germany':'Alemania','Curaçao':'Curazao','Curacao':'Curazao','Ecuador':'Ecuador',
  "Côte d'Ivoire":'Costa de Marfil','Ivory Coast':'Costa de Marfil',
  'Netherlands':'Países Bajos','Holland':'Países Bajos',
  'Japan':'Japón','Sweden':'Suecia','Tunisia':'Túnez','Belgium':'Bélgica',
  'Egypt':'Egipto','Iran':'Irán','New Zealand':'Nueva Zelanda','Spain':'España',
  'Cape Verde':'Cabo Verde','Saudi Arabia':'Arabia Saudita','Uruguay':'Uruguay',
  'France':'Francia','Senegal':'Senegal','Iraq':'Irak','Norway':'Noruega',
  'Argentina':'Argentina','Algeria':'Argelia','Austria':'Austria','Jordan':'Jordania',
  'Portugal':'Portugal',
  'DR Congo':'República Democrática del Congo',
  'Democratic Republic of Congo':'República Democrática del Congo',
  'Democratic Republic of the Congo':'República Democrática del Congo',
  'Uzbekistan':'Uzbekistán','Colombia':'Colombia','England':'Inglaterra',
  'Croatia':'Croacia','Ghana':'Ghana','Panama':'Panamá',
};
const map = n => FDO_TO_OUR[n] || n;

// ── Group match data ───────────────────────────────────────────────────────
const GROUPS = {
  A:{matches:[{id:'A1',h:'México',a:'Sudáfrica'},{id:'A2',h:'Corea del Sur',a:'Chequia'},{id:'A3',h:'Chequia',a:'Sudáfrica'},{id:'A4',h:'México',a:'Corea del Sur'},{id:'A5',h:'Sudáfrica',a:'Corea del Sur'},{id:'A6',h:'Chequia',a:'México'}]},
  B:{matches:[{id:'B1',h:'Canadá',a:'Bosnia y Herzegovina'},{id:'B2',h:'Qatar',a:'Suiza'},{id:'B3',h:'Suiza',a:'Bosnia y Herzegovina'},{id:'B4',h:'Canadá',a:'Qatar'},{id:'B5',h:'Bosnia y Herzegovina',a:'Qatar'},{id:'B6',h:'Suiza',a:'Canadá'}]},
  C:{matches:[{id:'C1',h:'Brasil',a:'Marruecos'},{id:'C2',h:'Haití',a:'Escocia'},{id:'C3',h:'Brasil',a:'Haití'},{id:'C4',h:'Escocia',a:'Marruecos'},{id:'C5',h:'Marruecos',a:'Haití'},{id:'C6',h:'Escocia',a:'Brasil'}]},
  D:{matches:[{id:'D1',h:'Estados Unidos',a:'Paraguay'},{id:'D2',h:'Australia',a:'Turquía'},{id:'D3',h:'Estados Unidos',a:'Australia'},{id:'D4',h:'Turquía',a:'Paraguay'},{id:'D5',h:'Paraguay',a:'Australia'},{id:'D6',h:'Turquía',a:'Estados Unidos'}]},
  E:{matches:[{id:'E1',h:'Alemania',a:'Curazao'},{id:'E2',h:'Costa de Marfil',a:'Ecuador'},{id:'E3',h:'Ecuador',a:'Curazao'},{id:'E4',h:'Alemania',a:'Costa de Marfil'},{id:'E5',h:'Ecuador',a:'Alemania'},{id:'E6',h:'Curazao',a:'Costa de Marfil'}]},
  F:{matches:[{id:'F1',h:'Países Bajos',a:'Japón'},{id:'F2',h:'Suecia',a:'Túnez'},{id:'F3',h:'Países Bajos',a:'Suecia'},{id:'F4',h:'Túnez',a:'Japón'},{id:'F5',h:'Túnez',a:'Países Bajos'},{id:'F6',h:'Japón',a:'Suecia'}]},
  G:{matches:[{id:'G1',h:'Bélgica',a:'Egipto'},{id:'G2',h:'Irán',a:'Nueva Zelanda'},{id:'G3',h:'Bélgica',a:'Irán'},{id:'G4',h:'Nueva Zelanda',a:'Egipto'},{id:'G5',h:'Nueva Zelanda',a:'Bélgica'},{id:'G6',h:'Egipto',a:'Irán'}]},
  H:{matches:[{id:'H1',h:'Arabia Saudita',a:'Uruguay'},{id:'H2',h:'España',a:'Cabo Verde'},{id:'H3',h:'Uruguay',a:'Cabo Verde'},{id:'H4',h:'España',a:'Arabia Saudita'},{id:'H5',h:'Cabo Verde',a:'Arabia Saudita'},{id:'H6',h:'Uruguay',a:'España'}]},
  I:{matches:[{id:'I1',h:'Francia',a:'Senegal'},{id:'I2',h:'Irak',a:'Noruega'},{id:'I3',h:'Senegal',a:'Irak'},{id:'I4',h:'Noruega',a:'Francia'},{id:'I5',h:'Noruega',a:'Senegal'},{id:'I6',h:'Francia',a:'Irak'}]},
  J:{matches:[{id:'J1',h:'Austria',a:'Jordania'},{id:'J2',h:'Argentina',a:'Argelia'},{id:'J3',h:'Argentina',a:'Austria'},{id:'J4',h:'Jordania',a:'Argelia'},{id:'J5',h:'Argelia',a:'Austria'},{id:'J6',h:'Jordania',a:'Argentina'}]},
  K:{matches:[{id:'K1',h:'Uzbekistán',a:'Colombia'},{id:'K2',h:'Portugal',a:'República Democrática del Congo'},{id:'K3',h:'Portugal',a:'Uzbekistán'},{id:'K4',h:'Colombia',a:'República Democrática del Congo'},{id:'K5',h:'Colombia',a:'Portugal'},{id:'K6',h:'República Democrática del Congo',a:'Uzbekistán'}]},
  L:{matches:[{id:'L1',h:'Ghana',a:'Panamá'},{id:'L2',h:'Inglaterra',a:'Croacia'},{id:'L3',h:'Inglaterra',a:'Ghana'},{id:'L4',h:'Panamá',a:'Croacia'},{id:'L5',h:'Croacia',a:'Ghana'},{id:'L6',h:'Panamá',a:'Inglaterra'}]},
};

// KO slot definitions — bracket oficial FIFA 2026 (mirrors HTML constants)
const KO_SLOTS = {
  r32_01:{hs:{t:'grp',g:'B',p:1},as:{t:'grp',g:'A',p:2}}, // 1°B vs 2°A = Canadá vs Sudáfrica
  r32_02:{hs:{t:'grp',g:'E',p:1},as:{t:'3rd', g:'D'}},     // 1°E vs 3°D = Alemania vs Paraguay
  r32_03:{hs:{t:'grp',g:'C',p:1},as:{t:'grp',g:'F',p:2}},  // 1°C vs 2°F = Brasil vs Japón
  r32_04:{hs:{t:'grp',g:'F',p:1},as:{t:'grp',g:'C',p:2}},  // 1°F vs 2°C = Países Bajos vs Marruecos
  r32_05:{hs:{t:'grp',g:'E',p:2},as:{t:'grp',g:'I',p:2}},  // 2°E vs 2°I = Costa de Marfil vs Noruega
  r32_06:{hs:{t:'grp',g:'I',p:1},as:{t:'3rd', g:'F'}},     // 1°I vs 3°F = Francia vs Suecia
  r32_07:{hs:{t:'grp',g:'A',p:1},as:{t:'3rd', g:'E'}},     // 1°A vs 3°E = México vs Ecuador
  r32_08:{hs:{t:'grp',g:'L',p:1},as:{t:'3rd', g:'K'}},     // 1°L vs 3°K = Inglaterra vs RD Congo
  r32_09:{hs:{t:'grp',g:'G',p:1},as:{t:'3rd', g:'I'}},     // 1°G vs 3°I = Bélgica vs Senegal
  r32_10:{hs:{t:'grp',g:'D',p:1},as:{t:'3rd', g:'B'}},     // 1°D vs 3°B = EE.UU. vs Bosnia y Herz.
  r32_11:{hs:{t:'grp',g:'H',p:1},as:{t:'grp',g:'J',p:2}},  // 1°H vs 2°J = España vs Austria
  r32_12:{hs:{t:'grp',g:'K',p:2},as:{t:'grp',g:'L',p:2}},  // 2°K vs 2°L = Portugal vs Croacia
  r32_13:{hs:{t:'grp',g:'B',p:2},as:{t:'3rd', g:'J'}},     // 2°B vs 3°J = Suiza vs Argelia
  r32_14:{hs:{t:'grp',g:'K',p:1},as:{t:'3rd', g:'L'}},     // 1°K vs 3°L = Colombia vs Ghana
  r32_15:{hs:{t:'grp',g:'J',p:1},as:{t:'grp',g:'H',p:2}},  // 1°J vs 2°H = Argentina vs Cabo Verde
  r32_16:{hs:{t:'grp',g:'D',p:2},as:{t:'grp',g:'G',p:2}},  // 2°D vs 2°G = Australia vs Egipto
  r16_01:{hs:{t:'ko',m:'r32_02'},as:{t:'ko',m:'r32_05'}},   // W(Alem/Par) vs W(CdM/Nor)
  r16_02:{hs:{t:'ko',m:'r32_01'},as:{t:'ko',m:'r32_03'}},   // W(Can/SA) vs W(Bra/Jap)
  r16_03:{hs:{t:'ko',m:'r32_04'},as:{t:'ko',m:'r32_06'}},   // W(PB/Mar) vs W(Fra/Sue)
  r16_04:{hs:{t:'ko',m:'r32_07'},as:{t:'ko',m:'r32_08'}},   // W(Méx/Ecu) vs W(Ing/RDC)
  r16_05:{hs:{t:'ko',m:'r32_11'},as:{t:'ko',m:'r32_12'}},   // W(Esp/Aut) vs W(Por/Cro)
  r16_06:{hs:{t:'ko',m:'r32_09'},as:{t:'ko',m:'r32_10'}},   // W(Bel/Sen) vs W(EEU/Bos)
  r16_07:{hs:{t:'ko',m:'r32_14'},as:{t:'ko',m:'r32_16'}},   // W(Col/Gha) vs W(Aus/Egi)
  r16_08:{hs:{t:'ko',m:'r32_13'},as:{t:'ko',m:'r32_15'}},   // W(Sui/Alg) vs W(Arg/CabV)
  qf_01:{hs:{t:'ko',m:'r16_01'},as:{t:'ko',m:'r16_02'}},
  qf_02:{hs:{t:'ko',m:'r16_05'},as:{t:'ko',m:'r16_06'}},
  qf_03:{hs:{t:'ko',m:'r16_03'},as:{t:'ko',m:'r16_04'}},
  qf_04:{hs:{t:'ko',m:'r16_07'},as:{t:'ko',m:'r16_08'}},
  sf_01:{hs:{t:'ko',m:'qf_01'},as:{t:'ko',m:'qf_02'}},
  sf_02:{hs:{t:'ko',m:'qf_03'},as:{t:'ko',m:'qf_04'}},
  third:{hs:{t:'koL',m:'sf_01'},as:{t:'koL',m:'sf_02'}},
  final:{hs:{t:'ko',m:'sf_01'},as:{t:'ko',m:'sf_02'}},
};

// ── Helpers ────────────────────────────────────────────────────────────────
async function fdoGet(path) {
  const res = await fetch(`https://api.football-data.org/v4${path}`, {
    headers: { 'X-Auth-Token': FDO_KEY },
  });
  if (!res.ok) throw new Error(`FDO ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fbPut(path, data) {
  const res = await fetch(`${FB_URL}/${path}.json?auth=${FB_AUTH}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PUT ${path}: ${res.status}`);
}

async function fbGet(path) {
  const res = await fetch(`${FB_URL}/${path}.json?auth=${FB_AUTH}`);
  if (!res.ok) throw new Error(`Firebase GET ${path}: ${res.status}`);
  return res.json();
}

function standings(matches, results) {
  const t = {};
  matches.forEach(m => { t[m.h]={pts:0,gf:0,gc:0}; t[m.a]={pts:0,gf:0,gc:0}; });
  matches.forEach(m => {
    const r = results[m.id];
    if (!r || r.h == null) return;
    const rh = +r.h, ra = +r.a;
    t[m.h].gf+=rh; t[m.h].gc+=ra; t[m.a].gf+=ra; t[m.a].gc+=rh;
    if (rh>ra) t[m.h].pts+=3; else if (ra>rh) t[m.a].pts+=3; else { t[m.h].pts++; t[m.a].pts++; }
  });
  return Object.entries(t).map(([team,s])=>({team,...s,dg:s.gf-s.gc}))
    .sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf);
}

function resolveSlot(slot, realGroups, realKO) {
  if (slot.t === 'grp') {
    const g = GROUPS[slot.g];
    const rows = g ? standings(g.matches, realGroups) : [];
    return rows[slot.p-1]?.team || null;
  }
  if (slot.t === '3rd') {
    const grp = GROUPS[slot.g];
    const rows = grp ? standings(grp.matches, realGroups) : [];
    return rows[2]?.team || null;
  }
  if (slot.t === 'ko' || slot.t === 'koL') {
    const r = realKO[slot.m];
    if (!r || r.h == null) return null;
    const rh = +r.h, ra = +r.a;
    const slots2 = KO_SLOTS[slot.m];
    if (!slots2) return null;
    const ht = resolveSlot(slots2.hs, realGroups, realKO);
    const at = resolveSlot(slots2.as, realGroups, realKO);
    if (slot.t === 'koL') {
      if (rh !== ra) return rh > ra ? at : ht;
      return (+r.ph > +r.pa) ? at : ht;
    }
    if (rh !== ra) return rh > ra ? ht : at;
    return (+r.ph > +r.pa) ? ht : at;
  }
  return null;
}

// ── Main sync ──────────────────────────────────────────────────────────────
async function syncMatches(realGroups, realKO) {
  console.log('[matches] Fetching finished matches from football-data.org...');
  const json = await fdoGet('/competitions/WC/matches?status=FINISHED');
  const matches = json.matches || [];
  console.log(`[matches] API returned ${matches.length} finished matches`);

  let groupUpdates = 0, koUpdates = 0, skipped = 0;

  for (const m of matches) {
    const hRaw = m.homeTeam?.name || m.homeTeam?.shortName || '';
    const aRaw = m.awayTeam?.name || m.awayTeam?.shortName || '';
    const hName = map(hRaw), aName = map(aRaw);
    const tag = `${hRaw}(→${hName}) vs ${aRaw}(→${aName}) | stage=${m.stage} status=${m.status} date=${m.utcDate}`;

    if (!hRaw || !aRaw) { console.warn(`[skip] sin nombres de equipo | ${tag}`); skipped++; continue; }

    const score  = m.score || {};
    const ft     = score.fullTime || {};
    const pen    = score.penalties || {};
    const hasPen = score.duration === 'PENALTY_SHOOTOUT';
    const result = { h: ft.home ?? 0, a: ft.away ?? 0 };
    if (hasPen) { result.ph = pen.home ?? 0; result.pa = pen.away ?? 0; }

    if (m.stage === 'GROUP_STAGE') {
      let found = null;
      for (const grp of Object.values(GROUPS)) {
        for (const gm of grp.matches) {
          if (gm.h===hName&&gm.a===aName) { found={id:gm.id,rev:false}; break; }
          if (gm.h===aName&&gm.a===hName) { found={id:gm.id,rev:true};  break; }
        }
        if (found) break;
      }
      if (!found) { console.warn(`[skip] grupo sin match en GROUPS | ${tag}`); skipped++; continue; }
      const r = found.rev ? {h:result.a,a:result.h} : result;
      await fbPut(`real/groups/${found.id}`, r);
      realGroups[found.id] = r;
      groupUpdates++;
      console.log(`[ok] groups/${found.id} = ${JSON.stringify(r)} | ${tag}`);
    } else {
      let found = null;
      for (const [kid, slots] of Object.entries(KO_SLOTS)) {
        const mh = resolveSlot(slots.hs, realGroups, realKO);
        const ma = resolveSlot(slots.as, realGroups, realKO);
        if (!mh || !ma) continue;
        if (mh===hName&&ma===aName) { found={id:kid,rev:false}; break; }
        if (mh===aName&&ma===hName) { found={id:kid,rev:true};  break; }
      }
      if (!found) { console.warn(`[skip] KO sin slot resuelto todavía (depende de tabla de grupos) | ${tag}`); skipped++; continue; }
      const rev = found.rev;
      const r = rev
        ? { h:result.a, a:result.h, ...(hasPen?{ph:result.pa,pa:result.ph}:{}) }
        : result;
      await fbPut(`real/ko/${found.id}`, r);
      realKO[found.id] = r;
      koUpdates++;
      console.log(`[ok] ko/${found.id} = ${JSON.stringify(r)} | ${tag}`);
    }
  }
  console.log(`[matches] ✅ Groups: ${groupUpdates}, KO: ${koUpdates}, skipped: ${skipped}`);
}

async function main() {
  console.log(`=== Prode Sync — ${new Date().toISOString()} ===`);
  const realData   = await fbGet('real') || {};
  const realGroups = realData.groups || {};
  const realKO     = realData.ko || {};
  await syncMatches(realGroups, realKO);
  console.log('=== Done ===');
}

main().catch(e => { console.error(e); process.exit(1); });
