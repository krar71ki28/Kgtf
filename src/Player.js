export class Player {
    constructor(engine) {
        this.engine = engine;
        document.getElementById('btn-play').onclick = () => {
            document.body.classList.add('play-mode');
            document.getElementById('play-ui').style.display = 'block';
        };
        document.getElementById('exit-play').onclick = () => {
            document.body.classList.remove('play-mode');
            document.getElementById('play-ui').style.display = 'none';
        };
    }
    update() {}
}
