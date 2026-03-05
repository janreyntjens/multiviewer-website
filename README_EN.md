# MultiViewer Website

Simple download website for your MultiViewer software with download tracking.

## 🚀 Installation & Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server
```bash
npm start
```

The website is now available at: **http://localhost:3000**

## 📁 File Structure

```
│
├── server.js              # Express server
├── package.json           # Dependencies
├── downloads.json         # Download counter (created automatically)
│
└── public/
    ├── index.html         # Landing page
    ├── style.css          # Dark theme styling
    ├── script.js          # Frontend logic
    ├── admin.html         # Admin panel
    ├── admin-style.css    # Admin styling
    ├── admin-script.js    # Admin logic
    ├── logo.ico           # Favicon and header logo
    └── bglogo.png         # Background logo (optional)
```

## 🎨 Features

✅ Dark theme design
✅ Download counter (real-time)
✅ Responsive design (works on phone, tablet, desktop)
✅ Simple and fast
✅ Professional look
✅ Admin panel with authentication

## 📊 Download Tracking

- Every time someone clicks the download button, it's registered
- The download count is saved in `downloads.json`
- The counter updates live

## 🔐 Admin Panel

Go to **http://localhost:3000/admin**
- **Password**: the value configured in `.env` as `ADMIN_PASSWORD`
- View total downloads
- See last download timestamp
- Reset counter

## 🔑 Change Admin Password

Open `.env` and change:
```env
ADMIN_PASSWORD=your-secure-password
```

## 🔧 Add Your Software

### Add Download Link

In [public/script.js](public/script.js), find the download handler:
```javascript
// Send download event to server
```

And add your download link:
```javascript
window.location.href = 'https://your-website.com/downloads/multiviewer.exe';
```

### Host Local Download Files

Create a `downloads` folder in the `public` folder:

```
public/
├── downloads/
│   └── multiviewer.exe
├── index.html
├── style.css
└── script.js
```

## 🌐 Deployment

### Local Network
The website already works on your local network. Others can access it via `http://[your-computer-ip]:3000`.

### Online Deployment (Options)

1. **Vercel** (Free, simple)
   - Push to GitHub and connect with Vercel

2. **Heroku** (Free tier available)
   - Use Heroku CLI

3. **DigitalOcean** (Paid, affordable)
   - VPS with Node.js

## 📝 Customizations

### Title & Branding
Edit [public/index.html](public/index.html):
```html
<h1 class="title">Your Title Here</h1>
<p class="subtitle">Your tagline here</p>
```

### Colors
Edit [public/style.css](public/style.css):
```css
--primary-color: #00d4ff;      /* Cyan accent */
--secondary-color: #0099cc;    /* Darker cyan */
--bg-dark: #0f0f0f;            /* Background */
```

### Logo
Replace the logo files:
- `public/logo.ico` - Favicon and header logo
- `public/bglogo.png` - Alternative logo

## 📞 Support

Issues? Check:
- [ ] Server running? (npm start)
- [ ] Port 3000 not in use?
- [ ] Node.js installed?

Good luck! 🎉
