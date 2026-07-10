/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2594370506");

  collection.indexes.push(
    "CREATE INDEX `idx_complaint_details_latitude_longitude` ON `complaint_details` (`latitude`, `longitude`)",
  );

  app
    .db()
    .newQuery(
      `
      UPDATE complaint_details
      SET
        latitude = CAST(json_extract(geoPoint, '$.lat') AS REAL),
        longitude = CAST(json_extract(geoPoint, '$.lon') AS REAL)
      WHERE geoPoint IS NOT NULL
        AND json_valid(geoPoint)
        AND json_extract(geoPoint, '$.lat') IS NOT NULL
        AND json_extract(geoPoint, '$.lon') IS NOT NULL
        AND (
          latitude IS NULL
          OR longitude IS NULL
          OR (latitude = 0 AND longitude = 0)
        )
      `,
    )
    .execute();

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2594370506");

  collection.indexes = collection.indexes.filter((index) => {
    return !index.includes("idx_complaint_details_latitude_longitude");
  });

  return app.save(collection);
});
