# SkillBot — Hướng dẫn Deploy

## 1. Truy cập VM

```bash
ssh -p 2357 root@192.168.1.183
```

Code nằm ở `/opt/skillbot-v2`, chạy bằng user `skillbot` (không phải root), quản lý qua PM2.
PM2 daemon thuộc về user `skillbot` — luôn thêm `-H` khi gọi bằng `sudo -u skillbot`, không thì nó tìm nhầm daemon của root:

```bash
sudo -u skillbot -H pm2 list
```

Process đang chạy:

| Tên              | App          | Port | Ghi chú |
|------------------|--------------|------|---------|
| `skillbot-cms`   | Payload CMS  | 3001 | Next.js, chạy `npm run start` (bản build) |
| `skillbot-bot`   | Telegram bot | 4001 (HTTP nội bộ) | Chạy `npm run dev` (tsx --watch), KHÔNG phải bản build |

## 2. Deploy CMS (Payload/Next.js)

```bash
cd /opt/skillbot-v2
sudo -u skillbot git pull origin main

cd cms
sudo -u skillbot npm install        # chỉ cần khi package.json đổi
sudo -u skillbot npm run build      # bắt buộc — cms chạy bản build, không phải dev
sudo -u skillbot -H pm2 restart skillbot-cms --update-env
```

Verify:

```bash
sudo -u skillbot -H pm2 flush skillbot-cms
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3001/admin
sudo -u skillbot -H pm2 logs skillbot-cms --err --lines 20 --nostream
```

### ⚠️ Gotcha: custom admin component mới → lỗi `importMap`

Khi thêm/sửa component trong `admin.components` của `payload.config.ts` hoặc field-level
`admin.components.Field` (vd `ErpDashboard`, `MediaLinkImporter`...), Payload cần biết
đường import qua file `cms/src/app/(payload)/admin/importMap.js`. File này **đáng lẽ**
tự sinh bằng:

```bash
npm run generate:importmap
```

nhưng lệnh này hiện đang lỗi (`ERR_MODULE_NOT_FOUND` / `ERR_REQUIRE_ESM`) cả trên VM lẫn máy
local — chưa rõ nguyên nhân (nghi do version tsx/Payload/Node). Nếu build xong mà log báo:

```
getFromImportMap: PayloadComponent not found in importMap { key: '/components/admin/Xxx#default', ... }
```

→ phải sửa tay `importMap.js`: thêm 1 dòng `import` ở đầu file + 1 dòng entry trong object
`importMap`, theo đúng pattern các dòng có sẵn (xem ví dụ trong chính file đó). Rebuild + restart lại.

### ⚠️ Gotcha: quyền file sau khi pull

Nếu ai đó từng chạy `git pull`/`npm install` bằng `root` thay vì `sudo -u skillbot`, các
file/`.git/objects` mới sẽ thuộc về root → lần `git pull` sau bị lỗi
`insufficient permission for adding an object to repository database`. Fix:

```bash
chown -R skillbot:skillbot /opt/skillbot-v2
```

## 3. Deploy Bot (Telegram)

Bot chạy **dev mode** (`tsx --watch`), không cần build — chỉ cần restart để nó pick up code
mới (hoặc để tự restart nếu `--watch` phát hiện file đổi, nhưng nên restart tay cho chắc):

```bash
cd /opt/skillbot-v2
sudo -u skillbot git pull origin main
sudo -u skillbot -H pm2 restart skillbot-bot --update-env
```

Verify:

```bash
sudo -u skillbot -H pm2 logs skillbot-bot --lines 20 --nostream
```

Log boot thành công phải thấy đủ các dòng:

```
[INFO] [Payload] Logged in as admin@skillbot.local
[INFO] [Telegram] Polling started
[INFO] [Cron] Started — N jobs
[INFO] [HTTP] Bot internal API listening on http://localhost:4001
[INFO] [Telegram] Identity: @pepptit_bot (id=...)
```

Nếu thấy `poll error: TypeError: fetch failed` lặp liên tục dù mạng VM vẫn ra ngoài được
(curl OK) — đây là bug Node Happy Eyeballs (`autoSelectFamily`) khi VM có IPv6 route hỏng.
Đã fix sẵn trong `apps/bot/src/index.ts` (gọi `setDefaultAutoSelectFamily(false)` — xem
comment tại chỗ đó nếu cần hiểu lại nguyên nhân).

## 4. Cả 2 cùng lúc (trường hợp thường gặp nhất)

```bash
cd /opt/skillbot-v2
sudo -u skillbot git pull origin main
cd cms && sudo -u skillbot npm run build
cd ..
sudo -u skillbot -H pm2 restart skillbot-cms skillbot-bot --update-env
```

## 5. Lệnh PM2 hay dùng

```bash
sudo -u skillbot -H pm2 list                              # trạng thái tất cả process
sudo -u skillbot -H pm2 logs skillbot-cms --lines 100      # log gần nhất
sudo -u skillbot -H pm2 logs skillbot-bot                  # bám log real-time
sudo -u skillbot -H pm2 describe skillbot-bot              # cwd, entry file, log path
sudo -u skillbot -H pm2 flush skillbot-cms                 # xoá log cũ
sudo -u skillbot -H pm2 restart skillbot-cms --update-env  # restart + nạp lại .env
```

Đọc log trực tiếp không qua pm2:

```bash
tail -f /home/skillbot/.pm2/logs/skillbot-cms-error.log
tail -f /home/skillbot/.pm2/logs/skillbot-bot-error.log
```

## 6. Hạ tầng liên quan (không phải code, nhưng ảnh hưởng deploy)

- **MongoDB**: chạy trong Docker container tên `mongodb` (`docker ps | grep mongo`). Nếu cms
  báo `cannot connect to MongoDB` → kiểm tra container còn sống không, restart bằng
  `docker start mongodb` nếu nó bị Exit.
- **Nginx**: domain public `cms.peptit-admin.x-or.cloud` proxy thẳng vào `127.0.0.1:3001`
  (không serve gì tĩnh cả — portal đã bị gỡ khỏi domain này). Config tại
  `/etc/nginx/sites-enabled/dashboard`. Sau khi sửa: `nginx -t && systemctl reload nginx`.
- **Proxy public phía trước domain** (`103.252.73.24`, theo DevOps xác nhận): chỉ là proxy đơn
  thuần, forward đúng vào VM này — không cần lo cache/CDN riêng.
- **S3 (media)**: cấu hình qua `S3_BUCKET`/`S3_ENDPOINT`/... trong `cms/.env`. Để trống
  `S3_BUCKET` thì Payload tự fallback lưu local disk (`cms/media/`).

## 7. Biến môi trường quan trọng cần khớp giữa 2 phía

| Biến | File | Ghi chú |
|---|---|---|
| `INTERNAL_SECRET` | `cms/.env` + `apps/bot/.env` | Phải **giống hệt nhau** — dùng để cms gọi bot (extract/verify/notify) qua HTTP nội bộ |
| `BOT_INTERNAL_URL` | `cms/.env` | Trỏ `http://localhost:4001` (port bot) |
| `PAYLOAD_URL` | `apps/bot/.env` | Trỏ `http://localhost:3001` (port cms) |
| `PUBLIC_FORM_BASE_URL` | `apps/bot/.env` | Domain public thật (`https://cms.peptit-admin.x-or.cloud`) — dùng để bot sinh link cho user (link tạo đơn, link xem chi tiết đơn trong admin) |
| `TELEGRAM_BOT_TOKEN` | `apps/bot/.env` | Token bot Telegram — verify đúng bot bằng `curl https://api.telegram.org/bot<token>/getMe`, kiểm tra `username` khớp bot mong muốn trước khi tin |
