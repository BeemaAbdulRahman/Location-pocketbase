/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2594370506");

  collection.listRule = "user = @request.auth.id";
  collection.viewRule = "user = @request.auth.id";
  collection.createRule = "@request.auth.id != '' && user = @request.auth.id";
  collection.updateRule = "user = @request.auth.id";
  collection.deleteRule = "user = @request.auth.id";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2594370506");

  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "";
  collection.updateRule = "";
  collection.deleteRule = "";

  return app.save(collection);
});
