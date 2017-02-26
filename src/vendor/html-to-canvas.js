/**
 * @author mrdoob / http://mrdoob.com/
 * @author bnolan / http://github.com/bnolan
 */

module.exports = function html2canvas (element, superSampling) {
  var range = document.createRange();

  function getRect (rect) {
    return {
      left: rect.left - offset.left - 0.5,
      top: rect.top - offset.top - 0.5,
      width: rect.width,
      height: rect.height
    };
  }

  function drawImage (image, x, y, w, h) {
    context.drawImage(image, x * superSampling, y * superSampling, w * superSampling, h * superSampling);
  }

  function drawText (style, x, y, width, string) {
    context.textBaseline = 'top';
    context.fillStyle = style.color;

    var a = 0;
    var b = 0;

    // Manual word wrapping
    const words = string.split(/\s+/);

    var word;

    width += 5;

    while (word = words.shift()) {
      // Except last word
      if (words.length > 0) {
        word += ' ';
      }

      context.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
      const metrics = context.measureText(word);

      a += metrics.width;

      if (a > width) {
        a = metrics.width;
        b += 20;
      }

      context.font = style.fontWeight + ' ' + (parseInt(style.fontSize, 10) * superSampling) + 'px' + ' ' + style.fontFamily;
      context.fillText(word, (x + a - metrics.width) * superSampling, (y + b) * superSampling);
    }
  }

  function drawBorder (style, which, x, y, width, height) {
    var borderWidth = style[ which + 'Width' ];
    var borderStyle = style[ which + 'Style' ];
    var borderColor = style[ which + 'Color' ];

    if (borderWidth !== '0px' && borderStyle !== 'none') {
      context.strokeStyle = borderColor;
      context.beginPath();
      context.moveTo(x * superSampling, y * superSampling);
      context.lineTo((x + width) * superSampling, (y + height) * superSampling);
      context.stroke();
    }
  }

  function drawElement (element, style) {
    var rect;

    if (element.nodeType === 3) {
      // text

      range.selectNode(element);

      rect = getRect(range.getBoundingClientRect());

      drawText(style, rect.left, rect.top, rect.width, element.nodeValue.trim());
    } else {
      rect = getRect(element.getBoundingClientRect());
      style = window.getComputedStyle(element);

      context.fillStyle = style.backgroundColor;
      context.fillRect(rect.left * superSampling, rect.top * superSampling, rect.width * superSampling, rect.height * superSampling);

      drawBorder(style, 'borderTop', rect.left, rect.top, rect.width, 0);
      drawBorder(style, 'borderLeft', rect.left, rect.top, 0, rect.height);
      drawBorder(style, 'borderBottom', rect.left, rect.top + rect.height, rect.width, 0);
      drawBorder(style, 'borderRight', rect.left + rect.width, rect.top, 0, rect.height);

      if (element.type === 'color' || element.type === 'text') {
        drawText(style, rect.left + parseInt(style.paddingLeft), rect.top + parseInt(style.paddingTop), rect.width, element.value);
      }

      if (element.nodeName === 'IMG') {
        drawImage(element, rect.left, rect.top, rect.width, rect.height);
      }
    }

    /**/
    // debug
    // context.strokeStyle = '#' + Math.random().toString( 16 ).slice( - 3 );
    // context.strokeRect( rect.left - 0.5, rect.top - 0.5, rect.width + 1, rect.height + 1 );

    for (var i = 0; i < element.childNodes.length; i++) {
      drawElement(element.childNodes[ i ], style);
    }
  }

  var offset = element.getBoundingClientRect();

  var canvas = document.createElement('canvas');
  canvas.width = offset.width * superSampling;
  canvas.height = offset.height * superSampling;

  var context = canvas.getContext('2d' /*, { alpha: false }*/);

  drawElement(element);

  return canvas;
}
