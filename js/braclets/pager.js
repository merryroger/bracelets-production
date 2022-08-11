/**
 * The Object Pager JavaScript library
 * version 0.1.4
 * © 2022 Ehwaz Raido
 * 05/Aug/2022 .. 10/Aug/2022
 */

const Pager = class ObjectPager {

  _settings = {
    frameDock: null,
    band: null,
    ctrlDock: null,
    items: [],
    swipSpotLr: null,
    rightEdge: 15,
    append: () => { return {} },
    keydown: (e) => { },
  }

  _parameters = {
    ctrlDockWidth: 0,
    itemRect: {},
    frameRect: {},
    bandRect: null,
    gap: 0,
    rows: 1,
    moveLength: 1,
    itemsPerScreen: 1,
    movesNeeded: 0,
    shift: 0,
  }

  constructor(settings = {}) {
    this._toh = 0;
    this._tmh = 0;
    this._swipping = false;
    this._dragging = false;
    this._moving = false;
    this._focused = null;
    this._swiX = 0;
    this._swipInfo = {
      dir: 10,
      lastX: 0,
      reset: (x) => { this._swipInfo.dir = 0; this._swipInfo.lastX = x },
      update: (x) => {
        this._swipInfo.dir = (x == this._swipInfo.lastX.x) ? 0 : ((x < this._swipInfo.lastX) ? 1 : -1),
          this._swipInfo.lastX = x
      },
    };
    this._setUp(settings);
    this._move = this._doMove.bind(this);
    this._resized = this._reSized.bind(this);
    this._recalc = this._reCalcAfterResize.bind(this);
    this._keydown = this._settings.keydown.bind(this, [this._move]);
    this._ptrdn = this._pointerDown.bind(this);
    this._ptrmv = this._pointerMove.bind(this);
    this._ptrup = this._pointerUp.bind(this);
    this._cardclk = this._cardClick.bind(this);
    this._trend = this._transitionEnd.bind(this);
    this._focbytab = this._focusCardsByTab.bind(this);
    this._hangListeners();
    this._resetBand();
    this._reCalcSizes();
  }

  _setUp(data) {
    for (let [key, val] of Object.entries(data)) {
      this._settings[key] = val;
    }
  }

  _reCalcSizes() {
    this._parameters.ctrlDockWidth = this._settings.ctrlDock.offsetWidth;
    const itemRect = this._settings.items[0].getBoundingClientRect();
    const frameRect = this._parameters.frameRect = this._settings.frameDock.getBoundingClientRect();
    const bandRect = this._parameters.bandRect = this._settings.band.getBoundingClientRect();
    let rows = Math.floor(bandRect.height / itemRect.height);
    rows = this._parameters.rows = (rows == 0) ? 1 : rows;
    const rowMaxCapacity = Math.ceil(this._settings.items.length / rows);
    const gap = (rowMaxCapacity < 2) ? 0 : this._parameters.gap = Math.floor((bandRect.width - itemRect.width * rowMaxCapacity) / (rowMaxCapacity - 1));
    const moveLength = this._parameters.moveLength = itemRect.width + gap;
    const itemsPerScreen = this._parameters.itemsPerScreen = Math.floor((frameRect.width + gap) / moveLength);
    const movesNeeded = this._parameters.movesNeeded = Math.ceil(rowMaxCapacity / itemsPerScreen);
    this._rebuildControls(movesNeeded);
    this._toh = 0;
  }

  _rebuildControls(cnt) {
    const controls = Array.from(this._settings.ctrlDock.querySelectorAll('label'));
    let ctrlSet = [];
    if (cnt == controls.length) {
      return;
    } else if (cnt > controls.length) {
      ctrlSet = this._appendControls(controls, cnt);
    } else {
      ctrlSet = this._reduceControls(controls, cnt);
      this._settings.ctrlDock.innerHTML = '';
    }

    this._settings.ctrlDock.append(...ctrlSet);
  }

  _appendControls(controls, upTo) {
    const newCtrls = [];
    for (let i = controls.length; i < upTo; i++) {
      let ctrl = this._settings.append(i + 1);
      ctrl.control.addEventListener('change', this._move);
      ctrl.container.addEventListener('keydown', this._keydown);
      ctrl.container.append(ctrl.control);
      newCtrls.push(ctrl.container);
    }

    return newCtrls;
  }

  _reduceControls(controls, downTo) {
    const trash = controls.splice(downTo);
    trash.forEach((elem) => {
      elem.removeEventListener('keydown', this._keydown);
      elem.querySelector('input').removeEventListener('change', this._move);
      elem = null;
    });

    return controls;
  }

  _doMove(e) {
    const treck = this._parameters.moveLength * this._parameters.itemsPerScreen;
    let dX = -1 * (e.target.value - 1) * treck;
    dX = (dX + this._parameters.bandRect.right + this._settings.rightEdge - this._parameters.shift < this._parameters.frameRect.right) ?
      this._parameters.frameRect.right - this._parameters.bandRect.right - this._settings.rightEdge + this._parameters.shift :
      dX;
    this._settings.band.style.setProperty('transform', `translateX(${dX}px)`);
  }

  _hangListeners() {
    const controls = Array.from(this._settings.ctrlDock.querySelectorAll('label'));
    controls.forEach((control) => {
      control.querySelector('input').addEventListener('change', this._move);
      control.addEventListener('keydown', this._keydown), { capture: true, passive: false };
    });

    this._hangTouchHandleListeners();
    this._hangMouseHandleListeners();

    this._settings.frameDock.addEventListener('keyup', this._focbytab);
    this._settings.band.addEventListener('click', this._cardclk);
    window.addEventListener('resize', this._resized);
  }

  _hangTouchHandleListeners() {
    document.addEventListener('touchstart', (e) => {
      if (this._parameters.movesNeeded > 1 && e.target.closest('#review-model-band')) {
        this._swipping = true;
        e.stopPropagation();
        e.preventDefault();
        this._ptrdn({ target: e.target, clientX: e.changedTouches[0].pageX });
      }
    });
    document.addEventListener('touchmove', (e) => {
      if (this._swipping) {
        e.preventDefault();
        e.stopPropagation();
        this._ptrmv({ clientX: e.changedTouches[0].pageX });
      }
    }, { passive: false });
    document.addEventListener('touchend', (e) => {
      if (this._swipping) {
        this._ptrup({ clientX: e.changedTouches[0].pageX });
        this._swipping = false;
      }
    });
  }

  _hangMouseHandleListeners() {
    this._settings.band.addEventListener('mousedown', (e) => {
      if (this._parameters.movesNeeded > 1 && e.target.closest('#review-model-band')) {
        this._dragging = true;
        e.preventDefault();
        e.stopPropagation();
        this._ptrdn(e);
      }
    }, true);
    document.addEventListener('mousemove', (e) => {
      if (this._dragging) {
        e.preventDefault();
        e.stopPropagation();
        this._moving = e.which > 0;
        this._ptrmv(e);
      }
    });
    document.addEventListener('mouseup', (e) => {
      if (this._dragging) {
        e.preventDefault();
        e.stopPropagation();
        this._ptrup(e);
        this._dragging = false;
      }
    }, true);
  }

  _resetBand() {
    const input = this._settings.ctrlDock.querySelectorAll('input')[0];
    input.checked = true;
    this._settings.band.style.setProperty('transform', `translateX(0)`);
  }

  _getCardAtLeftPosition(cv) {
    return (cv == 1) ? 1 :
      (cv == this._parameters.movesNeeded) ? this._settings.items.length :
        (cv - 1) * this._parameters.itemsPerScreen + 1;
  }

  _getFocusedCardNum() {
    let cardNum = 0;
    const focused = (this._focused !== null) ? this._focused : document.querySelector(":focus");
    this._settings.items.forEach((item, index) => {
      if (item === focused) {
        cardNum = index + 1;
      }
    });

    return cardNum;
  }

  _getCurrentPageValue() {
    const pn = this._settings.ctrlDock['review-page'].value;
    const input = this._settings.ctrlDock.querySelectorAll('input')[pn - 1];
    input.closest('label').blur();

    return pn;
  }
  _reCalcAfterResize() {
    if (this._parameters.ctrlDockWidth != this._settings.ctrlDock.offsetWidth) {
      let cv = this._getCurrentPageValue();
      let atLeftEdge = this._getCardAtLeftPosition(cv);
      const focusedCard = this._getFocusedCardNum();
      this._parameters.shift = +getComputedStyle(this._settings.band).transform.split(', ')[4];

      this._reCalcSizes();

      atLeftEdge = (focusedCard && (focusedCard - atLeftEdge) >= this._parameters.itemsPerScreen) ? focusedCard : atLeftEdge;
      cv = Math.floor((atLeftEdge - 1) / (this._parameters.itemsPerScreen * this._parameters.rows));
      const input = this._settings.ctrlDock.querySelectorAll('input')[cv];
      input.checked = true;
      this._doMove({ target: input });
      //this._settings.band.style.setProperty('transform', `translateX(-${((atLeftEdge - 1) * this._parameters.moveLength)}px)`);
    }
  }

  _reCalcAfterSwip(lastShift) {
    this._settings.band.style.setProperty('transition', 'transform .1s ease-in-out');
    let cv = this._getCurrentPageValue();
    let atEdge = true;

    if (lastShift > 0) {
      cv = 0;
    } else if (lastShift + this._parameters.bandRect.width < this._parameters.frameRect.right) {
      cv = this._settings.items.length - 1;
    } else {
      lastShift -= ((this._swipInfo.dir == -1)) ? 0 : this._parameters.frameRect.width - this._parameters.itemsPerScreen * this._parameters.moveLength;
      cv = Math.round(-lastShift / this._parameters.moveLength);
      atEdge = false;
    }

    const input = this._settings.ctrlDock.querySelectorAll('input')[Math.floor(cv / (this._parameters.itemsPerScreen * this._parameters.rows))];
    input.checked = true;
    if (atEdge) {
      this._doMove({ target: input });
    } else {
      this._cardSelect(cv);
    }

    this._tmh = setTimeout(this._trend, 110);
  }

  _cardSelect(cv) {
    if (this._swipInfo.dir == -1) {
      this._settings.band.style.setProperty('transform', `translateX(-${(cv * this._parameters.moveLength)}px)`);
    } else {
      this._settings.band.style.setProperty('transform', `translateX(-${(cv + this._parameters.itemsPerScreen) * this._parameters.moveLength - this._parameters.frameRect.width - this._parameters.gap + this._settings.rightEdge}px)`);
    }
  }

  _reSized() {
    if (this._toh !== 0) {
      clearTimeout(this._toh);
      this._toh = 0;
    }

    this._toh = setTimeout(this._recalc, 300);
  }

  _pointerDown(e) {
    this._swiX = e.clientX - +getComputedStyle(this._settings.band).transform.split(', ')[4];
    this._swipInfo.reset(e.clientX);
    this._settings.band.style.setProperty('transition', 'transform 0s linear');
    this._focused = e.target.closest('.model-card');
  }

  _pointerMove(e) {
    clearTimeout(this._tmh);
    const dX = e.clientX - this._swiX;
    this._swipInfo.update(e.clientX);
    this._settings.band.style.setProperty('transform', `translateX(${dX}px)`);
  }

  _pointerUp(e) {
    const dX = e.clientX - this._swiX;
    this._settings.band.style.setProperty('transform', `translateX(${dX}px)`);
    this._reCalcAfterSwip(dX);
  }

  _cardClick(e) {
    if (this._moving) {
      e.preventDefault();
    }
  }

  _transitionEnd() {
    this._settings.band.style.setProperty('transition', 'transform .5s ease-in-out');
    this._moving = false;
  }

  _focusCardsByTab(e) {
    if (this._parameters.movesNeeded > 1 && e.target.closest('.model-card') !== null && e.keyCode == 0x9) {
      this._settings.band.style.setProperty('transition', 'transform .1s ease-in-out');
      this._focused = e.target.closest('.model-card');
      const cv = this._getFocusedCardNum();
      const bandShift = Math.abs(+getComputedStyle(this._settings.band).transform.split(', ')[4]);
      const leftCard = Math.floor(bandShift / this._parameters.moveLength);
      const rightCard = Math.floor(bandShift / this._parameters.moveLength) + this._parameters.itemsPerScreen;
      const leftAligned = bandShift % this._parameters.moveLength == 0;
      const page = Math.floor((cv - 1) / (this._parameters.itemsPerScreen * this._parameters.rows));
      const input = this._settings.ctrlDock.querySelectorAll('input')[page];
      input.checked = true;
      let anchor = 0;

      if (leftAligned) {
        if (cv > rightCard) {
          anchor++;
          this._swipInfo.dir = 1;
        } else if (cv == leftCard) {
          anchor = cv - 1;
          this._swipInfo.dir = 1;
        }
      } else {
        if (cv > rightCard) {
          anchor = cv - this._parameters.itemsPerScreen;
          this._swipInfo.dir = 1;
        } else if (cv == leftCard + 1) {
          anchor = rightCard - this._parameters.itemsPerScreen;
          this._swipInfo.dir =  (cv == 1) ? -1 : 1;
        } else if (cv < leftCard) {
          anchor = cv - 1;
          this._swipInfo.dir = -1;
        }
      }
      //console.log(anchor, cv, leftCard, rightCard, leftAligned);

      this._cardSelect(anchor);
      this._swipInfo.dir = 0;
      this._tmh = setTimeout(this._trend, 110);
    }
  }

}

export default Pager;
