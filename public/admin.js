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
  const magicLinkBtn = document.getElementById("adminMagicLinkBtn");
  const changePasswordForm = document.getElementById("adminChangePasswordForm");
  const passwordSuccess = document.getElementById("adminPasswordSuccess");
  const passwordError = document.getElementById("adminPasswordError");
  const exportCsvBtn = document.getElementById("adminExportCsvBtn");
  const printQueueBtn = document.getElementById("adminPrintQueueBtn");
  const queueInsightsEl = document.getElementById("adminQueueInsights");
  const searchInput = document.getElementById("adminSearchInput");
  const statusFilterEl = document.getElementById("adminStatusFilter");
  const typeFilterEl = document.getElementById("adminTypeFilter");
  const clearFiltersBtn = document.getElementById("adminClearFiltersBtn");
  const visibleCountEl = document.getElementById("adminVisibleCount");
  const taskForm = document.getElementById("adminTaskForm");
  const tasksEl = document.getElementById("adminTasks");
  const refreshTasksBtn = document.getElementById("adminRefreshTasksBtn");
  const exportTasksBtn = document.getElementById("adminExportTasksBtn");
  const requestModal = document.getElementById("adminRequestModal");
  const modalTitle = document.getElementById("adminModalTitle");
  const modalBody = document.getElementById("adminModalBody");
  const modalCloseBtn = document.getElementById("adminModalCloseBtn");
  const modalExportBtn = document.getElementById("adminModalExportBtn");
  const modalPrintBtn = document.getElementById("adminModalPrintBtn");
  const modalPdfBtn = document.getElementById("adminModalPdfBtn");

  if (!loginForm || !requestsEl || !adminPanel) {
    return;
  }

  const emailInput = document.getElementById("adminEmail");
  if (emailInput && defaultAdminEmail) {
    emailInput.value = defaultAdminEmail;
  }

  const STATUS_OPTIONS = ["new", "in_review", "resolved", "archived"];
  const TASK_STATUS_OPTIONS = ["open", "in_progress", "blocked", "done"];
  const ACCESS_TOKEN_KEY = "lrny_admin_access_token";
  const TEMP_ADMIN_SESSION_KEY = "lrny_admin_temp_session";
  let intakeTableMissing = false;
  let intakeSetupReason = "";
  let taskTableMissing = false;
  let taskSetupReason = "";
  let activeRequestId = null;
  let currentRows = [];
  let filteredRows = [];
  let currentTasks = [];
  const requestLookup = {};
  const taskLookup = {};

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
    if (!baseUrl || !anonKey) {
      return false;
    }
    if (anonKey === "YOUR_SUPABASE_ANON_KEY") {
      return false;
    }
    if (/^\*+$/.test(anonKey) || anonKey.toLowerCase().indexOf("placeholder") >= 0) {
      return false;
    }
    return anonKey.indexOf("sb_publishable_") === 0 || anonKey.indexOf("eyJ") === 0;
  }

  function getAdminRedirectUrl() {
    return window.location.origin + "/admin";
  }

  function readAccessTokenFromUrlHash() {
    const hash = String(window.location.hash || "");
    if (!hash || hash.length < 2) {
      return "";
    }
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    return String(params.get("access_token") || "").trim();
  }

  function clearAuthHashFromUrl() {
    if (!window.location.hash) {
      return;
    }
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }

  function renderTemporaryPanel() {
    adminPanel.style.display = "block";
    loginForm.style.display = "none";
    renderQueueInsights([], []);
    if (typeFilterEl) {
      typeFilterEl.innerHTML = "<option value=\"all\">All form types</option>";
    }
    if (visibleCountEl) {
      visibleCountEl.textContent = "Showing 0 of 0 requests";
    }
    requestsEl.innerHTML = "<article class=\"portal-card\"><h3 class=\"portal-title\">Temporary Admin Mode Active</h3><p>Admin login is active.</p><p>Live portal storage is not configured yet, so request data cannot be loaded in this mode.</p></article>";
    if (tasksEl) {
      tasksEl.innerHTML = "<article class=\"admin-task-card\"><h4>Operations board unavailable</h4><p>Enable live portal storage to use shared tasks.</p></article>";
    }
  }

  function escapeHtml(input) {
    return String(input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createSlug(input) {
    return String(input || "request")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function toHumanLabel(path) {
    return String(path || "field")
      .split(".")
      .map(function (part) {
        const withIndex = part.replace(/\[(\d+)\]/g, " $1");
        return withIndex
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/[_-]+/g, " ")
          .trim()
          .replace(/\b\w/g, function (char) {
            return char.toUpperCase();
          });
      })
      .join(" / ");
  }

  function flattenPayload(value, prefix, entries) {
    if (!entries) {
      return;
    }
    if (value === null || typeof value === "undefined") {
      entries.push({ key: prefix || "value", value: "N/A" });
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) {
        entries.push({ key: prefix || "value", value: "(empty)" });
        return;
      }
      value.forEach(function (item, index) {
        const arrayPath = (prefix ? prefix : "item") + "[" + (index + 1) + "]";
        flattenPayload(item, arrayPath, entries);
      });
      return;
    }
    if (typeof value === "object") {
      const keys = Object.keys(value);
      if (!keys.length) {
        entries.push({ key: prefix || "value", value: "{}" });
        return;
      }
      keys.forEach(function (key) {
        const objectPath = prefix ? prefix + "." + key : key;
        flattenPayload(value[key], objectPath, entries);
      });
      return;
    }
    entries.push({ key: prefix || "value", value: String(value) });
  }

  function getPayloadFields(payload) {
    const entries = [];
    flattenPayload(payload || {}, "", entries);
    return entries;
  }

  function isLinkLike(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
  }

  function looksLikeFileLink(value) {
    if (!isLinkLike(value)) {
      return false;
    }
    const text = String(value).toLowerCase();
    return /\.(pdf|doc|docx|xls|xlsx|csv|png|jpg|jpeg|gif|webp|txt|zip)(\?|#|$)/.test(text)
      || text.indexOf("/storage/") >= 0
      || text.indexOf("download") >= 0
      || text.indexOf("attachment") >= 0
      || text.indexOf("file") >= 0;
  }

  function getPayloadFileLinks(payload) {
    return getPayloadFields(payload).filter(function (entry) {
      return looksLikeFileLink(entry.value);
    });
  }

  function downloadFile(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = String(value === null || typeof value === "undefined" ? "" : value);
    return "\"" + text.replace(/"/g, "\"\"") + "\"";
  }

  function getRowById(id) {
    return requestLookup[String(id)] || null;
  }

  function getSelectedValue(el, fallback) {
    if (!el || typeof el.value !== "string") {
      return fallback;
    }
    return el.value.trim() || fallback;
  }

  function getRequestFilterState() {
    return {
      search: getSelectedValue(searchInput, "").toLowerCase(),
      status: getSelectedValue(statusFilterEl, "all"),
      formType: getSelectedValue(typeFilterEl, "all")
    };
  }

  function buildRowSearchBlob(row) {
    const fields = getPayloadFields(row.payload || {}).map(function (entry) {
      return entry.key + " " + entry.value;
    }).join(" ");
    return [
      row.id,
      row.form_type || "",
      row.status || "",
      row.contact_email || "",
      row.contact_phone || "",
      row.source_page || "",
      fields
    ].join(" ").toLowerCase();
  }

  function applyRequestFilters(rows) {
    const filters = getRequestFilterState();
    return rows.filter(function (row) {
      if (filters.status !== "all" && String(row.status || "new") !== filters.status) {
        return false;
      }
      if (filters.formType !== "all" && String(row.form_type || "general_request") !== filters.formType) {
        return false;
      }
      if (filters.search) {
        return buildRowSearchBlob(row).indexOf(filters.search) >= 0;
      }
      return true;
    });
  }

  function renderQueueInsights(allRows, visibleRows) {
    if (!queueInsightsEl) {
      return;
    }
    const statusCount = {
      total: allRows.length,
      visible: visibleRows.length,
      new: 0,
      in_review: 0,
      resolved: 0,
      archived: 0
    };
    allRows.forEach(function (row) {
      const key = String(row.status || "new");
      if (Object.prototype.hasOwnProperty.call(statusCount, key)) {
        statusCount[key] += 1;
      }
    });
    queueInsightsEl.innerHTML = ""
      + "<article class=\"admin-insight-card\"><p>Total Queue</p><strong>" + escapeHtml(statusCount.total) + "</strong></article>"
      + "<article class=\"admin-insight-card\"><p>Visible</p><strong>" + escapeHtml(statusCount.visible) + "</strong></article>"
      + "<article class=\"admin-insight-card\"><p>New</p><strong>" + escapeHtml(statusCount.new) + "</strong></article>"
      + "<article class=\"admin-insight-card\"><p>In Review</p><strong>" + escapeHtml(statusCount.in_review) + "</strong></article>"
      + "<article class=\"admin-insight-card\"><p>Resolved</p><strong>" + escapeHtml(statusCount.resolved) + "</strong></article>"
      + "<article class=\"admin-insight-card\"><p>Archived</p><strong>" + escapeHtml(statusCount.archived) + "</strong></article>";
    if (visibleCountEl) {
      visibleCountEl.textContent = "Showing " + statusCount.visible + " of " + statusCount.total + " requests";
    }
  }

  function refreshTypeFilterOptions(rows) {
    if (!typeFilterEl) {
      return;
    }
    const activeValue = getSelectedValue(typeFilterEl, "all");
    const options = Object.create(null);
    rows.forEach(function (row) {
      const value = String(row.form_type || "general_request");
      options[value] = true;
    });
    const keys = Object.keys(options).sort();
    typeFilterEl.innerHTML = "<option value=\"all\">All form types</option>"
      + keys.map(function (type) {
        return "<option value=\"" + escapeHtml(type) + "\">" + escapeHtml(toHumanLabel(type)) + "</option>";
      }).join("");
    typeFilterEl.value = (options[activeValue] || activeValue === "all") ? activeValue : "all";
  }

  function formatDate(raw) {
    if (!raw) {
      return "N/A";
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return "N/A";
    }
    return parsed.toLocaleString();
  }

  function requestFilename(row, extension) {
    const type = createSlug(row.form_type || "request");
    return "intake-" + type + "-" + row.id + "." + extension;
  }

  function renderRequestDetailsHtml(row) {
    const fields = getPayloadFields(row.payload);
    const fileLinks = getPayloadFileLinks(row.payload);
    const fieldHtml = fields.map(function (entry) {
      return ""
        + "<article class=\"admin-form-field\">"
        + "<p class=\"admin-form-label\">" + escapeHtml(toHumanLabel(entry.key)) + "</p>"
        + "<p class=\"admin-form-value\">" + escapeHtml(entry.value) + "</p>"
        + "</article>";
    }).join("");
    const fileLinksHtml = fileLinks.length
      ? "<section class=\"admin-form-view\"><h4>Uploaded Files</h4><div class=\"admin-form-grid\">"
        + fileLinks.map(function (entry) {
          const href = escapeHtml(entry.value);
          return "<article class=\"admin-form-field\"><p class=\"admin-form-label\">" + escapeHtml(toHumanLabel(entry.key))
            + "</p><p class=\"admin-form-value\"><a href=\"" + href + "\" target=\"_blank\" rel=\"noopener noreferrer\">Open file</a></p></article>";
        }).join("")
        + "</div></section>"
      : "";

    return ""
      + "<section class=\"admin-detail-meta\">"
      + "<article><span>Request ID</span><strong>#" + escapeHtml(row.id) + "</strong></article>"
      + "<article><span>Form Type</span><strong>" + escapeHtml(toHumanLabel(row.form_type || "general_request")) + "</strong></article>"
      + "<article><span>Status</span><strong>" + escapeHtml(row.status || "new") + "</strong></article>"
      + "<article><span>Received</span><strong>" + escapeHtml(formatDate(row.created_at)) + "</strong></article>"
      + "<article><span>Email</span><strong>" + escapeHtml(row.contact_email || "N/A") + "</strong></article>"
      + "<article><span>Phone</span><strong>" + escapeHtml(row.contact_phone || "N/A") + "</strong></article>"
      + "<article class=\"admin-detail-source\"><span>Source</span><strong>" + escapeHtml(row.source_page || "N/A") + "</strong></article>"
      + "</section>"
      + "<section class=\"admin-form-view\">"
      + "<h4>Submitted Form Fields</h4>"
      + "<div class=\"admin-form-grid\">"
      + fieldHtml
      + "</div>"
      + "</section>"
      + fileLinksHtml;
  }

  function openRequestModal(id) {
    if (!requestModal || !modalBody || !modalTitle) {
      return;
    }
    const row = getRowById(id);
    if (!row) {
      showError("Could not open request details.");
      return;
    }
    activeRequestId = String(id);
    modalTitle.textContent = "Request #" + row.id + " - " + toHumanLabel(row.form_type || "general_request");
    modalBody.innerHTML = renderRequestDetailsHtml(row);
    requestModal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeRequestModal() {
    if (!requestModal) {
      return;
    }
    requestModal.hidden = true;
    activeRequestId = null;
    document.body.classList.remove("admin-modal-open");
  }

  function exportRequestJson(id) {
    const row = getRowById(id);
    if (!row) {
      showError("Could not export request.");
      return;
    }
    downloadFile(requestFilename(row, "json"), "application/json;charset=utf-8", JSON.stringify(row, null, 2));
    showSuccess("Request exported.");
  }

  function buildQueueCsv(rows) {
    const header = [
      "id",
      "form_type",
      "status",
      "contact_email",
      "contact_phone",
      "source_page",
      "submitted_at",
      "created_at",
      "payload_json"
    ];
    const lines = [header.map(csvCell).join(",")];
    rows.forEach(function (row) {
      lines.push([
        row.id,
        row.form_type || "",
        row.status || "",
        row.contact_email || "",
        row.contact_phone || "",
        row.source_page || "",
        row.submitted_at || "",
        row.created_at || "",
        JSON.stringify(row.payload || {})
      ].map(csvCell).join(","));
    });
    return lines.join("\n");
  }

  function printDocument(title, subtitle, bodyHtml) {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!popup) {
      showError("Popup blocked. Allow popups to print or save as PDF.");
      return;
    }

    popup.document.write(
      "<!doctype html><html><head><meta charset=\"utf-8\"/>"
      + "<title>" + escapeHtml(title) + "</title>"
      + "<style>"
      + "body{font-family:Arial,sans-serif;margin:24px;color:#0b1c34;background:#f6f8fc;}h1{margin:0 0 4px;font-size:24px;}p.sub{margin:0 0 18px;color:#334155;}table{width:100%;border-collapse:collapse;margin-top:12px;background:#fff;}th,td{border:1px solid #d2d8e0;padding:8px;text-align:left;font-size:13px;vertical-align:top;}th{background:#eef4ff;}section{margin-bottom:18px;} .field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;} .field{border:1px solid #d2d8e0;border-radius:8px;padding:8px;background:#fff;} .field strong{display:block;font-size:12px;text-transform:uppercase;color:#475569;margin-bottom:6px;} .field span{display:block;white-space:pre-wrap;word-break:break-word;} .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;} .summary-card{background:#fff;border:1px solid #d2d8e0;border-radius:10px;padding:10px;} .summary-card p{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#475569;} .summary-card strong{font-size:20px;color:#0b1c34;}"
      + "@media print{button{display:none;}body{margin:10mm;}}"
      + "</style></head><body>"
      + "<h1>" + escapeHtml(title) + "</h1>"
      + "<p class=\"sub\">" + escapeHtml(subtitle) + "</p>"
      + bodyHtml
      + "</body></html>"
    );
    popup.document.close();
    popup.focus();
    window.setTimeout(function () {
      popup.print();
    }, 250);
  }

  function printSingleRequest(id, pdfMode) {
    const row = getRowById(id);
    if (!row) {
      showError("Could not print request.");
      return;
    }
    const fields = getPayloadFields(row.payload);
    const fieldsMarkup = fields.map(function (entry) {
      return "<article class=\"field\"><strong>" + escapeHtml(toHumanLabel(entry.key)) + "</strong><span>" + escapeHtml(entry.value) + "</span></article>";
    }).join("");

    const bodyHtml = ""
      + "<section><table><tbody>"
      + "<tr><th>Request ID</th><td>#" + escapeHtml(row.id) + "</td></tr>"
      + "<tr><th>Form Type</th><td>" + escapeHtml(toHumanLabel(row.form_type || "general_request")) + "</td></tr>"
      + "<tr><th>Status</th><td>" + escapeHtml(row.status || "new") + "</td></tr>"
      + "<tr><th>Email</th><td>" + escapeHtml(row.contact_email || "N/A") + "</td></tr>"
      + "<tr><th>Phone</th><td>" + escapeHtml(row.contact_phone || "N/A") + "</td></tr>"
      + "<tr><th>Source</th><td>" + escapeHtml(row.source_page || "N/A") + "</td></tr>"
      + "<tr><th>Received</th><td>" + escapeHtml(formatDate(row.created_at)) + "</td></tr>"
      + "</tbody></table></section>"
      + "<section><h2>Submitted Fields</h2><div class=\"field-grid\">" + fieldsMarkup + "</div></section>";

    const subtitle = pdfMode
      ? "Use Destination: Save as PDF in the print dialog."
      : "Print-friendly detail view.";
    printDocument("Intake Request #" + row.id, subtitle, bodyHtml);
  }

  function printQueueSummary() {
    const rowsToPrint = filteredRows.length ? filteredRows : currentRows;
    if (!rowsToPrint.length) {
      showError("No queue records available to print.");
      return;
    }
    const totals = {
      total: currentRows.length,
      visible: rowsToPrint.length,
      new: 0,
      in_review: 0,
      resolved: 0,
      archived: 0
    };
    currentRows.forEach(function (row) {
      const key = String(row.status || "new");
      if (Object.prototype.hasOwnProperty.call(totals, key)) {
        totals[key] += 1;
      }
    });
    const rowsHtml = rowsToPrint.map(function (row) {
      return ""
        + "<tr>"
        + "<td>#" + escapeHtml(row.id) + "</td>"
        + "<td>" + escapeHtml(toHumanLabel(row.form_type || "general_request")) + "</td>"
        + "<td>" + escapeHtml(row.status || "new") + "</td>"
        + "<td>" + escapeHtml(row.contact_email || "N/A") + "</td>"
        + "<td>" + escapeHtml(row.contact_phone || "N/A") + "</td>"
        + "<td>" + escapeHtml(row.source_page || "N/A") + "</td>"
        + "<td>" + escapeHtml(formatDate(row.created_at)) + "</td>"
        + "</tr>";
    }).join("");

    const bodyHtml = ""
      + "<section><div class=\"summary-grid\">"
      + "<article class=\"summary-card\"><p>Total Queue</p><strong>" + escapeHtml(totals.total) + "</strong></article>"
      + "<article class=\"summary-card\"><p>Visible in this report</p><strong>" + escapeHtml(totals.visible) + "</strong></article>"
      + "<article class=\"summary-card\"><p>New</p><strong>" + escapeHtml(totals.new) + "</strong></article>"
      + "<article class=\"summary-card\"><p>In Review</p><strong>" + escapeHtml(totals.in_review) + "</strong></article>"
      + "<article class=\"summary-card\"><p>Resolved</p><strong>" + escapeHtml(totals.resolved) + "</strong></article>"
      + "<article class=\"summary-card\"><p>Archived</p><strong>" + escapeHtml(totals.archived) + "</strong></article>"
      + "</div></section>"
      + "<section><table><thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Email</th><th>Phone</th><th>Source</th><th>Received</th></tr></thead>"
      + "<tbody>" + rowsHtml + "</tbody></table></section>";

    printDocument("Intake Queue Summary", "Filtered report generated from portal queue.", bodyHtml);
  }

  function renderRequests(rows) {
    requestsEl.innerHTML = "";
    currentRows = Array.isArray(rows) ? rows.slice() : [];
    Object.keys(requestLookup).forEach(function (key) {
      delete requestLookup[key];
    });
    if (intakeTableMissing) {
      filteredRows = [];
      renderQueueInsights([], []);
      if (typeFilterEl) {
        typeFilterEl.innerHTML = "<option value=\"all\">All form types</option>";
      }
      requestsEl.innerHTML = ""
        + "<article class=\"portal-card\">"
        + "<h3 class=\"portal-title\">Portal storage setup required</h3>"
        + "<p>You are signed in, but submissions cannot load yet.</p>"
        + "<p><strong>Detected issue:</strong> " + escapeHtml(intakeSetupReason || "Missing table or permission for submissions.") + "</p>"
        + "<p>Complete portal storage setup, then retry loading the queue.</p>"
        + "<div style=\"display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;\">"
        + "<button type=\"button\" id=\"adminRetryLoadBtn\" class=\"btn-secondary\">Retry Queue Load</button>"
        + "</div>"
        + "</article>"
        + "<article class=\"portal-card\">"
        + "<h3 class=\"portal-title\">Admin is active</h3>"
        + "<p>You are signed in. Queue data will appear here after setup is complete.</p>"
        + "</article>";
      return;
    }
    if (!rows.length) {
      filteredRows = [];
      renderQueueInsights([], []);
      if (typeFilterEl) {
        typeFilterEl.innerHTML = "<option value=\"all\">All form types</option>";
      }
      requestsEl.innerHTML = "<article class=\"portal-card\"><h3 class=\"portal-title\">No requests yet</h3><p>New requests will appear here.</p></article>";
      return;
    }
    currentRows.forEach(function (row) {
      requestLookup[String(row.id)] = row;
    });
    refreshTypeFilterOptions(currentRows);
    filteredRows = applyRequestFilters(currentRows);
    renderQueueInsights(currentRows, filteredRows);
    if (!filteredRows.length) {
      requestsEl.innerHTML = "<article class=\"portal-card\"><h3 class=\"portal-title\">No results for current filters</h3><p>Adjust search or filters to view requests.</p></article>";
      return;
    }
    filteredRows.forEach(function (row) {
      const card = document.createElement("article");
      card.className = "portal-card";
      const created = escapeHtml(row.created_at ? new Date(row.created_at).toLocaleString() : "N/A");
      const email = escapeHtml(row.contact_email || "N/A");
      const phone = escapeHtml(row.contact_phone || "N/A");
      const source = escapeHtml(row.source_page || "N/A");
      const type = escapeHtml(row.form_type || "general_request");
      const previewFields = getPayloadFields(row.payload || {}).slice(0, 4).map(function (entry) {
        return ""
          + "<article class=\"admin-form-field\">"
          + "<p class=\"admin-form-label\">" + escapeHtml(toHumanLabel(entry.key)) + "</p>"
          + "<p class=\"admin-form-value\">" + escapeHtml(entry.value) + "</p>"
          + "</article>";
      }).join("");
      const previewMarkup = previewFields
        ? "<div class=\"admin-form-view\"><h4>Form Preview</h4><div class=\"admin-form-grid\">" + previewFields + "</div></div>"
        : "<p style=\"margin-top:12px;\">No submitted fields.</p>";

      card.innerHTML = ""
        + "<h3 class=\"portal-title\">#" + row.id + " - " + type + "</h3>"
        + "<p><strong>Status:</strong> " + escapeHtml(row.status || "new") + "</p>"
        + "<p><strong>Email:</strong> " + email + "<br/><strong>Phone:</strong> " + phone + "</p>"
        + "<p><strong>Source:</strong> " + source + "</p>"
        + "<p><strong>Received:</strong> " + created + "</p>"
        + previewMarkup
        + "<div class=\"admin-request-actions\">"
        + "<button type=\"button\" class=\"btn-submit\" data-request-action=\"open\" data-request-id=\"" + row.id + "\">Open Full Form View</button>"
        + "<button type=\"button\" class=\"btn-secondary\" data-request-action=\"export\" data-request-id=\"" + row.id + "\">Export JSON</button>"
        + "<button type=\"button\" class=\"btn-secondary\" data-request-action=\"print\" data-request-id=\"" + row.id + "\">Print</button>"
        + "<button type=\"button\" class=\"btn-secondary\" data-request-action=\"pdf\" data-request-id=\"" + row.id + "\">Save PDF</button>"
        + "</div>"
        + "<label for=\"status-" + row.id + "\"><strong>Update status</strong></label>"
        + "<select id=\"status-" + row.id + "\" data-request-id=\"" + row.id + "\" class=\"admin-status-select\">"
        + STATUS_OPTIONS.map(function (status) {
          const selected = status === row.status ? " selected" : "";
          return "<option value=\"" + status + "\"" + selected + ">" + status.replace("_", " ") + "</option>";
        }).join("")
        + "</select>";
      requestsEl.appendChild(card);
    });
  }

  function rerenderFilteredQueue() {
    if (!currentRows.length) {
      renderQueueInsights([], []);
      if (requestsEl && !intakeTableMissing) {
        requestsEl.innerHTML = "<article class=\"portal-card\"><h3 class=\"portal-title\">No requests yet</h3><p>New requests will appear here.</p></article>";
      }
      return;
    }
    renderRequests(currentRows);
  }

  function fetchRequests(token) {
    return fetch(baseUrl + "/rest/v1/intake_requests?select=id,form_type,source_page,contact_email,contact_phone,payload,submitted_at,status,created_at&order=created_at.desc&limit=200", {
      method: "GET",
      headers: authHeaders(token)
    }).then(function (response) {
      return response.text().then(function (bodyText) {
        let body = null;
        if (bodyText) {
          try {
            body = JSON.parse(bodyText);
          } catch (_error) {
            body = null;
          }
        }
        if (!response.ok) {
          if (body && body.code === "PGRST205") {
            intakeTableMissing = true;
            intakeSetupReason = "The submissions table is missing.";
            return [];
          }
          if (body && body.code === "42501") {
            intakeTableMissing = true;
            intakeSetupReason = "Permissions are incomplete for submissions.";
            return [];
          }
          throw new Error((body && body.message) || "Unable to load requests");
        }
        intakeTableMissing = false;
        intakeSetupReason = "";
        return body || [];
      });
    });
  }

  function patchStatus(token, id, status) {
    if (intakeTableMissing) {
      return Promise.reject(new Error("Portal data storage is not initialized yet."));
    }
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

  function renderTasks(tasks) {
    if (!tasksEl) {
      return;
    }
    tasksEl.innerHTML = "";
    currentTasks = Array.isArray(tasks) ? tasks.slice() : [];
    Object.keys(taskLookup).forEach(function (key) {
      delete taskLookup[key];
    });
    if (taskTableMissing) {
      tasksEl.innerHTML = ""
        + "<article class=\"admin-task-card\">"
        + "<h4>To-Do board setup required</h4>"
        + "<p>The operations board is almost ready but the tasks table is not available yet.</p>"
        + "<p><strong>Detected issue:</strong> " + escapeHtml(taskSetupReason || "Portal tasks data store is missing.") + "</p>"
        + "</article>";
      return;
    }
    if (!tasks.length) {
      tasksEl.innerHTML = "<article class=\"admin-task-card\"><h4>No tasks yet</h4><p>Create your first to-do item above.</p></article>";
      return;
    }
    tasks.forEach(function (task) {
      taskLookup[String(task.id)] = task;
      const card = document.createElement("article");
      card.className = "admin-task-card";
      const dueDate = task.due_date ? escapeHtml(task.due_date) : "No due date";
      const owner = task.owner ? escapeHtml(task.owner) : "Unassigned";
      const notes = task.notes ? escapeHtml(task.notes) : "";
      card.innerHTML = ""
        + "<div class=\"admin-task-head\">"
        + "<h4>#"+ escapeHtml(task.id) + " - " + escapeHtml(task.title || "Untitled task") + "</h4>"
        + "<strong>" + escapeHtml((task.status || "open").replace("_", " ")) + "</strong>"
        + "</div>"
        + "<p class=\"admin-task-meta\"><strong>Owner:</strong> " + owner + " | <strong>Due:</strong> " + dueDate + "</p>"
        + (notes ? "<p class=\"admin-task-notes\">" + notes + "</p>" : "")
        + "<div class=\"admin-task-actions\">"
        + "<select data-task-id=\"" + escapeHtml(task.id) + "\" class=\"admin-task-status-select\">"
        + TASK_STATUS_OPTIONS.map(function (status) {
          const selected = status === task.status ? " selected" : "";
          return "<option value=\"" + status + "\"" + selected + ">" + status.replace("_", " ") + "</option>";
        }).join("")
        + "</select>"
        + "<button type=\"button\" class=\"btn-secondary\" data-task-action=\"save\" data-task-id=\"" + escapeHtml(task.id) + "\">Save Status</button>"
        + "</div>";
      tasksEl.appendChild(card);
    });
  }

  function fetchTasks(token) {
    return fetch(baseUrl + "/rest/v1/portal_tasks?select=id,title,owner,due_date,notes,status,created_at,updated_at&order=created_at.desc&limit=300", {
      method: "GET",
      headers: authHeaders(token)
    }).then(function (response) {
      return response.text().then(function (bodyText) {
        let body = null;
        if (bodyText) {
          try {
            body = JSON.parse(bodyText);
          } catch (_error) {
            body = null;
          }
        }
        if (!response.ok) {
          if (body && body.code === "PGRST205") {
            taskTableMissing = true;
            taskSetupReason = "The portal_tasks table is missing.";
            return [];
          }
          if (body && body.code === "42501") {
            taskTableMissing = true;
            taskSetupReason = "Portal tasks policies or grants are missing.";
            return [];
          }
          throw new Error((body && body.message) || "Unable to load tasks");
        }
        taskTableMissing = false;
        taskSetupReason = "";
        return Array.isArray(body) ? body : [];
      });
    });
  }

  function createTask(token, payload) {
    if (taskTableMissing) {
      return Promise.reject(new Error("Portal task storage is not initialized."));
    }
    return fetch(baseUrl + "/rest/v1/portal_tasks", {
      method: "POST",
      headers: Object.assign({}, authHeaders(token), {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }),
      body: JSON.stringify([payload])
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Could not create task");
      }
      return response.json();
    });
  }

  function patchTaskStatus(token, id, status) {
    if (taskTableMissing) {
      return Promise.reject(new Error("Portal task storage is not initialized."));
    }
    return fetch(baseUrl + "/rest/v1/portal_tasks?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: Object.assign({}, authHeaders(token), {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }),
      body: JSON.stringify({
        status: status,
        updated_at: new Date().toISOString()
      })
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Could not update task");
      }
      return response.json();
    });
  }

  function buildTasksCsv(rows) {
    const columns = [
      { header: "id", value: "id" },
      { header: "title", value: "title" },
      { header: "status", value: "status" },
      { header: "owner", value: "owner" },
      { header: "due_date", value: "due_date" },
      { header: "notes", value: "notes" },
      { header: "created_at", value: "created_at" },
      { header: "updated_at", value: "updated_at" }
    ];
    const lines = [columns.map(function (column) { return csvCell(column.header); }).join(",")];
    rows.forEach(function (row) {
      lines.push(columns.map(function (column) {
        return csvCell(row[column.value] || "");
      }).join(","));
    });
    return lines.join("\n");
  }

  function loadTasksPanel(token) {
    return fetchTasks(token)
      .then(function (tasks) {
        renderTasks(tasks);
      })
      .catch(function (error) {
        showError(error.message || "Could not load operations tasks.");
      });
  }

  function loadPanel() {
    const tokenFromHash = readAccessTokenFromUrlHash();
    if (tokenFromHash) {
      setAccessToken(tokenFromHash);
      clearAuthHashFromUrl();
    }
    if (!hasSupabaseRuntime()) {
      if (window.sessionStorage.getItem(TEMP_ADMIN_SESSION_KEY) === "1") {
        clearError();
        renderTemporaryPanel();
      } else {
        showError("Portal data configuration is incomplete in intake-config.js. Add a real publishable/anon key to enable live admin login.");
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
        return loadTasksPanel(token);
      })
      .catch(function () {
        setAccessToken("");
        intakeTableMissing = false;
        intakeSetupReason = "";
        loginForm.style.display = "block";
        adminPanel.style.display = "none";
      });
  }

  function retryQueueLoad() {
    const token = getAccessToken();
    if (!token) {
      showError("Please sign in again.");
      return;
    }
    clearError();
    fetchRequests(token)
      .then(function (rows) {
        renderRequests(rows);
        loadTasksPanel(token);
        if (!intakeTableMissing) {
          showSuccess("Queue loaded.");
        }
      })
      .catch(function (error) {
        showError(error.message || "Could not load queue.");
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
        return loadTasksPanel(getAccessToken());
      })
      .then(function () {
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
      if (!hasSupabaseRuntime()) {
        showError("Portal runtime is not configured. Add a real publishable/anon key first.");
        return;
      }
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

  if (magicLinkBtn) {
    magicLinkBtn.addEventListener("click", function () {
      clearError();
      clearSuccess();
      if (!hasSupabaseRuntime()) {
        showError("Portal runtime is not configured. Add a real publishable/anon key first.");
        return;
      }
      const email = String((emailInput && emailInput.value) || defaultAdminEmail || "").trim();
      if (!email) {
        showError("Enter your admin email first.");
        return;
      }
      fetch(baseUrl + "/auth/v1/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey
        },
        body: JSON.stringify({
          email: email,
          create_user: true,
          should_create_user: true,
          email_redirect_to: getAdminRedirectUrl()
        })
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Could not send magic login link.");
          }
          showSuccess("Magic login link sent. Open it from your email to sign in instantly.");
        })
        .catch(function (error) {
          showError(error.message || "Could not send magic login link.");
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
      showError("Status update failed. Please retry after portal storage setup is complete.");
    });
  });

  requestsEl.addEventListener("click", function (event) {
    const target = event.target;
    if (!target || !(target instanceof Element)) {
      return;
    }
    if (target.id === "adminRetryLoadBtn") {
      retryQueueLoad();
      return;
    }
    const actionBtn = target.closest("[data-request-action]");
    if (!actionBtn) {
      return;
    }
    const action = actionBtn.getAttribute("data-request-action");
    const id = actionBtn.getAttribute("data-request-id");
    if (!id) {
      return;
    }
    if (action === "open") {
      openRequestModal(id);
      return;
    }
    if (action === "export") {
      exportRequestJson(id);
      return;
    }
    if (action === "print") {
      printSingleRequest(id, false);
      return;
    }
    if (action === "pdf") {
      printSingleRequest(id, true);
    }
  });

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", function () {
      const rowsToExport = filteredRows.length ? filteredRows : currentRows;
      if (!rowsToExport.length) {
        showError("No records available to export.");
        return;
      }
      downloadFile("intake-queue.csv", "text/csv;charset=utf-8", buildQueueCsv(rowsToExport));
      showSuccess("Queue exported.");
    });
  }

  if (printQueueBtn) {
    printQueueBtn.addEventListener("click", function () {
      printQueueSummary();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      rerenderFilteredQueue();
    });
  }

  if (statusFilterEl) {
    statusFilterEl.addEventListener("change", function () {
      rerenderFilteredQueue();
    });
  }

  if (typeFilterEl) {
    typeFilterEl.addEventListener("change", function () {
      rerenderFilteredQueue();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", function () {
      if (searchInput) {
        searchInput.value = "";
      }
      if (statusFilterEl) {
        statusFilterEl.value = "all";
      }
      if (typeFilterEl) {
        typeFilterEl.value = "all";
      }
      rerenderFilteredQueue();
      showSuccess("Queue filters cleared.");
    });
  }

  if (taskForm) {
    taskForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const token = getAccessToken();
      if (!token) {
        showError("Please sign in first.");
        return;
      }
      const formData = new FormData(taskForm);
      const title = String(formData.get("title") || "").trim();
      const owner = String(formData.get("owner") || "").trim();
      const dueDate = String(formData.get("due_date") || "").trim();
      const notes = String(formData.get("notes") || "").trim();
      if (!title) {
        showError("Task title is required.");
        return;
      }
      createTask(token, {
        title: title,
        owner: owner || null,
        due_date: dueDate || null,
        notes: notes || null,
        status: "open",
        updated_at: new Date().toISOString()
      })
        .then(function () {
          taskForm.reset();
          return loadTasksPanel(token);
        })
        .then(function () {
          showSuccess("Task added.");
        })
        .catch(function (error) {
          showError(error.message || "Could not add task.");
        });
    });
  }

  if (refreshTasksBtn) {
    refreshTasksBtn.addEventListener("click", function () {
      const token = getAccessToken();
      if (!token) {
        showError("Please sign in first.");
        return;
      }
      loadTasksPanel(token);
    });
  }

  if (exportTasksBtn) {
    exportTasksBtn.addEventListener("click", function () {
      if (!currentTasks.length) {
        showError("No tasks available to export.");
        return;
      }
      downloadFile("operations-tasks.csv", "text/csv;charset=utf-8", buildTasksCsv(currentTasks));
      showSuccess("Tasks exported.");
    });
  }

  if (tasksEl) {
    tasksEl.addEventListener("click", function (event) {
      const target = event.target;
      if (!target || !(target instanceof Element)) {
        return;
      }
      const actionBtn = target.closest("[data-task-action]");
      if (!actionBtn) {
        return;
      }
      const action = actionBtn.getAttribute("data-task-action");
      const taskId = actionBtn.getAttribute("data-task-id");
      if (action !== "save" || !taskId) {
        return;
      }
      const token = getAccessToken();
      if (!token) {
        showError("Please sign in first.");
        return;
      }
      const statusSelect = tasksEl.querySelector(".admin-task-status-select[data-task-id=\"" + String(taskId).replace(/"/g, "") + "\"]");
      if (!statusSelect) {
        showError("Task status control not found.");
        return;
      }
      const status = String(statusSelect.value || "").trim();
      if (TASK_STATUS_OPTIONS.indexOf(status) === -1) {
        showError("Invalid task status.");
        return;
      }
      patchTaskStatus(token, taskId, status)
        .then(function () {
          return loadTasksPanel(token);
        })
        .then(function () {
          showSuccess("Task updated.");
        })
        .catch(function (error) {
          showError(error.message || "Could not update task.");
        });
    });
  }

  if (requestModal) {
    requestModal.addEventListener("click", function (event) {
      const target = event.target;
      if (!target || !(target instanceof Element)) {
        return;
      }
      if (target.hasAttribute("data-modal-close")) {
        closeRequestModal();
      }
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", function () {
      closeRequestModal();
    });
  }

  if (modalExportBtn) {
    modalExportBtn.addEventListener("click", function () {
      if (!activeRequestId) {
        showError("Open a request first.");
        return;
      }
      exportRequestJson(activeRequestId);
    });
  }

  if (modalPrintBtn) {
    modalPrintBtn.addEventListener("click", function () {
      if (!activeRequestId) {
        showError("Open a request first.");
        return;
      }
      printSingleRequest(activeRequestId, false);
    });
  }

  if (modalPdfBtn) {
    modalPdfBtn.addEventListener("click", function () {
      if (!activeRequestId) {
        showError("Open a request first.");
        return;
      }
      printSingleRequest(activeRequestId, true);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && requestModal && !requestModal.hidden) {
      closeRequestModal();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      setAccessToken("");
      window.sessionStorage.removeItem(TEMP_ADMIN_SESSION_KEY);
      adminPanel.style.display = "none";
      loginForm.style.display = "block";
      closeRequestModal();
      if (tasksEl) {
        tasksEl.innerHTML = "";
      }
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
