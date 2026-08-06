# Stock research agent (starter)

Educational demo: enter a ticker, get a mock research memo. Research runs **inside the HTTP request**.

For the tutorial that moves this onto Render Workflows, see the Render Tutorials site (`stock-research-with-workflows`).

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000`. Mock tickers: `NVDA`, `AAPL`, `MSFT`.

`RESEARCH_DELAY_MS` (default `8000`) controls how long a run takes so you can close the browser mid-request.

## Deploy

Use the Blueprint in `render.yaml` or the Deploy to Render button from the tutorial.
