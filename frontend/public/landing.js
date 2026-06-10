const PRO_WAITLIST_KEY = "bodymod:pro-waitlist:v1";

function readWaitlist() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRO_WAITLIST_KEY) || "{}");
    return Array.isArray(parsed.signups) ? parsed.signups : [];
  } catch {
    return [];
  }
}

function writeWaitlist(signups) {
  window.localStorage.setItem(
    PRO_WAITLIST_KEY,
    JSON.stringify({
      version: 1,
      signups
    })
  );
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `landing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveSignup(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email for the Pro waitlist.");
  }

  const signups = readWaitlist();
  const existing = signups.find((signup) => signup.email === normalizedEmail);

  if (existing) {
    return {
      ...existing,
      duplicate: true,
      count: signups.length
    };
  }

  const signup = {
    id: createId(),
    email: normalizedEmail,
    accountId: "",
    source: "landing-page",
    createdAt: new Date().toISOString()
  };

  writeWaitlist([signup, ...signups]);

  return {
    ...signup,
    count: signups.length + 1
  };
}

const form = document.querySelector(".waitlist-form");
const status = document.querySelector(".waitlist-status");

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const result = saveSignup(new FormData(form).get("email"));
    status.textContent = result.duplicate
      ? `Already on the local Pro waitlist. ${result.count} saved signup(s) on this browser.`
      : `Saved to the local Pro waitlist. ${result.count} saved signup(s) on this browser.`;
    form.reset();
  } catch (error) {
    status.textContent = error.message;
  }
});
