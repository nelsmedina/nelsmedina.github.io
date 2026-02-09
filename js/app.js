/**
 * Nelson D. Medina - Personal Website
 * Canvas oscilloscope, panel switching, scroll animations
 */
(function () {
    'use strict';

    // =========================================================================
    // Canvas Oscilloscope - live scrolling paired recording
    // =========================================================================

    function initOscilloscope() {
        const container = document.getElementById('ephys');
        const canvas = document.getElementById('ephys-canvas');
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        let ephysData = null;
        let animId = null;
        let startTime = null;
        let isVisible = false;

        // Visual params
        const COLORS = { v1: '#CC6677', v2: '#44AA99' };
        const LINE_WIDTH = window.innerWidth < 768 ? 1 : 1.5;
        // Seconds of data visible at once
        const WINDOW_SECONDS = 20;
        const SPEED = window.innerWidth < 768 ? 0.6 : 0.4;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function mapY(value, yMin, yMax, top, bottom) {
            return top + (bottom - top) * (1 - (value - yMin) / (yMax - yMin));
        }

        function drawTrace(data, startIdx, endIdx, totalLen, w, yTop, yBot, yMin, yMax, color) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = LINE_WIDTH;
            ctx.lineJoin = 'round';

            const pointCount = endIdx - startIdx;
            if (pointCount <= 0) return;

            let first = true;
            for (let i = 0; i < pointCount; i++) {
                const dataIdx = (startIdx + i) % totalLen;
                const x = (i / pointCount) * w;
                const y = mapY(data[dataIdx], yMin, yMax, yTop, yBot);

                if (first) {
                    ctx.moveTo(x, y);
                    first = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        function draw(timestamp) {
            if (!ephysData || !isVisible) return;

            if (!startTime) startTime = timestamp;
            const elapsed = (timestamp - startTime) / 1000;

            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);

            // Clear (transparent so EM banner shows through)
            ctx.clearRect(0, 0, w, h);

            const { v1, v2, y_min, y_max, ms_per_pair } = ephysData;
            const totalLen = v1.length;

            const windowMs = WINDOW_SECONDS * 1000;
            const pointsPerMs = 2 / ms_per_pair;
            const windowPoints = Math.floor(windowMs * pointsPerMs);

            // Current scroll position (wraps around for seamless loop)
            const scrollMs = elapsed * 1000 * SPEED;
            const scrollPoints = Math.floor(scrollMs * pointsPerMs) % totalLen;

            // Top trace pushed down significantly to overlap the bottom trace
            const yTop1 = h * 0.15;
            const yBot1 = h * 0.70;
            // Bottom trace stays in lower portion
            const yTop2 = h * 0.30;
            const yBot2 = h * 0.85;

            const yPad = (y_max - y_min) * 0.05;
            const yMin = y_min - yPad;
            const yMax = y_max + yPad;

            drawTrace(v1, scrollPoints, scrollPoints + windowPoints, totalLen, w, yTop1, yBot1, yMin, yMax, COLORS.v1);
            drawTrace(v2, scrollPoints, scrollPoints + windowPoints, totalLen, w, yTop2, yBot2, yMin, yMax, COLORS.v2);

            animId = requestAnimationFrame(draw);
        }

        // Load data
        fetch('assets/ephys_loop.json')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                ephysData = data;
                resize();
                var observer = new IntersectionObserver(
                    function (entries) {
                        entries.forEach(function (entry) {
                            if (entry.isIntersecting && !isVisible) {
                                isVisible = true;
                                startTime = null;
                                animId = requestAnimationFrame(draw);
                            } else if (!entry.isIntersecting && isVisible) {
                                isVisible = false;
                                if (animId) cancelAnimationFrame(animId);
                            }
                        });
                    },
                    { threshold: 0.05 }
                );
                observer.observe(container);
            })
            .catch(function () {});

        window.addEventListener('resize', function () { resize(); });
    }

    // =========================================================================
    // Intersection Observer for fade-in animations
    // =========================================================================

    function initFadeAnimations() {
        const elements = document.querySelectorAll('.fade-in');
        if (!elements.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        elements.forEach((el) => observer.observe(el));
    }

    // =========================================================================
    // Research panel switching
    // =========================================================================

    function initResearchPanels() {
        const buttons = document.querySelectorAll('.research-btn');
        const panels = document.querySelectorAll('.research-panel');

        if (!buttons.length) return;

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var panelId = btn.dataset.panel;

                buttons.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');

                panels.forEach(function (p) { p.classList.remove('active'); });
                var target = document.getElementById('panel-' + panelId);
                if (target) target.classList.add('active');

                // Switch backdrop state
                document.body.classList.remove('tab-birdsong', 'tab-connectomics', 'tab-songmemory');
                document.body.classList.add('tab-' + panelId);
            });
        });

    }

    // =========================================================================
    // Hero parallax
    // =========================================================================

    function initHeroParallax() {
        const heroBg = document.querySelector('.hero-bg');
        const heroContent = document.querySelector('.hero-content');
        if (!heroBg) return;

        var isMobile = window.innerWidth < 768;

        if (!isMobile) {
            heroBg.style.willChange = 'transform';
        }

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const heroH = window.innerHeight;
            if (!isMobile) {
                heroBg.style.transform = 'translate3d(0,' + (scrollY * -0.07) + 'px,0)';
            }
            if (heroContent && scrollY < heroH) {
                var fadeDist = isMobile ? heroH * 1.2 : heroH * 0.6;
                heroContent.style.opacity = Math.max(0, 1 - scrollY / fadeDist);
            }
        }, { passive: true });
    }

    // =========================================================================
    // Segmentation layer toggles
    // =========================================================================

    function initSegToggles() {
        var buttons = document.querySelectorAll('.seg-toggle');
        var layers = document.querySelectorAll('.hero-bg-seg');
        if (!buttons.length) return;

        var soloSeg = null; // tracks which seg is currently solo'd

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var seg = btn.dataset.seg;

                if (soloSeg === seg) {
                    // Clicking the solo'd one again: show all
                    soloSeg = null;
                    buttons.forEach(function (b) { b.classList.add('active'); });
                    layers.forEach(function (l) { l.classList.remove('seg-hidden'); });
                } else {
                    // Solo this one: hide the others
                    soloSeg = seg;
                    buttons.forEach(function (b) {
                        b.classList.toggle('active', b.dataset.seg === seg);
                    });
                    layers.forEach(function (l) {
                        l.classList.toggle('seg-hidden', l.dataset.seg !== seg);
                    });
                }
            });
        });
    }

    // =========================================================================
    // Gallery image expand on click
    // =========================================================================

    function initGalleryExpand() {
        document.querySelectorAll('.gallery-img').forEach(function (img) {
            img.addEventListener('click', function () {
                var wasExpanded = img.classList.contains('expanded');
                // Collapse any other expanded image first
                document.querySelectorAll('.gallery-img.expanded').forEach(function (other) {
                    other.classList.remove('expanded');
                });
                if (!wasExpanded) img.classList.add('expanded');
            });
        });
    }

    // =========================================================================
    // Initialize
    // =========================================================================

    document.addEventListener('DOMContentLoaded', () => {
        initOscilloscope();
        initResearchPanels();
        initFadeAnimations();
        initHeroParallax();
        initSegToggles();
        initGalleryExpand();
    });
})();
