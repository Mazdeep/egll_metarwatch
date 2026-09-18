async function test() {
  try {
    const res = await fetch('https://aviationweather.gov/api/data/metar?ids=EGLL&format=json');
    console.log(res.status, res.statusText);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}
test();
