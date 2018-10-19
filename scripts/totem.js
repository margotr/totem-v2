function showWorkMode(values) {

    var rawZ = app.rawZ;
    var rawX = app.rawX;
    var rawY = app.rawY;

    if (rawZ > 850 && rawZ < 1200) {
        this.totemPosition = 1;
        document.body.style.background = "white"; // red
      }
  
      if (rawZ < -850 && rawZ > -1200) {
        this.totemPosition = 2;
        document.body.style.background = "grey"; // white

      }
  
      if (rawX > 850 && rawX < 1200) {
        this.totemPosition = 3;
        document.body.style.background = "lightblue"; // light gray

      }
  
      if (rawX < -850 && rawX > -1200) {
        this.totemPosition = 4;
        document.body.style.backgroundColor = "orange";  // blue-green

      }
  
      if (rawY > 850 && rawY < 1200) {
        this.totemPosition = 5;
        document.body.style.backgroundColor = "yellow"; // yellow 

      }
  
      if (rawY < -850 && rawY > -1200) {
        this.totemPosition = 6;
        document.body.style.backgroundColor = "purple"; // purple

      }
      app.showInfo(rawX)
}