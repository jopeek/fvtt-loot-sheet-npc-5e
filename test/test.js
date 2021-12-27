import * as assert from 'assert';
import * as fs from 'fs';

import { PermissionHelper } from '../modules/helper/PermissionHelper.js';

describe('Check module structure', function(){
  it('Helpers exist', function(done) {
    let directory = './modules/helper';
    let dirs= fs.readdirSync(directory);

    dirs.map(function (filename) {
      assert.strictEqual(filename, filename);
    });
    done();
  });
});

describe('Check Permissions', () => {
  const pid = "aplayerID1234",
        mockPlayer = { data: { id: pid }},
        mockActor = {permission: [{default: 0}]};
        mockActor.permission[pid] = 2;

        it(
          'Get a players loot permission',
          () => assert.strictEqual(PermissionHelper.getLootPermissionForPlayer(mockActor,mockPlayer),2)
        );

        it(
          'Get default loot permissions',
          () => {
            mockPlayer.data.id = 'doesntexist';
            assert.strictEqual(PermissionHelper.getLootPermissionForPlayer(mockActor,mockPlayer),0);
          }
        );


});