export class ToastManager {
  constructor(containerId = "toast-container") {
    this.container = document.getElementById(containerId);
  }

  show(message, type = "info", duration = 5500) {
    if (!this.container) return;

    const styles = {
      success: "bg-emerald-600 border-emerald-400 text-white",
      error: "bg-rose-600 border-rose-400 text-white",
      info: "bg-slate-900 border-slate-700 text-white"
    };

    const toast = document.createElement("div");
    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-xl border shadow-xl text-sm font-bold transition-all duration-300 transform translate-y-0 opacity-100 ${styles[type] || styles.info}`;
    toast.textContent = message;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}