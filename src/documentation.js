document.addEventListener('DOMContentLoaded', () => {
    // --- Page-Specific Logic for Documentation Page ---

    // --- Desktop & Mobile Sidebar Functionality ---
    const docsSidebar = document.getElementById('docs-sidebar');
    if (docsSidebar) {
        
        // --- Desktop Scroll Indicator ---
        function checkDesktopScrollable() {
            if (window.innerWidth > 900) {
                if (docsSidebar.scrollHeight > docsSidebar.clientHeight) {
                    docsSidebar.classList.add('has-scroll');
                    
                    // Add scroll listener for desktop fade indicator
                    const handleDesktopScroll = () => {
                        const isAtBottom = docsSidebar.scrollTop + docsSidebar.clientHeight >= docsSidebar.scrollHeight - 5;
                        if (isAtBottom) {
                            docsSidebar.classList.remove('has-scroll');
                        } else {
                            docsSidebar.classList.add('has-scroll');
                        }
                    };
                    
                    docsSidebar.addEventListener('scroll', handleDesktopScroll, { passive: true });
                } else {
                    docsSidebar.classList.remove('has-scroll');
                }
            }
        }
        
        // Check on load and resize
        checkDesktopScrollable();
        window.addEventListener('resize', checkDesktopScrollable);
        const sidebarTitle = docsSidebar.querySelector('.sidebar-title');
        const sidebarContent = docsSidebar.querySelector('.sidebar-content');

        if (sidebarTitle && sidebarContent) {
            sidebarTitle.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                    docsSidebar.classList.toggle('is-open');
                    // Let CSS handle the max-height for better scrolling behavior
                    if (docsSidebar.classList.contains('is-open')) {
                        sidebarContent.style.maxHeight = 'calc(100vh - 140px)';
                        // Check if content is scrollable and add visual indicator
                        setTimeout(() => {
                            if (sidebarContent.scrollHeight > sidebarContent.clientHeight) {
                                sidebarContent.classList.add('has-scroll');
                                
                                // Add scroll listener to manage fade indicator
                                const handleScroll = () => {
                                    const isAtBottom = sidebarContent.scrollTop + sidebarContent.clientHeight >= sidebarContent.scrollHeight - 5;
                                    if (isAtBottom) {
                                        sidebarContent.classList.remove('has-scroll');
                                    } else {
                                        sidebarContent.classList.add('has-scroll');
                                    }
                                };
                                
                                sidebarContent.addEventListener('scroll', handleScroll, { passive: true });
                            }
                        }, 100);
                    } else {
                        sidebarContent.style.maxHeight = null;
                        sidebarContent.classList.remove('has-scroll');
                    }
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
                checkDesktopScrollable();
            } else {
                // Remove desktop scroll indicator on mobile
                docsSidebar.classList.remove('has-scroll');
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