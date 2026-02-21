import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

// Inject OG meta tags into HTML for tour pages
async function injectOgTags(html: string, url: string, host: string): Promise<string> {
  const tourMatch = url.match(/^\/tours\/(\d+)/);
  if (!tourMatch) return html;

  const tourId = parseInt(tourMatch[1]);
  try {
    const tour = await storage.getTour(tourId);
    if (!tour) return html;

    const origin = host.startsWith('http') ? host : `https://${host}`;
    const tourUrl = `${origin}/tours/${tourId}`;
    const description = tour.description.substring(0, 200).replace(/"/g, '&quot;');
    const title = tour.title.replace(/"/g, '&quot;');

    const ogTags = [
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:url" content="${tourUrl}" />`,
      tour.coverImageUrl ? `<meta property="og:image" content="${origin}${tour.coverImageUrl}" />` : '',
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      tour.coverImageUrl ? `<meta name="twitter:image" content="${origin}${tour.coverImageUrl}" />` : '',
    ].filter(Boolean).join('\n    ');

    return html.replace('</head>', `    ${ogTags}\n  </head>`);
  } catch {
    return html;
  }
}

export { injectOgTags };

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (with OG tag injection)
  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    const indexPath = path.resolve(distPath, "index.html");

    // Only inject OG tags for tour pages
    if (url.match(/^\/tours\/\d+/)) {
      try {
        let html = await fs.promises.readFile(indexPath, "utf-8");
        const host = req.headers.host || 'localhost:3000';
        html = await injectOgTags(html, url, host);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
        return;
      } catch {
        // Fall through to default behavior
      }
    }

    res.sendFile(indexPath);
  });
}
