// Simple toast utility to replace sonner
class ToastManager {
  private container: HTMLElement | null = null;

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
      document.body.appendChild(this.container);
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.ensureContainer();
    
    const toast = document.createElement('div');
    const bgColor = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500'
    }[type];
    
    toast.className = `${bgColor} text-white px-4 py-2 rounded-md shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
    toast.textContent = message;
    
    this.container!.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    }, 10);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }

  success(message: string) {
    this.showToast(message, 'success');
  }

  error(message: string) {
    this.showToast(message, 'error');
  }

  info(message: string) {
    this.showToast(message, 'info');
  }
}

export const toast = new ToastManager();