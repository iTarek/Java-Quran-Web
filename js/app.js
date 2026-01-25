/**
 * QuranApp - Main Application Controller
 */
class QuranApp {
    constructor() {
        this.dataLoader = null;
        this.renderer = null;
        this.currentPage = 1;
        this.isReady = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading screen
            this.showLoading();

            // Load data
            console.log('Loading Quran data...');
            this.dataLoader = new QuranDataLoader();
            await this.dataLoader.loadAll();
            console.log('✓ Data loaded successfully');

            // Initialize renderer
            this.renderer = new PageRenderer(this.dataLoader);
            this.renderer.init(document.getElementById('pageContainer'));

            // Setup overlay navigation
            this.setupOverlay();

            // Setup navigation arrows
            this.setupNavArrows();

            // Check URL hash for initial page
            const initialPage = this.getPageFromHash() || 1;

            // Render first page
            await this.renderPage(initialPage);

            // Mark as ready
            this.isReady = true;

            // Hide loading, show app
            this.hideLoading();

            // Scale page to fit viewport (disabled - using CSS viewport units instead)
            // this.scaleToFit();
            // window.addEventListener('resize', () => this.scaleToFit());

            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError(error);
        }
    }

    /**
     * Scale page to fit viewport height (like SwiftUI aspectRatio .fit)
     */
    scaleToFit() {
        const page = document.querySelector('.quran-page');
        const container = document.querySelector('.page-container');
        if (!page || !container) return;

        // Reset transform to measure natural size
        page.style.transform = 'none';
        container.style.overflow = 'hidden';

        // Get measurements
        const viewportHeight = window.innerHeight;
        const pageHeight = page.offsetHeight;

        // Calculate scale to fit viewport
        if (pageHeight > viewportHeight) {
            const scale = (viewportHeight / pageHeight) * 0.98; // 98% to have small margin
            page.style.transform = `scale(${scale})`;
            page.style.transformOrigin = 'top center';
            // Adjust container height to match scaled content
            container.style.height = `${pageHeight * scale}px`;
        } else {
            page.style.transform = 'none';
            container.style.height = 'auto';
        }
    }

    /**
     * Render a specific page
     */
    async renderPage(pageNumber) {
        try {
            await this.renderer.renderPage(pageNumber);

            // Update current page
            this.currentPage = pageNumber;

            // Update navigation arrow states
            this.updateNavArrows();

            // Log page info
            const pageInfo = this.renderer.getPageInfo(pageNumber);
            if (pageInfo) {
                const [surah, startAyah, , endAyah] = pageInfo;
                const surahData = this.dataLoader.getSurah(surah - 1);
                console.log(`Page ${pageNumber}: ${surahData.name_ar} (${startAyah}-${endAyah})`);
            }
        } catch (error) {
            console.error('Failed to render page:', error);
            document.getElementById('pageContainer').innerHTML =
                `<p class="error">فشل تحميل الصفحة: ${error.message}</p>`;
        }
    }

    /**
     * Get page number from URL hash
     */
    getPageFromHash() {
        const hash = window.location.hash;
        const match = hash.match(/#page\/(\d+)/);
        if (match) {
            const page = parseInt(match[1]);
            if (page >= 1 && page <= 604) {
                return page;
            }
        }
        return null;
    }

    /**
     * Show loading screen
     */
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }

    /**
     * Hide loading screen
     */
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
    }

    /**
     * Show error message
     */
    showError(error) {
        document.getElementById('loading').innerHTML = `
      <div class="error-screen">
        <h2>⚠️ خطأ</h2>
        <p>${error.message}</p>
        <pre style="text-align: left; font-size: 12px;">${error.stack}</pre>
        <button onclick="location.reload()">إعادة المحاولة</button>
      </div>
    `;
    }

    /**
     * Setup overlay navigation
     */
    setupOverlay() {
        const overlay = document.getElementById('overlay');
        const navTabs = document.querySelectorAll('.nav-tab');

        // Populate lists
        this.populateSurahsList();
        this.populateJuzList();

        // Tab switching
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                document.getElementById('surahs-list').style.display = tabName === 'surahs' ? 'flex' : 'none';
                document.getElementById('juz-list').style.display = tabName === 'juz' ? 'flex' : 'none';
            });
        });

        // Close overlay on background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeOverlay();
            }
        });

        // Add click handlers to page headers/footers
        document.addEventListener('click', (e) => {
            if (e.target.closest('.page-header') || e.target.closest('.page-footer')) {
                this.openOverlay();
            }
        });
    }

    /**
     * Setup navigation arrows for prev/next page
     */
    setupNavArrows() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevPage());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }

        // Update arrow states based on current page
        this.updateNavArrows();
    }

    /**
     * Update navigation arrow states (disable at boundaries)
     */
    updateNavArrows() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const totalPages = 604; // Mushaf has 604 pages

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }

    /**
     * Go to previous page
     */
    prevPage() {
        if (this.currentPage > 1) {
            this.renderPage(this.currentPage - 1);
        }
    }

    /**
     * Go to next page
     */
    nextPage() {
        const totalPages = 604;
        if (this.currentPage < totalPages) {
            this.renderPage(this.currentPage + 1);
        }
    }

    /**
     * Populate surahs list
     */
    populateSurahsList() {
        const list = document.getElementById('surahs-list');
        const suwar = this.dataLoader.getData().suwar;

        list.innerHTML = suwar.map((surah, index) => `
            <div class="nav-list-item" data-page="${surah.start_page}">
                <span class="item-number">${this.arabicNumerals(index + 1)}</span>
                <span class="item-name">${surah.name_ar}</span>
                <span class="item-page">ص ${this.arabicNumerals(surah.start_page)}</span>
            </div>
        `).join('');

        // Add click handlers
        list.querySelectorAll('.nav-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = parseInt(item.dataset.page);
                this.renderPage(page);
                this.closeOverlay();
            });
        });
    }

    /**
     * Populate juz list
     */
    populateJuzList() {
        const list = document.getElementById('juz-list');
        const juzPages = this.dataLoader.getData().mushafMetadata.juz_pages;

        list.innerHTML = juzPages.slice(0, 30).map((page, index) => `
            <div class="nav-list-item" data-page="${page}">
                <span class="item-number">${this.arabicNumerals(index + 1)}</span>
                <span class="item-name">الجُزْءُ ${this.getJuzName(index + 1)}</span>
                <span class="item-page">ص ${this.arabicNumerals(page)}</span>
            </div>
        `).join('');

        // Add click handlers
        list.querySelectorAll('.nav-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = parseInt(item.dataset.page);
                this.renderPage(page);
                this.closeOverlay();
            });
        });
    }

    /**
     * Open overlay
     */
    openOverlay() {
        const overlay = document.getElementById('overlay');
        overlay.classList.add('active');

        // Update overlay title with current page info
        const pageNum = this.navigation.currentPage;
        const pageData = this.dataLoader.getData().pageMapping[String(pageNum)];
        if (pageData) {
            const surah = this.dataLoader.getData().suwar[pageData[1] - 1];
            document.getElementById('overlay-title').textContent = `سُورَةُ ${surah.name_ar}`;
            document.getElementById('overlay-page').textContent = `ص ${this.arabicNumerals(pageNum)}`;
        }
    }

    /**
     * Close overlay
     */
    closeOverlay() {
        document.getElementById('overlay').classList.remove('active');
    }

    /**
     * Convert to Arabic numerals
     */
    arabicNumerals(num) {
        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return String(num).split('').map(d => arabicDigits[parseInt(d)] || d).join('');
    }

    /**
     * Get juz name in Arabic words
     */
    getJuzName(juzNum) {
        const juzNames = [
            'الأَوَّل', 'الثَّانِي', 'الثَّالِث', 'الرَّابِع', 'الخَامِس',
            'السَّادِس', 'السَّابِع', 'الثَّامِن', 'التَّاسِع', 'العَاشِر',
            'الحَادِيَ عَشَرَ', 'الثَّانِيَ عَشَرَ', 'الثَّالِثَ عَشَرَ',
            'الرَّابِعَ عَشَرَ', 'الخَامِسَ عَشَرَ', 'السَّادِسَ عَشَرَ',
            'السَّابِعَ عَشَرَ', 'الثَّامِنَ عَشَرَ', 'التَّاسِعَ عَشَرَ',
            'العِشْرُونَ', 'الحَادِيَ وَالعِشْرُونَ', 'الثَّانِيَ وَالعِشْرُونَ',
            'الثَّالِثَ وَالعِشْرُونَ', 'الرَّابِعَ وَالعِشْرُونَ',
            'الخَامِسَ وَالعِشْرُونَ', 'السَّادِسَ وَالعِشْرُونَ',
            'السَّابِعَ وَالعِشْرُونَ', 'الثَّامِنَ وَالعِشْرُونَ',
            'التَّاسِعَ وَالعِشْرُونَ', 'الثَّلَاثُونَ'
        ];
        return juzNames[juzNum - 1] || this.arabicNumerals(juzNum);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.quranApp = new QuranApp();
    window.quranApp.init();
});
