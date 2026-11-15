# Image Secret

Hide a short text message inside a PNG picture, right in the browser. No backend, no libraries.

## instruction to run
Open `index.html` in your browser (or use the Live Server extension in VS Code).

## How it works
- The picture is drawn on a canvas and the pixels are read with `getImageData`.
- Each pixel has red, green and blue values (0-255). The last bit of each value is replaced with one bit of the message (LSB method). The colour changes by 1 at most, so the eye can't see it.
- The first 32 bits store the message length, so the reveal step knows where to stop.
- Output is saved as PNG. JPG would change the pixel values and destroy the message.

## What I used while building 
HTML5, CSS3 (Grid, Flexbox, media queries), JavaScript (ES6), Canvas API, FileReader.

<!-- this project i built while building my stegnographic malware  detection framework for deep learning model which im currently building -->