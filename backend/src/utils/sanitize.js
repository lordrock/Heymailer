const sanitizeHtml = require('sanitize-html');

// Email HTML needs a wider allowlist than a typical comment box: tables,
// inline styles, and images are all normal in transactional/marketing email.
// We still strip <script>, event handlers, and anything that could execute
// in the admin's browser when previewed.
const EMAIL_SAFE_OPTIONS = {
  allowedTags: [
    'html', 'head', 'body', 'meta', 'title',
    'div', 'span', 'p', 'a', 'img', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
    'blockquote', 'small', 'center',
  ],
  allowedAttributes: {
    '*': ['style', 'class', 'align', 'valign', 'width', 'height', 'bgcolor', 'id'],
    a: ['href', 'target', 'rel', 'name'],
    img: ['src', 'alt', 'width', 'height'],
    meta: ['charset', 'name', 'content'],
    table: ['cellpadding', 'cellspacing', 'border', 'role'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedStyles: {
    '*': {
      color: [/.*/],
      'background-color': [/.*/],
      'background': [/.*/],
      'text-align': [/.*/],
      'font-size': [/.*/],
      'font-weight': [/.*/],
      'font-family': [/.*/],
      'font-style': [/.*/],
      padding: [/.*/],
      'padding-top': [/.*/], 'padding-bottom': [/.*/], 'padding-left': [/.*/], 'padding-right': [/.*/],
      margin: [/.*/],
      'margin-top': [/.*/], 'margin-bottom': [/.*/], 'margin-left': [/.*/], 'margin-right': [/.*/],
      border: [/.*/],
      'border-radius': [/.*/],
      width: [/.*/],
      height: [/.*/],
      'max-width': [/.*/],
      'line-height': [/.*/],
      'text-decoration': [/.*/],
      display: [/.*/],
      'vertical-align': [/.*/],
      'letter-spacing': [/.*/],
    },
  },
};

function sanitizeEmailHtml(html) {
  if (!html) return '';
  return sanitizeHtml(html, EMAIL_SAFE_OPTIONS);
}

module.exports = { sanitizeEmailHtml };
