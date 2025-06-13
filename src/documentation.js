document.addEventListener('DOMContentLoaded', () => {
    // --- Page-Specific Logic for Documentation Page ---

    // --- Collapsible Docs Sidebar for Mobile ---
    const docsSidebar = document.getElementById('docs-sidebar');
    if (docsSidebar) {
        const sidebarTitle = docsSidebar.querySelector('.sidebar-title');
        const sidebarContent = docsSidebar.querySelector('.sidebar-content');

        if (sidebarTitle && sidebarContent) {
            sidebarTitle.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                    docsSidebar.classList.toggle('is-open');
                    sidebarContent.style.maxHeight = docsSidebar.classList.contains('is-open') ? sidebarContent.scrollHeight + 'px' : null;
                }
            });

            const sidebarLinks = sidebarContent.querySelectorAll('a');
            sidebarLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 900 && docsSidebar.classList.contains('is-open')) {
                        setTimeout(() => {
                           sidebarContent.style.maxHeight = null;
                           docsSidebar.classList.remove('is-open');
                        }, 150);
                    }
                });
            });
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) {
                if(sidebarContent) sidebarContent.style.maxHeight = null;
                if(docsSidebar && docsSidebar.classList.contains('is-open')) {
                    docsSidebar.classList.remove('is-open');
                }
            }
        });
    }

    // --- Page-Specific Sticky Sidebar Scrollspy Logic ---
    if (docsSidebar) {
        const navLinks = docsSidebar.querySelectorAll('ul li a');
        const sections = Array.from(document.querySelectorAll('.docs-content section[id]'));

        if (sections.length > 0 && navLinks.length > 0) {
            const scrollOffset = 120;

            function highlightActiveLink() {
                let currentSectionId = '';
                const fromTop = window.scrollY + scrollOffset;

                sections.forEach(section => {
                    if (section.offsetTop <= fromTop) {
                        currentSectionId = section.id;
                    }
                });

                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + currentSectionId) {
                        link.classList.add('active');
                    }
                });
            }

            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(highlightActiveLink, 50);
            }, { passive: true }); 
            
            highlightActiveLink();
        }
    }
});