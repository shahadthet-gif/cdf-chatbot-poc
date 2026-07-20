
(function () {
  "use strict";

  var CHATWOOT_BASE_URL = "https://app.chatwoot.com";
  var CHATWOOT_WEBSITE_TOKEN = "ybwz3LtujzQ298cY9JC3tQ9w";


  var IS_LOCAL = ["localhost", "127.0.0.1"].indexOf(location.hostname) !== -1;
  var PROXY_BASE_URL = "";

  var isWidgetConfigured = Boolean(CHATWOOT_WEBSITE_TOKEN);
  var sdkReady = false;

  function loadWidget() {
    if (!isWidgetConfigured) return;

    window.chatwootSettings = {
      hideMessageBubble: true,
      position: "right",
      locale: document.documentElement.lang === "en" ? "en" : "ar",
      type: "standard"
    };

    var script = document.createElement("script");
    script.src = CHATWOOT_BASE_URL + "/packs/js/sdk.js";
    script.defer = true;
    script.async = true;
    script.onload = function () {
      window.chatwootSDK.run({
        websiteToken: CHATWOOT_WEBSITE_TOKEN,
        baseUrl: CHATWOOT_BASE_URL
      });
    };
    document.body.appendChild(script);
  }

  window.addEventListener("chatwoot:ready", function () {
    sdkReady = true;
  });


  var liveChat = {
    pollTimer: null,
    lastMessageId: 0,

    start: function (sessionId, onConnected, onAgentMessage, onFallback) {
      fetch(PROXY_BASE_URL + "/api/handoff/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId })
      })
        .then(function (res) {
          if (!res.ok) throw new Error("proxy start failed: " + res.status);
          return res.json();
        })
        .then(function () {
          onConnected();
          liveChat._poll(sessionId, onAgentMessage);
        })
        .catch(function (err) {
          console.warn("CDF live chat: proxy unavailable, falling back to the Chatwoot widget.", err);
          onFallback();
        });
    },

    sendMessage: function (sessionId, text) {
      fetch(PROXY_BASE_URL + "/api/handoff/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId, text: text })
      }).catch(function (err) {
        console.error("CDF live chat: failed to send message via proxy", err);
      });
    },

    _poll: function (sessionId, onAgentMessage) {
      if (liveChat.pollTimer) clearInterval(liveChat.pollTimer);
      liveChat.pollTimer = setInterval(function () {
        fetch(
          PROXY_BASE_URL + "/api/handoff/messages?sessionId=" + encodeURIComponent(sessionId) + "&afterId=" + liveChat.lastMessageId
        )
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            (data.messages || []).forEach(function (m) {
              liveChat.lastMessageId = Math.max(liveChat.lastMessageId, m.id);
              onAgentMessage(m.content, m.senderName);
            });
          })
          .catch(function () {
            /* transient poll failure — try again next tick */
          });
      }, 3000);
    }
  };
  window.cdfLiveChat = liveChat;


  window.cdfTriggerHandoff = function (onOpened) {
    if (!isWidgetConfigured) {
      window.dispatchEvent(new CustomEvent("cdf:handoff-unavailable"));
      return;
    }
    function open() {
      window.$chatwoot.toggle("open");
      if (onOpened) onOpened();
    }
    if (sdkReady && window.$chatwoot) {
      open();
    } else {
      window.addEventListener("chatwoot:ready", function onReady() {
        window.removeEventListener("chatwoot:ready", onReady);
        open();
      });
    }
  };

  document.addEventListener("DOMContentLoaded", loadWidget);
})();
