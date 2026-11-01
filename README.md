# Bore & Barrel

A dummy gunshop storefront built as a Progressive Web App. It runs offline
with an app shell, a web app manifest, and a service worker, and uses React +
Vite + Tailwind CSS.

## Setup

```bash
npm install
npm run dev      # dev server with HMR
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Catalog features

- The catalog displays six products per page and supports previous/next and
  direct page navigation. Product-list queries and individual product lookups
  are cached for 60 seconds in application storage and invalidated after
  product mutations; API query caching is not handled by the service worker.
- Local product images use the browser's HTTP cache with a one-hour freshness
  lifetime. In DevTools Network, select Img to inspect image requests and
  transfer sizes; Chrome chooses whether to report a cache hit as memory or
  disk cache. Remote image hosts must send their own `Cache-Control` response
  header for browser HTTP caching.
- Product details for server-backed products can be shared as a direct link;
  opening a link loads the corresponding product by its ID.
- Archived products can be restored or permanently deleted from the Profile
  page. Permanent deletion removes server-backed products from the API.
- Saved drafts in Profile can be moved to a draft archive, restored, or
  permanently deleted. Use **Lanjutkan Edit** to reopen a saved active or
  archived draft in its create/edit form and continue before posting.
- Create and edit forms accept additional image URLs, one per line. The first
  image remains the product cover; additional images appear as selectable
  thumbnails in the product detail view. When using Supabase, additional image
  URLs are kept in this browser's local storage because the products table
  currently stores only `image_url`.

## Structure

```
.
├── index.html              # HTML shell
├── vite.config.js          # Vite + vite-plugin-pwa (manifest + service worker)
├── public/                 # static assets served at /
│   ├── icon-192.png / icon-512.png / icon.svg
│   └── guns/               # product images
└── src/
    ├── main.jsx            # entry, mounts <App/>
    ├── App.jsx             # app shell: tab state, header/nav/content/footer
    ├── App.css             # app shell styles
    ├── index.css           # global styles
    ├── components/
    │   ├── Header.jsx      # brand + nav
    │   ├── GunCard.jsx     # single product card
    │   └── Footer.jsx
    ├── data/
    │   └── guns.js         # dummy product data
    └── pages/
        ├── Catalog.jsx     # product grid
        ├── About.jsx
        └── Contact.jsx
```
