# MultiViewer Website

Eenvoudige download website voor je MultiViewer software met download tracking.

## 🚀 Installatie & Start

### 1. Dependencies installeren
```bash
npm install
```

### 2. Server starten
```bash
npm start
```

De website is nu beschikbaar op: **http://localhost:3000**

## 📁 Bestandsstructuur

```
│
├── server.js              # Express server
├── package.json           # Dependencies
├── downloads.json         # Download counter (automatisch aangemaakt)
│
└── public/
    ├── index.html         # Landingspagina
    ├── style.css          # Dark theme styling
    └── script.js          # Frontend logica
```

## 🎨 Features

✅ Dark theme design
✅ Download teller (in real-time)
✅ Responsive design (werkt op telefoon, tablet, desktop)
✅ Simpel en snel
✅ Professioneel uiterlijk

## 📊 Download Tracking

- Elke keer dat iemand op de download button klikt, wordt dit geregistreerd
- Het aantal downloads wordt opgeslagen in `downloads.json`
- De teller wordt live bijgewerkt

## 🔧 Je Software Toevoegen

### Download Link Toevoegen

In `public/script.js`, zoek naar deze regel (ongeveer regel 46):
```javascript
// Download simuleren (je kunt dit vervangen met echte download)
// window.location.href = '/downloads/multiviewer.exe';
```

Vervang het met je echte download link:
```javascript
window.location.href = 'https://jouw-website.com/downloads/multiviewer.exe';
// OF als je een lokaal bestand hebt:
window.location.href = '/downloads/multiviewer.exe';
```

### Lokale Download Bestanden

Als je een .exe of ander bestand wil hosten, maak een `downloads` folder aan in de `public` folder:

```
public/
├── downloads/
│   └── multiviewer.exe
├── index.html
├── style.css
└── script.js
```

## 🌐 Deployment

### Lokaal Netwerk
De website werkt al op je lokale netwerk. Anderen kunnen via `http://[jouw-computer-ip]:3000` toegang krijgen.

### Online Deployment (Opties)

1. **Vercel** (Gratis, eenvoudig)
   - Push naar GitHub en connect met Vercel

2. **Heroku** (Gratis tier beschikbaar)
   - Heroku CLI gebruiken

3. **DigitalOcean** (Betaald, maar goedkoop)
   - VPS met Node.js

## 📝 Aanpassingen

### Titel & Branding
Bewerk `public/index.html`:
```html
<h1 class="title">Je Titel Hier</h1>
<p class="subtitle">Je tagline hier</p>
```

### Kleuren Aanpassen
Bewerk `public/style.css`:
```css
--primary-color: #667eea;      /* Paars accent */
--secondary-color: #764ba2;    /* Donkerder paars */
--bg-dark: #0f0f0f;            /* Achtergrond */
```

### Features Toevoegen
Bewerk de `<ul class="feature-list">` in `public/index.html`

## 📞 Support

Fout? Controleer:
- [ ] Server draait? (npm start)
- [ ] Port 3000 niet in gebruik?
- [ ] Node.js geïnstalleerd?

Veel succes! 🎉
