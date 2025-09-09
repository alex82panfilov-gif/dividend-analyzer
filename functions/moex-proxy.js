const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Разрешаем CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }
  
  const endpoint = event.queryStringParameters.endpoint;
  
  if (!endpoint) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Missing endpoint parameter' })
    };
  }
  
  try {
    console.log('Fetching from MOEX:', endpoint);
    const response = await fetch(`https://iss.moex.com${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`MOEX API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error in moex-proxy:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};