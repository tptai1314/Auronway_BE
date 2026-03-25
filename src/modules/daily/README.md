# Daily Module - Đăng nhập & Nhiệm vụ hằng ngày

## Tính năng

### 1. Đăng nhập hằng ngày (Daily Check-in)
- User có thể check-in 1 lần/ngày
- Tính chuỗi ngày liên tiếp (streak)
- Nhận thưởng XP mỗi lần check-in (có bonus theo streak)
- Theo dõi: streak hiện tại, streak dài nhất, tổng số lần check-in

**Công thức thưởng:**
- Base XP: 10
- Bonus: +5 XP cho mỗi 7 ngày liên tiếp

### 2. Nhiệm vụ hằng ngày (Daily Quest)
- Danh sách nhiệm vụ reset mỗi ngày 00:00
- Các loại nhiệm vụ:
  - `EVENT_ATTEND`: Tham dự event
  - `EVENT_REGISTER`: Đăng ký event
  - `SKILL_XP`: Kiếm XP kỹ năng
  - `REVIEW_SUBMIT`: Nộp đánh giá
  - `CUSTOM`: Tùy chỉnh

- Tiến độ tự động cập nhật khi user thực hiện các hành động
- Hoàn thành quest → nhận thưởng XP

## API Endpoints

### User APIs

#### Check-in
```
GET  /daily/check-in/status    - Xem trạng thái check-in hôm nay
POST /daily/check-in            - Thực hiện check-in
```

#### Daily Quest
```
GET  /daily/quests                    - Lấy danh sách quest hôm nay
POST /daily/quests/:questId/claim     - Nhận thưởng quest
```

### Admin APIs
```
POST   /daily/admin/quests       - Tạo quest mới
GET    /daily/admin/quests       - Lấy tất cả quest
PATCH  /daily/admin/quests/:id   - Cập nhật quest
DELETE /daily/admin/quests/:id   - Xóa quest
```

## Tích hợp với các module khác

### Ví dụ: Cập nhật quest khi user đăng ký event

```javascript
// Trong events.service.js
const dailyService = require('../daily/daily.service');

async function registerEvent(user, eventId) {
  // ... logic đăng ký event
  
  // Cập nhật quest
  await dailyService.updateQuestProgress(user, 'EVENT_REGISTER', 1);
  
  return registration;
}
```

### Ví dụ: Cập nhật quest khi user điểm danh

```javascript
async function attendanceEvent(user, eventId) {
  // ... logic điểm danh
  
  // Cập nhật quest
  await dailyService.updateQuestProgress(user, 'EVENT_ATTEND', 1);
  
  return registration;
}
```

## Models

### DailyCheckIn
- Lưu thông tin check-in của user
- Tính streak, lịch sử check-in

### DailyQuest
- Định nghĩa các nhiệm vụ hằng ngày
- Admin quản lý

### UserDailyQuest
- Tiến độ làm quest của từng user
- Reset mỗi ngày

## Setup

1. Import routes vào `app.js`:
```javascript
const dailyRoutes = require('./src/modules/daily/daily.routes');
app.use('/daily', dailyRoutes);
```

2. Seed dữ liệu mẫu (tạo các quest mặc định)

3. Tích hợp `updateQuestProgress` vào các module: events, skills, reviews...
