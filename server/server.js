require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Client } = require('@googlemaps/google-maps-services-js');

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

const app = express();
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

console.log('Gemini Key:', process.env.GEMINI_API_KEY ? 'Loaded' : 'Missing');
console.log('Maps Key:', process.env.GOOGLE_MAPS_API_KEY ? 'Loaded' : 'Missing');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const mapsClient = new Client({});

const SYSTEM_PROMPT = `You are a geographic assistant. For user queries:
1. Convert concepts to specific locations with context
2. For each location, provide a brief selection reason
3. Always include country/region
4. Specify required metadata fields (e.g., elevation)

Respond with JSON in this format:
{
  "locations": [
    {
      "query": "Mount Everest, Nepal",
      "reason": "Highest mountain on Earth at 8,848 meters",
      "metadata": ["elevation"]
    }
  ]
}`;

async function getElevation(lat, lng) {
  try {
    const response = await mapsClient.elevation({
      params: {
        locations: [{ lat, lng }],
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    return response.data.results[0]?.elevation?.toFixed(0) || 'N/A';
  } catch (error) {
    console.error('Elevation API error:', error);
    return 'N/A';
  }
}

async function searchPlaces(query, metadata) {
  try {
    const placesResponse = await mapsClient.textSearch({
      params: {
        query: `${query}`,
        key: process.env.GOOGLE_MAPS_API_KEY,
        fields: ['name', 'geometry', 'formatted_address'],
        region: 'global'
      }
    });
    
    const place = placesResponse.data.results[0];
    if (!place) return null;

    const extraData = {};
    if (metadata?.includes('elevation')) {
      extraData.elevation = await getElevation(
        place.geometry.location.lat,
        place.geometry.location.lng
      );
    }

    return {
      name: place.name,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      address: place.formatted_address,
      ...extraData
    };
  } catch (error) {
    console.error('Search error:', error);
    return null;
  }
}

app.post('/api/process-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser query: ${query}`);
    const rawResponse = result.response.text();
    const cleanText = rawResponse.replace(/```json/g, '').replace(/```/g, '');

    let processedData = { locations: [] };
    try {
      processedData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
    }

    const locations = await Promise.all(
      processedData.locations.map(async ({ query, reason, metadata }) => {
        const place = await searchPlaces(query, metadata);
        return place ? { ...place, reason } : null;
      })
    );

    res.json({
      locations: locations.filter(l => l),
      rationale: processedData.locations,
      rawResponse
    });
  } catch (error) {
    console.error('Server error:', error);
    res.json({
      locations: [],
      rationale: [],
      rawResponse: `Error: ${error.message}`
    });
  }
});

const EXAMPLE_PROMPT = `Generate 5 diverse geographic search examples in this JSON format:
{
  "examples": [
    "Tallest buildings in Asia",
    "Active volcanoes in South America",
    "UNESCO World Heritage Sites in Africa",
    "Major tech company headquarters in Europe",
    "Deepest ocean trenches worldwide"
  ]
}`;

app.get('/api/example-query', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(EXAMPLE_PROMPT);
    const responseText = result.response.text();
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '');
    
    const { examples } = JSON.parse(cleanText);
    res.json({ examples });
  } catch (error) {
    console.error('Example query error:', error);
    res.json({ examples: [
      "Famous landmarks in Europe",
      "Highest mountains in South America",
      "Ancient historical sites in Asia",
      "Major desert areas worldwide",
      "Longest rivers in Africa"
    ]});
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));