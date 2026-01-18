// ============= PANEL RESIZE =============

function initPanelResize(panel) {
    const resizeHandle = panel.querySelector('.resize-handle');
    if (!resizeHandle) return;

    let startY = 0;
    let startHeight = 0;
    const minHeight = 100;
    const maxHeightRatio = 0.8; // 80% of viewport

    const onMouseMove = (e) => {
        const deltaY = startY - e.clientY;
        const newHeight = Math.min(
            Math.max(startHeight + deltaY, minHeight),
            window.innerHeight * maxHeightRatio
        );
        panel.style.height = newHeight + 'px';
    };

    const onMouseUp = () => {
        panel.classList.remove('resizing');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startY = e.clientY;
        startHeight = panel.offsetHeight;
        panel.classList.add('resizing');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

function initAllPanelResizers() {
    document.querySelectorAll('.detail-panel').forEach(panel => {
        initPanelResize(panel);
    });
}
