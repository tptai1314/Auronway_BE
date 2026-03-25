const service = require('./history.service');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /history/tasks
 * Lấy lịch sử tất cả tasks đã hoàn thành
 */
const getHistoryTasks = asyncHandler(async (req, res) => {
  const history = await service.getHistoryTasks(req.user, req.query);
  
  res.status(200).json({
    success: true,
    message: 'Lấy lịch sử tasks thành công',
    data: history,
  });
});

module.exports = {
  getHistoryTasks,
};

