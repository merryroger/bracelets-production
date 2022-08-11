import Pager from "./pager.js";

const settings = {
  frameDock: document.getElementById('review-model-frame'),
  band: document.getElementById('review-model-band'),
  ctrlDock: document.getElementById('review-band-controls'),
  items: Array.from(document.getElementById('review-model-band').querySelectorAll('.model-card')),
  swipSpotLr: document.getElementById('swip-spot-layer'),
  rightEdge: 50,
  append: (num) => {
    const id = (num < 10) ? `review-control-0${num}` : `review-control-${num}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'review-control';
    input.id = `${id}`;
    input.setAttribute('name', 'review-page');
    input.value = `${num}`;

    const label = document.createElement('label');
    label.className = 'review-control-label';
    label.setAttribute('for', `${id}`);
    label.tabIndex = 0;

    return {
      container: label,
      control: input,
    }
  },
  keydown: (cbf, e) => {
    if (e.keyCode == 0x0d || e.keyCode == 0x20) {
      e.preventDefault();
      const input = e.target.querySelector('input');
      if (!input.checked) {
        input.checked = true;
        cbf[0]({ target: input });
      }
    }
  },
}

const pager = new Pager(settings);
