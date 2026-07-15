# Location-pocketbase

## Android Google OAuth callback

The `GET /oauth/mobile-callback` hook forwards Google's OAuth response to the
Location Finder APK using:

`com.beema.locationfinder://oauth/callback`

Register this exact redirect URI in the Google OAuth web client:

`https://location-pocketbase-production.up.railway.app/oauth/mobile-callback`
