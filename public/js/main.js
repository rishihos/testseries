// Confirm before any destructive form submit (e.g. deleting a test series).
document.addEventListener('submit', function (e) {
  const form = e.target;
  const message = form.getAttribute('data-confirm');
  if (message && !window.confirm(message)) {
    e.preventDefault();
  }
});

// Show the chosen file name(s) inside the upload widgets.
document.querySelectorAll('.upload-drop input[type="file"]').forEach(function (input) {
  const label = input.closest('.upload-drop').querySelector('span');
  const defaultText = label.textContent;
  input.addEventListener('change', function () {
    if (!input.files || input.files.length === 0) {
      label.textContent = defaultText;
    } else if (input.files.length === 1) {
      label.textContent = input.files[0].name;
    } else {
      label.textContent = input.files.length + ' files selected';
    }
  });
});
