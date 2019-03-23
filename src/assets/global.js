
// General env file
const env = require('./../../env.json');

(function () {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(`${env.root_path}service-worker.js`)
        .then(() => console.log('Service Worker registered successfully.'))
        .catch(error => console.log('Service Worker registration failed:', error));
    }
})();
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register(`${env.root_path}sw.js`).then(function(registration) {
      // Registration was successful
      //console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
*/