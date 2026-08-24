# RockStation

24/7 free internet rock radio — a static, backend-free web app that streams live stations across five genres (Rock, Metal, Gothic, Synthwave, Alternative) using the [Radio Browser API](https://api.radio-browser.info).

## Features

- Live streaming via HTML5 `<audio>` — no backend, no accounts
- 5 curated genres, 10 hand-vetted stations each
- Favorites with `localStorage` persistence
- Media Session integration (lock-screen / hardware media key controls)
- Shareable deep links (`#genre/station`)
- Country flags and bitrate shown per station
- Responsive, phone-styled player UI

## Project structure

```
public/           deployable site root (Firebase Hosting)
  index.html
  style.css
  app.js
  images/
firebase.json     Firebase Hosting config
```

The PNG files at the project root (`guitar.png`, `RockStation-EN.png`, `Rock123.png`, `NewTheme*.png`) are source art kept for future edits — not used directly by the app.

## Running locally

```
cd public
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying

```
firebase deploy
```
