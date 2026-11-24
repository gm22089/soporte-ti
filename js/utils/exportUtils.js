import { getLocalDateString } from "./dateUtils.js";

export function exportRecordsToCSV(records) {
  const headers = [
    "Fecha",
    "Hora Recepcion",
    "Estado",
    "Resolucion",
    "Serie Equipo",
    "Codigo CE",
    "Nombre CE",
    "Grado",
    "Tipo Beneficiario",
    "NIE / DUI Beneficiario",
    "Nombre Beneficiario",
    "Celular",
    "DUI Responsable",
    "Nombre Responsable",
    "Trae Cargador",
    "Dano Reportado",
    "Recepcionado Por",
    "Ticket Creado Por",
    "Tecnico Reparacion",
    "Hora Inicio Reparacion",
    "Hora Fin Proceso",
    "Tiempo Espera (min)",
    "Tiempo Reparacion (min)",
    "Nota Tecnica"
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  };

  const rows = records.map((r) => [
    r.fecha,
    r.horaRecepcion,
    r.estado,
    r.resolucion || "Pendiente",
    r.serieEquipo,
    r.codigoCE,
    r.nombreCE,
    r.grado,
    r.tipoBeneficiario,
    r.identificacionBeneficiario,
    r.nombreBeneficiario,
    r.celular,
    r.duiResponsable,
    r.nombreResponsable,
    r.traeCargador ? "Sí" : "No",
    r.danoReportado,
    r.tecnicoRecepcion,
    r.tecnicoTicket,
    r.tecnicoReparacion || "Sin asignar",
    r.horaInicioReparacion || "—",
    r.horaFinalizacionProceso || "—",
    r.tiempoEsperaMinutos ?? "—",
    r.tiempoReparacionMinutos ?? "—",
    r.notaTecnica || ""
  ].map(escapeCsv).join(","));

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Reporte_Soporte_TI_${getLocalDateString(0)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}