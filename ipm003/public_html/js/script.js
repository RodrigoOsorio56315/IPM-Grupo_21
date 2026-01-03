function showPanel(id) {
    document.querySelectorAll('.panel').forEach(el => {
        if (el.id === id) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });
}

function hide(el) {
    el.style.display = 'none';
}

function fold() {
    let selector = 'h1 .subtitle, .team h2 span, .who .number, .who .email';

    document.querySelectorAll(selector).forEach(el => hide(el));
}

window.addEventListener('load', function () {
    // document.getElementsByTagName('body')[0].classList.remove('preload')

    let buttons = document.querySelectorAll('#master-panel button[data-panel]');

    buttons.forEach(el => {
        el.addEventListener('click', () => { showPanel(el.dataset.panel) })
    })

    showPanel('panel-instructions');
});
