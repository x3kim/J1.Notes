import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

const SWAGGER_UI_VERSION = '5.17.14';

/**
 * GET /api/docs
 *
 * Serves an interactive Swagger UI for the J1.Notes OpenAPI specification.
 * The spec is loaded from /public/api/openapi.yaml.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  // Serve the raw OpenAPI YAML spec when requested
  if (url.searchParams.get('format') === 'yaml') {
    try {
      const specPath = path.join(process.cwd(), 'public', 'api', 'openapi.yaml');
      const yaml = readFileSync(specPath, 'utf8');
      return new NextResponse(yaml, {
        status: 200,
        headers: { 'Content-Type': 'application/yaml; charset=utf-8' },
      });
    } catch {
      return NextResponse.json({ error: 'OpenAPI spec not found' }, { status: 404 });
    }
  }

  // Serve Swagger UI (HTML)
  const specUrl = `${url.origin}/api/docs?format=yaml`;
  const cdnBase = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>J1.Notes API Docs</title>
  <link rel="stylesheet" href="${cdnBase}/swagger-ui.css" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #fafafa; }
    #swagger-ui .topbar { background: #1a1a2e; }
    #swagger-ui .topbar-wrapper .link { display: none; }
    #swagger-ui .topbar-wrapper::after {
      content: 'J1.Notes API';
      color: #fff;
      font-size: 1.2rem;
      font-weight: 600;
      padding: 0 1rem;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${cdnBase}/swagger-ui-bundle.js"></script>
  <script src="${cdnBase}/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout',
        deepLinking: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
