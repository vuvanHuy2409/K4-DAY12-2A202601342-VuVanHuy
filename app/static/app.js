const $ = (selector) => document.querySelector(selector);

const form = $("#chat-form");
const input = $("#message");
const sendButton = $("#send-button");
const messages = $("#messages");
const welcome = $("#welcome");
const panel = $("#chat-panel");
const tokenInput = $("#api-token");
const clientInput = $("#client-id");
const statusPill = $("#status-pill");
const charCount = $("#char-count");
const template = $("#message-template");

tokenInput.value = sessionStorage.getItem("orbit-api-token") || "";
clientInput.value = sessionStorage.getItem("orbit-client-id") || "sv01";

function setStatus(state, text) {
  statusPill.className = `status-pill ${state}`;
  statusPill.querySelector("span").textContent = text;
}

async function checkHealth() {
  try {
    const response = await fetch("/healthz", { cache: "no-store" });
    const data = await response.json();
    setStatus(response.ok && data.status === "ok" ? "online" : "offline", response.ok ? "Online" : "Lỗi");
  } catch {
    setStatus("offline", "Offline");
  }
}

function resizeComposer() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
  charCount.textContent = `${input.value.length} / 2000`;
}

function addMessage(kind, text, meta = "") {
  welcome.hidden = true;
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.add(kind);
  node.querySelector(".avatar").textContent = kind === "user" ? "H" : kind === "error" ? "!" : "✦";
  node.querySelector(".message-label").textContent = kind === "user" ? "Bạn" : kind === "error" ? "Hệ thống" : "L-GPT";
  node.querySelector(".message-text").textContent = text;
  node.querySelector(".message-meta").textContent = meta;
  messages.appendChild(node);
  panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
  return node;
}

function errorMessage(status, body) {
  const known = {
    401: "Token chưa đúng hoặc đang để trống. Hãy kiểm tra Bearer token ở thanh bên.",
    402: "Client này đã hết ngân sách sử dụng trong ngày.",
    422: "Tin nhắn không hợp lệ. Nội dung phải có từ 1 đến 2000 ký tự.",
    429: "Bạn gửi quá nhanh. Hãy chờ một chút rồi thử lại.",
    503: "Service chưa sẵn sàng nhận yêu cầu. Hãy kiểm tra Redis hoặc trạng thái triển khai.",
  };
  if (known[status]) return known[status];
  if (status >= 500) return "Endpoint /chat chưa sẵn sàng. Nếu bạn mới làm CP1–CP2, hãy hoàn thiện CP3 trước khi chat.";
  return body?.detail || `Yêu cầu thất bại với mã HTTP ${status}.`;
}

async function submitMessage(message) {
  const token = tokenInput.value.trim();
  const clientId = clientInput.value.trim() || "anonymous";

  sessionStorage.setItem("orbit-api-token", token);
  sessionStorage.setItem("orbit-client-id", clientId);
  addMessage("user", message);

  const pending = addMessage("assistant", "Đang suy nghĩ");
  pending.classList.add("loading");
  sendButton.disabled = true;

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-Client-Id": clientId,
      },
      body: JSON.stringify({ message }),
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : null;
    pending.remove();

    if (!response.ok) {
      addMessage("error", errorMessage(response.status, body), `HTTP ${response.status}`);
      return;
    }

    const usage = body.usage || {};
    const meta = `${body.turns_before ?? 0} lượt trước · ${usage.prompt ?? 0} prompt / ${usage.completion ?? 0} completion · $${Number(body.usd_cost || 0).toFixed(8)}`;
    addMessage("assistant", body.reply, meta);
  } catch {
    pending.remove();
    addMessage("error", "Không thể kết nối đến service. Hãy kiểm tra Uvicorn hoặc Docker Compose đang chạy.");
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || sendButton.disabled) return;
  input.value = "";
  resizeComposer();
  submitMessage(message);
});

input.addEventListener("input", resizeComposer);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

tokenInput.addEventListener("input", () => sessionStorage.setItem("orbit-api-token", tokenInput.value));
clientInput.addEventListener("input", () => sessionStorage.setItem("orbit-client-id", clientInput.value));

$("#toggle-token").addEventListener("click", () => {
  tokenInput.type = tokenInput.type === "password" ? "text" : "password";
});

$("#clear-chat").addEventListener("click", () => {
  messages.replaceChildren();
  welcome.hidden = false;
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt;
    resizeComposer();
    input.focus();
  });
});

resizeComposer();
checkHealth();
setInterval(checkHealth, 20000);
