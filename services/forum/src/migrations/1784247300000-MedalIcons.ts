import { MigrationInterface, QueryRunner } from 'typeorm';

export class MedalIcons1784247300000 implements MigrationInterface {
  name = 'MedalIcons1784247300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE forum.medal SET icon_url = '/medals/znak-pocheta-3.svg'       WHERE id = 'a1b2c3d4-0001-0000-0000-000000000001';
      UPDATE forum.medal SET icon_url = '/medals/znak-pocheta-2.svg'       WHERE id = 'a1b2c3d4-0002-0000-0000-000000000002';
      UPDATE forum.medal SET icon_url = '/medals/znak-pocheta-1.svg'       WHERE id = 'a1b2c3d4-0003-0000-0000-000000000003';
      UPDATE forum.medal SET icon_url = '/medals/pochetnaya-podveska.svg'  WHERE id = 'a1b2c3d4-0004-0000-0000-000000000004';
      UPDATE forum.medal SET icon_url = '/medals/orden-pocheta.svg'        WHERE id = 'a1b2c3d4-0005-0000-0000-000000000005';
      UPDATE forum.medal SET icon_url = '/medals/orden-zaslugi.svg'        WHERE id = 'a1b2c3d4-0006-0000-0000-000000000006';
      UPDATE forum.medal SET icon_url = '/medals/znak-vracha.svg'          WHERE id = 'a1b2c3d4-0007-0000-0000-000000000007';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE forum.medal SET icon_url = NULL WHERE icon_url LIKE '/medals/%';
    `);
  }
}
