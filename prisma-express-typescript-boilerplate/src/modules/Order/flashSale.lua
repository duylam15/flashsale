-- KEYS[1]: stock key (ví dụ: "flashsale:stock:<productId>")
-- KEYS[2]: user set key (ví dụ: "flashsale:buyers:<productId>")
-- ARGV[1]: userId
-- ARGV[2]: quantity (số lượng mua)
-- ARGV[3]: stream name (ví dụ: "flash-sale-stream")
-- ARGV[4]: productId

local stockKey = KEYS[1]
local userSetKey = KEYS[2]
local userId = ARGV[1]
local quantity = tonumber(ARGV[2])
local streamName = ARGV[3]
local productId = ARGV[4]

-- 1. Kiểm tra user đã mua chưa
if redis.call('SISMEMBER', userSetKey, userId) == 1 then
    return -1 -- Mã lỗi: USER_ALREADY_BOUGHT
end

-- 2. Kiểm tra tồn kho
local currentStock = tonumber(redis.call('GET', stockKey))
if not currentStock or currentStock < quantity then
    return -2 -- Mã lỗi: OUT_OF_STOCK
end

-- 3. Thực hiện trừ kho và lưu user
redis.call('DECRBY', stockKey, quantity)
redis.call('SADD', userSetKey, userId)

-- 4. Đẩy event vào Redis Stream cho Worker ghi DB bất đồng bộ
redis.call('XADD', streamName, '*', 'userId', userId, 'productId', productId, 'quantity', quantity)

return 1 -- Thành công