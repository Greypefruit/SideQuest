INSERT INTO activity_types (id, code, name_ru, is_active, created_at, updated_at)
VALUES (UUID(), 'table_tennis', 'Настольный теннис', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name_ru = VALUES(name_ru),
  is_active = VALUES(is_active),
  updated_at = NOW();
