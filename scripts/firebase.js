function writeUserData(name) {
    firebase.database().ref('users/01').set({
        name: name
    });
  }
  