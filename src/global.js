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