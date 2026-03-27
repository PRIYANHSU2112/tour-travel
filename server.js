const app = require('./src/app')
const { initTourScheduler } = require('./src/services/tourScheduler');

// Initialize background tasks
initTourScheduler();

app.listen(14000, () => {
    console.log("connect to port number 14000");
})