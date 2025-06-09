/**
 * documentation.js
 * VERSION: 2.0 - Widened desktop layout. Removed sidebar scrollbar. Made mobile docs nav sticky and auto-closing.
 * VERSION: 2.1 - Implemented global video modal, play icon overlays, and improved mobile UX for sidebar.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Navigation Logic ---
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (navToggle && mainNav) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('is-active');
            mainNav.classList.toggle('is-active');
        });
    }

    // --- Collapsible Docs Sidebar for Mobile ---
    const docsSidebar = document.getElementById('docs-sidebar');
    if (docsSidebar) {
        const sidebarTitle = docsSidebar.querySelector('.sidebar-title');
        const sidebarContent = docsSidebar.querySelector('.sidebar-content');

        if (sidebarTitle && sidebarContent) {
            // Logic to toggle the menu on mobile
            sidebarTitle.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                    const isCurrentlyOpen = docsSidebar.classList.contains('is-open');
                    if (isCurrentlyOpen) {
                        sidebarContent.style.maxHeight = null;
                        docsSidebar.classList.remove('is-open');
                    } else {
                        docsSidebar.classList.add('is-open');
                        sidebarContent.style.maxHeight = sidebarContent.scrollHeight + 'px';
                    }
                }
            });

            // Logic to auto-close the menu when a link is clicked on mobile
            const sidebarLinks = sidebarContent.querySelectorAll('a');
            sidebarLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 900 && docsSidebar.classList.contains('is-open')) {
                        // Use a timeout to allow navigation to happen before closing
                        setTimeout(() => {
                           sidebarContent.style.maxHeight = null;
                           docsSidebar.classList.remove('is-open');
                           navToggle.classList.remove('is-active');
                        }, 150);
                    }
                });
            });
        }

         // Reset inline style on resize to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) {
                if(sidebarContent) sidebarContent.style.maxHeight = null;
                if(docsSidebar && docsSidebar.classList.contains('is-open')) {
                    docsSidebar.classList.remove('is-open');
                }
            }
        });
    }


    // --- Global Video Modal Logic ---
    const videoModal = document.getElementById('videoModal');
    const modalIframePlayer = document.getElementById('modalVideoPlayer');
    const modalLocalPlayer = document.getElementById('modalVideoPlayerLocal');
    const closeModalButton = videoModal ? videoModal.querySelector('.modal-close-button') : null;
    const previewVideoContainers = document.querySelectorAll('.feature-video-container');

    if (previewVideoContainers.length > 0 && videoModal && modalIframePlayer && modalLocalPlayer && closeModalButton) {
        
        previewVideoContainers.forEach(container => {
            container.addEventListener('click', () => {
                // Pause all preview videos on the page
                previewVideoContainers.forEach(cont => {
                    const vid = cont.querySelector('video');
                    if (vid) vid.pause();
                });

                const youtubeSrc = container.querySelector('.modal-video-source')?.dataset.modalSrc;
                const localVideo = container.querySelector('video > source');

                if (youtubeSrc) {
                    modalIframePlayer.style.display = 'block';
                    modalLocalPlayer.style.display = 'none';
                    modalIframePlayer.setAttribute('src', youtubeSrc + "?autoplay=1");
                } else if (localVideo) {
                    modalIframePlayer.style.display = 'none';
                    modalLocalPlayer.style.display = 'block';
                    modalLocalPlayer.setAttribute('src', localVideo.getAttribute('src'));
                    modalLocalPlayer.play().catch(e => console.error("Modal play error:", e));
                }

                videoModal.style.display = 'flex';
                setTimeout(() => videoModal.classList.add('active'), 10);
            });
        });

        function closeModal() {
            videoModal.classList.remove('active');
            
            // Stop both players
            modalIframePlayer.setAttribute('src', '');
            modalLocalPlayer.pause();
            modalLocalPlayer.setAttribute('src', '');

            setTimeout(() => {
                if (!videoModal.classList.contains('active')) {
                    videoModal.style.display = 'none';
                    // Resume preview videos
                    previewVideoContainers.forEach(container => {
                        const video = container.querySelector('video');
                        if (video) video.play().catch(err => {});
                    });
                }
            }, 300); // Wait for transition
        }

        if(closeModalButton) closeModalButton.addEventListener('click', closeModal);
        
        videoModal.addEventListener('click', (event) => {
            // Close if clicking on the modal background
            if (event.target === videoModal) closeModal();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && videoModal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    // --- Sticky Sidebar Scrollspy Logic ---
    const sidebar = document.getElementById('docs-sidebar');
    if (sidebar) {
        const navLinks = sidebar.querySelectorAll('ul li a');
        const sections = [];
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const sectionId = href.substring(1);
                const sectionElement = document.getElementById(sectionId);
                if (sectionElement) {
                    sections.push({
                        id: sectionId,
                        element: sectionElement,
                        link: link
                    });
                }
            }
        });

        if (sections.length > 0) {
            const scrollOffset = 120; // Increased offset for better accuracy with sticky nav

            function highlightActiveLink() {
                let currentSectionId = '';
                const fromTop = window.scrollY + scrollOffset;

                sections.forEach(section => {
                    if (section.element.offsetTop <= fromTop) {
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
                scrollTimeout = setTimeout(highlightActiveLink, 50); // Debounce scroll event
            }, { passive: true }); // Improve scroll performance
            
            highlightActiveLink(); // Initial check
        }
    }

    // --- Accordion Logic for Troubleshooting ---
    const accordionContainer = document.querySelector('.accordion-container');
    if (accordionContainer) {
        const accordionItems = accordionContainer.querySelectorAll('.accordion-item');

        accordionItems.forEach((item, index) => {
            const button = item.querySelector('.accordion-button');
            const panel = item.querySelector('.accordion-panel');

            if (button && panel) {
                button.addEventListener('click', () => {
                    const isCurrentlyActive = button.classList.contains('active');

                    // First, close all accordion items
                    accordionItems.forEach(otherItem => {
                        const otherButton = otherItem.querySelector('.accordion-button');
                        const otherPanel = otherItem.querySelector('.accordion-panel');
                        if (otherButton.classList.contains('active')) {
                            otherButton.classList.remove('active');
                            otherButton.setAttribute('aria-expanded', 'false');
                            otherPanel.classList.remove('active');
                            otherPanel.style.maxHeight = null;
                        }
                    });
                    
                    // If the clicked item was not active (i.e., it was closed), then open it.
                    if (!isCurrentlyActive) {
                        button.classList.add('active');
                        button.setAttribute('aria-expanded', 'true');
                        panel.classList.add('active');
                        panel.style.maxHeight = panel.scrollHeight + "px";
                    }
                });

                if (index === 0) {
                    button.classList.add('active');
                    button.setAttribute('aria-expanded', 'true');
                    panel.classList.add('active');
                    requestAnimationFrame(() => {
                        if (panel.classList.contains('active')) {
                           panel.style.maxHeight = panel.scrollHeight + "px";
                        }
                    });
                } else {
                     button.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }
});