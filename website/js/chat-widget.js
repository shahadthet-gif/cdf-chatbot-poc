/**
 * Custom chat widget wired to a locally-running Rasa REST channel.
 * Rasa must be started with: rasa run --enable-api --cors "*" ...
 * (see rasa-bot/README.md)
 */
(function () {
  "use strict";

  // Same static files serve both local dev and the deployed Render site
  // (no build step), so the right backend is picked at runtime based on
  // where the page itself is being viewed from — never hardcode one or
  // the other here.
  var IS_LOCAL = ["localhost", "127.0.0.1"].indexOf(location.hostname) !== -1;
  // Rasa itself runs on Hugging Face Spaces (see rasa-bot/README.md) rather
  // than Render — Render's free tier (512MB RAM) isn't enough for
  // Rasa + TensorFlow at runtime; HF Spaces' free CPU tier (16GB) is.
  var RASA_URL = (IS_LOCAL ? "http://localhost:7860" : "https://shahadalh-3-cdf-chatbot-rasa.hf.space") + "/webhooks/rest/webhook";

  var TEXT = {
    ar: {
      title: "المساعدة والدعم",
      status: "متوفر",
      placeholder: "اكتب رسالتك",
      handoffTransition: "بالتأكيد، جاري تحويلك الآن إلى أحد موظفي الدعم...",
      handoffConnected: "تم توصيلك بأحد موظفي الدعم. يمكنك كتابة سؤالك الآن وسيتم الرد عليك في أقرب وقت.",
      handoffUnavailable: "خدمة الدردشة المباشرة غير مُفعّلة بعد في هذه النسخة التجريبية. الرجاء مراجعة docs/SETUP.md لإكمال الإعداد."
    },
    en: {
      title: "Support & Assistance",
      status: "Available",
      placeholder: "Type your message",
      handoffTransition: "Sure, connecting you with one of our support agents now...",
      handoffConnected: "You're now connected with a support agent. Go ahead and type your question — they'll reply as soon as possible.",
      handoffUnavailable: "Live chat isn't configured in this demo build yet. See docs/SETUP.md to finish setup."
    }
  };

  function siteLang() {
    return document.documentElement.lang === "en" ? "en" : "ar";
  }

  // The language used inside the chat can diverge from the site-wide
  // chrome language (e.g. user picks English in the chat, then later
  // flips the site nav back to Arabic) — track it separately once the
  // user makes an explicit choice inside the conversation.
  var chatLang = siteLang();
  var chatLangLocked = false;

  function currentLang() {
    return chatLang;
  }

  function getSenderId() {
    var key = "cdf_chat_sender_id";
    var id = localStorage.getItem(key);
    if (!id) {
      id = "cdf-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, id);
    }
    return id;
  }

  var senderId = getSenderId();
  var conversationStarted = false;
  var handedOff = false;

  // Deliberately NOT persisted (unlike senderId above) — a fresh id every
  // page load means a fresh Chatwoot conversation every visit, instead of
  // silently reattaching to (and replaying the full history of) whatever
  // conversation this browser started last time.
  var chatwootSessionId = "cdf-cw-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);

  // ---------------------------------------------------------------
  // DOM construction
  // ---------------------------------------------------------------
  var root = document.getElementById("cdf-chat-root");

  var launcher = document.createElement("button");
  launcher.className = "cdf-chat-launcher";
  launcher.setAttribute("aria-label", "فتح المحادثة");
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8">' +
    '<path d="M4 5.5c0-.83.67-1.5 1.5-1.5h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5c-.83 0-1.5-.67-1.5-1.5v-9Z"/>' +
    '</svg>';

  var panel = document.createElement("div");
  panel.className = "cdf-chat-panel hidden";
  panel.innerHTML =
    '<div class="cdf-chat-header">' +
    '  <div class="cdf-chat-avatar">' +
    '    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19v1a2 2 0 0 1-2 2h-3"/></svg>' +
    "  </div>" +
    '  <div class="cdf-chat-header-text">' +
    '    <div class="cdf-chat-title" data-role="title">المساعدة والدعم</div>' +
    '    <div class="cdf-chat-status"><span class="dot-online"></span><span data-role="status">متوفر</span></div>' +
    "  </div>" +
    '  <button type="button" class="cdf-chat-close" aria-label="إغلاق">&times;</button>' +
    "</div>" +
    '<div class="cdf-chat-body" data-role="body"></div>' +
    '<div class="cdf-chat-input">' +
    '  <input type="text" data-role="input" autocomplete="off">' +
    '  <button type="button" class="send" data-role="send" aria-label="إرسال">' +
    '    <svg viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8"><path d="M4 12h16M13 5l7 7-7 7"/></svg>' +
    "  </button>" +
    "</div>";

  root.appendChild(panel);
  root.appendChild(launcher);

  var bodyEl = panel.querySelector('[data-role="body"]');
  var inputEl = panel.querySelector('[data-role="input"]');
  var sendBtn = panel.querySelector('[data-role="send"]');
  var closeBtn = panel.querySelector(".cdf-chat-close");
  var titleEl = panel.querySelector('[data-role="title"]');
  var statusEl = panel.querySelector('[data-role="status"]');

  function refreshChrome() {
    var t = TEXT[currentLang()];
    titleEl.textContent = t.title;
    statusEl.textContent = t.status;
    inputEl.placeholder = t.placeholder;
  }
  refreshChrome();
  window.addEventListener("cdf:language-changed", function (e) {
    if (chatLangLocked) return; // conversation already has its own language
    chatLang = e.detail.lang;
    refreshChrome();
  });

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  function scrollToBottom() {
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  // The panel chrome stays RTL, but individual message text must follow
  // whichever language the conversation is actually in — otherwise English
  // bubbles get bidi-reordered (emoji/punctuation jump to the wrong side).
  function bubbleDir() {
    return currentLang() === "en" ? "ltr" : "rtl";
  }

  function addBotBubble(text) {
    var row = document.createElement("div");
    row.className = "cdf-msg-row bot";
    var bubble = document.createElement("div");
    bubble.className = "cdf-bubble";
    bubble.dir = bubbleDir();
    bubble.textContent = text;
    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollToBottom();
    return row;
  }

  function addUserBubble(text) {
    var row = document.createElement("div");
    row.className = "cdf-msg-row user";
    var bubble = document.createElement("div");
    bubble.className = "cdf-bubble";
    bubble.dir = bubbleDir();
    bubble.textContent = text;
    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollToBottom();
  }

  function addImageBubble(src) {
    var row = document.createElement("div");
    row.className = "cdf-msg-row bot";
    var img = document.createElement("img");
    img.className = "cdf-bubble-image";
    img.src = src;
    img.alt = "";
    row.appendChild(img);
    bodyEl.appendChild(row);
    scrollToBottom();
  }

  function addButtons(buttons) {
    var row = document.createElement("div");
    row.className = "cdf-msg-row bot";
    var wrap = document.createElement("div");
    wrap.className = "cdf-buttons";
    wrap.dir = bubbleDir();
    buttons.forEach(function (b) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = b.title;
      btn.addEventListener("click", function () {
        // A button pointing at a real cdf.gov.sa page opens it in a new tab
        // instead of sending a message — it's not part of the conversation.
        if (/^https?:\/\//.test(b.payload)) {
          window.open(b.payload, "_blank", "noopener");
          return;
        }

        Array.prototype.forEach.call(wrap.children, function (c) {
          c.disabled = true;
        });
        btn.classList.add("selected");
        addUserBubble(b.title);

        var langMatch = /^\/greet\{"language":\s*"(ar|en)"\}$/.exec(b.payload);
        if (langMatch) {
          chatLang = langMatch[1];
          chatLangLocked = true;
          refreshChrome();
        }

        sendToRasa(b.payload);
      });
      wrap.appendChild(btn);
    });
    row.appendChild(wrap);
    bodyEl.appendChild(row);
    scrollToBottom();
  }

  var typingRow = null;
  function showTyping() {
    typingRow = document.createElement("div");
    typingRow.className = "cdf-msg-row bot";
    typingRow.innerHTML = '<div class="cdf-typing"><span></span><span></span><span></span></div>';
    bodyEl.appendChild(typingRow);
    scrollToBottom();
  }
  function hideTyping() {
    if (typingRow) {
      typingRow.remove();
      typingRow = null;
    }
  }

  // ---------------------------------------------------------------
  // Handoff
  // ---------------------------------------------------------------
  var MIN_TRANSITION_READ_MS = 400; // let the user read "connecting..." before the (fallback-only) swap

  function performHandoff(transitionText) {
    if (handedOff) return;
    handedOff = true;
    addBotBubble(transitionText || TEXT[currentLang()].handoffTransition);

    // Tier 1: proxy + Chatwoot's official Application API — agent replies
    // render as normal bubbles right here, our panel never hides.
    window.cdfLiveChat.start(
      chatwootSessionId,
      function onConnected() {
        addBotBubble(TEXT[currentLang()].handoffConnected);
      },
      function onAgentMessage(text) {
        addBotBubble(text);
      },
      function onFallback() {
        // Tier 2: proxy unreachable — fall back to the embedded widget.
        var shownAt = Date.now();
        window.cdfTriggerHandoff(function () {
          if (!handedOff) return; // cdf:handoff-unavailable fired synchronously first
          var wait = Math.max(0, MIN_TRANSITION_READ_MS - (Date.now() - shownAt));
          setTimeout(function () {
            panel.classList.add("hidden");
            launcher.style.display = "none";
          }, wait);
        });
      }
    );
  }

  window.addEventListener("cdf:handoff-unavailable", function () {
    addBotBubble(TEXT[currentLang()].handoffUnavailable);
    handedOff = false;
  });

  // ---------------------------------------------------------------
  // Rasa transport
  // ---------------------------------------------------------------
  function sendToRasa(message) {
    showTyping();
    return fetch(RASA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: senderId, message: message })
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (messages) {
        hideTyping();
        messages.forEach(function (msg) {
          if (msg.custom && msg.custom.action === "handoff_to_chatwoot") {
            performHandoff(msg.custom.text);
            return;
          }
          if (msg.text) addBotBubble(msg.text);
          if (msg.image) addImageBubble(msg.image);
          if (msg.buttons && msg.buttons.length) addButtons(msg.buttons);
        });
      })
      .catch(function (err) {
        hideTyping();
        console.error("CDF chat: could not reach Rasa server at " + RASA_URL, err);
        addBotBubble(
          currentLang() === "ar"
            ? "تعذر الاتصال بخادم المساعد الآن. تأكد من تشغيل خادم Rasa محليًا."
            : "Couldn't reach the assistant server. Make sure the local Rasa server is running."
        );
      });
  }

  function sendUserText() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    addUserBubble(text);
    // Once handed off (Tier 1 succeeded, panel stays visible), route typed
    // messages to the live-chat proxy instead of Rasa.
    if (handedOff) {
      window.cdfLiveChat.sendMessage(chatwootSessionId, text);
    } else {
      sendToRasa(text);
    }
  }

  sendBtn.addEventListener("click", sendUserText);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendUserText();
  });

  // ---------------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------------
  function openPanel() {
    panel.classList.remove("hidden");
    if (!conversationStarted) {
      conversationStarted = true;
      sendToRasa("/widget_opened");
    }
    inputEl.focus();
  }

  launcher.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", function () {
    panel.classList.add("hidden");
  });
})();
