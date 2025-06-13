document.addEventListener('DOMContentLoaded', () => {
    // --- Global Mobile Navigation Logic ---
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (navToggle && mainNav) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('is-active');
            mainNav.classList.toggle('is-active');
        });
    }

    // --- Global Dropdown Submenu Logic for Mobile ---
    const dropdownItems = document.querySelectorAll('.main-nav .nav-item-dropdown');

    if (dropdownItems.length > 0) {
        dropdownItems.forEach(item => {
            const clickableElement = item.querySelector(':scope > button, :scope > a'); 
            
            if (clickableElement) {
                clickableElement.addEventListener('click', (e) => {
                    if (window.innerWidth <= 900) {
                        e.preventDefault();
                        item.classList.toggle('is-open');
                    }
                });
            }
        });
    }
});