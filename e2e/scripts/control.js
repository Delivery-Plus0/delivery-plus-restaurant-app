// Maestro runScript helper: asks the E2E runner's control server to perform an action the UI under
// test cannot: act as the customer (stand-in), set up a driver fixture, or verify server-side state.
// Env: CONTROL_URL (set by the runner), ACTION (set per step in the flow).
var response = http.post(CONTROL_URL + '/' + ACTION, {
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});

if (response.status !== 200) {
  throw new Error('Control action "' + ACTION + '" failed: HTTP ' + response.status + ' ' + response.body);
}

output.control = json(response.body);
console.log('control ' + ACTION + ' -> ' + response.body);
