import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMetar, decodeWeather } from '../lib/metar.mjs';

test('CAVOK, gió biến đổi hướng và NOSIG (VVVH)', () => {
  const raw = 'METAR VVVH 120500Z 34006KT 300V020 CAVOK 29/22 Q1012 NOSIG=';
  const p = parseMetar(raw);
  assert.equal(p.raw, raw);
  assert.equal(p.station, 'VVVH');
  assert.equal(p.wind, 'Hướng 340°, 6 kt');
  assert.equal(p.windVar, 'Hướng dao động từ 300° đến 020°');
  assert.deepEqual(p.windDetail, { dir: 340, speed: 6, gust: null, unit: 'kt', varFrom: 300, varTo: 20 });
  assert.equal(p.cavok, true);
  assert.equal(p.vis, '>= 10 km (CAVOK)');
  assert.equal(p.temp, '29°C');
  assert.equal(p.qnh, '1012 hPa');
  assert.equal(p.trends[0].kind, 'NOSIG');
  assert.deepEqual(p.unknown, []);
});

test('Dông kèm mưa, CB, gió biến đổi và TEMPO (VVTS)', () => {
  const p = parseMetar('METAR VVTS 120830Z 24012G22KT 210V280 9999 -TSRA FEW015CB SCT020 BKN100 33/25 Q1007 TEMPO 3000 TSRA');
  assert.equal(p.wind, 'Hướng 240°, 12 kt, giật 22 kt');
  assert.equal(p.windVar, 'Hướng dao động từ 210° đến 280°');
  assert.deepEqual(p.weather, ['Dông kèm mưa nhẹ']);
  assert.equal(p.clouds[0], 'Ít mây, đáy 1500 ft (CB – mây vũ tích)');
  assert.deepEqual(p.trends, [{ kind: 'TEMPO', time: '', items: ['3000 m', 'Dông kèm mưa'] }]);
  assert.deepEqual(p.unknown, []);
});

test('SPECI có RVR, mưa rào lớn và BECMG FM (VVVH)', () => {
  const p = parseMetar('SPECI VVVH 120615Z 02015G25KT 1500 R17/P2000N +SHRA BKN008 SCT015CB 24/23 Q1009 BECMG FM0700 4000 -SHRA');
  assert.equal(p.type, 'SPECI');
  assert.equal(p.vis, '1500 m');
  assert.deepEqual(p.rvr, ['Đường CHC 17: trên 2000 m, không đổi']);
  assert.deepEqual(p.weather, ['Mưa rào lớn']);
  assert.deepEqual(p.trends, [{ kind: 'BECMG', time: 'từ 07:00 UTC', items: ['4000 m', 'Mưa rào nhẹ'] }]);
  assert.deepEqual(p.unknown, []);
});

test('Sương mù, VV, RVR dao động và BECMG TL', () => {
  const p = parseMetar('METAR VVNB 120000Z 00000KT 0300 R11/0350V0600U FG VV001 18/18 Q1020 BECMG TL0200 1000 BR');
  assert.equal(p.wind, 'Lặng gió');
  assert.equal(p.vis, '300 m');
  assert.deepEqual(p.rvr, ['Đường CHC 11: 350 m đến 600 m, xu hướng tăng']);
  assert.deepEqual(p.weather, ['Sương mù']);
  assert.deepEqual(p.clouds, ['Bầu trời bị che khuất, tầm nhìn thẳng đứng 100 ft']);
  assert.equal(p.trends[0].time, 'đến 02:00 UTC');
  assert.deepEqual(p.trends[0].items, ['1000 m', 'Mù']);
  assert.deepEqual(p.unknown, []);
});

test('Nhóm không nhận dạng được bị đánh dấu, không bị bỏ qua', () => {
  const raw = 'METAR VVVH 120500Z 34006KT 9999 XYZ12 FEW020 29/22 Q1012 TEMPO ABC';
  const p = parseMetar(raw);
  assert.deepEqual(p.unknown, ['XYZ12', 'ABC']);
  assert.equal(p.raw, raw);
});

test('Phần RMK được giữ lại làm ghi chú, không bị đánh dấu lạ', () => {
  const p = parseMetar('METAR VVVH 120500Z 34006KT 9999 FEW020 29/22 Q1012 NOSIG RMK QFE1010');
  assert.deepEqual(p.remarks, ['QFE1010']);
  assert.deepEqual(p.unknown, []);
});

test('Các mã hiện tượng thời tiết ghép', () => {
  assert.equal(decodeWeather('TSRA'), 'Dông kèm mưa');
  assert.equal(decodeWeather('-TSRA'), 'Dông kèm mưa nhẹ');
  assert.equal(decodeWeather('+TSRA'), 'Dông kèm mưa lớn');
  assert.equal(decodeWeather('+SHRA'), 'Mưa rào lớn');
  assert.equal(decodeWeather('VCTS'), 'Dông lân cận');
  assert.equal(decodeWeather('VCSH'), 'Mưa rào lân cận');
  assert.equal(decodeWeather('BCFG'), 'Sương mù từng mảng');
  assert.equal(decodeWeather('TSRAGR'), 'Dông kèm mưa và mưa đá');
  assert.equal(decodeWeather('HZ'), 'Mù khô');
  assert.equal(decodeWeather('XX'), null);
});

test('Gió đứt, tầm nhìn tối thiểu theo hướng và mưa gần đây', () => {
  const p = parseMetar('METAR VVVH 120700Z 18010KT 6000 2500SW SCT010 26/24 Q1008 RETSRA WS RWY17');
  assert.equal(p.visMin, 'Tầm nhìn tối thiểu 2500 m về hướng Tây Nam');
  assert.deepEqual(p.recent, ['Gần đây: dông kèm mưa']);
  assert.deepEqual(p.windshear, ['Gió đứt trên đường CHC 17']);
  assert.deepEqual(p.unknown, []);
});
