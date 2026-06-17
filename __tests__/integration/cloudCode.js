/**
 * Server-side cloud functions loaded by ParseServer via the `cloud` option.
 * Mirrors the production cloud functions in app/modules/cloud-code/crud/index.js.
 *
 * This module exports a function that receives the server-side Parse instance.
 * ParseServer calls it as: cloud(Parse) when `cloud` is a function.
 */

module.exports = function defineCloudFunctions(Parse) {
  Parse.Cloud.define('postObjectsToClass', async (request) => {
    const { parseClass, localObject } = request.params;
    const Cls = Parse.Object.extend(parseClass);
    const obj = new Cls();
    Object.entries(localObject).forEach(([k, v]) => obj.set(k, v));
    const saved = await obj.save(null, { useMasterKey: true });
    return { objectId: saved.id, createdAt: saved.createdAt };
  });

  Parse.Cloud.define('updateObject', async (request) => {
    const { parseClass, parseClassID, localObject } = request.params;
    const Cls = Parse.Object.extend(parseClass);
    const query = new Parse.Query(Cls);
    const obj = await query.get(parseClassID, { useMasterKey: true });
    Object.entries(localObject).forEach(([k, v]) => obj.set(k, v));
    const saved = await obj.save(null, { useMasterKey: true });
    return { objectId: saved.id, updatedAt: saved.updatedAt };
  });
};
