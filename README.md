# VII MET OPS V0.1
Prototype web hỗ trợ tiếp nhận và giải mã METAR/SPECI cho Cảng HKQT Vinh.

## Chạy local
npm install
npm run dev

## Triển khai miễn phí
1. Tạo repo GitHub và đẩy thư mục này lên.
2. Import repo vào Vercel, framework Next.js, Deploy.
3. V0.2: nối Supabase cho đăng nhập, database và audit log.

## Nguyên tắc an toàn nghiệp vụ
- Luôn giữ nguyên bản tin gốc.
- Parser quy tắc chịu trách nhiệm bóc tách kỹ thuật.
- AI (khi bổ sung) chỉ diễn giải, không tự tạo dữ liệu khí tượng.
- Không thay thế nguồn/bản tin khí tượng hàng không chính thức.
