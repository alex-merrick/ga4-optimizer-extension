/**
 * documentation.js
 * VERSION: 1.5 - Fixed Video not opening
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Video Modal Logic ---
    const videoModal = document.getElementById('videoModal');
    const modalVideoPlayer = document.getElementById('modalVideoPlayer');
    const closeModalButton = videoModal ? videoModal.querySelector('.modal-close-button') : null;
    const previewVideoContainers = document.querySelectorAll('.feature-video-container');

    if (previewVideoContainers.length > 0 && videoModal && modalVideoPlayer && closeModalButton) {
        previewVideoContainers.forEach(container => {
            const previewVideo = container.querySelector('video');
            const playIconOverlay = container.querySelector('.play-icon-overlay'); // Check this selector carefully

            // Specific checks for missing elements
            if (!previewVideo) {
                console.warn("Documentation.js WARN: No <video> element found in container identified by data-video-name:", container.dataset.videoName || "Unknown", container);
            }
            if (!playIconOverlay) {
                // This warning is likely if the previous logs showed "Preview video or its play icon overlay missing"
                console.warn("Documentation.js WARN: No .play-icon-overlay element found in container identified by data-video-name:", container.dataset.videoName || "Unknown", container);
            }

            const previewVideoSourceTag = previewVideo ? previewVideo.querySelector('source[src]') : null;
            const videoSrc = previewVideoSourceTag ? previewVideoSourceTag.getAttribute('src') : null;

            if (previewVideo) { // Only proceed with video logic if the video element itself exists
                const manageIconVisibility = () => {
                    if (playIconOverlay) { // Only manage icon if it also exists
                        if (previewVideo.paused || previewVideo.ended) {
                            playIconOverlay.style.display = 'block';
                        } else {
                            playIconOverlay.style.display = 'none';
                        }
                    }
                };

                previewVideo.addEventListener('play', manageIconVisibility);
                previewVideo.addEventListener('pause', manageIconVisibility);
                previewVideo.addEventListener('loadeddata', manageIconVisibility); // Update icon when video data is loaded

                previewVideo.addEventListener('ended', () => {
                    previewVideo.currentTime = 0; // Reset video to start for looping
                    previewVideo.play().catch(e => {
                        // console.warn("Documentation.js: Loop play failed, updating icon.", e);
                        manageIconVisibility(); // Ensure icon is shown if play fails
                    });
                });

                // Check initial state after a brief moment to allow autoplay to attempt
                // The `autoplay` attribute on the video tag should handle the initial play attempt.
                // This timeout ensures the icon reflects the state if autoplay succeeded or failed.
                setTimeout(() => {
                    manageIconVisibility();
                    // If it's still paused, it means autoplay didn't work or isn't allowed initially.
                    // The icon will be shown by manageIconVisibility.
                    // User click will then open the modal.
                }, 150);

            } // End of if (previewVideo)

            // Modal click listener - only attach if videoSrc is valid for the modal
            if (videoSrc && previewVideo) { // Ensure previewVideo exists for pausing
                container.addEventListener('click', () => {
                    // Pause all preview videos when one is clicked to open the modal
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
            } else if (!videoSrc && previewVideo) { // Video tag exists, but no valid source for modal
                 console.warn("Documentation.js WARN: videoSrc not found for modal for video in container:", container.dataset.videoName || "Unknown", ". Modal click disabled for this item.");
            }

        }); // End of forEach previewVideoContainers

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
                        if (video) { // Only attempt to play if video element exists
                            video.play().catch(err => {
                                if (playIcon) playIcon.style.display = 'block'; // Show icon if restart fails
                            });
                        } else if (playIcon){
                            playIcon.style.display = 'block'; // If no video, but icon exists, show icon
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
    } else {
        console.warn("Documentation.js: Accordion container not found.");
    }
});