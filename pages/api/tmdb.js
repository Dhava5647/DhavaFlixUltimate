// This is our server-side API route.
// It will receive requests and forward them to the real TMDB API.

export default async function handler(req, res) {
  // Get the API path and any extra parameters from the request URL.
  // e.g., if the request is for /api/tmdb?path=trending/all/week,
  // `path` will be 'trending/all/week'.
  const { path, ...params } = req.query;

  if (!path) {
    return res.status(400).json({ message: 'API path is required' });
  }

  // Get the secret API key from our environment variables.
  // This is much more secure!
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
      return res.status(500).json({ message: 'API key is not configured' });
  }

  // Build the full TMDB API URL.
  const queryParams = new URLSearchParams(params).toString();
  const apiUrl = `https://api.themoviedb.org/3/${path}?api_key=${apiKey}&language=en-US&${queryParams}`;

  try {
    // Call the real TMDB API from our server.
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      // If TMDB gives an error, send it back to the user's browser.
      const errorData = await apiResponse.json();
      return res.status(apiResponse.status).json(errorData);
    }

    // If the call was successful, send the data back to the user's browser.
    const data = await apiResponse.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Proxy API Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
