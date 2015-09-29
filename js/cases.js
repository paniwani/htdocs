$(function() {
  $(".clickable-row").click(function () {
    window.location = this.dataset.href;
  });
});