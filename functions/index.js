const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/* Register new user into database after signup */
exports.registerNewUser = functions.auth.user().onCreate((user) => {
  return admin.firestore().collection("users").doc(user.uid).set({
    color: "",
  });
});

/* Store color chosen by a player (must be color and not deselect)*/
exports.addPlayerColor = functions.https.onCall(async (data, context) => {
  this.checkAuthenticated(context.auth);

  const colors = admin
    .firestore()
    .collection("lobby-player-options")
    .doc("colors");
  const colorsDoc = await colors.get();
  const colorOptions = colorsDoc.data().options;
  if (!colorOptions.includes(data.text)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Color is not available"
    );
  }

  const userId = context.auth.uid;
  const users = admin.firestore().collection(users);
  const userDoc = await users.doc(userId).get();
  if (userDoc.color === data.text) {
    return true;
  }

  const snapshot = await users.get();
  snapshot.forEach((doc) => {
    if (doc.data().color === data.text) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Two players cannot choose the same color"
      );
    }
  });

  return await users.doc(userId).update({ color: data.text });
});

/*Deselect color chosen by player */
exports.deselectPlayerColor = functions.https.onCall(async (data, context) => {
  this.checkAuthenticated(context.auth);

  const userId = context.auth.uid;
  const user = admin.firestore().collection(users).doc(userId);

  return await user.update({ color: "" });
});

/*Get logged in player's selected color */
exports.getCurrentPlayerColor = functions.https.onCall(
  async (data, context) => {
    this.checkAuthenticated(context.auth);

    const userId = context.auth.uid;
    const user = admin.firestore().collection(users).doc(userId);
    const userDoc = await user.get();

    return await userDoc.data().color;
  }
);

/*Get all colors of players not logged in */
exports.getNonLoggedInColors = functions.https.onCall(async (data, context) => {
  this.checkAuthenticated(context.auth);

  const userId = context.auth.uid;
  const users = admin.firestore().collection(users);
  const snapshot = await users.get();
  const colorMap = new Map();

  snapshot.forEach((doc) => {
    if (userId !== doc.id) {
      colorMap.set(doc.id, doc.data().color);
    }
  });

  return colorMap;
});

/* Get color options */
exports.getColorOptions = functions.https.onCall(async (data, context) => {
  this.checkAuthenticated(context.auth);

  const colors = admin
    .firestore()
    .collection("lobby-player-options")
    .doc("colors");
  const colorsDoc = await colors.get();
  return colorsDoc.data().options;
});

/*Check if user is authenticated (helper function)*/
exports.checkAuthenticated = (auth) => {
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You need to be logged in to change colors"
    );
  }
};
