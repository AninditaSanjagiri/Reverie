# 12:00 AM — A Birthday Memory Experience

> *A private, disposable-camera-style memory vault that unlocks at midnight.*

---

## What it does

Friends join via a link, capture photos + a short video using a cinematic camera UI, and leave a private whisper for the birthday person. At midnight, the host unlocks a stunning animated reveal — a curated gallery with whispers woven between photos, all under their name.

**No accounts. No friction. Just one night.**

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS Variables |
| Animation | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| PWA | next-pwa |
| Deploy | Vercel |

---

## Setup (30 minutes)

### 1. Clone and install

```bash
git clone <your-repo>
cd midnight-app
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **Anon Key** (Settings → API)

### 3. Set up the database

1. In Supabase dashboard → **SQL Editor**
2. Paste the contents of `lib/database.sql` and run it
3. Go to **Storage** → Create bucket named `memories` → set to **Public**

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add your environment variables in Vercel dashboard → Project → Settings → Environment Variables.

Also add your Supabase project URL to `next.config.js` image domains:
```js
domains: ['your-project-id.supabase.co']
```

---

## App Flow

```
/ (home)
└── /host                          → Create event (host only)
    └── /event/[slug]/vault        → Host dashboard + share link
        └── /event/[slug]/reveal   → Midnight reveal (host unlocks)

/event/[slug]/join                 → Friends enter name
└── /event/[slug]/camera           → 15 photos + 1 video + whisper
    └── /event/[slug]/vault        → Preview gallery (locked)
```

---

## The Reveal Experience

When the host taps **Unlock**:

1. **Silence** — 3 seconds of darkness
2. **The Name** — birthday person's name fades in, alone on screen
3. **Whispers** — private notes from each friend appear one by one
4. **The Gallery** — cinematic masonry grid assembles with all photos
5. **Ending** — "These moments were captured because you're worth capturing."

---

## Design Principles

- **No autoplay music** — silence is more powerful
- **No confetti or balloons** — the realness of photos is the decoration
- **Cormorant Garamond** — editorial serif for emotional weight
- **DM Sans** — clean, functional sans for UI
- **Gold accent (#c9a84c)** — single warm accent throughout
- **Film grain overlay** — cinematic texture
- **Glassmorphism** — only where it earns its place

---

## Customization

### Change the max photos
Edit `lib/utils.ts`:
```ts
export const MAX_PHOTOS = 15; // change this
export const MAX_VIDEO_SECONDS = 30; // and this
```

### Change colors
Edit `styles/globals.css`:
```css
:root {
  --color-gold: #c9a84c; /* your accent */
  --color-bg: #06060e;   /* your background */
}
```

### Change fonts
Edit `styles/globals.css` Google Fonts import + CSS variables.

---

## Icons

Run `node scripts/gen-icons.js` to generate `public/icon.svg`, then convert to:
- `public/icon-192.png` (192×192)  
- `public/icon-512.png` (512×512)

Use [cloudconvert.com/svg-to-png](https://cloudconvert.com/svg-to-png).

---

## Production Checklist

Before tonight:

- [ ] Supabase project created
- [ ] `database.sql` executed
- [ ] `memories` storage bucket created (public)
- [ ] `.env.local` configured
- [ ] Deployed to Vercel
- [ ] Icons generated and added to `public/`
- [ ] Test full flow: create → join → camera → vault → reveal
- [ ] Test on iPhone (Safari) and Android (Chrome)
- [ ] Share join link with friends

---

## License

Built with love for one night. Use freely.
