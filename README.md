# Geodesign · Térképjavító műhely

Interaktív oktatási eszköz a térképszerkesztési elvek gyakorlásához. A hibás tematikus térképet (Magyarország megyéi, KSH-adatok) a szerkesztőben kell megjavítani, jobb oldalt az elvek ellenőrzése jelzi, mi van rendben.

Statikus oldal, build nélkül. Megnyitás: `index.html`, vagy helyi szerverrel (`python3 -m http.server`).

- `index.html` az oldal váza
- `css/style.css` megjelenés (világos és sötét téma)
- `js/data.js` megyehatárok (SVG útvonalak) és adatok
- `js/app.js` osztályozás, színezés, térképrajz, ellenőrzés, 5 másodperces teszt

A betűtípusok a Google Fontsból töltődnek be.
