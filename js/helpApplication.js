/*function toggleSubAjuda(event) {
    event.preventDefault();
    const subLista = document.getElementById('subAjudaAplicacao');
    subLista.classList.toggle('d-none');
}*/

//Nova funcionalidade com o caret...

function toggleSubAjuda(event) {
    event.preventDefault();
    const subLista = document.getElementById('subAjudaAplicacao');
    const caret = document.getElementById('caretAjuda');

    const isHidden = subLista.classList.contains('d-none');
    subLista.classList.toggle('d-none');

    // Alterna o ícone do caret
    caret.textContent = isHidden ? '▴' : '▾';
}



