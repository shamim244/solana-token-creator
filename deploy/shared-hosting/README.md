# Deploying to Shared Hosting (cPanel / Apache / LiteSpeed)

This platform can be deployed to any standard PHP shared hosting using Next.js static export.

### 1. Build Static Output

Run the static export command:

```bash
bun run build:static
```

This generates a 100% static `out/` folder containing all HTML, CSS, client-side JS, and fonts.

### 2. Upload to Shared Hosting

1. Open your cPanel File Manager or connect via FTP.
2. Navigate to your `public_html` directory.
3. Upload all files and folders from the local `out/` folder directly into `public_html`.
4. Copy the `deploy/shared-hosting/api/` folder and `.htaccess` file into `public_html/`.

### 3. Server Requirements

- Any standard PHP 7.4 / 8.0 / 8.1 / 8.2 / 8.3 shared hosting.
- Apache or LiteSpeed with `mod_rewrite` enabled (standard on 99% of cPanel hosts).
