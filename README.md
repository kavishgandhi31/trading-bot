# Trading Bot

AI-powered stock research platform that fetches data from multiple sources, runs a 7-stage analysis pipeline using Claude, and delivers reports via email and an interactive web dashboard.

---

## What It Does

For any stock ticker, the bot:

1. **Collects data** from yfinance, SEC EDGAR filings, and YouTube
2. **Runs a 7-stage research pipeline** through Claude (Opus + Sonnet):
   - Macro & sector context
   - Business quality & competitive moat
   - Valuation & financials
   - Risk & red teaming
   - Technical analysis
   - Bull vs bear synthesis
   - Trade setup (entry, stop-loss, price targets)
3. **Generates a report** saved as JSON and viewable on the dashboard
4. **Emails the report** in a formatted HTML layout
5. **Runs on a schedule** you configure from the dashboard

---

## Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- API keys for:
  - [Anthropic](https://console.anthropic.com/) (Claude API)
  - [Google Cloud](https://console.cloud.google.com/) (YouTube Data API v3)
  - Gmail account with [App Password](https://myaccount.google.com/apppasswords)

---

## Setup

### 1. Clone and install frontend dependencies

```bash
git clone <repo-url> trading-bot
cd trading-bot
npm install
```

### 2. Set up the Python backend

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env   # or create .env manually
```

Edit `backend/.env` with your credentials:

```
ANTHROPIC_API_KEY=sk-ant-...
YOUTUBE_API_KEY=AIza...
EMAIL_SENDER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
EMAIL_RECIPIENT=recipient@gmail.com
```

---

## Running

### Start the dashboard

```bash
# From the project root
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view reports and manage schedules.

### Generate a report manually

```bash
cd backend
source venv/bin/activate

# Single ticker
python3.12 main.py NVDA

# Multiple tickers
python3.12 main.py NVDA AAPL TSLA

# Without sending email
python3.12 main.py --no-email NVDA
```

Reports are saved to `backend/reports/` and appear on the dashboard automatically.

### Set up the scheduler

From the dashboard, go to **Scheduled Reports**:

1. Add a ticker and choose a frequency (daily / weekly / biweekly / monthly)
2. Toggle email on/off per ticker
3. Click **Start** to activate the scheduler

The scheduler runs every hour in the background via macOS launchd, and only generates reports for tickers you've explicitly enabled.

You can also manage the scheduler from the terminal:

```bash
cd backend/scheduler
./install.sh start    # Install and start
./install.sh stop     # Stop and uninstall
./install.sh status   # Check if running
```

---

## Project Structure

```
trading-bot/
├── app/                          # Next.js frontend (dashboard)
│   ├── page.tsx                  # Dashboard landing page
│   ├── report/[slug]/            # Report detail view
│   ├── components/               # React components
│   │   ├── CollapsibleSection    # Animated dropdown sections
│   │   ├── HelperText            # "What this means" tooltips
│   │   ├── ScoreCard             # Score bar display
│   │   ├── ScheduleManager       # Schedule CRUD + scheduler control
│   │   ├── TradeSetup            # Price targets & action plan
│   │   ├── VerdictBanner         # Verdict display
│   │   └── sections/             # Deep dive section components
│   └── api/
│       ├── reports/              # GET report list & detail
│       ├── schedules/            # CRUD for scheduled tickers
│       └── scheduler/            # Start/stop scheduler engine
│
├── backend/
│   ├── main.py                   # CLI entry point
│   ├── data/
│   │   ├── stock_data.py         # yfinance fetcher
│   │   ├── sec_data.py           # SEC EDGAR filings
│   │   ├── youtube_data.py       # YouTube search & channels
│   │   └── congress_data.py      # Congressional trades (limited)
│   ├── research/
│   │   ├── prompts.py            # 7-stage prompt builders
│   │   └── engine.py             # Claude API pipeline
│   ├── utils/
│   │   └── email.py              # HTML email builder & sender
│   ├── scheduler/
│   │   ├── store.py              # Schedule persistence (JSON)
│   │   ├── runner.py             # Checks due schedules & runs them
│   │   ├── schedules.json        # Schedule data
│   │   └── install.sh            # launchd install/uninstall
│   └── reports/                  # Generated report JSON files
│
└── package.json
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Backend | Python 3.12 |
| AI | Claude Opus 4.6 (deep analysis), Claude Sonnet 4.6 (macro screen) |
| Data | yfinance, SEC EDGAR, YouTube Data API v3 |
| Email | Gmail SMTP with app passwords |
| Scheduler | macOS launchd |
