export const USUARIOS_INICIALES = [
  // ADMINISTRADORES
  { nombre: "Administrador Principal", usuario: "admin", password: "admin123", rol: "ADMIN", activo: true },
  { nombre: "Roberto Soriano", usuario: "rsoriano", password: "1234", rol: "ADMIN", activo: true },
  { nombre: "Norma González", usuario: "ngonzalez", password: "1234", rol: "ADMIN", activo: true },

  // LOGÍSTICA
  { nombre: "Rosa Garcia", usuario: "rgarcia", password: "1234", rol: "LOGISTICA", activo: true },
  { nombre: "Luis Martínez", usuario: "lmartinez", password: "1234", rol: "LOGISTICA", activo: true },
  { nombre: "José Tejada", usuario: "jtejada", password: "1234", rol: "LOGISTICA", activo: true },
  { nombre: "Emerson Castillo", usuario: "ecastillo", password: "1234", rol: "LOGISTICA", activo: true },

  // TÉCNICOS
  { nombre: "Carlos Jimenez", usuario: "cjimenez", password: "1234", rol: "TECNICO", activo: true },
  { nombre: "Carlos Rivas", usuario: "crivas", password: "1234", rol: "TECNICO", activo: true },
  { nombre: "Luis Parada", usuario: "lparada", password: "1234", rol: "TECNICO", activo: true },
  { nombre: "José Contreras", usuario: "jcontreras", password: "1234", rol: "TECNICO", activo: true },
  { nombre: "David Sermeño", usuario: "dsermeno", password: "1234", rol: "TECNICO", activo: true },
  { nombre: "Fabricio Morales", usuario: "fmorales", password: "1234", rol: "TECNICO", activo: true }
];

export const GRADOS_ESCOLARES = [
  "Parvularia",
  "1° Grado",
  "2° Grado",
  "3° Grado",
  "4° Grado",
  "5° Grado",
  "6° Grado",
  "7° Grado",
  "8° Grado",
  "9° Grado",
  "1° Año Bachillerato",
  "2° Año Bachillerato",
  "3° Año Bachillerato",
  "Docente / No aplica"
];

export const FALLAS_FRECUENTES = [
  "Pantalla dañada",
  "No enciende",
  "Batería",
  "Teclado/Touchpad",
  "Sistema Operativo",
  "Puerto de carga"
];

export const OPCIONES_RESOLUCION = [
  {
    id: "Reparación en sede",
    titulo: "Reparación en sede",
    descripcion: "Equipo reparado físicamente o a nivel de software en el taller.",
    colorBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    colorCard: "border-emerald-500 bg-emerald-50/70"
  },
  {
    id: "Atención efectiva",
    titulo: "Atención efectiva",
    descripcion: "Diagnóstico, configuración, desbloqueo o solución inmediata.",
    colorBadge: "bg-teal-100 text-teal-800 border-teal-300",
    colorCard: "border-teal-500 bg-teal-50/70"
  },
  {
    id: "Enviar a Garantía",
    titulo: "Enviar a Garantía",
    descripcion: "Falla de fábrica o hardware mayor que requiere trámite de garantía.",
    colorBadge: "bg-purple-100 text-purple-800 border-purple-300",
    colorCard: "border-purple-500 bg-purple-50/70"
  }
];