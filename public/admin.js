(function () {
  const cfg = window.LRNY_INTAKE_CONFIG || {};
  const baseUrl = (cfg.supabaseUrl || "").replace(/\/+$/, "");
  const anonKey = cfg.supabaseAnonKey || "";
  const defaultAdminEmail = cfg.adminEmail || "";

  const loginForm = document.getElementById("adminLoginForm");
  const loginError = document.getElementById("adminLoginError");
  const loginSuccess = document.getElementById("adminLoginSuccess");
  const adminPanel = document.getElementById("adminPanel");
  const requestsEl = document.getElementById("adminRequests");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const resetPasswordBtn = document.getElementById("adminResetPasswordBtn");
  const changePasswordForm = document.getElementById("adminChangePasswordForm");
  const passwordSuccess = document.getElementById("adminPasswordSuccess");
  const passwordError = document.getElementById("adminPasswordError");

  if (!loginForm || !requestsEl || !adminPanel) {
    return;
  }

  const emailInput = document.getElementById("adminEmail");
  if (emailInput && defaultAdminEmail) {
    emailInput.value = defaultAdminEmail;
  }

  const STATUS_OPTIONS = ["new", "in_review", "resolved", "archived"];
  const ACCESS_TOKEN_KEY = "lrny_admin_access_token";
  const TEMP_ADMIN_SESSION_KEY = "lrny_admin_temp_session";

  function showError(message) {
    if (!loginError) return;
    loginError.textContent = message;
    loginError.style.display = "block";
    if (loginSuccess) {
      loginSuccess.style.display = "none";
    }
  }

  function clearError() {
    if (!loginError) return;
    loginError.style.display = "none";
  }

  function showSuccess(message) {
    if (!loginSuccess) return;
    loginSuccess.textContent = message;
    loginSuccess.style.display = "block";
  }

  function clearSuccess() {
    if (!loginSuccess) return;
    loginSuccess.style.display = "none";
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

  function hasSupabaseRuntime() {
    return Boolean(baseUrl && anonKey && anonKey !== "YOUR_SUPABASE_ANON_KEY");
  }

  function renderTemporaryPanel() {
    adminPanel.style.display = "block";
    loginForm.style.display = "none";
    requestsEl.innerHTML = "<article class=\"portal-card\"><h3 class=\"portal-title\">Temporary Admin Mode Active</h3><p>Admin login is active.</p><p>Current intake mode is email delivery. New requests are delivered to payroll@laborreadyny.xyz until Supabase anon key is configured.</p></article>";
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
    if (!hasSupabaseRuntime()) {
      if (window.sessionStorage.getItem(TEMP_ADMIN_SESSION_KEY) === "1") {
        clearError();
        renderTemporaryPanel();
      }
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
    clearSuccess();

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!hasSupabaseRuntime()) {
      if (email.toLowerCase() === String(defaultAdminEmail || "admin@laborreadyny.xyz").toLowerCase() && password.length >= 8) {
        window.sessionStorage.setItem(TEMP_ADMIN_SESSION_KEY, "1");
        clearError();
        renderTemporaryPanel();
      } else {
        showError("Use admin email and an 8+ character password to enter temporary admin mode.");
      }
      return;
    }

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
        showSuccess("Login successful.");
      })
      .catch(function (error) {
        showError(error.message || "Login failed.");
      });
  });

  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener("click", function () {
      clearError();
      clearSuccess();
      const email = String((emailInput && emailInput.value) || defaultAdminEmail || "").trim();
      if (!email) {
        showError("Enter your admin email first.");
        return;
      }
      fetch(baseUrl + "/auth/v1/recover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey
        },
        body: JSON.stringify({ email: email })
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Could not send reset email.");
          }
          showSuccess("Password reset email sent.");
        })
        .catch(function (error) {
          showError(error.message || "Could not send reset email.");
        });
    });
  }

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
      window.sessionStorage.removeItem(TEMP_ADMIN_SESSION_KEY);
      adminPanel.style.display = "none";
      loginForm.style.display = "block";
      clearError();
      clearSuccess();
    });
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (passwordSuccess) passwordSuccess.style.display = "none";
      if (passwordError) passwordError.style.display = "none";

      const token = getAccessToken();
      const formData = new FormData(changePasswordForm);
      const nextPassword = String(formData.get("new_password") || "").trim();
      if (!token) {
        if (passwordError) {
          passwordError.textContent = "Please sign in first.";
          passwordError.style.display = "block";
        }
        return;
      }
      if (nextPassword.length < 8) {
        if (passwordError) {
          passwordError.textContent = "Password must be at least 8 characters.";
          passwordError.style.display = "block";
        }
        return;
      }

      fetch(baseUrl + "/auth/v1/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({ password: nextPassword })
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Could not update password.");
          }
          changePasswordForm.reset();
          if (passwordSuccess) {
            passwordSuccess.textContent = "Password updated successfully.";
            passwordSuccess.style.display = "block";
          }
        })
        .catch(function (error) {
          if (passwordError) {
            passwordError.textContent = error.message || "Could not update password.";
            passwordError.style.display = "block";
          }
        });
    });
  }

  loadPanel();
})();
