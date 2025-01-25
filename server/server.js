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

const SYSTEM_PROMPT = `You are a geographic assistant. Analyze the user's query and output:
1. A list of specific locations to map
2. Their types (e.g., "museum", "restaurant")
3. The ideal number of results per type

Respond ONLY with valid JSON in this format:
{
  "requests": [
    {
      "type": "museum",
      "query": "modern art museums in Manhattan",
      "limit": 3
    }
  ]
}`;

// Fixed search function
async function searchPlaces(query, limit) {
  try {
    const response = await mapsClient.textSearch({
      params: {
        query: query,
        key: process.env.GOOGLE_MAPS_API_KEY,
        fields: ['name', 'geometry', 'formatted_address']
      }
    });
    return response.data.results.slice(0, limit);
  } catch (error) {
    console.error('Places API error:', error.response?.data || error.message);
    return [];
  }
}

app.post('/api/process-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Get structured search requests from Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser query: ${query}`);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '');
    const { requests } = JSON.parse(responseText);

    // Get coordinates for all locations
    const locations = [];
    for (const { query, limit } of requests) {
      const places = await searchPlaces(query, limit);
      places.forEach(place => {
        locations.push({
          name: place.name,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          address: place.formatted_address
        });
      });
    }

    res.json({ locations });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: "Failed to process query",
      details: error.message
    });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));