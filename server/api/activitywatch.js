import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import bodyParser from 'body-parser';
import { activitywatchMethods } from '../methods/activitywatch.js';

// Add body parser middleware
WebApp.connectHandlers.use(bodyParser.json({ limit: '50mb' }));

// REST API endpoint for browser extension
WebApp.connectHandlers.use('/api/activitywatch/sync', async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  try {
    const apiKey = req.headers['x-api-key'];
    const { buckets, events, hostname } = req.body;
    
    if (!apiKey) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'API key required' }));
      return;
    }
    
    // Call the async method
    const result = await activitywatchMethods.storeActivityData.call(
      {},
      { buckets, events, hostname, apiKey }
    );
    
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: 'Data synced successfully',
      timestamp: new Date()
    }));
    
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(error.error === 'not-authorized' ? 401 : 500);
    res.end(JSON.stringify({ error: error.reason || 'Internal server error' }));
  }
});

