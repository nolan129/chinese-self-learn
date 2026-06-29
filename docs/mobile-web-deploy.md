# Deploy mobile web len han-note.vn

## Muc tieu

- `han-note.vn` va `www.han-note.vn` phuc vu ban `apps/mobile` da export ra web static.
- `api.han-note.vn` proxy vao FastAPI tren cung EC2.
- Mobile web goi API that qua `https://api.han-note.vn`.

## 1. DNS can co

Tro 3 record sau ve cung Elastic IP cua EC2:

- `A @ -> <EC2_ELASTIC_IP>`
- `A www -> <EC2_ELASTIC_IP>`
- `A api -> <EC2_ELASTIC_IP>`

Sau khi luu, kiem tra:

```bash
nslookup han-note.vn
nslookup www.han-note.vn
nslookup api.han-note.vn
```

Ca 3 phai ra dung Elastic IP cua EC2.

## 2. Chay backend tren EC2

Vi du backend chay local tren may chu:

```bash
cd ~/chinese-self-learn/apps/api
./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8011
```

Kiem tra:

```bash
curl http://127.0.0.1:8011/healthz
```

## 3. Build mobile web

Tai root repo:

```bash
npm install
npm run build:mobile:web
```

Output deploy la:

```text
apps/mobile/dist
```

Copy noi dung do len thu muc web public tren EC2, vi du:

```bash
sudo mkdir -p /var/www/han-note-mobile
sudo rsync -av --delete apps/mobile/dist/ /var/www/han-note-mobile/
```

## 4. Nginx

Tao file:

```text
/etc/nginx/sites-available/han-note
```

Noi dung mau:

```nginx
server {
    listen 80;
    server_name han-note.vn www.han-note.vn;

    root /var/www/han-note-mobile;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api.han-note.vn;

    location / {
        proxy_pass http://127.0.0.1:8011;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Bat site:

```bash
sudo ln -s /etc/nginx/sites-available/han-note /etc/nginx/sites-enabled/han-note
sudo nginx -t
sudo systemctl reload nginx
```

## 5. SSL

Cap certificate:

```bash
sudo certbot --nginx -d han-note.vn -d www.han-note.vn -d api.han-note.vn
```

Sau do kiem tra:

```bash
curl https://api.han-note.vn/healthz
```

Va mo tren trinh duyet:

- `https://han-note.vn`
- `https://www.han-note.vn`

## 6. Luu y runtime

- Mobile web se tu suy ra `https://api.han-note.vn` khi chay tren `han-note.vn` hoac `www.han-note.vn`.
- Neu anh deploy qua host/domain khac, dat:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
```

- Khong dat `/api` vao env, vi shared client se tu them.

## 7. Sau moi lan cap nhat mobile web

```bash
git pull
npm install
npm run build:mobile:web
sudo rsync -av --delete apps/mobile/dist/ /var/www/han-note-mobile/
sudo systemctl reload nginx
```
