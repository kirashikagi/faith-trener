
async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/payments/test-config');
    const data = await response.json();
    console.log("Config Check:", data);
  } catch (error) {
    console.error("Config Check Failed:", error);
  }
}
test();
