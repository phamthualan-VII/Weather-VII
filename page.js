'use client';
import {useMemo,useState} from 'react';
import './style.css';
const wx={RA:'Mưa', '-RA':'Mưa nhẹ','+RA':'Mưa lớn',TS:'Dông',BR:'Mù nhẹ',FG:'Sương mù',DZ:'Mưa phùn',SHRA:'Mưa rào',VCTS:'Dông lân cận'};
function parseMetar(raw){
 const s=raw.trim().toUpperCase().replace(/\s+/g,' '), t=s.split(' '); let o={raw:s,type:t[0]||'',station:'',time:'',wind:'',vis:'',weather:[],clouds:[],temp:'',dew:'',qnh:'',remarks:[]};
 let i=1;if(['METAR','SPECI'].includes(t[0])){o.station=t[i++]||''}else{o.station=t[0]||'';o.type='METAR';i=1}
 for(;i<t.length;i++){let x=t[i];
  if(/^\d{6}Z$/.test(x)) o.time=`Ngày ${x.slice(0,2)}, ${x.slice(2,4)}:${x.slice(4,6)} UTC`;
  else if(/^(\d{3}|VRB)\d{2,3}(G\d{2,3})?KT$/.test(x)){let m=x.match(/^(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT$/);o.wind=`${m[1]==='VRB'?'Hướng thay đổi':`Hướng ${m[1]}°`}, ${m[2]} kt${m[4]?`, giật ${m[4]} kt`:''}`}
  else if(/^\d{4}$/.test(x)) o.vis=x==='9999'?'>= 10 km':`${parseInt(x)/1000} km`;
  else if(wx[x]) o.weather.push(wx[x]);
  else if(/^(FEW|SCT|BKN|OVC)\d{3}(CB|TCU)?$/.test(x)){let m=x.match(/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/), names={FEW:'Ít mây',SCT:'Mây rải rác',BKN:'Nhiều mây',OVC:'Mây phủ kín'};o.clouds.push(`${names[m[1]]}, đáy ${parseInt(m[2])*100} ft${m[3]?` (${m[3]})`:''}`)}
  else if(/^M?\d{2}\/M?\d{2}$/.test(x)){let [a,b]=x.split('/');o.temp=(a[0]==='M'?'-':'')+parseInt(a.replace('M',''))+'°C';o.dew=(b[0]==='M'?'-':'')+parseInt(b.replace('M',''))+'°C'}
  else if(/^Q\d{4}$/.test(x)) o.qnh=x.slice(1)+' hPa';
 }
 return o;
}
export default function Page(){const [raw,setRaw]=useState('METAR VVVH 150900Z 05012KT 5000 -RA BKN015 27/25 Q1005');const [history,setHistory]=useState([]);const p=useMemo(()=>parseMetar(raw),[raw]);function save(){setHistory(h=>[{...p,at:new Date().toLocaleString('vi-VN')},...h].slice(0,20))}
 return <main><header><div><b>VII MET OPS</b><span>V0.1 • Cảng HKQT Vinh</span></div><em>HỖ TRỢ THÔNG TIN KHÍ TƯỢNG KHAI THÁC</em></header><div className="warn">⚠ Hệ thống hỗ trợ diễn giải thông tin. Không thay thế bản tin khí tượng hàng không chính thức.</div><section className="grid"><article><h2>Bản tin gốc</h2><textarea value={raw} onChange={e=>setRaw(e.target.value)} /><button onClick={save}>Giải mã & lưu bản tin</button><small>Bản gốc luôn được giữ nguyên để đối chiếu.</small></article><article><h2>Giải mã kỹ thuật</h2><div className="cards">{[['Loại',p.type],['Sân bay',p.station],['Thời gian',p.time],['Gió',p.wind],['Tầm nhìn',p.vis],['Thời tiết',p.weather.join(', ')||'Không nhận dạng hiện tượng'],['Mây',p.clouds.join('; ')||'—'],['Nhiệt độ',p.temp],['Điểm sương',p.dew],['QNH',p.qnh]].map(([a,b])=><div><label>{a}</label><strong>{b||'—'}</strong></div>)}</div></article></section><section><h2>Diễn giải dễ hiểu</h2><p className="plain">Tại <b>{p.station||'sân bay'}</b>: gió {p.wind||'chưa có dữ liệu'}, tầm nhìn {p.vis||'chưa có dữ liệu'}, {p.weather.length?p.weather.join(', ').toLowerCase():'không nhận dạng hiện tượng thời tiết đáng chú ý'}, {p.clouds.length?p.clouds.join('; ').toLowerCase():'chưa có dữ liệu mây'}. Nhiệt độ {p.temp||'—'}, QNH {p.qnh||'—'}.</p></section><section><h2>Lịch sử phiên làm việc</h2>{history.length?history.map((x,k)=><div className="hist" key={k}><b>{x.at}</b><code>{x.raw}</code></div>):<p>Chưa có bản tin được lưu. V0.1 hiện lưu trong phiên trình duyệt; database và tài khoản sẽ nối ở bước triển khai Supabase.</p>}</section><footer>VII MET OPS V0.1 • Prototype nghiệp vụ • Parser theo quy tắc, không dùng AI để suy đoán thông số</footer></main>}
