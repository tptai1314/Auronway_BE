const service = require('./notifications.service');

// Example controller method
async function example(req, res, next) {
  try {
    const data = await service.example();
    res.json(data);
  } catch (err) { next(err); }
}

module.exports = { example };
