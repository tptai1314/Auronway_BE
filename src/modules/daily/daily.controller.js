// modules/daily/daily.controller.js
const service = require('./daily.service');

// ===== CHECK-IN =====
async function getCheckInStatus(req, res, next) {
  try {
    const result = await service.getCheckInStatus(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getCheckInCalendar(req, res, next) {
  try {
    const result = await service.getCheckInCalendar(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function performCheckIn(req, res, next) {
  try {
    const result = await service.performCheckIn(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ===== DAILY QUEST =====
async function getUserDailyQuests(req, res, next) {
  try {
    const quests = await service.getUserDailyQuests(req.user);
    res.json({ items: quests });
  } catch (err) {
    next(err);
  }
}

async function claimQuestReward(req, res, next) {
  try {
    const { questId } = req.params;
    const result = await service.claimQuestReward(req.user, questId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getQuestHistory(req, res, next) {
  try {
    const result = await service.getQuestHistory7Days(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ===== ADMIN: Daily Quest Management =====
async function createDailyQuest(req, res, next) {
  try {
    const quest = await service.createDailyQuest(req.body);
    res.status(201).json(quest);
  } catch (err) {
    next(err);
  }
}

async function getAllDailyQuests(req, res, next) {
  try {
    const quests = await service.getAllDailyQuests();
    res.json({ items: quests });
  } catch (err) {
    next(err);
  }
}

async function updateDailyQuest(req, res, next) {
  try {
    const quest = await service.updateDailyQuest(req.params.id, req.body);
    res.json(quest);
  } catch (err) {
    next(err);
  }
}

async function deleteDailyQuest(req, res, next) {
  try {
    const result = await service.deleteDailyQuest(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCheckInStatus,
  getCheckInCalendar,
  performCheckIn,
  getUserDailyQuests,
  claimQuestReward,
  getQuestHistory,
  createDailyQuest,
  getAllDailyQuests,
  updateDailyQuest,
  deleteDailyQuest
};
