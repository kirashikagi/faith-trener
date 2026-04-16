
import fetch from "node-fetch";

async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 99,
        description: 'Test payment',
        metadata: { userId: 'test', type: 'article' },
        return_url: 'http://localhost:3000'
      })
    });
    
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response Text:", text);
    try {
      const json = JSON.parse(text);
      console.log("Parsed JSON:", json);
    } catch (e) {
      console.log("Failed to parse JSON");
    }
  } catch (error) {
    console.error("Test error:", error);
  }
}

test();
