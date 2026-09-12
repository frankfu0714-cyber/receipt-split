# Receipt Split

Upload a grocery receipt, assign each item to the people who owe for it, and get a clean per-person total you can paste into Splitwise.

## Features

- **Upload a receipt photo** — OCR via Gemini Flash extracts all line items automatically
- **People roster** — add / rename / remove people (Frank, James, Kevin, Jack by default)
- **Item assignment** — tap person chips to assign who owes for each item; multi-select supported
- **Smart split** — items split evenly among assignees; tax, tip, and unassigned items split proportionally
- **Copy for Splitwise** — one tap copies `Frank: $12.34` to your clipboard
- **History** — last 20 receipts saved in localStorage; reopen any to re-edit

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set your Gemini API key

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your key:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app works without a Gemini key — you'll see a friendly error on OCR, but you can still enter items manually.

## Deploy to Vercel

```bash
vercel --prod
```

Add `GEMINI_API_KEY` in your Vercel project's Environment Variables.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Google Gemini 2.5 Flash (OCR)
- localStorage (no database, no auth)
