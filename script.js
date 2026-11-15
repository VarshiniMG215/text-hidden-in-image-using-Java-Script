// ---------- elements ----------
const hideFile = document.getElementById("hideFile");
const secretText = document.getElementById("secretText");
const capacityText = document.getElementById("capacityText");
const hideBtn = document.getElementById("hideBtn");
const hideError = document.getElementById("hideError");

const beforeCanvas = document.getElementById("beforeCanvas");
const afterCanvas = document.getElementById("afterCanvas");
const diffCanvas = document.getElementById("diffCanvas");
const diffArea = document.getElementById("diffArea");
const diffSlider = document.getElementById("diffSlider");
const diffInfo = document.getElementById("diffInfo");
const downloadLink = document.getElementById("downloadLink");

const revealFile = document.getElementById("revealFile");
const revealCanvas = document.getElementById("revealCanvas");
const revealBtn = document.getElementById("revealBtn");
const revealError = document.getElementById("revealError");
const resultBox = document.getElementById("resultBox");
const resultText = document.getElementById("resultText");

const MAX_WIDTH = 1000;

let originalData = null;
let encodedData = null;
let revealLoaded = false;


// ---------- load an image into a canvas ----------
function loadImage(file, canvas, shrink, done) {
  const reader = new FileReader();

  reader.onload = function () {
    const img = new Image();

    img.onload = function () {
      let w = img.width;
      let h = img.height;

      if (shrink && w > MAX_WIDTH) {
        h = Math.round(h * (MAX_WIDTH / w));
        w = MAX_WIDTH;
      }

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      done(ctx.getImageData(0, 0, w, h));
    };

    img.src = reader.result;
  };

  reader.readAsDataURL(file);
}


// ---------- bits and bytes ----------
function numberToBits(num, length) {
  const bits = [];
  for (let i = length - 1; i >= 0; i--) {
    bits.push((num >> i) & 1);
  }
  return bits;
}

function textToBits(text) {
  const bytes = new TextEncoder().encode(text);

  // first 32 bits = how many bytes the message has
  let bits = numberToBits(bytes.length, 32);

  for (let i = 0; i < bytes.length; i++) {
    bits = bits.concat(numberToBits(bytes[i], 8));
  }
  return bits;
}

// every pixel has R, G, B, A. we skip A, so 3 usable values per pixel
function dataIndex(bitNumber) {
  return bitNumber + Math.floor(bitNumber / 3);
}

function getCapacityInBytes(imageData) {
  const totalBits = imageData.width * imageData.height * 3;
  return Math.floor((totalBits - 32) / 8);
}


// ---------- hide ----------
function hideBits(imageData, bits) {
  const copy = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  for (let i = 0; i < bits.length; i++) {
    const index = dataIndex(i);
    copy.data[index] = (copy.data[index] & 254) | bits[i];
  }
  return copy;
}


// ---------- reveal ----------
function readBits(imageData, count, start) {
  const bits = [];
  for (let i = start; i < start + count; i++) {
    bits.push(imageData.data[dataIndex(i)] & 1);
  }
  return bits;
}

function bitsToNumber(bits) {
  let num = 0;
  for (let i = 0; i < bits.length; i++) {
    num = num * 2 + bits[i];
  }
  return num;
}

function revealMessage(imageData) {
  const length = bitsToNumber(readBits(imageData, 32, 0));

  if (length === 0 || length > getCapacityInBytes(imageData)) {
    return null;
  }

  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = bitsToNumber(readBits(imageData, 8, 32 + i * 8));
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (e) {
    return null;
  }
}


// ---------- difference picture ----------
function drawDifference() {
  if (!originalData || !encodedData) return;

  const strength = Number(diffSlider.value);
  const w = originalData.width;
  const h = originalData.height;

  diffCanvas.width = w;
  diffCanvas.height = h;

  const ctx = diffCanvas.getContext("2d");
  const out = ctx.createImageData(w, h);
  let changed = 0;

  for (let i = 0; i < originalData.data.length; i += 4) {
    const diff =
      Math.abs(originalData.data[i] - encodedData.data[i]) +
      Math.abs(originalData.data[i + 1] - encodedData.data[i + 1]) +
      Math.abs(originalData.data[i + 2] - encodedData.data[i + 2]);

    if (diff > 0) changed++;

    const value = Math.min(255, diff * strength);
    out.data[i] = value;
    out.data[i + 1] = value;
    out.data[i + 2] = value;
    out.data[i + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);

  const total = w * h;
  const percent = ((changed / total) * 100).toFixed(2);
  diffInfo.textContent = changed + " of " + total + " pixels changed (" + percent + "%)";
}


// ---------- events: hide ----------
hideFile.addEventListener("change", function () {
  const file = hideFile.files[0];
  if (!file) return;

  hideError.textContent = "";
  diffArea.classList.add("hidden");
  encodedData = null;

  loadImage(file, beforeCanvas, true, function (data) {
    originalData = data;

    afterCanvas.width = data.width;
    afterCanvas.height = data.height;
    afterCanvas.getContext("2d").clearRect(0, 0, data.width, data.height);

    capacityText.textContent =
      "This picture can hold about " + getCapacityInBytes(data) + " bytes of text (roughly that many English letters).";
  });
});

hideBtn.addEventListener("click", function () {
  hideError.textContent = "";

  if (!originalData) {
    hideError.textContent = "Choose a picture first.";
    return;
  }

  const text = secretText.value;
  if (text.trim() === "") {
    hideError.textContent = "Type a message to hide.";
    return;
  }

  const bits = textToBits(text);
  const maxBits = originalData.width * originalData.height * 3;

  if (bits.length > maxBits) {
    hideError.textContent = "Message is too long for this picture. Use a bigger picture or a shorter message.";
    return;
  }

  encodedData = hideBits(originalData, bits);
  afterCanvas.getContext("2d").putImageData(encodedData, 0, 0);

  downloadLink.href = afterCanvas.toDataURL("image/png");
  diffArea.classList.remove("hidden");
  drawDifference();
});

diffSlider.addEventListener("input", drawDifference);


// ---------- events: reveal ----------
revealFile.addEventListener("change", function () {
  const file = revealFile.files[0];
  if (!file) return;

  revealError.textContent = "";
  resultBox.classList.add("hidden");
  revealLoaded = false;

  loadImage(file, revealCanvas, false, function () {
    revealLoaded = true;
  });
});

revealBtn.addEventListener("click", function () {
  revealError.textContent = "";
  resultBox.classList.add("hidden");

  if (!revealLoaded) {
    revealError.textContent = "Choose a picture first.";
    return;
  }

  const ctx = revealCanvas.getContext("2d");
  const data = ctx.getImageData(0, 0, revealCanvas.width, revealCanvas.height);
  const message = revealMessage(data);

  if (message === null) {
    revealError.textContent = "No hidden message found. Make sure this is the PNG you downloaded from this page.";
    return;
  }

  resultText.textContent = message;
  resultBox.classList.remove("hidden");
});
