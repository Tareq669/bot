# Oracle Quickstart (Stable STARS)

1. On Oracle VM (Ubuntu), clone project to `/opt/bot`:
```bash
sudo mkdir -p /opt/bot && sudo chown -R $USER:$USER /opt/bot
git clone https://github.com/Tareq669/bot.git /opt/bot
cd /opt/bot
```

2. Run setup:
```bash
bash scripts/oracle_setup.sh /opt/bot
```

3. Add environment:
```bash
cp .env.example .env
nano .env
```

4. Add YouTube cookies file:
```bash
mkdir -p /opt/bot/secrets
nano /opt/bot/secrets/youtube_cookies.txt
```

5. Set required env values in `.env`:
```env
NODE_ENV=production
BOT_TOKEN=...
MONGODB_URI=...
YTDLP_COOKIES_FILE=/opt/bot/secrets/youtube_cookies.txt
YTDLP_JS_RUNTIMES=node
YTDLP_PROXY_AUTO_FETCH=true
YTDLP_ALLOW_UNCHECKED_PROXIES=false
```

6. Restart bot:
```bash
cd /opt/bot
pm2 restart jo-bot
pm2 logs jo-bot --lines 120
```

7. Update cookies when STARS logs show cookies expired:
- replace file `/opt/bot/secrets/youtube_cookies.txt`
- then run:
```bash
pm2 restart jo-bot
```
