/**
 * Server-side cloud functions for integration tests.
 *
 * These mirror the production cloud functions from puente-node-cloudcode
 * (postObjectsToClass, updateObject from cloud/src/definer/crud.definer.js),
 * adapted to run in the test environment with useMasterKey and plain JSON
 * return values (so tests can access objectId directly on the result).
 *
 * RULE: only define a cloud function here if it has a corresponding
 * implementation in the real puente-node-cloudcode server.
 * Cloud functions with external service dependencies (SMS, roles, ACLs,
 * hardcoded model classes) cannot be mirrored here and are excluded.
 * Those Parse operations are covered by direct SDK tests in:
 *   - __tests__/integration/crud/queries.integration.test.js
 *   - __tests__/integration/user/auth.integration.test.js
 */

module.exports = function defineCloudFunctions(Parse) {
  /**
   * postObjectsToClass
   * Mirrors: crud.definer.js — Parse.Cloud.define('postObjectsToClass', ...)
   *
   * Saves a new object to the given parseClass, setting all localObject fields.
   */
  Parse.Cloud.define('postObjectsToClass', async (request) => {
    const { parseClass, localObject } = request.params;
    const Cls = Parse.Object.extend(parseClass);
    const obj = new Cls();
    Object.entries(localObject).forEach(([k, v]) => obj.set(k, v));
    const saved = await obj.save(null, { useMasterKey: true });
    return { objectId: saved.id, createdAt: saved.createdAt };
  });

  /**
   * updateObject
   * Mirrors: crud.definer.js — Parse.Cloud.define('updateObject', ...)
   *
   * Fetches an existing object by parseClass + parseClassID and patches it
   * with the fields in localObject.
   */
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
