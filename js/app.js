import {
  GRADOS_ESCOLARES,
  FALLAS_FRECUENTES,
  OPCIONES_RESOLUCION
} from "./config/constants.js";
import {
  getLocalDateString,
  getCurrentTimeString,
  buildLocalTimestamp
} from "./utils/dateUtils.js";
import { exportRecordsToCSV } from "./utils/exportUtils.js";
import { FirestoreService } from "./db/FirestoreService.js";
import { ToastManager } from "./ui/ToastManager.js";
import { UIRenderer } from "./ui/UIRenderer.js";

class SoporteTIApp {
  constructor() {
    this.dbService = new FirestoreService();
    this.toast = new ToastManager();
    this.ui = new UIRenderer();

    this.usersList = [];
    this.currentUser = null;
    this.allRecords = [];
    this.adminViewLoaded = false;

    this.activeTab = "general";
    this.selectedDate = getLocalDateString(0);
    this.dailySearchQuery = "";

    this.traeCargador = true;
    this.tipoBeneficiario = "Estudiante";
    this.manualTimeEdited = false;

    this.activeRecordForModal = null;
    this.selectedResolution = "Reparación en sede";
  }

  // Helper seguro: nunca lanza TypeError si un elemento aún no existe en el DOM
  bind(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(event, handler);
    } else {
      console.warn(`Elemento no encontrado en DOM: #${id}`);
    }
  }

  async init() {
    await this.loadBaseViews();
    this.initStaticOptions();
    this.bindEvents();
    this.startLiveClock();
    this.connectDatabase();
  }

  async loadBaseViews() {
    const partials = [
      { id: "container-general", url: "./views/general.html" },
      { id: "container-recepcion", url: "./views/recepcion.html" },
      { id: "container-soporte", url: "./views/soporte.html" },
      { id: "container-historial", url: "./views/historial.html" },
      { id: "container-modals", url: "./views/modals.html" }
    ];

    await Promise.all(
      partials.map(async ({ id, url }) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
        const html = await res.text();
        const container = document.getElementById(id);
        if (container) container.innerHTML = html;
      })
    );

    if (window.lucide) window.lucide.createIcons();
  }

  async ensureAdminViewLoaded() {
    if (this.adminViewLoaded || this.currentUser?.rol !== "ADMIN") return;

    const res = await fetch("./views/admin.html");
    if (!res.ok) return;

    document.getElementById("container-admin").innerHTML = await res.text();
    this.adminViewLoaded = true;
    this.bindAdminEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  initStaticOptions() {
    const fillSelect = (id, items) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = items.map((val) => `<option value="${val}">${val}</option>`).join("");
    };

    fillSelect("rec-grado", GRADOS_ESCOLARES);
    fillSelect("edit-rec-grado", GRADOS_ESCOLARES);

    const recFecha = document.getElementById("rec-fecha");
    const recHora = document.getElementById("rec-hora");
    if (recFecha) recFecha.value = getLocalDateString(0);
    if (recHora) recHora.value = getCurrentTimeString();

    const chipsContainer = document.getElementById("damage-chips-container");
    if (chipsContainer) {
      chipsContainer.innerHTML = FALLAS_FRECUENTES.map(
        (falla) =>
          `<button type="button" data-falla="${falla}" class="damage-chip px-3 py-1.5 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 transition">+ ${falla}</button>`
      ).join("");
    }
  }

  syncPersonnelSelects() {
    const nombres = this.usersList.map((u) => u.nombre);
    if (nombres.length === 0) return;

    const buildOptions = (includeEmpty = false) => {
      const emptyOpt = includeEmpty ? `<option value="">Sin asignar</option>` : "";
      return emptyOpt + nombres.map((n) => `<option value="${n}">${n}</option>`).join("");
    };

    const recInput = document.getElementById("rec-tecnico-recepcion");
    if (this.currentUser && recInput) {
      recInput.value = this.currentUser.nombre;
    }

    const ticketSelect = document.getElementById("rec-tecnico-ticket");
    if (ticketSelect) {
      ticketSelect.innerHTML = buildOptions();
      if (this.currentUser && nombres.includes(this.currentUser.nombre)) {
        ticketSelect.value = this.currentUser.nombre;
      }
    }

    const editRec = document.getElementById("edit-rec-tec-rec");
    const editTkt = document.getElementById("edit-rec-tec-tkt");
    const editRep = document.getElementById("edit-rec-tec-rep");
    if (editRec) editRec.innerHTML = buildOptions();
    if (editTkt) editTkt.innerHTML = buildOptions();
    if (editRep) editRep.innerHTML = buildOptions(true);
  }

  connectDatabase() {
    const loginStatus = document.getElementById("login-status-msg");
    const loginBtn = document.getElementById("btn-login-submit");
    const statusBadge = document.getElementById("db-status-badge");
    const errorBanner = document.getElementById("db-error-banner");
    const errorText = document.getElementById("db-error-text");

    this.dbService.initAuth(
      () => {
        this.dbService.subscribeUsers((users) => {
          this.usersList = users;
          loginStatus.textContent = `Conexión lista (${users.length} cuentas autorizadas)`;
          loginStatus.className = "text-xs text-center text-emerald-800 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-lg";
          loginBtn.disabled = false;

          this.syncPersonnelSelects();
          this.restoreSavedSession();
          if (this.currentUser) this.refreshUI();
        });

        this.dbService.subscribeRecords(
          (records) => {
            this.allRecords = records;
            errorBanner.classList.add("hidden");
            statusBadge.className =
              "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
            statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Firestore en vivo`;
            if (this.currentUser) this.refreshUI();
          },
          (errMsg) => {
            errorBanner.classList.remove("hidden");
            errorText.textContent = errMsg;
          }
        );
      },
      (authErr) => {
        loginStatus.textContent = authErr;
        loginStatus.className = "text-xs text-center text-red-700 bg-red-50 border border-red-200 py-2 px-3 rounded-lg";
      }
    );
  }

  restoreSavedSession() {
    if (this.currentUser) return;
    const savedUsername = sessionStorage.getItem("soporte_ti_user");
    if (!savedUsername) return;

    const found = this.usersList.find((u) => u.usuario === savedUsername);
    if (found) {
      this.applyLoggedInUser(found);
    }
  }

  async applyLoggedInUser(userObj) {
    this.currentUser = userObj;
    sessionStorage.setItem("soporte_ti_user", userObj.usuario);

    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("hidden");
    document.getElementById("app-shell").classList.add("flex");

    document.getElementById("header-user-name").textContent = userObj.nombre;
    document.getElementById("header-user-role").textContent = userObj.rol;

    const adminTab = document.getElementById("nav-tab-admin");
    if (userObj.rol === "ADMIN") {
      await this.ensureAdminViewLoaded();
      adminTab.classList.remove("hidden");
      adminTab.classList.add("inline-flex");
    } else {
      adminTab.classList.add("hidden");
      adminTab.classList.remove("inline-flex");
      document.getElementById("container-admin").innerHTML = "";
      this.adminViewLoaded = false;
    }

    this.syncPersonnelSelects();
    this.refreshUI();
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem("soporte_ti_user");
    document.getElementById("app-shell").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("flex");
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("login-password").value = "";
    this.switchTab("general");
  }

  startLiveClock() {
    setInterval(() => {
      if (!this.manualTimeEdited) {
        const horaInput = document.getElementById("rec-hora");
        if (horaInput) horaInput.value = getCurrentTimeString();
      }
      if (this.currentUser && (this.activeTab === "general" || this.activeTab === "soporte")) {
        this.refreshUI();
      }
    }, 5000);
  }

  bindEvents() {
    this.bind("form-login", "submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value.trim();
      const errBox = document.getElementById("login-error");

      const matched = this.usersList.find(
        (u) => u.usuario.toLowerCase() === username && String(u.password) === password
      );

      if (!matched) {
        errBox.textContent = "Usuario o contraseña incorrectos.";
        errBox.classList.remove("hidden");
        return;
      }

      errBox.classList.add("hidden");
      await this.applyLoggedInUser(matched);
      this.toast.show(`Bienvenido, ${matched.nombre} (${matched.rol})`, "success");
    });

    this.bind("btn-logout", "click", () => this.logout());

    document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });

    this.bind("btn-date-yesterday", "click", () => {
      this.selectedDate = getLocalDateString(-1);
      this.refreshUI();
    });
    this.bind("btn-date-today", "click", () => {
      this.selectedDate = getLocalDateString(0);
      this.refreshUI();
    });
    this.bind("input-selected-date", "change", (e) => {
      if (e.target.value) {
        this.selectedDate = e.target.value;
        this.refreshUI();
      }
    });

    this.bind("input-daily-search", "input", (e) => {
      this.dailySearchQuery = e.target.value;
      const clearBtn = document.getElementById("btn-clear-daily-search");
      if (clearBtn) clearBtn.classList.toggle("hidden", !this.dailySearchQuery);
      this.refreshUI();
    });
    this.bind("btn-clear-daily-search", "click", () => {
      this.dailySearchQuery = "";
      const dailyInput = document.getElementById("input-daily-search");
      const clearBtn = document.getElementById("btn-clear-daily-search");
      if (dailyInput) dailyInput.value = "";
      if (clearBtn) clearBtn.classList.add("hidden");
      this.refreshUI();
    });

    this.bind("btn-new-reception-date", "click", () => {
      const recFecha = document.getElementById("rec-fecha");
      if (recFecha) recFecha.value = this.selectedDate;
      this.switchTab("recepcion");
    });

    this.bind("btn-focus-scanner", "click", () => {
      const scannerInput = document.getElementById("rec-serie");
      if (scannerInput) scannerInput.focus();
    });
    this.bind("rec-serie", "keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const scannerInput = e.target;
        const cleaned = scannerInput.value.trim().toUpperCase();
        if (cleaned) {
          scannerInput.value = cleaned;
          const badge = document.getElementById("scan-flash-badge");
          if (badge) {
            badge.classList.remove("hidden");
            setTimeout(() => badge.classList.add("hidden"), 1800);
          }
          const ceEl = document.getElementById("rec-codigo-ce");
          if (ceEl) ceEl.focus();
        }
      }
    });

    this.bind("btn-rec-hoy", "click", () => {
      document.getElementById("rec-fecha").value = getLocalDateString(0);
    });
    this.bind("rec-hora", "input", () => {
      this.manualTimeEdited = true;
    });
    this.bind("btn-rec-ahora", "click", () => {
      this.manualTimeEdited = false;
      document.getElementById("rec-hora").value = getCurrentTimeString();
    });
    this.bind("btn-same-tech", "click", () => {
      if (this.currentUser) {
        document.getElementById("rec-tecnico-ticket").value = this.currentUser.nombre;
      }
    });

    this.bind("btn-cargador-si", "click", () => {
      this.traeCargador = true;
      document.getElementById("btn-cargador-si").className = "py-2.5 px-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1.5 transition bg-emerald-600 text-white border-emerald-600 shadow-sm";
      document.getElementById("btn-cargador-no").className = "py-2.5 px-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1.5 transition bg-white text-slate-600 border-slate-300 hover:bg-slate-50";
    });
    this.bind("btn-cargador-no", "click", () => {
      this.traeCargador = false;
      document.getElementById("btn-cargador-no").className = "py-2.5 px-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1.5 transition bg-rose-600 text-white border-rose-600 shadow-sm";
      document.getElementById("btn-cargador-si").className = "py-2.5 px-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1.5 transition bg-white text-slate-600 border-slate-300 hover:bg-slate-50";
    });

    this.bind("rec-codigo-ce", "input", (e) => {
      const ceInput = e.target;
      ceInput.value = ceInput.value.replace(/\D/g, "").slice(0, 5);
      const counter = document.getElementById("ce-digits-counter");
      if (counter) {
        counter.textContent = `${ceInput.value.length}/5`;
        counter.className = `text-[11px] font-mono font-bold ${
          ceInput.value.length === 5 ? "text-emerald-600" : "text-slate-400"
        }`;
      }
    });

    this.bind("btn-tipo-estudiante", "click", () => {
      this.tipoBeneficiario = "Estudiante";
      document.getElementById("btn-tipo-estudiante").className = "px-4 py-2 rounded-lg text-xs font-bold transition bg-slate-900 text-white shadow";
      document.getElementById("btn-tipo-docente").className = "px-4 py-2 rounded-lg text-xs font-bold transition text-slate-600 hover:text-slate-900";
      document.getElementById("label-id-beneficiario").textContent = "NIE del estudiante *";
      document.getElementById("label-nombre-beneficiario").textContent = "Nombre del estudiante *";
      document.getElementById("rec-grado").value = "1° Grado";
    });
    this.bind("btn-tipo-docente", "click", () => {
      this.tipoBeneficiario = "Docente";
      document.getElementById("btn-tipo-docente").className = "px-4 py-2 rounded-lg text-xs font-bold transition bg-slate-900 text-white shadow";
      document.getElementById("btn-tipo-estudiante").className = "px-4 py-2 rounded-lg text-xs font-bold transition text-slate-600 hover:text-slate-900";
      document.getElementById("label-id-beneficiario").textContent = "DUI del docente *";
      document.getElementById("label-nombre-beneficiario").textContent = "Nombre del docente *";
      document.getElementById("rec-grado").value = "Docente / No aplica";
    });

    this.bind("damage-chips-container", "click", (e) => {
      const btn = e.target.closest(".damage-chip");
      if (!btn) return;
      const falla = btn.dataset.falla;
      const textarea = document.getElementById("rec-dano");
      const parts = textarea.value.split(",").map((p) => p.trim()).filter(Boolean);
      textarea.value = parts.includes(falla)
        ? parts.filter((p) => p !== falla).join(", ")
        : [...parts, falla].join(", ");
    });

    this.bind("form-recepcion", "submit", (e) => this.handleReceptionSubmit(e));

    document.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-action]");
      if (actionBtn) {
        const record = this.allRecords.find((r) => r.id === actionBtn.dataset.id);
        if (!record) return;

        const action = actionBtn.dataset.action;
        if (action === "detail") this.openDetailModal(record);
        if (action === "grab") this.grabEquipmentDirectly(record);
        if (action === "finish") this.openFinishModal(record);
        if (action === "edit" && this.currentUser?.rol === "ADMIN") this.openEditRecordModal(record);
        if (action === "delete" && this.currentUser?.rol === "ADMIN") this.openDeleteModal(record);
      }

      const userBtn = e.target.closest("[data-user-action]");
      if (userBtn && this.currentUser?.rol === "ADMIN") {
        const targetUser = this.usersList.find((u) => u.id === userBtn.dataset.uid);
        if (!targetUser) return;

        if (userBtn.dataset.userAction === "edit") {
          document.getElementById("admin-user-id").value = targetUser.id;
          document.getElementById("admin-user-nombre").value = targetUser.nombre;
          document.getElementById("admin-user-rol").value = targetUser.rol;
          document.getElementById("admin-user-username").value = targetUser.usuario;
          document.getElementById("admin-user-password").value = targetUser.password;
          document.getElementById("admin-form-title").textContent = "Editando Usuario";
          document.getElementById("btn-cancel-edit-user").classList.remove("hidden");
        }

        if (userBtn.dataset.userAction === "delete") {
          if (targetUser.id === this.currentUser.id) {
            this.toast.show("No puedes eliminar tu propio usuario activo.", "error");
            return;
          }
          this.dbService.deleteUser(targetUser.id).then(() => {
            this.toast.show(`Usuario ${targetUser.nombre} eliminado.`, "success");
          });
        }
      }
    });

    this.bind("btn-close-edit-record", "click", () => this.closeModal("modal-edit-record"));
    this.bind("btn-cancel-edit-record", "click", () => this.closeModal("modal-edit-record"));
    this.bind("form-edit-record", "submit", (e) => this.confirmAdminEditRecord(e));

    this.bind("btn-cancel-finish", "click", () => this.closeModal("modal-finish"));
    this.bind("btn-close-finish", "click", () => this.closeModal("modal-finish"));
    this.bind("btn-confirm-finish", "click", () => this.confirmFinishRepair());

    this.bind("btn-close-detail", "click", () => this.closeModal("modal-detail"));
    this.bind("btn-close-detail-footer", "click", () => this.closeModal("modal-detail"));

    this.bind("btn-cancel-delete", "click", () => this.closeModal("modal-delete"));
    this.bind("btn-confirm-delete", "click", () => this.confirmDeleteRecord());

    ["global-search", "global-date", "global-status", "global-resolution"].forEach((id) => {
      this.bind(id, "input", () => this.refreshUI());
      this.bind(id, "change", () => this.refreshUI());
    });

    this.bind("btn-clear-global-filters", "click", () => {
      document.getElementById("global-search").value = "";
      document.getElementById("global-date").value = "";
      document.getElementById("global-status").value = "TODOS";
      document.getElementById("global-resolution").value = "TODAS";
      this.refreshUI();
    });

    this.bind("btn-export-csv", "click", () => {
      const list = this.getFilteredGlobalRecords();
      if (list.length === 0) {
        this.toast.show("No hay registros para exportar.", "error");
        return;
      }
      exportRecordsToCSV(list);
      this.toast.show(`Exportados ${list.length} registros a CSV.`, "success");
    });
  }

  bindAdminEvents() {
    this.bind("form-admin-user", "submit", async (e) => {
      e.preventDefault();
      if (this.currentUser?.rol !== "ADMIN") return;

      const userId = document.getElementById("admin-user-id").value;
      const nombre = document.getElementById("admin-user-nombre").value.trim();
      const rol = document.getElementById("admin-user-rol").value;
      const usuario = document.getElementById("admin-user-username").value.trim().toLowerCase();
      const password = document.getElementById("admin-user-password").value.trim();

      const duplicate = this.usersList.find((u) => u.usuario.toLowerCase() === usuario && u.id !== userId);
      if (duplicate) {
        this.toast.show("Ese nombre de usuario ya existe. Elige otro.", "error");
        return;
      }

      try {
        if (userId) {
          await this.dbService.updateUser(userId, { nombre, rol, usuario, password });
          this.toast.show(`Usuario ${nombre} actualizado.`, "success");
        } else {
          await this.dbService.createUser({ nombre, rol, usuario, password, activo: true });
          this.toast.show(`Usuario ${nombre} (${rol}) creado.`, "success");
        }
        this.resetAdminUserForm();
      } catch (err) {
        this.toast.show("Error al guardar usuario.", "error");
      }
    });

    this.bind("btn-cancel-edit-user", "click", () => this.resetAdminUserForm());
  }

  resetAdminUserForm() {
    document.getElementById("admin-user-id").value = "";
    document.getElementById("admin-user-nombre").value = "";
    document.getElementById("admin-user-rol").value = "LOGISTICA";
    document.getElementById("admin-user-username").value = "";
    document.getElementById("admin-user-password").value = "";
    document.getElementById("admin-form-title").textContent = "Registrar / Editar Personal";
    document.getElementById("btn-cancel-edit-user").classList.add("hidden");
  }

  switchTab(tabName) {
    if (tabName === "admin" && this.currentUser?.rol !== "ADMIN") return;
    this.activeTab = tabName;

    document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
      const isSelected = btn.dataset.tab === tabName;
      if (btn.dataset.tab === "admin") {
        btn.className = `nav-tab-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition border border-amber-500/30 ${
          isSelected ? "bg-amber-500 text-slate-950 shadow-md" : "text-amber-300 hover:bg-slate-800"
        }`;
      } else {
        btn.className = `nav-tab-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
          isSelected ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`;
      }
    });

    ["general", "recepcion", "soporte", "historial", "admin"].forEach((view) => {
      const el = document.getElementById(`view-${view}`);
      if (el) el.classList.toggle("hidden", view !== tabName);
    });

    const controlBar = document.getElementById("daily-control-bar");
    if (controlBar) {
      controlBar.classList.toggle("hidden", tabName !== "general" && tabName !== "soporte");
    }

    if (tabName === "recepcion") {
      setTimeout(() => {
        const serieEl = document.getElementById("rec-serie");
        if (serieEl) serieEl.focus();
      }, 100);
    }
    this.refreshUI();
  }

  getFilteredGlobalRecords() {
    const searchEl = document.getElementById("global-search");
    if (!searchEl) return this.allRecords;

    const q = searchEl.value.trim().toLowerCase();
    const dateFilter = document.getElementById("global-date").value;
    const statusFilter = document.getElementById("global-status").value;
    const resFilter = document.getElementById("global-resolution").value;

    const hasFilters = q || dateFilter || statusFilter !== "TODOS" || resFilter !== "TODAS";
    const clearBtn = document.getElementById("btn-clear-global-filters");
    if (clearBtn) clearBtn.classList.toggle("hidden", !hasFilters);

    return this.allRecords
      .filter((item) => {
        if (dateFilter && item.fecha !== dateFilter) return false;
        if (statusFilter !== "TODOS" && item.estado !== statusFilter) return false;
        if (resFilter !== "TODAS" && item.resolucion !== resFilter) return false;
        if (!q) return true;

        return (
          (item.serieEquipo || "").toLowerCase().includes(q) ||
          (item.identificacionBeneficiario || "").toLowerCase().includes(q) ||
          (item.nombreBeneficiario || "").toLowerCase().includes(q) ||
          (item.codigoCE || "").toLowerCase().includes(q) ||
          (item.nombreCE || "").toLowerCase().includes(q) ||
          (item.tecnicoRecepcion || "").toLowerCase().includes(q) ||
          (item.tecnicoReparacion || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return (b.fecha || "").localeCompare(a.fecha || "");
        return (b.recepcionTimestamp || 0) - (a.recepcionTimestamp || 0);
      });
  }

  refreshUI() {
    const nowTimestamp = Date.now();
    const isAdmin = this.currentUser?.rol === "ADMIN";

    const dailyRecords = this.allRecords
      .filter((item) => item.fecha === this.selectedDate)
      .sort((a, b) => (b.recepcionTimestamp || 0) - (a.recepcionTimestamp || 0));

    const q = this.dailySearchQuery.trim().toLowerCase();
    const filteredDaily = !q
      ? dailyRecords
      : dailyRecords.filter(
          (item) =>
            (item.serieEquipo || "").toLowerCase().includes(q) ||
            (item.identificacionBeneficiario || "").toLowerCase().includes(q) ||
            (item.nombreBeneficiario || "").toLowerCase().includes(q) ||
            (item.codigoCE || "").toLowerCase().includes(q) ||
            (item.nombreCE || "").toLowerCase().includes(q) ||
            (item.nombreResponsable || "").toLowerCase().includes(q) ||
            (item.tecnicoRecepcion || "").toLowerCase().includes(q) ||
            (item.tecnicoTicket || "").toLowerCase().includes(q) ||
            (item.tecnicoReparacion || "").toLowerCase().includes(q)
        );

    this.ui.updateDailyHeader(this.selectedDate, filteredDaily.length, dailyRecords.length);
    this.ui.renderGeneralDashboard(this.selectedDate, dailyRecords, filteredDaily, this.dailySearchQuery, nowTimestamp, isAdmin);
    this.ui.renderSupportBoard(this.selectedDate, filteredDaily, nowTimestamp, this.currentUser);
    this.ui.renderGlobalHistory(this.allRecords.length, this.getFilteredGlobalRecords(), isAdmin);

    if (isAdmin && this.adminViewLoaded) {
      this.ui.renderAdminPanel(this.usersList, this.allRecords);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  async handleReceptionSubmit(e) {
    e.preventDefault();
    if (!this.currentUser) return;

    const codigoCE = document.getElementById("rec-codigo-ce").value.trim();
    if (!/^\d{5}$/.test(codigoCE)) {
      this.toast.show("El Código del CE debe tener exactamente 5 dígitos numéricos.", "error");
      return;
    }

    const fecha = document.getElementById("rec-fecha").value;
    const horaRecepcion = document.getElementById("rec-hora").value || getCurrentTimeString();
    const serieEquipo = document.getElementById("rec-serie").value.trim().toUpperCase();

    const newRecord = {
      fecha,
      tipoBeneficiario: this.tipoBeneficiario,
      identificacionBeneficiario: document.getElementById("rec-id-beneficiario").value.trim(),
      nombreBeneficiario: document.getElementById("rec-nombre-beneficiario").value.trim(),
      serieEquipo,
      celular: document.getElementById("rec-celular").value.trim(),
      duiResponsable: document.getElementById("rec-dui-responsable").value.trim(),
      nombreResponsable: document.getElementById("rec-nombre-responsable").value.trim(),
      codigoCE,
      nombreCE: document.getElementById("rec-nombre-ce").value.trim(),
      grado: document.getElementById("rec-grado").value,
      danoReportado: document.getElementById("rec-dano").value.trim(),
      traeCargador: this.traeCargador,
      tecnicoRecepcion: this.currentUser.nombre,
      tecnicoTicket: document.getElementById("rec-tecnico-ticket").value,
      creadoPorUsuario: this.currentUser.usuario,
      creadoPorNombre: this.currentUser.nombre,
      horaRecepcion,
      recepcionTimestamp: buildLocalTimestamp(fecha, horaRecepcion),
      estado: "En espera",
      tecnicoReparacion: "",
      horaInicioReparacion: null,
      inicioReparacionTimestamp: null,
      tiempoEsperaMinutos: null,
      horaFinReparacion: null,
      horaFinalizacionProceso: null,
      finReparacionTimestamp: null,
      tiempoReparacionMinutos: null,
      resolucion: "",
      notaTecnica: "",
      historialCorrecciones: [],
      createdAt: Date.now()
    };

    try {
      await this.dbService.createRecord(newRecord);
      this.selectedDate = fecha;
      this.toast.show(`Equipo ${serieEquipo} recepcionado por ${this.currentUser.nombre}.`, "success");

      this.manualTimeEdited = false;
      document.getElementById("rec-hora").value = getCurrentTimeString();
      document.getElementById("rec-serie").value = "";
      document.getElementById("rec-id-beneficiario").value = "";
      document.getElementById("rec-nombre-beneficiario").value = "";
      document.getElementById("rec-celular").value = "";
      document.getElementById("rec-dui-responsable").value = "";
      document.getElementById("rec-nombre-responsable").value = "";
      document.getElementById("rec-dano").value = "";
      document.getElementById("rec-serie").focus();
    } catch (err) {
      this.toast.show("Error al guardar en Firestore.", "error");
    }
  }

  async grabEquipmentDirectly(record) {
    if (!this.currentUser) return;
    const tech = this.currentUser.nombre;
    const now = Date.now();
    const horaInicio = getCurrentTimeString();
    const baseRec = record.recepcionTimestamp || buildLocalTimestamp(record.fecha, record.horaRecepcion);
    const esperaMin = Math.max(0, Math.round((now - baseRec) / 60000));

    try {
      await this.dbService.updateRecord(record.id, {
        estado: "En reparación",
        tecnicoReparacion: tech,
        horaInicioReparacion: horaInicio,
        inicioReparacionTimestamp: now,
        tiempoEsperaMinutos: esperaMin
      });
      this.toast.show(`Equipo ${record.serieEquipo} asignado a ${tech} a las ${horaInicio}.`, "info");
    } catch (err) {
      this.toast.show("No se pudo asignar el equipo.", "error");
    }
  }

  openFinishModal(record) {
    this.activeRecordForModal = record;
    this.selectedResolution = "Reparación en sede";
    document.getElementById("finish-nota").value = "";
    document.getElementById("finish-info-box").innerHTML = `
      <div><span class="text-slate-500 block">Equipo:</span><strong class="font-mono text-sm">${record.serieEquipo}</strong></div>
      <div class="text-right"><span class="text-slate-500 block">Técnico Reparador:</span><strong class="text-blue-800">${record.tecnicoReparacion}</strong></div>
    `;

    const container = document.getElementById("finish-resolutions-container");
    const renderOptions = () => {
      container.innerHTML = OPCIONES_RESOLUCION.map((op) => {
        const isSelected = this.selectedResolution === op.id;
        return `
          <button type="button" data-res="${op.id}" class="res-option-btn w-full text-left p-3.5 rounded-xl border-2 transition ${
            isSelected ? op.colorCard : "border-slate-200 bg-white hover:bg-slate-50"
          }">
            <p class="text-sm font-bold text-slate-900">${op.titulo}</p>
            <p class="text-xs text-slate-600 mt-0.5">${op.descripcion}</p>
          </button>
        `;
      }).join("");

      container.querySelectorAll(".res-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.selectedResolution = btn.dataset.res;
          renderOptions();
        });
      });
    };

    renderOptions();
    document.getElementById("modal-finish").classList.remove("hidden");
  }

  async confirmFinishRepair() {
    if (!this.activeRecordForModal) return;
    const record = this.activeRecordForModal;
    const now = Date.now();
    const horaFin = getCurrentTimeString();
    const baseIni = record.inicioReparacionTimestamp || now;
    const reparacionMin = Math.max(0, Math.round((now - baseIni) / 60000));

    try {
      await this.dbService.updateRecord(record.id, {
        estado: "Finalizado",
        resolucion: this.selectedResolution,
        notaTecnica: document.getElementById("finish-nota").value.trim(),
        horaFinReparacion: horaFin,
        horaFinalizacionProceso: horaFin,
        finReparacionTimestamp: now,
        tiempoReparacionMinutos: reparacionMin
      });
      this.toast.show(`Solventado (${this.selectedResolution}) a las ${horaFin}.`, "success");
      this.closeModal("modal-finish");
    } catch (err) {
      this.toast.show("Error al guardar la finalización.", "error");
    }
  }

  openEditRecordModal(record) {
    this.activeRecordForModal = record;
    document.getElementById("edit-rec-id").value = record.id;
    document.getElementById("edit-rec-fecha").value = record.fecha;
    document.getElementById("edit-rec-serie").value = record.serieEquipo;
    document.getElementById("edit-rec-cargador").value = String(Boolean(record.traeCargador));
    document.getElementById("edit-rec-codigo-ce").value = record.codigoCE;
    document.getElementById("edit-rec-nombre-ce").value = record.nombreCE;
    document.getElementById("edit-rec-tipo-ben").value = record.tipoBeneficiario || "Estudiante";
    document.getElementById("edit-rec-id-ben").value = record.identificacionBeneficiario;
    document.getElementById("edit-rec-nombre-ben").value = record.nombreBeneficiario;
    document.getElementById("edit-rec-grado").value = record.grado;
    document.getElementById("edit-rec-celular").value = record.celular || "";
    document.getElementById("edit-rec-dui-resp").value = record.duiResponsable || "";
    document.getElementById("edit-rec-nombre-resp").value = record.nombreResponsable || "";
    document.getElementById("edit-rec-dano").value = record.danoReportado;
    document.getElementById("edit-rec-tec-rec").value = record.tecnicoRecepcion;
    document.getElementById("edit-rec-tec-tkt").value = record.tecnicoTicket;
    document.getElementById("edit-rec-tec-rep").value = record.tecnicoReparacion || "";
    document.getElementById("edit-rec-estado").value = record.estado;
    document.getElementById("edit-rec-resolucion").value = record.resolucion || "";
    document.getElementById("edit-rec-motivo").value = "";

    document.getElementById("modal-edit-record").classList.remove("hidden");
  }

  async confirmAdminEditRecord(e) {
    e.preventDefault();
    if (!this.activeRecordForModal || this.currentUser?.rol !== "ADMIN") return;

    const oldRec = this.activeRecordForModal;
    const motivo = document.getElementById("edit-rec-motivo").value.trim();

    const resumenAnterior = `Serie: ${oldRec.serieEquipo} | CE: ${oldRec.codigoCE} | Beneficiario: ${oldRec.nombreBeneficiario} (${oldRec.identificacionBeneficiario}) | Rec: ${oldRec.tecnicoRecepcion} | Estado: ${oldRec.estado}`;

    const nuevaCorreccion = {
      fechaHora: `${getLocalDateString(0)} ${getCurrentTimeString()}`,
      adminNombre: this.currentUser.nombre,
      adminUsuario: this.currentUser.usuario,
      motivo,
      resumenAnterior
    };

    const historialPrevio = Array.isArray(oldRec.historialCorrecciones) ? oldRec.historialCorrecciones : [];

    const updatedFields = {
      fecha: document.getElementById("edit-rec-fecha").value,
      serieEquipo: document.getElementById("edit-rec-serie").value.trim().toUpperCase(),
      traeCargador: document.getElementById("edit-rec-cargador").value === "true",
      codigoCE: document.getElementById("edit-rec-codigo-ce").value.trim(),
      nombreCE: document.getElementById("edit-rec-nombre-ce").value.trim(),
      tipoBeneficiario: document.getElementById("edit-rec-tipo-ben").value,
      identificacionBeneficiario: document.getElementById("edit-rec-id-ben").value.trim(),
      nombreBeneficiario: document.getElementById("edit-rec-nombre-ben").value.trim(),
      grado: document.getElementById("edit-rec-grado").value,
      celular: document.getElementById("edit-rec-celular").value.trim(),
      duiResponsable: document.getElementById("edit-rec-dui-resp").value.trim(),
      nombreResponsable: document.getElementById("edit-rec-nombre-resp").value.trim(),
      danoReportado: document.getElementById("edit-rec-dano").value.trim(),
      tecnicoRecepcion: document.getElementById("edit-rec-tec-rec").value,
      tecnicoTicket: document.getElementById("edit-rec-tec-tkt").value,
      tecnicoReparacion: document.getElementById("edit-rec-tec-rep").value,
      estado: document.getElementById("edit-rec-estado").value,
      resolucion: document.getElementById("edit-rec-resolucion").value,
      historialCorrecciones: [...historialPrevio, nuevaCorreccion]
    };

    try {
      await this.dbService.updateRecord(oldRec.id, updatedFields);
      this.toast.show("Registro corregido y guardado en bitácora de auditoría.", "success");
      this.closeModal("modal-edit-record");
    } catch (err) {
      this.toast.show("Error al guardar la corrección.", "error");
    }
  }

  openDetailModal(record) {
    this.ui.renderDetailModal(record);
    document.getElementById("modal-detail").classList.remove("hidden");
  }

  openDeleteModal(record) {
    this.activeRecordForModal = record;
    document.getElementById("delete-info-text").innerHTML = `Estás por eliminar el equipo serie <strong class="font-mono">${record.serieEquipo}</strong> perteneciente a <strong>${record.nombreBeneficiario}</strong> (${record.fecha}).`;
    document.getElementById("modal-delete").classList.remove("hidden");
  }

  async confirmDeleteRecord() {
    if (!this.activeRecordForModal || this.currentUser?.rol !== "ADMIN") return;
    try {
      await this.dbService.deleteRecord(this.activeRecordForModal.id);
      this.toast.show(`Registro ${this.activeRecordForModal.serieEquipo} eliminado.`, "success");
      this.closeModal("modal-delete");
    } catch (err) {
      this.toast.show("No se pudo eliminar el registro.", "error");
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("hidden");
    this.activeRecordForModal = null;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new SoporteTIApp();
  app.init();
});