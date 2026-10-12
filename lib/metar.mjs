// Bộ giải mã METAR/SPECI theo quy tắc (ICAO Annex 3 / WMO FM 15-16).
// Không suy đoán: nhóm nào không khớp quy tắc được đưa vào `unknown` để người dùng đối chiếu bản gốc.

const INTENSITY = { '-': 'nhẹ', '+': 'lớn', VC: 'lân cận' };
const DESCRIPTOR = {
  MI: 'nông', BC: 'từng mảng', PR: 'một phần sân bay', DR: 'thổi thấp',
  BL: 'thổi cao', SH: 'dạng rào', TS: 'Dông', FZ: 'đóng băng',
};
const PHENOMENON = {
  DZ: 'mưa phùn', RA: 'mưa', SN: 'tuyết', SG: 'tuyết hạt', IC: 'tinh thể băng',
  PL: 'hạt băng', GR: 'mưa đá', GS: 'mưa đá nhỏ', UP: 'giáng thủy không xác định',
  BR: 'mù', FG: 'sương mù', FU: 'khói', VA: 'tro núi lửa', DU: 'bụi', SA: 'cát',
  HZ: 'mù khô', PO: 'xoáy bụi/cát', SQ: 'tố', FC: 'vòi rồng', SS: 'bão cát', DS: 'bão bụi',
};
const WX_RE = /^(-|\+|VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|SG|IC|PL|GR|GS|UP)+|BR|FG|FU|VA|DU|SA|HZ|PO|SQ|FC|SS|DS)?$/;
const CLOUD = { FEW: 'Ít mây', SCT: 'Mây rải rác', BKN: 'Nhiều mây', OVC: 'Mây phủ kín' };
const CLOUD_TYPE = { CB: 'CB – mây vũ tích', TCU: 'TCU – mây tích cao', '///': 'loại mây không xác định' };
const TREND_TIME = { FM: 'từ', TL: 'đến', AT: 'lúc' };
const RVR_TREND = { U: 'xu hướng tăng', D: 'xu hướng giảm', N: 'không đổi' };
const DIRS = { N: 'Bắc', NE: 'Đông Bắc', E: 'Đông', SE: 'Đông Nam', S: 'Nam', SW: 'Tây Nam', W: 'Tây', NW: 'Tây Bắc' };

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const signed = v => (v[0] === 'M' ? -1 : 1) * parseInt(v.replace('M', ''), 10);

export function decodeWeather(code) {
  const m = code.match(WX_RE);
  if (!m || (!m[2] && !m[3])) return null;
  const [, intensity, desc, phen] = m;
  const phenName = phen ? phen.match(/../g).map(p => PHENOMENON[p]).join(' và ') : '';
  let text;
  if (desc === 'TS') text = phenName ? `Dông kèm ${phenName}` : 'Dông';
  else if (desc === 'SH') text = !phenName || phen === 'RA' ? 'Mưa rào' : `${phenName} dạng rào`;
  else if (desc) text = phenName ? `${phenName} ${DESCRIPTOR[desc]}` : null;
  else text = phenName;
  if (!text) return null;
  if (intensity) text += ` ${INTENSITY[intensity]}`;
  return cap(text);
}

function visText(n) {
  if (n >= 9999) return '>= 10 km';
  if (n === 0) return '< 50 m';
  return n >= 5000 ? `${n / 1000} km` : `${n} m`;
}

// Giải mã một nhóm; dùng chung cho phần chính và phần xu hướng (TEMPO/BECMG).
function decodeGroup(x) {
  let m;
  if (x === 'CAVOK') return { field: 'cavok', text: 'CAVOK: tầm nhìn >= 10 km, không mây dưới 5000 ft, không CB/TCU, không hiện tượng thời tiết đáng kể' };
  if ((m = x.match(/^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/))) {
    const unit = m[4] === 'KT' ? 'kt' : 'm/s';
    const detail = { dir: m[1] === 'VRB' ? 'VRB' : parseInt(m[1], 10), speed: parseInt(m[2], 10), gust: m[3] ? parseInt(m[3], 10) : null, unit };
    if (detail.dir === 0 && detail.speed === 0 && !m[3]) return { field: 'wind', text: 'Lặng gió', detail };
    return { field: 'wind', detail, text: `${m[1] === 'VRB' ? 'Hướng thay đổi' : `Hướng ${m[1]}°`}, ${detail.speed} ${unit}${m[3] ? `, giật ${detail.gust} ${unit}` : ''}` };
  }
  if ((m = x.match(/^(\d{3})V(\d{3})$/))) return { field: 'windVar', from: parseInt(m[1], 10), to: parseInt(m[2], 10), text: `Hướng dao động từ ${m[1]}° đến ${m[2]}°` };
  if ((m = x.match(/^(\d{4})(NDV)?$/))) return { field: 'vis', text: visText(parseInt(m[1], 10)) + (m[2] ? ' (không phân biệt hướng)' : '') };
  if ((m = x.match(/^(\d{4})(N|NE|E|SE|S|SW|W|NW)$/))) return { field: 'visMin', text: `Tầm nhìn tối thiểu ${visText(parseInt(m[1], 10))} về hướng ${DIRS[m[2]]}` };
  if ((m = x.match(/^R(\d{2}[LCR]?)\/([PM])?(\d{4})(?:V([PM])?(\d{4}))?(FT)?\/?([UDN])?$/))) {
    const unit = m[6] ? 'ft' : 'm';
    const val = (q, n) => `${q === 'P' ? 'trên ' : q === 'M' ? 'dưới ' : ''}${parseInt(n, 10)} ${unit}`;
    return { field: 'rvr', text: `Đường CHC ${m[1]}: ${val(m[2], m[3])}${m[5] ? ` đến ${val(m[4], m[5])}` : ''}${m[7] ? `, ${RVR_TREND[m[7]]}` : ''}` };
  }
  if ((m = x.match(/^(FEW|SCT|BKN|OVC)(\d{3}|\/\/\/)(CB|TCU|\/\/\/)?$/))) {
    const base = m[2] === '///' ? 'không xác định' : `${parseInt(m[2], 10) * 100} ft`;
    return { field: 'clouds', text: `${CLOUD[m[1]]}, đáy ${base}${m[3] ? ` (${CLOUD_TYPE[m[3]]})` : ''}` };
  }
  if ((m = x.match(/^VV(\d{3}|\/\/\/)$/))) return { field: 'clouds', text: m[1] === '///' ? 'Bầu trời bị che khuất, tầm nhìn thẳng đứng không xác định' : `Bầu trời bị che khuất, tầm nhìn thẳng đứng ${parseInt(m[1], 10) * 100} ft` };
  if (x === 'NSC') return { field: 'clouds', text: 'Không có mây đáng kể' };
  if (x === 'NCD') return { field: 'clouds', text: 'Không phát hiện mây (trạm tự động)' };
  if (x === 'SKC' || x === 'CLR') return { field: 'clouds', text: 'Trời quang' };
  if (x === 'NSW') return { field: 'weather', text: 'Hết hiện tượng thời tiết đáng kể' };
  if ((m = x.match(/^RE(.+)$/)) && decodeWeather(m[1])) return { field: 'recent', text: `Gần đây: ${decodeWeather(m[1]).toLowerCase()}` };
  const w = decodeWeather(x);
  if (w) return { field: 'weather', text: w };
  return null;
}

export function parseMetar(raw) {
  const original = String(raw ?? '');
  const t = original.toUpperCase().replace(/=/g, ' ').trim().split(/\s+/).filter(Boolean);
  const o = {
    raw: original, type: '', station: '', time: '', flags: [],
    wind: '', windDetail: null, windVar: '', vis: '', visMin: '', cavok: false,
    rvr: [], weather: [], recent: [], clouds: [], temp: '', dew: '', qnh: '',
    windshear: [], trends: [], remarks: [], unknown: [],
  };
  let i = 0;
  if (t[0] === 'METAR' || t[0] === 'SPECI') o.type = t[i++];
  else o.type = 'METAR';
  if (t[i] === 'COR') o.flags.push(t[i++]);
  if (/^[A-Z]{4}$/.test(t[i] || '')) o.station = t[i++];

  let trend = null;
  for (; i < t.length; i++) {
    const x = t[i];
    if (x === 'RMK') { o.remarks = t.slice(i + 1); break; }
    if (x === 'NOSIG') { trend = null; o.trends.push({ kind: 'NOSIG', time: '', items: ['Không có thay đổi đáng kể trong 2 giờ tới'] }); continue; }
    if (x === 'TEMPO' || x === 'BECMG') { trend = { kind: x, time: '', items: [] }; o.trends.push(trend); continue; }
    if (trend) {
      const tm = x.match(/^(FM|TL|AT)(\d{2})(\d{2})$/);
      if (tm) { trend.time = `${trend.time ? trend.time + ' ' : ''}${TREND_TIME[tm[1]]} ${tm[2]}:${tm[3]} UTC`; continue; }
      const g = decodeGroup(x);
      if (g) trend.items.push(g.text); else o.unknown.push(x);
      continue;
    }
    if (/^\d{6}Z$/.test(x)) { o.time = `Ngày ${x.slice(0, 2)}, ${x.slice(2, 4)}:${x.slice(4, 6)} UTC`; continue; }
    if (x === 'AUTO' || x === 'NIL' || x === 'COR') { o.flags.push(x); continue; }
    if (x === 'WS') {
      // WS RWY17 | WS R17 | WS ALL RWY
      if (t[i + 1] === 'ALL' && t[i + 2] === 'RWY') { o.windshear.push('Gió đứt trên tất cả đường CHC'); i += 2; continue; }
      const r = (t[i + 1] || '').match(/^(?:RWY|R)(\d{2}[LCR]?)$/);
      if (r) { o.windshear.push(`Gió đứt trên đường CHC ${r[1]}`); i += 1; continue; }
      o.unknown.push(x); continue;
    }
    let m;
    if ((m = x.match(/^(M?\d{2})\/(M?\d{2})?$/))) { o.temp = `${signed(m[1])}°C`; o.dew = m[2] ? `${signed(m[2])}°C` : ''; continue; }
    if (/^Q\d{4}$/.test(x)) { o.qnh = `${parseInt(x.slice(1), 10)} hPa`; continue; }
    if (/^A\d{4}$/.test(x)) { o.qnh = `${x.slice(1, 3)}.${x.slice(3)} inHg`; continue; }
    const g = decodeGroup(x);
    if (!g) { o.unknown.push(x); continue; }
    switch (g.field) {
      case 'cavok': o.cavok = true; o.vis = '>= 10 km (CAVOK)'; o.clouds.push('CAVOK: không mây dưới 5000 ft, không CB/TCU'); break;
      case 'wind': o.wind = g.text; o.windDetail = g.detail; break;
      case 'windVar': o.windVar = g.text; if (o.windDetail) Object.assign(o.windDetail, { varFrom: g.from, varTo: g.to }); break;
      case 'vis': o.vis = g.text; break;
      case 'visMin': o.visMin = g.text; break;
      default: o[g.field].push(g.text);
    }
  }
  return o;
}
