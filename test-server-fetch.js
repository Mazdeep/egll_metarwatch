async function test() {
  const timestamp = Date.now();
  const response = await fetch(`https://aviationweather.gov/api/data/metar?ids=EGLL&format=json&_=${timestamp}`, {
    cache: 'no-store'
  });
  console.log(response.status);
  const text = await response.text();
  console.log(text);
}
test();
