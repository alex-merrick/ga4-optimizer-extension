/**
 * documentation.js
 * VERSION: 2.0 - Updated Auto Detailed Results documentation for manual trigger.
 * - Final accordion fix. Initializes multiple accordion containers independently.
 */

import { initializeI18n } from './utils/i18n-helper.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n system
    initializeI18n();
    
    // Content visibility is handled by initializeI18n()
    // --- Video Modal Logic ---
    const videoModal = document.getElementById('videoModal');
    const modalVideoPlayer = document.getElementById('modalVideoPlayer');
    const closeModalButton = videoModal ? videoModal.querySelector('.modal-close-button') : null;
    const previewVideoContainers = document.querySelectorAll('.feature-video-container');

    if (previewVideoContainers.length > 0 && videoModal && modalVideoPlayer && closeModalButton) {
        previewVideoContainers.forEach(container => {
            const previewVideo = container.querySelector('video');
            const playIconOverlay = container.querySelector('.play-icon-overlay');

            if (!previewVideo) {
                console.warn("Documentation.js WARN: No <video> element found in container identified by data-video-name:", container.dataset.videoName || "Unknown", container);
            }
            if (!playIconOverlay) {
                console.warn("Documentation.js WARN: No .play-icon-overlay element found in container identified by data-video-name:", container.dataset.videoName || "Unknown", container);
            }

            const previewVideoSourceTag = previewVideo ? previewVideo.querySelector('source[src]') : null;
            const videoSrc = previewVideoSourceTag ? previewVideoSourceTag.getAttribute('src') : null;

            if (previewVideo) {
                const manageIconVisibility = () => {
                    if (playIconOverlay) {
                        if (previewVideo.paused || previewVideo.ended) {
                            playIconOverlay.style.display = 'block';
                        } else {
                            playIconOverlay.style.display = 'none';
                        }
                    }
                };

                previewVideo.addEventListener('play', manageIconVisibility);
                previewVideo.addEventListener('pause', manageIconVisibility);
                previewVideo.addEventListener('loadeddata', manageIconVisibility);

                previewVideo.addEventListener('ended', () => {
                    previewVideo.currentTime = 0;
                    previewVideo.play().catch(e => {
                        manageIconVisibility();
                    });
                });

                setTimeout(() => {
                    manageIconVisibility();
                }, 150);

            }

            if (videoSrc && previewVideo) {
                container.addEventListener('click', () => {
                    previewVideoContainers.forEach(cont => {
                        const vid = cont.querySelector('video');
                        if (vid) {
                            vid.pause();
                        }
                    });

                    modalVideoPlayer.setAttribute('src', videoSrc);
                    videoModal.style.display = 'flex';
                    setTimeout(() => {
                        videoModal.classList.add('active');
                    }, 10);

                    modalVideoPlayer.load();
                    modalVideoPlayer.play().catch(error => {
                        console.error("Documentation.js: Error attempting to play modal video:", error);
                    });
                });
            } else if (!videoSrc && previewVideo) {
                 console.warn("Documentation.js WARN: videoSrc not found for modal for video in container:", container.dataset.videoName || "Unknown", ". Modal click disabled for this item.");
            }

        });

        function closeModal() {
            videoModal.classList.remove('active');
            if (modalVideoPlayer) {
                modalVideoPlayer.pause();
            }
            setTimeout(() => {
                if (!videoModal.classList.contains('active')) {
                    videoModal.style.display = 'none';
                    if (modalVideoPlayer) {
                        modalVideoPlayer.removeAttribute('src');
                    }

                    previewVideoContainers.forEach(container => {
                        const video = container.querySelector('video');
                        const playIcon = container.querySelector('.play-icon-overlay');
                        if (video) {
                            video.play().catch(err => {
                                if (playIcon) playIcon.style.display = 'block';
                            });
                        } else if (playIcon){
                            playIcon.style.display = 'block';
                        }
                    });
                }
            }, 300);
        }

        if(closeModalButton) closeModalButton.addEventListener('click', closeModal);
        
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
        if (!videoModal) console.warn("Documentation.js: Video modal element not found.");
        if (previewVideoContainers.length === 0) console.warn("Documentation.js: No preview video containers found.");
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
                for (let i = sections.length - 1; i >= 0; i--) {
                    const section = sections[i];
                    const rect = section.element.getBoundingClientRect();
                    if (rect.top <= scrollOffset) {
                        currentSectionId = section.id;
                        break;
                    }
                }
                if (!currentSectionId && sections.length > 0) {
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
        console.warn("Documentation.js: Docs sidebar element not found.");
    }

    // --- ACCORDION LOGIC ---
    // This function can now handle multiple independent accordion groups on the same page.
    const initializeAccordion = (accordionContainer) => {
        if (!accordionContainer) return;

        const accordionItems = accordionContainer.querySelectorAll('.accordion-item');
        if (accordionItems.length === 0) return;
        
        const closeAllAccordionsInContainer = () => {
            accordionItems.forEach(item => {
                const button = item.querySelector('.accordion-button');
                const panel = item.querySelector('.accordion-panel');
                if (button && panel && button.classList.contains('active')) {
                    button.classList.remove('active');
                    panel.classList.remove('active');
                    button.setAttribute('aria-expanded', 'false');
                    panel.style.maxHeight = null;
                }
            });
        };

        accordionItems.forEach(item => {
            const button = item.querySelector('.accordion-button');
            const panel = item.querySelector('.accordion-panel');

            if (button && panel) {
                button.addEventListener('click', () => {
                    const isOpening = !button.classList.contains('active');
                    
                    // First, close all other accordions *within this specific container*
                    closeAllAccordionsInContainer();

                    // Then, if the clicked item was previously closed, open it.
                    if (isOpening) {
                        button.classList.add('active');
                        panel.classList.add('active');
                        button.setAttribute('aria-expanded', 'true');
                        panel.style.maxHeight = panel.scrollHeight + 'px';
                    }
                    // If it was already open, the closeAll function has already handled it.
                });
            }
        });

        // Default open the first item if it's marked with 'active' class initially in HTML
        const defaultOpenItem = accordionContainer.querySelector('.accordion-item .accordion-button.active');
        if (defaultOpenItem) {
            const panel = defaultOpenItem.closest('.accordion-item').querySelector('.accordion-panel');
            if (panel) {
                 requestAnimationFrame(() => {
                    panel.style.maxHeight = panel.scrollHeight + 'px';
                });
            }
        } else {
            // If no item is marked as active, default open the very first one in the container.
            const firstItem = accordionItems[0];
            if (firstItem) {
                const button = firstItem.querySelector('.accordion-button');
                const panel = firstItem.querySelector('.accordion-panel');
                if(button && panel) {
                    button.classList.add('active');
                    panel.classList.add('active');
                    button.setAttribute('aria-expanded', 'true');
                    requestAnimationFrame(() => {
                        panel.style.maxHeight = panel.scrollHeight + 'px';
                    });
                }
            }
        }
    };

    // Find all accordion containers on the page and initialize each one.
    const allAccordionContainers = document.querySelectorAll('.accordion-container');
    if (allAccordionContainers.length > 0) {
        allAccordionContainers.forEach(container => {
            initializeAccordion(container);
        });
    } else {
        console.warn("Documentation.js: No accordion containers found on the page.");
    }
});