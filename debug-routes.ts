
async function test() {
  const url = 'http://localhost:3000/api/routes-list';
  console.log("Fetching:", url);
  try {
    const r = await fetch(url);
    console.log("Status:", r.status);
    const text = await r.text();
    console.log("Body start:", text.substring(0, 100));
    try {
      const json = JSON.parse(text);
      console.log("JSON:", json);
    } catch (e) {
      console.log("Not JSON");
    }
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}
test();
