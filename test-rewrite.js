require('dotenv').config();

// Import the handler function
const handler = require('./api/rewrite').default;

// Mock request and response objects
const mockReq = {
  method: 'POST',
  body: {
    text: 'this is annoying and frustrating',
    platform: 'gmail',
    userId: 'test-user-123'
  }
};

const mockRes = {
  status: (code) => ({
    json: (data) => {
      console.log(`Status: ${code}`);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  })
};

console.log('Testing rewrite API...');
handler(mockReq, mockRes).catch(console.error);