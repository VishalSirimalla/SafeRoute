const { scoreRouteAlternatives } = require('./services/routeRiskService');

async function testRouteCalculation() {
  console.log('=== TEST 1: Borivali Station to Thakur College ===');
  const start1 = '19.2284901, 72.8568418';
  const dest1 = '19.2060515, 72.8746102';

  try {
    const res1 = await scoreRouteAlternatives(start1, dest1);
    console.log(`Success: ${res1.success}`);
    console.log(`Routes count: ${res1.routes?.length}`);
    if (res1.routes?.length > 0) {
      res1.routes.forEach((r, idx) => {
        console.log(` Route [${idx + 1}]: ${r.title} | ${r.distance} km | ${r.duration} min | Risk: ${r.risk_score} (${r.risk_category}) | Geometry points: ${r.geometry?.length}`);
      });
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  console.log('\n=== TEST 2: Balaji Nagar Bhiwandi to Kamatghar Bhiwandi ===');
  const start2 = '19.309906, 72.8514366';
  const dest2 = '19.2791446, 73.0515718';

  try {
    const res2 = await scoreRouteAlternatives(start2, dest2);
    console.log(`Success: ${res2.success}`);
    console.log(`Routes count: ${res2.routes?.length}`);
    if (res2.routes?.length > 0) {
      res2.routes.forEach((r, idx) => {
        console.log(` Route [${idx + 1}]: ${r.title} | ${r.distance} km | ${r.duration} min | Risk: ${r.risk_score} (${r.risk_category}) | Geometry points: ${r.geometry?.length}`);
      });
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

testRouteCalculation();
