(function () {
  const cfg = window.LRNY_INTAKE_CONFIG || {};
  const baseUrl = (cfg.supabaseUrl || "").replace(/\/+$/, "");
  const anonKey = cfg.supabaseAnonKey || "";
  const defaultAdminEmail = cfg.adminEmail || "";

  const loginForm = document.getElementById("adminLoginForm");
  const loginError = document.getElementById("adminLoginError");
  const adminPanel = document.getElementById("adminPanel");
  const requestsEl = document.getElementById("adminRequests");
  const logoutBtn = document.getElementById("adminLogoutBtn");

  if (!loginForm || !requestsEl || !adminPanel) {
    return;
  }

  const emailInput = document.getElementById("adminEmail");
  if (emailInput && defaultAdminEmail) {
    emailInput.value = defaultAdminEmail;
  }

  const STATUS_OPTIONS = ["new", "in_review", "resolved", "archived"];
  const ACCESS_TOKEN_KEY = "lrny_admin_access_token";

  function showError(message) {
    if (!loginError) return;
    loginError.textContent = message;
    loginError.style.display = "block";
  }

  function clearError() {
    if (!loginError) return;
    loginError.style.display = "none";
  }

  function getAccessToken() {
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) || "";
  }

  function setAccessToken(token) {
    if (token) {
      window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  function authHeaders(token) {
    return {
      apikey: anonKey,
      Authorization: "Bearer " + token
    };
  }

  function escapeHtml(input) {
    return String(input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderRequests(rows) {
    requestsEl.innerHTML = "";
    if (!rows.length) {
      requestsEl.innerHTML = "<article class=\"portal-card\"><h3 class=\"portal-title\">No requests yet</h3><p>New requests will appear here.</p></article>";
      return;
    }
    rows.forEach(function (row) {
      const card = document.createElement("article");
      card.className = "portal-card";
      const created = escapeHtml(row.created_at ? new Date(row.created_at).toLocaleString() : "N/A");
      const email = escapeHtml(row.contact_email || "N/A");
      const phone = escapeHtml(row.contact_phone || "N/A");
      const source = escapeHtml(row.source_page || "N/A");
      const payload = escapeHtml(JSON.stringify(row.payload || {}, null, 2));
      const type = escapeHtml(row.form_type || "general_request");

      card.innerHTML = ""
        + "<h3 class=\"portal-title\">#" + row.id + " - " + type + "</h3>"
        + "<p><strong>Status:</strong> " + escapeHtml(row.status || "new") + "</p>"
        + "<p><strong>Email:</strong> " + email + "<br/><strong>Phone:</strong> " + phone + "</p>"
        + "<p><strong>Source:</strong> " + source + "</p>"
        + "<p><strong>Received:</strong> " + created + "</p>"
        + "<label for=\"status-" + row.id + "\"><strong>Update status</strong></label>"
        + "<select id=\"status-" + row.id + "\" data-request-id=\"" + row.id + "\" class=\"admin-status-select\">"
        + STATUS_OPTIONS.map(function (status) {
          const selected = status === row.status ? " selected" : "";
          return "<option value=\"" + status + "\"" + selected + ">" + status.replace("_", " ") + "</option>";
        }).join("")
        + "</select>"
        + "<details style=\"margin-top:12px;\"><summary>View fields</summary><pre>" + payload + "</pre></details>";
      requestsEl.appendChild(card);
    });
  }

  function fetchRequests(token) {
    return fetch(baseUrl + "/rest/v1/intake_requests?select=id,form_type,source_page,contact_email,contact_phone,payload,submitted_at,status,created_at&order=created_at.desc&limit=200", {
      method: "GET",
      headers: authHeaders(token)
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Unable to load requests");
      }
      return response.json();
    });
  }

  function patchStatus(token, id, status) {
    return fetch(baseUrl + "/rest/v1/intake_requests?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: Object.assign({}, authHeaders(token), {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }),
      body: JSON.stringify({ status: status })
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
      return response.json();
    });
  }

  function loadPanel() {
    if (!baseUrl || !anonKey || anonKey === "YOUR_SUPABASE_ANON_KEY") {
      showError("Admin dashboard is temporarily disabled until Supabase anon key is configured in /intake-config.js.");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      return;
    }
    fetchRequests(token)
      .then(function (rows) {
        loginForm.style.display = "none";
        adminPanel.style.display = "block";
        renderRequests(rows);
      })
      .catch(function () {
        setAccessToken("");
        loginForm.style.display = "block";
        adminPanel.style.display = "none";
      });
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearError();

    if (!baseUrl || !anonKey) {
      showError("Supabase intake config is missing. Update /intake-config.js first.");
      return;
    }

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    fetch(baseUrl + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey
      },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Invalid credentials");
        }
        return response.json();
      })
      .then(function (body) {
        if (!body.access_token) {
          throw new Error("Missing access token");
        }
        setAccessToken(body.access_token);
        return fetchRequests(body.access_token);
      })
      .then(function (rows) {
        loginForm.style.display = "none";
        adminPanel.style.display = "block";
        renderRequests(rows);
      })
      .catch(function (error) {
        showError(error.message || "Login failed.");
      });
  });

  requestsEl.addEventListener("change", function (event) {
    const target = event.target;
    if (!target || !target.classList || !target.classList.contains("admin-status-select")) {
      return;
    }
    const id = target.getAttribute("data-request-id");
    const status = target.value;
    const token = getAccessToken();
    if (!id || !token) {
      return;
    }
    patchStatus(token, id, status).catch(function () {
      showError("Status update failed. Please retry.");
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      setAccessToken("");
      adminPanel.style.display = "none";
      loginForm.style.display = "block";
      clearError();
    });
  }

  loadPanel();
})();
