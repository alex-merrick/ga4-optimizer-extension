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

    // --- Global Dropdown Submenu Logic (desktop + mobile) ---
    // Desktop also reveals on :hover and :focus-within via CSS. This adds click and
    // keyboard control, and keeps aria-expanded honest for screen readers.
    const dropdownItems = document.querySelectorAll('.main-nav .nav-item-dropdown');

    if (dropdownItems.length > 0) {
        const setOpen = (item, isOpen) => {
            const toggle = item.querySelector(':scope > button, :scope > a');
            item.classList.toggle('is-open', isOpen);
            if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        };

        const closeAll = (except) => {
            dropdownItems.forEach(item => {
                if (item !== except) setOpen(item, false);
            });
        };

        dropdownItems.forEach(item => {
            const toggle = item.querySelector(':scope > button, :scope > a');
            if (!toggle) return;

            // Click toggles .is-open (for keyboard and touch users).
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const willOpen = !item.classList.contains('is-open');
                closeAll(item);
                setOpen(item, willOpen);
            });

            // When the cursor leaves the dropdown area, clear .is-open and
            // blur the button. CSS :hover already hides the panel once the
            // cursor is gone, but we also need to release focus so it doesn't
            // hold the panel open via :focus-within or similar side effects.
            item.addEventListener('mouseleave', () => {
                if (window.innerWidth > 900) {
                    setOpen(item, false);
                    if (item.contains(document.activeElement)) {
                        document.activeElement.blur();
                    }
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            dropdownItems.forEach(item => {
                if (!item.classList.contains('is-open')) return;
                const toggle = item.querySelector(':scope > button, :scope > a');
                setOpen(item, false);
                if (toggle && item.contains(document.activeElement)) toggle.focus();
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.main-nav .nav-item-dropdown')) closeAll(null);
        });
    }

    // --- Image Zoom Functionality --- (Removed for simplicity)

    // --- Subscribe Form Logic ---
    // Handles both instances of social-share (top & bottom of blog posts)
    // AND the standalone form on the blog listing page
    const subscribeButtons = document.querySelectorAll('.share-subscribe');
    const subscribeForms = document.querySelectorAll('.subscribe-form');

    // Toggle form visibility when subscribe button is clicked
    subscribeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Find the adjacent form within the same social-share-buttons container
            const container = btn.closest('.social-share-buttons');
            const form = container ? container.querySelector('.subscribe-form') : null;
            if (form) {
                const isVisible = form.style.display !== 'none';
                form.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    form.querySelector('input[type="email"]').focus();
                }
            }
        });
    });

    // Handle form submission for ALL subscribe forms on the page
    subscribeForms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');
            const honeypot = form.querySelector('input[name="website"]');
            const submitBtn = form.querySelector('.subscribe-submit');
            const email = emailInput.value.trim();

            if (!email) return;

            // Show loading state
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            try {
                const res = await fetch('/.netlify/functions/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        website: honeypot ? honeypot.value : ''
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    emailInput.value = '';
                    // Only hide the form if it's inside a social-share container (toggle behavior)
                    if (form.closest('.social-share-buttons')) {
                        form.style.display = 'none';
                    }
                    showSubscribeToast('Subscribed! Check your inbox.', false);
                } else {
                    showSubscribeToast(data.error || 'Something went wrong. Try again.', true);
                }
            } catch (err) {
                showSubscribeToast('Network error. Please try again.', true);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    });

    function showSubscribeToast(message, isError) {
        // Use the first subscribe-toast on the page (they're fixed position so only one needed)
        const toast = document.querySelector('.subscribe-toast');
        if (!toast) return;
        const msgEl = toast.querySelector('.subscribe-toast-message');
        if (msgEl) msgEl.textContent = message;
        toast.classList.toggle('error', isError);
        // Support both class-based (social-share) and inline-styled (blog listing) toasts
        toast.classList.add('show');
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        setTimeout(() => {
            toast.classList.remove('show');
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(100px)';
        }, 4000);
    }

    // --- NEW: Video Modal Logic ---

    const videoContainers = document.querySelectorAll('.feature-video-container');
    if (videoContainers.length > 0) {
        // 1. Create and inject the modal structure into the page
        const modalHTML = `
            <div class="video-modal" id="video-modal">
                <div class="modal-content">
                    <button class="modal-close-button" id="modal-close-btn">×</button>
                    <div class="video-wrapper" id="video-wrapper">
                        <!-- Video/Iframe will be injected here -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 2. Get references to all necessary elements
        const modal = document.getElementById('video-modal');
        const modalCloseBtn = document.getElementById('modal-close-btn');
        const videoWrapper = document.getElementById('video-wrapper');

        // 3. Function to close the modal
        const closeModal = () => {
            modal.classList.remove('active');
            // IMPORTANT: Clear the wrapper to stop the video from playing in the background
            videoWrapper.innerHTML = '';
        };

        // 4. Add click event listeners to all video containers
        videoContainers.forEach(container => {
            container.addEventListener('click', () => {
                const youtubeSourceEl = container.querySelector('.modal-video-source');
                
                videoWrapper.innerHTML = ''; // Clear previous video

                if (youtubeSourceEl && youtubeSourceEl.dataset.modalSrc) {
                    // It's a YouTube video, create an iframe
                    videoWrapper.innerHTML = `<iframe src="${youtubeSourceEl.dataset.modalSrc}?autoplay=1&rel=0" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
                } else {
                    // It's a local MP4 video
                    const videoSourceEl = container.querySelector('video > source');
                    if (videoSourceEl && videoSourceEl.src) {
                        videoWrapper.innerHTML = `<video controls autoplay playsinline style="width:100%"><source src="${videoSourceEl.src}" type="video/mp4"></video>`;
                    }
                }

                // Show the modal only if content was added
                if (videoWrapper.children.length > 0) {
                     modal.classList.add('active');
                }
            });
        });

        // 5. Add event listeners to close the modal
        modalCloseBtn.addEventListener('click', closeModal);

        // Also close modal if the background is clicked
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close modal with the Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }
});