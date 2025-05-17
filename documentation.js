document.addEventListener('DOMContentLoaded', () => {
    // --- Video Modal Logic ---
    const videoModal = document.getElementById('videoModal');
    const modalVideoPlayer = document.getElementById('modalVideoPlayer');
    const closeModalButton = videoModal ? videoModal.querySelector('.modal-close-button') : null;
    const previewVideoContainers = document.querySelectorAll('.feature-video-container');

    if (previewVideoContainers.length > 0 && videoModal && modalVideoPlayer && closeModalButton) {
        previewVideoContainers.forEach(container => {
            const previewVideoSourceTag = container.querySelector('video > source[src]');
            if (!previewVideoSourceTag) {
                console.warn("No video source tag found for container:", container);
                return;
            }
            const videoSrc = previewVideoSourceTag.getAttribute('src');

            container.addEventListener('click', () => {
                previewVideoContainers.forEach(cont => {
                    const vid = cont.querySelector('video');
                    if (vid) vid.pause();
                });

                modalVideoPlayer.setAttribute('src', videoSrc);
                videoModal.style.display = 'flex';
                setTimeout(() => {
                    videoModal.classList.add('active');
                }, 10);

                modalVideoPlayer.load();
                modalVideoPlayer.play().catch(error => {
                    console.error("Error attempting to play modal video:", error);
                });
            });
        });

        function closeModal() {
            videoModal.classList.remove('active');
            modalVideoPlayer.pause();
            setTimeout(() => {
                if (!videoModal.classList.contains('active')) {
                    videoModal.style.display = 'none';
                    modalVideoPlayer.removeAttribute('src');
                }
            }, 300);
        }

        closeModalButton.addEventListener('click', closeModal);
        videoModal.addEventListener('click', (event) => {
            if (event.target === videoModal) {
                closeModal();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && videoModal.classList.contains('active')) {
                closeModal();
            }
        });
    } else {
        if (!videoModal) console.warn("Video modal element not found.");
        if (previewVideoContainers.length === 0) console.warn("No preview video containers found.");
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
            const scrollOffset = 80; 

            function highlightActiveLink() {
                let currentSectionId = null;
                const viewportHeight = window.innerHeight;

                for (let i = sections.length - 1; i >= 0; i--) {
                    const section = sections[i];
                    const rect = section.element.getBoundingClientRect();

                    if (rect.top <= scrollOffset && rect.bottom >= scrollOffset) {
                        currentSectionId = section.id;
                        break;
                    }
                    if (i === sections.length - 1 && rect.top < scrollOffset && rect.bottom < scrollOffset) {
                        currentSectionId = section.id;
                        break;
                    }
                     if (i === 0 && rect.top > scrollOffset && rect.top < viewportHeight) {
                        currentSectionId = section.id;
                        break;
                    }
                }
                
                if (!currentSectionId && sections.length > 0 && window.scrollY < sections[0].element.offsetTop) {
                    currentSectionId = sections[0].id;
                }

                navLinks.forEach(link => {
                    link.classList.remove('active');
                    const href = link.getAttribute('href');
                    if (href && href.substring(1) === currentSectionId) {
                        link.classList.add('active');
                        
                        const linkRect = link.getBoundingClientRect();
                        const sidebarRect = sidebar.getBoundingClientRect();
                        if (linkRect.top < sidebarRect.top || linkRect.bottom > sidebarRect.bottom) {
                            const parentUl = link.closest('ul');
                            if (parentUl && parentUl.childElementCount > 3) { 
                               link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }
                    }
                });
            }

            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(highlightActiveLink, 50);
            });
            highlightActiveLink(); 
        }
    } else {
        console.warn("Docs sidebar element not found.");
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

                    // Close all other items first
                    accordionItems.forEach(otherItem => {
                        const otherButton = otherItem.querySelector('.accordion-button');
                        const otherPanel = otherItem.querySelector('.accordion-panel');
                        if (otherButton !== button && otherButton.classList.contains('active')) {
                            otherButton.classList.remove('active');
                            otherButton.setAttribute('aria-expanded', 'false');
                            otherPanel.classList.remove('active');
                            otherPanel.style.maxHeight = null;
                        }
                    });

                    // Then, toggle the clicked item
                    // If it wasn't active, activate it. If it was (and we allow toggling it off), deactivate.
                    // For "only one open" behavior, if it was already active, it means others were closed,
                    // and we just opened it.
                    // The current logic ensures only one is open. If you click an open one again, nothing happens
                    // unless you want to allow it to close.
                    // To allow toggling the *same* item off:
                    // if (isCurrentlyActive) {
                    //     button.classList.remove('active');
                    //     button.setAttribute('aria-expanded', 'false');
                    //     panel.classList.remove('active');
                    //     panel.style.maxHeight = null;
                    // } else {
                    //     button.classList.add('active');
                    //     button.setAttribute('aria-expanded', 'true');
                    //     panel.classList.add('active');
                    //     panel.style.maxHeight = panel.scrollHeight + "px";
                    // }
                    
                    // Simplified for "always one open if one is clicked, or open the new one":
                    if (!isCurrentlyActive) { // Only act if opening a new one or the first one
                        button.classList.add('active');
                        button.setAttribute('aria-expanded', 'true');
                        panel.classList.add('active');
                        panel.style.maxHeight = panel.scrollHeight + "px";
                    }
                    // If it was already active, the above loop closed others, and this one remains open.
                    // If you want clicking an active one to close it (allowing none to be open):
                    // else { // it was active, so toggle it off
                    //    button.classList.remove('active');
                    //    button.setAttribute('aria-expanded', 'false');
                    //    panel.classList.remove('active');
                    //    panel.style.maxHeight = null;
                    // }
                });

                // Open the first item by default without causing scroll
                if (index === 0) {
                    button.classList.add('active');
                    button.setAttribute('aria-expanded', 'true');
                    panel.classList.add('active');
                    // Set max-height after a tiny delay for consistent scrollHeight calculation
                    // This does not cause a scroll to the element.
                    requestAnimationFrame(() => { // Use requestAnimationFrame for smoother render
                        if (panel.classList.contains('active')) {
                           panel.style.maxHeight = panel.scrollHeight + "px";
                        }
                    });
                } else {
                     button.setAttribute('aria-expanded', 'false');
                }
            }
        });
    } else {
        console.warn("Accordion container not found.");
    }
});