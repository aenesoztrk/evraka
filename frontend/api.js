(() => {
  const storageKey = "evraqa_session";
  const baseUrl = window.EVRAQA_API_URL || "/api";

  function getSession() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || null; } catch { return null; }
  }

  function setSession(session) {
    if (session) localStorage.setItem(storageKey, JSON.stringify(session));
    else localStorage.removeItem(storageKey);
  }

  async function request(path, options = {}) {
    if (window.location.protocol === "file:") {
      throw new Error("Site dosyadan açılamaz. Önce npm run dev komutunu çalıştırın, ardından http://localhost:4000 adresini açın.");
    }
    const session = getSession();
    const headers = new Headers(options.headers || {});
    if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    } catch {
      throw new Error("Backend sunucusuna ulaşılamadı. Terminalde npm run dev komutunun çalıştığını ve veritabanı bağlantısının hazır olduğunu kontrol edin.");
    }
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.blob();
    if (!response.ok) {
      const error = new Error(payload?.message || `İstek başarısız (${response.status}).`);
      error.status = response.status;
      error.details = payload?.details;
      if ([401, 403].includes(response.status)) {
        setSession(null);
        window.dispatchEvent(new CustomEvent("evraqa:unauthorized", { detail: { status: response.status, message: error.message } }));
      }
      throw error;
    }
    return payload;
  }

  const json = (method, body) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

  window.EvraqaApi = {
    getSession,
    setSession,
    login: (identifier, password) => request("/auth/login", json("POST", { identifier, password })),
    register: (data) => request("/auth/register", json("POST", data)),
    me: () => request("/auth/me"),
    updatePhone: (data) => request("/auth/profile/phone", json("PATCH", data)),
    logout: () => request("/auth/logout", { method: "POST" }),
    createApplication: (data) => request("/applications", json("POST", data)),
    myApplications: () => request("/applications/mine"),
    getApplication: (id) => request(`/applications/${id}`),
    updateManual: (id, manualData) => request(`/applications/${id}/manual`, json("PATCH", { manualData })),
    uploadDocument: (id, file, stage = "final") => {
      const form = new FormData();
      form.append("document", file);
      form.append("stage", stage);
      return request(`/applications/${id}/document`, { method: "POST", body: form });
    },
    updateSchedule: (id, data) => request(`/applications/${id}/schedule`, json("PATCH", data)),
    saveGoogleForm: (id, data) => request(`/applications/${id}/google-form`, json("PUT", data)),
    adminStats: () => request("/admin/stats"),
    adminReports: () => request("/admin/reports"),
    datasetHistory: () => request("/admin/datasets"),
    deleteDatasetBatch: (batch) => request(`/admin/datasets/${encodeURIComponent(batch)}`, { method: "DELETE" }),
    datasetRecords: (batch) => request(`/admin/datasets/${encodeURIComponent(batch)}/records`),
    datasetRecordFile: (id, inline = true) => request(`/admin/dataset-records/${encodeURIComponent(id)}/file${inline ? "?inline=1" : ""}`),
    applicationDocument: (id, inline = true) => request(`/applications/${encodeURIComponent(id)}/document${inline ? "?inline=1" : ""}`),
    adminApplications: (query = "") => request(`/admin/applications${query ? `?${query}` : ""}`),
    uploadDataset: (files) => {
      const form = new FormData();
      for (const file of files) form.append("dataset", file);
      return request("/admin/dataset", { method: "POST", body: form });
    },
    completeApplication: (id, force = false) => request(`/admin/applications/${id}/complete`, json("POST", { force })),
    deleteApplication: (id) => request(`/admin/applications/${id}`, { method: "DELETE" }),
    exportApplications: () => request("/admin/applications/export.csv"),
    ek17Url: (id) => `${baseUrl}/admin/applications/${id}/ek17`,
    request,
  };
})();
