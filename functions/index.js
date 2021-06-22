const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/* Register new user into database after signup */
exports.registerNewUser = functions.auth.user().onCreate((user) => {
  return admin.firestore().collection("users").doc(user.uid).set({
    color: "",
    profilePicUrl:
      "https://firebasestorage.googleapis.com/v0/b/react-backend-exercise.appspot.com/o/defaults%2FdefaultProfilePic.png?alt=media&token=0288febe-000d-40cc-aa36-4747869595f6",
  });
});

/*Remove user from database if account is deleted */
exports.removeUserData = functions.auth.user().onDelete((user) => {
  const doc = admin.firestore().collection("users").doc(user.uid);
  return doc.delete();
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
  if (!colorOptions.includes(data.color)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Color is not available"
    );
  }

  const userId = context.auth.uid;
  const users = admin.firestore().collection("users");
  const userDoc = await users.doc(userId).get();
  if (userDoc.data().color === data.color) {
    return true;
  }

  const snapshot = await users.get();
  snapshot.forEach((doc) => {
    if (doc.data().color === data.color) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Two players cannot choose the same color"
      );
    }
  });

  return users.doc(userId).update({ color: data.color });
});

/*Deselect color chosen by player */
exports.deselectPlayerColor = functions.https.onCall((data, context) => {
  this.checkAuthenticated(context.auth);

  const userId = context.auth.uid;
  const user = admin.firestore().collection("users").doc(userId);

  return user.update({ color: "" });
});

/*Get logged in player's selected color */
exports.getCurrentPlayerColor = functions.https.onCall(
  async (data, context) => {
    this.checkAuthenticated(context.auth);

    const userId = context.auth.uid;
    const user = admin.firestore().collection("users").doc(userId);
    const userDoc = await user.get();

    return userDoc.data().color;
  }
);

/*Get all colors of players not logged in */
exports.getNonLoggedInColors = functions.https.onCall(async (data, context) => {
  this.checkAuthenticated(context.auth);

  const userId = context.auth.uid;
  const users = admin
    .firestore()
    .collection("users")
    .where("__name__", "!=", userId);
  const snapshot = await users.get();
  return snapshot.docs.map((doc) => [doc.id, doc.data().color]);
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

/*Update download url for user */
exports.updateProfileImageUrl = functions.https.onCall(
  async (data, context) => {
    this.checkAuthenticated(context.auth);

    const userId = context.auth.uid;
    const user = admin.firestore().collection("users").doc(userId);
    return user.update({ profilePicUrl: data.Url });
  }
);

/* Get Image by user Id */
exports.getProfileImagebyId = functions.https.onCall(async (data, context) => {
  this.checkAuthenticated(context.auth);

  const user = admin.firestore().collection("users").doc(data.id);
  const userDoc = await user.get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "User cannot be found");
  }

  return userDoc.data().profilePicUrl;
});

/* 
Helper Functions
*/
/*Check if user is authenticated (helper function)*/
exports.checkAuthenticated = (auth) => {
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You need to be logged in to change colors"
    );
  }
};
