/// <reference path="../pb_data/types.d.ts" />

console.log("bulkComplaintDetails route loaded");

/**
 * POST /api/complaint-details/bulk
 *
 * Body:
 * {
 *   "items": [
 *     {
 *       "customer_name": "Name",
 *       "phone_number": 9999999999,
 *       "pincode": 670001,
 *       "complaint_date": "2026-07-02",
 *       "status": "open"
 *     }
 *   ]
 * }
 */
routerAdd(
  "POST",
  "/api/complaint-details/bulk",
  (e) => {
    const info = e.requestInfo();
    const authUserId = String(
      (info.auth && (info.auth.id || info.auth.get("id"))) || "",
    ).trim();
    const body = info.body || {};
    const rows = Array.isArray(body)
      ? body
      : body.items || body.rows || body.data || [];

    if (!Array.isArray(rows)) {
      return e.json(400, {
        message: "items must be an array",
      });
    }

    if (rows.length === 0) {
      return e.json(200, {
        created: 0,
        skipped: 0,
        failed: 0,
        items: [],
      });
    }

    const collection = $app.findCollectionByNameOrId("complaint_details");
    const createdItems = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};

      if (isBlankRow(row)) {
        skipped++;
        continue;
      }

      try {
        const record = new Record(collection);
        const pincode = normalizePincode(row.pincode);

        record.set(
          "customer_name",
          stringValue(row.customer_name || row.customerName),
        );
        record.set("phone_number", numberValue(row.phone_number || row.phone));
        record.set("pincode", numberValue(pincode));
        record.set(
          "complaint_date",
          stringValue(row.complaint_date || row.complaintDate),
        );
        record.set("status", stringValue(row.status || "open"));
        if (authUserId) {
          record.set("user", authUserId);
        }

        $app.save(record);

        created++;
        createdItems.push({
          id: record.id,
          pincode: pincode,
        });
      } catch (err) {
        failed++;
        console.log("Failed to create bulk complaint row:", i, err);
      }
    }

    return e.json(200, {
      created: created,
      skipped: skipped,
      failed: failed,
      total: rows.length,
      items: createdItems,
    });
  },
  $apis.requireAuth(),
);

function isBlankRow(row) {
  return !(
    stringValue(row.customer_name || row.customerName) ||
    stringValue(row.phone_number || row.phone) ||
    stringValue(row.pincode) ||
    stringValue(row.complaint_date || row.complaintDate) ||
    stringValue(row.status)
  );
}

function stringValue(value) {
  return String(value || "").trim();
}

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function normalizePincode(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .trim();
}

function isValidIndianPincode(pincode) {
  return /^[1-9][0-9]{5}$/.test(pincode);
}
