const express = require("express");
const socketio = require("socket.io");
const axios = require("axios");
const fs = require("fs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();
app.use(express.static("public"));
const server = app.listen(process.env.PORT || "80", () => {
  console.log("Server Started!");
});
const discordWebhookURL =
  "Not Todat (Also the Webhook has been deleted!)";
const io = socketio(server);

app.get("/emojis", (req, res) => {
  fs.readdir("./public/images/emojis", (err, files) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      res.json(files);
    }
  });
});

let cache = loadCache();
function saveCache() {
  fs.writeFileSync("cache.json", JSON.stringify(cache));
}
function loadCache() {
  try {
    const fileData = fs.readFileSync("cache.json");
    return JSON.parse(fileData);
  } catch (err) {
    return {};
  }
}

// Rate limit configuration
const windowMs = 60 * 1000; // 1 minute
const maxRequests = 10; // Maximum requests per minute

const rateLimiter = (req, res, next) => {
  if (
    req.session &&
    req.session.requestsCount &&
    req.session.lastRequestTime
  ) {
    const timeElapsed = Date.now() - new Date(req.session.lastRequestTime);
    if (timeElapsed < windowMs && req.session.requestsCount >= maxRequests) {
      return res.status(429).send("Too many requests");
    }
  }
  if (!req.session) {
    req.session = {};
  }
  req.session.lastRequestTime = Date.now();
  req.session.requestsCount = (req.session.requestsCount || 0) + 1;
  next();
};

app.use(rateLimiter);

function authenticate(req, res, next) {
  next();
}
app.get("/fetch-url", authenticate, async (request, response) => {
  const { url } = request.query;
  if (
    cache[url] &&
    Date.now() - cache[url].timestamp < 60 * 60 * 1000
  ) {
    return response.json(cache[url].metadata);
  }
  const fetchResponse = await fetch(url);
  const html = await fetchResponse.text();
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text() ||
    "";
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";
  const image = $('meta[property="og:image"]').attr("content");
  const data = { title, description, image };
  cache[url] = {
    timestamp: Date.now(),
    metadata: data,
  };
  saveCache();
  response.json(data);
});

app.use((req, res, next) => {
  res.locals.version = "Stable V1.0";
  next();
});

app.get("/about", (req, res) => {
  res.sendFile(__dirname + "/public/about.html");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/homepage.html");
});

app.get("/chat", (req, res) => {
  res.sendFile(__dirname + "/public/chat.html");
});

app.get("/docs", (req, res) => {
  res.sendFile(__dirname + "/public/docs.html");
});

app.get("/docs/emojji", (req, res) => {
  res.sendFile(__dirname + "/public/docs/emojji.html");
});

app.get("*", (req, res) => {
  res.status(404).sendFile(__dirname + "/public/404.html");
});

app.get("/emojji/:name", (req, res) => {
  const emojiName = req.params.name;
  if (emojiName === "random") {
    const emojiFolder = "./public/images/emojis";
    const fs = require("fs");
    fs.readdir(emojiFolder, (err, files) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        const randomIndex = Math.floor(Math.random() * files.length);
        const randomEmoji = files[randomIndex];
        const emojiPath = `${emojiFolder}/${randomEmoji}`;
        const path = require("path");
        const absolutePath = path.resolve(emojiPath);
        res.sendFile(absolutePath);
      }
    });
  } else {
    const emojiPath = `./public/images/emojis/${emojiName}.png`;
    const path = require("path");
    const absolutePath = path.resolve(emojiPath);
    const fs = require("fs");
    if (fs.existsSync(absolutePath)) {
      res.sendFile(absolutePath);
    } else {
      res.status(404).send("Emojji Does Not Exist!");
    }
  }
});

app.get("/emojji/random", (req, res) => {
  const emojiFolder = "./public/images/emojis";
  const fs = require("fs");
  fs.readdir(emojiFolder, (err, files) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      const randomIndex = Math.floor(Math.random() * files.length);
      const randomEmoji = files[randomIndex];
      const emojiPath = `${emojiFolder}/${randomEmoji}`;
      res.sendFile(emojiPath);
    }
  });
});

let logBuffer = [];
let logInterval = 60 * 1000;

io.on("connection", (socket) => {
  let randomNumber = Math.floor(Math.random() * 100);
  let username =
    socket.handshake.headers["x-replit-user-name"] || "Guest (Disabled)";

  socket.emit("youare", username);

  socket.on("join", () => {
    io.emit("userjoin", username);
    logEvent(`${getTimestamp()} ${username} connected.`);
  });

  // Update the "send" event listener as follows:
  socket.on("send", (message) => {
    if (username !== "Guest") {
      io.emit("update", {
        sender: username,
        message: message.replace(/<[^>]*>?/gm, ""),
      });
      logEvent(`${getTimestamp()} ${username}: ${message}`);
    }
  });


  socket.on("disconnect", () => {
    io.emit("userleave", username);
    logEvent(`${getTimestamp()} ${username} disconnected.`);
  });
});

/*
function sendLogsToDiscordWebhook() {
  if (logBuffer.length > 0) {
    const embed = {
      title: "Logs for the past minute",
      description: logBuffer.join("\n"),
      color: 0x00ff00,
    };

    axios
      .post(discordWebhookURL, {
        embeds: [embed],
      })
      .then((response) => {
        console.log("Logs sent to Discord webhook.");
        logBuffer = [];
      })
      .catch((error) => {
        console.error("Error sending logs to Discord webhook:", error);
      });
  }
}
*/

/*
setInterval(sendLogsToDiscordWebhook, logInterval);
*/

function getTimestamp() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `[${hours}:${minutes}:${seconds}]`;
}

function logEvent(event) {
  console.log(event);
  logBuffer.push(event);
}

const characters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function generateRandomString(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/*
function sendMessage(user, message) {
  io.emit("update", {
    sender: user,
    message: message.replace(/<[^>]*>?/gm, ""),
  });
}
*/

/*
app.get("/api/create-bot", (req, res) => {
  const botName = req.query.botname;
  if (!botName) {
    return res.sendStatus(400);
  }
  let bots = JSON.parse(fs.readFileSync("bots.json", "utf8"));
  for (let bot of bots) {
    if (bot.name == botName) {
      return res.sendStatus(400);
    }
  }
  const token = "chatpix-" + generateRandomString(40);
  bots.push({ name: botName, token });
  fs.writeFileSync("bots.json", JSON.stringify(bots));
  res.send(token);
});
*/

/*
app.get("/api/send-message", (req, res) => {
  const { token, message } = req.query;
  if (!token || !message) {
    return res.sendStatus(400);
  }
  try {
    let bots = JSON.parse(fs.readFileSync("bots.json", "utf8"));

    let bot = bots.find((bot) => bot.token == token);

    if (!bots || !bot) {
      return res.sendStatus(404);
    }
    bot.role = "bot";
    bot.rank = "badge-blue";

    fs.writeFileSync("bots.json", JSON.stringify(bots));

    sendMessage(bot.name, message);
    logEvent(`${getTimestamp()} - Bot - ${bot.name}: ${message}`);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error reading or parsing bots.json:", error);
    return res.sendStatus(500);
  }
});
*/

/*
app.delete("/api/delete-bot", (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.sendStatus(400);
  }
  try {
    let bots = JSON.parse(fs.readFileSync("bots.json", "utf8"));

    let index = bots.findIndex((bot) => bot.token == token);

    if (index === -1) {
      return res.sendStatus(404);
    }
    bots.splice(index, 1);
    fs.writeFileSync("bots.json", JSON.stringify(bots));
    res.sendStatus(200);
  } catch (error) {
    console.error("Error reading or parsing bots.json:", error);
    return res.sendStatus(500);
  }
});
*/

/*
app.get("/api/example-codes", (req, res) => {
  return "&0Black &1Dark Blue &2Dark Green &3Dark Aqua &4Dark Red &5Dark Purple &6Gold &7Gray &8Dark Gray &9Blue &aGreen &bAqua &cRed &dLight Purple &eYellow &fWhite &lBold &mStrikethrough &nUnderline &oItalic &rReset";
});
*/