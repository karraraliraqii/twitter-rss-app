/**
 * Backend Cloudflare Function
 * Handles requests to /api/rss
 *
 * This function acts as an intelligent proxy, choosing the best service
 * (RSSHub or RSS-Bridge) for the requested platform.
 */
export async function onRequest(context) {
  // Get query parameters from the request URL.
  const { searchParams } = new URL(context.request.url);
  const platform = searchParams.get('platform');
  const username = searchParams.get('username');

  // Return an error if parameters are missing.
  if (!platform || !username) {
    return new Response('Missing platform or username query parameter', { status: 400 });
  }

  let fetchUrl = '';
  let serviceName = ''; // To identify which service we are using

  // --- Intelligent Routing Logic ---
  // Decide which service to use based on the platform.
  switch (platform) {
    case 'x':
      serviceName = 'RSSHub';
      fetchUrl = `https://rsshub.app/twitter/user/${username}`;
      break;

    case 'instagram':
      // For Instagram, RSSHub's Picnob route is the most reliable.
      serviceName = 'RSSHub';
      fetchUrl = `https://rsshub.app/picnob/user/${username}`;
      break;

    case 'soundcloud':
      // For SoundCloud, RSS-Bridge is an excellent choice.
      serviceName = 'RSS-Bridge';
      // Note: RSS-Bridge often returns Atom format, which is fine.
      fetchUrl = `https://bridge.rss-proxy.org/?action=display&bridge=SoundCloud&context=By+user&u=${encodeURIComponent(username)}&format=Atom`;
      break;

    default:
      return new Response(`Unsupported platform: ${platform}`, { status: 400 });
  }

  const requestHeaders = {
    'User-Agent': `Cloudflare-RSS-Generator/3.0 (Service: ${serviceName}, Platform: ${platform})`
  };

  try {
    // Fetch the feed from the chosen service.
    const response = await fetch(fetchUrl, { headers: requestHeaders });

    // Create a new response, adding a custom header to identify the service used.
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Content-Type', 'application/rss+xml; charset=utf-8');
    responseHeaders.set('Cache-Control', 'public, max-age=900'); // Cache for 15 minutes
    responseHeaders.set('X-RSS-Service', serviceName); // Custom header for the frontend

    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

    return newResponse;

  } catch (error) {
    return new Response('Failed to fetch RSS feed from the source.', {
      status: 502, // Bad Gateway
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
