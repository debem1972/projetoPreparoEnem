document.addEventListener('DOMContentLoaded', function () {
    // Gerencia a rotação dos ícones
    document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(button => {
        button.addEventListener('click', function () {
            const icon = this.querySelector('.submenu-icon');
            if (icon) {
                setTimeout(() => {
                    if (this.classList.contains('collapsed')) {
                        icon.style.transform = 'rotate(-90deg)';
                    } else {
                        icon.style.transform = 'rotate(0deg)';
                    }
                }, 50);
            }
        });
    });
}); 