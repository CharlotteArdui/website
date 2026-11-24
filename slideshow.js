const portfolio = document.getElementById('portfolio');
const filmstrip = document.getElementById('filmstrip');
const firstReel = filmstrip.firstElementChild;
const artwork = [...firstReel.querySelectorAll('img')];
let measurements = [];
let reelCount = 0;
let stageHeight = 0;
const motionButton = document.getElementById('toggle-motion');
const controls = document.getElementById('controls');
const controlsButtons = [...controls.querySelectorAll('button')];
const footnote = document.getElementById('artwork-footnote');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const maxSpeedMultiplier = 8;
const footnotes = new Map(Object.entries({
  "periphery": "Faith in the Periphery. Design reserach for the future of post-war churches in relation to neighbourhood development. PhD Research KU Leuven. Supervisors: Sven Sterken and Roel De Ridder (2026).",
  "verdichten": "Ver(der)dichten: Alternative Futures for the Flemish low-density allotment. With Glenn Schurmans and Patrick De Keyser. Master’s dissertation, University of Antwerp. Tutors: Erik Wiëers and Koen Van Bockstal.",
  "church-publication": "Book project to expose the architectural design conducted within the framework of the Project Office for Redevelopment of Churches. Commissioned by The Flemish Government Architect Team. With Sven Sterken, Erik Wieërs, Sara Vermeulen, Els Vervloesem, Karin Borghouts (2014)",
  "hof-ter-beke": "Under the Guise of the Dovecote: A Productive Landscape for Hof ter Beke. Laureate for the Meesterproef Heritage and Adaptive Reuse, organised by the Flemish Government Architect. (2017)",
  "bonhoeffer": "Conceptual design for the Dietrich Bonhoeffer Kirche in Hannover; with Ina Baeteman (2020)",
  "sint-clara": "Spatial, programmatic and financial feasibility study for the redevelopment of Sint-Clara Church and its site. In collaboration with DOGMA, Tatiana Bilbao Estudio, Rotor and Sven Sterken; supervised by the BMA.",
  "dichter-wonen": "Co-curation (conceptual creation and scenography design), Dichter Wonen, Ruimer Leven in Dessauvage’s Sint Jozef church in Vosselaar; with AR-TUR and University of Antwerp (2015)",
  "sint-rochus": "Feasibility study for the Sint-Rochus Memorial in Aarschot, with Saidja Heynickx (2023)",
  "twin-houses": "Twin houses in Antwerp for AG Vespa; with Komaan Architecten (2022)"
}));

let playing = !motionPreference.matches;
let frame = 0;
let lastFrameTime = 0;
let distance = 0;
let loopWidth = 0;
let stripLeft = 0;
let stripTop = 0;
let baseSpeed = 29;
let viewportWidth = 0;
let pointerX = 0;
let activeArtwork = null;

function paintPosition() {
  filmstrip.style.transform = `translate3d(${-distance}px, 0, 0)`;
}

function positionFootnote() {
  const stage = portfolio.getBoundingClientRect();
  const photo = activeArtwork.getBoundingClientRect();
  if (photo.right <= stage.left || photo.left >= stage.right) {
    showFootnote(null);
    return;
  }

  const rightInset = 16;
  const photoLeft = Math.max(0, photo.left - stage.left);
  const preferredWidth = Math.min(Math.max(photo.width, 235), 420, stage.width - rightInset);
  const minimumWidth = Math.min(preferredWidth, 140);
  const left = Math.min(photoLeft, stage.width - minimumWidth - rightInset);
  footnote.style.left = `${left}px`;
  footnote.style.top = `${photo.bottom - stage.top + 11}px`;
  footnote.style.width = `${Math.min(preferredWidth, stage.width - left - rightInset)}px`;

  let note = footnote.getBoundingClientRect();
  if (note.bottom > stage.bottom - 8) {
    const widerWidth = Math.min(Math.max(preferredWidth, 360), stage.width - rightInset);
    footnote.style.left = `${Math.min(photoLeft, stage.width - widerWidth - rightInset)}px`;
    footnote.style.width = `${widerWidth}px`;
    note = footnote.getBoundingClientRect();
  }

  for (const button of controlsButtons) {
    const box = button.getBoundingClientRect();
    const overlaps = note.left < box.right && note.right > box.left && note.bottom > box.top + 10;
    button.toggleAttribute('data-footnote-overlap', overlaps);
  }
}

function showFootnote(image) {
  if (activeArtwork === image) return;

  activeArtwork = image;
  footnote.hidden = !image;
  if (image) {
    footnote.textContent = footnotes.get(image.dataset.credit);
    positionFootnote();
  } else {
    for (const button of controlsButtons) button.removeAttribute('data-footnote-overlap');
  }
  updatePlayback();
}

function sizeFilmstrip() {
  const portfolioBox = portfolio.getBoundingClientRect();
  const reelBox = firstReel.getBoundingClientRect();
  const stripStyle = getComputedStyle(filmstrip);
  const previousLoopWidth = loopWidth;
  loopWidth = reelBox.width + parseFloat(stripStyle.columnGap);
  stripLeft = parseFloat(stripStyle.left);
  stripTop = reelBox.top - portfolioBox.top;
  viewportWidth = portfolioBox.width;
  baseSpeed = viewportWidth <= 720 ? 32 : 29;

  if (previousLoopWidth > 0) distance *= loopWidth / previousLoopWidth;

  stageHeight = portfolioBox.height;
  measurements = artwork.map((image) => {
    const box = image.getBoundingClientRect();
    return {
      x: box.left - reelBox.left,
      width: box.width,
      height: box.height,
    };
  });

  reelCount = Math.ceil(portfolioBox.width / loopWidth) + 1;
  while (filmstrip.childElementCount > reelCount) filmstrip.lastElementChild.remove();
  while (filmstrip.childElementCount < reelCount) {
    const duplicate = firstReel.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    filmstrip.append(duplicate);
  }

  paintPosition();
  if (activeArtwork) positionFootnote();
}

function advanceFilmstrip(time) {
  if (lastFrameTime) {
    const elapsed = Math.min(time - lastFrameTime, 50);
    const midpoint = viewportWidth / 2;
    const rightHalfWidth = Math.max(1, viewportWidth - 1 - midpoint);
    const progress = Math.max(0, Math.min(1, (pointerX - midpoint) / rightHalfWidth));
    const speed = baseSpeed * (1 + (maxSpeedMultiplier - 1) * progress);
    distance = (distance + speed * elapsed / 1000) % loopWidth;
    paintPosition();
  }
  lastFrameTime = time;
  frame = requestAnimationFrame(advanceFilmstrip);
}

function updatePlayback() {
  const label = playing ? 'Pause slideshow' : 'Play slideshow';
  motionButton.dataset.playing = String(playing);
  motionButton.setAttribute('aria-label', label);
  motionButton.title = label;

  cancelAnimationFrame(frame);
  lastFrameTime = 0;
  if (playing && !activeArtwork && !document.hidden) {
    frame = requestAnimationFrame(advanceFilmstrip);
  }
}

function slideshowImage(target) {
  return target instanceof HTMLImageElement && filmstrip.contains(target) ? target : null;
}

function trackHoverPosition(event) {
  if (event.pointerType !== 'touch') pointerX = event.clientX;
}

portfolio.addEventListener('pointerenter', trackHoverPosition);
portfolio.addEventListener('pointermove', trackHoverPosition);
portfolio.addEventListener('pointerleave', (event) => {
  if (event.pointerType !== 'touch') pointerX = 0;
});

filmstrip.addEventListener('pointerover', (event) => {
  const image = slideshowImage(event.target);
  if (image && event.pointerType !== 'touch') showFootnote(image);
});

filmstrip.addEventListener('pointerout', (event) => {
  if (event.target === activeArtwork && event.pointerType !== 'touch') {
    showFootnote(slideshowImage(event.relatedTarget));
  }
});

portfolio.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch') {
    const image = slideshowImage(event.target);
    showFootnote(image === activeArtwork ? null : image);
  }
});

motionButton.addEventListener('click', () => {
  playing = !playing;
  updatePlayback();
});

document.addEventListener('visibilitychange', updatePlayback);
motionPreference.addEventListener('change', (event) => {
  playing = !event.matches;
  updatePlayback();
});

sizeFilmstrip();
new ResizeObserver(sizeFilmstrip).observe(portfolio);
controls.hidden = false;
updatePlayback();
