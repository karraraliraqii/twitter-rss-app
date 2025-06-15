/**
 * Backend Cloudflare Function
 * Handles requests to /api/rss
 *
 * This function acts as a secure proxy to RSSHub.
 */
export async function onRequest(context) {
  // Get the ?username=... query parameter from the request URL.
  const { searchParams } = new URL(context.request.url);
  const username = searchParams.get('username');

  // Return an error if the username is missing.
  if (!username) {
    return new Response('Missing username query parameter', { status: 400 });
  }

  // The target RSSHub instance. You can change this to your self-hosted instance.
  const RSSHUB_URL = `https://rsshub.app/twitter/user/${username}`;

  // It's good practice to set a custom User-Agent.
  const headers = {
    'User-Agent': 'Cloudflare-RSS-Generator/1.0 (by @alkaid.karrar)'
  };

  try {
    // Fetch the feed from RSSHub using Cloudflare's robust fetch API.
    const response = await fetch(RSSHUB_URL, { headers });

    // Create a new response based on the RSSHub response.
    // This copies the status, statusText, and body.
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
         // Set the correct content type for an RSS feed.
        'Content-Type': 'application/rss+xml; charset=utf-8',
        // Instruct Cloudflare's CDN to cache the response for 10 minutes.
        // This reduces load on RSSHub and speeds up repeated requests.
        'Cache-Control': 'public, max-age=600',
      }
    });

    return newResponse;

  } catch (error) {
    // Return a generic server error if the fetch fails completely.
    return new Response('Failed to fetch RSS feed from the source.', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
    });
  }
}
