/**
 * Server-side cloud functions for integration tests.
 *
 * These mirror the production cloud functions from puente-node-cloudcode,
 * adapted to run in the test environment with useMasterKey and plain JSON
 * return values (so tests can access objectId/username directly on the result).
 *
 * RULE: only define a cloud function here if it has a corresponding
 * implementation in the real puente-node-cloudcode server.
 * Cloud functions with external service dependencies (SMS, email, roles, ACLs)
 * cannot be mirrored here and are excluded.
 *
 * Covered functions: postObjectsToClass, updateObject (CRUD),
 *   signup, retrieveUserByObjectId, updateUser, queryUser, deleteUser (User).
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

  /**
   * signup
   * Mirrors: user.definer.js — Parse.Cloud.define('signup', ...)
   *
   * Creates a new Parse User from plain params and returns the user as JSON.
   */
  Parse.Cloud.define('signup', async (request) => {
    const { username, password, email, name, organization } = request.params;
    const user = new Parse.User();
    user.set('username', username);
    user.set('password', password);
    if (email) user.set('email', email);
    if (name) user.set('name', name);
    if (organization) user.set('organization', organization);
    const saved = await user.save(null, { useMasterKey: true });
    return saved.toJSON();
  });

  /**
   * retrieveUserByObjectId
   * Mirrors: user.definer.js — Parse.Cloud.define('retrieveUserByObjectId', ...)
   *
   * Fetches a single user by their objectId and returns their JSON.
   */
  Parse.Cloud.define('retrieveUserByObjectId', async (request) => {
    const { objectId } = request.params;
    const query = new Parse.Query(Parse.User);
    const user = await query.get(objectId, { useMasterKey: true });
    return user.toJSON();
  });

  /**
   * updateUser
   * Mirrors: user.definer.js — Parse.Cloud.define('updateUser', ...)
   *
   * Patches fields on an existing user and returns the updated user as JSON.
   */
  Parse.Cloud.define('updateUser', async (request) => {
    const { objectId, userObject } = request.params;
    const query = new Parse.Query(Parse.User);
    const user = await query.get(objectId, { useMasterKey: true });
    Object.entries(userObject).forEach(([k, v]) => user.set(k, v));
    const saved = await user.save(null, { useMasterKey: true });
    return saved.toJSON();
  });

  /**
   * queryUser
   * Mirrors: user.definer.js — Parse.Cloud.define('queryUser', ...)
   *
   * Finds the first user matching the given username, or null if none found.
   */
  Parse.Cloud.define('queryUser', async (request) => {
    const { username } = request.params;
    const query = new Parse.Query(Parse.User);
    query.equalTo('username', username);
    const user = await query.first({ useMasterKey: true });
    return user ? user.toJSON() : null;
  });

  /**
   * deleteUser
   * Mirrors: user.definer.js — Parse.Cloud.define('deleteUser', ...)
   *
   * Destroys a user record by objectId and confirms deletion.
   */
  Parse.Cloud.define('deleteUser', async (request) => {
    const { objectId } = request.params;
    const query = new Parse.Query(Parse.User);
    const user = await query.get(objectId, { useMasterKey: true });
    await user.destroy({ useMasterKey: true });
    return { deleted: true, objectId };
  });
};
