# TAP LONDON

Next.js website for `londontap.co.uk`, built for smart NFC tourism souvenirs.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- `next/font` with Playfair Display and Inter
- Editable JSON content under `/data`
- Vercel-ready configuration

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Build for production:

```bash
npm run build
npm run start
```

## Update Content

Most site content lives in JSON files inside `/data`. Each file starts with a `__comment` field that explains the format while keeping the file valid JSON.

- Places: `data/places.json`
- Food: `data/food.json`
- Shopping: `data/shopping.json`
- Transport: `data/transport.json`
- Services: `data/services.json`
- Offers: `data/offers.json`
- NFC products: `data/nfc-products.json`

To add a listing, copy an existing object, change the fields, and keep the same comma structure. IDs should be lowercase words separated by hyphens.

## Add a New NFC Product

1. Open `data/nfc-products.json`.
2. Add a new key, for example:

```json
"magnet": {
  "name": "TAP LONDON Magnet",
  "welcome": "You tapped your TAP LONDON Magnet! Welcome to London.",
  "emoji": "MAGNET",
  "color": "#c9a84c"
}
```

3. The new page will be available at `/nfc/magnet`.
4. Program the NFC chip to open `https://taplondon.co.uk/nfc/magnet`.

## Add Partner Offers

1. Open `data/offers.json`.
2. Add partner cards to `partners`.
3. Add future discount codes to `discountCodes`.
4. Redeploy on Vercel.

Example NFC campaign URL:

```text
https://taplondon.co.uk/?nfc=keyring
```

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

- `NEXT_PUBLIC_SITE_URL`: production site URL
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: WhatsApp support number without `+`
- `NEXT_PUBLIC_GA_ID`: future GA4 measurement ID
- `GROQ_API_KEY`: server-side key for NOVA. Set this in the hosting environment; never place a key in source code.

## Deployment

Deploy to Vercel as a standard Next.js app. The included `vercel.json`, `app/sitemap.ts`, `app/robots.ts`, metadata, and Open Graph SVG are ready for production.
