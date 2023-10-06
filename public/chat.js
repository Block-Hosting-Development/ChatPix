// html elements
let loginButton = document.getElementById("login-button");
let hasLoggedin = document.getElementById("has-loggedin");
let joinChat = document.getElementById("join-chat");
let loginBox = document.getElementById("login-box");
let chatBox = document.getElementById("chat-box");
let chatMessages = document.getElementById("chat-messages");
let messageInput = document.getElementById("message-input");
let messageSend = document.getElementById("message-send");

// websockets
const socket = io();

let userConfig = {
  "BailenRailen": {
    "rank": "badge-red",
    "nickname": "bailenrailen",
    "rankTitle": "Owner"
  },
  "ylnurse3": {
    "rank": "badge-blue",
    "nickname": "Ava <3",
    "rankTitle": "Friend"
  },
  "tonomeow": {
    "rank": "badge-orange",
    "rankTitle": "Admin",
    "nickname": "Tonocatmeow"
  
  },
  "Eminence5070": {
    "rank": "badge-purple",
    "rankTitle": "Tester",
    "nickname": "Eminence"
  
  },
};

let forbiddenWords = ["fuck", "bitch", "shit", "fag", "faggot", "nigger", "niger", "nigerr", "Railen DeMoss"];

function filterMessage(message) {
  let words = message.split(' ');
  words = words.map(word => {
    if (forbiddenWords.includes(word.toLowerCase())) {
      return "*".repeat(word.length); // replace forbidden words with asterisks
    } else {
      return word;
    }
  });
  return words.join(' ');
}

function authenticate(req, res, next) {
  const token = req.headers['authorization'];
  if(token === process.env['auth-token']) next();
  else res.status(403).send('Unauthorized access');
}

// show auth popup when the login button is clicked
loginButton.addEventListener("click", (e) => {
  let authTab = window.open(`https://repl.it/auth_with_repl_site?domain=${window.location.host}`,
      "_blank",
      "modal=yes, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=350, height=500, top=0, left=0");

  // on completion, close the tab.
  // now the server can find our username in the headers!
  function onAuthCompletion(e) {
    if(e.data != "auth_complete") return;

    window.removeEventListener("message", onAuthCompletion);

    authTab.close();
    window.location.reload();
  }
  window.addEventListener("message", onAuthCompletion)
});

function createAvatar(nickname) {
  let initials = nickname.charAt(0).toUpperCase();
  return `<sl-avatar initials="${initials}" label="Avatar with initials: ${initials}"></sl-avatar> `;
}


// server tells the client who they are, to check if they are logged in
socket.on("youare", username => {
  if(username.includes('Guest')) {
    userConfig[username] = {
      "rank": "badge-blue",
      "rankTitle": "Guest"
    };
  } else {
    // hide login button only for non-guest users
    loginButton.classList.add("hidden");
  }

  hasLoggedin.innerHTML = `Logged in as ${username}`;
  hasLoggedin.classList.remove("hidden");

  joinChat.innerHTML = `Join as ${username}`;
});

// join button
joinChat.addEventListener("click", (e) => {
  // Check if the user is already logged in with a guest name
  if (hasLoggedin.innerHTML.includes('Guest')) {
    alert("Guest is disabled. Please login with a real account.");
    return;
  }
  
  loginBox.classList.add("hidden");
  chatBox.classList.remove("hidden");

  socket.emit("join");
});


let emojis = [];
// Fetch emoji list from server
fetch('/emojis')
.then(response => response.json())
.then(emojiList => {
  emojis = emojiList;
});
// Function for replacing emoji shortcodes with actual emojis
function parseEmojis(message) {
  return message.replace(/:([a-zA-Z0-9_+-]+):/g, (match, j) => {
    if (emojis.includes(j + '.png')) 
      return `<img src="/images/emojis/${j}.png" class="emoji" alt="${j}" title="${j}">`;
    else
      return match;
  });
}

// Function for highlighting mentions
function parseMentions(message) {
  let regEx = /(@\w+)/g;
  let matches = message.match(regEx);
  if (matches) {
    matches.forEach(match => {
      let mentionedUsername = match.substring(1); // get rid of @
      let userHighlightColor = "blue"; // change this color to whatever you want
      message = message.replace(match, `<span style="color: ${userHighlightColor}">${match}</span>`);
    });
  }
  return message;
}

function getUrlsInText(str) {
  const urlRegex = /(http[s]?:\/\/[^\s]+)/g;
  return str.match(urlRegex);
}

function marked(text) {
  // Add your implementation of the marked function here
  // ...

  return text;
}


function generateLinkEmbed(url, title, description, image, extraMessage) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = extractVideoId(url);
    return `
      <div class="link-embed">
        <a href="${url}" target="_blank">
          <div class="link-embed-url">${url}</div>
          <div class="link-embed-content">
            <div class="link-embed-title">${title}</div>
            <div class="link-embed-description">${description}</div>
            ${extraMessage ? `<div class="extra-message">${extraMessage}</div>` : ""}
            <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </a>
      </div>
    `;
  } else {
    let imageHTML = '';
  
    if (image) {
      imageHTML = `<div class="link-embed-image">
        <img src="${image}" alt="Link preview image">
      </div>`;
    }
  
    return `
      <div class="link-embed">
          <a href="${url}" target="_blank">
              <div class="link-embed-url">${url}</div>
              <div class="link-embed-content">
                  <div class="link-embed-title">${title}</div>
                  <div class="link-embed-description">${description}</div>
                  ${extraMessage ? `<div class="extra-message">${extraMessage}</div>` : ""}
              </div>
              ${imageHTML}
          </a>
      </div>
    `;
  }
}

function extractVideoId(url) {
  let videoId = "";
  if (url.includes("youtube.com")) {
    const urlParams = new URLSearchParams(new URL(url).search);
    videoId = urlParams.get("v");
  } else if (url.includes("youtu.be")) {
    const urlParts = url.split("/");
    videoId = urlParts[urlParts.length - 1];
  }
  return videoId;
}

// Create an Audio element for the 'ding.mp3' sound
const dingSound = new Audio('sounds/ding.mp3');

socket.on("update", async update => {
  let nickname = update.sender;  
  let rank = 'badge-green';
  let rankTitle = 'Member';
  if(userConfig[update.sender]) {
    if(userConfig[update.sender].nickname) {
      nickname = userConfig[update.sender].nickname;
    }
    if(userConfig[update.sender].rank) {
      rank = userConfig[update.sender].rank;
    }
    if(userConfig[update.sender].rankTitle) {
      rankTitle = userConfig[update.sender].rankTitle;
    }
  }
  let badge = `<span class="badge ${rank}">${rankTitle}</span> `; 

  
  update.message = filterMessage(update.message);
  
  // Use parseEmojis and parseMentions functions to parse emojis and mentions in update.message
  let parsedMessage = parseEmojis(update.message);
  parsedMessage = parseMentions(parsedMessage);

  // Get URLs from the message
  const urls = getUrlsInText(parsedMessage);

  // Fetch metadata for each URL and create link preview
  if (urls) {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      // Fetch your server-side route
      const metaDataResponse = await fetch(`/fetch-url?url=${url}`);
      const metaData = await metaDataResponse.json();
      const linkPreview = generateLinkEmbed(url, metaData.title, metaData.description, metaData.image);
      
      // Insert link preview into the message
      parsedMessage = parsedMessage.replace(url, linkPreview);
    }
  }

  // Convert Minecraft color codes
  parsedMessage = parsedMessage.replace(/&([0-9a-fl-or])/g, (match, code) => {
    switch (code.toLowerCase()) {
      case '0':
        return '<span style="color: #000000;">'; // Black
      case '1':
        return '<span style="color: #0000AA;">'; // Dark Blue
      case '2':
        return '<span style="color: #00AA00;">'; // Dark Green
      case '3':
        return '<span style="color: #00AAAA;">'; // Dark Aqua
      case '4':
        return '<span style="color: #AA0000;">'; // Dark Red
      case '5':
        return '<span style="color: #AA00AA;">'; // Dark Purple
      case '6':
        return '<span style="color: #FFAA00;">'; // Gold
      case '7':
        return '<span style="color: #AAAAAA;">'; // Gray
      case '8':
        return '<span style="color: #555555;">'; // Dark Gray
      case '9':
        return '<span style="color: #5555FF;">'; // Blue
      case 'a':
        return '<span style="color: #55FF55;">'; // Green
      case 'b':
        return '<span style="color: #55FFFF;">'; // Aqua
      case 'c':
        return '<span style="color: #FF5555;">'; // Red
      case 'd':
        return '<span style="color: #FF55FF;">'; // Light Purple
      case 'e':
        return '<span style="color: #FFFF55;">'; // Yellow
      case 'f':
        return '<span style="color: #FFFFFF;">'; // White
      case 'l':
        return '<span style="font-weight: bold;">'; // Bold
      case 'm':
        return '<span style="text-decoration: line-through;">'; // Strikethrough
      case 'n':
        return '<span style="text-decoration: underline;">'; // Underline
      case 'o':
        return '<span style="font-style: italic;">'; // Italic
      case 'r':
        return '</span>'; // Reset
      default:
        return match;
    }
  });

  // Convert markdown formatting
  parsedMessage = marked(parsedMessage);

  // Create new message element
  let nicknameInitial = createAvatar(nickname)
  let messageElement = document.createElement("p");
  messageElement.innerHTML = `<b>${badge}${nicknameInitial}<a href="https://replit.com/@${update.sender}">${nickname}</a>:</b> ${parsedMessage}`;
  
  // Prepend the new message
  chatMessages.prepend(messageElement);
  
  // Play sound if enabled
  if (document.getElementById('soundToggle').checked) {
    dingSound.play();
  }
});



socket.on("userjoin", username => {
  let nickname = username;  
  let rank = 'badge-green';
  let rankTitle = 'Member';

  if(userConfig[username]) {
    if(userConfig[username].nickname) {
      nickname = userConfig[username].nickname;
    }
    if(userConfig[username].rank) {
      rank = userConfig[username].rank;
    }
    if(userConfig[username].rankTitle) {
      rankTitle = userConfig[username].rankTitle;
    }
  }

  let badge = `<span class="badge ${rank}">${rankTitle}</span> `; 

  const joinMessageElement = document.createElement("p");
  let nicknameInitial = createAvatar(nickname);
  joinMessageElement.innerHTML = `<b>${badge}${nicknameInitial}<a href="https://replit.com/@${username}">@${nickname}</a></b> has joined the chat!`;

  chatMessages.prepend(joinMessageElement);
});

let connectedUsers = new Set();

socket.on("userleave", username => {
  // Check if user was connected
  if (!connectedUsers.has(username)) {
    return;
  }

  let nickname = username;  
  let rank = 'badge-green';
  let rankTitle = 'Member';

  if(userConfig[username]) {
    if(userConfig[username].nickname) {
      nickname = userConfig[username].nickname;
    }
    if(userConfig[username].rank) {
      rank = userConfig[username].rank;
    }
    if(userConfig[username].rankTitle) {
      rankTitle = userConfig[username].rankTitle;
    }
  }

  let badge = `<span class="badge ${rank}">${rankTitle}</span> `; 

  const leaveMessageElement = document.createElement("p");
  let nicknameInitial = createAvatar(nickname);
  leaveMessageElement.innerHTML = `<b>${badge}${nicknameInitial}<a href="https://replit.com/@${username}">@${nickname}</a></b> has left the chat!`;
  
  chatMessages.prepend(leaveMessageElement);
  // Remove user from connected users
  connectedUsers.delete(username);
});


// you sent a message
messageSend.addEventListener("click", (e) => {
  if (hasLoggedin.innerHTML.includes('Guest')) {
    alert("Guest is disabled. Please login with a real account.");
    return;
  }
  
  const message = messageInput.value;
  
  if (message.startsWith("/announce ")) {
    const username = hasLoggedin.innerHTML.replace("Logged in as ", "");
    if (username === "NetherPuigun64") {
      socket.emit("send", `System Announcement: ${message.replace("/announce ", "")}`);
    } else {
      console.log("You don't have permission to use this command.");
    }
  } else if (message.trim() !== "") {
    socket.emit("send", messageInput.value);
  }
  // Clear the input field
  messageInput.value = "";
});


function sendMessage() {
  const message = messageInput.value;

  if (message.trim() !== "") {
    socket.emit("send", message);

    // Clear the input field after sending the message
    messageInput.value = "";
  }
}

// Event listener for clicking the send button
messageSend.addEventListener("click", sendMessage);

// Event listener for pressing Enter in the input field
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});


// Function to set a cookie with a specified name, value, and expiration date
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = name + '=' + value + ';expires=' + expires.toUTCString();
}

// Function to get a cookie value by name
function getCookie(name) {
  const cookieName = name + '=';
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(cookieName) === 0) {
      return cookie.substring(cookieName.length, cookie.length);
    }
  }
  return null;
}

// Function to initialize the toggle switch state from the cookie
function initializeSoundToggle() {
  const soundToggle = document.getElementById('soundToggle');
  const soundEnabled = getCookie('soundEnabled');

  if (soundEnabled === 'false') {
    soundToggle.checked = false;
  }

  soundToggle.addEventListener('change', function () {
    setCookie('soundEnabled', this.checked, 30); // Set the cookie with a 30-day expiration
  });
}

// Call the initialization function when the page loads
window.addEventListener('load', initializeSoundToggle);

document.getElementById('emoji-button').addEventListener('click', function() {
  window.open('emojis.html', 'Emojis', 'width=600,height=400');
});
