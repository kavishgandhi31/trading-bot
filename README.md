# Trading Bot

AI-powered stock research platform that fetches data from multiple sources, runs a 7-stage analysis pipeline using Claude, delivers reports to an interactive web dashboard, and lets you debate every thesis with Claude in a streaming chat panel.

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
3. **Saves the report** as JSON and renders it on the dashboard; prior versions are auto-archived so only the latest shows
4. **Optionally emails the report** in a formatted HTML layout (toggle per run or per schedule)
5. **Runs on a schedule** you configure from the dashboard
6. **Debate the thesis with Claude** — per-ticker chat panel with streaming responses, web search, PDF/article uploads, and prompt-cached access to the full report as context

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

Open [http://localhost:3000](http://localhost:3000) to view reports, generate new ones on demand, manage schedules, and open the chat panel.

### Generate a report from the dashboard

The fastest path: use the **Generate a report** card at the top of the dashboard.

1. Type a ticker (e.g. `NVDA`)
2. Toggle **Email report** on if you also want it emailed; leave off to save to the dashboard only
3. Click **Generate** — the pipeline runs in the background (3–8 min) with a live progress tail; the report appears on the dashboard when it's done

### Chat with Claude about any ticker

Every report has an attached chat panel with Claude Sonnet 4.6 loaded with your full report as context.

- From the dashboard, click the **💬 Chat** pill on any report card — or open a report and click **💬 Debate [TICKER]**
- Stream back-and-forth debate, push back on risks, ask for a verdict
- Drop in a PDF article or paste a bullish/bearish piece for Claude to critique
- Web search is enabled — Claude pulls fresh prices, filings, news when asked
- **Regenerate** from inside the chat: triggers the 7-stage pipeline, archives the old report, and auto-asks Claude for an updated verdict against the new baseline

### Generate a report from the CLI

```bash
cd backend
source venv/bin/activate

# Single ticker (emails by default)
python3.12 main.py NVDA

# Multiple tickers
python3.12 main.py NVDA AAPL TSLA

# Without sending email (dashboard only)
python3.12 main.py --no-email NVDA
```

Reports are saved to `backend/reports/` and appear on the dashboard automatically. Any previous report for the same ticker is moved to `backend/reports/archive/`.

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
│   ├── page.tsx                  # Dashboard (quick-generate, reports list, scheduler)
│   ├── report/[slug]/            # Report detail view
│   ├── components/               # React components
│   │   ├── ChatPanel             # Per-ticker chat (streaming, web search, PDF upload)
│   │   ├── QuickGenerate         # One-off report form with email toggle
│   │   ├── CollapsibleSection    # Animated dropdown sections
│   │   ├── HelperText            # "What this means" tooltips
│   │   ├── ScoreCard             # Score bar display
│   │   ├── ScheduleManager       # Schedule CRUD + scheduler control
│   │   ├── RecipientManager      # Email recipients CRUD
│   │   ├── TradeSetup            # Price targets & action plan
│   │   ├── VerdictBanner         # Verdict display
│   │   └── sections/             # Deep dive section components
│   └── api/
│       ├── chat/[ticker]/        # Per-ticker streaming chat (GET / POST / DELETE)
│       ├── reports/              # GET report list & detail (dedupes by ticker)
│       ├── recipients/           # Email recipients CRUD
│       ├── schedules/            # CRUD for scheduled tickers
│       │   └── run/              # Spawn pipeline + job tracking (used by QuickGenerate + chat regenerate)
│       └── scheduler/            # Start/stop scheduler engine
│
├── backend/
│   ├── main.py                   # CLI entry point; archives prior reports on save
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
│   ├── chat/                     # Chat history per ticker (JSON)
│   └── reports/
│       ├── *.json                # Latest report per ticker
│       └── archive/              # Previous versions, auto-moved on regeneration
│
└── package.json
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, react-markdown |
| Backend | Python 3.12 |
| AI | Claude Opus 4.6 (deep analysis), Claude Sonnet 4.6 (macro screen + chat) |
| AI tools | Anthropic SDK with web search tool + prompt caching |
| Data | yfinance, SEC EDGAR, YouTube Data API v3 |
| Email | Gmail SMTP with app passwords |
| Scheduler | macOS launchd |
