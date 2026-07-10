/// <reference path="../pb_data/types.d.ts" />

console.log("nearestComplaints route loaded");

function nearestGetLocationForPincode(value) {
  const pincode = nearestNormalizePincode(value);

  if (!nearestIsValidIndianPincode(pincode)) {
    return null;
  }

  const cachedLocation = nearestGetCachedPincodeLocation(pincode);

  if (cachedLocation) {
    return cachedLocation;
  }

  const location = nearestGeocodeIndianPincode(pincode);

  if (!location) {
    nearestSaveOrUpdatePincodeCache(pincode, null, null, "failed");
    return null;
  }

  nearestSaveOrUpdatePincodeCache(pincode, location.lat, location.lon, "success");
  return location;
}

function nearestUpdateComplaintLocation(recordId, location) {
  if (!recordId || !location) {
    return;
  }

  try {
    const record = $app.findRecordById("complaint_details", recordId);
    record.set("geoPoint", {
      lat: location.lat,
      lon: location.lon,
    });
    record.set("latitude", location.lat);
    record.set("longitude", location.lon);
    $app.save(record);
  } catch (err) {
    console.log("Unable to update nearest complaint location:", err);
  }
}

function nearestGetCachedPincodeLocation(pincode) {
  try {
    const record = $app.findFirstRecordByFilter(
      "pincode_cache",
      "pincode = {:pincode}",
      {
        pincode: pincode,
      },
    );

    if (record.get("status") === "failed") {
      return null;
    }

    const location = record.get("location");

    if (!location || location.lat === undefined || location.lon === undefined) {
      return null;
    }

    const lat = Number(location.lat);
    const lon = Number(location.lon);

    if (!nearestIsInsideIndia(lat, lon)) {
      return null;
    }

    return {
      lat: lat,
      lon: lon,
    };
  } catch (err) {
    return null;
  }
}

function nearestCacheComplaintLocation(pincodeValue, lat, lon) {
  const pincode = nearestNormalizePincode(pincodeValue);

  if (
    !nearestIsValidIndianPincode(pincode) ||
    !nearestIsInsideIndia(lat, lon) ||
    nearestGetCachedPincodeLocation(pincode)
  ) {
    return;
  }

  nearestSaveOrUpdatePincodeCache(pincode, lat, lon, "success");
}

function nearestSaveOrUpdatePincodeCache(pincode, lat, lon, status) {
  try {
    let record;

    try {
      record = $app.findFirstRecordByFilter(
        "pincode_cache",
        "pincode = {:pincode}",
        {
          pincode: pincode,
        },
      );
    } catch (err) {
      const collection = $app.findCollectionByNameOrId("pincode_cache");
      record = new Record(collection);
      record.set("pincode", pincode);
    }

    record.set("status", status);

    if (lat !== null && lon !== null) {
      record.set("location", {
        lat: lat,
        lon: lon,
      });
    }

    $app.save(record);
  } catch (err) {
    console.log("Failed to save nearest pincode cache:", err);
  }
}

function nearestGeocodeIndianPincode(pincode) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    "?format=jsonv2" +
    "&postalcode=" +
    encodeURIComponent(pincode) +
    "&countrycodes=in" +
    "&addressdetails=1" +
    "&limit=1";

  try {
    const res = $http.send({
      url: url,
      method: "GET",
      timeout: 8,
      headers: {
        Accept: "application/json",
        "User-Agent": "ComplaintLocationApp/1.0 beema.ca",
      },
    });

    sleep(1100);

    if (res.statusCode !== 200) {
      console.log("Nominatim failed in nearest route:", res.statusCode);
      return null;
    }

    const data = res.json;

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const result = data[0];

    if (!result.address || result.address.country_code !== "in") {
      return null;
    }

    const lat = Number(result.lat);
    const lon = Number(result.lon);

    if (!nearestIsInsideIndia(lat, lon)) {
      return null;
    }

    return {
      lat: lat,
      lon: lon,
    };
  } catch (err) {
    console.log("Nearest route geocoding error:", err);
    return null;
  }
}

function nearestNormalizePincode(value) {
  return String(value || "").replace(/\D/g, "").trim();
}

function nearestIsValidIndianPincode(pincode) {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

function nearestIsInsideIndia(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
}

/**
 * GET /api/nearest-complaints?lat=10.0042355&lon=76.3756415&page=1&perPage=8&search=
 */
routerAdd(
  "GET",
  "/api/nearest-complaints",
  (e) => {
    let page = 1;
    let perPage = 8;
    let search = "";
    let candidateLimit = 50;
    const emptyResponse = (message) => {
      return e.json(200, {
        page: page,
        perPage: perPage,
        totalItems: 0,
        totalPages: 0,
        search: search,
        message: message,
        items: [],
      });
    };
    const localToRad = (value) => {
      return (value * Math.PI) / 180;
    };
    const localIsInsideIndia = (lat, lon) => {
      return lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
    };
    const localGetDistanceKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = localToRad(lat2 - lat1);
      const dLon = localToRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(localToRad(lat1)) *
          Math.cos(localToRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };
    const localNumberInRange = (value, fallback, min, max) => {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return fallback;
      }

      return Math.min(Math.max(Math.floor(number), min), max);
    };
    const localFormatOsrmCoord = (lat, lon) => {
      return Number(lon).toFixed(6) + "," + Number(lat).toFixed(6);
    };
    const localGetRoadDistancesKm = (browserLat, browserLon, candidates) => {
      const geoCandidates = candidates.filter((item) => item.hasGeoPoint);

      if (geoCandidates.length === 0) {
        return {};
      }

      const coordinates = [
        localFormatOsrmCoord(browserLat, browserLon),
        ...geoCandidates.map((item) => localFormatOsrmCoord(item.lat, item.lon)),
      ].join(";");
      const destinations = geoCandidates
        .map((_, index) => String(index + 1))
        .join(";");
      const url =
        "https://router.project-osrm.org/table/v1/driving/" +
        coordinates +
        "?sources=0" +
        "&destinations=" +
        destinations +
        "&annotations=distance";

      try {
        const res = $http.send({
          url: url,
          method: "GET",
          timeout: 5,
          headers: {
            Accept: "application/json",
            "User-Agent": "ComplaintLocationApp/1.0 beema.ca",
          },
        });

        if (res.statusCode !== 200) {
          console.log("OSRM table failed:", res.statusCode);
          return {};
        }

        const data = res.json;
        const distances = data && data.distances && data.distances[0];

        if (!Array.isArray(distances)) {
          return {};
        }

        const roadDistances = {};

        geoCandidates.forEach((item, index) => {
          const rawMeters = distances[index];
          const meters = Number(rawMeters);

          if (rawMeters !== null && rawMeters !== undefined && Number.isFinite(meters)) {
            roadDistances[item.id] = Number((meters / 1000).toFixed(2));
          }
        });

        return roadDistances;
      } catch (err) {
        console.log("OSRM distance error:", err);
        return {};
      }
    };
    const localCompareDistanceItems = (a, b) => {
      if (a.hasGeoPoint !== b.hasGeoPoint) {
        return a.hasGeoPoint ? -1 : 1;
      }

      if (a.distanceKm === null && b.distanceKm === null) {
        return String(b.created).localeCompare(String(a.created));
      }

      if (a.distanceKm === null) {
        return 1;
      }

      if (b.distanceKm === null) {
        return -1;
      }

      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }

      return String(b.created).localeCompare(String(a.created));
    };

    try {
      const info = e.requestInfo();
      const authUserId = String(
        (info.auth && (info.auth.id || info.auth.get("id"))) || "",
      ).trim();

      if (!authUserId) {
        return e.json(401, {
          message: "Authentication required",
        });
      }

      const browserLat = Number(info.query.lat);
      const browserLon = Number(info.query.lon);
      search = String(info.query.search || info.query.q || "").trim();
      const searchLike = "%" + search.toLowerCase() + "%";

      page = localNumberInRange(info.query.page || 1, 1, 1, 1000);
      perPage = localNumberInRange(info.query.perPage || 8, 8, 1, 50);
      candidateLimit = localNumberInRange(
        info.query.candidateLimit || 50,
        50,
        30,
        50,
      );
      const offset = (page - 1) * perPage;

      const allDataResult = new DynamicModel({
        total: 0,
      });

      try {
        $app
          .db()
          .newQuery(
            `
            SELECT COUNT(*) AS total
            FROM complaint_details
            WHERE user = {:authUserId}
            `,
          )
          .bind({
            authUserId: authUserId,
          })
          .one(allDataResult);
      } catch (err) {
        console.log("Failed to count complaint_details:", err);
        return emptyResponse("No complaint data found");
      }

      if (Number(allDataResult.total) === 0) {
        return emptyResponse("No complaint data found");
      }

      const filterSql = `
        user = {:authUserId}
        ${
          search
            ? `
        AND (
          LOWER(customer_name) LIKE {:searchLike}
          OR CAST(pincode AS TEXT) LIKE {:searchLike}
        )
        `
            : ""
        }
      `;

      const totalResult = new DynamicModel({
        total: 0,
      });

      try {
        $app
          .db()
          .newQuery(
            `
            SELECT COUNT(*) AS total
            FROM complaint_details
            WHERE ${filterSql}
            `,
          )
          .bind({
            authUserId: authUserId,
            searchLike: searchLike,
          })
          .one(totalResult);
      } catch (err) {
        console.log("Failed to count nearest complaints:", err);
        return emptyResponse("No complaint data found");
      }

      const totalItems = Number(totalResult.total);

      if (totalItems === 0) {
        return emptyResponse("No complaint data found");
      }

      if (!Number.isFinite(browserLat) || !Number.isFinite(browserLon)) {
        return emptyResponse("Browser location required");
      }

      const cosLat = Math.cos(localToRad(browserLat));
      const result = arrayOf(
        new DynamicModel({
          id: "",
          customer_name: "",
          phone_number: 0,
          complaint_date: "",
          pincode: 0,
          status: "",
          created: "",
          updated: "",
          lat: "",
          lon: "",
          hasGeoPoint: 0,
          distanceOrder: "",
        }),
      );

      try {
        $app
          .db()
          .newQuery(
            `
            SELECT
              id,
              customer_name,
              phone_number,
              complaint_date,
              pincode,
              status,
              created,
              updated,
              COALESCE(
                NULLIF(latitude, 0),
                CASE
                  WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                  THEN CAST(json_extract(geoPoint, '$.lat') AS REAL)
                  ELSE NULL
                END
              ) AS lat,
              COALESCE(
                NULLIF(longitude, 0),
                CASE
                  WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                  THEN CAST(json_extract(geoPoint, '$.lon') AS REAL)
                  ELSE NULL
                END
              ) AS lon,
              CASE
                WHEN COALESCE(
                    NULLIF(latitude, 0),
                    CASE
                      WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                      THEN CAST(json_extract(geoPoint, '$.lat') AS REAL)
                      ELSE NULL
                    END
                  ) IS NOT NULL
                  AND COALESCE(
                    NULLIF(longitude, 0),
                    CASE
                      WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                      THEN CAST(json_extract(geoPoint, '$.lon') AS REAL)
                      ELSE NULL
                    END
                  ) IS NOT NULL
                  AND NOT (
                    COALESCE(
                      NULLIF(latitude, 0),
                      CASE
                        WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                        THEN CAST(json_extract(geoPoint, '$.lat') AS REAL)
                        ELSE NULL
                      END
                    ) = 0
                    AND COALESCE(
                      NULLIF(longitude, 0),
                      CASE
                        WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                        THEN CAST(json_extract(geoPoint, '$.lon') AS REAL)
                        ELSE NULL
                      END
                    ) = 0
                  )
                THEN 1
                ELSE 0
              END AS hasGeoPoint,
              (
                (
                  (
                    COALESCE(
                      NULLIF(latitude, 0),
                      CASE
                        WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                        THEN CAST(json_extract(geoPoint, '$.lat') AS REAL)
                        ELSE NULL
                      END
                    ) - {:browserLat}
                  )
                  *
                  (
                    COALESCE(
                      NULLIF(latitude, 0),
                      CASE
                        WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                        THEN CAST(json_extract(geoPoint, '$.lat') AS REAL)
                        ELSE NULL
                      END
                    ) - {:browserLat}
                  )
                )
                +
                (
                  (
                    (
                      COALESCE(
                        NULLIF(longitude, 0),
                        CASE
                          WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                          THEN CAST(json_extract(geoPoint, '$.lon') AS REAL)
                          ELSE NULL
                        END
                      ) - {:browserLon}
                    ) * {:cosLat}
                  )
                  *
                  (
                    (
                      COALESCE(
                        NULLIF(longitude, 0),
                        CASE
                          WHEN geoPoint IS NOT NULL AND json_valid(geoPoint)
                          THEN CAST(json_extract(geoPoint, '$.lon') AS REAL)
                          ELSE NULL
                        END
                      ) - {:browserLon}
                    ) * {:cosLat}
                  )
                )
            ) AS distanceOrder
            FROM complaint_details
            WHERE ${filterSql}
            ORDER BY hasGeoPoint DESC, distanceOrder ASC, created DESC
            LIMIT {:limit}
            `,
          )
          .bind({
            authUserId: authUserId,
            browserLat: browserLat,
            browserLon: browserLon,
            cosLat: cosLat,
            searchLike: searchLike,
            limit: candidateLimit,
          })
          .all(result);
      } catch (err) {
        console.log("Failed to list nearest complaints:", err);
        return emptyResponse("No complaint data found");
      }

      const straightLineItems = result.map((item) => {
        let lat = Number(item.lat);
        let lon = Number(item.lon);
        let hasGeoPoint =
          Number(item.hasGeoPoint) === 1 &&
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          localIsInsideIndia(lat, lon);

        if (hasGeoPoint) {
          nearestCacheComplaintLocation(item.pincode, lat, lon);
        } else {
          const location = nearestGetLocationForPincode(item.pincode);

          if (location) {
            lat = location.lat;
            lon = location.lon;
            hasGeoPoint = true;
            nearestUpdateComplaintLocation(item.id, location);
          }
        }

        const straightDistanceKm = hasGeoPoint
          ? Number(localGetDistanceKm(browserLat, browserLon, lat, lon).toFixed(2))
          : null;

        return {
          id: item.id,
          customer_name: item.customer_name,
          customerName: item.customer_name,
          phone_number: item.phone_number,
          phone: item.phone_number,
          complaint_date: item.complaint_date,
          complaintDate: item.complaint_date,
          pincode: item.pincode,
          status: item.status,
          created: item.created,
          updated: item.updated,
          geoPoint: {
            lat: hasGeoPoint ? lat : null,
            lon: hasGeoPoint ? lon : null,
          },
          hasGeoPoint: hasGeoPoint,
          lat: hasGeoPoint ? lat : null,
          lon: hasGeoPoint ? lon : null,
          straightDistanceKm: straightDistanceKm,
        };
      });
      const roadDistances = localGetRoadDistancesKm(
        browserLat,
        browserLon,
        straightLineItems,
      );
      const rankedItems = straightLineItems
        .map((item) => {
          const roadDistanceKm =
            typeof roadDistances[item.id] === "number"
              ? roadDistances[item.id]
              : null;
          const distanceKm =
            roadDistanceKm !== null ? roadDistanceKm : item.straightDistanceKm;

          return {
            id: item.id,
            customerName: item.customerName,
            phone: item.phone,
            complaintDate: item.complaintDate,
            pincode: item.pincode,
            status: item.status,
            created: item.created,
            updated: item.updated,
            geoPoint: item.geoPoint,
            distance: distanceKm,
            distanceKm: distanceKm,
            roadDistanceKm: roadDistanceKm,
            straightDistanceKm: item.straightDistanceKm,
            distanceSource: roadDistanceKm !== null ? "osrm" : "straight_line",
            hasGeoPoint: item.hasGeoPoint,
          };
        })
        .sort(localCompareDistanceItems);
      const items = rankedItems.slice(offset, offset + perPage).map((item) => {
        return {
          id: item.id,
          customer_name: item.customerName,
          customerName: item.customerName,
          phone_number: item.phone,
          phone: item.phone,
          complaint_date: item.complaintDate,
          complaintDate: item.complaintDate,
          pincode: item.pincode,
          status: item.status,
          created: item.created,
          updated: item.updated,
          geoPoint: item.geoPoint,
          distance: item.distance,
          distanceKm: item.distanceKm,
          roadDistanceKm: item.roadDistanceKm,
          straightDistanceKm: item.straightDistanceKm,
          distanceSource: item.distanceSource,
        };
      });

      return e.json(200, {
        page: page,
        perPage: perPage,
        totalItems: rankedItems.length,
        matchedItems: totalItems,
        totalPages: Math.ceil(rankedItems.length / perPage),
        candidateLimit: candidateLimit,
        search: search,
        items: items,
      });
    } catch (err) {
      console.log("Nearest complaints route error:", err);
      return emptyResponse("No complaint data found");
    }
  },
  $apis.requireAuth(),
);
