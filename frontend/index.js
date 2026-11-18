const state = {
  role: "student",
  page: "overview",
  selectedFile: null,
  scheduleDays: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"],
  session: window.EvraqaApi.getSession(),
  application: null,
  adminApplications: [],
  ek17ApplicationId: null,
  datasetImport: null,
  datasetUploading: false,
};

const userProfiles = {
  student: {
    name: "Öğrenci",
    shortName: "Öğrenci",
    initials: "Ö",
    number: "—",
    roleLabel: "Öğrenci",
    panelLabel: "öğrenci paneli",
  },
  admin: {
    name: "Sistem Yöneticisi",
    shortName: "Yönetici",
    initials: "SY",
    number: "Sistem Yöneticisi",
    roleLabel: "Yönetici",
    panelLabel: "yönetici paneli",
  },
};

const navItems = {
  student: [
    { type: "title", label: "Ana Menü" },
    { id: "overview", label: "Genel Bakış", icon: "⌂" },
    { id: "manual", label: "Ek-16 Bilgi Formu", icon: "✎" },
    { id: "upload", label: "Evrak Yükle", icon: "⇧" },
    { id: "report", label: "Kontrol Raporu", icon: "✓" },
    { id: "schedule", label: "Staj Takvimi", icon: "□" },
    { type: "title", label: "Bağlantılar" },
    { id: "form", label: "Google Form", icon: "↗" },
    { id: "profile", label: "Profil Bilgileri", icon: "○" },
  ],
  admin: [
    { type: "title", label: "Yönetim" },
    { id: "overview", label: "Genel Bakış", icon: "⌂" },
    { id: "applications", label: "Tüm Başvurular", icon: "▤" },
    { id: "completed", label: "Tamamlananlar", icon: "✓" },
    { id: "dataset", label: "Veri Seti", icon: "⇧" },
    { type: "title", label: "Belgeler" },
    { id: "reports", label: "Raporlar", icon: "▥" },
    { id: "ek17", label: "Ek-17 Oluştur", icon: "+" },
    { id: "profile", label: "Yönetici Profili", icon: "○" },
  ],
};

const pageTitles = {
  overview: "Genel Bakış",
  manual: "Ek-16 Bilgi Formu",
  upload: "Evrak Yükle",
  report: "Kontrol Raporu",
  schedule: "Staj Takvimi",
  form: "Google Form Bağlantısı",
  profile: "Profil Bilgileri",
  applications: "Tüm Başvurular",
  completed: "Tamamlanan Başvurular",
  dataset: "Test Veri Seti",
  reports: "Başvuru Raporları",
  ek17: "Ek-17 Oluştur",
};

const marketingSite = document.querySelector("#marketing-site");
const appShell = document.querySelector("#app-shell");
const loginModal = document.querySelector("#login-modal");
const uploadModal = document.querySelector("#upload-modal");
const registerModal = document.querySelector("#register-modal");
const uploadModalOriginal = uploadModal.querySelector(".upload-action-modal").innerHTML;

const studentOverviewTemplate = () => {
  const application = state.application;
  const validation = application?.validationReport || [];
  const comparison = application?.comparisonReport || [];
  const successful = validation.filter(item => item.status === "success").length + comparison.filter(item => item.status === "match").length;
  const pending = validation.filter(item => item.status !== "success").length + comparison.filter(item => !["match", "missing-both"].includes(item.status)).length;
  const statusLabels = { draft: "Bilgi formu bekleniyor", uploaded: "Belge yüklendi", reviewing: "İnceleniyor", error: "Düzeltme gerekli", approved: "Onaylandı", completed: "Tamamlandı" };
  const documentName = application?.document?.originalName || "Henüz belge yüklenmedi";
  const documentDate = application?.updatedAt ? new Date(application.updatedAt).toLocaleDateString("tr-TR") : "—";
  const fileSize = application?.document?.size ? `${(application.document.size / 1024 / 1024).toFixed(1)} MB` : "—";
  const deadlineResult = validation.find(item => item.code === "ACADEMIC_DATE");
  const suggestedDeadline = deadlineResult?.details?.suggestedSubmissionDate ? new Date(deadlineResult.details.suggestedSubmissionDate).toLocaleDateString("tr-TR") : "Takvim bilgisi bekleniyor";
  return `
  <div class="dashboard-page-head">
    <div><h2>Günaydın, ${userProfiles.student.shortName} 👋</h2><p>Ek-16 başvurundaki son durumu ve yapman gerekenleri burada görebilirsin.</p></div>
    <div class="page-head-actions"><button class="dash-secondary" data-nav="report">Raporu görüntüle</button><button class="dash-primary" data-open-upload>＋ Yeni evrak yükle</button></div>
  </div>
  <div class="stats-row">
    <article class="stat-card"><div class="stat-top"><span class="stat-icon">▤</span><span class="stat-change neutral">${application ? "Aktif" : "Yeni"}</span></div><strong>${application ? 1 : 0}</strong><span>Toplam başvuru</span></article>
    <article class="stat-card"><div class="stat-top"><span class="stat-icon">✓</span><span class="stat-change">Kontrol</span></div><strong>${successful}</strong><span>Başarılı kontrol</span></article>
    <article class="stat-card"><div class="stat-top"><span class="stat-icon">!</span><span class="stat-change neutral">Aksiyon</span></div><strong>${pending}</strong><span>Bekleyen düzeltme</span></article>
    <article class="stat-card"><div class="stat-top"><span class="stat-icon">□</span><span class="stat-change neutral">Durum</span></div><strong>${application?.readiness ? "Hazır" : "—"}</strong><span>Teslim uygunluğu</span></article>
  </div>
  <div class="dashboard-grid">
    <div class="dashboard-main-column">
      <article class="panel-card welcome-card">
        <span class="welcome-kicker">${escapeHtml(application?.manualData?.student?.academicYear || "2026–2027 GÜZ DÖNEMİ")}</span>
        <h3>${application?.readiness ? "Belgen teslime hazır." : application ? "Başvurunu tamamlamaya devam et." : "Ek-16 başvurunu oluştur."}</h3>
        <p>${application ? `${statusLabels[application.status] || application.status}. ${pending ? `${pending} alan veya kural için işlem gerekiyor.` : "Mevcut kontrollerde bekleyen hata bulunmuyor."}` : "Önce Ek-16 bilgi formunu doldur, ardından belgeni yükleyerek doğrulama sürecini başlat."}</p>
        <button data-nav="${application ? "report" : "manual"}">${application ? "Kontrol sonuçlarını incele" : "Bilgi formunu doldur"} →</button>
        <div class="welcome-visual" aria-hidden="true"><div class="welcome-check">✓</div><div class="welcome-doc"><span></span><span></span><span></span><span></span></div></div>
      </article>
      <article class="panel-card" style="margin-top:18px">
        <div class="panel-card-head"><div><h3>Başvuru durumu</h3><p>Ek-16 belgenin süreçteki güncel konumu</p></div><button class="panel-link" data-nav="report">Tüm ayrıntılar →</button></div>
        <div class="status-flow">
          <div class="status-step ${application?.document ? "done" : "active"}"><i>${application?.document ? "✓" : "1"}</i><b>Yüklendi</b><span>${application?.document ? documentDate : "Belge bekleniyor"}</span></div>
          <div class="status-step ${application?.validationReport?.length ? "done" : ""}"><i>${application?.validationReport?.length ? "✓" : "2"}</i><b>İncelendi</b><span>${application?.validationReport?.length ? "Kontroller tamamlandı" : "Analiz bekleniyor"}</span></div>
          <div class="status-step ${application?.status === "error" ? "active" : application?.readiness ? "done" : ""}"><i>${application?.status === "error" ? "!" : application?.readiness ? "✓" : "3"}</i><b>${application?.status === "error" ? "Düzeltme gerekli" : "Onaylandı"}</b><span>${pending ? `${pending} sonuç bekliyor` : "Kontrol sonrası"}</span></div>
          <div class="status-step ${application?.status === "completed" ? "done" : ""}"><i>${application?.status === "completed" ? "✓" : "4"}</i><b>Tamamlandı</b><span>${application?.completedAt ? new Date(application.completedAt).toLocaleDateString("tr-TR") : "Admin onayı sonrası"}</span></div>
        </div>
      </article>
      <article class="panel-card" style="margin-top:18px">
        <div class="panel-card-head"><div><h3>Hızlı işlemler</h3><p>Sık kullanılan araçlar</p></div></div>
        <div class="quick-actions">
          <button class="quick-card" data-open-upload><i>⇧</i><b>Belgeyi yeniden yükle</b><span>Düzeltilmiş Ek-16 dosyanı gönder</span></button>
          <button class="quick-card" data-nav="schedule"><i>□</i><b>Staj günlerini düzenle</b><span>Haftalık programını güncelle</span></button>
          <button class="quick-card" data-nav="form"><i>↗</i><b>Form bağlantısı ekle</b><span>Google Form URL’sini doğrula</span></button>
          <button class="quick-card" data-nav="profile"><i>○</i><b>Bilgilerini kontrol et</b><span>Veri setindeki profilini görüntüle</span></button>
        </div>
      </article>
    </div>
    <div class="dashboard-side-column">
      <article class="panel-card">
        <div class="panel-card-head"><div><h3>Son yüklenen</h3><p>${documentDate}</p></div><button class="panel-link" data-nav="upload">Belge işlemleri</button></div>
        <div class="recent-file"><div class="file-icon">${escapeHtml(documentName.split(".").pop()?.toUpperCase() || "—")}</div><div><strong>${escapeHtml(documentName)}</strong><span>${fileSize}</span></div><span class="file-status">${escapeHtml(statusLabels[application?.status] || "Bekliyor")}</span></div>
      </article>
      <article class="panel-card" style="margin-top:18px">
        <div class="panel-card-head"><div><h3>Staj teslim takvimi</h3><p>Başlangıçtan en az 30 gün önce</p></div><button class="panel-link" data-nav="schedule">Takvim →</button></div>
        <div class="info-list"><div class="info-item"><i>1</i><div><b>Staj başlangıcı</b><span>${application?.internshipStart ? new Date(application.internshipStart).toLocaleDateString("tr-TR") : "Tarih seçilmedi"}</span></div></div><div class="info-item"><i>2</i><div><b>Hesaplanan çalışma günü</b><span>${application?.calculatedInternshipDays ?? "Takvim bekleniyor"}</span></div></div></div>
        <div class="deadline-summary"><i></i><div><b>Önerilen son teslim: ${suggestedDeadline}</b><span>Doğrulama raporundan hesaplanır</span></div></div>
      </article>
    </div>
  </div>`;
};

const studentUploadTemplate = () => `
  <div class="dashboard-page-head"><div><h2>Ek-16 belgeni yükle</h2><p>Dosyanı yüklemeden önce kabul edilen biçimleri ve kontrolleri inceleyebilirsin.</p></div><div class="page-head-actions"><button class="dash-secondary" data-nav="report">Yükleme geçmişi</button></div></div>
  <div class="upload-page-grid">
    <article class="panel-card upload-panel">
      <div class="panel-card-head"><div><h3>Belge seçimi</h3><p>Tek seferde bir Ek-16 belgesi yüklenebilir.</p></div></div>
      <button class="upload-page-zone" data-open-upload>
        <div><div class="big-upload-icon">⇧</div><h3>Dosyayı sürükleyip bırak</h3><p>veya bilgisayarından dosya seç</p><span>Dosya seç</span></div>
      </button>
    </article>
    <div>
      <article class="panel-card">
        <div class="panel-card-head"><div><h3>Yükleme koşulları</h3><p>Analiz öncesi hızlı kontrol listesi</p></div></div>
        <div class="info-list">
          <div class="info-item"><i>1</i><div><b>Desteklenen formatlar</b><span>PDF, DOC, DOCX, JPEG ve PNG.</span></div></div>
          <div class="info-item"><i>2</i><div><b>Dosya boyutu</b><span>En fazla 10 MB olmalıdır.</span></div></div>
          <div class="info-item"><i>3</i><div><b>Okunabilirlik</b><span>Belgenin tüm köşeleri görünür ve net olmalıdır.</span></div></div>
          <div class="info-item"><i>4</i><div><b>Yalnızca Ek-16</b><span>Diğer evrak türleri kapsam dışıdır.</span></div></div>
        </div>
      </article>
      <article class="panel-card" style="margin-top:18px"><div class="panel-card-head"><div><h3>Son dosya</h3><p>${state.application?.updatedAt ? new Date(state.application.updatedAt).toLocaleString("tr-TR") : "Henüz yükleme yok"}</p></div></div><div class="recent-file"><div class="file-icon">${escapeHtml(state.application?.document?.originalName?.split(".").pop()?.toUpperCase() || "—")}</div><div><strong>${escapeHtml(state.application?.document?.originalName || "Belge yüklenmedi")}</strong><span>${state.application?.document?.size ? `${(state.application.document.size / 1024 / 1024).toFixed(1)} MB` : "Bilgi formunu kaydedip belgenizi yükleyin"}</span></div><span class="file-status">${escapeHtml(state.application?.status || "Bekliyor")}</span></div></article>
    </div>
  </div>`;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function nestedValue(path, fallback = "") {
  const value = nestedRawValue(path, fallback);
  return escapeHtml(value ?? fallback);
}

function nestedRawValue(path, fallback = "") {
  return path.split(".").reduce((current, key) => current?.[key], state.application?.manualData || {}) ?? fallback;
}

const phoneCountries = [
  ["90", "TR +90"], ["49", "DE +49"], ["44", "UK +44"], ["1", "US/CA +1"],
  ["33", "FR +33"], ["31", "NL +31"], ["32", "BE +32"],
];

function splitPhone(value = "", fallbackCode = "90") {
  const digits = String(value || "").replace(/\D/g, "").replace(/^00/, "");
  const matchedCode = [...phoneCountries].sort((a, b) => b[0].length - a[0].length).find(([code]) => digits.startsWith(code));
  const countryCode = matchedCode?.[0] || fallbackCode;
  const localNumber = matchedCode ? digits.slice(countryCode.length) : digits.replace(/^0+/, "");
  return { countryCode, localNumber };
}

function countryOptions(selectedCode = "90") {
  return phoneCountries.map(([code, label]) => `<option value="${code}" ${code === selectedCode ? "selected" : ""}>${label}</option>`).join("");
}

function phoneControl(path, value, label = "Telefon") {
  const { countryCode, localNumber } = splitPhone(value);
  return `<label class="phone-field">${label}<div class="phone-input-group"><select class="form-control country-code" name="${path}CountryCode" aria-label="${label} ülke kodu">${countryOptions(countryCode)}</select><input class="form-control" name="${path}" inputmode="tel" placeholder="532 123 45 67" value="${escapeHtml(localNumber)}" required></div></label>`;
}

function booleanOptions(path, fallback = false) {
  const value = Boolean(nestedRawValue(path, fallback));
  return `<option value="false" ${!value ? "selected" : ""}>Hayır</option><option value="true" ${value ? "selected" : ""}>Evet</option>`;
}

const manualFormTemplate = () => `
  <div class="dashboard-page-head"><div><h2>Ek-16 bilgi formu</h2><p>Belgedeki bilgilerle karşılaştırılacak alanları eksiksiz gir. Bilgilerin başvuru kaydında güvenle saklanır.</p></div><div class="page-head-actions"><span class="api-state">Veri kaydı aktif</span><button class="dash-primary" form="manual-form" type="submit">Bilgileri kaydet</button></div></div>
  <form id="manual-form" class="manual-form">
    <section class="manual-section"><div class="manual-section-head"><i>01</i><div><h3>Öğrenci bilgileri</h3><p>Ek-16 belgesinin “Öğrencinin” bölümü</p></div></div><div class="manual-fields">
      <label>Ad soyad<input class="form-control" name="student.name" value="${nestedValue("student.name", state.session?.user?.name)}" required></label>
      <label>Öğrenci numarası<input class="form-control" name="student.studentNo" value="${nestedValue("student.studentNo", state.session?.user?.studentNo)}" required></label>
      <label>T.C. / yabancı kimlik no<input class="form-control" name="student.identityNo" value="${nestedValue("student.identityNo")}" minlength="11" maxlength="11" required></label>
      <label>Uyruk<input class="form-control" name="student.nationality" value="${nestedValue("student.nationality", "T.C.")}" required></label>
      <label>Bölüm<input class="form-control" name="student.department" value="${nestedValue("student.department", state.session?.user?.department)}" required></label>
      <label>Önceki staj gün sayısı<input class="form-control" name="student.previousInternshipDays" type="number" min="0" value="${nestedValue("student.previousInternshipDays", 0)}" required></label>
      <label>Doğum tarihi<input class="form-control" name="student.birthDate" type="date" value="${nestedValue("student.birthDate")}" required></label>
      <label>Öğretim yılı<input class="form-control" name="student.academicYear" placeholder="2026-2027 Güz" value="${nestedValue("student.academicYear", "2026-2027 Güz")}" required></label>
      <label>Sağlık yardım statüsü<select class="form-control" name="student.healthStatus" required>${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${String(n)===nestedValue("student.healthStatus")?"selected":""}>${n}. seçenek</option>`).join("")}</select></label>
      <label>E-posta<input class="form-control" name="student.email" type="email" value="${nestedValue("student.email", state.session?.user?.email)}" required></label>
      ${phoneControl("student.phone", nestedRawValue("student.phone", state.session?.user?.phone))}
      <label class="span-3">İkametgâh adresi<textarea class="form-control" name="student.address" rows="3" required>${nestedValue("student.address")}</textarea></label>
    </div></section>
    <section class="manual-section"><div class="manual-section-head"><i>02</i><div><h3>Staj yapılan yer</h3><p>Kurum, takvim ve çalışma bilgileri</p></div></div><div class="manual-fields">
      <label class="span-2">Kurum / işletme adı<input class="form-control" name="company.name" value="${nestedValue("company.name")}" required></label>
      <label>Yurtdışı stajı mı?<select class="form-control" name="company.abroad">${booleanOptions("company.abroad")}</select></label>
      <label>Hizmet alanı<input class="form-control" name="company.serviceArea" value="${nestedValue("company.serviceArea")}" required></label>
      <label>Başlangıç tarihi<input class="form-control" name="company.startDate" type="date" value="${nestedValue("company.startDate")}" required></label>
      <label>Bitiş tarihi<input class="form-control" name="company.endDate" type="date" value="${nestedValue("company.endDate")}" required></label>
      ${phoneControl("company.phone", nestedRawValue("company.phone"))}
      <label>Faks<input class="form-control" name="company.fax" value="${nestedValue("company.fax")}"></label>
      <label>Staj gün sayısı<input class="form-control" name="company.internshipDays" type="number" min="1" value="${nestedValue("company.internshipDays", 30)}" required></label>
      <label>E-posta<input class="form-control" name="company.email" type="email" value="${nestedValue("company.email")}" required></label>
      <label>Web adresi<input class="form-control" name="company.website" value="${nestedValue("company.website")}"></label>
      <label>Çalışan sayısı<input class="form-control" name="company.employeeCount" type="number" min="1" value="${nestedValue("company.employeeCount")}" required></label>
      <label>Mühendis sayısı<input class="form-control" name="company.engineerCount" type="number" min="1" value="${nestedValue("company.engineerCount")}" required></label>
      <label data-engineer-department>Mühendis mezuniyet bölümü<small>Mühendis sayısı 5’in altındaysa zorunludur.</small><input class="form-control" name="company.engineerDepartment" value="${nestedValue("company.engineerDepartment")}"></label>
      <label>Hafta sonu çalışılıyor mu?<select class="form-control" name="company.weekendWork">${booleanOptions("company.weekendWork")}</select></label>
      <label>Ücret alıyor mu?<select class="form-control" name="company.paid">${booleanOptions("company.paid")}</select></label>
      <label class="span-3">Kurum adresi<textarea class="form-control" name="company.address" rows="3" required>${nestedValue("company.address")}</textarea></label>
    </div></section>
    <section class="manual-section"><div class="manual-section-head"><i>03</i><div><h3>İşveren veya yetkili</h3><p>Yetkili kişi ve onay alanları</p></div></div><div class="manual-fields">
      <label>Ad soyad<input class="form-control" name="employer.name" value="${nestedValue("employer.name")}" required></label>
      <label>Görev / unvan<input class="form-control" name="employer.title" value="${nestedValue("employer.title")}" required></label>
      <label>E-posta<input class="form-control" name="employer.email" type="email" value="${nestedValue("employer.email")}" required></label>
      ${phoneControl("employer.phone", nestedRawValue("employer.phone"))}
      <div class="span-2 switch-row"><label><input type="checkbox" name="employer.signaturePresent" ${nestedValue("employer.signaturePresent") === "true" ? "checked" : ""}> İşveren imzası var</label><label><input type="checkbox" name="employer.stampPresent" ${nestedValue("employer.stampPresent") === "true" ? "checked" : ""}> İşveren kaşesi var</label></div>
      <div class="span-3 switch-row"><label><input type="checkbox" name="approvals.studentSigned" ${nestedValue("approvals.studentSigned") === "true" ? "checked" : ""}> Öğrenci onay kısmı dolu</label><label><input type="checkbox" name="approvals.advisorSigned" ${nestedValue("approvals.advisorSigned") === "true" ? "checked" : ""}> Danışman onay kısmı dolu</label></div>
    </div></section>
  </form>`;

const reportTemplate = () => {
  const application = state.application;
  const isFinal = application?.stage === "final";
  const validation = application?.validationReport || [];
  const comparison = application?.comparisonReport || [];
  const combined = [
    ...validation.map(item => ({ title: item.title, message: item.message, status: item.status })),
    ...comparison.filter(item => item.status !== "match" && item.status !== "missing-both").map(item => ({ title: `${item.label} karşılaştırması`, message: `Form: ${item.manual || "boş"} · Belge: ${item.extracted || "boş"}`, status: isFinal && item.status === "mismatch" ? "error" : "warning" })),
  ];
  const success = validation.filter(item => item.status === "success").length + (isFinal ? comparison.filter(item => item.status === "match").length : 0);
  const warning = combined.filter(item => item.status === "warning").length;
  const error = combined.filter(item => item.status === "error").length;
  const total = Math.max(1, validation.length + (isFinal ? comparison.filter(item => item.status !== "missing-both").length : 0));
  const score = application ? Math.round((success / total) * 100) : 0;
  const rows = combined.length ? combined : [{ title: "Henüz analiz yapılmadı", message: "Önce bilgi formunu kaydet ve Ek-16 belgesini yükle.", status: "warning" }];
  return `
  <div class="dashboard-page-head"><div><h2>Kontrol raporu</h2><p>${escapeHtml(application?.document?.originalName || "Belge yüklenmedi")} · ${application?.stage === "final" ? "Final doğrulamaları" : "Vize alan karşılaştırması"}</p></div><div class="page-head-actions"><button class="dash-secondary" data-nav="manual">Bilgileri düzenle</button><button class="dash-primary" data-open-upload>⇧ ${application?.document ? "Yeniden yükle" : "Belge yükle"}</button></div></div>
  <article class="panel-card"><div class="validation-summary"><div class="score-large"><span><strong>${score}</strong><small>%</small></span></div><div><div class="panel-card-head"><div><h3>${isFinal ? "Belge hazırlık skoru" : "Vize dosya uygunluğu"}</h3><p>${isFinal ? (application?.readiness ? "Belge teslime hazır." : "Eksik ve uyuşmayan alanları düzelttikten sonra yeniden analiz et.") : "Vizede dosya kontrolleri sonucu belirler; alan farkları bilgi amaçlı raporlanır."}</p></div></div><div class="summary-counts"><div class="summary-count ok"><b>${success}</b><span>Başarılı</span></div><div class="summary-count warn"><b>${warning}</b><span>Uyarı</span></div><div class="summary-count error"><b>${error}</b><span>Hata</span></div></div></div></div></article>
  <article class="panel-card" style="margin-top:18px"><div class="panel-card-head"><div><h3>Kontrol sonuçları</h3><p>Manuel bilgiler, belge alanları ve doğrulama kuralları</p></div><span class="status-badge ${application?.readiness ? "complete" : "error"}">${application?.readiness ? (isFinal ? "Teslime hazır" : "Vize dosyası uygun") : "Düzeltme gerekli"}</span></div><div class="results-list">${rows.map(item => { const css = item.status === "success" ? "ok" : item.status === "warning" ? "warn" : "error"; return `<div class="result-row ${css}"><i>${css === "ok" ? "✓" : "!"}</i><div><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.message)}</span></div><em>${css === "ok" ? "Başarılı" : css === "warn" ? "Bilgi" : "Düzelt"}</em></div>`; }).join("")}</div></article>`;
};

const scheduleTemplate = () => {
  const application = state.application;
  const dayNumberMap = { Pazar: 0, Pazartesi: 1, Salı: 2, Çarşamba: 3, Perşembe: 4, Cuma: 5, Cumartesi: 6 };
  const selected = application?.selectedWeekdays?.length ? application.selectedWeekdays : state.scheduleDays.map(day => dayNumberMap[day]);
  const startValue = application?.internshipStart || application?.manualData?.company?.startDate;
  const endValue = application?.internshipEnd || application?.manualData?.company?.endDate;
  const start = startValue ? new Date(startValue).toISOString().slice(0, 10) : "";
  const end = endValue ? new Date(endValue).toISOString().slice(0, 10) : "";
  const dateRule = application?.validationReport?.find(item => item.code === "ACADEMIC_DATE");
  const internshipRule = application?.validationReport?.find(item => item.code === "INTERNSHIP_DAYS");
  return `
  <div class="dashboard-page-head"><div><h2>Staj takvimi</h2><p>Staj tarih aralığını ve haftalık çalışma günlerini seç; sistem gün sayısını hesaplasın.</p></div><div class="page-head-actions"><button class="dash-primary" data-save-schedule>Değişiklikleri kaydet</button></div></div>
  <div class="schedule-grid">
    <article class="panel-card">
      <div class="panel-card-head"><div><h3>Tarih aralığı</h3><p>Öğretim yılı: 2026–2027 Güz</p></div></div>
      <div class="schedule-grid"><div class="form-group"><label for="start-date">Başlangıç tarihi</label><input class="form-control" id="start-date" type="date" value="${start}"></div><div class="form-group"><label for="end-date">Bitiş tarihi</label><input class="form-control" id="end-date" type="date" value="${end}"></div></div>
      <div class="form-group" style="margin-top:18px"><label>Haftalık staj günleri</label><div class="day-selector">${[[1,"Pazartesi"],[2,"Salı"],[3,"Çarşamba"],[4,"Perşembe"],[5,"Cuma"],[6,"Cumartesi"],[0,"Pazar"]].map(([number,day])=>`<button class="${selected.includes(number)?"selected":""}" data-day="${day}">${day.slice(0,3)}</button>`).join("")}</div></div>
      <div class="calculation-box"><div><b>${application?.calculatedInternshipDays ?? 0}</b><span>Hesaplanan staj günü</span></div><div><b>${selected.length}</b><span>Haftalık gün</span></div><div><b>${application?.manualData?.company?.internshipDays ?? "—"}</b><span>Belgede beyan edilen</span></div></div>
    </article>
    <article class="panel-card">
      <div class="panel-card-head"><div><h3>Takvim kontrolü</h3><p>Belgedeki tarihlerle karşılaştırma</p></div></div>
      <div class="results-list">
        <div class="result-row ${dateRule?.status === "success" ? "ok" : "warn"}"><i>${dateRule?.status === "success" ? "✓" : "!"}</i><div><b>Öğretim yılı ve teslim tarihi</b><span>${escapeHtml(dateRule?.message || "Final analizi sonrasında değerlendirilir.")}</span></div><em>${dateRule?.status === "success" ? "Uygun" : "Kontrol et"}</em></div>
        <div class="result-row ${internshipRule?.status === "success" ? "ok" : "warn"}"><i>${internshipRule?.status === "success" ? "✓" : "!"}</i><div><b>Staj gün sayısı</b><span>${escapeHtml(internshipRule?.message || "Takvimi kaydedip belgeyi analiz edin.")}</span></div><em>${internshipRule?.status === "success" ? "Eşleşti" : "Bekliyor"}</em></div>
      </div>
    </article>
  </div>`;
};

function googleEntry(path) {
  const map = state.application?.googleForm?.entryMap || {};
  return escapeHtml(map[path] || "");
}

const googleFormFields = [
  ["student.name", "Ad soyad"], ["student.studentNo", "Öğrenci no"], ["student.identityNo", "Kimlik no"],
  ["student.nationality", "Uyruk"], ["student.department", "Bölüm"], ["student.academicYear", "Öğretim yılı"],
  ["student.email", "Öğrenci e-posta"], ["student.phone", "Öğrenci telefon"], ["company.name", "Kurum adı"],
  ["company.startDate", "Başlangıç tarihi"], ["company.endDate", "Bitiş tarihi"], ["company.internshipDays", "Staj gün sayısı"],
  ["company.address", "Kurum adresi"], ["company.engineerCount", "Mühendis sayısı"], ["employer.name", "İşveren / yetkili"],
  ["employer.title", "Görev / unvan"],
];

const formTemplate = () => `
  <div class="dashboard-page-head"><div><h2>Google Form bağlantısı</h2><p>Belgen tamamlandığında bilgilerin aktarılacağı form adresini ekle.</p></div></div>
  <article class="panel-card url-card">
    <div class="panel-card-head"><div><h3>Form URL’si</h3><p>Bağlantı biçimi kaydetmeden önce kontrol edilir.</p></div></div>
    <div class="form-group"><label for="form-url">Google Form bağlantısı</label><div class="url-field"><input class="form-control" id="form-url" type="url" placeholder="https://docs.google.com/forms/d/e/.../viewform" value="${escapeHtml(state.application?.googleForm?.url || "")}"><button class="dash-primary" data-validate-url>Bağlantıyı kaydet</button></div></div>
    <div class="manual-fields" style="margin-top:18px">${googleFormFields.map(([path, label]) => `<label>${label} entry kimliği<input class="form-control" data-entry-path="${path}" placeholder="entry.123456" value="${googleEntry(path)}"></label>`).join("")}</div>
    <div class="url-status" id="url-status"><span>!</span> Formdaki her alanın entry.123456 kimliğini eşleştir ve kaydet.</div>
    <div class="info-list" style="margin-top:24px"><div class="info-item"><i>i</i><div><b>Otomatik aktarım</b><span>Başvuru “Tamamlandı” durumuna geçtiğinde eşlenen alanlar formResponse adresine gönderilir.</span></div></div><div class="info-item"><i>✓</i><div><b>Güvenli işlem</b><span>Gönderim sonucu ve hata mesajı başvuru kaydında saklanır.</span></div></div></div>
  </article>`;

const profileTemplate = (role = state.role) => {
  const profile = userProfiles[role];
  const user = state.session?.user || {};
  const studentFields = [
    ["Öğrenci numarası",user.studentNo || "—"],["Uyruk",user.nationality || "—"],["Doğum tarihi",user.birthDate ? new Date(user.birthDate).toLocaleDateString("tr-TR") : "—"],["Bölüm",user.department || "—"],["Öğretim yılı",user.academicYear || "—"],["E-posta",user.email || "—"],["Telefon",user.phone || "—"],["Önceki staj günü",`${user.previousInternshipDays || 0} gün`],["Sağlık yardımı",user.healthStatus || "—"]
  ];
  const adminFields = [["Yetki rolü","ROLE_ADMIN"],["E-posta",user.email || "—"],["Hesap oluşturma",user.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR") : "—"],["Hesap durumu",user.isActive === false ? "Pasif" : "Aktif"]];
  const fields = role === "student" ? studentFields : adminFields;
  const phone = splitPhone(user.phone);
  const phoneEditor = role === "student" ? `<form id="profile-phone-form" class="profile-phone-editor"><div><strong>Telefon numarasını güncelle</strong><p>Numara ülke koduyla birlikte tek biçimde kaydedilir.</p></div><div class="phone-input-group"><select class="form-control country-code" name="phoneCountryCode" aria-label="Ülke kodu">${countryOptions(phone.countryCode)}</select><input class="form-control" name="phone" inputmode="tel" value="${escapeHtml(phone.localNumber)}" placeholder="532 123 45 67" required><button class="dash-primary" type="submit">Güncelle</button></div></form>` : "";
  return `<div class="dashboard-page-head"><div><h2>${role === "student" ? "Profil bilgilerim" : "Yönetici profili"}</h2><p>${role === "student" ? "Hesap oluştururken kaydettiğin bilgiler." : "Yönetici hesap ve yetki bilgilerinin özeti."}</p></div></div>
  <div class="profile-grid"><article class="panel-card profile-card"><div class="profile-big-avatar">${profile.initials}</div><h3>${profile.name}</h3><p>${profile.number}</p><span class="status-badge complete">Aktif hesap</span></article><article class="panel-card"><div class="panel-card-head"><div><h3>Kayıtlı bilgiler</h3><p>Hesap oluşturma: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR") : "—"}</p></div></div><div class="profile-data">${fields.map(([label,value])=>`<div class="data-field"><span>${label}</span><b>${value}</b></div>`).join("")}</div>${phoneEditor}</article></div>`;
};

const adminOverviewTemplate = () => `
  <div class="dashboard-page-head"><div><h2>Yönetim özeti</h2><p>Başvuruların, analizlerin ve dönem yoğunluğunun güncel görünümü.</p></div><div class="page-head-actions"><button class="dash-secondary" data-nav="dataset">⇧ Veri seti yükle</button><button class="dash-primary" data-nav="applications">Tüm başvurular</button></div></div>
  <div class="stats-row admin-stats">
    <article class="stat-card"><div class="stat-top"><span class="stat-icon">▤</span><span class="stat-change neutral">Güncel</span></div><strong>—</strong><span>Toplam başvuru</span></article>
    <article class="stat-card"><div class="stat-top"><span class="stat-icon">✓</span><span class="stat-change neutral">Güncel</span></div><strong>—</strong><span>Tamamlanan</span></article>
    <article class="stat-card"><div class="stat-top"><span class="stat-icon">⌁</span><span class="stat-change neutral">Aktif</span></div><strong>—</strong><span>İncelenen</span></article>
    <article class="stat-card"><div class="stat-top"><span class="stat-icon">!</span><span class="stat-change neutral">Aksiyon</span></div><strong>—</strong><span>Eksik / hatalı</span></article>
  </div>
  <div class="dashboard-grid">
    <div>
      <article class="panel-card chart-card"><div class="panel-card-head"><div><h3>Haftalık başvuru yoğunluğu</h3><p>Son yedi gün</p></div><button class="panel-link" data-nav="reports">Raporlar →</button></div><div class="chart-bars">${[[42,"Pzt"],[65,"Sal"],[51,"Çar"],[82,"Per"],[95,"Cum"],[38,"Cmt"],[24,"Paz"]].map(([height,day],i)=>`<div class="bar-group"><div class="bar ${i===4?"active":""}" style="height:${height}%"></div><span>${day}</span></div>`).join("")}</div></article>
      <article class="panel-card" style="margin-top:18px"><div class="panel-card-head"><div><h3>Son başvurular</h3><p>En son güncellenen kayıtlar</p></div><button class="panel-link" data-nav="applications">Tümünü gör →</button></div>${applicationsTable(true)}</article>
    </div>
    <div>
      <article class="panel-card"><div class="panel-card-head"><div><h3>Durum dağılımı</h3><p>Sistemdeki güncel başvurular</p></div></div><div class="donut-wrap"><div class="donut"><strong>—</strong><small>kayıt</small></div><div class="chart-legend"><span><i></i>Veriler yükleniyor</span></div></div></article>
      <article class="panel-card" style="margin-top:18px"><div class="panel-card-head"><div><h3>Yönetim akışı</h3><p>Başvuruyu güvenle tamamlama adımları</p></div></div><div class="info-list"><div class="info-item"><i>1</i><div><b>Doğrulama raporunu inceleyin</b><span>Belge, kullanıcı profili ve test veri seti sonuçlarını karşılaştırın.</span></div></div><div class="info-item"><i>2</i><div><b>Google Form aktarımını doğrulayın</b><span>Form gönderimi başarılı olmadan kayıt tamamlanmaz.</span></div></div><div class="info-item"><i>3</i><div><b>Ek-17 belgesini oluşturun</b><span>Yalnızca tamamlanan başvurular belge üretimine açılır.</span></div></div></div></article>
    </div>
  </div>`;

function applicationsTable(compact = false, onlyCompleted = false) {
  const rows = state.adminApplications.filter(application => !onlyCompleted || application.status === "completed").slice(0, compact ? 4 : undefined);
  return `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Öğrenci</th><th>Bölüm</th><th>Yükleme</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${rows.map(adminApplicationRow).join("") || `<tr><td colspan="5">Kayıtlar yükleniyor...</td></tr>`}</tbody></table></div>`;
}

const applicationsTemplate = (completed = false) => `
  <div class="dashboard-page-head"><div><h2>${completed ? "Tamamlanan başvurular" : "Tüm başvurular"}</h2><p>${completed ? "Onaylanan ve öğrenci düzenlemesine kapatılan Ek-16 kayıtları." : "Başvuruları gerçek zamanlı filtreleyin; evrak ve doğrulama sonuçlarını inceleyin."}</p></div><div class="page-head-actions">${completed ? `<button class="dash-primary" data-nav="ek17">＋ Ek-17 oluştur</button>` : `<button class="dash-secondary" data-export-applications>↓ Listeyi dışa aktar</button>`}</div></div>
  <article class="panel-card">
    ${completed ? `<div class="locked-note"><span>▣</span> Tamamlanan belgeler öğrenci tarafından değiştirilemez; yönetim işlemleri bu panelden yürütülür.</div>` : ""}
    <div class="table-toolbar"><div class="filter-row"><select class="filter-select" data-application-filter="status" ${completed ? "disabled" : ""}><option value="">Tüm durumlar</option><option value="completed" ${completed ? "selected" : ""}>Tamamlandı</option><option value="approved">Onaylandı</option><option value="reviewing">İnceleniyor</option><option value="error">Eksik / hatalı</option><option value="uploaded">Yüklendi</option><option value="draft">Taslak</option></select><input class="filter-select" data-application-filter="department" placeholder="Bölüm"><input class="filter-select" data-application-filter="from" type="date" aria-label="Başlangıç tarihi"><input class="filter-select" data-application-filter="to" type="date" aria-label="Bitiş tarihi"></div><input class="table-search" data-application-filter="search" type="search" placeholder="Ad veya öğrenci no ara..."></div>
    ${applicationsTable(false, completed)}
  </article>`;

const datasetStatusView = {
  imported: { icon: "✓", className: "", label: "Aktarıldı" },
  partial: { icon: "!", className: "warn", label: "Eksik alanlarla aktarıldı" },
  skipped: { icon: "–", className: "warn", label: "Atlandı" },
  failed: { icon: "×", className: "fail", label: "Okunamadı" },
};

function datasetImportResultTemplate() {
  const result = state.datasetImport;
  if (!result?.files?.length) return "";
  const summary = result.rowCount
    ? `${result.rowCount} öğrenci kaydı aktarıldı`
    : "Hiçbir kayıt aktarılamadı";
  const items = result.files.map(file => {
    const view = datasetStatusView[file.status] || datasetStatusView.failed;
    const detail = [
      file.studentNo && file.name ? `${file.studentNo} · ${file.name}` : "",
      file.type === "pdf" && file.method ? (file.method.includes("ocr") ? `OCR${file.confidence !== undefined ? ` · güven %${file.confidence}` : ""}` : "PDF metni") : "",
      file.message || "",
    ].filter(Boolean).join(" · ");
    return `<div class="activity-item"><i class="${view.className}">${view.icon}</i><div><b>${escapeHtml(file.fileName)}</b><span>${escapeHtml(view.label)}${detail ? ` · ${escapeHtml(detail)}` : ""}</span></div></div>`;
  }).join("");
  return `<div class="dataset-result"><div class="panel-card-head"><div><h3>Son yükleme analizi</h3><p>${escapeHtml(summary)} · ${result.files.length} dosya incelendi</p></div></div><div class="activity-list">${items}</div></div>`;
}

const datasetTemplate = () => `
  <div class="dashboard-page-head"><div><h2>Test veri seti</h2><p>Öğrenci kayıtlarını sisteme aktarmak için Excel/CSV dosyası veya toplu EK-16 PDF'leri yükle.</p></div><div class="page-head-actions"><a class="dash-secondary" href="../sample-data/students.csv" download>↓ Örnek şablon</a></div></div>
  <div class="dashboard-grid">
    <article class="panel-card"><div class="panel-card-head"><div><h3>Veri seti yükle</h3><p>.xlsx, .csv veya .pdf · tek seferde en fazla 20 dosya · dosya başına en fazla 10 MB</p></div></div><div class="dataset-drop${state.datasetUploading ? " busy" : ""}"><div><div class="dataset-icon">${state.datasetUploading ? "…" : "⇧"}</div><h3>${state.datasetUploading ? "Dosyalar analiz ediliyor" : "Öğrenci veri dosyalarını seç"}</h3><p>${state.datasetUploading ? "Taranmış PDF'lerde OCR çalıştığı için bu işlem birkaç dakika sürebilir." : "Dosyaları buraya sürükle veya bilgisayarından seç. Birden fazla PDF seçebilirsin."}</p><input id="dataset-input" type="file" accept=".xlsx,.csv,.pdf" multiple hidden><button data-dataset-upload${state.datasetUploading ? " disabled" : ""}>${state.datasetUploading ? "Analiz ediliyor…" : "Dosya seç"}</button></div></div>${datasetImportResultTemplate()}</article>
    <div><article class="panel-card"><div class="panel-card-head"><div><h3>Aktarım geçmişi</h3><p>Son 20 veri seti yüklemesi</p></div></div><div class="activity-list" id="dataset-history"><div class="activity-item"><i>…</i><div><b>Yükleniyor</b><span>Aktarım kayıtları getiriliyor.</span></div></div></div></article><article class="panel-card" style="margin-top:18px"><div class="panel-card-head"><div><h3>Zorunlu sütunlar</h3><p>Dosyada bulunması gereken alanlar</p></div></div><div class="info-list"><div class="info-item"><i>1</i><div><b>Kimlik</b><span>Ad soyad, kimlik no, uyruk, öğrenci no, doğum tarihi.</span></div></div><div class="info-item"><i>2</i><div><b>Akademik bilgi</b><span>Bölüm, teslim yılı ve önceki staj gün sayısı.</span></div></div><div class="info-item"><i>3</i><div><b>İletişim</b><span>Adres, e-posta, telefon ve sağlık yardımı statüsü.</span></div></div><div class="info-item"><i>4</i><div><b>PDF yüklemesi</b><span>Her PDF bir öğrencinin EK-16 formu olmalı. Öğrenci no ve ad soyad okunamayan dosyalar atlanır; eksik alanlar raporda gösterilir.</span></div></div></div></article></div>
  </div>`;

const reportsAdminTemplate = () => `
  <div class="dashboard-page-head"><div><h2>Başvuru raporları</h2><p>OCR güveni ve doğrulama sonuçları doğrudan başvuru kayıtlarından hesaplanır.</p></div><div class="page-head-actions"><button class="dash-secondary" data-export-applications>↓ Rapor verisini indir</button></div></div>
  <div class="stats-row report-stats"><article class="stat-card"><div class="stat-top"><span class="stat-icon">▤</span></div><strong>—</strong><span>Toplam başvuru</span></article><article class="stat-card"><div class="stat-top"><span class="stat-icon">✓</span></div><strong>—</strong><span>Teslime hazır</span></article><article class="stat-card"><div class="stat-top"><span class="stat-icon">◎</span></div><strong>—</strong><span>Ortalama OCR güveni</span></article><article class="stat-card"><div class="stat-top"><span class="stat-icon">!</span></div><strong>—</strong><span>Toplam hata</span></article></div>
  <div class="dashboard-grid"><article class="panel-card chart-card"><div class="panel-card-head"><div><h3>Son yedi gün</h3><p>Günlük başvuru ve hazır kayıt sayısı</p></div></div><div class="chart-bars" id="report-daily-bars"></div></article><article class="panel-card"><div class="panel-card-head"><div><h3>Sık görülen doğrulama sorunları</h3><p>Gerçek kural sonuçları</p></div></div><div class="results-list" id="report-rule-list"><div class="result-row warn"><i>…</i><div><b>Rapor hazırlanıyor</b><span>Doğrulama sonuçları yükleniyor.</span></div></div></div></article></div>`;

const ek17Template = () => {
  const completed = state.adminApplications.filter(item => item.status === "completed");
  const selected = completed.find(item => item._id === state.ek17ApplicationId) || completed[0];
  if (selected) state.ek17ApplicationId = selected._id;
  const data = selected?.manualData || {};
  const dateText = value => value ? new Date(value).toLocaleDateString("tr-TR") : "—";
  return `
  <div class="dashboard-page-head"><div><h2>Ek-17 oluştur</h2><p>Tamamlanan bir başvuruyu seçin; önizleme ve indirilen belge aynı kayıtla hazırlanır.</p></div><div class="page-head-actions"><button class="dash-secondary" data-nav="completed">Tamamlananları görüntüle</button><button class="dash-primary" data-generate-ek17 ${selected ? "" : "disabled"}>Belgeyi oluştur</button></div></div>
  <article class="panel-card"><div class="form-group" style="margin-bottom:20px"><label for="ek17-application">Tamamlanan başvuru</label><select class="form-control" id="ek17-application"><option value="">${completed.length ? "Başvuru seçin" : "Tamamlanan başvuru bulunamadı"}</option>${completed.map(item => `<option value="${item._id}" ${item._id === selected?._id ? "selected" : ""}>${escapeHtml(item.manualData?.student?.name || item.student?.name || "İsimsiz öğrenci")} · ${escapeHtml(item.manualData?.student?.studentNo || item.student?.studentNo || "—")}</option>`).join("")}</select></div>${selected ? `<div class="ek17-preview"><div class="ek17-head"><small>KOCAELİ ÜNİVERSİTESİ · MÜHENDİSLİK FAKÜLTESİ</small><h3>STAJ DEĞERLENDİRME VE SONUÇ BELGESİ</h3><small>EK–17 · ${escapeHtml(data.student?.academicYear || "Öğretim Yılı")}</small></div><div class="ek17-grid"><div><span>Öğrenci adı soyadı</span><b>${escapeHtml(data.student?.name || "—")}</b></div><div><span>Öğrenci numarası</span><b>${escapeHtml(data.student?.studentNo || "—")}</b></div><div><span>Bölüm</span><b>${escapeHtml(data.student?.department || "—")}</b></div><div><span>Staj gün sayısı</span><b>${escapeHtml(data.company?.internshipDays || "—")} iş günü</b></div><div class="wide"><span>Staj yapılan kurum</span><b>${escapeHtml(data.company?.name || "—")}</b></div><div><span>Başlangıç tarihi</span><b>${dateText(data.company?.startDate)}</b></div><div><span>Bitiş tarihi</span><b>${dateText(data.company?.endDate)}</b></div></div><div class="ek17-signatures"><div>Öğrenci imzası</div><div>Staj danışmanı</div><div>Bölüm komisyonu</div></div></div>` : `<div class="locked-note"><span>i</span> Ek-17 üretmek için önce bir başvurunun doğrulamalarını tamamlayıp Tamamlandı durumuna getirin.</div>`}</article>`;
};

function renderDashboardPage(page = "overview") {
  state.page = page;
  const content = document.querySelector("#dashboard-content");
  const templates = state.role === "student"
    ? { overview: studentOverviewTemplate, manual: manualFormTemplate, upload: studentUploadTemplate, report: reportTemplate, schedule: scheduleTemplate, form: formTemplate, profile: () => profileTemplate("student") }
    : { overview: adminOverviewTemplate, applications: () => applicationsTemplate(false), completed: () => applicationsTemplate(true), dataset: datasetTemplate, reports: reportsAdminTemplate, report: reportTemplate, manual: manualFormTemplate, ek17: ek17Template, profile: () => profileTemplate("admin") };
  const renderer = templates[page] || templates.overview;
  content.innerHTML = renderer();
  document.querySelector("#dashboard-title").textContent = pageTitles[page] || "Genel Bakış";
  document.querySelector("#dashboard-breadcrumb").textContent = `${state.role === "student" ? "Öğrenci Paneli" : "Yönetici Paneli"} / ${pageTitles[page] || "Genel Bakış"}`;
  document.querySelectorAll("#side-nav button[data-nav]").forEach(button => button.classList.toggle("active", button.dataset.nav === page));
  document.querySelector("#app-sidebar").classList.remove("open");
  if (page === "manual") syncEngineerDepartmentVisibility();
  window.scrollTo({ top: 0, behavior: "smooth" });
  hydrateDashboardPage(page);
}

function renderSidebar() {
  document.querySelector("#side-nav").innerHTML = navItems[state.role].map(item => {
    if (item.type === "title") return `<div class="side-nav-title">${item.label}</div>`;
    return `<button data-nav="${item.id}" class="${item.id === state.page ? "active" : ""}"><span class="nav-icon">${item.icon}</span>${item.label}${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ""}</button>`;
  }).join("");
}

function updateDashboardProfile() {
  const profile = userProfiles[state.role];
  document.querySelector("#profile-avatar").textContent = profile.initials;
  document.querySelector("#profile-name").textContent = profile.name;
  document.querySelector("#profile-number").textContent = profile.number;
  document.querySelector("#header-avatar").textContent = profile.initials;
  document.querySelector("#header-name").textContent = profile.name;
  document.querySelector("#header-role").textContent = profile.roleLabel;
  document.querySelector("#sidebar-role").textContent = profile.panelLabel;
}

function syncSessionProfile(user) {
  if (!user) return;
  state.role = user.role;
  const initials = String(user.name || "Kullanıcı").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  userProfiles[user.role] = {
    name: user.name,
    shortName: String(user.name).split(" ")[0],
    initials,
    number: user.studentNo || "Sistem Yöneticisi",
    roleLabel: user.role === "admin" ? "Yönetici" : "Öğrenci",
    panelLabel: user.role === "admin" ? "yönetici paneli" : "öğrenci paneli",
  };
}

async function hydrateDashboardPage(page) {
  try {
    if (state.role === "admin" && page === "overview") {
      const [response, reports, applications] = await Promise.all([window.EvraqaApi.adminStats(), window.EvraqaApi.adminReports(), window.EvraqaApi.adminApplications("limit=4")]);
      const values = [response.data.total, response.data.completed, response.data.reviewing, response.data.error];
      document.querySelectorAll(".admin-stats .stat-card>strong").forEach((element, index) => { if (values[index] !== undefined) element.textContent = values[index]; });
      state.adminApplications = applications.data.items;
      const table = document.querySelector(".data-table tbody");
      if (table) table.innerHTML = state.adminApplications.map(adminApplicationRow).join("") || `<tr><td colspan="5">Henüz başvuru bulunmuyor.</td></tr>`;
      const bars = document.querySelector(".chart-bars");
      if (bars) bars.innerHTML = reportBars(reports.data.daily);
      const donut = document.querySelector(".donut");
      if (donut) donut.innerHTML = `<strong>${reports.data.total}</strong><small>kayıt</small>`;
      const legend = document.querySelector(".chart-legend");
      if (legend) legend.innerHTML = Object.entries(reports.data.statusCounts).map(([status, count]) => `<span><i></i>${escapeHtml(status)} · ${count}</span>`).join("") || "Henüz kayıt yok.";
    }
    if (state.role === "admin" && ["applications", "completed"].includes(page)) {
      await loadAdminApplicationsFromFilters();
    }
    if (state.role === "admin" && page === "reports") {
      const response = await window.EvraqaApi.adminReports();
      const totalErrors = response.data.rules.reduce((sum, rule) => sum + rule.error + rule.warning, 0);
      const values = [response.data.total, response.data.ready, response.data.averageConfidence === null ? "—" : `%${response.data.averageConfidence}`, totalErrors];
      document.querySelectorAll(".report-stats .stat-card>strong").forEach((element, index) => { element.textContent = values[index]; });
      document.querySelector("#report-daily-bars").innerHTML = reportBars(response.data.daily);
      document.querySelector("#report-rule-list").innerHTML = response.data.rules.slice(0, 8).map(rule => `<div class="result-row ${rule.error ? "error" : "warn"}"><i>!</i><div><b>${escapeHtml(rule.title)}</b><span>${rule.error} hata · ${rule.warning} uyarı · ${rule.success} başarılı</span></div><em>${rule.error + rule.warning}</em></div>`).join("") || `<div class="locked-note"><span>i</span> Henüz doğrulama sonucu bulunmuyor.</div>`;
    }
    if (state.role === "admin" && page === "dataset") {
      const response = await window.EvraqaApi.datasetHistory();
      document.querySelector("#dataset-history").innerHTML = response.data.map(item => `<div class="activity-item"><i>✓</i><div><b>${item.rowCount} öğrenci kaydı</b><span>${new Date(item.importedAt).toLocaleString("tr-TR")} · ${escapeHtml(item._id)}</span></div><button class="row-action-text" data-delete-dataset="${escapeHtml(item._id)}">Sil</button></div>`).join("") || `<div class="locked-note"><span>i</span> Henüz veri seti aktarılmadı.</div>`;
    }
    if (state.role === "admin" && page === "ek17") {
      const response = await window.EvraqaApi.adminApplications("status=completed&limit=100");
      state.adminApplications = response.data.items;
      if (state.page === "ek17") document.querySelector("#dashboard-content").innerHTML = ek17Template();
    }
  } catch (error) {
    showToast(error.message, "!");
  }
}

function reportBars(daily = []) {
  const maximum = Math.max(1, ...daily.map(item => item.total));
  return daily.map((item, index) => `<div class="bar-group" title="${item.total} başvuru · ${item.ready} hazır"><div class="bar ${index === daily.length - 1 ? "active" : ""}" style="height:${Math.max(6, Math.round((item.total / maximum) * 100))}%"></div><span>${new Date(`${item.date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short" })}</span></div>`).join("") || `<div class="locked-note"><span>i</span> Son yedi günde başvuru bulunmuyor.</div>`;
}

async function loadAdminApplicationsFromFilters() {
  const params = new URLSearchParams();
  document.querySelectorAll("[data-application-filter]").forEach(input => { if (input.value) params.set(input.dataset.applicationFilter, input.value); });
  if (state.page === "completed") params.set("status", "completed");
  const response = await window.EvraqaApi.adminApplications(params.toString());
  state.adminApplications = response.data.items;
  const table = document.querySelector(".data-table tbody");
  if (table) table.innerHTML = state.adminApplications.map(adminApplicationRow).join("") || `<tr><td colspan="5">Filtrelerle eşleşen kayıt bulunamadı.</td></tr>`;
}

function adminApplicationRow(application) {
  const student = application.student || {};
  const name = application.manualData?.student?.name || student.name || "İsimsiz öğrenci";
  const no = application.manualData?.student?.studentNo || student.studentNo || "—";
  const initials = name.split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase();
  const classes = { completed: "complete", reviewing: "review", error: "error", uploaded: "uploaded", approved: "complete", draft: "uploaded" };
  const labels = { completed: "Tamamlandı", reviewing: "İnceleniyor", error: "Eksik", uploaded: "Yüklendi", approved: "Onaylandı", draft: "Taslak" };
  return `<tr><td><div class="student-cell"><i>${escapeHtml(initials)}</i><div><b>${escapeHtml(name)}</b><span>${escapeHtml(no)}</span></div></div></td><td>${escapeHtml(application.manualData?.student?.department || student.department || "—")}</td><td>${new Date(application.createdAt).toLocaleDateString("tr-TR")}</td><td><span class="status-badge ${classes[application.status] || "uploaded"}">${labels[application.status] || application.status}</span></td><td><div class="row-actions"><button data-admin-open="${application._id}" title="İncele">⌕</button>${application.status === "completed" ? `<button data-download-ek17="${application._id}" title="Ek-17 indir">＋</button>` : `<button data-complete="${application._id}" title="Tamamla">✓</button>`}<button data-delete-application="${application._id}" title="Sil">×</button></div></td></tr>`;
}

function openLogin(role = "student") {
  setLoginRole(role);
  loginModal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => document.querySelector("#login-email").focus(), 50);
}

function closeLogin() {
  loginModal.hidden = true;
  document.body.style.overflow = "";
}

function setLoginRole(role) {
  state.role = role;
  document.querySelectorAll("[data-login-role]").forEach(tab => tab.classList.toggle("active", tab.dataset.loginRole === role));
  const isAdmin = role === "admin";
  document.querySelector("#login-kicker").textContent = isAdmin ? "YÖNETİCİ GİRİŞİ" : "ÖĞRENCİ GİRİŞİ";
  document.querySelector("#login-title").textContent = isAdmin ? "Yönetim merkezine giriş." : "Tekrar hoş geldin.";
  document.querySelector("#login-copy").textContent = isAdmin ? "Başvuruları ve belge akışını yönetmek için devam et." : "Evrak durumunu görüntülemek için bilgilerinle giriş yap.";
  document.querySelector("#login-email").value = "";
  document.querySelector("#login-email").placeholder = isAdmin ? "admin@kurum.edu.tr" : "E-posta veya öğrenci numarası";
}

async function enterDashboard() {
  state.page = "overview";
  closeLogin();
  marketingSite.hidden = true;
  appShell.hidden = false;
  document.body.style.overflow = "";
  renderSidebar();
  updateDashboardProfile();
  if (state.role === "student") {
    try {
      const response = await window.EvraqaApi.myApplications();
      state.application = response.data[0] || null;
      const dayNames = { 0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cumartesi" };
      if (state.application?.selectedWeekdays?.length) state.scheduleDays = state.application.selectedWeekdays.map(day => dayNames[day]).filter(Boolean);
    } catch (error) {
      showToast(error.message, "!");
    }
  }
  renderDashboardPage("overview");
}

async function logout() {
  try { await window.EvraqaApi.logout(); } catch {}
  window.EvraqaApi.setSession(null);
  state.session = null;
  state.application = null;
  appShell.hidden = true;
  marketingSite.hidden = false;
  document.body.style.overflow = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast("Güvenli çıkış yapıldı.");
}

function openUpload() {
  if (!state.application) {
    showToast("Önce Ek-16 bilgi formunu kaydetmelisin.", "!");
    renderDashboardPage("manual");
    return;
  }
  state.selectedFile = null;
  resetUploadModal();
  document.querySelector("#upload-stage").value = state.application?.stage || "midterm";
  uploadModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function resetUploadModal() {
  uploadModal.querySelector(".upload-action-modal").innerHTML = uploadModalOriginal;
}

function closeUpload() {
  uploadModal.hidden = true;
  document.body.style.overflow = "";
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function handleFile(file) {
  if (!file) return;
  const extension = file.name.split(".").pop().toLowerCase();
  const accepted = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];
  if (!accepted.includes(extension)) {
    showToast("Bu dosya türü desteklenmiyor. PDF, Word, JPEG veya PNG seç.", "!");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast("Dosya 10 MB sınırını aşıyor.", "!");
    return;
  }
  state.selectedFile = file;
  const selected = document.querySelector("#upload-selected");
  selected.hidden = false;
  selected.innerHTML = `<strong>${file.name}</strong><span>${formatFileSize(file.size)} · Yüklemeye hazır</span>`;
  document.querySelector("#upload-confirm").disabled = false;
}

async function analyzeSelectedFile() {
  if (!state.selectedFile) return;
  const stage = document.querySelector("#upload-stage")?.value || "midterm";
  const modal = uploadModal.querySelector(".upload-action-modal");
  modal.innerHTML = `<div class="analysis-progress"><div class="progress-spinner"></div><span class="modal-kicker">BELGE ANALİZİ</span><h2>Kontroller çalıştırılıyor...</h2><p>${escapeHtml(state.selectedFile.name)} okunuyor; alanlar ve kurallar karşılaştırılıyor.</p><div class="progress-bar-wide"><span></span></div><p style="margin-top:12px">${stage === "final" ? "OCR · kimlik · tarih · imza / kaşe kontrolleri" : "Dosya biçimi · alan okuma · manuel bilgi karşılaştırması"}</p></div>`;
  try {
    const response = await window.EvraqaApi.uploadDocument(state.application._id, state.selectedFile, stage);
    state.application = response.data;
    closeUpload();
    resetUploadModal();
    renderDashboardPage("report");
    const successMessage = stage === "final" ? "Analiz tamamlandı: belge teslime hazır." : "Vize dosya kontrolleri başarıyla tamamlandı.";
    showToast(state.application.readiness ? successMessage : "Analiz tamamlandı: düzeltilmesi gereken alanlar var.", state.application.readiness ? "✓" : "!");
  } catch (error) {
    resetUploadModal();
    showToast(error.message, "!");
  }
}

function openRegister() {
  closeLogin();
  registerModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeRegister() {
  registerModal.hidden = true;
  document.body.style.overflow = "";
}

function formDataToNested(formData) {
  const output = {};
  for (const [path, rawValue] of formData.entries()) {
    const keys = path.split(".");
    const finalKey = keys.pop();
    const parent = keys.reduce((current, key) => (current[key] ||= {}), output);
    let value = rawValue;
    if (["true", "false"].includes(value)) value = value === "true";
    else if (path.endsWith("Days") || path.endsWith("Count") || path.endsWith("Status")) value = Number(value);
    else if (value === "on") value = true;
    parent[finalKey] = value;
  }
  output.employer ||= {};
  output.approvals ||= {};
  output.employer.signaturePresent = Boolean(output.employer.signaturePresent);
  output.employer.stampPresent = Boolean(output.employer.stampPresent);
  output.approvals.studentSigned = Boolean(output.approvals.studentSigned);
  output.approvals.advisorSigned = Boolean(output.approvals.advisorSigned);
  return output;
}

async function saveSchedule() {
  if (!state.application) return showToast("Önce Ek-16 bilgi formunu kaydet.", "!");
  const dayNumbers = { Pazar: 0, Pazartesi: 1, Salı: 2, Çarşamba: 3, Perşembe: 4, Cuma: 5, Cumartesi: 6 };
  try {
    const response = await window.EvraqaApi.updateSchedule(state.application._id, {
      internshipStart: document.querySelector("#start-date").value,
      internshipEnd: document.querySelector("#end-date").value,
      selectedWeekdays: state.scheduleDays.map(day => dayNumbers[day]),
    });
    state.application = response.data;
    showToast(`Staj takvimi kaydedildi: ${response.data.calculatedInternshipDays || 0} gün.`);
    renderDashboardPage("schedule");
  } catch (error) { showToast(error.message, "!"); }
}

async function saveFormUrl(url, statusElement) {
  if (!state.application) return showToast("Önce Ek-16 bilgi formunu kaydet.", "!");
  try {
    const entryMap = {};
    document.querySelectorAll("[data-entry-path]").forEach(input => { if (input.value.trim()) entryMap[input.dataset.entryPath] = input.value.trim(); });
    if (!Object.keys(entryMap).length) throw new Error("En az bir Google Form entry kimliği eşleştirilmelidir.");
    const response = await window.EvraqaApi.saveGoogleForm(state.application._id, { url, entryMap });
    state.application.googleForm = { url, entryMap };
    const detected = response.data.inspection?.entryIds?.length || 0;
    statusElement.innerHTML = `<span>✓</span> Form erişilebilir; ${detected} alan kimliği algılandı ve eşleme kaydedildi.`;
    showToast("Google Form bağlantısı kaydedildi.");
  } catch (error) { statusElement.innerHTML = `<span>!</span> ${escapeHtml(error.message)}`; }
}

async function uploadDatasetFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length || state.datasetUploading) return;
  if (files.length > 20) { showToast("Tek seferde en fazla 20 dosya yüklenebilir.", "!"); return; }
  const unsupported = files.find(file => !/\.(xlsx|csv|pdf)$/i.test(file.name));
  if (unsupported) { showToast(`${unsupported.name}: yalnızca .xlsx, .csv veya .pdf yüklenebilir.`, "!"); return; }
  state.datasetUploading = true;
  state.datasetImport = null;
  renderDashboardPage("dataset");
  try {
    const response = await window.EvraqaApi.uploadDataset(files);
    state.datasetImport = response.data;
    const problems = response.data.files.filter(file => file.status !== "imported").length;
    showToast(`${response.data.rowCount} öğrenci kaydı içe aktarıldı${problems ? `, ${problems} dosyada uyarı var` : ""}.`, problems ? "!" : "✓");
  } catch (error) {
    if (Array.isArray(error.details)) state.datasetImport = { rowCount: 0, files: error.details };
    showToast(error.message, "!");
  } finally {
    state.datasetUploading = false;
    if (state.page === "dataset") renderDashboardPage("dataset");
  }
}

async function completeAdminApplication(id) {
  try {
    await window.EvraqaApi.completeApplication(id);
    showToast("Başvuru tamamlandı ve öğrenciye kilitlendi.");
    renderDashboardPage("applications");
  } catch (error) { showToast(error.message, "!"); }
}

async function openAdminApplication(id) {
  try {
    const response = await window.EvraqaApi.getApplication(id);
    state.application = response.data;
    renderDashboardPage("report");
  } catch (error) { showToast(error.message, "!"); }
}

async function deleteAdminApplication(id) {
  if (!window.confirm("Bu başvuru ve sisteme yüklenen belge kalıcı olarak silinecek. Devam edilsin mi?")) return;
  try {
    await window.EvraqaApi.deleteApplication(id);
    showToast("Başvuru silindi.");
    renderDashboardPage(state.page === "completed" ? "completed" : "applications");
  } catch (error) { showToast(error.message, "!"); }
}

async function downloadEk17(id) {
  try {
    const blob = await window.EvraqaApi.request(`/admin/applications/${id}/ek17`);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `EK-17-${id}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Ek-17 belgesi oluşturuldu.");
  } catch (error) { showToast(error.message, "!"); }
}

async function generateFirstEk17() {
  try {
    const id = state.ek17ApplicationId || document.querySelector("#ek17-application")?.value;
    if (!id) throw new Error("Ek-17 oluşturmak için tamamlanan bir başvuru seçin.");
    await downloadEk17(id);
  } catch (error) { showToast(error.message, "!"); }
}

function showToast(message, icon = "✓") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i>${icon}</i><span>${message}</span>`;
  document.querySelector("#toast-region").appendChild(toast);
  setTimeout(() => toast.classList.add("hide"), 2800);
  setTimeout(() => toast.remove(), 3150);
}

async function exportApplicationsCsv() {
  try {
    const blob = await window.EvraqaApi.exportApplications();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "basvurular.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Başvuru listesi CSV olarak indirildi.");
  } catch (error) { showToast(error.message, "!"); }
}

async function deleteDatasetBatch(batch) {
  if (!window.confirm("Bu veri seti aktarımındaki tüm kayıtlar silinsin mi?")) return;
  try {
    const response = await window.EvraqaApi.deleteDatasetBatch(batch);
    showToast(`${response.data.deletedCount} veri seti kaydı silindi.`);
    renderDashboardPage("dataset");
  } catch (error) { showToast(error.message, "!"); }
}

function syncEngineerDepartmentVisibility() {
  const count = Number(document.querySelector("[name='company.engineerCount']")?.value);
  const field = document.querySelector("[data-engineer-department]");
  const input = field?.querySelector("input");
  if (!field || !input) return;
  const required = Number.isFinite(count) && count > 0 && count < 5;
  field.hidden = Number.isFinite(count) && count >= 5;
  input.required = required;
}

document.addEventListener("click", event => {
  const openLoginButton = event.target.closest("[data-action='open-login']");
  if (openLoginButton) openLogin(openLoginButton.dataset.role || "student");
  if (event.target.closest("[data-action='close-login']")) closeLogin();
  if (event.target.closest("[data-action='close-upload']")) closeUpload();
  if (event.target.closest("[data-action='close-register']")) closeRegister();
  if (event.target.closest("#open-register")) openRegister();

  const navButton = event.target.closest("[data-nav]");
  if (navButton && !appShell.hidden) renderDashboardPage(navButton.dataset.nav);
  if (event.target.closest("[data-dashboard-home]")) renderDashboardPage("overview");
  if (event.target.closest("[data-open-upload]")) openUpload();

  const toastTarget = event.target.closest("[data-toast]");
  if (toastTarget) showToast(toastTarget.dataset.toast);

  const dayButton = event.target.closest("[data-day]");
  if (dayButton) {
    const day = dayButton.dataset.day;
    state.scheduleDays = state.scheduleDays.includes(day) ? state.scheduleDays.filter(item => item !== day) : [...state.scheduleDays, day];
    dayButton.classList.toggle("selected");
  }

  if (event.target.closest("[data-save-schedule]")) saveSchedule();
  if (event.target.closest("[data-validate-url]")) {
    const input = document.querySelector("#form-url");
    const status = document.querySelector("#url-status");
    const valid = /^https:\/\/(docs\.)?google\.com\/forms\//i.test(input.value);
    status.innerHTML = valid ? "<span>✓</span> Bağlantı biçimi geçerli; kaydediliyor..." : "<span>!</span> Geçerli bir Google Forms bağlantısı gir.";
    status.style.background = valid ? "#e1f0e8" : "#f8ead8";
    status.style.color = valid ? "#267155" : "#96611f";
    if (valid) saveFormUrl(input.value, status);
  }
  if (event.target.closest("[data-generate-ek17]")) generateFirstEk17();
  if (event.target.closest("[data-export-applications]")) exportApplicationsCsv();
  if (event.target.closest("[data-dataset-upload]")) document.querySelector("#dataset-input")?.click();
  const completeButton = event.target.closest("[data-complete]");
  if (completeButton) completeAdminApplication(completeButton.dataset.complete);
  const ek17Button = event.target.closest("[data-download-ek17]");
  if (ek17Button) downloadEk17(ek17Button.dataset.downloadEk17);
  const adminOpenButton = event.target.closest("[data-admin-open]");
  if (adminOpenButton) openAdminApplication(adminOpenButton.dataset.adminOpen);
  const deleteButton = event.target.closest("[data-delete-application]");
  if (deleteButton) deleteAdminApplication(deleteButton.dataset.deleteApplication);
  const deleteDatasetButton = event.target.closest("[data-delete-dataset]");
  if (deleteDatasetButton) deleteDatasetBatch(deleteDatasetButton.dataset.deleteDataset);
});

document.addEventListener("change", event => {
  if (event.target.matches("#file-input")) handleFile(event.target.files[0]);
  if (event.target.matches("#dataset-input") && event.target.files.length) uploadDatasetFiles(event.target.files);
  if (event.target.matches("[data-application-filter]")) loadAdminApplicationsFromFilters().catch(error => showToast(error.message, "!"));
  if (event.target.matches("#ek17-application")) {
    state.ek17ApplicationId = event.target.value;
    document.querySelector("#dashboard-content").innerHTML = ek17Template();
  }
});

let applicationSearchTimer;
document.addEventListener("input", event => {
  if (event.target.matches("[data-application-filter='search']")) {
    clearTimeout(applicationSearchTimer);
    applicationSearchTimer = setTimeout(() => loadAdminApplicationsFromFilters().catch(error => showToast(error.message, "!")), 300);
  }
  if (event.target.matches("[name='company.engineerCount']")) syncEngineerDepartmentVisibility();
});

document.addEventListener("submit", async event => {
  if (event.target.matches("#profile-phone-form")) {
    event.preventDefault();
    const button = event.target.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const payload = Object.fromEntries(new FormData(event.target));
      const response = await window.EvraqaApi.updatePhone(payload);
      state.session.user = response.data;
      window.EvraqaApi.setSession(state.session);
      syncSessionProfile(response.data);
      showToast("Telefon numarası güncellendi.");
      renderDashboardPage("profile");
    } catch (error) { showToast(error.message, "!"); }
    finally { button.disabled = false; }
    return;
  }
  if (!event.target.matches("#manual-form")) return;
  event.preventDefault();
  const manualData = formDataToNested(new FormData(event.target));
  try {
    const response = state.application
      ? await window.EvraqaApi.updateManual(state.application._id, manualData)
      : await window.EvraqaApi.createApplication({ manualData, stage: "midterm" });
    state.application = response.data;
    showToast("Ek-16 bilgileri başarıyla kaydedildi.");
    renderDashboardPage("upload");
  } catch (error) { showToast(error.message, "!"); }
});

document.addEventListener("dragover", event => {
  const datasetDrop = event.target.closest(".dataset-drop");
  if (datasetDrop) { event.preventDefault(); datasetDrop.classList.add("dragging"); return; }
  const dropZone = event.target.closest("#drop-zone");
  if (!dropZone) return;
  event.preventDefault();
  dropZone.classList.add("dragging");
});

document.addEventListener("dragleave", event => {
  event.target.closest("#drop-zone")?.classList.remove("dragging");
  event.target.closest(".dataset-drop")?.classList.remove("dragging");
});

document.addEventListener("drop", event => {
  const datasetDrop = event.target.closest(".dataset-drop");
  if (datasetDrop) {
    event.preventDefault();
    datasetDrop.classList.remove("dragging");
    uploadDatasetFiles(event.dataTransfer.files);
    return;
  }
  const dropZone = event.target.closest("#drop-zone");
  if (!dropZone) return;
  event.preventDefault();
  dropZone.classList.remove("dragging");
  handleFile(event.dataTransfer.files[0]);
});

document.addEventListener("click", event => {
  if (event.target.closest("#upload-confirm")) analyzeSelectedFile();
});

document.querySelector("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.target.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    const response = await window.EvraqaApi.login(document.querySelector("#login-email").value, document.querySelector("#login-password").value);
    state.session = response.data;
    window.EvraqaApi.setSession(response.data);
    syncSessionProfile(response.data.user);
    await enterDashboard();
  } catch (error) { showToast(error.message, "!"); }
  finally { button.disabled = false; }
});

document.querySelector("#register-form").addEventListener("submit", async event => {
  event.preventDefault();
  const password = document.querySelector("#register-password").value;
  const confirmation = document.querySelector("#register-password-confirm").value;
  if (password !== confirmation) {
    document.querySelector("#password-match-label").textContent = "Şifreler eşleşmiyor.";
    document.querySelector("#password-match-label").className = "password-match-error";
    document.querySelector("#register-password-confirm").focus();
    return;
  }
  const button = event.target.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    const payload = Object.fromEntries(new FormData(event.target));
    const response = await window.EvraqaApi.register(payload);
    state.session = response.data;
    window.EvraqaApi.setSession(response.data);
    syncSessionProfile(response.data.user);
    closeRegister();
    await enterDashboard();
    showToast("Hesabın oluşturuldu. Ek-16 bilgilerini girebilirsin.");
    renderDashboardPage("manual");
  } catch (error) { showToast(error.message, "!"); }
  finally { button.disabled = false; }
});

document.querySelectorAll("[data-login-role]").forEach(tab => tab.addEventListener("click", () => setLoginRole(tab.dataset.loginRole)));
document.querySelector("#toggle-password").addEventListener("click", () => {
  const input = document.querySelector("#login-password");
  input.type = input.type === "password" ? "text" : "password";
});
document.querySelectorAll("[data-password-toggle]").forEach(button => button.addEventListener("click", () => {
  const input = document.querySelector(`#${button.dataset.passwordToggle}`);
  input.type = input.type === "password" ? "text" : "password";
  button.textContent = input.type === "password" ? "Göster" : "Gizle";
  button.setAttribute("aria-label", input.type === "password" ? "Şifreyi göster" : "Şifreyi gizle");
}));

function passwordStrength(value) {
  let level = 0;
  if (value.length >= 8) level += 1;
  if (/[a-zçğıöşü]/.test(value) && /[A-ZÇĞİÖŞÜ]/.test(value)) level += 1;
  if (/\d/.test(value)) level += 1;
  if (value.length >= 12 && /[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(value)) level += 1;
  return level;
}

document.querySelector("#register-password").addEventListener("input", event => {
  const level = passwordStrength(event.target.value);
  const container = document.querySelector(".password-strength");
  const labels = ["Şifre gereksinimleri henüz karşılanmıyor.", "Zayıf şifre", "Orta düzey şifre", "Güçlü şifre", "Çok güçlü şifre"];
  container.dataset.level = String(level);
  document.querySelector("#password-strength-label").textContent = labels[level];
});

document.querySelector("#register-password-confirm").addEventListener("input", event => {
  const label = document.querySelector("#password-match-label");
  const matches = event.target.value && event.target.value === document.querySelector("#register-password").value;
  label.textContent = matches ? "Şifreler eşleşiyor." : "Şifreler aynı olmalıdır.";
  label.className = matches ? "password-match-success" : event.target.value ? "password-match-error" : "";
});
document.querySelector("#logout-button").addEventListener("click", logout);
document.querySelector("#dashboard-menu").addEventListener("click", () => document.querySelector("#app-sidebar").classList.add("open"));
document.querySelector("#sidebar-close").addEventListener("click", () => document.querySelector("#app-sidebar").classList.remove("open"));

document.querySelector("#menu-button").addEventListener("click", event => {
  const header = document.querySelector(".site-header");
  const expanded = header.classList.toggle("mobile-open");
  event.currentTarget.setAttribute("aria-expanded", expanded);
});

document.querySelectorAll(".main-nav a").forEach(link => link.addEventListener("click", () => {
  document.querySelector(".site-header").classList.remove("mobile-open");
  document.querySelector("#menu-button").setAttribute("aria-expanded", "false");
}));

[loginModal, uploadModal, registerModal].forEach(modal => modal.addEventListener("click", event => {
  if (event.target === modal) {
    if (modal === loginModal) closeLogin();
    if (modal === uploadModal) closeUpload();
    if (modal === registerModal) closeRegister();
  }
}));

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!loginModal.hidden) closeLogin();
    if (!uploadModal.hidden) closeUpload();
    if (!registerModal.hidden) closeRegister();
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !appShell.hidden) {
    event.preventDefault();
    document.querySelector(".dashboard-search input")?.focus();
  }
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(element => revealObserver.observe(element));

async function restoreSession() {
  if (!state.session?.token) return;
  try {
    const response = await window.EvraqaApi.me();
    state.session = response.data;
    window.EvraqaApi.setSession(response.data);
    syncSessionProfile(response.data.user);
    await enterDashboard();
  } catch {
    window.EvraqaApi.setSession(null);
    state.session = null;
  }
}

restoreSession();

window.addEventListener("evraqa:unauthorized", event => {
  state.session = null;
  state.application = null;
  appShell.hidden = true;
  marketingSite.hidden = false;
  openLogin("student");
  showToast(event.detail?.message || "Bu işlem için yeniden giriş yapmanız gerekiyor.", "!");
});
