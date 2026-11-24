export class ToastManager {
  constructor() {
    this.container = document.getElementById("toast-container");
  }

  show(message, type = "success") {
    const toast = document.createElement("div");
    const colorClasses =
      type === "error"
        ? "bg-red-900 text-white border-red-700"
        : type === "info"
        ? "bg-blue-900 text-white border-blue-700"
        : "bg-slate-900 text-white border-emerald-500";

    toast.className = `toast-enter flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${colorClasses}`;
    toast.innerHTML = `<span>${message}</span>`;

    this.container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
}