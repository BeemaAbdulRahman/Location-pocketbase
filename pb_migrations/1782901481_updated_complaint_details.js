/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2594370506")

  // remove field
  collection.fields.removeById("number479369857")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2594370506")

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "number479369857",
    "max": null,
    "min": null,
    "name": "distance",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
