
async function testPost() {
  try {
    const response = await fetch('http://localhost:3000/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 1,
        description: "Test Purchase",
        metadata: { userId: "test-user", type: "article", articleId: "test-article" },
        return_url: "http://localhost:3000"
      })
    });
    
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response:", data);
  } catch (error) {
    console.error("POST Test Failed:", error);
  }
}
testPost();
