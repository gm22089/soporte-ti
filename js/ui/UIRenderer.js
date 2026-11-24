import { OPCIONES_RESOLUCION } from "../config/constants.js";
import {
  getLocalDateString,
  formatReadableDate,
  formatDurationMinutes,
  buildLocalTimestamp
} from "../utils/dateUtils.js";

export class UIRenderer {
  renderStatusBadge(estado) {
    if (estado === "En espera") {
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">En espera</span>`;
    }
    if (estado === "En reparación") {
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">En reparación</span>`;
    }
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Finalizado</span>`;
  }

  renderResolutionBadge(resolucion) {
    if (!resolucion) return `<span class="text-slate-400 text-xs italic">Pendiente</span>`;
    const found = OPCIONES_RESOLUCION.find((o) => o.id === resolucion);
    const badgeClass = found ? found.colorBadge : "bg-slate-100 text-slate-800 border-slate-300";
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${badgeClass}">${resolucion}</span>`;
  }

  renderRoleBadge(rol) {
    if (rol === "ADMIN") {
      return `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">ADMIN</span>`;
    }
    if (rol === "LOGISTICA") {
      return `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">LOGÍSTICA</span>`;
    }
    return `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">TÉCNICO</span>`;
  }

  updateDailyHeader(selectedDate, filteredCount, totalDayCount) {
    const today = getLocalDateString(0);
    const yesterday = getLocalDateString(-1);

    const tagEl = document.getElementById("daily-tag-badge");
    if (selectedDate === today) {
      tagEl.textContent = "HOY";
      tagEl.className = "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-blue-600 text-white";
    } else if (selectedDate === yesterday) {
      tagEl.textContent = "AYER";
      tagEl.className = "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-slate-600 text-white";
    } else {
      tagEl.textContent = "FECHA SELECCIONADA";
      tagEl.className = "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-slate-200 text-slate-700";
    }

    document.getElementById("daily-readable-date").textContent = formatReadableDate(selectedDate);
    document.getElementById("input-selected-date").value = selectedDate;
    document.getElementById("daily-filter-count").textContent = `${filteredCount} de ${totalDayCount} registros`;
  }

  renderGeneralDashboard(selectedDate, dailyRecords, filteredDailyRecords, dailySearchQuery, nowTimestamp, isAdmin) {
    const total = dailyRecords.length;
    const enEspera = dailyRecords.filter((r) => r.estado === "En espera").length;
    const enReparacion = dailyRecords.filter((r) => r.estado === "En reparación").length;
    const finalizados = dailyRecords.filter((r) => r.estado === "Finalizado").length;

    const repSede = dailyRecords.filter((r) => r.resolucion === "Reparación en sede").length;
    const atencionEfectiva = dailyRecords.filter((r) => r.resolucion === "Atención efectiva").length;
    const garantia = dailyRecords.filter((r) => r.resolucion === "Enviar a Garantía").length;

    let sumaEspera = 0;
    let conteoEspera = 0;
    dailyRecords.forEach((r) => {
      if (typeof r.tiempoEsperaMinutos === "number") {
        sumaEspera += r.tiempoEsperaMinutos;
        conteoEspera += 1;
      } else if (r.estado === "En espera" && r.recepcionTimestamp) {
        sumaEspera += Math.max(0, Math.round((nowTimestamp - r.recepcionTimestamp) / 60000));
        conteoEspera += 1;
      }
    });
    const promedioEspera = conteoEspera > 0 ? Math.round(sumaEspera / conteoEspera) : 0;

    document.getElementById("kpi-total").textContent = total;
    document.getElementById("kpi-total-sub").textContent = `Equipos ingresados el ${selectedDate}`;
    document.getElementById("kpi-espera").textContent = enEspera;
    document.getElementById("kpi-reparacion").textContent = enReparacion;
    document.getElementById("kpi-finalizados").textContent = finalizados;
    document.getElementById("kpi-promedio-espera").textContent = formatDurationMinutes(promedioEspera);
    document.getElementById("kpi-res-sede").textContent = repSede;
    document.getElementById("kpi-res-efectiva").textContent = atencionEfectiva;
    document.getElementById("kpi-res-garantia").textContent = garantia;

    document.getElementById("badge-nav-general").textContent = total;
    const navEsp = document.getElementById("badge-nav-espera");
    const navRep = document.getElementById("badge-nav-reparacion");
    navEsp.textContent = enEspera;
    navEsp.classList.toggle("hidden", enEspera === 0);
    navRep.textContent = enReparacion;
    navRep.classList.toggle("hidden", enReparacion === 0);

    document.getElementById("general-table-title").textContent = `Listado General de Equipos — ${selectedDate}`;

    const emptyState = document.getElementById("general-empty-state");
    const tableWrapper = document.getElementById("general-table-wrapper");
    const tbody = document.getElementById("general-table-body");

    if (filteredDailyRecords.length === 0) {
      emptyState.classList.remove("hidden");
      tableWrapper.classList.add("hidden");
      document.getElementById("general-empty-title").textContent = `Sin registros para mostrar en ${selectedDate}`;
      document.getElementById("general-empty-desc").textContent = dailySearchQuery
        ? "No hay coincidencias con tu búsqueda dentro de esta fecha."
        : "Aún no se han recepcionado equipos en esta fecha.";
      return;
    }

    emptyState.classList.add("hidden");
    tableWrapper.classList.remove("hidden");

    tbody.innerHTML = filteredDailyRecords
      .map((item) => {
        const waitMinutes =
          typeof item.tiempoEsperaMinutos === "number"
            ? item.tiempoEsperaMinutos
            : item.recepcionTimestamp
            ? Math.max(0, Math.round((nowTimestamp - item.recepcionTimestamp) / 60000))
            : 0;

        const hasCorrections = Array.isArray(item.historialCorrecciones) && item.historialCorrecciones.length > 0;

        const adminButtons = isAdmin
          ? `<button type="button" data-action="edit" data-id="${item.id}" class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition" title="Corregir registro (Admin)">
               <i data-lucide="edit-3" class="w-4 h-4 pointer-events-none"></i>
             </button>
             <button type="button" data-action="delete" data-id="${item.id}" class="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition" title="Eliminar registro (Admin)">
               <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
             </button>`
          : "";

        return `
          <tr class="hover:bg-slate-50/90 transition align-top ${hasCorrections ? "bg-amber-50/20" : ""}">
            <td class="py-3 px-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap">${item.horaRecepcion}</td>
            <td class="py-3 px-3.5 whitespace-nowrap">
              <span class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-300">${item.serieEquipo}</span>
              ${hasCorrections ? `<span class="block mt-1 text-[10px] font-bold text-amber-700">✎ Corregido (${item.historialCorrecciones.length})</span>` : ""}
            </td>
            <td class="py-3 px-3.5 min-w-[170px]">
              <span class="inline-block font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mr-1.5">${item.codigoCE}</span>
              <span class="font-semibold text-slate-800">${item.nombreCE}</span>
            </td>
            <td class="py-3 px-3.5 min-w-[170px]">
              <div class="font-bold text-slate-900">${item.nombreBeneficiario}</div>
              <div class="text-slate-500 mt-0.5">
                <span class="font-semibold text-slate-700">${item.tipoBeneficiario === "Docente" ? "DUI:" : "NIE:"}</span>
                ${item.identificacionBeneficiario} • ${item.grado}
              </div>
            </td>
            <td class="py-3 px-3.5 min-w-[150px]">
              <div class="font-medium text-slate-800">${item.nombreResponsable || "—"}</div>
              <div class="text-slate-500 mt-0.5">
                ${item.duiResponsable ? `DUI: ${item.duiResponsable}` : ""}
                ${item.celular ? ` • Tel: ${item.celular}` : ""}
              </div>
            </td>
            <td class="py-3 px-3.5 min-w-[160px]">
              <p class="text-slate-800 font-medium">${item.danoReportado}</p>
              <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                item.traeCargador
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }">
                ${item.traeCargador ? "Con cargador" : "Sin cargador"}
              </span>
            </td>
            <td class="py-3 px-3.5 min-w-[155px]">
              <div><span class="text-slate-400">Rec:</span> <span class="font-semibold text-slate-800">${item.tecnicoRecepcion}</span></div>
              <div class="mt-0.5"><span class="text-slate-400">Ticket:</span> <span class="font-medium text-slate-700">${item.tecnicoTicket}</span></div>
            </td>
            <td class="py-3 px-3.5 min-w-[175px]">
              ${
                item.tecnicoReparacion
                  ? `<div class="font-bold text-blue-800">${item.tecnicoReparacion}</div>
                     <div class="text-[11px] text-slate-600 font-mono mt-0.5">Agarró: ${item.horaInicioReparacion || "—"}</div>
                     <div class="text-[11px] text-emerald-700 font-mono">Solventó: ${item.horaFinalizacionProceso || "En curso"}</div>`
                  : `<span class="text-slate-400 italic">Sin técnico asignado</span>`
              }
            </td>
            <td class="py-3 px-3.5 whitespace-nowrap">
              <span class="font-bold ${item.estado === "En espera" ? "text-amber-700" : "text-slate-700"}">${formatDurationMinutes(waitMinutes)}</span>
            </td>
            <td class="py-3 px-3.5 whitespace-nowrap space-y-1.5">
              <div>${this.renderStatusBadge(item.estado)}</div>
              ${item.resolucion ? `<div>${this.renderResolutionBadge(item.resolucion)}</div>` : ""}
            </td>
            <td class="py-3 px-3.5 text-right whitespace-nowrap">
              <button type="button" data-action="detail" data-id="${item.id}" class="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition" title="Ver ficha completa">
                <i data-lucide="eye" class="w-4 h-4 pointer-events-none"></i>
              </button>
              ${adminButtons}
            </td>
          </tr>
        `;
      })
      .join("");
  }

  renderSupportBoard(selectedDate, filteredDailyRecords, nowTimestamp, currentUser) {
    const esperaList = filteredDailyRecords.filter((r) => r.estado === "En espera");
    const repList = filteredDailyRecords.filter((r) => r.estado === "En reparación");
    const finList = filteredDailyRecords.filter((r) => r.estado === "Finalizado");

    document.getElementById("count-col-espera").textContent = esperaList.length;
    document.getElementById("count-col-reparacion").textContent = repList.length;
    document.getElementById("count-col-finalizados").textContent = finList.length;

    const currentUserName = currentUser ? currentUser.nombre : "Técnico";

    // COLUMNA 1: EN ESPERA (Al dar clic, asigna automáticamente al usuario logueado)
    const colEspera = document.getElementById("list-col-espera");
    colEspera.innerHTML =
      esperaList.length === 0
        ? `<div class="text-center py-8 px-4 text-slate-400 text-xs">No hay equipos en espera para ${selectedDate}.</div>`
        : esperaList
            .map((item) => {
              const baseRec = item.recepcionTimestamp || buildLocalTimestamp(item.fecha, item.horaRecepcion);
              const liveWaitMin = Math.max(0, Math.round((nowTimestamp - baseRec) / 60000));
              return `
                <div class="p-4 rounded-xl border border-amber-200 bg-amber-50/30 hover:border-amber-400 transition space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <span class="font-mono font-extrabold text-sm text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300">${item.serieEquipo}</span>
                      <p class="text-xs font-bold text-slate-800 mt-2">${item.nombreBeneficiario}</p>
                      <p class="text-[11px] text-slate-500">CE ${item.codigoCE} — ${item.nombreCE}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        Espera: ${formatDurationMinutes(liveWaitMin)}
                      </span>
                      <span class="block text-[11px] font-mono text-slate-600 mt-1">Recibido: ${item.horaRecepcion}</span>
                    </div>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span class="font-bold text-slate-600">Daño: </span><span class="text-slate-800">${item.danoReportado}</span>
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Recibió: ${item.tecnicoRecepcion}</span>
                    <span class="font-bold ${item.traeCargador ? "text-emerald-700" : "text-rose-600"}">
                      ${item.traeCargador ? "Con cargador" : "Sin cargador"}
                    </span>
                  </div>
                  <button type="button" data-action="grab" data-id="${item.id}" class="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2 transition">
                    <i data-lucide="play" class="w-4 h-4 pointer-events-none"></i>
                    Agarrar Equipo (${currentUserName})
                  </button>
                </div>
              `;
            })
            .join("");

    // COLUMNA 2: EN REPARACIÓN (Muestra hora exacta en que agarró el equipo)
    const colRep = document.getElementById("list-col-reparacion");
    colRep.innerHTML =
      repList.length === 0
        ? `<div class="text-center py-8 px-4 text-slate-400 text-xs">No hay equipos reparándose actualmente en ${selectedDate}.</div>`
        : repList
            .map((item) => {
              const baseIni = item.inicioReparacionTimestamp || nowTimestamp;
              const liveRepairMin = Math.max(0, Math.round((nowTimestamp - baseIni) / 60000));
              return `
                <div class="p-4 rounded-xl border-2 border-blue-300 bg-blue-50/30 space-y-3">
                  <div class="flex items-center justify-between bg-blue-900 text-white px-3 py-2 rounded-lg">
                    <span class="text-xs font-bold flex items-center gap-1.5">
                      <i data-lucide="user-check" class="w-3.5 h-3.5 text-sky-300"></i>
                      ${item.tecnicoReparacion}
                    </span>
                    <span class="text-[11px] font-mono bg-blue-800 px-2 py-0.5 rounded">Agarró: ${item.horaInicioReparacion}</span>
                  </div>
                  <div>
                    <span class="font-mono font-extrabold text-sm text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300">${item.serieEquipo}</span>
                    <p class="text-xs font-bold text-slate-800 mt-2">${item.nombreBeneficiario}</p>
                    <p class="text-[11px] text-slate-500">CE ${item.codigoCE} — ${item.nombreCE}</p>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span class="font-bold text-slate-600">Daño: </span><span class="text-slate-800">${item.danoReportado}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="bg-slate-100 p-2 rounded-lg">
                      <span class="text-slate-500 block">Recepción: <strong>${item.horaRecepcion}</strong></span>
                      <span class="text-slate-600 block">Esperó: <strong>${formatDurationMinutes(item.tiempoEsperaMinutos)}</strong></span>
                    </div>
                    <div class="bg-blue-100 p-2 rounded-lg">
                      <span class="text-blue-700 block">En taller:</span>
                      <span class="font-extrabold text-blue-950 text-xs">${formatDurationMinutes(liveRepairMin)}</span>
                    </div>
                  </div>
                  <button type="button" data-action="finish" data-id="${item.id}" class="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 transition">
                    <i data-lucide="check-square" class="w-4 h-4 pointer-events-none"></i>
                    Solventar / Finalizar Proceso
                  </button>
                </div>
              `;
            })
            .join("");

    // COLUMNA 3: FINALIZADOS (Muestra hora recepción, hora agarrado y hora solventado)
    const colFin = document.getElementById("list-col-finalizados");
    colFin.innerHTML =
      finList.length === 0
        ? `<div class="text-center py-8 px-4 text-slate-400 text-xs">Aún no hay equipos finalizados en ${selectedDate}.</div>`
        : finList
            .map(
              (item) => `
              <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/25 space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono font-extrabold text-xs text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300">${item.serieEquipo}</span>
                  ${this.renderResolutionBadge(item.resolucion)}
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-800">${item.nombreBeneficiario}</p>
                  <p class="text-[11px] text-slate-600">Solventado por: <strong class="text-slate-900">${item.tecnicoReparacion}</strong></p>
                </div>
                <div class="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                  <div class="flex justify-between">
                    <span>1. Recepción:</span>
                    <strong>${item.horaRecepcion}</strong>
                  </div>
                  <div class="flex justify-between text-blue-800">
                    <span>2. Agarró equipo:</span>
                    <strong>${item.horaInicioReparacion || "—"}</strong>
                  </div>
                  <div class="flex justify-between text-emerald-800 font-bold border-t border-slate-100 pt-1">
                    <span>3. Solventado / Fin:</span>
                    <span>${item.horaFinalizacionProceso || "—"}</span>
                  </div>
                  <div class="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Taller: ${formatDurationMinutes(item.tiempoReparacionMinutos)}</span>
                    <button type="button" data-action="detail" data-id="${item.id}" class="text-blue-600 hover:underline font-sans font-semibold">Ver ficha</button>
                  </div>
                </div>
              </div>
            `
            )
            .join("");
  }

  renderGlobalHistory(allCount, filteredGlobalRecords, isAdmin) {
    document.getElementById("badge-nav-historial").textContent = allCount;
    document.getElementById("export-csv-count").textContent = filteredGlobalRecords.length;

    const tbody = document.getElementById("global-table-body");
    if (filteredGlobalRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="py-10 text-center text-slate-400">No se encontraron registros históricos con los filtros seleccionados.</td></tr>`;
      return;
    }

    tbody.innerHTML = filteredGlobalRecords
      .map((item) => {
        const adminEditBtn = isAdmin
          ? `<button type="button" data-action="edit" data-id="${item.id}" class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50" title="Corregir (Admin)">
               <i data-lucide="edit-3" class="w-4 h-4 pointer-events-none"></i>
             </button>`
          : "";

        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">${item.fecha}</td>
            <td class="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">${item.horaRecepcion}</td>
            <td class="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">${item.serieEquipo}</td>
            <td class="py-3 px-3.5"><span class="font-mono font-bold text-blue-700 mr-1">${item.codigoCE}</span><span>${item.nombreCE}</span></td>
            <td class="py-3 px-3.5">
              <div class="font-semibold text-slate-800">${item.nombreBeneficiario}</div>
              <div class="text-[11px] text-slate-500">${item.identificacionBeneficiario} • ${item.grado}</div>
            </td>
            <td class="py-3 px-3.5">
              <div>Rec: ${item.tecnicoRecepcion}</div>
              <div class="text-slate-500">Tkt: ${item.tecnicoTicket}</div>
            </td>
            <td class="py-3 px-3.5 font-medium text-slate-800">${item.tecnicoReparacion || "—"}</td>
            <td class="py-3 px-3.5 whitespace-nowrap">${this.renderStatusBadge(item.estado)}</td>
            <td class="py-3 px-3.5 whitespace-nowrap">${this.renderResolutionBadge(item.resolucion)}</td>
            <td class="py-3 px-3.5 text-right whitespace-nowrap">
              <button type="button" data-action="detail" data-id="${item.id}" class="p-1.5 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700" title="Ver ficha">
                <i data-lucide="eye" class="w-4 h-4 pointer-events-none"></i>
              </button>
              ${adminEditBtn}
            </td>
          </tr>
        `;
      })
      .join("");
  }

  renderAdminPanel(usersList, allRecords) {
    const countEl = document.getElementById("admin-users-count");
    if (!countEl) return;

    countEl.textContent = `${usersList.length} usuarios`;
    const usersTbody = document.getElementById("admin-users-tbody");

    const roleOrder = { ADMIN: 1, LOGISTICA: 2, TECNICO: 3 };
    const sortedUsers = [...usersList].sort((a, b) => (roleOrder[a.rol] || 9) - (roleOrder[b.rol] || 9));

    usersTbody.innerHTML = sortedUsers
      .map(
        (u) => `
        <tr class="hover:bg-slate-50">
          <td class="py-3 px-4 font-bold text-slate-900">${u.nombre}</td>
          <td class="py-3 px-4">${this.renderRoleBadge(u.rol)}</td>
          <td class="py-3 px-4 font-mono text-slate-700">${u.usuario}</td>
          <td class="py-3 px-4 font-mono text-slate-500">${u.password}</td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button type="button" data-user-action="edit" data-uid="${u.id}" class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Editar usuario">
              <i data-lucide="edit-2" class="w-4 h-4 pointer-events-none"></i>
            </button>
            <button type="button" data-user-action="delete" data-uid="${u.id}" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50" title="Eliminar usuario">
              <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
            </button>
          </td>
        </tr>
      `
      )
      .join("");

    const correctedRecords = allRecords.filter(
      (r) => Array.isArray(r.historialCorrecciones) && r.historialCorrecciones.length > 0
    );
    const auditTbody = document.getElementById("admin-audit-tbody");

    if (correctedRecords.length === 0) {
      auditTbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No se han realizado correcciones administrativas todavía.</td></tr>`;
      return;
    }

    auditTbody.innerHTML = correctedRecords
      .map((r) => {
        const lastFix = r.historialCorrecciones[r.historialCorrecciones.length - 1];
        return `
          <tr class="hover:bg-amber-50/40">
            <td class="py-3 px-4 font-mono font-bold">${r.fecha}</td>
            <td class="py-3 px-4 font-mono font-bold text-slate-900">${r.serieEquipo}</td>
            <td class="py-3 px-4">
              <div>Cuenta: <strong>${r.creadoPorNombre || r.tecnicoRecepcion}</strong></div>
              <div class="text-[11px] text-slate-500">Rec: ${r.tecnicoRecepcion} / Tkt: ${r.tecnicoTicket}</div>
            </td>
            <td class="py-3 px-4">
              <strong class="text-amber-900">${lastFix.adminNombre}</strong>
              <span class="block text-[11px] text-slate-500 font-mono">${lastFix.fechaHora}</span>
            </td>
            <td class="py-3 px-4 text-slate-700">${lastFix.motivo}</td>
            <td class="py-3 px-4 text-right">
              <button type="button" data-action="detail" data-id="${r.id}" class="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold">
                Ver Auditoría
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  renderDetailModal(item) {
    document.getElementById("detail-serie-title").textContent = `Serie: ${item.serieEquipo}`;

    const correctionsHtml =
      Array.isArray(item.historialCorrecciones) && item.historialCorrecciones.length > 0
        ? `<div class="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
             <h4 class="font-bold uppercase text-[11px] text-amber-900">Constancia de Correcciones Administrativas</h4>
             ${item.historialCorrecciones
               .map(
                 (c) => `
                 <div class="bg-white p-2.5 rounded-lg border border-amber-200 text-[11px]">
                   <div class="flex justify-between font-bold text-amber-950">
                     <span>Corregido por: ${c.adminNombre}</span>
                     <span class="font-mono text-slate-500">${c.fechaHora}</span>
                   </div>
                   <p class="mt-1 text-slate-700"><strong>Motivo:</strong> ${c.motivo}</p>
                   <p class="mt-0.5 text-slate-500"><strong>Datos anteriores:</strong> ${c.resumenAnterior}</p>
                 </div>
               `
               )
               .join("")}
           </div>`
        : "";

    document.getElementById("detail-content").innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div class="flex items-center gap-2">
          ${this.renderStatusBadge(item.estado)}
          ${this.renderResolutionBadge(item.resolucion)}
        </div>
        <div class="text-right">
          <span class="font-mono font-bold text-slate-700 block">Fecha: ${item.fecha}</span>
          <span class="text-[11px] text-slate-500">Registrado en sesión de: <strong>${item.creadoPorNombre || item.tecnicoRecepcion}</strong></span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
          <h4 class="font-bold uppercase text-[11px] text-blue-700">Centro Educativo y Beneficiario</h4>
          <p><span class="text-slate-500">Código CE:</span> <strong class="font-mono">${item.codigoCE}</strong></p>
          <p><span class="text-slate-500">Nombre CE:</span> <strong>${item.nombreCE}</strong></p>
          <p><span class="text-slate-500">Beneficiario (${item.tipoBeneficiario}):</span> <strong>${item.nombreBeneficiario}</strong></p>
          <p><span class="text-slate-500">${item.tipoBeneficiario === "Docente" ? "DUI:" : "NIE:"}</span> <strong class="font-mono">${item.identificacionBeneficiario}</strong></p>
          <p><span class="text-slate-500">Grado:</span> <strong>${item.grado}</strong></p>
        </div>

        <div class="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
          <h4 class="font-bold uppercase text-[11px] text-blue-700">Responsable y Equipo</h4>
          <p><span class="text-slate-500">Responsable:</span> <strong>${item.nombreResponsable || "—"}</strong></p>
          <p><span class="text-slate-500">DUI Responsable:</span> <strong class="font-mono">${item.duiResponsable || "—"}</strong></p>
          <p><span class="text-slate-500">Celular:</span> <strong>${item.celular || "—"}</strong></p>
          <p><span class="text-slate-500">Cargador:</span> <strong class="${item.traeCargador ? "text-emerald-700" : "text-rose-600"}">${item.traeCargador ? "Sí incluye cargador" : "No trae cargador"}</strong></p>
          <p><span class="text-slate-500">Daño:</span> <strong>${item.danoReportado}</strong></p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-900 text-white space-y-2">
        <h4 class="font-bold uppercase text-[11px] text-sky-300">Trazabilidad de Personal y Tiempos</h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div class="bg-slate-800 p-2.5 rounded-lg">
            <span class="text-slate-400 block text-[10px]">1. Recepción Logística</span>
            <strong class="text-sm font-mono">${item.horaRecepcion}</strong>
            <span class="block text-[11px] text-slate-300 mt-0.5">Recibió: ${item.tecnicoRecepcion}</span>
            <span class="block text-[11px] text-slate-400">Ticket: ${item.tecnicoTicket}</span>
          </div>
          <div class="bg-slate-800 p-2.5 rounded-lg">
            <span class="text-slate-400 block text-[10px]">2. Agarrado en Taller</span>
            <strong class="text-sm font-mono">${item.horaInicioReparacion || "Pendiente"}</strong>
            <span class="block text-[11px] text-sky-300 mt-0.5">Técnico: ${item.tecnicoReparacion || "Sin asignar"}</span>
            <span class="block text-[11px] text-amber-300">Espera: ${formatDurationMinutes(item.tiempoEsperaMinutos)}</span>
          </div>
          <div class="bg-slate-800 p-2.5 rounded-lg">
            <span class="text-slate-400 block text-[10px]">3. Solventado / Fin</span>
            <strong class="text-sm font-mono">${item.horaFinalizacionProceso || "En curso"}</strong>
            <span class="block text-[11px] text-emerald-300 mt-0.5">Duración taller: ${formatDurationMinutes(item.tiempoReparacionMinutos)}</span>
          </div>
        </div>
        ${item.notaTecnica ? `<div class="mt-2 pt-2 border-t border-slate-700 text-slate-200"><span class="text-slate-400">Nota técnica: </span>${item.notaTecnica}</div>` : ""}
      </div>

      ${correctionsHtml}
    `;
  }
}