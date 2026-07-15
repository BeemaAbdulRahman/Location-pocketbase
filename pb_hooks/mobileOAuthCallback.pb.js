/// <reference path="../pb_data/types.d.ts" />

const MOBILE_OAUTH_DEEP_LINK = "com.beema.locationfinder://oauth/callback";

// Google redirects to this HTTPS endpoint because web OAuth clients cannot
// use an Android custom scheme directly. Forward the untouched OAuth query to
// the APK, where state is verified and the code is exchanged with PocketBase.
routerAdd("GET", "/oauth/mobile-callback", (e) => {
  const query = e.request.url.query().encode();
  const deepLink = query
    ? MOBILE_OAUTH_DEEP_LINK + "?" + query
    : MOBILE_OAUTH_DEEP_LINK;

  return e.redirect(302, deepLink);
});
