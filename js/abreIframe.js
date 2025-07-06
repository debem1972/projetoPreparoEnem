
/*function abrirAjudaVideo(event) {
    event.preventDefault();
    const iframe = document.getElementById("iframeAjuda");
    iframe.src = "./video/atalhoHelp.mp4";
    iframe.style.display = "block";
}*/

// Função para fechar o iframe de ajuda

/*function abrirAjudaVideo(event) {
    event.preventDefault();
    const playerDiv = document.getElementById("ajudaPlayer");
    const iframe = document.getElementById("iframeAjuda");

    iframe.src = "./video/atalhoHelp.mp4";
    playerDiv.style.display = "block";
}

function fecharAjudaVideo() {
    const playerDiv = document.getElementById("ajudaPlayer");
    const iframe = document.getElementById("iframeAjuda");

    iframe.src = "";
    playerDiv.style.display = "none";
}*/

//Opção com vídeo ao invés de iframe

/*function abrirAjudaVideo(event) {
    event.preventDefault();
    const playerDiv = document.getElementById("ajudaPlayer");
    const video = document.getElementById("videoAjuda");

    playerDiv.style.display = "block";
    video.pause();      // Garante que ele comece parado
    video.currentTime = 0;
}

function fecharAjudaVideo() {
    const playerDiv = document.getElementById("ajudaPlayer");
    const video = document.getElementById("videoAjuda");

    video.pause();
    video.currentTime = 0;
    playerDiv.style.display = "none";
}*/

//-------------------------------------------------
//Nova abordagem
function abrirAjudaVideo(event) {
    event.preventDefault();

    const playerDiv = document.getElementById("ajudaPlayer");
    const video = document.getElementById("videoAjuda");

    playerDiv.classList.remove("d-none");      // Exibe o conteúdo
    video.pause();                             // Garante que o vídeo não inicie sozinho
    video.currentTime = 0;
}

function fecharAjudaVideo() {
    const playerDiv = document.getElementById("ajudaPlayer");
    const video = document.getElementById("videoAjuda");

    video.pause();
    video.currentTime = 0;
    playerDiv.classList.add("d-none");         // Oculta o conteúdo novamente
}






