/// <reference path="../pb_data/types.d.ts" />

console.log("complaintGeopoints hook loaded");

// Keep complaint creation fast. Geocoding/distance work should not run here.
onRecordCreateRequest((e) => {
  const info = e.requestInfo();
  const authUserId = String(
    (info.auth && (info.auth.id || info.auth.get("id"))) || "",
  ).trim();

  if (authUserId && e.record) {
    e.record.set("user", authUserId);
  }

  return e.next();
}, "complaint_details");

onRecordUpdateRequest((e) => {
  return e.next();
}, "complaint_details");
