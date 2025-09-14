import express from "express";
import { createClient } from "bedrock-protocol";

// --------------------
// Cấu hình server Minecraft
// --------------------
const SERVER_IP = "103.139.154.10";
const SERVER_PORT = 30065;
const BOT_NAME = "AFK_Bot2";

// --------------------
// HTTP server để Render & UptimeRobot ping
// --------------------
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot AFK Minecraft is alive!"));
app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));

// --------------------
// Biến kiểm soát reconnect
// --------------------
let reconnectAttempts = 0;
const MAX_FAST_RETRIES = 10;  // số lần reconnect nhanh
const BASE_DELAY = 10000;     // 10 giây

// --------------------
// Hàm khởi động bot
// --------------------
function startBot() {
  console.log(`[${new Date().toLocaleTimeString()}] Đang kết nối bot...`);

  const bot = createClient({
    host: SERVER_IP,
    port: SERVER_PORT,
    username: BOT_NAME,
    offline: true,
  });

  bot.on("spawn", () => {
    console.log(`[${new Date().toLocaleTimeString()}] Bot đã spawn vào server!`);
    reconnectAttempts = 0; // reset khi connect thành công
  });

  // Hàm xử lý reconnect
  const handleDisconnect = (reason) => {
    reconnectAttempts++;
    console.log(`[${new Date().toLocaleTimeString()}] Bot mất kết nối: ${reason}`);
    
    // Delay tăng dần
    let delay;
    if (reconnectAttempts <= MAX_FAST_RETRIES) {
      delay = BASE_DELAY;
    } else {
      delay = Math.min(BASE_DELAY * reconnectAttempts, 60000); // tối đa 60 giây
    }
    console.log(`Đang thử reconnect sau ${delay / 1000} giây...`);
    setTimeout(startBot, delay);
  };

  bot.on("kick", handleDisconnect);
  bot.on("disconnect", handleDisconnect);
  bot.on("end", handleDisconnect);

  bot.on("error", (err) => {
    console.log(`[${new Date().toLocaleTimeString()}] Lỗi: ${err}`);
    // Nếu server chưa sẵn sàng (reset) → reconnect
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      handleDisconnect(err.code);
    }
  });

  // Giữ bot hoạt động để tránh AFK kick
  setInterval(() => {
    try {
      bot.queue("move", { x: 0, y: 0, z: 0 });
    } catch {}
  }, 60000);
}

// Khởi động bot lần đầu
startBot();
