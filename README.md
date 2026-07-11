

## Running the full demo

**Three processes**, all local:

1. **Rasa server** (terminal 1):
   ```powershell
   cd rasa-bot
   .\.venv\Scripts\Activate.ps1
   $env:PYTHONUTF8 = "1"
   rasa run --enable-api --cors "*" --credentials credentials.yml --endpoints endpoints.yml
   ```
2. **Live-chat proxy** (terminal 2):
   ```powershell
   cd chatwoot-proxy
   node server.js
   ```
3. **Website** (terminal 3):
   ```powershell
   cd website
   py -3.14 serve.py 5500
   ```
4. Open **http://localhost:5500** in your browser.



