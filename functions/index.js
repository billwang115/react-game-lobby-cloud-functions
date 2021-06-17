const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/* Store color chosen by a player (must be color and not deselect)*/
exports.addPlayerColor = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You need to be logged in to change colors"
    );
  }

  const colors = admin
    .firestore()
    .collection("lobby-player-choices")
    .doc("colors");
  const colorsDoc = await colors.get();

  const colorKeys = Object.keys(colorsDoc.data());
  if (!colorKeys.includes(data.text)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Color is not available"
    );
  }

  const userId = context.auth.uid;
  const users = admin.firestore().collection(users);
  const userDoc = await users.doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "User not found");
  } else if (userDoc.color === data.text) {
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
