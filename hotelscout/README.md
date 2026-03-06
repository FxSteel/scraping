# HotelScout 🏨

Panel de prospección SDR con scraping automático via N8N.

## Deploy en Vercel

### Opción A — Vercel CLI (más rápido)
```bash
npm install -g vercel
cd hotelscout
vercel
```

### Opción B — GitHub + Vercel (recomendado)

1. Subí esta carpeta a un repo de GitHub
2. Entrá a vercel.com → "Add New Project"
3. Importá el repo
4. Vercel detecta automáticamente que es React
5. Click "Deploy" — listo en ~2 minutos

## Configurar N8N

Una vez deployado, abrí la app y click en **"⚙ Configurar N8N"** (arriba a la derecha).
Pegá la URL del webhook de tu workflow de N8N:

```
https://tu-n8n.com/webhook/hotelscout-scrape
```

## Estructura del proyecto

```
hotelscout/
├── public/
│   └── index.html
├── src/
│   ├── index.js
│   └── App.jsx       ← Toda la UI
├── package.json
├── vercel.json
└── .gitignore
```
